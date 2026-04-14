import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const SCOPES = 'https://www.googleapis.com/auth/calendar.events'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.redirect('/login')
  }

  // Generate a short-lived CSRF state token tied to this user
  const stateToken = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await prisma.verificationToken.create({
    data: {
      identifier: `gcal-oauth:${session.user.id}`,
      token: stateToken,
      expires,
    },
  })

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: stateToken,
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
