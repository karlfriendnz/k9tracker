import type { Metadata } from 'next'
import { Calendar } from 'lucide-react'

export const metadata: Metadata = { title: 'Sessions' }

export default function MySessionsPage() {
  return (
    <div className="px-5 pt-6">
      <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
      <p className="text-sm text-slate-500 mt-1">Your upcoming and past training sessions.</p>

      <div className="mt-10 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Calendar className="h-7 w-7 text-slate-400" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-600">Session list coming soon</p>
        <p className="mt-1 text-xs text-slate-400 max-w-xs">
          You&apos;ll see upcoming sessions, past notes, and homework here.
        </p>
      </div>
    </div>
  )
}
