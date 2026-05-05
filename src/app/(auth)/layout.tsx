import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-blue-50/40 px-4 py-10 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-col items-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="rounded-2xl shadow-lg shadow-blue-900/10 ring-1 ring-slate-900/5">
            <Image
              src="/logo.png"
              alt="PupManager"
              width={56}
              height={56}
              priority
              className="rounded-2xl"
            />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900">PupManager</span>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  )
}
