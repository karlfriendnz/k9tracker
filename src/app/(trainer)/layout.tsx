import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/shared/app-shell'

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') redirect('/login')

  // Read logo + business name fresh from DB on every render so settings updates
  // are reflected immediately. The JWT caches these only at sign-in.
  const tp = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { businessName: true, logoUrl: true },
  })

  return (
    <AppShell
      role="TRAINER"
      userName={session.user.name ?? ''}
      userEmail={session.user.email ?? ''}
      trainerLogo={tp?.logoUrl ?? null}
      businessName={tp?.businessName ?? session.user.businessName}
    >
      {children}
    </AppShell>
  )
}
