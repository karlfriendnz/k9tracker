import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config — no Prisma, no bcrypt, no Node-only imports.
// Used by middleware for JWT verification only.
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
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
