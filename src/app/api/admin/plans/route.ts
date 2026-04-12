import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  priceMonthly: z.number().min(0),
  maxClients: z.number().int().positive().nullable().optional(),
  isActive: z.boolean(),
})

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const plan = await prisma.subscriptionPlan.create({ data: parsed.data })
  return NextResponse.json(plan, { status: 201 })
}
