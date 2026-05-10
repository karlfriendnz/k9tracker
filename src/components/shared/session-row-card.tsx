import Link from 'next/link'
import { Dog, ShoppingBag, ArrowRight, DollarSign } from 'lucide-react'
import { cn, formatSessionTitle } from '@/lib/utils'

export type SessionRowStatus = 'UPCOMING' | 'COMPLETED' | 'COMMENTED' | 'INVOICED'

// Minimal shape the card needs. Both the dashboard and the schedule list
// already fetch this from Prisma; consumers can pass extra props through
// without touching this contract.
export interface SessionRowSession {
  id: string
  title: string
  scheduledAt: Date | string
  durationMins: number
  status: SessionRowStatus
  // Independent of status — set when the trainer marks the session invoiced.
  // When present, the card shows an "Invoiced" pill in place of the status.
  invoicedAt?: Date | string | null
  location?: string | null
  clientId?: string | null
  client?: { user: { name: string | null; email: string } } | null
  dog?: {
    name: string
    primaryFor?: { user: { name: string | null; email: string } }[]
  } | null
}

export interface SessionRowCardProps {
  session: SessionRowSession
  /** IANA tz used to format the start time. Defaults to en-NZ system tz. */
  tz?: string
  /** Override the destination href (defaults to /sessions/:id). */
  href?: string
  /** Renders a "n to bring" chip in the body — used by the dashboard. */
  toBringCount?: number
  /** Visually fade the card (used by the schedule's search filter). */
  dimmed?: boolean
  /** Sibling rendered after the Link card — typically a delete button. */
  trailing?: React.ReactNode
  /** Surface the date in the time-rail. Off by default — the dashboard
   *  and schedule are day-scoped so the date would just add noise.
   *  On for mixed-date lists like a client's Sessions tab. */
  showDate?: boolean
}

const STATUS_META: Record<SessionRowStatus, { label: string; colour: string }> = {
  UPCOMING:  { label: 'Upcoming',  colour: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'Completed', colour: 'bg-green-50 text-green-700 border-green-200' },
  COMMENTED: { label: 'Commented', colour: 'bg-amber-50 text-amber-700 border-amber-200' },
  INVOICED:  { label: 'Invoiced',  colour: 'bg-purple-50 text-purple-700 border-purple-200' },
}


/**
 * The dashboard-style session card — coloured time rail on the left,
 * dog/client/title body in the middle, and a blue action rail on the right.
 * Whole card is a Link to /sessions/:id; pass `trailing` to add adjacent
 * controls (e.g. a delete button) outside the Link.
 */
export function SessionRowCard({
  session: s,
  tz,
  href,
  toBringCount,
  dimmed,
  trailing,
  showDate,
}: SessionRowCardProps) {
  const start = new Date(s.scheduledAt)
  const isPast = start.getTime() + s.durationMins * 60_000 < Date.now()
  // Invoiced is now signalled by the standalone dollar-sign disc, not the
  // status pill, so the pill keeps its workflow meaning. Legacy rows that
  // still have status=INVOICED (pre-migration) are treated as invoiced for
  // the disc colour.
  const isInvoiced = s.invoicedAt != null || s.status === 'INVOICED'
  const meta = STATUS_META[s.status]
  const startTime = start.toLocaleTimeString('en-NZ', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz,
  })
  const startDateShort = showDate
    ? start.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', timeZone: tz })
    : null

  const clientUser = s.client?.user ?? s.dog?.primaryFor?.[0]?.user
  const clientName = clientUser ? (clientUser.name ?? clientUser.email) : null
  const displayTitle = formatSessionTitle(s.title)

  const card = (
    <Link
      href={href ?? `/sessions/${s.id}`}
      aria-label={`Open session: ${displayTitle}`}
      className={cn(
        'block rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-px hover:border-blue-200 flex-1 min-w-0',
        isPast && 'opacity-60',
      )}
    >
      <div className="flex items-stretch sm:h-12 sm:min-h-12">
        {/* Time rail — coloured by past/future, compact on desktop. */}
        <div className={cn(
          'flex-shrink-0 w-[72px] sm:w-auto sm:px-3 flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 px-2 py-2.5 sm:py-0 text-center border-r',
          isPast
            ? 'bg-slate-50 border-slate-100 text-slate-500'
            : 'bg-blue-50/60 border-blue-100 text-blue-700',
        )}>
          {startDateShort && (
            <p className="text-[10px] sm:text-[11px] font-semibold leading-none opacity-80 mb-0.5 sm:mb-0">{startDateShort}</p>
          )}
          <p className="text-base sm:text-sm font-bold leading-none tabular-nums">{startTime}</p>
          <p className="text-[10px] sm:text-[11px] font-medium opacity-70 mt-0.5 sm:mt-0">{s.durationMins} min</p>
        </div>

        {/* Body — stacked on mobile, single row on desktop. */}
        <div className="flex-1 min-w-0 px-3 py-2 sm:py-0 sm:px-3.5 flex flex-col sm:flex-row sm:items-center gap-y-0.5 sm:gap-y-0 sm:gap-x-2">
          <div className="inline-flex items-center gap-1.5 min-w-0">
            {s.dog ? (
              <>
                <Dog className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" aria-hidden />
                <p className="text-sm font-semibold text-slate-900 truncate">{s.dog.name}</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-slate-900 truncate">{displayTitle}</p>
            )}
          </div>

          {clientName && (
            <>
              <span className="hidden sm:inline text-slate-300" aria-hidden>·</span>
              <p className="text-xs font-medium text-slate-700 truncate sm:max-w-[18ch]">{clientName}</p>
            </>
          )}

          {s.dog && (
            <>
              <span className="hidden sm:inline text-slate-300" aria-hidden>·</span>
              <p className="text-xs text-slate-500 truncate sm:max-w-[26ch]">{displayTitle}</p>
            </>
          )}

          <span className={cn(
            'inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap self-start mt-1 sm:mt-0 sm:ml-auto sm:self-auto',
            meta.colour,
          )}>
            {meta.label}
          </span>

          {/* Invoice indicator — green-filled disc when invoiced, red outlined
              disc when not. Always shows so the trainer can see billing state
              at a glance without opening the session. */}
          <span
            className={cn(
              'inline-flex items-center justify-center h-5 w-5 rounded-full self-start mt-1 sm:mt-0 sm:self-auto flex-shrink-0',
              isInvoiced
                ? 'bg-emerald-500 text-white'
                : 'border-2 border-rose-500 text-rose-500 bg-white',
            )}
            title={isInvoiced ? 'Invoiced' : 'Not invoiced'}
            aria-label={isInvoiced ? 'Invoiced' : 'Not invoiced'}
          >
            <DollarSign className="h-3 w-3" strokeWidth={isInvoiced ? 2.5 : 3} />
          </span>

          {toBringCount != null && toBringCount > 0 && (
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 whitespace-nowrap flex-shrink-0"
              title={`${toBringCount} to bring`}
            >
              <ShoppingBag className="h-3 w-3" aria-hidden />
              {toBringCount} to bring
            </span>
          )}
        </div>

        {/* Action rail — visual only, the parent Link handles navigation. */}
        <div
          aria-hidden
          className="group flex-shrink-0 w-14 sm:w-auto flex items-center justify-center gap-1 sm:gap-1.5 px-0 sm:px-3 bg-blue-600 text-white transition-colors"
        >
          <span className="hidden sm:inline text-xs font-semibold">Start</span>
          <ArrowRight className="h-4 w-4 sm:h-3.5 sm:w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  )

  if (!trailing && !dimmed) return card

  return (
    <div className={cn('flex items-stretch gap-2', dimmed && 'opacity-20 pointer-events-none')}>
      {card}
      {trailing}
    </div>
  )
}
