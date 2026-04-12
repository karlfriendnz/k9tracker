'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

const planSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  priceMonthly: z.coerce.number().min(0),
  maxClients: z.coerce.number().int().positive().optional().or(z.literal('')),
  isActive: z.boolean(),
})

type PlanData = z.infer<typeof planSchema>

interface Plan {
  id: string
  name: string
  description: string | null
  priceMonthly: number
  maxClients: number | null
  isActive: boolean
}

export function ManagePlansForm({ plans: initialPlans }: { plans: Plan[] }) {
  const router = useRouter()
  const [plans, setPlans] = useState(initialPlans)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const form = useForm<PlanData>({
    resolver: zodResolver(planSchema),
    defaultValues: { isActive: true, priceMonthly: 0 },
  })

  async function savePlan(data: PlanData, planId?: string) {
    const url = planId ? `/api/admin/plans/${planId}` : '/api/admin/plans'
    const res = await fetch(url, {
      method: planId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, maxClients: data.maxClients || null }),
    })
    if (!res.ok) { setMsg('Failed to save plan.'); return }
    setMsg('Plan saved!')
    setEditingId(null)
    setShowNew(false)
    form.reset()
    router.refresh()
    const updated = await res.json()
    setPlans(prev => planId ? prev.map(p => p.id === planId ? updated : p) : [...prev, updated])
  }

  return (
    <div className="flex flex-col gap-4">
      {msg && <Alert variant={msg === 'Plan saved!' ? 'success' : 'error'}>{msg}</Alert>}

      {plans.map(plan => (
        <div key={plan.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
          {editingId === plan.id ? (
            <PlanForm form={form} defaultValues={plan} onSave={d => savePlan(d, plan.id)} onCancel={() => { setEditingId(null); form.reset() }} />
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white text-lg">{plan.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${plan.isActive ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'}`}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {plan.description && <p className="text-slate-400 text-sm mt-0.5">{plan.description}</p>}
                <p className="text-blue-400 font-semibold mt-2">
                  ${plan.priceMonthly}/month · {plan.maxClients == null ? 'Unlimited clients' : `Up to ${plan.maxClients} clients`}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                onClick={() => { setEditingId(plan.id); form.reset({ ...plan, maxClients: plan.maxClients ?? '' }) }}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      ))}

      {showNew ? (
        <div className="bg-slate-800 rounded-2xl border border-blue-600 p-5">
          <h3 className="font-semibold text-white mb-4">New plan</h3>
          <PlanForm form={form} onSave={d => savePlan(d)} onCancel={() => { setShowNew(false); form.reset() }} />
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 py-2"
        >
          <Plus className="h-4 w-4" /> Add new plan
        </button>
      )}
    </div>
  )
}

function PlanForm({ form, defaultValues, onSave, onCancel }: {
  form: ReturnType<typeof useForm<PlanData>>
  defaultValues?: Partial<PlanData>
  onSave: (d: PlanData) => void
  onCancel: () => void
}) {
  return (
    <form onSubmit={form.handleSubmit(onSave)} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Plan name</label>
          <input className="w-full h-10 rounded-xl bg-slate-700 border border-slate-600 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" {...form.register('name')} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Price / month (USD)</label>
          <input type="number" className="w-full h-10 rounded-xl bg-slate-700 border border-slate-600 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" {...form.register('priceMonthly')} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Max clients (blank = unlimited)</label>
          <input type="number" className="w-full h-10 rounded-xl bg-slate-700 border border-slate-600 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" {...form.register('maxClients')} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Description</label>
          <input className="w-full h-10 rounded-xl bg-slate-700 border border-slate-600 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" {...form.register('description')} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" {...form.register('isActive')} /> Active (visible to trainers)
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={form.formState.isSubmitting}>Save plan</Button>
        <Button type="button" variant="ghost" size="sm" className="text-slate-400" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
