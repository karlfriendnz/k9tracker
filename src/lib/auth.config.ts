import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config — no Prisma, no bcrypt, no Node-only imports.
// Used by middleware for JWT verification only.
export const authConfig: NextAuthConfig = {
  // 365-day JWT so clients on the native app don't get bounced back to
  // magic-link sign-in every month — the cadence at which most clients
  // open the app is "weekly at most", and re-logging via email + tap
  // through to the Capacitor WebView was too much friction. NextAuth
  // rolls the expiry forward on each request, so an actively used
  // session effectively never expires until 365 idle days pass.
  session: { strategy: 'jwt', maxAge: 365 * 24 * 60 * 60 },
  providers: [], // providers are registered in auth.ts (server-only)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-email',
    error: '/login',
  },
}
