'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Settings2, X, Loader2 } from 'lucide-react'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

type ExtraFieldId = 'location' | 'description' | 'sessionType' | 'duration' | 'title'

const EXTRA_FIELD_OPTIONS: { id: ExtraFieldId; label: string }[] = [
  { id: 'location',    label: 'Location / suburb' },
  { id: 'sessionType', label: 'Session type' },
  { id: 'duration',    label: 'Duration' },
  { id: 'description', label: 'Notes' },
  { id: 'title',       label: 'Title' },
]

const MAX_EXTRA_FIELDS = 2

/**
 * Trainer-side schedule view preferences: visible hour range and which
 * weekdays render. PATCHes /api/trainer/profile and refreshes the page so
 * the new range applies immediately.
 */
export function ScheduleSettings({
  startHour,
  endHour,
  days,
  extraFields,
}: {
  startHour: number
  endHour: number
  days: number[]   // 1=Mon..7=Sun
  extraFields: ExtraFieldId[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState(startHour)
  const [draftEnd, setDraftEnd] = useState(endHour)
  const [draftDays, setDraftDays] = useState<Set<number>>(new Set(days))
  // Order matters: it's the render order on the block. Keep as a list, not a set.
  const [draftExtra, setDraftExtra] = useState<ExtraFieldId[]>(extraFields)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDay(d: number) {
    setDraftDays(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d); else next.add(d)
      return next
    })
  }

  function toggleExtra(id: ExtraFieldId) {
    setDraftExtra(prev => {
      if (prev.includes(id)) return prev.filter(f => f !== id)
      if (prev.length >= MAX_EXTRA_FIELDS) return prev
      return [...prev, id]
    })
  }

  async function handleSave() {
    setError(null)
    if (draftEnd <= draftStart) { setError('End hour must be after start hour'); return }
    if (draftDays.size === 0) { setError('Pick at least one day'); return }
    setSaving(true)
    const res = await fetch('/api/trainer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduleStartHour: draftStart,
        scheduleEndHour: draftEnd,
        scheduleDays: Array.from(draftDays).sort((a, b) => a - b),
        scheduleExtraFields: draftExtra,
      }),
    })
    setSaving(false)
    if (!res.ok) { setError('Failed to save'); return }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" /> View
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative z-50 bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Schedule view</h2>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Visible hours</label>
                <div className="flex items-center gap-2">
                  <select
                    value={draftStart}
                    onChange={e => setDraftStart(Number(e.target.value))}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{labelHour(h)}</option>
                    ))}
                  </select>
                  <span className="text-slate-400">to</span>
                  <select
                    value={draftEnd}
                    onChange={e => setDraftEnd(Number(e.target.value))}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 24 }, (_, h) => h + 1).map(h => (
                      <option key={h} value={h}>{labelHour(h % 24 || 24)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Days shown</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((label, idx) => {
                    const dayValue = idx + 1   // 1=Mon..7=Sun
                    const active = draftDays.has(dayValue)
                    return (
                      <button
                        key={dayValue}
                        onClick={() => toggleDay(dayValue)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2 flex gap-2 text-[11px]">
                  <button
                    onClick={() => setDraftDays(new Set([1, 2, 3, 4, 5]))}
                    className="text-blue-600 hover:underline"
                  >
                    Weekdays
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => setDraftDays(new Set([1, 2, 3, 4, 5, 6, 7]))}
                    className="text-blue-600 hover:underline"
                  >
                    All week
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Extra block fields</label>
                <p className="text-[11px] text-slate-400 mb-1.5">Pick up to {MAX_EXTRA_FIELDS} to show on each session block.</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXTRA_FIELD_OPTIONS.map(opt => {
                    const idx = draftExtra.indexOf(opt.id)
                    const active = idx !== -1
                    const disabled = !active && draftExtra.length >= MAX_EXTRA_FIELDS
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleExtra(opt.id)}
                        disabled={disabled}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : disabled
                              ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {active && <span className="mr-1 text-white/80">{idx + 1}.</span>}
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function labelHour(h: number): string {
  if (h === 0 || h === 24) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}
