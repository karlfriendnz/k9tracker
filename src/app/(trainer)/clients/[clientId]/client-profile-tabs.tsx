'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

type Tab = 'overview' | 'dogs' | 'details'

interface Dog {
  id: string
  name: string
  breed: string | null
  weight: number | null
  dob: string | null   // pre-serialised ISO string
  notes: string | null
}

interface Task {
  id: string
  title: string
  date: string         // pre-serialised ISO string
  dogId: string | null
  completed: boolean
}

interface CustomField {
  id: string
  label: string
  appliesTo: 'OWNER' | 'DOG'
  category: string | null
}

interface Stats {
  complianceRate: number | null
  completedTasks: number
  totalTasks: number
}

interface Props {
  stats: Stats
  dogs: Dog[]
  tasks: Task[]
  customFields: CustomField[]
  fieldValueMap: Record<string, string>
  dogNames: Record<string, string>  // dogId → name
}

function groupByCategory<T extends { category: string | null }>(items: T[]) {
  const groups: { category: string | null; items: T[] }[] = []
  const seen = new Set<string | null>()
  for (const item of items) {
    const key = item.category ?? null
    if (!seen.has(key)) {
      seen.add(key)
      groups.push({ category: key, items: items.filter(x => (x.category ?? null) === key) })
    }
  }
  return groups
}

export function ClientProfileTabs({ stats, dogs, tasks, customFields, fieldValueMap, dogNames }: Props) {
  const [tab, setTab] = useState<Tab>('overview')

  const ownerFields = customFields.filter(f => f.appliesTo === 'OWNER')
  const dogFields   = customFields.filter(f => f.appliesTo === 'DOG')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'dogs',     label: dogs.length > 1 ? `Dogs (${dogs.length})` : 'Dog' },
    { id: 'details',  label: 'Details' },
  ]

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-8">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-5 text-center">
              <p className={`text-4xl font-bold mb-1 ${
                stats.complianceRate == null ? 'text-slate-300'
                : stats.complianceRate >= 70 ? 'text-green-600'
                : stats.complianceRate >= 40 ? 'text-amber-500'
                : 'text-red-500'
              }`}>
                {stats.complianceRate != null ? `${stats.complianceRate}%` : '—'}
              </p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">14-day compliance</p>
              {stats.complianceRate != null && (
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      stats.complianceRate >= 70 ? 'bg-green-500'
                      : stats.complianceRate >= 40 ? 'bg-amber-400'
                      : 'bg-red-400'
                    }`}
                    style={{ width: `${stats.complianceRate}%` }}
                  />
                </div>
              )}
            </Card>

            <Card className="p-5 text-center">
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.completedTasks}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Tasks completed</p>
              <p className="text-xs text-slate-300 mt-2">of {stats.totalTasks} assigned</p>
            </Card>

            <Card className="p-5 text-center">
              <p className="text-4xl font-bold text-slate-900 mb-1">{stats.totalTasks - stats.completedTasks}</p>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Remaining</p>
              <p className="text-xs text-slate-300 mt-2">in last 14 days</p>
            </Card>
          </div>

          {/* Recent tasks */}
          <Card>
            <CardBody className="pt-5">
              <h2 className="font-semibold text-slate-900 mb-4">Recent tasks</h2>
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No tasks assigned yet.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 py-2.5">
                      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                        task.completed ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {task.completed ? '✓' : '○'}
                      </span>
                      <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{task.title}</span>
                      {task.dogId && dogNames[task.dogId] && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex-shrink-0">
                          {dogNames[task.dogId]}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(task.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── Dogs ─────────────────────────────────────────────────────────── */}
      {tab === 'dogs' && (
        <div className={`grid gap-5 ${dogs.length > 1 ? 'md:grid-cols-2' : 'grid-cols-1 max-w-xl'}`}>
          {dogs.map(dog => {
            const dogFieldGroups = groupByCategory(dogFields)
            return (
              <Card key={dog.id} className="overflow-hidden">
                {/* Dog header */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 px-5 py-4 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900 text-lg">🐕 {dog.name}</h2>
                  {dog.breed && <p className="text-sm text-slate-500 mt-0.5">{dog.breed}</p>}
                </div>

                <CardBody className="pt-4 pb-5">
                  {/* Core vitals */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
                    {dog.weight && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Weight</p>
                        <p className="text-slate-700 font-medium">{dog.weight} kg</p>
                      </div>
                    )}
                    {dog.dob && (
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Date of birth</p>
                        <p className="text-slate-700 font-medium">{formatDate(dog.dob)}</p>
                      </div>
                    )}
                    {dog.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-400 mb-0.5">Notes</p>
                        <p className="text-slate-700">{dog.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Dog-specific custom fields */}
                  {dogFieldGroups.map(group => {
                    const filledFields = group.items.filter(f => fieldValueMap[`${f.id}:${dog.id}`])
                    if (filledFields.length === 0) return null
                    return (
                      <div key={group.category ?? '__'} className="mt-2">
                        {group.category && (
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 pb-1 border-b border-slate-100">
                            {group.category}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          {filledFields.map(field => {
                            const val = fieldValueMap[`${field.id}:${dog.id}`]
                            return (
                              <div key={field.id} className={val.length > 35 ? 'col-span-2' : ''}>
                                <p className="text-xs text-slate-400 mb-0.5">{field.label}</p>
                                <p className="text-slate-700">{val}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Details ──────────────────────────────────────────────────────── */}
      {tab === 'details' && (
        <div className="flex flex-col gap-6">
          {ownerFields.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No owner fields defined yet.</p>
              <p className="text-sm mt-1">Add fields in Settings → Custom fields.</p>
            </div>
          ) : (
            groupByCategory(ownerFields).map(group => (
              <Card key={group.category ?? '__uncategorised__'}>
                <CardBody className="pt-5">
                  <h2 className="font-semibold text-slate-900 mb-5">
                    {group.category ?? 'Additional details'}
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                    {group.items.map(field => {
                      const val = fieldValueMap[field.id]
                      return (
                        <div key={field.id} className={val && val.length > 40 ? 'col-span-2 lg:col-span-3' : ''}>
                          <p className="text-xs text-slate-400 mb-0.5">{field.label}</p>
                          <p className={val ? 'text-slate-800' : 'text-slate-300'}>
                            {val || '—'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}
    </>
  )
}
