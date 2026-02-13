import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GitHub from 'next-auth/providers/github'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

/**
 * Full NextAuth configuration with Prisma adapter.
 * NOT edge-compatible - use auth.config.ts for edge environments.
 *
 * Note: Providers are defined here (not spread from authConfig) to allow
 * the Credentials provider to use bcrypt validation, which is not edge-compatible.
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.password) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.password)

        if (!isValid) {
          return null
        }

        // Check if email is verified (unless verification is skipped)
        const skipVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true'
        if (!skipVerification && !user.emailVerified) {
          throw new Error('EmailNotVerified')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers (like GitHub), check if email is already registered with password
      if (account?.provider !== 'credentials' && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        // Block OAuth sign-in if user already has a password-based account
        if (existingUser?.password) {
          return '/sign-in?error=OAuthAccountNotLinked'
        }
      }
      return true
    },
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
