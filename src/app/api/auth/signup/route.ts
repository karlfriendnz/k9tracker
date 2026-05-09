import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/auth-emails'
import { stripe, isStripeConfigured } from '@/lib/stripe'
import { env } from '@/lib/env'

const TRIAL_DAYS = 10
const MAX_SEATS = 5

// /api/auth/signup — handles the marketing-driven signup flow:
// formal info capture + seat-count slider + Stripe handoff. The legacy
// /api/auth/register is still wired up for the older /register form
// (no slider, no Stripe step) and unaffected.
//
// Flow:
//   1. Validate input + ensure email is unused
//   2. Provision User + TrainerProfile in TRIALING with the requested
//      seat count and a 10-day trialEndsAt
//   3. Email a 6-digit verification code (login still requires it)
//   4. If Stripe is configured AND the chosen plan has a stripePriceId,
//      create a Customer + Checkout Session in subscription mode with
//      `quantity: seats` and `trial_period_days: 10`. Return its url.
//   5. If not, return ok with no checkoutUrl — the form falls back to
//      sending the trainer to /verify-account and they can pay later
//      from /billing/plans once Stripe is wired up.
const schema = z.object({
  name: z.string().min(2),
  businessName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().transform(v => v?.trim() || null),
  password: z.string().min(8),
  seats: z.number().int().min(1).max(MAX_SEATS).default(1),
  planId: z.string().nullable().optional(),
})

function generateCode(): string {
  // Cryptographically random 6-digit code, padded so leading zeros survive.
  const n = crypto.randomInt(0, 1_000_000)
  return n.toString().padStart(6, '0')
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const firstField = Object.entries(flat.fieldErrors)[0]
    const message = firstField?.[1]?.[0] ?? flat.formErrors[0] ?? 'Invalid input'
    return NextResponse.json({ error: message, details: flat }, { status: 400 })
  }

  const { name, businessName, email, phone, password, seats, planId } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  // Resolve the plan that drives the Checkout line item. We trust the
  // client-provided planId only after looking it up — never pass the
  // raw value through to Stripe.
  const plan = planId
    ? await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
        select: { id: true, isActive: true, stripePriceId: true },
      })
    : null

  const passwordHash = await bcrypt.hash(password, 12)
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  // Build the user + trainer atomically so we never leave a half-account
  // around if the second insert fails.
  const trainerId = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        role: 'TRAINER',
        // Login is blocked until they enter the 6-digit code we email
        // below (see lib/auth.ts authorize). Stripe payment success
        // does NOT auto-verify — the trainer still confirms via email.
        emailVerified: null,
      },
    })

    await tx.account.create({
      data: {
        userId: user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: passwordHash,
      },
    })

    const profile = await tx.trainerProfile.create({
      data: {
        userId: user.id,
        businessName,
        phone,
        // subscriptionStatus defaults to TRIALING; persist trial end +
        // chosen plan so /billing/plans shows the right "current" state
        // even before the Stripe webhook lands.
        trialEndsAt,
        ...(plan?.id ? { subscriptionPlanId: plan.id } : {}),
      },
      select: { id: true },
    })

    return profile.id
  })

  // Verification email — fire-and-log; a transient Resend failure shouldn't
  // block the signup since the trainer can resend from /verify-account.
  const code = generateCode()
  const expires = new Date(Date.now() + 10 * 60 * 1000)
  await prisma.verificationToken.create({
    data: { identifier: email, token: code, expires },
  })
  sendVerificationEmail({ to: email, name, businessName, code }).catch(err => {
    console.error('[signup] verification email failed:', err)
  })

  // No Stripe configured OR no Stripe price wired up for this plan →
  // skip the checkout hand-off. The form will route to /verify-account
  // and the trainer can subscribe later from /billing/plans.
  if (!isStripeConfigured() || !plan?.stripePriceId || !plan.isActive) {
    return NextResponse.json({ ok: true, email }, { status: 201 })
  }

  try {
    const stripeClient = stripe()
    const customer = await stripeClient.customers.create({
      email,
      name,
      phone: phone ?? undefined,
      metadata: { trainerId, businessName },
    })

    await prisma.trainerProfile.update({
      where: { id: trainerId },
      data: { stripeCustomerId: customer.id },
    })

    const checkout = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: plan.stripePriceId, quantity: seats }],
      billing_address_collection: 'required',
      // 10-day no-charge trial — Stripe still asks for the card on
      // Checkout so the trainer rolls into the paid plan automatically.
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { trainerId, planId: plan.id, seats: String(seats) },
      },
      metadata: { trainerId, planId: plan.id, seats: String(seats) },
      success_url: `${env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/verify-account?email=${encodeURIComponent(email)}`,
      allow_promotion_codes: true,
    })

    if (!checkout.url) {
      return NextResponse.json({ ok: true, email }, { status: 201 })
    }

    return NextResponse.json({ ok: true, email, checkoutUrl: checkout.url }, { status: 201 })
  } catch (err) {
    // Stripe failure shouldn't block account creation — the trainer
    // can finish billing later from /billing/plans.
    console.error('[signup] stripe checkout failed:', err)
    return NextResponse.json({ ok: true, email }, { status: 201 })
  }
}
