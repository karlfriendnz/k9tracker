import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  priceMonthly: z.number().min(0).optional(),
  maxClients: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: Request, { params }: { params: { planId: string } }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const plan = await prisma.subscriptionPlan.update({
    where: { id: params.planId },
    data: parsed.data,
  })

  return NextResponse.json(plan)
}
