'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { OAuthButtons, type EnabledOAuth } from '../oauth-buttons'

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    businessName: z.string().min(2, 'Business name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export function RegisterForm({ enabledOAuth }: { enabledOAuth: EnabledOAuth }) {
  const [serverError, setServerError] = useState<string | null>(null)
  // Once signup succeeds the form swaps to a "check your email" success state
  // rather than redirecting. Trainer sees confirmation + login CTA inline.
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        businessName: data.businessName,
        email: data.email,
        password: data.password,
      }),
    })

    if (!res.ok) {
      const body = await res.json()
      setServerError(body.error ?? 'Registration failed. Please try again.')
      return
    }

    setRegisteredEmail(data.email)
  }

  if (registeredEmail) {
    return (
      <Card>
        <CardBody className="pt-8 pb-8 text-center flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">You&apos;re all set 🎉</h2>
          <p className="text-sm text-slate-600 max-w-sm">
            We&apos;ve sent a welcome email to{' '}
            <span className="font-medium text-slate-900">{registeredEmail}</span>.
            Check your inbox for a quick-start link.
          </p>
          <p className="text-xs text-slate-400 inline-flex items-center gap-1.5 mt-1">
            <Mail className="h-3.5 w-3.5" />
            Email not arrived? Check spam, or just sign in below.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center justify-center w-full max-w-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3 transition-colors"
          >
            Sign in to PupManager
          </Link>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody className="pt-6">
        {serverError && (
          <Alert variant="error" className="mb-4">{serverError}</Alert>
        )}
        <OAuthButtons enabledOAuth={enabledOAuth} ctaPrefix="Sign up with" />
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Your name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Business name"
            type="text"
            placeholder="Pawsome Dog Training"
            error={errors.businessName?.message}
            {...register('businessName')}
          />
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="jane@pawsome.co.nz"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" size="lg" className="w-full mt-1" loading={isSubmitting}>
            Create account
          </Button>
          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardBody>
    </Card>
  )
}
