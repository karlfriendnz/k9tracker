import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendApns, INVALID_TOKEN_REASONS } from '@/lib/apns'
import { renderTemplate, NOTIFICATION_TYPES } from '@/lib/notification-types'
import { resolvePrefsForUsers } from '@/lib/notification-prefs'

// Cron tick interval — must match Supabase pg_cron schedule. Defines the
// fuzziness window for matching a session against a trainer's chosen lead time.
const TICK_INTERVAL_MIN = 5
// We never look more than this far ahead; keeps the per-tick query bounded.
const MAX_LEAD_MIN = 240

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const now = new Date()
  // Pull every upcoming-soon session that hasn't been notified yet; we apply
  // each trainer's per-pref lead time in code below.
  const sessions = await prisma.trainingSession.findMany({
    where: {
      scheduledAt: { gt: now, lte: new Date(now.getTime() + MAX_LEAD_MIN * 60_000) },
      status: 'UPCOMING',
      reminderPushSentAt: null,
    },
    include: {
      dog: { select: { name: true } },
      client: { select: { user: { select: { name: true } } } },
      trainer: {
        select: {
          user: {
            select: {
              id: true,
              notifyPush: true,
              timezone: true,
              deviceTokens: { where: { platform: 'IOS' } },
            },
          },
        },
      },
    },
  })

  if (sessions.length === 0) {
    return NextResponse.json({ sessionsConsidered: 0, pushesSent: 0, tokensInvalidated: 0 })
  }

  const trainerUserIds = Array.from(new Set(sessions.map(s => s.trainer.user.id)))
  const prefs = await resolvePrefsForUsers(trainerUserIds, 'SESSION_REMINDER', 'PUSH')

  let pushed = 0
  const tokensToDelete: string[] = []
  const meta = NOTIFICATION_TYPES.SESSION_REMINDER

  for (const s of sessions) {
    const trainerUser = s.trainer.user
    const pref = prefs.get(trainerUser.id)!
    const lead = pref.minutesBefore ?? meta.defaults.minutesBefore!
    const minutesUntil = (s.scheduledAt.getTime() - now.getTime()) / 60_000
    const inWindow = Math.abs(minutesUntil - lead) <= TICK_INTERVAL_MIN / 2

    if (!inWindow) continue

    // Channel kill-switch on the user, plus per-pref enable, plus device check.
    if (!trainerUser.notifyPush || !pref.enabled || trainerUser.deviceTokens.length === 0) {
      // Mark as sent so we don't keep evaluating this session every tick.
      await prisma.trainingSession.update({ where: { id: s.id }, data: { reminderPushSentAt: now } })
      continue
    }

    const startTime = s.scheduledAt.toLocaleTimeString('en-NZ', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: trainerUser.timezone,
    })
    const subs = {
      dogName: s.dog?.name ?? '',
      clientName: s.client?.user?.name ?? '',
      title: s.title,
      startTime,
      minutesBefore: String(lead),
    }

    const results = await sendApns(
      trainerUser.deviceTokens.map(d => d.token),
      {
        alert: { title: renderTemplate(pref.title, subs), body: renderTemplate(pref.body, subs) },
        customData: { sessionId: s.id, type: 'session-reminder' },
      },
    )

    for (const r of results) {
      if (r.ok) pushed++
      else if (r.reason && INVALID_TOKEN_REASONS.has(r.reason)) tokensToDelete.push(r.token)
    }

    await prisma.trainingSession.update({ where: { id: s.id }, data: { reminderPushSentAt: now } })
  }

  if (tokensToDelete.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: tokensToDelete } } })
  }

  return NextResponse.json({
    sessionsConsidered: sessions.length,
    pushesSent: pushed,
    tokensInvalidated: tokensToDelete.length,
  })
}
