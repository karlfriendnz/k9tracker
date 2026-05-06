'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Copy, Check, Trash2, Pencil, ExternalLink,
  Globe, ToggleLeft, ToggleRight, Code2, FileText,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormEditorModal as SessionFormEditorModal } from './session/session-forms-manager'
import type { FormRow as SessionFormRow, CustomFieldOption as SessionCustomFieldOption } from './session/session-forms-manager'
import { CustomFieldsManager } from '../settings/custom-fields-manager'

// ─── Types ─────────────────────────────────────────────────────────────────

type FieldKey = 'phone' | 'message'

const STANDARD_FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'phone', label: 'Phone number' },
  { key: 'message', label: 'Message / notes' },
]

interface EmbedForm {
  id: string
  title: string
  description: string | null
  fields: { key: string; required: boolean }[]
  customFieldIds: string[]
  thankYouTitle: string | null
  thankYouMessage: string | null
  isActive: boolean
}

interface CustomField {
  id: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'DROPDOWN'
  required: boolean
  appliesTo: 'OWNER' | 'DOG'
}

// Full custom field shape used by the intake editor
export interface IntakeCustomField extends CustomField {
  options: string[]
  category: string | null
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ─── Form builder panel ───────────────────────────────────────────────────────

function FormBuilder({
  initial,
  customFields,
  onSave,
  onClose,
}: {
  initial?: EmbedForm
  customFields: CustomField[]
  onSave: (form: EmbedForm) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [thankYouTitle, setThankYouTitle] = useState(initial?.thankYouTitle ?? '')
  const [thankYou, setThankYou] = useState(initial?.thankYouMessage ?? '')
  const [fieldConfig, setFieldConfig] = useState<Record<string, { enabled: boolean; required: boolean }>>(() => {
    const init: Record<string, { enabled: boolean; required: boolean }> = {}
    for (const f of STANDARD_FIELDS) {
      const existing = initial?.fields.find(x => x.key === f.key)
      init[f.key] = { enabled: !!existing, required: existing?.required ?? false }
    }
    return init
  })
  const [enabledCustomIds, setEnabledCustomIds] = useState<Set<string>>(
    new Set(initial?.customFieldIds ?? [])
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleField(key: string, prop: 'enabled' | 'required') {
    setFieldConfig(prev => ({
      ...prev,
      [key]: { ...prev[key], [prop]: !prev[key]?.[prop] },
    }))
  }

  function toggleCustom(id: string) {
    setEnabledCustomIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    if (!title.trim()) { setError('Form title is required.'); return }
    setSaving(true)
    setError(null)

    const fields = STANDARD_FIELDS
      .filter(f => fieldConfig[f.key]?.enabled)
      .map(f => ({ key: f.key, required: fieldConfig[f.key]?.required ?? false }))

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      fields,
      customFieldIds: Array.from(enabledCustomIds),
      thankYouTitle: thankYouTitle.trim() || null,
      thankYouMessage: thankYou.trim() || null,
      isActive: initial?.isActive ?? true,
    }

    const res = initial
      ? await fetch(`/api/embed-forms/${initial.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/embed-forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.detail ?? data.error ?? 'Failed to save form.')
      setSaving(false)
      return
    }
    const saved = await res.json()
    onSave({ ...payload, id: saved.id, isActive: saved.isActive })
    onClose()
  }

  const ownerCustom = customFields.filter(f => f.appliesTo === 'OWNER')
  const dogCustom = customFields.filter(f => f.appliesTo === 'DOG')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
      <div className="w-full sm:max-w-xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-900">
            {initial ? 'Edit form' : 'New embed form'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0 flex flex-col gap-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Basic info */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Form title <span className="text-red-500">*</span></label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Register with us"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Description (optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="A short intro shown at the top of the form"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Standard fields */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Fields</p>
            <p className="text-xs text-slate-400 mb-3">Name and email are always included. Add custom fields below for anything dog-specific (breed, vax status, etc.).</p>
            <div className="flex flex-col gap-2">
              {STANDARD_FIELDS.map(f => (
                <FieldToggleRow
                  key={f.key}
                  label={f.label}
                  enabled={fieldConfig[f.key]?.enabled ?? false}
                  required={fieldConfig[f.key]?.required ?? false}
                  onToggleEnabled={() => toggleField(f.key, 'enabled')}
                  onToggleRequired={() => toggleField(f.key, 'required')}
                />
              ))}
              {ownerCustom.map(cf => (
                <CustomFieldToggleRow
                  key={cf.id}
                  label={cf.label}
                  required={cf.required}
                  enabled={enabledCustomIds.has(cf.id)}
                  onToggle={() => toggleCustom(cf.id)}
                />
              ))}
              {dogCustom.map(cf => (
                <CustomFieldToggleRow
                  key={cf.id}
                  label={`${cf.label} (dog)`}
                  required={cf.required}
                  enabled={enabledCustomIds.has(cf.id)}
                  onToggle={() => toggleCustom(cf.id)}
                />
              ))}
            </div>
          </div>

          {/* Success page copy */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Success page</p>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Heading</label>
              <input
                value={thankYouTitle}
                onChange={e => setThankYouTitle(e.target.value)}
                placeholder="You're registered!"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Body</label>
              <textarea
                value={thankYou}
                onChange={e => setThankYou(e.target.value)}
                rows={3}
                placeholder="Thanks for registering. Check your email — we've sent you a link to access your training diary."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <Button onClick={save} loading={saving} className="w-full">
            {initial ? 'Save changes' : 'Create form'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function FieldToggleRow({
  label,
  enabled,
  required,
  onToggleEnabled,
  onToggleRequired,
}: {
  label: string
  enabled: boolean
  required: boolean
  onToggleEnabled: () => void
  onToggleRequired: () => void
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${enabled ? 'border-blue-200 bg-blue-50' : 'border-slate-200'}`}>
      <button onClick={onToggleEnabled} className="flex-shrink-0">
        {enabled
          ? <ToggleRight className="h-5 w-5 text-blue-600" />
          : <ToggleLeft className="h-5 w-5 text-slate-300" />}
      </button>
      <span className={`flex-1 text-sm font-medium ${enabled ? 'text-slate-900' : 'text-slate-400'}`}>
        {label}
      </span>
      {enabled && (
        <button
          onClick={onToggleRequired}
          className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
            required
              ? 'border-red-300 bg-red-50 text-red-600'
              : 'border-slate-200 text-slate-400 hover:border-slate-300'
          }`}
        >
          {required ? 'Required' : 'Optional'}
        </button>
      )}
    </div>
  )
}

function CustomFieldToggleRow({
  label,
  required,
  enabled,
  onToggle,
}: {
  label: string
  required: boolean
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${enabled ? 'border-violet-200 bg-violet-50' : 'border-slate-200'}`}>
      <button onClick={onToggle} className="flex-shrink-0">
        {enabled
          ? <ToggleRight className="h-5 w-5 text-violet-600" />
          : <ToggleLeft className="h-5 w-5 text-slate-300" />}
      </button>
      <span className={`flex-1 text-sm font-medium ${enabled ? 'text-slate-900' : 'text-slate-400'}`}>
        {label}
      </span>
      {enabled && (
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
          required
            ? 'border-red-300 bg-red-50 text-red-600'
            : 'border-slate-200 text-slate-400'
        }`}>
          {required ? 'Required' : 'Optional'}
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type FormType = 'INTAKE' | 'EMBED' | 'SESSION'

const TYPE_BADGE: Record<FormType, { label: string; cls: string; Icon: typeof Globe }> = {
  INTAKE: { label: 'Intake', cls: 'bg-amber-100 text-amber-700', Icon: ClipboardList },
  EMBED: { label: 'Embed', cls: 'bg-blue-100 text-blue-700', Icon: Globe },
  SESSION: { label: 'Session', cls: 'bg-violet-100 text-violet-700', Icon: FileText },
}

export function FormsManager({
  initialForms,
  customFields,
  initialSessionForms,
  intakeCustomFields,
  sessionCustomFieldOptions,
}: {
  initialForms: EmbedForm[]
  customFields: CustomField[]
  initialSessionForms: SessionFormRow[]
  intakeCustomFields: IntakeCustomField[]
  sessionCustomFieldOptions: SessionCustomFieldOption[]
}) {
  const router = useRouter()
  const [forms, setForms] = useState<EmbedForm[]>(initialForms)
  const [sessionForms, setSessionForms] = useState<SessionFormRow[]>(initialSessionForms)
  const [building, setBuilding] = useState<EmbedForm | 'new' | null>(null)
  const [editingSession, setEditingSession] = useState<SessionFormRow | 'new' | null>(null)
  const [editingIntake, setEditingIntake] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  function formUrl(id: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? '')
    return `${origin}/form/${id}`
  }

  function embedCode(id: string) {
    return `<iframe src="${formUrl(id)}" width="100%" height="700" style="border:none;border-radius:12px;" title="Registration form"></iframe>`
  }

  function onSaveEmbed(saved: EmbedForm) {
    setForms(prev => {
      const idx = prev.findIndex(f => f.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  function onSaveSession(saved: SessionFormRow, isNew: boolean) {
    setSessionForms(prev => isNew ? [saved, ...prev] : prev.map(f => f.id === saved.id ? saved : f))
  }

  async function toggleActive(form: EmbedForm) {
    const res = await fetch(`/api/embed-forms/${form.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !form.isActive }),
    })
    if (!res.ok) return
    setForms(prev => prev.map(f => f.id === form.id ? { ...f, isActive: !f.isActive } : f))
  }

  async function deleteEmbed(id: string) {
    if (!confirm('Delete this form? This cannot be undone.')) return
    const res = await fetch(`/api/embed-forms/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setForms(prev => prev.filter(f => f.id !== id))
  }

  async function deleteSession(id: string) {
    if (!confirm('Delete this form? Existing responses on past sessions stay attached but you cannot edit them.')) return
    const res = await fetch(`/api/session-forms/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setSessionForms(prev => prev.filter(f => f.id !== id))
  }

  const intakeFieldCount = intakeCustomFields.length

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          All your forms in one place. Intake gates new clients, embed forms capture leads, session forms record reports.
        </p>
        <Button size="sm" onClick={() => setPicking(true)}>
          <Plus className="h-4 w-4" />
          New form
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {/* Intake form (singleton) */}
        <FormRowCard
          type="INTAKE"
          title="Intake form"
          description="The first form a client fills in when accepted. You can also fill it on their behalf from a client's edit page."
          meta={`${intakeFieldCount} field${intakeFieldCount === 1 ? '' : 's'} configured`}
          onEdit={() => setEditingIntake(true)}
        />

        {/* Embed forms */}
        {forms.map(form => (
          <div key={form.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <TypeBadgeIcon type="EMBED" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{form.title}</p>
                  <TypeBadge type="EMBED" />
                  <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                    form.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {form.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {form.description && <p className="text-sm text-slate-400 truncate mt-0.5">{form.description}</p>}
                <p className="text-xs text-slate-400 mt-1">
                  {form.fields.length + form.customFieldIds.length} optional field{form.fields.length + form.customFieldIds.length !== 1 ? 's' : ''} configured
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a href={formUrl(form.id)} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Preview form">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button onClick={() => toggleActive(form)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors" title={form.isActive ? 'Deactivate' : 'Activate'}>
                  {form.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
                <button onClick={() => setBuilding(form)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Edit form">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setExpandedId(expandedId === form.id ? null : form.id)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors" title="Get embed code">
                  <Code2 className="h-4 w-4" />
                </button>
                <button onClick={() => deleteEmbed(form.id)} className="p-2 text-slate-300 hover:text-red-400 transition-colors" title="Delete form">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {expandedId === form.id && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-slate-50">
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Direct link</p>
                      <CopyButton text={formUrl(form.id)} label="Copy link" />
                    </div>
                    <p className="text-xs text-slate-600 font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 break-all">{formUrl(form.id)}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Embed code</p>
                      <CopyButton text={embedCode(form.id)} label="Copy code" />
                    </div>
                    <pre className="text-xs text-slate-600 font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">{embedCode(form.id)}</pre>
                    <p className="text-xs text-slate-400 mt-1.5">Paste this snippet into your website&apos;s HTML wherever you&apos;d like the form to appear.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Session forms */}
        {sessionForms.map(f => (
          <div key={f.id} className="bg-white rounded-2xl border border-slate-200">
            <div className="flex items-center gap-4 p-4">
              <TypeBadgeIcon type="SESSION" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{f.name}</p>
                  <TypeBadge type="SESSION" />
                </div>
                {f.description && <p className="text-sm text-slate-400 truncate mt-0.5">{f.description}</p>}
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                  <span>{f.questions.length} question{f.questions.length === 1 ? '' : 's'}</span>
                  {f.responses > 0 && <><span>·</span><span className="text-blue-600">{f.responses} filled</span></>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setEditingSession(f)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Edit form">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => deleteSession(f.id)} className="p-2 text-slate-300 hover:text-red-400 transition-colors" title="Delete form">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Type picker for "+ New form" */}
      {picking && (
        <TypePicker
          onPick={(type) => {
            setPicking(false)
            if (type === 'EMBED') setBuilding('new')
            else if (type === 'SESSION') setEditingSession('new')
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {/* Embed form builder modal */}
      {building && (
        <FormBuilder
          initial={building === 'new' ? undefined : building}
          customFields={customFields}
          onSave={onSaveEmbed}
          onClose={() => setBuilding(null)}
        />
      )}

      {/* Session form editor modal */}
      {editingSession && (
        <SessionFormEditorModal
          existing={editingSession === 'new' ? null : editingSession}
          customFields={sessionCustomFieldOptions}
          onClose={() => setEditingSession(null)}
          onSaved={(f, isNew) => { onSaveSession(f, isNew); setEditingSession(null) }}
        />
      )}

      {/* Intake (custom fields) editor modal */}
      {editingIntake && (
        <IntakeEditorModal
          initialFields={intakeCustomFields}
          onClose={() => { setEditingIntake(false); router.refresh() }}
        />
      )}
    </>
  )
}

function TypeBadge({ type }: { type: FormType }) {
  const meta = TYPE_BADGE[type]
  return (
    <span className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

function TypeBadgeIcon({ type }: { type: FormType }) {
  const meta = TYPE_BADGE[type]
  const Icon = meta.Icon
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${meta.cls}`}>
      <Icon className="h-5 w-5" />
    </div>
  )
}

function FormRowCard({
  type,
  title,
  description,
  meta,
  onEdit,
}: {
  type: FormType
  title: string
  description: string
  meta: string
  onEdit: () => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      <div className="flex items-center gap-4 p-4">
        <TypeBadgeIcon type={type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 truncate">{title}</p>
            <TypeBadge type={type} />
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
          <p className="text-xs text-slate-400 mt-1">{meta}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function TypePicker({ onPick, onClose }: { onPick: (t: 'EMBED' | 'SESSION') => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative z-50 bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">New form</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Pick a form type. (Intake is a singleton — edit it from the row above.)</p>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => onPick('EMBED')}
            className="flex items-start gap-3 text-left rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors p-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 flex-shrink-0"><Globe className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Embed form</p>
              <p className="text-xs text-slate-500 mt-0.5">Public lead-capture form to embed on your website. Submissions land in your enquiries.</p>
            </div>
          </button>
          <button
            onClick={() => onPick('SESSION')}
            className="flex items-start gap-3 text-left rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-colors p-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 flex-shrink-0"><FileText className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Session form</p>
              <p className="text-xs text-slate-500 mt-0.5">Template you attach to a training session to capture a structured report.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

function IntakeEditorModal({
  initialFields,
  onClose,
}: {
  initialFields: IntakeCustomField[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Intake form</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fields here gate new clients on first login and appear on each client&apos;s edit page.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <CustomFieldsManager initialFields={initialFields} />
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0 flex justify-end">
          <Button size="sm" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  )
}
