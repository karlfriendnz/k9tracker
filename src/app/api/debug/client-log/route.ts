import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Lightweight client-event logger. Beacons from the WebView land here
// and we shovel them into the platform log (Vercel function logs in
// prod, terminal in dev) — that way when the iOS WebView crashes
// mid-flow we can still see the last step it reached. No DB write,
// no rate limiting; the volume is tiny and the surface is auth-only.
export async function POST(req: Request) {
  const session = await auth().catch(() => null)
  let body: { event?: string; data?: unknown } = {}
  try { body = await req.json() } catch { /* ignore — log empty */ }
  console.log('[client-log]', JSON.stringify({
    user: session?.user?.id ?? 'anon',
    role: session?.user?.role ?? null,
    event: body.event ?? 'unknown',
    data: body.data ?? null,
    ua: req.headers.get('user-agent') ?? null,
    at: new Date().toISOString(),
  }))
  return NextResponse.json({ ok: true })
}
