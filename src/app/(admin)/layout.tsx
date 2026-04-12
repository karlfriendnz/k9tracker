import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { signOut } from '@/lib/auth'
import type { ReactNode } from 'react'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Admin top bar */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-lg">🐾</span>
          <span className="font-semibold">K9Tracker Admin</span>
          <span className="text-xs bg-red-600 px-2 py-0.5 rounded-full">Super Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm text-slate-300 hover:text-white">Dashboard</Link>
          <Link href="/admin/trainers" className="text-sm text-slate-300 hover:text-white">Trainers</Link>
          <Link href="/admin/plans" className="text-sm text-slate-300 hover:text-white">Plans</Link>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
            <button type="submit" className="text-xs text-slate-400 hover:text-white">Sign out</button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  )
}
