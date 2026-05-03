import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(8).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  order: z.number().int().optional(),
})

async function ensureOwner(userId: string, achievementId: string) {
  const profile = await prisma.trainerProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) return null
  const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } })
  if (!achievement || achievement.trainerId !== profile.id) return null
  return { trainerId: profile.id, achievement }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ achievementId: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { achievementId } = await ctx.params
  const owner = await ensureOwner(session.user.id, achievementId)
  if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await prisma.achievement.update({
    where: { id: achievementId },
    data: parsed.data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ achievementId: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { achievementId } = await ctx.params
  const owner = await ensureOwner(session.user.id, achievementId)
  if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.achievement.delete({ where: { id: achievementId } })
  return NextResponse.json({ ok: true })
}
