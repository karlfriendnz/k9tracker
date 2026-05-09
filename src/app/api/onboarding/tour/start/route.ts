import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Stamps tourStartedAt on the trainer's progress row — the explicit
// opt-in signal that gates the floating FAB and pulsing dots elsewhere
// in the app. Called from:
//   - WelcomeModal's "Start the quick setup" button (fresh signups)
//   - BackfillBanner's "Take the tour" button (existing trainers)
// "Skip for now" / "No thanks" do NOT call this — they want the wizard
// out of the way, not riding shotgun on every page.
export async function POST() {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const trainerId = session.user.trainerId
  if (!trainerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Idempotent: only stamp if not already set so re-clicks (or a stray
  // double-submit from the modal) don't bump the timestamp around.
  await prisma.trainerOnboardingProgress.upsert({
    where: { trainerId },
    update: { tourStartedAt: new Date() },
    create: { trainerId, tourStartedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
