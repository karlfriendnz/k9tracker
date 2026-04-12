import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { ArrowLeft, Share2, BookOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ShareClientModal } from './share-client-modal'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Client profile' }

export default async function ClientDetailPage({
  params,
}: {
  params: { clientId: string }
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!trainerProfile) redirect('/onboarding')

  const client = await prisma.clientProfile.findFirst({
    where: { id: params.clientId, trainerId: trainerProfile.id },
    include: {
      user: { select: { name: true, email: true, createdAt: true } },
      dog: true,
      diaryEntries: {
        orderBy: { date: 'desc' },
        take: 14,
        include: { completion: true },
      },
    },
  })

  if (!client) notFound()

  const completedTasks = client.diaryEntries.filter(t => t.completion).length
  const complianceRate =
    client.diaryEntries.length > 0
      ? Math.round((completedTasks / client.diaryEntries.length) * 100)
      : null

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {client.user.name ?? client.user.email}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{client.user.email}</p>
          <p className="text-slate-400 text-xs mt-1">
            Client since {formatDate(client.user.createdAt)}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href={`/diary?clientId=${client.id}`}>
            <Button variant="secondary" size="sm">
              <BookOpen className="h-4 w-4" />
              Diary
            </Button>
          </Link>
          <ShareClientModal clientId={client.id} clientName={client.user.name ?? client.user.email} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className={`text-3xl font-bold ${complianceRate != null && complianceRate >= 70 ? 'text-green-600' : complianceRate != null && complianceRate >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
            {complianceRate != null ? `${complianceRate}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">14-day compliance</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-slate-900">{completedTasks}</p>
          <p className="text-xs text-slate-500 mt-1">Tasks completed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-slate-900">{client.diaryEntries.length}</p>
          <p className="text-xs text-slate-500 mt-1">Tasks assigned</p>
        </Card>
      </div>

      {/* Dog profile */}
      {client.dog && (
        <Card className="mb-6">
          <CardBody className="pt-5">
            <h2 className="font-semibold text-slate-900 mb-4">🐕 {client.dog.name}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {client.dog.breed && (
                <div>
                  <p className="text-slate-400 text-xs">Breed</p>
                  <p className="text-slate-700">{client.dog.breed}</p>
                </div>
              )}
              {client.dog.weight && (
                <div>
                  <p className="text-slate-400 text-xs">Weight</p>
                  <p className="text-slate-700">{client.dog.weight} kg</p>
                </div>
              )}
              {client.dog.dob && (
                <div>
                  <p className="text-slate-400 text-xs">Date of birth</p>
                  <p className="text-slate-700">{formatDate(client.dog.dob)}</p>
                </div>
              )}
              {client.dog.notes && (
                <div className="col-span-2">
                  <p className="text-slate-400 text-xs">Notes</p>
                  <p className="text-slate-700">{client.dog.notes}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Recent tasks */}
      <Card>
        <CardBody className="pt-5">
          <h2 className="font-semibold text-slate-900 mb-4">Recent tasks</h2>
          {client.diaryEntries.length === 0 ? (
            <p className="text-sm text-slate-400">No tasks assigned yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {client.diaryEntries.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${task.completion ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                      {task.completion ? '✓' : '○'}
                    </span>
                    <span className="text-sm text-slate-700">{task.title}</span>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(task.date)}</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
