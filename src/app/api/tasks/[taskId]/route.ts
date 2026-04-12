import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: Request,
  { params }: { params: { taskId: string } }
) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!trainerProfile) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const task = await prisma.trainingTask.findFirst({
    where: {
      id: params.taskId,
      client: { trainerId: trainerProfile.id },
    },
  })

  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.trainingTask.delete({ where: { id: params.taskId } })
  return NextResponse.json({ ok: true })
}
