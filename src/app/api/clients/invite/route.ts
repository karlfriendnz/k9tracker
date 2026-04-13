import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Resend } from 'resend'
import crypto from 'crypto'

const schema = z.object({
  clientName: z.string().min(2),
  dogName: z.string().min(1),
  clientEmail: z.string().email(),
  sendInvite: z.boolean().default(true),
  emailBody: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'TRAINER') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { clientName, dogName, clientEmail, sendInvite, emailBody } = parsed.data

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true } } },
  })
  if (!trainerProfile) {
    return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 })
  }

  // Prevent duplicate invites
  const existingUser = await prisma.user.findUnique({ where: { email: clientEmail } })
  if (existingUser) {
    return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })
  }

  // Create a pending client user and profile
  const inviteToken = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await prisma.$transaction(async (tx) => {
    const clientUser = await tx.user.create({
      data: {
        name: clientName,
        email: clientEmail,
        role: 'CLIENT',
      },
    })

    const dog = await tx.dog.create({
      data: { name: dogName },
    })

    await tx.clientProfile.create({
      data: {
        userId: clientUser.id,
        trainerId: trainerProfile.id,
        dogId: dog.id,
      },
    })

    // Store invite token for magic-link style onboarding
    await tx.verificationToken.create({
      data: {
        identifier: clientEmail,
        token: inviteToken,
        expires,
      },
    })
  })

  if (sendInvite && emailBody) {
    const personalised = emailBody
      .replace(/{{clientName}}/g, clientName)
      .replace(/{{dogName}}/g, dogName)

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite?token=${inviteToken}&email=${encodeURIComponent(clientEmail)}`

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: clientEmail,
      subject: `You've been invited to K9Tracker by ${trainerProfile.user.name ?? trainerProfile.businessName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <pre style="font-family:sans-serif;white-space:pre-wrap;">${personalised}</pre>
          <p style="margin-top:24px;">
            <a href="${inviteUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
              Join K9Tracker
            </a>
          </p>
        </div>
      `,
    })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
