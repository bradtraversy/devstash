import type { Account, Profile, User } from 'next-auth'
import { prisma } from '@/lib/prisma'

export const OAUTH_EMAIL_UNVERIFIED_URL = '/sign-in?error=OAuthEmailUnverified'

interface SignInCheck {
  user: Pick<User, 'email'>
  account?: Pick<Account, 'provider'> | null
  profile?: Pick<Profile, 'email' | 'email_verified'>
}

/**
 * Returns true to continue, or the sign-in page URL with the error to show. `user` is the existing
 * account for a returning user and the provider's profile for a new one.
 */
export async function checkOAuthSignIn({ user, account, profile }: SignInCheck): Promise<true | string> {
  if (account?.provider === 'google') {
    const email = profile?.email
    if (profile?.email_verified !== true || !email) return OAUTH_EMAIL_UNVERIFIED_URL
    // Before Auth.js links Google to an account with this email, so a failure here stops the link.
    if (email === user.email) await markGoogleEmailVerified(email)
    return true
  }

  // Returning users always have an email on their account, so only a new GitHub sign-up lands here.
  if (account?.provider === 'github' && !user.email) return OAUTH_EMAIL_UNVERIFIED_URL

  return true
}

interface LinkedAccount {
  user: Pick<User, 'email'>
  account: Pick<Account, 'provider'>
  profile: Pick<User, 'email'>
}

/** New Google users are created unverified; signIn already handled accounts that existed. */
export async function onLinkAccount({ user, account, profile }: LinkedAccount): Promise<void> {
  if (account.provider === 'google' && profile.email && profile.email === user.email) {
    await markGoogleEmailVerified(profile.email)
  }
}

/**
 * Google proved the address, so an account that never verified it becomes verified and loses its
 * password: whoever set that password may have registered with someone else's email.
 */
export async function markGoogleEmailVerified(email: string): Promise<void> {
  await prisma.user.updateMany({
    where: { email, emailVerified: null },
    data: { emailVerified: new Date(), password: null },
  })
}
