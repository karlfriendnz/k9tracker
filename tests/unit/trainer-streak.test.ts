import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/lib/prisma', () => ({ prisma: {} }))

import {
  isoWeekKey,
  nextWeekKey,
  previousWeekKey,
  longestStreak,
  currentStreak,
  streakAtRisk,
  evaluateBadges,
} from '../../src/lib/trainer-streak'

describe('isoWeekKey', () => {
  it('keys a mid-year date', () => {
    // 2026-06-02 is a Tuesday in ISO week 23.
    expect(isoWeekKey(new Date('2026-06-02T12:00:00Z'))).toBe('2026-W23')
  })
  it('Jan 1 2026 (Thu) belongs to ISO week 01', () => {
    expect(isoWeekKey(new Date('2026-01-01T12:00:00Z'))).toBe('2026-W01')
  })
  it('a Sunday stays in the same ISO week as the preceding Monday', () => {
    expect(isoWeekKey(new Date('2026-06-07T12:00:00Z'))).toBe(
      isoWeekKey(new Date('2026-06-01T12:00:00Z')),
    )
  })
})

describe('next/previousWeekKey are inverse and calendar-correct', () => {
  it('round-trips', () => {
    expect(previousWeekKey(nextWeekKey('2026-W23'))).toBe('2026-W23')
  })
  it('crosses the year boundary by exactly one week', () => {
    const last = isoWeekKey(new Date('2025-12-29T12:00:00Z')) // 2026-W01
    expect(previousWeekKey(last)).toBe(isoWeekKey(new Date('2025-12-22T12:00:00Z')))
  })
})

describe('longestStreak', () => {
  it('0 for no activity', () => {
    expect(longestStreak([])).toBe(0)
  })
  it('counts the longest consecutive run, ignoring gaps', () => {
    expect(longestStreak(['2026-W10', '2026-W11', '2026-W12', '2026-W20', '2026-W21'])).toBe(3)
  })
  it('handles unordered input + duplicates', () => {
    expect(longestStreak(['2026-W12', '2026-W10', '2026-W11', '2026-W11'])).toBe(3)
  })
})

describe('currentStreak', () => {
  it('counts back from this week when active this week', () => {
    expect(currentStreak(['2026-W21', '2026-W22', '2026-W23'], '2026-W23')).toBe(3)
  })
  it('one-week grace: still alive if last week active but not yet this week', () => {
    expect(currentStreak(['2026-W21', '2026-W22'], '2026-W23')).toBe(2)
  })
  it('broken if neither this nor last week active', () => {
    expect(currentStreak(['2026-W20'], '2026-W23')).toBe(0)
  })
  it('0 with no activity', () => {
    expect(currentStreak([], '2026-W23')).toBe(0)
  })
})

describe('streakAtRisk', () => {
  it('at risk: has a streak but not active this week yet', () => {
    expect(streakAtRisk(['2026-W21', '2026-W22'], '2026-W23')).toBe(true)
  })
  it('not at risk once active this week', () => {
    expect(streakAtRisk(['2026-W22', '2026-W23'], '2026-W23')).toBe(false)
  })
  it('not at risk with no streak at all', () => {
    expect(streakAtRisk(['2026-W10'], '2026-W23')).toBe(false)
  })
})

describe('evaluateBadges', () => {
  it('awards by thresholds crossed', () => {
    const got = evaluateBadges({ clients: 12, sessionsDelivered: 60, currentStreakWeeks: 5, longestStreakWeeks: 5 })
    expect(got).toContain('first_client')
    expect(got).toContain('clients_10')
    expect(got).not.toContain('clients_25')
    expect(got).toContain('sessions_50')
    expect(got).not.toContain('sessions_200')
    expect(got).toContain('streak_4w')
    expect(got).not.toContain('streak_12w')
  })
  it('nothing for a brand-new trainer', () => {
    expect(evaluateBadges({ clients: 0, sessionsDelivered: 0, currentStreakWeeks: 0, longestStreakWeeks: 0 })).toEqual([])
  })
})
