'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { ChevronDown, ChevronRight } from 'lucide-react'

export interface WeeklyTask {
  id: string
  title: string
  date: string         // ISO date
  clientId: string
  clientName: string
  dogName: string | null
  completed: boolean
}

/**
 * Drop-in replacement for the static "Tasks this week" StatCard. Click to
 * expand a panel listing every task scheduled to clients in the last 7 days,
 * with completion state and a link through to the client's profile.
 */
export function WeeklyTasksStat({ tasks }: { tasks: WeeklyTask[] }) {
  const [open, setOpen] = useState(false)
  const completedCount = tasks.filter(t => t.completed).length

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-left col-span-full md:col-span-1 group"
        aria-expanded={open}
      >
        <Card className="p-4 text-center group-hover:border-blue-200 group-hover:shadow-sm transition-all">
          <p className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-1">
            {tasks.length}
            {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Tasks this week</p>
        </Card>
      </button>

      {open && (
        // The expanded panel takes the full grid width below the stat cards.
        <div className="col-span-2 md:col-span-4 -mt-2">
          <Card className="overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">Tasks this week</p>
              <p className="text-xs text-slate-500">{completedCount} of {tasks.length} completed</p>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-400 px-5 py-6 text-center">No tasks assigned in the last 7 days.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {tasks.map(t => {
                  const d = new Date(t.date)
                  return (
                    <Link
                      key={t.id}
                      href={`/clients/${t.clientId}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                        t.completed ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {t.completed ? '✓' : '○'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {t.clientName}{t.dogName ? ` · 🐕 ${t.dogName}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
