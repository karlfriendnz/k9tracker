import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FormsManager } from './forms-manager'
import type { Question } from './session/session-forms-manager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Forms' }

export default async function FormsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const trainerId = session.user.trainerId
  if (!trainerId) redirect('/onboarding')

  const [forms, customFields, sessionForms] = await Promise.all([
    prisma.embedForm.findMany({
      where: { trainerId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customField.findMany({
      where: { trainerId },
      orderBy: { order: 'asc' },
    }),
    prisma.sessionForm.findMany({
      where: { trainerId },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { responses: true } } },
    }),
  ])

  const intakeFields = customFields.map(f => ({
    id: f.id,
    label: f.label,
    type: f.type as 'TEXT' | 'NUMBER' | 'DROPDOWN',
    required: f.required,
    options: Array.isArray(f.options) ? f.options as string[] : [],
    category: f.category ?? null,
    appliesTo: (f.appliesTo ?? 'OWNER') as 'OWNER' | 'DOG',
  }))

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Forms</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          All your forms in one place — intake, embeds, and session reports.
        </p>
      </div>
      <FormsManager
        initialForms={forms.map(f => ({
          id: f.id,
          title: f.title,
          description: f.description,
          fields: Array.isArray(f.fields) ? f.fields as { key: string; required: boolean }[] : [],
          customFieldIds: Array.isArray(f.customFieldIds) ? f.customFieldIds as string[] : [],
          thankYouTitle: f.thankYouTitle,
          thankYouMessage: f.thankYouMessage,
          isActive: f.isActive,
        }))}
        customFields={intakeFields.map(f => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          appliesTo: f.appliesTo,
        }))}
        initialSessionForms={sessionForms.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
          introText: f.introText,
          closingText: f.closingText,
          backgroundColor: f.backgroundColor,
          backgroundUrl: f.backgroundUrl,
          questions: Array.isArray(f.questions) ? f.questions as unknown as Question[] : [],
          responses: f._count.responses,
        }))}
        intakeCustomFields={intakeFields}
        sessionCustomFieldOptions={customFields.map(f => ({
          id: f.id,
          label: f.label,
          type: f.type as 'TEXT' | 'NUMBER' | 'DROPDOWN',
          appliesTo: (f.appliesTo ?? 'OWNER') as 'OWNER' | 'DOG',
          category: f.category,
        }))}
      />
    </div>
  )
}
