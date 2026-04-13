'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function StatusToggle({ clientId, initialStatus }: { clientId: string; initialStatus: string }) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setLoading(true)
    await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setStatus(next)
    setLoading(false)
    router.refresh()
  }

  const isActive = status === 'ACTIVE'

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        isActive
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
      {loading ? '...' : isActive ? 'Active' : 'Not active'}
    </button>
  )
}
