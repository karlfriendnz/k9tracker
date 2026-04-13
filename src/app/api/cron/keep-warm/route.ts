import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Pings the DB every 5 minutes to keep the serverless function warm
export async function GET() {
  await prisma.$queryRaw`SELECT 1`
  return NextResponse.json({ ok: true })
}
