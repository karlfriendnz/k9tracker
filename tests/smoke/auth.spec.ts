import { test, expect } from '@playwright/test'

test.describe('Auth routes', () => {
  test('login page renders without crashing', async ({ page }) => {
    const res = await page.goto('/login')
    expect(res?.status(), 'login should return 200').toBe(200)
    // Settled UI hint — the email field exists. If it doesn't, the layout or
    // login-form import broke.
    await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('home redirects unauth users to login', async ({ request }) => {
    // Use request (not page) so we don't rely on JS-based navigation timing —
    // the middleware redirect happens at the network layer and is what we're
    // actually validating here.
    const r = await request.get('/', { maxRedirects: 0 })
    expect(r.status()).toBe(307)
    expect(r.headers().location ?? '').toContain('/login')
  })

  test('GET /api/auth/session returns null for unauthed user', async ({ request }) => {
    const r = await request.get('/api/auth/session')
    expect(r.status()).toBe(200)
    const body = await r.json()
    // Either {} or { user: null } depending on NextAuth state — both indicate
    // no session, which is what we expect.
    expect(body?.user ?? null).toBeNull()
  })
})
