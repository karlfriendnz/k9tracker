import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}) {
  const params = await searchParams
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to keep your training programmes on track.
        </p>
      </div>
      <LoginForm error={params.error} callbackUrl={params.callbackUrl} />
    </div>
  )
}
