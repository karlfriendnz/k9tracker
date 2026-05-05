import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.SMOKE_PORT ?? 3001)
const BASE_URL = `http://localhost:${PORT}`

// Smoke tests cover the bare minimum that says "the platform is alive": auth
// routes render, cron endpoints reject unauth, public pages don't crash. They
// must NOT depend on a real database, real APNs, real S3 — they run in CI on
// every push and we don't want flaky external deps blocking deploys.

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    // /login returns 200; the root path 307-redirects to /login which can trip
    // the readiness probe.
    url: `${BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
