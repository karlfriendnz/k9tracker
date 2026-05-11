import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type BackLink = { href: string; label?: string }

interface PageHeaderProps {
  title: string
  subtitle?: React.ReactNode
  back?: BackLink
  actions?: React.ReactNode
  // Pages that don't use the standard p-4 md:p-8 wrapper can opt out of the
  // negative-margin breakout (the header then renders flush inside its
  // parent instead of bursting through page padding).
  flush?: boolean
}

// Shared sticky page header used across the trainer & client app. Pins to
// the top of the viewport while the user scrolls and reserves
// env(safe-area-inset-top) so iOS chrome (time/battery) renders against the
// header's solid white surface — Style.Dark glyphs need a light background
// to stay legible.
//
// Layout contract:
// - Designed to live INSIDE the standard `p-4 md:p-8 max-w-* mx-auto` page
//   wrapper. The negative top/x margins bust out of that padding so the
//   sticky surface is flush with the screen edges.
// - The page's <main> already has a capped safe-area-inset-top pad (see
//   app-shell.tsx). The header's negative top margin pulls back through
//   that pad too, then re-adds the inset internally as paddingTop.
// - Use `flush` for pages that don't use p-4 md:p-8 (e.g. centered text
//   wrappers, billing flows).
export function PageHeader({ title, subtitle, back, actions, flush = false }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-20 mb-4 bg-white border-b border-slate-100',
        !flush && '-mt-4 md:-mt-8 -mx-4 md:-mx-8 px-4 md:px-8',
      )}
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.625rem)',
        paddingBottom: '0.625rem',
        // Pull through <main>'s capped safe-area-inset-top pad AND the
        // page's own top padding so the bar's surface sits flush.
        marginTop: flush ? undefined : 'calc(min(env(safe-area-inset-top, 0px), 1rem) * -1 - 1rem)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {back && (
          <Link
            href={back.href}
            aria-label={back.label ?? 'Back'}
            className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-slate-900 truncate leading-tight">{title}</h1>
          {subtitle && (
            <div className="text-xs text-slate-500 truncate leading-tight mt-0.5">{subtitle}</div>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  )
}
