import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TrainerDiaryView } from './trainer-diary-view'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Training Diary' }

export default async function TrainerDiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; date?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!trainerProfile) redirect('/onboarding')

  const clients = await prisma.clientProfile.findMany({
    where: { trainerId: trainerProfile.id },
    include: {
      user: { select: { name: true, email: true } },
      dog: { select: { id: true, name: true } },
      dogs: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const sp = await searchParams
  const selectedClientId = sp.clientId ?? clients[0]?.id ?? null
  const selectedDate = sp.date ?? new Date().toISOString().split('T')[0]

  const query = { where: { clientId: selectedClientId ?? '', date: new Date(selectedDate) }, include: { completion: true }, orderBy: { createdAt: 'asc' as const } }
  const tasks = selectedClientId ? await prisma.trainingTask.findMany(query) : [] as Awaited<ReturnType<typeof prisma.trainingTask.findMany<typeof query>>>

  return (
    <TrainerDiaryView
      clients={clients}
      selectedClientId={selectedClientId}
      selectedDate={selectedDate}
      tasks={tasks}
    />
  )
}
