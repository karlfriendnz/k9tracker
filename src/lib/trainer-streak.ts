// Trainer engagement gamification engine. Weekly "active streak":
// consecutive ISO weeks in which the trainer did a qualifying action.
// Pure date/streak math is split out for unit testing; the DB touch +
// badge persistence live at the bottom. Distinct from the client-facing
// Achievement system.
import { prisma } from './prisma'

// ─── Pure ISO-week + streak math (unit-tested) ───────────────────────────────

/** ISO-8601 week key for a date, e.g. "2026-W20". */
export function isoWeekKey(d: Date): string {
  // Work on a UTC copy at midnight to avoid TZ/DST drift.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  // ISO weekday: Mon=1..Sun=7. Shift to the Thursday of this week.
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const year = t.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/**
 * Monotonic integer for a week key so consecutive weeks differ by exactly
 * 1 — including across year boundaries. Uses 53 slots/year (ISO years
 * have 52 or 53 weeks; the gap at 52→next-year-01 is still +1 because we
 * also bump the year component, so we instead compare via a running list
 * — see weeksAreConsecutive). Here we just need a stable sortable key.
 */
export function weekSortValue(key: string): number {
  const [y, w] = key.split('-W')
  return Number(y) * 53 + Number(w)
}

/**
 * Longest run of consecutive ISO weeks present in `keys`. Consecutiveness
 * is checked by walking actual calendar weeks (add 7 days) so year
 * rollovers (…-W52 → next -W01) count correctly.
 */
export function longestStreak(keys: string[]): number {
  const set = new Set(keys)
  if (set.size === 0) return 0
  const sorted = [...set].sort((a, b) => weekSortValue(a) - weekSortValue(b))
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    if (nextWeekKey(sorted[i - 1]) === sorted[i]) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

/** The ISO week key immediately after `key` (calendar-correct). */
export function nextWeekKey(key: string): string {
  const [y, w] = key.split('-W').map(Number)
  // Thursday of that ISO week + 7 days, re-keyed.
  const jan4 = new Date(Date.UTC(y, 0, 4))
  const week1Mon = new Date(jan4)
  week1Mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1))
  const thisMon = new Date(week1Mon)
  thisMon.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7)
  thisMon.setUTCDate(thisMon.getUTCDate() + 7)
  return isoWeekKey(thisMon)
}

/**
 * Current streak length ending at `currentWeek`. The streak is still
 * "alive" if the trainer was active this week OR last week (a one-week
 * grace so it doesn't read 0 mid-week before they've acted yet).
 */
export function currentStreak(keys: string[], currentWeek: string): number {
  const set = new Set(keys)
  if (set.size === 0) return 0
  const prev = previousWeekKey(currentWeek)
  // Anchor: latest of (this week if active, else last week if active).
  let anchor: string
  if (set.has(currentWeek)) anchor = currentWeek
  else if (set.has(prev)) anchor = prev
  else return 0
  let count = 0
  let cursor = anchor
  while (set.has(cursor)) {
    count += 1
    cursor = previousWeekKey(cursor)
  }
  return count
}

/** The ISO week key immediately before `key`. */
export function previousWeekKey(key: string): string {
  const [y, w] = key.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(y, 0, 4))
  const week1Mon = new Date(jan4)
  week1Mon.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1))
  const thisMon = new Date(week1Mon)
  thisMon.setUTCDate(week1Mon.getUTCDate() + (w - 1) * 7)
  thisMon.setUTCDate(thisMon.getUTCDate() - 7)
  return isoWeekKey(thisMon)
}

/**
 * True when the trainer has a live streak but hasn't acted *this* week
 * yet — the moment a daily nudge should warn them.
 */
export function streakAtRisk(keys: string[], currentWeek: string): boolean {
  const set = new Set(keys)
  if (set.has(currentWeek)) return false
  return currentStreak(keys, currentWeek) > 0
}

// ─── Badge catalogue (in code, like NOTIFICATION_TYPES) ──────────────────────

export interface TrainerStats {
  clients: number
  sessionsDelivered: number
  currentStreakWeeks: number
  longestStreakWeeks: number
}

export interface BadgeDef {
  key: string
  name: string
  description: string
  earned: (s: TrainerStats) => boolean
}

export const TRAINER_BADGES: BadgeDef[] = [
  { key: 'first_client', name: 'Open for business', description: 'Added your first client.', earned: s => s.clients >= 1 },
  { key: 'clients_10', name: 'Building a roster', description: '10 clients on the books.', earned: s => s.clients >= 10 },
  { key: 'clients_25', name: 'In demand', description: '25 clients.', earned: s => s.clients >= 25 },
  { key: 'sessions_10', name: 'Getting going', description: '10 sessions delivered.', earned: s => s.sessionsDelivered >= 10 },
  { key: 'sessions_50', name: 'Seasoned', description: '50 sessions delivered.', earned: s => s.sessionsDelivered >= 50 },
  { key: 'sessions_200', name: 'Veteran', description: '200 sessions delivered.', earned: s => s.sessionsDelivered >= 200 },
  { key: 'streak_4w', name: 'One-month habit', description: '4-week activity streak.', earned: s => s.longestStreakWeeks >= 4 },
  { key: 'streak_12w', name: 'Quarter strong', description: '12-week activity streak.', earned: s => s.longestStreakWeeks >= 12 },
  { key: 'streak_26w', name: 'Half-year hero', description: '26-week activity streak.', earned: s => s.longestStreakWeeks >= 26 },
]

/** Badge keys the stats currently satisfy. */
export function evaluateBadges(s: TrainerStats): string[] {
  return TRAINER_BADGES.filter(b => b.earned(s)).map(b => b.key)
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

/**
 * Record that the trainer did a qualifying action now — idempotent per
 * ISO week. Best-effort: callers fire-and-forget so a streak write never
 * fails the underlying mutation.
 */
export async function touchTrainerActivity(trainerId: string): Promise<void> {
  const isoWeek = isoWeekKey(new Date())
  try {
    await prisma.trainerActivityWeek.upsert({
      where: { trainerId_isoWeek: { trainerId, isoWeek } },
      create: { trainerId, isoWeek },
      update: {},
    })
  } catch (e) {
    console.error('[touchTrainerActivity] failed', e)
  }
}

/** Active-week keys for a trainer (most recent ~80 weeks is plenty). */
export async function activeWeekKeys(trainerId: string): Promise<string[]> {
  const rows = await prisma.trainerActivityWeek.findMany({
    where: { trainerId },
    orderBy: { isoWeek: 'desc' },
    take: 80,
    select: { isoWeek: true },
  })
  return rows.map(r => r.isoWeek)
}

/**
 * Persist any newly-earned badges and return the freshly-awarded keys
 * (so a caller can notify). Idempotent via the unique constraint.
 */
export async function syncBadges(trainerId: string, stats: TrainerStats): Promise<string[]> {
  const eligible = evaluateBadges(stats)
  if (eligible.length === 0) return []
  const existing = await prisma.trainerBadgeAward.findMany({
    where: { trainerId, badgeKey: { in: eligible } },
    select: { badgeKey: true },
  })
  const have = new Set(existing.map(e => e.badgeKey))
  const fresh = eligible.filter(k => !have.has(k))
  if (fresh.length > 0) {
    await prisma.trainerBadgeAward.createMany({
      data: fresh.map(badgeKey => ({ trainerId, badgeKey })),
      skipDuplicates: true,
    })
  }
  return fresh
}
