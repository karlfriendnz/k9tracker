'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

const schema = z.object({
  clientName: z.string().min(2, 'Client name is required'),
  dogName: z.string().min(1, "Dog's name is required"),
  clientEmail: z.string().email('Please enter a valid email address'),
  emailBody: z.string().min(20, 'Email body is too short'),
})

type FormData = z.infer<typeof schema>

export function InviteClientForm({ defaultTemplate }: { defaultTemplate: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: { emailBody: defaultTemplate },
  })

  // Live-substitute template variables in the preview
  const clientName = watch('clientName') || '{{clientName}}'
  const dogName = watch('dogName') || '{{dogName}}'
  const emailBody = watch('emailBody')
    ?.replace(/{{clientName}}/g, clientName)
    ?.replace(/{{dogName}}/g, dogName)

  async function onSubmit(data: FormData) {
    setError(null)
    const res = await fetch('/api/clients/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json()
      setError(body.error ?? 'Failed to send invitation.')
      return
    }

    setSent(true)
    setTimeout(() => router.push('/clients'), 2000)
  }

  if (sent) {
    return (
      <Alert variant="success" className="text-center py-6">
        <p className="text-lg font-semibold">Invitation sent! 🎉</p>
        <p className="text-sm mt-1">Redirecting to your client list…</p>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <h2 className="font-semibold text-slate-900">Client details</h2>
          <Input
            label="Client's name"
            placeholder="Jane Smith"
            error={errors.clientName?.message}
            {...register('clientName')}
          />
          <Input
            label="Dog's name"
            placeholder="Buddy"
            error={errors.dogName?.message}
            {...register('dogName')}
          />
          <Input
            label="Client's email address"
            type="email"
            placeholder="jane@example.com"
            error={errors.clientEmail?.message}
            {...register('clientEmail')}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Invitation email</h2>
            <span className="text-xs text-slate-400">
              Use <code className="bg-slate-100 px-1 rounded">{'{{clientName}}'}</code> and{' '}
              <code className="bg-slate-100 px-1 rounded">{'{{dogName}}'}</code>
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Email body</label>
            <textarea
              rows={8}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              {...register('emailBody')}
            />
            {errors.emailBody && (
              <p className="text-xs text-red-500">{errors.emailBody.message}</p>
            )}
          </div>

          {/* Live preview */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Preview</p>
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">{emailBody}</pre>
          </div>
        </CardBody>
      </Card>

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Send invitation
      </Button>
    </form>
  )
}
