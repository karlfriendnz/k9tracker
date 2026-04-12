import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TrainerDiaryView } from './trainer-diary-view'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Training Diary' }

export default async function TrainerDiaryPage({
  searchParams,
}: {
  searchParams: { clientId?: string; date?: string }
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
      dog: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const selectedClientId = searchParams.clientId ?? clients[0]?.id ?? null
  const selectedDate = searchParams.date ?? new Date().toISOString().split('T')[0]

  let tasks: Awaited<ReturnType<typeof prisma.trainingTask.findMany>> = []
  if (selectedClientId) {
    tasks = await prisma.trainingTask.findMany({
      where: {
        clientId: selectedClientId,
        date: new Date(selectedDate),
      },
      include: { completion: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  return (
    <TrainerDiaryView
      clients={clients}
      selectedClientId={selectedClientId}
      selectedDate={selectedDate}
      tasks={tasks}
    />
  )
}
