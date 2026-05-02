import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string; buddyId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const trainerId = session.user.trainerId
  if (!trainerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { sessionId, buddyId } = await params

  // Walk through the session to confirm the trainer owns it
  const buddy = await prisma.sessionBuddy.findFirst({
    where: { id: buddyId, sessionId, session: { trainerId } },
    select: { id: true },
  })
  if (!buddy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.sessionBuddy.delete({ where: { id: buddyId } })
  return NextResponse.json({ ok: true })
}
