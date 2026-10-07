import Credentials from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'
import { gitHubProvider, googleProvider } from '@/lib/auth/providers'

/**
 * Edge-compatible auth configuration.
 * Contains only providers - no adapter or database dependencies.
 * Used by proxy.ts for route protection in edge environments.
 *
 * Note: Credentials provider has placeholder authorize function here.
 * The actual bcrypt validation is in auth.ts which overrides this.
 */
export default {
  pages: {
    signIn: '/sign-in',
  },
  providers: [
    gitHubProvider,
    googleProvider,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // Placeholder - overridden in auth.ts with actual validation
      authorize: () => null,
    }),
  ],
} satisfies NextAuthConfig
