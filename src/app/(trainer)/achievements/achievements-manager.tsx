'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { Trophy, Pencil, Trash2, X, Plus } from 'lucide-react'

type Color = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky' | 'orange' | 'teal' | 'pink' | 'slate'

const COLORS: { key: Color; bgChip: string; ring: string; text: string }[] = [
  { key: 'blue',    bgChip: 'bg-blue-100 text-blue-600',       ring: 'ring-blue-200',    text: 'text-blue-700' },
  { key: 'emerald', bgChip: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-200', text: 'text-emerald-700' },
  { key: 'amber',   bgChip: 'bg-amber-100 text-amber-600',     ring: 'ring-amber-200',   text: 'text-amber-700' },
  { key: 'rose',    bgChip: 'bg-rose-100 text-rose-600',       ring: 'ring-rose-200',    text: 'text-rose-700' },
  { key: 'violet',  bgChip: 'bg-violet-100 text-violet-600',   ring: 'ring-violet-200',  text: 'text-violet-700' },
  { key: 'sky',     bgChip: 'bg-sky-100 text-sky-600',         ring: 'ring-sky-200',     text: 'text-sky-700' },
  { key: 'orange',  bgChip: 'bg-orange-100 text-orange-600',   ring: 'ring-orange-200',  text: 'text-orange-700' },
  { key: 'teal',    bgChip: 'bg-teal-100 text-teal-600',       ring: 'ring-teal-200',    text: 'text-teal-700' },
  { key: 'pink',    bgChip: 'bg-pink-100 text-pink-600',       ring: 'ring-pink-200',    text: 'text-pink-700' },
  { key: 'slate',   bgChip: 'bg-slate-200 text-slate-600',     ring: 'ring-slate-200',   text: 'text-slate-700' },
]

const COLOR_BY_KEY = Object.fromEntries(COLORS.map(c => [c.key, c])) as Record<Color, typeof COLORS[number]>

interface Achievement {
  id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
}

const COMMON_ICONS = ['🏆', '⭐', '🥇', '🎖️', '🐾', '🦴', '💯', '🚀', '🔥', '🎯', '🌟', '👑']
const DEFAULT_COLOR: Color = 'amber'

export function AchievementsManager({ initial }: { initial: Achievement[] }) {
  const [items, setItems] = useState<Achievement[]>(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Draft form state shared between add + edit modes.
  const [draftName, setDraftName] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [draftIcon, setDraftIcon] = useState<string>('🏆')
  const [draftColor, setDraftColor] = useState<Color>(DEFAULT_COLOR)

  function resetDraft() {
    setDraftName('')
    setDraftDesc('')
    setDraftIcon('🏆')
    setDraftColor(DEFAULT_COLOR)
    setError(null)
  }

  function startAdd() {
    resetDraft()
    setEditingId(null)
    setShowAdd(true)
  }

  function startEdit(a: Achievement) {
    setEditingId(a.id)
    setShowAdd(false)
    setDraftName(a.name)
    setDraftDesc(a.description ?? '')
    setDraftIcon(a.icon ?? '🏆')
    setDraftColor(((a.color ?? DEFAULT_COLOR) as Color) in COLOR_BY_KEY ? (a.color as Color) : DEFAULT_COLOR)
    setError(null)
  }

  function cancel() {
    setEditingId(null)
    setShowAdd(false)
    resetDraft()
  }

  async function save() {
    if (!draftName.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    const body = {
      name: draftName.trim(),
      description: draftDesc.trim() || null,
      icon: draftIcon || null,
      color: draftColor,
    }
    const res = editingId
      ? await fetch(`/api/achievements/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/achievements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (!res.ok) { setError('Failed to save'); return }
    const saved: Achievement = await res.json()
    setItems(prev => editingId
      ? prev.map(a => a.id === editingId ? saved : a)
      : [...prev, saved],
    )
    cancel()
  }

  async function remove(id: string) {
    if (!confirm('Delete this achievement?')) return
    const prev = items
    setItems(p => p.filter(a => a.id !== id))
    const res = await fetch(`/api/achievements/${id}`, { method: 'DELETE' })
    if (!res.ok) setItems(prev)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Existing list */}
      {items.length === 0 ? (
        <Card>
          <CardBody className="text-center py-10">
            <div className="h-14 w-14 rounded-3xl bg-amber-50 flex items-center justify-center mx-auto">
              <Trophy className="h-6 w-6 text-amber-500" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">No achievements yet</p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
              Create badges your clients can earn — first session, 30-day streak, off-leash recall, whatever fits your programme.
            </p>
          </CardBody>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(a => {
            const tone = COLOR_BY_KEY[(a.color as Color) ?? DEFAULT_COLOR] ?? COLOR_BY_KEY[DEFAULT_COLOR]
            const isEditing = editingId === a.id
            return (
              <li key={a.id} className={`relative rounded-2xl bg-white border border-slate-100 shadow-sm p-4 ring-1 ${tone.ring} ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${tone.bgChip} shrink-0`}>
                    {a.icon || '🏆'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
                    {a.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(a)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Add/Edit form */}
      {(showAdd || editingId) ? (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              {editingId ? 'Edit achievement' : 'New achievement'}
            </p>
            <button onClick={cancel} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Live preview */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${COLOR_BY_KEY[draftColor].bgChip}`}>
              {draftIcon || '🏆'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{draftName.trim() || 'Untitled achievement'}</p>
              <p className="text-xs text-slate-500 truncate">{draftDesc.trim() || 'Description shows up here'}</p>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <Input
            label="Name"
            placeholder="e.g. First session complete"
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            maxLength={80}
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Description</label>
            <textarea
              value={draftDesc}
              onChange={e => setDraftDesc(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="What earns this badge?"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Icon</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COMMON_ICONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setDraftIcon(emoji)}
                  className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center border transition-colors ${
                    draftIcon === emoji ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <input
                type="text"
                value={draftIcon}
                onChange={e => setDraftIcon(e.target.value.slice(0, 4))}
                placeholder="Custom"
                className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Colour</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setDraftColor(c.key)}
                  title={c.key}
                  className={`h-8 w-8 rounded-full ${c.bgChip} border-2 transition-colors ${
                    draftColor === c.key ? 'border-slate-900' : 'border-transparent hover:border-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={cancel} className="flex-1">Cancel</Button>
            <Button type="button" onClick={save} loading={saving} className="flex-1">
              {editingId ? 'Save changes' : 'Add achievement'}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={startAdd}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add achievement
        </button>
      )}
    </div>
  )
}
