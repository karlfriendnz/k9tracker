'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface CustomField {
  id: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'DROPDOWN'
  required: boolean
  options: string[]
  category: string | null
  appliesTo: 'OWNER' | 'DOG'
}

interface Dog {
  id: string
  name: string
}

interface Props {
  businessName: string
  customFields: CustomField[]
  dogs: Dog[]
  existingValues: Record<string, string>
}

function groupByCategory(fields: CustomField[]) {
  const groups: { category: string | null; fields: CustomField[] }[] = []
  const seen = new Set<string | null>()
  for (const f of fields) {
    const key = f.category ?? null
    if (!seen.has(key)) {
      seen.add(key)
      groups.push({ category: key, fields: fields.filter(x => (x.category ?? null) === key) })
    }
  }
  return groups
}

export function IntakeGate({ businessName, customFields, dogs, existingValues }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(existingValues)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setValue(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit() {
    // Check required fields
    const ownerFields = customFields.filter(f => f.appliesTo === 'OWNER')
    const dogFields   = customFields.filter(f => f.appliesTo === 'DOG')

    const missingRequired: string[] = []
    for (const f of ownerFields) {
      if (f.required && !values[f.id]?.trim()) missingRequired.push(f.label)
    }
    for (const dog of dogs) {
      for (const f of dogFields) {
        if (f.required && !values[`${f.id}:${dog.id}`]?.trim()) {
          missingRequired.push(`${f.label} (${dog.name})`)
        }
      }
    }
    if (missingRequired.length > 0) {
      setError(`Please fill in: ${missingRequired.join(', ')}`)
      return
    }

    setSaving(true)
    setError(null)

    const payload = Object.entries(values)
      .filter(([, v]) => v.trim())
      .map(([key, value]) => {
        const [fieldId, dogId] = key.split(':')
        return { fieldId, value, dogId: dogId ?? null }
      })

    const res = await fetch('/api/my/field-values', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: payload }),
    })

    if (!res.ok) {
      setError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    router.refresh()
  }

  const ownerFields = customFields.filter(f => f.appliesTo === 'OWNER')
  const dogFields   = customFields.filter(f => f.appliesTo === 'DOG')

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-blue-600 mb-2">{businessName}</p>
          <h1 className="text-2xl font-bold text-slate-900">Before you get started</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Your trainer has a few questions to help them support you and your dog better.
            This only takes a minute.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Owner fields */}
          {ownerFields.length > 0 && groupByCategory(ownerFields).map(group => (
            <div key={group.category ?? '__'} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4">
              {group.category && (
                <h2 className="font-semibold text-slate-800">{group.category}</h2>
              )}
              {group.fields.map(field => (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={values[field.id] ?? ''}
                  onChange={v => setValue(field.id, v)}
                />
              ))}
            </div>
          ))}

          {/* Dog fields — one section per dog */}
          {dogFields.length > 0 && dogs.map(dog => (
            <div key={dog.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4">
              <h2 className="font-semibold text-slate-800">🐕 About {dog.name}</h2>
              {groupByCategory(dogFields).map(group => (
                <div key={group.category ?? '__'}>
                  {group.category && (
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{group.category}</p>
                  )}
                  {group.fields.map(field => {
                    const key = `${field.id}:${dog.id}`
                    return (
                      <FieldInput
                        key={key}
                        field={field}
                        value={values[key] ?? ''}
                        onChange={v => setValue(key, v)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          ))}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <Button size="lg" className="w-full" onClick={handleSubmit} loading={saving}>
            Save and continue
          </Button>
        </div>
      </div>
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 block mb-1.5">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.type === 'DROPDOWN' ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select...</option>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type={field.type === 'NUMBER' ? 'number' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={field.required ? 'Required' : 'Optional'}
        />
      )}
    </div>
  )
}
