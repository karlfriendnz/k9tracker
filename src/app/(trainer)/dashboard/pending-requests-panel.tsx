'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, X, ShoppingBag, Package as PackageIcon, FileDown, Loader2 } from 'lucide-react'

interface PendingRequest {
  id: string
  createdAt: string
  note: string | null
  client: { id: string; name: string }
  product: { id: string; name: string; kind: 'PHYSICAL' | 'DIGITAL'; imageUrl: string | null }
}

export function PendingRequestsPanel({ requests: initial }: { requests: PendingRequest[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [requests, setRequests] = useState(initial)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (requests.length === 0) return null

  async function update(id: string, status: 'FULFILLED' | 'CANCELLED') {
    if (busyId) return
    setBusyId(id)
    // Optimistic remove
    const removed = requests.find(r => r.id === id)
    setRequests(prev => prev.filter(r => r.id !== id))
    try {
      const res = await fetch(`/api/product-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok && removed) {
        // Restore on failure
        setRequests(prev => [removed, ...prev])
      } else {
        startTransition(() => router.refresh())
      }
    } catch {
      if (removed) setRequests(prev => [removed, ...prev])
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4">
      <p className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
        <ShoppingBag className="h-4 w-4" />
        {requests.length} product request{requests.length === 1 ? '' : 's'} from clients
      </p>
      <div className="flex flex-col gap-2">
        {requests.map(r => (
          <div
            key={r.id}
            className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5"
          >
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {r.product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.product.imageUrl} alt={r.product.name} className="h-full w-full object-cover" />
              ) : r.product.kind === 'DIGITAL' ? (
                <FileDown className="h-4 w-4 text-violet-500" />
              ) : (
                <PackageIcon className="h-4 w-4 text-amber-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{r.product.name}</p>
              <p className="text-xs text-slate-500 truncate">
                <Link href={`/clients/${r.client.id}`} className="hover:text-slate-700 hover:underline">
                  {r.client.name}
                </Link>
                {r.note && <span className="text-slate-400"> · {r.note}</span>}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => update(r.id, 'FULFILLED')}
                disabled={busyId === r.id}
                aria-label="Mark fulfilled"
                title="Mark fulfilled"
                className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2.5} />}
              </button>
              <button
                onClick={() => update(r.id, 'CANCELLED')}
                disabled={busyId === r.id}
                aria-label="Dismiss"
                title="Dismiss"
                className="h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
