'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

const schema = z.object({
  category: z.string().min(1),
  subject: z.string().min(5),
  body: z.string().min(20),
})

type FormData = z.infer<typeof schema>

const SUPPORT_CATEGORIES = ['Bug report', 'Account issue', 'Billing question', 'Other']
const FEEDBACK_CATEGORIES = ['Feature idea', 'UI improvement', 'General feedback']

export function SupportTicketForm({ type }: { type: 'support' | 'feedback' }) {
  const [sent, setSent] = useState(false)
  const categories = type === 'support' ? SUPPORT_CATEGORIES : FEEDBACK_CATEGORIES

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: categories[0] },
  })

  async function onSubmit(data: FormData) {
    await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, type }),
    })
    setSent(true)
    reset()
  }

  if (sent) {
    return (
      <Alert variant="success">
        {type === 'support' ? '✅ Ticket submitted! We\'ll email you a confirmation shortly.' : '🙏 Thanks for your feedback!'}
        <button onClick={() => setSent(false)} className="block text-xs underline mt-1">Submit another</button>
      </Alert>
    )
  }

  return (
    <Card>
      <CardBody className="pt-5">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Category</label>
            <select className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('category')}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={type === 'support' ? 'Brief description of the issue' : 'Your idea in a few words'}
              {...register('subject')}
            />
            {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Details</label>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={type === 'support' ? 'What happened? What were you trying to do?' : 'Tell us more about your idea or suggestion...'}
              {...register('body')}
            />
            {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
          </div>
          <Button type="submit" size="sm" className="self-start" loading={isSubmitting}>
            {type === 'support' ? 'Submit ticket' : 'Send feedback'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
