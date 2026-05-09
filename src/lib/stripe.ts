import Stripe from 'stripe'
import { env } from './env'

// Lazy singleton so we don't crash boot when STRIPE_SECRET_KEY isn't set —
// most of the app runs fine without billing, and the /billing/plans page
// degrades gracefully via `isStripeConfigured()` rather than throwing.
let _client: Stripe | null = null

export function isStripeConfigured(): boolean {
  return !!env.STRIPE_SECRET_KEY
}

export function stripe(): Stripe {
  if (!_client) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured — set STRIPE_SECRET_KEY')
    }
    _client = new Stripe(env.STRIPE_SECRET_KEY, {
      // Pin the API version so a Stripe-side default bump never surprises
      // us in production. Bump deliberately when we want new features.
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
      appInfo: { name: 'PupManager', url: 'https://app.pupmanager.com' },
    })
  }
  return _client
}
