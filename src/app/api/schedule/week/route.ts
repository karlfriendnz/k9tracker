import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extendOngoingPackages } from '@/lib/extend-ongoing-packages'

// Returns the trainer's sessions and the client extras needed by the
// schedule blocks for a single week. Used by the schedule page to
// navigate weeks without a full server round-trip — the static data
// (clients, packages, custom fields, availability) stays in memory and
// only the per-week data is refetched.
function getWeekBounds(dateStr: string): { weekStart: Date; weekEnd: Date } {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return { weekStart, weekEnd }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const trainerId = session.user.trainerId
  if (!trainerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  const { weekStart, weekEnd } = getWeekBounds(date)

  // Best-effort top up: keep the calendar full ahead of the visible week.
  await extendOngoingPackages(trainerId).catch(() => {})

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: { scheduleExtraFields: true },
  })
  const scheduleSelections = Array.isArray(trainerProfile?.scheduleExtraFields)
    ? trainerProfile.scheduleExtraFields as string[]
    : []
  const needsClientExtras = scheduleSelections.some(f =>
    f === 'email' || f === 'extraDogs' || f === 'compliance' || f.startsWith('custom:'),
  )
  const needsCompliance = scheduleSelections.includes('compliance')

  const sessions = await prisma.trainingSession.findMany({
    where: {
      trainerId,
      scheduledAt: { gte: weekStart, lte: weekEnd },
    },
    include: {
      dog: {
        select: {
          name: true,
          primaryFor: {
            take: 1,
            select: { id: true, user: { select: { name: true, email: true } } },
          },
        },
      },
      client: { select: { id: true, user: { select: { name: true, email: true } } } },
      clientPackage: { select: { package: { select: { color: true } } } },
      buddies: {
        select: {
          id: true,
          clientId: true,
          dogId: true,
          client: { select: { id: true, user: { select: { name: true, email: true } } } },
          dog: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  // Resolve the client per session and build clientExtras the same way the
  // server page does, so the renderer can render extras the trainer chose.
  const clientIds = new Set<string>()
  for (const s of sessions) {
    const cid = s.clientId ?? s.dog?.primaryFor[0]?.id ?? null
    if (cid) clientIds.add(cid)
  }
  const clientList = Array.from(clientIds)

  const wantedCustomIds = scheduleSelections
    .filter(c => c.startsWith('custom:'))
    .map(c => c.slice('custom:'.length))

  const [sessionClients, customFields, customValues] = await Promise.all([
    needsClientExtras && clientList.length > 0
      ? prisma.clientProfile.findMany({
          where: { id: { in: clientList } },
          select: {
            id: true,
            dogId: true,
            user: { select: { email: true } },
            dogs: { select: { name: true } },
            ...(needsCompliance && {
              diaryEntries: {
                where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                select: { id: true, completion: { select: { id: true } } },
              },
            }),
          },
        })
      : Promise.resolve([] as Array<{
          id: string
          dogId: string | null
          user: { email: string }
          dogs: { name: string }[]
          diaryEntries?: { id: string; completion: { id: string } | null }[]
        }>),
    wantedCustomIds.length > 0
      ? prisma.customField.findMany({
          where: { trainerId, id: { in: wantedCustomIds } },
          select: { id: true, appliesTo: true },
        })
      : Promise.resolve([] as Array<{ id: string; appliesTo: string }>),
    wantedCustomIds.length > 0 && clientList.length > 0
      ? prisma.customFieldValue.findMany({
          where: { fieldId: { in: wantedCustomIds }, clientId: { in: clientList } },
          select: { fieldId: true, clientId: true, dogId: true, value: true },
        })
      : Promise.resolve([] as Array<{ fieldId: string; clientId: string; dogId: string | null; value: string }>),
  ])

  const clientExtras: Record<string, {
    email: string
    extraDogNames: string[]
    taskCount: number
    completedCount: number
    customValues: Record<string, string>
  }> = {}
  for (const c of sessionClients) {
    const diaryEntries = ((c as { diaryEntries?: { id: string; completion: { id: string } | null }[] }).diaryEntries) ?? []
    clientExtras[c.id] = {
      email: c.user.email,
      extraDogNames: c.dogs.map(d => d.name),
      taskCount: diaryEntries.length,
      completedCount: diaryEntries.filter(t => t.completion).length,
      customValues: {},
    }
  }
  const primaryDogIdByClient = new Map(sessionClients.map(c => [c.id, c.dogId] as const))
  for (const v of customValues) {
    const meta = customFields.find(f => f.id === v.fieldId)
    if (meta?.appliesTo === 'DOG') {
      const primary = primaryDogIdByClient.get(v.clientId)
      if (v.dogId && primary && v.dogId !== primary) continue
    }
    if (clientExtras[v.clientId]) {
      clientExtras[v.clientId].customValues[v.fieldId] = v.value
    }
  }

  return NextResponse.json({
    sessions: sessions.map(s => ({
      ...s,
      scheduledAt: s.scheduledAt.toISOString(),
      packageColor: s.clientPackage?.package?.color ?? null,
    })),
    clientExtras,
  })
}
