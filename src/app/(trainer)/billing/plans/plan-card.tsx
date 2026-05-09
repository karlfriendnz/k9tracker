'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { openExternal } from '@/lib/external-link'

interface Props {
  planId: string
  planName: string
  isCurrent: boolean
  purchasable: boolean
  free: boolean
}

// Per-plan CTA. Posts to /api/billing/checkout, takes the returned Stripe
// URL and either navigates the tab (web) or opens it in Safari (mobile).
// We keep the click handler client-side (rather than using a server form)
// because Capacitor needs `window.open` on a real user gesture for the
// external open to work without the OS warning the user.
export function PlanCard({ planId, planName, isCurrent, purchasable, free }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isCurrent) {
    return (
      <Button variant="secondary" className="w-full" disabled>
        You&apos;re on this plan
      </Button>
    )
  }

  if (free) {
    return (
      <Button variant="secondary" className="w-full" disabled>
        Free tier — no purchase needed
      </Button>
    )
  }

  if (!purchasable) {
    return (
      <Button variant="secondary" className="w-full" disabled>
        Coming soon
      </Button>
    )
  }

  async function startCheckout() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Checkout failed (${res.status})`)
      }
      const { url } = await res.json()
      if (!url) throw new Error('Stripe did not return a URL')
      openExternal(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <>
      <Button onClick={startCheckout} loading={busy} className="w-full">
        Start {planName}
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </>
  )
}
