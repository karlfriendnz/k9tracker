import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WaitlistView } from './waitlist-view'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Waitlist' }

export default async function WaitlistPage() {
  const session = await auth()
  if (!session) redirect('/login')
  const trainerId = session.user.trainerId
  if (!trainerId) redirect('/login')

  const [entries, clients, packages] = await Promise.all([
    prisma.waitlistEntry.findMany({
      where: { trainerId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      include: {
        client: { select: { id: true, user: { select: { name: true, email: true } } } },
        package: { select: { id: true, name: true } },
      },
    }),
    prisma.clientProfile.findMany({
      where: { trainerId, status: 'ACTIVE' },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: 'asc' } },
    }),
    prisma.package.findMany({
      where: { trainerId },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, name: true },
    }),
  ])

  return (
    <WaitlistView
      initialEntries={entries.map(e => ({
        id: e.id,
        clientId: e.clientId,
        name: e.client?.user.name ?? e.name,
        email: e.client?.user.email ?? e.email,
        phone: e.phone,
        packageId: e.packageId,
        packageName: e.package?.name ?? null,
        request: e.request,
        sessionType: e.sessionType,
        preferredDays: e.preferredDays,
        preferredTimeStart: e.preferredTimeStart,
        preferredTimeEnd: e.preferredTimeEnd,
        earliestStart: e.earliestStart ? e.earliestStart.toISOString().slice(0, 10) : null,
        notes: e.notes,
        status: e.status,
        contactedAt: e.contactedAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
      }))}
      clients={clients.map(c => ({ id: c.id, name: c.user.name ?? 'Unnamed client' }))}
      packages={packages}
    />
  )
}
