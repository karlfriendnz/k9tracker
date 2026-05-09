import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { env } from '@/lib/env'

const schema = z.object({
  planId: z.string().min(1),
})

// Creates a Stripe Checkout Session in subscription mode for the requesting
// trainer's chosen plan. The browser then redirects to session.url. We
// return JSON instead of an HTTP redirect so the client can decide whether
// to navigate in-tab (web) or open externally via `openExternal` (mobile).
//
// First-time callers also get a Stripe Customer created and stamped on
// their TrainerProfile so subsequent flows reuse it. The trainer's
// in-app email is set as the customer email so receipts go to the right
// place; the customer is metadata-tagged with trainerId so the webhook
// can reverse-lookup without trusting client input.
export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const trainerId = session.user.trainerId
  if (!trainerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Billing not configured yet' }, { status: 503 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: parsed.data.planId },
    select: { id: true, name: true, stripePriceId: true, isActive: true },
  })
  if (!plan || !plan.isActive) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  if (!plan.stripePriceId) {
    return NextResponse.json({ error: 'This plan isn\'t available for purchase yet' }, { status: 409 })
  }

  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: {
      stripeCustomerId: true,
      user: { select: { email: true, name: true } },
    },
  })
  if (!trainer) return NextResponse.json({ error: 'Trainer not found' }, { status: 404 })

  const stripeClient = stripe()

  // Lazily create + persist the Stripe Customer the first time this
  // trainer hits Checkout. Idempotent on repeat calls thanks to the
  // stored customer id.
  let customerId = trainer.stripeCustomerId
  if (!customerId) {
    const customer = await stripeClient.customers.create({
      email: trainer.user.email ?? undefined,
      name: trainer.user.name ?? undefined,
      metadata: { trainerId },
    })
    customerId = customer.id
    await prisma.trainerProfile.update({
      where: { id: trainerId },
      data: { stripeCustomerId: customerId },
    })
  }

  const checkout = await stripeClient.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    // Stripe defaults to billing_address_collection: 'auto'; force 'required'
    // so we always have an address for tax/invoice compliance once we wire
    // those up. Email is already on the customer so we don't ask twice.
    billing_address_collection: 'required',
    success_url: `${env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/billing/cancel`,
    // Pass trainerId + planId in metadata so the webhook can reconcile
    // even if anything below the customer link drifts.
    metadata: { trainerId, planId: plan.id },
    subscription_data: {
      metadata: { trainerId, planId: plan.id },
    },
    allow_promotion_codes: true,
  })

  if (!checkout.url) {
    return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 })
  }

  return NextResponse.json({ url: checkout.url })
}
