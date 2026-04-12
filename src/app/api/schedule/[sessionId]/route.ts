import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { sessionId } = await params

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, googleCalendarRefreshToken: true },
  })
  if (!trainerProfile) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const trainingSession = await prisma.trainingSession.findFirst({
    where: { id: sessionId, trainerId: trainerProfile.id },
  })
  if (!trainingSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Remove from Google Calendar if synced
  if (trainingSession.googleCalendarEventId && trainerProfile.googleCalendarRefreshToken) {
    try {
      const { deleteGoogleCalendarEvent } = await import('@/lib/google-calendar')
      await deleteGoogleCalendarEvent(trainerProfile.googleCalendarRefreshToken, trainingSession.googleCalendarEventId)
    } catch {
      // Non-critical
    }
  }

  await prisma.trainingSession.delete({ where: { id: sessionId } })
  return NextResponse.json({ ok: true })
}
