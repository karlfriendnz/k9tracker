import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ClientDiaryView } from './client-diary-view'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Diary' }

export default async function ClientDiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; dogId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      dog: { select: { id: true, name: true } },
      dogs: { select: { id: true, name: true } },
      trainer: { select: { businessName: true } },
    },
  })
  if (!clientProfile) redirect('/login')

  const params = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const selectedDate = params.date ?? today

  // Build list of all dogs (primary + additional)
  const allDogs = [
    ...(clientProfile.dog ? [clientProfile.dog] : []),
    ...clientProfile.dogs,
  ]

  // Only filter by dog if client has multiple dogs and a dogId param is provided
  const selectedDogId = allDogs.length > 1 ? (params.dogId ?? null) : null

  const tasks = await prisma.trainingTask.findMany({
    where: {
      clientId: clientProfile.id,
      date: new Date(selectedDate),
      ...(selectedDogId ? { dogId: selectedDogId } : {}),
    },
    include: { completion: true },
    orderBy: { createdAt: 'asc' },
  })

  const completedToday = tasks.filter(t => t.completion).length
  const totalToday = tasks.length

  return (
    <ClientDiaryView
      clientName={session.user.name ?? ''}
      dogName={clientProfile.dog?.name ?? null}
      trainerName={clientProfile.trainer.businessName}
      selectedDate={selectedDate}
      today={today}
      tasks={tasks}
      completedToday={completedToday}
      totalToday={totalToday}
      dogs={allDogs}
      selectedDogId={selectedDogId}
    />
  )
}
