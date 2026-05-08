'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const DISMISS_KEY = 'pm-client-guide-dismissed'

// Inline overlay rendered above the client header when the trainer is still
// in onboarding. Explains that this page IS the trainer's view of one of
// their clients, and gestures (via pulsing dots scattered through the rest
// of the page) at the things they can actually do from here. One-shot per
// trainer per session — once dismissed, sessionStorage keeps it gone for
// the duration of the visit.
export function OnboardingClientGuide() {
  // Render nothing on first SSR pass (sessionStorage isn't available),
  // then mount on the client once we can read the flag — avoids a hydration
  // mismatch when the dismiss state diverges.
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  if (!mounted || dismissed) return null

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-4 text-white shadow-[0_10px_30px_-8px_rgba(99,102,241,0.55)]">
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1')
          setDismissed(true)
        }}
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
        Welcome to a client's profile
      </p>
      <p className="mt-1.5 text-sm leading-snug text-white pr-8">
        This is your client&apos;s profile — everything you need to run their training lives here.
        Look for the <span className="inline-block h-2 w-2 rounded-full bg-white align-middle ring-2 ring-white/40 mx-0.5" /> indigo dots: each one points at something you can do from this page.
      </p>
    </div>
  )
}

// Small absolute-positioned indigo pulse dot. Caller wraps a target element
// in `relative` so the dot sits at its corner. Only rendered while
// onboarding is active (gated by the parent server component).
export function OnboardingDot({ className = '-top-1 -right-1' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pm-menu-dot ring-2 ring-white ${className}`}
    />
  )
}
