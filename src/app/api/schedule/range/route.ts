import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Returns the trainer's sessions whose start time falls in [from, to]. Used by
// the schedule modals to show conflict warnings when the trainer picks a time
// that already has a session.
export async function GET(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const trainerId = session.user.trainerId
  if (!trainerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const url = new URL(req.url)
  const fromStr = url.searchParams.get('from')
  const toStr = url.searchParams.get('to')
  if (!fromStr || !toStr) return NextResponse.json({ error: 'Missing range' }, { status: 400 })
  const from = new Date(fromStr)
  const to = new Date(toStr)
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 })
  }

  const sessions = await prisma.trainingSession.findMany({
    where: {
      trainerId,
      scheduledAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      durationMins: true,
      status: true,
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return NextResponse.json(sessions.map(s => ({
    ...s,
    scheduledAt: s.scheduledAt.toISOString(),
  })))
}
