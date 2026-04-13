import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientAccess } from '@/lib/trainer-access'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  dog: z.object({
    name: z.string().min(1),
    breed: z.string().optional().nullable(),
    weight: z.number().positive().optional().nullable(),
    dob: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).optional().nullable(),
})

export async function DELETE(_req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { clientId } = await params
  const access = await getClientAccess(clientId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Only the primary trainer can delete
  if (access.client.trainerId !== access.trainerId) return NextResponse.json({ error: 'Only the primary trainer can delete a client' }, { status: 403 })
  // Deleting the user cascades to ClientProfile and all related data
  await prisma.user.delete({ where: { id: access.client.userId } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { clientId } = await params
  const access = await getClientAccess(clientId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!access.canEdit) return NextResponse.json({ error: 'Read-only access' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { name, status, dog } = parsed.data
  const { client } = access

  if (name !== undefined) {
    await prisma.user.update({ where: { id: client.userId }, data: { name } })
  }

  if (status !== undefined) {
    await prisma.clientProfile.update({ where: { id: client.id }, data: { status } })
  }

  if (dog !== undefined) {
    if (client.dogId) {
      await prisma.dog.update({
        where: { id: client.dogId },
        data: {
          name: dog!.name,
          breed: dog!.breed ?? null,
          weight: dog!.weight ?? null,
          dob: dog!.dob ? new Date(dog!.dob) : null,
          notes: dog!.notes ?? null,
        },
      })
    } else if (dog) {
      const newDog = await prisma.dog.create({
        data: {
          name: dog.name,
          breed: dog.breed ?? null,
          weight: dog.weight ?? null,
          dob: dog.dob ? new Date(dog.dob) : null,
          notes: dog.notes ?? null,
        },
      })
      await prisma.clientProfile.update({ where: { id: client.id }, data: { dogId: newDog.id } })
    }
  }

  return NextResponse.json({ ok: true })
}
