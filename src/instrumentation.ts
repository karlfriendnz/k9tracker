// Next.js calls this once per server runtime at boot. We import env here so
// that any missing/invalid environment variable crashes the server immediately
// with a useful error, rather than producing a confusing 500 inside a request
// handler later.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/lib/env')
  }
}
