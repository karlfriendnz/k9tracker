import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, ListTodo, ChevronRight, Dog, FileText, Receipt } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'To do' }

// Past sessions that still need either a write-up OR an invoice. Once both
// are recorded the row drops off automatically. Note that we don't filter on
// status here — invoicing/notes are independent of the completion lifecycle.
async function loadPendingSessions(trainerId: string) {
  const now = new Date()
  return prisma.trainingSession.findMany({
    where: {
      trainerId,
      scheduledAt: { lt: now },
      clientId: { not: null },
      OR: [
        { formResponses: { none: {} } },
        { invoicedAt: null },
      ],
    },
    // Oldest first — this is a backlog queue, not a feed. The next session
    // the trainer needs to work on is the one that's been waiting longest.
    orderBy: { scheduledAt: 'asc' },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      durationMins: true,
      status: true,
      invoicedAt: true,
      _count: { select: { formResponses: true } },
      client: { select: { user: { select: { name: true, email: true } } } },
      dog: {
        select: {
          name: true,
          primaryFor: { take: 1, select: { user: { select: { name: true, email: true } } } },
        },
      },
    },
  })
}

// Monday-anchored week start in local server time.
function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  const day = out.getDay()
  const diff = day === 0 ? -6 : 1 - day
  out.setDate(out.getDate() + diff)
  return out
}

function formatWeekLabel(weekStart: Date): string {
  const today = startOfWeek(new Date())
  const diffMs = today.getTime() - weekStart.getTime()
  const weeksAgo = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7))
  if (weeksAgo === 0) return 'This week'
  if (weeksAgo === 1) return 'Last week'
  if (weeksAgo < 4) return `${weeksAgo} weeks ago`
  return weekStart.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function SessionsTodoPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const trainerId = session.user.trainerId
  if (!trainerId) redirect('/login')

  const sessions = await loadPendingSessions(trainerId)
  const needsNotesCount = sessions.filter(s => s._count.formResponses === 0).length
  const needsInvoiceCount = sessions.filter(s => s.invoicedAt == null).length

  // Group by Monday-anchored week so the trainer can scan one week at a time.
  // Map preserves insertion order which is ASC by scheduledAt, so the oldest
  // week is at the top — the "next up" in the backlog queue.
  type Row = (typeof sessions)[number]
  const byWeek = new Map<string, { weekStart: Date; sessions: Row[] }>()
  for (const s of sessions) {
    const ws = startOfWeek(new Date(s.scheduledAt))
    const key = ws.toISOString().split('T')[0]
    const existing = byWeek.get(key)
    if (existing) existing.sessions.push(s)
    else byWeek.set(key, { weekStart: ws, sessions: [s] })
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ListTodo className="h-6 w-6 text-amber-500" />
          Sessions to wrap up
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {sessions.length === 0
            ? 'You\'re all caught up — every past session has notes recorded and is invoiced.'
            : (
              <>
                {needsNotesCount > 0 && <>{needsNotesCount} need notes</>}
                {needsNotesCount > 0 && needsInvoiceCount > 0 && <> · </>}
                {needsInvoiceCount > 0 && <>{needsInvoiceCount} need invoicing</>}
              </>
            )}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-slate-200 p-10 text-center">
          <ListTodo className="h-8 w-8 mx-auto text-slate-300" />
          <p className="text-sm font-medium text-slate-600 mt-3">All caught up</p>
          <p className="text-xs text-slate-400 mt-1">Past sessions only show here while notes or invoicing are pending.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(byWeek.values()).map(({ weekStart, sessions }) => (
            <section key={weekStart.toISOString()}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 flex items-baseline gap-2">
                <span>{formatWeekLabel(weekStart)}</span>
                <span className="text-slate-300 font-normal normal-case tracking-normal">
                  {weekStart.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })} —
                  {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                </span>
              </h2>
              <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden">
                {sessions.map((s, i) => {
                  const clientUser = s.client?.user ?? s.dog?.primaryFor[0]?.user
                  const clientName = clientUser ? (clientUser.name ?? clientUser.email) : null
                  const start = new Date(s.scheduledAt)
                  const needsNotes = s._count.formResponses === 0
                  const needsInvoice = s.invoicedAt == null
                  return (
                    <Link
                      key={s.id}
                      href={`/sessions/${s.id}`}
                      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors ${i > 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-amber-50 text-amber-700 flex-shrink-0">
                        <span className="text-[10px] font-semibold uppercase leading-none">
                          {start.toLocaleDateString('en-NZ', { weekday: 'short' })}
                        </span>
                        <span className="text-sm font-bold leading-tight">
                          {start.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{s.title}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          {s.dog && (
                            <span className="inline-flex items-center gap-1">
                              <Dog className="h-3 w-3" /> {s.dog.name}
                            </span>
                          )}
                          {clientName && (
                            <>
                              {s.dog && <span className="text-slate-300">·</span>}
                              <span className="truncate">{clientName}</span>
                            </>
                          )}
                          <span className="text-slate-300">·</span>
                          <span>
                            {start.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </div>
                      </div>
                      {/* Pending-action chips — one per outstanding task on
                          the row. Both can show side-by-side. Hidden on the
                          narrowest viewports to keep the row tight; the
                          colour pip below the row name carries the same
                          info on phones. */}
                      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                        {needsNotes && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <FileText className="h-3 w-3" /> Notes
                          </span>
                        )}
                        {needsInvoice && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            <Receipt className="h-3 w-3" /> Invoice
                          </span>
                        )}
                      </div>
                      {/* Mobile: show compact dot indicators instead of full
                          chips. Same colour code as the desktop chips. */}
                      <div className="sm:hidden flex items-center gap-1 flex-shrink-0">
                        {needsNotes && (
                          <span className="h-2 w-2 rounded-full bg-amber-500" title="Needs notes" />
                        )}
                        {needsInvoice && (
                          <span className="h-2 w-2 rounded-full bg-purple-500" title="Needs invoice" />
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
