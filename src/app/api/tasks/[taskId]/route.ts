import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientAccess } from '@/lib/trainer-access'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { taskId } = await params

  const task = await prisma.trainingTask.findUnique({
    where: { id: taskId },
    select: { clientId: true },
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const access = await getClientAccess(task.clientId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!access.canEdit) return NextResponse.json({ error: 'Read-only access' }, { status: 403 })

  await prisma.trainingTask.delete({ where: { id: taskId } })
  return NextResponse.json({ ok: true })
}
