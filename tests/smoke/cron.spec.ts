import { test, expect } from '@playwright/test'

// Cron endpoints must reject unauthenticated requests. Tonight's outage was
// caused by CRON_SECRET being silently empty — these tests catch that exact
// regression: an empty/missing secret would let any request through, and one
// of these assertions would fail.

const CRON_PATHS = [
  '/api/cron/session-reminders',
  '/api/cron/daily-summary',
  '/api/cron/daily-reminders',
  '/api/cron/evaluate-achievements',
]

test.describe('Cron auth', () => {
  for (const path of CRON_PATHS) {
    test(`GET ${path} without Bearer → 401`, async ({ request }) => {
      const r = await request.get(path)
      expect(r.status(), `${path} should reject unauth`).toBe(401)
    })

    test(`GET ${path} with bogus Bearer → 401`, async ({ request }) => {
      const r = await request.get(path, {
        headers: { authorization: 'Bearer not-the-real-secret' },
      })
      expect(r.status(), `${path} should reject wrong secret`).toBe(401)
    })
  }
})
