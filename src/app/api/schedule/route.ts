import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(2),
  scheduledAt: z.string(),
  durationMins: z.number().int().positive().default(60),
  sessionType: z.enum(['IN_PERSON', 'VIRTUAL']),
  location: z.string().optional(),
  virtualLink: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  dogId: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, googleCalendarConnected: true, googleCalendarRefreshToken: true },
  })
  if (!trainerProfile) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const trainingSession = await prisma.trainingSession.create({
    data: {
      trainerId: trainerProfile.id,
      title: parsed.data.title,
      scheduledAt: new Date(parsed.data.scheduledAt),
      durationMins: parsed.data.durationMins,
      sessionType: parsed.data.sessionType,
      location: parsed.data.location ?? null,
      virtualLink: parsed.data.virtualLink || null,
      description: parsed.data.description ?? null,
      dogId: parsed.data.dogId ?? null,
    },
  })

  // Sync to Google Calendar if connected
  if (trainerProfile.googleCalendarConnected && trainerProfile.googleCalendarRefreshToken) {
    try {
      const { syncSessionToGoogleCalendar } = await import('@/lib/google-calendar')
      const eventId = await syncSessionToGoogleCalendar(trainerProfile.googleCalendarRefreshToken, trainingSession)
      if (eventId) {
        await prisma.trainingSession.update({
          where: { id: trainingSession.id },
          data: { googleCalendarEventId: eventId },
        })
      }
    } catch {
      // Non-critical — session still created
    }
  }

  return NextResponse.json(trainingSession, { status: 201 })
}
