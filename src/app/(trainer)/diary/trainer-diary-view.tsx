'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Plus, Trash2, CheckCircle, Circle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const taskSchema = z.object({
  title: z.string().min(2, 'Task name is required'),
  description: z.string().optional(),
  repetitions: z.number().int().positive().optional().or(z.literal('')),
  videoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

type TaskFormData = z.infer<typeof taskSchema>

interface Client {
  id: string
  user: { name: string | null; email: string }
  dog: { name: string } | null
}

interface Task {
  id: string
  title: string
  description: string | null
  repetitions: number | null
  videoUrl: string | null
  completion: { note: string | null; videoUrl: string | null } | null
}

export function TrainerDiaryView({
  clients,
  selectedClientId,
  selectedDate,
  tasks,
}: {
  clients: Client[]
  selectedClientId: string | null
  selectedDate: string
  tasks: Task[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({ resolver: zodResolver(taskSchema) })

  function navigate(clientId: string | null, date: string) {
    const params = new URLSearchParams()
    if (clientId) params.set('clientId', clientId)
    params.set('date', date)
    router.push(`/diary?${params}`)
  }

  async function onAddTask(data: TaskFormData) {
    setAddError(null)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: selectedClientId,
        date: selectedDate,
        title: data.title,
        description: data.description || null,
        repetitions: data.repetitions || null,
        videoUrl: data.videoUrl || null,
      }),
    })

    if (!res.ok) {
      setAddError('Failed to add task.')
      return
    }

    reset()
    setShowForm(false)
    router.refresh()
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Training Diary</h1>

      {/* Controls row */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedClientId ?? ''}
          onChange={(e) => navigate(e.target.value || null, selectedDate)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.user.name ?? c.user.email}{c.dog ? ` · ${c.dog.name}` : ''}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => navigate(selectedClientId, e.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {selectedClientId && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="ml-auto"
          >
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        )}
      </div>

      {/* Add task form */}
      {showForm && (
        <Card className="mb-6">
          <CardBody className="pt-5">
            <h2 className="font-semibold text-slate-900 mb-4">New task for {formatDate(selectedDate)}</h2>
            {addError && <Alert variant="error" className="mb-3">{addError}</Alert>}
            <form onSubmit={handleSubmit(onAddTask)} className="flex flex-col gap-3">
              <Input
                label="Task name"
                placeholder="Sit/Stay practice"
                error={errors.title?.message}
                {...register('title')}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">Description (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Ask your dog to sit, then hold for 5 seconds before rewarding..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  {...register('description')}
                />
              </div>
              <div className="flex gap-3">
                <Input
                  label="Repetitions"
                  type="number"
                  placeholder="10"
                  error={errors.repetitions?.message}
                  className="flex-1"
                  {...register('repetitions')}
                />
                <Input
                  label="Instructional video URL"
                  type="url"
                  placeholder="https://youtube.com/..."
                  error={errors.videoUrl?.message}
                  className="flex-[3]"
                  {...register('videoUrl')}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={isSubmitting}>Add task</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); reset() }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Task list */}
      {!selectedClientId ? (
        <div className="text-center py-12 text-slate-400">
          <p>Select a client to view or assign tasks</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>No tasks for {formatDate(selectedDate)}</p>
          <p className="text-sm mt-1">Click &quot;Add task&quot; to assign one</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <Card key={task.id} className={task.completion ? 'border-green-100 bg-green-50/30' : ''}>
              <CardBody className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  {task.completion ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{task.title}</p>
                    {task.repetitions && (
                      <p className="text-xs text-slate-500">{task.repetitions} reps</p>
                    )}
                    {task.description && (
                      <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                    )}
                    {task.videoUrl && (
                      <a
                        href={task.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 block"
                      >
                        📹 Instructional video
                      </a>
                    )}
                    {task.completion && (
                      <div className="mt-2 pl-3 border-l-2 border-green-200">
                        {task.completion.note && (
                          <p className="text-sm text-slate-600 italic">"{task.completion.note}"</p>
                        )}
                        {task.completion.videoUrl && (
                          <a
                            href={task.completion.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            📹 Client video
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  {!task.completion && (
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
