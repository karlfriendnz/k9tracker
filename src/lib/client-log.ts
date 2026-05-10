// Best-effort client-side telemetry. Posts an event to the server
// so we can read it back from Vercel function logs even when the
// WebView later crashes (the iOS app dying mid-flow takes any
// console.log entries with it; a fired-and-flushed POST survives).
//
// Uses navigator.sendBeacon when available (queues the request even
// if the page is unloading — exactly the case we care about for a
// crash) and falls back to fetch() with keepalive.

export function clientLog(event: string, data?: unknown): void {
  if (typeof window === 'undefined') return
  const url = '/api/debug/client-log'
  const payload = JSON.stringify({ event, data })
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' })
      const ok = navigator.sendBeacon(url, blob)
      if (ok) return
    }
  } catch { /* fall through */ }
  // Fetch with keepalive is the runner-up — body limited to 64 KB,
  // but our payloads are tiny.
  try {
    void fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
  } catch { /* swallow — best-effort */ }
}
