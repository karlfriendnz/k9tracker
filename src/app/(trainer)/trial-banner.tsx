import Link from 'next/link'
import { ArrowRight, AlertTriangle, XCircle } from 'lucide-react'

interface Props {
  status: 'ACTIVE' | 'INACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED'
  trialEndsAt: Date | null
}

type Tone = 'indigo' | 'amber' | 'red'

interface BannerCopy {
  headline: string
  subtext: string
  cta: string
  tone: Tone
  daysLeft: number | null
}

// Resolves the trainer's billing state into the floating chip's content.
// Single source of truth — keeps the JSX below dumb. Returns null when
// nothing needs nagging (the trainer is on an active paid plan).
function resolveCopy(status: Props['status'], trialEndsAt: Date | null): BannerCopy | null {
  if (status === 'ACTIVE') return null

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null

  if (status === 'TRIALING' && daysLeft !== null && daysLeft > 0) {
    return {
      headline: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
      subtext: 'Free trial — pick a plan to keep going',
      cta: 'Start plan',
      tone: daysLeft <= 3 ? 'amber' : 'indigo',
      daysLeft,
    }
  }
  if (status === 'TRIALING') {
    return {
      headline: 'Trial finished',
      subtext: 'Pick a plan to keep using PupManager',
      cta: 'Pick a plan',
      tone: 'amber',
      daysLeft: 0,
    }
  }
  if (status === 'PAST_DUE') {
    return {
      headline: 'Payment failed',
      subtext: 'Last charge didn\'t go through',
      cta: 'Fix it up',
      tone: 'amber',
      daysLeft: null,
    }
  }
  if (status === 'CANCELLED') {
    return {
      headline: 'Subscription ended',
      subtext: 'Restart your plan when you\'re ready',
      cta: 'Restart',
      tone: 'red',
      daysLeft: null,
    }
  }
  if (status === 'INACTIVE') {
    return {
      headline: 'No active plan',
      subtext: 'Choose a plan to get started',
      cta: 'See plans',
      tone: 'indigo',
      daysLeft: null,
    }
  }
  return null
}

// Floating bottom-right chip. Three tones + a state-aware leading
// visual: a glass day-count circle when the trainer's still trialing,
// or an alert icon when something's gone wrong. Subtle shimmer on the
// indigo variant + a hover lift make it feel less like a nag and more
// like a living surface.
export function TrialBanner({ status, trialEndsAt }: Props) {
  const copy = resolveCopy(status, trialEndsAt)
  if (!copy) return null

  const toneShell: Record<Tone, string> = {
    indigo: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white animate-pm-trial-shimmer',
    amber:  'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 border border-amber-200/80',
    red:    'bg-gradient-to-br from-red-50 to-red-100 text-red-900 border border-red-200/80',
  }

  const toneAvatar: Record<Tone, string> = {
    indigo: 'bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm',
    amber:  'bg-amber-200/80 text-amber-900 ring-1 ring-amber-300/60',
    red:    'bg-red-200/80 text-red-900 ring-1 ring-red-300/60',
  }

  const toneCta: Record<Tone, string> = {
    indigo: 'bg-white text-indigo-700 hover:bg-white/95 shadow-sm',
    amber:  'bg-amber-700 text-white hover:bg-amber-800',
    red:    'bg-red-700 text-white hover:bg-red-800',
  }

  const toneSubtext: Record<Tone, string> = {
    indigo: 'text-white/80',
    amber:  'text-amber-700',
    red:    'text-red-700',
  }

  // Choose the leading visual: a day-count circle for an in-progress
  // trial (the number is the headline of the message anyway, big and
  // legible at a glance), or an alert icon for the warning states.
  const leading = copy.daysLeft !== null && copy.daysLeft > 0 ? (
    <div className={`shrink-0 grid place-items-center h-10 w-10 rounded-full font-bold text-base tabular-nums ${toneAvatar[copy.tone]}`}>
      {copy.daysLeft}
    </div>
  ) : (
    <div className={`shrink-0 grid place-items-center h-10 w-10 rounded-full ${toneAvatar[copy.tone]}`}>
      {copy.tone === 'red'
        ? <XCircle className="h-5 w-5" />
        : <AlertTriangle className="h-5 w-5" />}
    </div>
  )

  return (
    <Link
      href="/billing/plans"
      aria-label={`${copy.headline}: ${copy.subtext}`}
      className={`group fixed right-2.5 bottom-[5.625rem] md:bottom-2.5 z-30 flex items-center gap-3 px-3 py-2.5 pr-2 rounded-2xl shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)] max-w-[calc(100%-1.25rem)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-14px_rgba(15,23,42,0.45)] ${toneShell[copy.tone]}`}
    >
      {leading}

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-tight tracking-tight">
          {copy.headline}
        </p>
        <p className={`text-[11px] leading-tight mt-0.5 truncate ${toneSubtext[copy.tone]}`}>
          {copy.subtext}
        </p>
      </div>

      <span
        className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${toneCta[copy.tone]}`}
      >
        {copy.cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
