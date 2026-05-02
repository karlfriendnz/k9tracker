import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string().min(1),
  dogId: z.string().min(1).optional().nullable(),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const trainerId = session.user.trainerId
  if (!trainerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { sessionId } = await params
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Trainer must own the session
  const trainingSession = await prisma.trainingSession.findFirst({
    where: { id: sessionId, trainerId },
    select: { id: true, clientId: true },
  })
  if (!trainingSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Trainer must own the buddy client too
  const buddyClient = await prisma.clientProfile.findFirst({
    where: { id: parsed.data.clientId, trainerId },
    select: { id: true },
  })
  if (!buddyClient) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  // Don't add the primary client as their own buddy
  if (trainingSession.clientId === parsed.data.clientId) {
    return NextResponse.json(
      { error: 'This client is already the primary attendee' },
      { status: 400 }
    )
  }

  // Validate dog belongs to the buddy client (if provided)
  let dogId: string | null = null
  if (parsed.data.dogId) {
    const dog = await prisma.dog.findFirst({
      where: {
        id: parsed.data.dogId,
        OR: [
          { primaryFor: { some: { id: parsed.data.clientId } } },
          { clientProfileId: parsed.data.clientId },
        ],
      },
      select: { id: true },
    })
    if (!dog) return NextResponse.json({ error: 'Dog not found for this client' }, { status: 400 })
    dogId = dog.id
  }

  try {
    const buddy = await prisma.sessionBuddy.create({
      data: { sessionId, clientId: parsed.data.clientId, dogId },
      include: {
        client: { select: { id: true, user: { select: { name: true, email: true } } } },
        dog: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(buddy, { status: 201 })
  } catch (e) {
    // Unique-violation on (sessionId, clientId, dogId) — buddy already added
    if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'This buddy is already on the session' }, { status: 409 })
    }
    throw e
  }
}
