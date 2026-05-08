import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const schema = z.object({
  name: z.string().min(2),
  businessName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { name, businessName, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        role: 'TRAINER',
        emailVerified: new Date(),
      },
    })

    // Store hashed password in the Account model using provider "credentials"
    await tx.account.create({
      data: {
        userId: user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: passwordHash,
      },
    })

    await tx.trainerProfile.create({
      data: {
        userId: user.id,
        businessName,
      },
    })
  })

  // Welcome email — best-effort; a Resend hiccup shouldn't fail the signup.
  // Account is already auto-verified (emailVerified set above), so the
  // email is informational + login link, not a verification gate.
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.pupmanager.com'}/login`
      const firstName = name.split(' ')[0] || name
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: email,
        subject: 'Welcome to PupManager 🐾',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
            <h1 style="font-size:24px;margin:0 0 12px;">Welcome aboard, ${escapeHtml(firstName)}!</h1>
            <p style="font-size:15px;line-height:1.5;color:#475569;margin:0 0 16px;">
              Your <strong>${escapeHtml(businessName)}</strong> account is ready. Sign in and we'll walk you through
              inviting your first client and setting up your first programme.
            </p>
            <p style="margin:24px 0;">
              <a href="${loginUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">
                Sign in to PupManager
              </a>
            </p>
            <p style="font-size:13px;color:#94a3b8;margin:24px 0 0;">
              Need a hand? Just reply to this email and we'll help you out.
            </p>
          </div>
        `,
      })
    } catch (err) {
      console.error('[register] Welcome email failed:', err)
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
