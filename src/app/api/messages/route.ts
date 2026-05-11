import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { safeEvaluate } from '@/lib/achievements'
import { notifyMessageRecipient } from '@/lib/notify-message-recipient'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string().min(1),
  body: z.string().min(1).max(2000),
  channel: z.enum(['TRAINER_CLIENT', 'TRAINER_TRAINER']).default('TRAINER_CLIENT'),
})

// GET /api/messages?clientId=xxx — fetch thread for a client
export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (trainerProfile) {
    // Trainer: verify client belongs to them
    const client = await prisma.clientProfile.findFirst({
      where: { id: clientId, trainerId: trainerProfile.id },
    })
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } else {
    // Client: verify they are the client
    const clientProfile = await prisma.clientProfile.findFirst({
      where: { id: clientId, userId: session.user.id },
    })
    if (!clientProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const messages = await prisma.message.findMany({
    where: { clientId, channel: 'TRAINER_CLIENT' },
    include: { sender: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })

  // Mark unread messages as read for the current user
  const unreadIds = messages
    .filter(m => !m.readAt && m.senderId !== session.user.id)
    .map(m => m.id)
  if (unreadIds.length > 0) {
    await prisma.message.updateMany({
      where: { id: { in: unreadIds } },
      data: { readAt: new Date() },
    })
  }

  return NextResponse.json(messages)
}

// POST /api/messages — send a message
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { clientId, body: msgBody, channel } = parsed.data

  // Validate sender is either the trainer for this client, or the client themselves
  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (trainerProfile) {
    const client = await prisma.clientProfile.findFirst({
      where: { id: clientId, trainerId: trainerProfile.id },
    })
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } else {
    const clientProfile = await prisma.clientProfile.findFirst({
      where: { id: clientId, userId: session.user.id },
    })
    if (!clientProfile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const message = await prisma.message.create({
    data: {
      clientId,
      senderId: session.user.id,
      body: msgBody,
      channel,
    },
    include: { sender: { select: { name: true, email: true } } },
  })

  // MESSAGES_SENT trigger only counts client-authored messages.
  if (channel === 'TRAINER_CLIENT' && !trainerProfile) {
    await safeEvaluate(clientId)
  }

  // Fire-and-forget push to the recipient (the other party in the
  // thread). Only TRAINER_CLIENT messages — internal trainer notes or
  // other channels don't need to push the other side. We `await` here
  // rather than dropping the promise so the run keeps the function
  // warm under Fluid Compute, but errors are caught internally so a
  // flaky APNs response can't fail the message-create itself.
  if (channel === 'TRAINER_CLIENT') {
    await notifyMessageRecipient({
      messageId: message.id,
      clientId,
      senderId: session.user.id,
      body: msgBody,
    })
  }

  return NextResponse.json(message, { status: 201 })
}
