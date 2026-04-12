import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  repetitions: z.number().int().positive().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!trainerProfile) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Verify trainer owns this client
  const client = await prisma.clientProfile.findFirst({
    where: { id: parsed.data.clientId, trainerId: trainerProfile.id },
  })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const task = await prisma.trainingTask.create({
    data: {
      clientId: parsed.data.clientId,
      date: new Date(parsed.data.date),
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      repetitions: parsed.data.repetitions ?? null,
      videoUrl: parsed.data.videoUrl ?? null,
    },
  })

  return NextResponse.json(task, { status: 201 })
}
