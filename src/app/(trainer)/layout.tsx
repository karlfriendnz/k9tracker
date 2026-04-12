import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/shared/app-shell'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart2,
  Calendar,
  Layers,
  MessageSquare,
  Settings,
  HelpCircle,
  Sparkles,
} from 'lucide-react'

const trainerNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/diary', label: 'Training Diary', icon: BookOpen },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/templates', label: 'Templates', icon: Layers },
  { href: '/progress', label: 'Progress', icon: BarChart2 },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/ai-tools', label: 'AI Tools', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help', icon: HelpCircle },
]

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') redirect('/login')

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    select: { businessName: true, logoUrl: true },
  })

  return (
    <AppShell
      navItems={trainerNav}
      trainerName={session.user.name ?? ''}
      trainerLogo={trainerProfile?.logoUrl}
      businessName={trainerProfile?.businessName}
    >
      {children}
    </AppShell>
  )
}
