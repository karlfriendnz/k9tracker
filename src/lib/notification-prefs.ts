import { prisma } from '@/lib/prisma'
import { NOTIFICATION_TYPES } from '@/lib/notification-types'
import type { NotificationType, NotificationChannel } from '@prisma/client'

export interface ResolvedPref {
  enabled: boolean
  minutesBefore: number | null
  dailyAtHour: number | null
  title: string
  body: string
}

// Resolves the full effective preference for (user, type, channel) by merging
// any stored row over the type's defaults. The caller never has to handle the
// "absent row" case — they always get a complete spec.
export async function resolvePref(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
): Promise<ResolvedPref> {
  const meta = NOTIFICATION_TYPES[type]
  const stored = await prisma.notificationPreference.findUnique({
    where: { userId_type_channel: { userId, type, channel } },
  })

  return {
    enabled: stored?.enabled ?? meta.defaults.enabled,
    minutesBefore: stored?.minutesBefore ?? meta.defaults.minutesBefore ?? null,
    dailyAtHour: stored?.dailyAtHour ?? meta.defaults.dailyAtHour ?? null,
    title: stored?.customTitle ?? meta.defaults.title,
    body: stored?.customBody ?? meta.defaults.body,
  }
}

// Same as resolvePref but for many users at once. Used by the cron paths
// where we fan out to a batch of trainers and don't want N round-trips.
export async function resolvePrefsForUsers(
  userIds: string[],
  type: NotificationType,
  channel: NotificationChannel,
): Promise<Map<string, ResolvedPref>> {
  const meta = NOTIFICATION_TYPES[type]
  const stored = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds }, type, channel },
  })
  const byUser = new Map(stored.map(s => [s.userId, s]))

  return new Map(userIds.map(uid => {
    const s = byUser.get(uid)
    return [uid, {
      enabled: s?.enabled ?? meta.defaults.enabled,
      minutesBefore: s?.minutesBefore ?? meta.defaults.minutesBefore ?? null,
      dailyAtHour: s?.dailyAtHour ?? meta.defaults.dailyAtHour ?? null,
      title: s?.customTitle ?? meta.defaults.title,
      body: s?.customBody ?? meta.defaults.body,
    }]
  }))
}
