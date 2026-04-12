'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface AppShellProps {
  navItems: NavItem[]
  children: React.ReactNode
  trainerName?: string
  trainerLogo?: string | null
  businessName?: string
}

export function AppShell({
  navItems,
  children,
  trainerName,
  trainerLogo,
  businessName,
}: AppShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-100">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-100">
          {trainerLogo ? (
            <img src={trainerLogo} alt={businessName} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm">
              🐾
            </div>
          )}
          <span className="font-semibold text-slate-900 truncate">
            {businessName ?? 'K9Tracker'}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              {trainerName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="text-sm font-medium text-slate-700 truncate">{trainerName}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full text-left text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 z-50">
        <div className="flex">
          {navItems.slice(0, 5).map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors',
                  active ? 'text-blue-600' : 'text-slate-500'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
