import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const trainerId = session.user.trainerId
  if (!trainerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { sessionId } = await params

  // Verify trainer owns the session and pull the package's default form id so
  // we can lazily auto-attach it when no responses exist yet.
  const owns = await prisma.trainingSession.findFirst({
    where: { id: sessionId, trainerId },
    select: {
      id: true,
      clientPackage: { select: { package: { select: { defaultSessionFormId: true } } } },
    },
  })
  if (!owns) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let responses = await prisma.sessionFormResponse.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    include: {
      form: { select: { id: true, name: true, questions: true, introText: true, closingText: true } },
    },
  })

  // Lazy auto-attach: first time a package-linked session is opened with no
  // responses, materialise the package's default form. Subsequent opens skip
  // because there's now at least one response.
  const defaultFormId = owns.clientPackage?.package?.defaultSessionFormId
  if (responses.length === 0 && defaultFormId) {
    try {
      await prisma.sessionFormResponse.create({
        data: { sessionId, formId: defaultFormId, answers: {}, imagesByQuestion: {} },
      })
      responses = await prisma.sessionFormResponse.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        include: {
          form: { select: { id: true, name: true, questions: true, introText: true, closingText: true } },
        },
      })
    } catch {
      // Race or stale form id — fall through with whatever we have.
    }
  }

  return NextResponse.json(responses)
}
