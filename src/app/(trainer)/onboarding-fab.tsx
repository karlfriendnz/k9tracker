'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Building2, ClipboardList, Notebook, Package, Trophy, Eye, Mail, PawPrint, Calendar, type LucideIcon } from 'lucide-react'

const STEP_ICON: Record<string, LucideIcon> = {
  business_profile: Building2,
  intake_form: ClipboardList,
  session_form: Notebook,
  program_package: Package,
  achievements: Trophy,
  client_view: Eye,
  invite_client: Mail,
  schedule_session: Calendar,
}

// One-line nudge under the step title so the trainer knows exactly what
// "complete" means without having to open the wizard. Keep these short and
// action-first; the panel/modal carries the longer copy.
const STEP_HINT: Record<string, string> = {
  business_profile: 'Drop your business name, contact details and logo into Settings.',
  intake_form: 'Check the intake form and publish it when you\'re happy.',
  session_form: 'Set up the form your clients see after each session.',
  program_package: 'Create your first programme so you can assign sessions.',
  achievements: 'Tweak the starter achievements and publish the ones you like.',
  client_view: 'Take a quick walk through what your clients will see.',
  invite_client: 'Invite your first real client to get the ball rolling.',
  schedule_session: 'Pop a session in the calendar for your client.',
}

interface Props {
  nextStep: { key: string; title: string; order: number }
  totalSteps: number
}

const FAB_LAST_STEP_KEY = 'pm-fab-last-step'

// "Continue setup" banner pinned to the top of the trainer content area.
// Hidden on /dashboard since the persistent checklist + modal already live
// there. Click → /dashboard?wizard=1 which the panel honours by auto-
// opening the modal at the next incomplete step.
export function OnboardingFab({ nextStep, totalSteps }: Props) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])

  // Detect changes in nextStep.key vs the last value we displayed (stored in
  // sessionStorage so it survives navigation between pages). Drives the
  // celebration animation when a step just completed.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const last = sessionStorage.getItem(FAB_LAST_STEP_KEY)
    if (last && last !== nextStep.key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCelebrating(true)
      const timer = setTimeout(() => setCelebrating(false), 1100)
      sessionStorage.setItem(FAB_LAST_STEP_KEY, nextStep.key)
      return () => clearTimeout(timer)
    }
    sessionStorage.setItem(FAB_LAST_STEP_KEY, nextStep.key)
  }, [nextStep.key])

  if (!mounted) return null
  if (pathname === '/dashboard') return null

  const Icon = STEP_ICON[nextStep.key] ?? PawPrint
  const hint = STEP_HINT[nextStep.key]

  return (
    <Link
      href="/dashboard?wizard=1"
      aria-label={`Continue setup: ${nextStep.title}`}
      className={`group sticky top-0 z-30 flex items-center gap-4 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur border-b border-slate-200 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.18)] hover:bg-white transition-colors ${celebrating ? 'animate-pm-fab-bounce' : ''}`}
    >
      {/* Left: instruction — what the trainer needs to do to clear this step. */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600 leading-none">
          What to do
        </p>
        <p className="text-sm text-slate-700 leading-snug mt-1.5 line-clamp-2">
          {hint ?? `Open the wizard to wrap up ${nextStep.title.toLowerCase()}.`}
        </p>
      </div>

      {/* Vertical divider on tablet+desktop only — collapses to nothing on
          phones where the layout stacks tighter. */}
      <span className="hidden sm:block self-stretch w-px bg-slate-200" aria-hidden />

      {/* Right: which step + arrow affordance. */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        <span
          aria-hidden
          className={`grid place-items-center h-9 w-9 shrink-0 rounded-xl text-white shadow-md ${
            celebrating
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/40 animate-pm-fab-flash'
              : 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 shadow-blue-600/30'
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="hidden xs:flex flex-col min-w-0 max-w-[180px] sm:max-w-[220px]">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 leading-none">
            Step {nextStep.order} of {totalSteps}
          </span>
          <span className="text-sm font-semibold text-slate-900 truncate leading-tight mt-0.5">
            {nextStep.title}
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
      </div>
    </Link>
  )
}
