import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isStripeConfigured } from '@/lib/stripe'
import { PlanCard } from './plan-card'
import { Check, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Plans · PupManager' }

// Trainer-facing plan picker. Shows the trainer's current trial/sub state
// at the top, then a card per active plan with a "Start plan" CTA. The
// CTAs POST to /api/billing/checkout and either navigate in-tab (web) or
// open Safari externally (Capacitor) — see `openExternal`.
export default async function BillingPlansPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'TRAINER') redirect('/home')
  const trainerId = session.user.trainerId
  if (!trainerId) redirect('/login')

  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: {
      subscriptionStatus: true,
      subscriptionPlanId: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  })
  if (!trainer) redirect('/login')

  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceMonthly: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      priceMonthly: true,
      maxClients: true,
      stripePriceId: true,
    },
  })

  const billingReady = isStripeConfigured()
  const trialDaysLeft = trainer.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trainer.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null
  const trialActive = trainer.subscriptionStatus === 'TRIALING' && trialDaysLeft !== null && trialDaysLeft > 0
  const trialExpired = trainer.subscriptionStatus === 'TRIALING' && trialDaysLeft === 0

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Plans</h1>
        <p className="text-slate-500 text-sm mt-1">
          Pick the plan that fits where your business is at. Switch any time — no contracts.
        </p>
      </div>

      {/* Status pill — current trial / active sub state */}
      <div className="mb-8 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-3">
          <div className="grid place-items-center h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Your account</p>
            {trainer.subscriptionStatus === 'ACTIVE' ? (
              <p className="text-sm text-slate-900 mt-0.5">
                You&apos;re on a paid plan
                {trainer.currentPeriodEnd && (
                  <span className="text-slate-500"> · renews {new Date(trainer.currentPeriodEnd).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                )}
              </p>
            ) : trialActive ? (
              <p className="text-sm text-slate-900 mt-0.5">
                <span className="font-semibold">{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'}</span> left in your free trial — pick a plan below to keep going.
              </p>
            ) : trialExpired ? (
              <p className="text-sm text-slate-900 mt-0.5">
                Your trial has finished — start a plan to keep using PupManager.
              </p>
            ) : trainer.subscriptionStatus === 'PAST_DUE' ? (
              <p className="text-sm text-amber-700 mt-0.5">
                Your last payment didn&apos;t go through. Re-pick a plan to fix it up.
              </p>
            ) : (
              <p className="text-sm text-slate-900 mt-0.5">
                Pick a plan to get started.
              </p>
            )}
          </div>
        </div>
      </div>

      {!billingReady && (
        <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold">Billing is coming soon</p>
          <p className="mt-1 text-amber-800/90">We&apos;re wiring up payments. You can still preview the plans — purchase opens up shortly.</p>
        </div>
      )}

      {/* Plan grid */}
      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === trainer.subscriptionPlanId && trainer.subscriptionStatus === 'ACTIVE'
          const features: string[] = [
            plan.maxClients == null ? 'Unlimited clients' : `Up to ${plan.maxClients} clients`,
            'Schedule, sessions, achievements',
            'Email + push reminders',
            'Client mobile app',
          ]
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border bg-white shadow-sm overflow-hidden ${
                isCurrent ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'
              }`}
            >
              {isCurrent && (
                <div className="absolute right-3 top-3 text-[10px] font-bold uppercase tracking-wide text-indigo-700 bg-indigo-100 rounded-full px-2 py-0.5">
                  Current
                </div>
              )}
              <div className="p-6">
                <p className="text-lg font-bold text-slate-900">{plan.name}</p>
                {plan.description && <p className="text-sm text-slate-500 mt-1 leading-snug">{plan.description}</p>}
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">${plan.priceMonthly.toFixed(0)}</span>
                  <span className="text-sm text-slate-500">/month</span>
                </p>
                <ul className="mt-5 space-y-2">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <PlanCard
                    planId={plan.id}
                    planName={plan.name}
                    isCurrent={isCurrent}
                    purchasable={billingReady && !!plan.stripePriceId}
                    free={plan.priceMonthly === 0}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Payments handled by Stripe. Cancel any time from your billing portal.
      </p>
    </div>
  )
}
