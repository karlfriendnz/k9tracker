import { prisma } from '@/lib/prisma'
import { Flame, Award } from 'lucide-react'
import {
  isoWeekKey,
  activeWeekKeys,
  currentStreak,
  longestStreak,
  streakAtRisk,
  TRAINER_BADGES,
} from '@/lib/trainer-streak'

// Tasteful trainer-dashboard engagement widget: current/longest weekly
// streak + earned badges + the next one to aim for. Understated on
// purpose — this is a B2B tool, not a game.
export async function TrainerStreakWidget({ trainerId }: { trainerId: string }) {
  const week = isoWeekKey(new Date())
  const [keys, awards] = await Promise.all([
    activeWeekKeys(trainerId),
    prisma.trainerBadgeAward.findMany({
      where: { trainerId },
      select: { badgeKey: true },
      orderBy: { awardedAt: 'desc' },
    }),
  ])

  const streak = currentStreak(keys, week)
  const longest = longestStreak(keys)
  const atRisk = streakAtRisk(keys, week)
  const earnedKeys = new Set(awards.map(a => a.badgeKey))
  const earned = TRAINER_BADGES.filter(b => earnedKeys.has(b.key))
  const next = TRAINER_BADGES.find(b => !earnedKeys.has(b.key))

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl flex-shrink-0 ${
            streak > 0 ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-400'
          }`}
        >
          <Flame className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {streak > 0 ? (
              <>
                {streak}-week streak
                {atRisk && (
                  <span className="ml-2 text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    act this week
                  </span>
                )}
              </>
            ) : (
              'Start a streak this week'
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {streak > 0
              ? `Longest: ${longest} week${longest === 1 ? '' : 's'} · keep it going by working in PupManager each week`
              : 'Write session notes, assign a package or run a session to begin.'}
          </p>
        </div>
      </div>

      {(earned.length > 0 || next) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {earned.slice(0, 6).map(b => (
            <span
              key={b.key}
              title={b.description}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-medium px-2 py-1"
            >
              <Award className="h-3 w-3" /> {b.name}
            </span>
          ))}
          {next && (
            <span className="text-[11px] text-slate-400">
              Next: <span className="text-slate-600 font-medium">{next.name}</span> — {next.description}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
