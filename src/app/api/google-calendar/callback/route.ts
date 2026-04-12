import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')

  if (!code || !userId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/schedule?error=gcal`)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.refresh_token) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/schedule?error=gcal`)
  }

  await prisma.trainerProfile.update({
    where: { userId },
    data: {
      googleCalendarRefreshToken: tokens.refresh_token,
      googleCalendarConnected: true,
    },
  })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/schedule?gcal=connected`)
}
