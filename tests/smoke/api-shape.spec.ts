import { test, expect } from '@playwright/test'

// Authenticated APIs should reject unauth callers, but the rejection format
// depends on whether the route is in PUBLIC_PATHS in proxy.ts:
//   - Listed there (e.g. /api/cron/*): handler runs, returns JSON 401
//   - Not listed: middleware redirects to /login (status 307)
// Either is correct. What we're guarding against is a route that crashes
// before any auth check and returns an empty body — exactly the regression
// that bit us with notification-preferences earlier today.

const ENDPOINTS: { method: 'GET' | 'POST'; path: string }[] = [
  { method: 'GET',  path: '/api/notification-preferences' },
  { method: 'POST', path: '/api/notification-preferences/test' },
  { method: 'POST', path: '/api/devices/register' },
  { method: 'POST', path: '/api/devices/test-push' },
]

test.describe('Authed API endpoints', () => {
  for (const { method, path } of ENDPOINTS) {
    test(`${method} ${path} rejects unauth without crashing`, async ({ request }) => {
      const r = method === 'GET'
        ? await request.get(path, { maxRedirects: 0 })
        : await request.post(path, { data: {}, maxRedirects: 0 })

      const status = r.status()
      expect([307, 401, 403], `${path} should reject unauth (got ${status})`).toContain(status)

      if (status === 401) {
        // 401 means the route handler ran, so the body must be a JSON error —
        // an empty body would mean the route crashed before auth and is the
        // regression class we explicitly want to catch.
        const text = await r.text()
        expect(text.length, `${path} 401 body should not be empty`).toBeGreaterThan(0)
        expect(() => JSON.parse(text), `${path} 401 body should be JSON`).not.toThrow()
      }
    })
  }
})
