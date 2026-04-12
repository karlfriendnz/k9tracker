'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Plus, Trash2, GripVertical } from 'lucide-react'

const taskSchema = z.object({
  dayOffset: z.coerce.number().int().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  repetitions: z.coerce.number().int().positive().optional().or(z.literal('')),
  videoUrl: z.string().url().optional().or(z.literal('')),
  order: z.number().default(0),
})

const schema = z.object({
  name: z.string().min(2, 'Template name is required'),
  description: z.string().optional(),
  tasks: z.array(taskSchema).min(1, 'Add at least one task'),
})

type FormData = z.infer<typeof schema>

export function TemplateBuilderForm({
  templateId,
  defaultValues,
}: {
  templateId?: string
  defaultValues?: Partial<FormData>
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { tasks: [{ dayOffset: 1, title: '', order: 0 }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'tasks' })

  async function onSubmit(data: FormData) {
    setError(null)
    const url = templateId ? `/api/templates/${templateId}` : '/api/templates'
    const res = await fetch(url, {
      method: templateId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) { setError('Failed to save template.'); return }
    const saved = await res.json()
    router.push(`/templates/${saved.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardBody className="pt-5 flex flex-col gap-4">
          <Input label="Template name" placeholder="Foundation 4-week programme" error={errors.name?.message} {...register('name')} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Description (optional)</label>
            <textarea rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" {...register('description')} />
          </div>
        </CardBody>
      </Card>

      <div>
        <h2 className="font-semibold text-slate-900 mb-3">Tasks</h2>
        <p className="text-xs text-slate-400 mb-4">
          Set the day offset (day 1, 2, 3...) for when each task appears after the programme starts.
        </p>
        <div className="flex flex-col gap-3">
          {fields.map((field, i) => (
            <Card key={field.id}>
              <CardBody className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="h-4 w-4 text-slate-300 mt-3 flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input label="Day" type="number" min={1} className="w-20" {...register(`tasks.${i}.dayOffset`)} />
                      <div className="flex-1">
                        <Input label="Task name" placeholder="Sit/Stay practice" {...register(`tasks.${i}.title`)} />
                      </div>
                    </div>
                    <Input label="Description" placeholder="Optional instructions..." {...register(`tasks.${i}.description`)} />
                    <div className="flex gap-2">
                      <Input label="Reps" type="number" placeholder="10" className="w-24" {...register(`tasks.${i}.repetitions`)} />
                      <div className="flex-1">
                        <Input label="Video URL" type="url" placeholder="https://..." {...register(`tasks.${i}.videoUrl`)} />
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => remove(i)} className="text-slate-300 hover:text-red-400 mt-3 flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
        {errors.tasks?.message && <p className="text-xs text-red-500 mt-2">{errors.tasks.message}</p>}
        <button
          type="button"
          onClick={() => append({ dayOffset: (fields.at(-1)?.dayOffset ?? 0) + 1, title: '', order: fields.length })}
          className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-4 w-4" /> Add task
        </button>
      </div>

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        {templateId ? 'Save changes' : 'Create template'}
      </Button>
    </form>
  )
}
