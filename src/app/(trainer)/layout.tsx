import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/shared/app-shell'

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') redirect('/login')

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { businessName: true, logoUrl: true },
  })

  return (
    <AppShell
      role="TRAINER"
      userName={session.user.name ?? ''}
      trainerLogo={trainerProfile?.logoUrl}
      businessName={trainerProfile?.businessName}
    >
      {children}
    </AppShell>
  )
}
