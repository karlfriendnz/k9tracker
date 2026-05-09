'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { openExternal } from '@/lib/external-link'

const MAX_SEATS = 5

const schema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  name: z.string().min(2, 'Your name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'At least 8 characters'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  planId: string | null
  planName: string
  perSeatPrice: number
  purchasable: boolean
}

// Two-column layout on desktop: form on the left, "your plan" summary
// on the right with the seat slider + live total. Stacks on mobile.
// Submit POSTs to /api/auth/signup which provisions the account and
// returns a Stripe Checkout URL — we hand that off via openExternal so
// iOS users land in Safari (Apple-friendly) and web users navigate in
// the same tab.
export function SignupForm({ planId, planName, perSeatPrice, purchasable }: Props) {
  const [seats, setSeats] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const total = useMemo(() => Math.round(perSeatPrice * seats), [perSeatPrice, seats])

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, seats, planId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? `Signup failed (${res.status})`)
      if (data.checkoutUrl) {
        openExternal(data.checkoutUrl)
        return
      }
      // No Stripe configured (or plan has no stripePriceId) — fall back
      // to the email-verify flow that the legacy /register uses.
      window.location.href = `/verify-account?email=${encodeURIComponent(values.email)}`
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
      {/* ── Left: account details ──────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Field label="Business name" error={errors.businessName?.message}>
          <input
            {...register('businessName')}
            type="text"
            placeholder="Pawsome Dog Training"
            autoComplete="organization"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="Your name" error={errors.name?.message}>
          <input
            {...register('name')}
            type="text"
            placeholder="Sarah Carter"
            autoComplete="name"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="Email" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            placeholder="you@yourbusiness.com"
            autoComplete="email"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="Phone (optional)">
          <input
            {...register('phone')}
            type="tel"
            placeholder="+64 …"
            autoComplete="tel"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="Password" error={errors.password?.message} hint="At least 8 characters.">
          <input
            {...register('password')}
            type="password"
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
      </div>

      {/* ── Right: plan summary + seat slider ──────────────────────── */}
      <aside
        className="rounded-2xl border bg-white p-5 shadow-sm flex flex-col"
        style={{ borderColor: 'rgba(245, 158, 11, 0.45)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--pm-accent-500)' }}>
          Your plan
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{planName}</p>

        <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Number of trainers
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={MAX_SEATS}
            step={1}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value))}
            className="w-full accent-amber-500"
            aria-label="Number of trainers"
          />
          <span className="w-9 text-right text-base font-semibold text-slate-900 tabular-nums">{seats}</span>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-slate-400 tabular-nums">
          <span>1</span>
          <span>{MAX_SEATS}+</span>
        </div>

        <div className="mt-5 rounded-xl p-4" style={{ background: 'var(--pm-ink-50, #f5f8f9)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900 tabular-nums">${total}</span>
            <span className="text-sm text-slate-500">NZD / month</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            ${perSeatPrice} per trainer × {seats} {seats === 1 ? 'trainer' : 'trainers'}
          </p>
          <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--pm-brand-700)' }}>
            Free for 10 days. Card needed for trial — cancel any time.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
          style={{ background: 'var(--pm-brand-600)' }}
        >
          {submitting ? 'Setting up…' : 'Continue to payment'}
        </button>

        {!purchasable && (
          <p className="mt-3 text-[11px] text-slate-500">
            Stripe isn&apos;t wired up in this environment yet — you&apos;ll be sent to email verification instead and you can finish payment from your dashboard.
          </p>
        )}

        {serverError && (
          <p className="mt-3 text-xs text-red-600">{serverError}</p>
        )}
      </aside>
    </form>
  )
}

function Field({
  label, error, hint, children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error
        ? <p className="text-xs text-red-600">{error}</p>
        : hint
          ? <p className="text-xs text-slate-400">{hint}</p>
          : null}
    </div>
  )
}
