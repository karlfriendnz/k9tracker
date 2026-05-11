import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MessageThread } from './message-thread'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Messages' }

export default async function TrainerMessageThreadPage({ params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { clientId } = await params

  const trainerId = session.user.trainerId
  if (!trainerId) redirect('/login')

  const client = await prisma.clientProfile.findFirst({
    where: { id: clientId, trainerId },
    include: {
      user: { select: { name: true, email: true } },
      dog: { select: { name: true } },
    },
  })
  if (!client) notFound()

  const messages = await prisma.message.findMany({
    where: { clientId, channel: 'TRAINER_CLIENT' },
    include: { sender: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })

  // Mark unread messages as read
  const unreadIds = messages.filter(m => !m.readAt && m.senderId !== session.user.id).map(m => m.id)
  if (unreadIds.length > 0) {
    await prisma.message.updateMany({ where: { id: { in: unreadIds } }, data: { readAt: new Date() } })
  }

  const displayName = client.user.name ?? client.user.email

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-2xl w-full mx-auto -mb-20 md:mb-0">
      {/* Sticky thread header. Reserves env(safe-area-inset-top) on iOS so
          the back chevron and client name aren't tucked under the notch.
          marginTop pulls back through <main>'s capped safe-area pad. */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 border-b border-slate-100 bg-white"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.625rem)',
          paddingBottom: '0.625rem',
          marginTop: 'calc(min(env(safe-area-inset-top, 0px), 1rem) * -1)',
        }}
      >
        <Link href="/messages" aria-label="Back to messages" className="-ml-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
          {displayName[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{displayName}</p>
          {client.dog && <p className="text-xs text-slate-500 truncate">{client.dog.name}</p>}
        </div>
      </div>

      <MessageThread
        clientId={clientId}
        currentUserId={session.user.id}
        initialMessages={messages.map(m => ({
          id: m.id,
          body: m.body,
          senderId: m.senderId,
          createdAt: m.createdAt.toISOString(),
          sender: m.sender,
        }))}
      />
    </div>
  )
}
