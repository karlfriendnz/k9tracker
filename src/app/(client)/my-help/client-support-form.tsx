'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

const schema = z.object({
  category: z.enum(['bug', 'idea', 'other']),
  body: z.string().min(10, 'Please describe the issue or idea'),
})

type FormData = z.infer<typeof schema>

export function ClientSupportForm() {
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'bug' },
  })

  async function onSubmit(data: FormData) {
    await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, subject: data.category, type: data.category === 'idea' ? 'feedback' : 'support' }),
    })
    setSent(true)
    reset()
  }

  if (sent) {
    return (
      <Alert variant="success">
        Thanks! We&apos;ll look into this and follow up if needed.
        <button onClick={() => setSent(false)} className="block text-xs underline mt-1">Submit another</button>
      </Alert>
    )
  }

  return (
    <Card>
      <CardBody className="pt-5">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(['bug', 'idea', 'other'] as const).map((cat) => (
              <label key={cat} className="flex-1">
                <input type="radio" value={cat} className="sr-only peer" {...register('category')} />
                <div className="text-center py-2 px-3 rounded-xl border border-slate-200 text-sm cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 transition-colors capitalize">
                  {cat === 'bug' ? '🐛 Bug' : cat === 'idea' ? '💡 Idea' : '💬 Other'}
                </div>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <textarea
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Describe the issue or your idea..."
              {...register('body')}
            />
            {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
          </div>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Send</Button>
        </form>
      </CardBody>
    </Card>
  )
}
