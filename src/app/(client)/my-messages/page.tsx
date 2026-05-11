import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getActiveClient } from '@/lib/client-context'
import { MessageThread } from './message-thread'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Messages' }

export default async function ClientMessagesPage() {
  const active = await getActiveClient()
  if (!active) redirect('/login')

  const clientProfile = await prisma.clientProfile.findFirst({
    where: { id: active.clientId },
    include: {
      trainer: { include: { user: { select: { name: true, email: true } } } },
    },
  })
  if (!clientProfile) redirect('/login')

  const messages = await prisma.message.findMany({
    where: { clientId: clientProfile.id, channel: 'TRAINER_CLIENT' },
    include: { sender: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })

  // Mark unread messages as read — but only when the real client is viewing.
  // Trainer-in-preview should leave the read state untouched so it still
  // reflects the client's true unread badge.
  if (!active.isPreview) {
    const unreadIds = messages.filter(m => !m.readAt && m.senderId !== active.userId).map(m => m.id)
    if (unreadIds.length > 0) {
      await prisma.message.updateMany({ where: { id: { in: unreadIds } }, data: { readAt: new Date() } })
    }
  }

  const trainerName = clientProfile.trainer.user.name ?? clientProfile.trainer.user.email

  return (
    // Negative bottom margin reclaims <main>'s pb-24 buffer so the chat
    // composer can sit flush above the bottom tab nav instead of leaving
    // a ~96px dead band beneath it. Desktop has no bottom nav so the
    // override falls back to mb-0.
    <div className="flex flex-col flex-1 min-h-0 -mb-24 md:mb-0">
      {/* Sticky trainer header — pins to the top of the chat scroll so the
          client always knows who they're talking to, even after scrolling
          deep into the message history. */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
        <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
          {trainerName[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{trainerName}</p>
          <p className="text-xs text-slate-500">Your trainer</p>
        </div>
      </div>

      <MessageThread
        clientId={clientProfile.id}
        currentUserId={active.userId}
        initialMessages={messages.map(m => ({
          id: m.id,
          body: m.body,
          senderId: m.senderId,
          createdAt: m.createdAt.toISOString(),
          sender: m.sender,
        }))}
      />
    </div>
  )
}
