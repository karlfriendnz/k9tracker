import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
})

// POST /api/auth/verify-email — finalises a fresh trainer signup by stamping
// the User.emailVerified column. Both the manual code entry on the register
// form and the one-click button in the verification email resolve here.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const flat = parsed.error.flatten()
    const firstField = Object.entries(flat.fieldErrors)[0]
    const message = firstField?.[1]?.[0] ?? 'Invalid input'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { email, code } = parsed.data

  const token = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token: code } },
  })
  if (!token) {
    return NextResponse.json({ error: 'That code doesn\'t match — try again or request a new one.' }, { status: 400 })
  }
  if (token.expires < new Date()) {
    // Clean up while we're here so it doesn't loiter in the table forever.
    await prisma.verificationToken
      .delete({ where: { identifier_token: { identifier: email, token: code } } })
      .catch(() => {})
    return NextResponse.json({ error: 'That code has expired — request a new one to continue.' }, { status: 400 })
  }

  // Mark the user verified + drop the token so it can't be reused.
  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({
      where: { identifier_token: { identifier: email, token: code } },
    }),
  ])

  return NextResponse.json({ ok: true })
}
