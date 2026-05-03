import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(8).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
})

async function getTrainerId(userId: string) {
  const p = await prisma.trainerProfile.findUnique({ where: { userId }, select: { id: true } })
  return p?.id ?? null
}

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const trainerId = await getTrainerId(session.user.id)
  if (!trainerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const achievements = await prisma.achievement.findMany({
    where: { trainerId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(achievements)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const trainerId = await getTrainerId(session.user.id)
  if (!trainerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const count = await prisma.achievement.count({ where: { trainerId } })
  const achievement = await prisma.achievement.create({
    data: {
      trainerId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      icon: parsed.data.icon ?? null,
      color: parsed.data.color ?? null,
      order: count,
    },
  })
  return NextResponse.json(achievement, { status: 201 })
}
