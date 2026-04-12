'use client'

import { useState, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description: string | null
  repetitions: number | null
  videoUrl: string | null
  completion: {
    note: string | null
    videoUrl: string | null
    videoS3Key: string | null
  } | null
}

export function ClientDiaryView({
  clientName,
  dogName,
  trainerName,
  selectedDate,
  today,
  tasks,
  completedToday,
  totalToday,
}: {
  clientName: string
  dogName: string | null
  trainerName: string
  selectedDate: string
  today: string
  tasks: Task[]
  completedToday: number
  totalToday: number
}) {
  const router = useRouter()
  const isToday = selectedDate === today

  function changeDate(delta: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    router.push(`/my-diary?date=${d.toISOString().split('T')[0]}`)
  }

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-slate-500">{trainerName}</p>
        <h1 className="text-2xl font-bold text-slate-900">
          {dogName ? `${dogName}'s Diary` : 'Training Diary'}
        </h1>
      </div>

      {/* Date navigator */}
      <div className="flex items-center justify-between mb-4 bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-slate-900">{formatDate(selectedDate)}</p>
          {isToday && <p className="text-xs text-blue-600 font-medium">Today</p>}
        </div>
        <button
          onClick={() => changeDate(1)}
          disabled={selectedDate >= today}
          className="p-2 rounded-xl hover:bg-slate-50 text-slate-500 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      {totalToday > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-slate-500">{completedToday} of {totalToday} done</span>
            <span className="font-medium text-slate-700">
              {Math.round((completedToday / totalToday) * 100)}%
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedToday / totalToday) * 100}%` }}
            />
          </div>
          {completedToday === totalToday && totalToday > 0 && (
            <p className="text-center text-sm text-green-600 font-medium mt-3">
              🎉 All done for today! Great work!
            </p>
          )}
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">🐕</p>
          <p className="font-medium">No tasks for this day</p>
          <p className="text-sm mt-1">Your trainer will assign exercises here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} isToday={isToday} />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, isToday }: { task: Task; isToday: boolean }) {
  const router = useRouter()
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(!!task.completion)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [note, setNote] = useState(task.completion?.note ?? '')
  const [videoUrl, setVideoUrl] = useState(task.completion?.videoUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadedVideoKey, setUploadedVideoKey] = useState(task.completion?.videoS3Key ?? '')
  const [saving, setSaving] = useState(false)

  async function handleComplete() {
    if (completed || !isToday) return
    setCompleting(true)
    setCompleted(true)

    await fetch(`/api/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: '', videoUrl: '' }),
    })

    setCompleting(false)
    router.refresh()
  }

  async function handleSaveNote() {
    setSaving(true)
    await fetch(`/api/tasks/${task.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note,
        videoUrl,
        videoS3Key: uploadedVideoKey,
      }),
    })
    setSaving(false)
    setShowNoteForm(false)
    router.refresh()
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('taskId', task.id)

    const res = await fetch('/api/upload/video', {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      const data = await res.json()
      setUploadedVideoKey(data.key)
    }
    setUploading(false)
  }

  return (
    <Card className={`transition-all ${completed ? 'border-green-100 bg-green-50/40' : 'bg-white'}`}>
      <CardBody className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {/* One-tap complete button — large touch target */}
          <button
            onClick={handleComplete}
            disabled={completed || !isToday || completing}
            className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all ${
              completed
                ? 'bg-green-500 text-white'
                : 'border-2 border-slate-300 hover:border-blue-400'
            }`}
          >
            {completed && <span className="text-sm">✓</span>}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`font-semibold ${completed ? 'text-green-800' : 'text-slate-900'}`}>
              {task.title}
            </p>
            {task.repetitions && (
              <p className="text-xs text-slate-500">{task.repetitions} repetitions</p>
            )}
            {task.description && (
              <p className="text-sm text-slate-600 mt-1">{task.description}</p>
            )}
            {task.videoUrl && (
              <a
                href={task.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
              >
                📹 Watch tutorial
              </a>
            )}

            {/* Completion note/video */}
            {completed && (
              <div className="mt-2">
                {!showNoteForm && (
                  <button
                    onClick={() => setShowNoteForm(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {task.completion?.note || task.completion?.videoUrl || uploadedVideoKey
                      ? 'Edit note or video'
                      : '+ Add a note or video'}
                  </button>
                )}

                {showNoteForm && (
                  <div className="mt-2 flex flex-col gap-2">
                    <textarea
                      rows={2}
                      placeholder="Optional: how did it go?"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                    <input
                      type="url"
                      placeholder="Paste video link (YouTube, etc.)"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? 'Uploading…' : uploadedVideoKey ? '✓ Video uploaded' : 'Upload video from device'}
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleVideoUpload}
                        disabled={uploading}
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNote} loading={saving}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNoteForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {!showNoteForm && task.completion?.note && (
                  <p className="text-sm text-slate-600 mt-1 italic">"{task.completion.note}"</p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
