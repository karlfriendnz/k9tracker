import { prisma } from '@/lib/prisma'
import { sendApns, INVALID_TOKEN_REASONS } from '@/lib/apns'
import { resolvePref } from '@/lib/notification-prefs'
import { renderTemplate } from '@/lib/notification-types'

// Push the recipient of a freshly-created Message. "Recipient" = whichever
// party in the trainer↔client thread didn't send it. Fire-and-forget from
// the caller's perspective — errors are swallowed and logged so a flaky
// APNs round-trip can't fail the message-create response.

interface NotifyArgs {
  messageId: string
  clientId: string
  senderId: string
  body: string
}

export async function notifyMessageRecipient(args: NotifyArgs): Promise<void> {
  try {
    await doNotify(args)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.error('[notify-message-recipient] failed:', msg)
  }
}

async function doNotify({ messageId, clientId, senderId, body }: NotifyArgs) {
  // Resolve the two parties: the client (User attached to ClientProfile)
  // and the trainer (User attached to the ClientProfile's trainer's
  // TrainerProfile). Whichever isn't `senderId` is the recipient.
  const profile = await prisma.clientProfile.findUnique({
    where: { id: clientId },
    select: {
      userId: true,
      user: { select: { id: true, name: true, email: true } },
      trainer: {
        select: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })
  if (!profile?.trainer?.user) return

  const clientUser = profile.user
  const trainerUser = profile.trainer.user
  const recipientUser =
    senderId === clientUser.id ? trainerUser
    : senderId === trainerUser.id ? clientUser
    : null
  const senderUser =
    senderId === clientUser.id ? clientUser
    : senderId === trainerUser.id ? trainerUser
    : null
  if (!recipientUser || !senderUser) return

  // Honour the recipient's NEW_MESSAGE PUSH preference. resolvePref
  // falls back to defaults (enabled: true) when no row exists, so a
  // client who's never visited a settings page still gets pushes.
  const pref = await resolvePref(recipientUser.id, 'NEW_MESSAGE', 'PUSH')
  if (!pref.enabled) return

  const tokens = await prisma.deviceToken.findMany({
    where: { userId: recipientUser.id, platform: 'IOS' },
    select: { token: true },
  })
  if (tokens.length === 0) return

  const senderName = senderUser.name ?? senderUser.email ?? 'Someone'
  const clientName = clientUser.name ?? clientUser.email ?? 'Your client'
  const preview = previewMessage(body)

  const title = renderTemplate(pref.title, { senderName, clientName, preview })
  const renderedBody = renderTemplate(pref.body, { senderName, clientName, preview })

  // Deep-link target depends on which side the recipient is on. Trainer
  // gets the per-client thread page; client gets the unified messages
  // surface. The native shell's appUrlOpen handler navigates the
  // WebView to this path when the user taps the notification.
  const isTrainerRecipient = recipientUser.id === trainerUser.id
  const path = isTrainerRecipient ? `/messages/${clientId}` : `/my-messages`

  const results = await sendApns(
    tokens.map(t => t.token),
    {
      alert: { title, body: renderedBody },
      customData: { type: 'new-message', messageId, path },
    },
  )

  // Garbage-collect tokens APNs reports as no longer valid (uninstall,
  // device wipe, bundle-id mismatch). Without this we'd keep retrying
  // forever and burning APNs quota.
  const stale = results
    .filter(r => !r.ok && r.reason && INVALID_TOKEN_REASONS.has(r.reason))
    .map(r => r.token)
  if (stale.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: stale } } })
  }
}

// 120 chars is enough to read the gist on the lock screen without making
// iOS truncate at an awkward boundary. Collapses newlines to spaces so a
// "Hi\n\nQuestion about…" doesn't show a blank line in the body.
function previewMessage(body: string): string {
  const trimmed = body.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 120) return trimmed
  return trimmed.slice(0, 117) + '…'
}
