import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { authorizeCredentials } from '@/lib/auth/credentials'

/**
 * Full NextAuth configuration with Prisma adapter.
 * NOT edge-compatible - use auth.config.ts for edge environments.
 *
 * Note: Providers are defined here (not spread from authConfig) because the
 * credentials authorize step uses Prisma and bcrypt, which are not edge-compatible.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in',
  },
  providers: [
    GitHub,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user.id to the JWT token on sign in
      if (user?.id) {
        token.id = user.id
      }
      // Sync isPro from database on every token refresh
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isPro: true },
        })
        token.isPro = dbUser?.isPro ?? false
      }
      return token
    },
    session({ session, token }) {
      // Add user.id and isPro to the session from the JWT token
      if (token?.id && session.user) {
        session.user.id = token.id as string
        session.user.isPro = Boolean(token.isPro)
      }
      return session
    },
  },
})
