import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getActiveClient } from '@/lib/client-context'
import {
  SessionReport,
  reportBackgroundStyle,
  type ReportFormResponse,
  type ReportQuestion,
  type ReportAttachment,
} from '@/components/shared/session-report'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Session' }

export default async function ClientSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const active = await getActiveClient()
  if (!active) redirect('/login')

  const { sessionId } = await params

  // Resolve the calling client's profile so we can scope the session lookup
  // to their own records (no cross-client leakage). Trainer-in-preview gets
  // their previewed client here via getActiveClient.
  const profile = await prisma.clientProfile.findUnique({
    where: { id: active.clientId },
    select: { id: true, trainerId: true },
  })
  if (!profile) redirect('/login')

  const trainingSession = await prisma.trainingSession.findFirst({
    where: { id: sessionId, clientId: profile.id },
    include: {
      dog: { select: { name: true } },
      trainer: { select: { businessName: true, user: { select: { name: true } } } },
      tasks: {
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true, title: true, description: true, repetitions: true,
          videoUrl: true, imageUrls: true, trainerNote: true,
          completion: { select: { id: true } },
        },
      },
      attachments: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, kind: true, url: true, thumbnailUrl: true,
          caption: true, durationMs: true,
        },
      },
      formResponses: {
        include: {
          form: { select: {
            id: true, name: true, introText: true, closingText: true,
            backgroundColor: true, backgroundUrl: true, questions: true,
          } },
        },
      },
    },
  })
  if (!trainingSession) notFound()

  const responses: ReportFormResponse[] = trainingSession.formResponses.map(r => ({
    id: r.id,
    introMessage: r.introMessage,
    closingMessage: r.closingMessage,
    answers: (r.answers ?? {}) as Record<string, string>,
    form: {
      ...r.form,
      questions: Array.isArray(r.form.questions)
        ? r.form.questions as unknown as ReportQuestion[]
        : [],
    },
  }))

  const linkedIds = responses.flatMap(r =>
    r.form.questions.filter(q => q.type === 'CUSTOM_FIELD').map(q => (q as { customFieldId: string }).customFieldId)
  )
  const linkedFields = linkedIds.length > 0
    ? await prisma.customField.findMany({
        where: { trainerId: profile.trainerId, id: { in: linkedIds } },
        select: { id: true, label: true },
      })
    : []
  const customFieldLabels = new Map(linkedFields.map(f => [f.id, f.label]))

  return (
    <div className="min-h-[100dvh] w-full" style={reportBackgroundStyle(responses)}>
      <div className="px-5 lg:px-8 py-6 max-w-3xl mx-auto">
        <Link
          href="/home"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <SessionReport
          sessionTitle={trainingSession.title}
          scheduledAt={trainingSession.scheduledAt}
          dogName={trainingSession.dog?.name ?? null}
          formResponses={responses}
          tasks={trainingSession.tasks.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            repetitions: t.repetitions,
            videoUrl: t.videoUrl,
            imageUrls: Array.isArray(t.imageUrls) ? t.imageUrls.filter((s): s is string => typeof s === 'string') : [],
            trainerNote: t.trainerNote,
            completed: t.completion !== null,
          }))}
          attachments={trainingSession.attachments.map((a): ReportAttachment => ({
            id: a.id,
            kind: a.kind as 'IMAGE' | 'VIDEO',
            url: a.url,
            thumbnailUrl: a.thumbnailUrl,
            caption: a.caption,
            durationMs: a.durationMs,
          }))}
          customFieldLabels={customFieldLabels}
        />
      </div>
    </div>
  )
}
