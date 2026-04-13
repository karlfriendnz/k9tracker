import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      trainerId?: string
      businessName?: string
      logoUrl?: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    trainerId?: string
    businessName?: string
    logoUrl?: string | null
  }
}
