import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/shared/app-shell'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'CLIENT') redirect('/login')

  // AUTH-03: clients only see their assigned trainer's branding
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      trainer: { select: { businessName: true, logoUrl: true } },
    },
  })

  return (
    <AppShell
      role="CLIENT"
      userName={session.user.name ?? ''}
      trainerLogo={clientProfile?.trainer?.logoUrl}
      businessName={clientProfile?.trainer?.businessName}
    >
      {children}
    </AppShell>
  )
}
