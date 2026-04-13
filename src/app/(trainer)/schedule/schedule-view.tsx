'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { ChevronLeft, ChevronRight, Plus, MessageSquare, ExternalLink, Video, MapPin, Calendar } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

const sessionSchema = z.object({
  title: z.string().min(2),
  scheduledAt: z.string(),
  durationMins: z.number().int().positive(),
  sessionType: z.enum(['IN_PERSON', 'VIRTUAL']),
  location: z.string().optional(),
  virtualLink: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
})

type SessionFormData = z.infer<typeof sessionSchema>

interface Session {
  id: string
  title: string
  scheduledAt: Date
  durationMins: number
  sessionType: string
  location: string | null
  virtualLink: string | null
  description: string | null
  dog: {
    name: string
    clientProfiles: { user: { name: string | null; email: string } }[]
  } | null
}

export function ScheduleView({
  sessions,
  selectedDate,
  today,
  googleCalendarConnected,
}: {
  sessions: Session[]
  selectedDate: string
  today: string
  googleCalendarConnected: boolean
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      sessionType: 'IN_PERSON',
      durationMins: 60,
      scheduledAt: `${selectedDate}T09:00`,
    },
  })

  function changeDate(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    router.push(`/schedule?date=${d.toISOString().split('T')[0]}`)
  }

  async function onAddSession(data: SessionFormData) {
    setError(null)
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) { setError('Failed to create session.'); return }
    reset()
    setShowForm(false)
    router.refresh()
  }

  async function deleteSession(id: string) {
    await fetch(`/api/schedule/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  const isToday = selectedDate === today

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
        <div className="flex gap-2">
          {!googleCalendarConnected && (
            <a href="/api/google-calendar/connect">
              <Button variant="secondary" size="sm">
                <Calendar className="h-4 w-4" />
                Connect Google Calendar
              </Button>
            </a>
          )}
          {googleCalendarConnected && (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
              <Calendar className="h-3.5 w-3.5" /> Google Calendar synced
            </span>
          )}
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add session
          </Button>
        </div>
      </div>

      {/* Date navigator */}
      <div className="flex items-center justify-between mb-6 bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-500">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-slate-900">{formatDate(selectedDate)}</p>
          {isToday && <p className="text-xs text-blue-600 font-medium">Today</p>}
        </div>
        <button onClick={() => changeDate(1)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-500">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Add session form */}
      {showForm && (
        <Card className="mb-6">
          <CardBody className="pt-5">
            <h2 className="font-semibold text-slate-900 mb-4">New session</h2>
            {error && <Alert variant="error" className="mb-3">{error}</Alert>}
            <form onSubmit={handleSubmit(onAddSession)} className="flex flex-col gap-3">
              <Input label="Session title" placeholder="Buddy — Foundation training" error={errors.title?.message} {...register('title')} />
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-[2]">
                  <label className="text-sm font-medium text-slate-700">Date & time</label>
                  <input type="datetime-local" className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" {...register('scheduledAt')} />
                </div>
                <Input label="Duration (mins)" type="number" className="flex-1" {...register('durationMins')} />
              </div>
              <div className="flex gap-2">
                {(['IN_PERSON', 'VIRTUAL'] as const).map((t) => (
                  <label key={t} className="flex-1">
                    <input type="radio" value={t} className="sr-only peer" {...register('sessionType')} />
                    <div className="text-center py-2 rounded-xl border border-slate-200 text-sm cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 transition-colors">
                      {t === 'IN_PERSON' ? '📍 In person' : '💻 Virtual'}
                    </div>
                  </label>
                ))}
              </div>
              <Input label="Location / address" placeholder="123 Main St" {...register('location')} />
              <Input label="Virtual meeting link" type="url" placeholder="https://meet.google.com/..." {...register('virtualLink')} />
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={isSubmitting}>Save session</Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); reset() }}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Daily summary — SCHD-02 */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No sessions scheduled for this day</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((s) => {
            const client = s.dog?.clientProfiles[0]?.user
            return (
              <Card key={s.id}>
                <CardBody className="pt-4 pb-4">
                  {/* Time + title */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-blue-600">
                        {formatTime(s.scheduledAt)} · {s.durationMins} min
                      </p>
                      <p className="font-semibold text-slate-900 mt-0.5">{s.title}</p>
                      {s.dog && (
                        <p className="text-sm text-slate-500">🐕 {s.dog.name}{client ? ` · ${client.name ?? client.email}` : ''}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {/* Quick: message client */}
                      {client && (
                        <Link href={`/messages?client=${client.email}`} title="Message client">
                          <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        </Link>
                      )}
                      {/* Virtual link */}
                      {s.virtualLink && (
                        <a href={s.virtualLink} target="_blank" rel="noopener noreferrer" title="Join session">
                          <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-green-600 transition-colors">
                            <Video className="h-4 w-4" />
                          </button>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Location / virtual */}
                  {s.location && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" /> {s.location}
                    </p>
                  )}

                  {s.description && (
                    <p className="text-sm text-slate-600 mt-2">{s.description}</p>
                  )}

                  <div className="flex gap-2 mt-3">
                    {s.dog?.clientProfiles[0] && (
                      <Link href={`/clients/${s.dog.clientProfiles[0] ? '' : ''}`}>
                        <Button variant="secondary" size="sm">View dog profile</Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => deleteSession(s.id)} className="text-red-400 hover:text-red-600">
                      Delete
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
