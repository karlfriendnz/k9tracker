// Monorepo guard — keeps Turbopack from walking up to the main app's
// src/proxy.ts (which uses next-auth, not a dep of this project). The
// marketing site has no middleware needs; this is intentionally empty.
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
