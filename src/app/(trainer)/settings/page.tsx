import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TrainerSettingsForm } from './trainer-settings-form'
import { CustomFieldsManager } from './custom-fields-manager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default async function TrainerSettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, businessName: true, phone: true, logoUrl: true, inviteTemplate: true },
  })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, timezone: true, notifyEmail: true, notifyPush: true },
  })

  if (!user || !trainerProfile) redirect('/login')

  const customFields = await prisma.customField.findMany({
    where: { trainerId: trainerProfile.id },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings</h1>
      <div className="flex flex-col gap-10">
        <TrainerSettingsForm user={user} profile={trainerProfile} />
        <CustomFieldsManager initialFields={customFields.map(f => ({
          id: f.id,
          label: f.label,
          type: f.type as 'TEXT' | 'NUMBER' | 'DROPDOWN',
          required: f.required,
          options: Array.isArray(f.options) ? f.options as string[] : [],
          category: f.category ?? null,
          appliesTo: (f.appliesTo ?? 'OWNER') as 'OWNER' | 'DOG',
        }))} />
      </div>
    </div>
  )
}
