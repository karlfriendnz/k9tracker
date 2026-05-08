import type { Metadata } from 'next'
import { Suspense } from 'react'
import { VerifyAccountForm } from './verify-account-form'

export const metadata: Metadata = { title: 'Verify your account' }

// Standalone landing page for the verification email's "Verify my account"
// button. Handles two cases:
//   1. Both `email` and `code` query params present (one-click from the
//      email button) — auto-submit and show success.
//   2. Otherwise — show a manual entry form with email + code inputs.
//
// Suspense boundary is required because verify-account-form reads
// useSearchParams under the App Router.
export default function VerifyAccountPage() {
  return (
    <Suspense fallback={null}>
      <VerifyAccountForm />
    </Suspense>
  )
}
