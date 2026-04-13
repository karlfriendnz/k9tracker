'use client'

import { useState } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'

type FieldType = 'TEXT' | 'NUMBER' | 'DROPDOWN'

type AppliesTo = 'OWNER' | 'DOG'

type CustomField = {
  id: string
  label: string
  type: FieldType
  required: boolean
  options: string[]
  category: string | null
  appliesTo: AppliesTo
}

const TYPE_LABELS: Record<FieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  DROPDOWN: 'Dropdown',
}

export function CustomFieldsManager({ initialFields }: { initialFields: CustomField[] }) {
  const [fields, setFields] = useState(initialFields)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<FieldType>('TEXT')
  const [newRequired, setNewRequired] = useState(false)
  const [newOptions, setNewOptions] = useState<string[]>([])
  const [newOptionInput, setNewOptionInput] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newAppliesTo, setNewAppliesTo] = useState<AppliesTo>('OWNER')

  const [editLabel, setEditLabel] = useState('')
  const [editType, setEditType] = useState<FieldType>('TEXT')
  const [editRequired, setEditRequired] = useState(false)
  const [editOptions, setEditOptions] = useState<string[]>([])
  const [editOptionInput, setEditOptionInput] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editAppliesTo, setEditAppliesTo] = useState<AppliesTo>('OWNER')

  // Collect existing category names for autocomplete suggestions
  const existingCategories = Array.from(new Set(fields.map(f => f.category).filter(Boolean))) as string[]

  function startEdit(field: CustomField) {
    setEditingId(field.id)
    setEditLabel(field.label)
    setEditType(field.type)
    setEditRequired(field.required)
    setEditOptions(field.options)
    setEditOptionInput('')
    setEditCategory(field.category ?? '')
    setEditAppliesTo(field.appliesTo)
  }

  function cancelEdit() { setEditingId(null) }

  function cancelAdd() {
    setAdding(false)
    setNewLabel(''); setNewType('TEXT'); setNewRequired(false)
    setNewOptions([]); setNewOptionInput(''); setNewCategory('')
    setNewAppliesTo('OWNER')
  }

  async function saveNew() {
    if (!newLabel.trim()) return
    setSaving(true)
    setSaveError(null)
    const res = await fetch('/api/custom-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: newLabel.trim(), type: newType, required: newRequired,
        options: newOptions, category: newCategory.trim() || null,
        appliesTo: newAppliesTo,
      }),
    })
    if (res.ok) {
      const field = await res.json()
      setFields(prev => [...prev, {
        id: field.id, label: field.label, type: field.type,
        required: field.required,
        options: Array.isArray(field.options) ? field.options : [],
        category: field.category ?? null,
        appliesTo: (field.appliesTo ?? 'OWNER') as AppliesTo,
      }])
      cancelAdd()
    } else {
      const data = await res.json().catch(() => ({}))
      setSaveError(data.error ? JSON.stringify(data.error) : `Error ${res.status}`)
    }
    setSaving(false)
  }

  async function saveEdit(fieldId: string) {
    if (!editLabel.trim()) return
    setSaving(true)
    setSaveError(null)
    const res = await fetch(`/api/custom-fields/${fieldId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: editLabel.trim(), type: editType, required: editRequired,
        options: editOptions, category: editCategory.trim() || null,
        appliesTo: editAppliesTo,
      }),
    })
    if (res.ok) {
      setFields(prev => prev.map(f => f.id === fieldId
        ? { ...f, label: editLabel.trim(), type: editType, required: editRequired, options: editOptions, category: editCategory.trim() || null, appliesTo: editAppliesTo }
        : f
      ))
      cancelEdit()
    } else {
      const data = await res.json().catch(() => ({}))
      setSaveError(data.error ? JSON.stringify(data.error) : `Error ${res.status}`)
    }
    setSaving(false)
  }

  async function deleteField(fieldId: string) {
    if (!confirm('Delete this field? All saved values will also be removed.')) return
    const res = await fetch(`/api/custom-fields/${fieldId}`, { method: 'DELETE' })
    if (res.ok) setFields(prev => prev.filter(f => f.id !== fieldId))
  }

  function addNewOption() {
    const v = newOptionInput.trim()
    if (v) { setNewOptions(prev => [...prev, v]); setNewOptionInput('') }
  }
  function addEditOption() {
    const v = editOptionInput.trim()
    if (v) { setEditOptions(prev => [...prev, v]); setEditOptionInput('') }
  }

  // Group fields by category
  const grouped: { category: string | null; fields: CustomField[] }[] = []
  const seen = new Set<string | null>()
  for (const f of fields) {
    const key = f.category ?? null
    if (!seen.has(key)) {
      seen.add(key)
      grouped.push({ category: key, fields: fields.filter(x => (x.category ?? null) === key) })
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Custom client fields</h2>
        <p className="text-sm text-slate-500 mt-0.5">Define extra fields that appear on every client profile.</p>
      </div>

      <Card>
        <CardBody className="pt-4 pb-4 flex flex-col gap-3">
          {saveError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</p>
          )}
          {fields.length === 0 && !adding && (
            <p className="text-sm text-slate-400 text-center py-4">No custom fields yet.</p>
          )}

          {grouped.map(group => (
            <div key={group.category ?? '__uncategorised__'}>
              {group.category && (
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-1">{group.category}</p>
              )}
              <div className="flex flex-col gap-2">
                {group.fields.map(field => (
                  <div key={field.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    {editingId === field.id ? (
                      <FieldForm
                        label={editLabel} setLabel={setEditLabel}
                        type={editType} setType={setEditType}
                        required={editRequired} setRequired={setEditRequired}
                        options={editOptions} setOptions={setEditOptions}
                        optionInput={editOptionInput} setOptionInput={setEditOptionInput}
                        addOption={addEditOption}
                        category={editCategory} setCategory={setEditCategory}
                        existingCategories={existingCategories}
                        appliesTo={editAppliesTo} setAppliesTo={setEditAppliesTo}
                        onSave={() => saveEdit(field.id)}
                        onCancel={cancelEdit}
                        saving={saving}
                      />
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          <p className="text-xs text-slate-400">
                            {TYPE_LABELS[field.type]}
                            {field.type === 'DROPDOWN' && field.options.length > 0 && ` · ${field.options.join(', ')}`}
                            {' · '}
                            <span className={field.appliesTo === 'DOG' ? 'text-amber-600' : 'text-slate-400'}>
                              {field.appliesTo === 'DOG' ? 'Dog' : 'Owner'}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => startEdit(field)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-white transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteField(field.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {adding && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <FieldForm
                label={newLabel} setLabel={setNewLabel}
                type={newType} setType={setNewType}
                required={newRequired} setRequired={setNewRequired}
                options={newOptions} setOptions={setNewOptions}
                optionInput={newOptionInput} setOptionInput={setNewOptionInput}
                addOption={addNewOption}
                category={newCategory} setCategory={setNewCategory}
                existingCategories={existingCategories}
                appliesTo={newAppliesTo} setAppliesTo={setNewAppliesTo}
                onSave={saveNew}
                onCancel={cancelAdd}
                saving={saving}
              />
            </div>
          )}

          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mt-1"
            >
              <Plus className="h-4 w-4" /> Add field
            </button>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function FieldForm({
  label, setLabel, type, setType, required, setRequired,
  options, setOptions, optionInput, setOptionInput, addOption,
  category, setCategory, existingCategories,
  appliesTo, setAppliesTo,
  onSave, onCancel, saving,
}: {
  label: string; setLabel: (v: string) => void
  type: FieldType; setType: (v: FieldType) => void
  required: boolean; setRequired: (v: boolean) => void
  options: string[]; setOptions: (v: string[]) => void
  optionInput: string; setOptionInput: (v: string) => void
  addOption: () => void
  category: string; setCategory: (v: string) => void
  existingCategories: string[]
  appliesTo: AppliesTo; setAppliesTo: (v: AppliesTo) => void
  onSave: () => void; onCancel: () => void
  saving: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input label="Field name" placeholder="e.g. Emergency contact" value={label} onChange={e => setLabel(e.target.value)} className="flex-1" />
        <div className="w-36">
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Type</label>
          <select value={type} onChange={e => setType(e.target.value as FieldType)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
            <option value="DROPDOWN">Dropdown</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1.5">Applies to</label>
        <div className="flex gap-2">
          {(['OWNER', 'DOG'] as AppliesTo[]).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setAppliesTo(opt)}
              className={`flex-1 h-10 rounded-xl border text-sm font-medium transition-colors ${
                appliesTo === opt
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {opt === 'OWNER' ? 'Owner' : 'Dog'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1.5">Category <span className="text-slate-400 font-normal">(optional)</span></label>
        <input
          list="category-suggestions"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="e.g. Medical, Home Routines"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="category-suggestions">
          {existingCategories.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>

      {type === 'DROPDOWN' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-slate-500">Options</p>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-slate-700 bg-white rounded-lg border border-slate-200 px-3 py-2">{opt}</span>
              <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={optionInput}
              onChange={e => setOptionInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
              placeholder="Add option..."
              className="flex-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={addOption} className="text-blue-600 hover:text-blue-700 px-2">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
        Required field
      </label>

      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} loading={saving}>
          <Check className="h-3.5 w-3.5" /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </div>
  )
}
