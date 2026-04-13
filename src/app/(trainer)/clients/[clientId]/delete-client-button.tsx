'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/clients')
    } else {
      setDeleting(false)
      setConfirm(false)
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">Delete client?</span>
        <Button size="sm" variant="danger" loading={deleting} onClick={handleDelete}>Yes, delete</Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="ghost" onClick={() => setConfirm(true)} className="text-red-500 hover:text-red-600">
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  )
}
