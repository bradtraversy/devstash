import bcrypt from 'bcryptjs'
import { CredentialsSignin } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'

export class RateLimitedSignin extends CredentialsSignin {
  code = 'rate_limited'
}

export class EmailNotVerifiedSignin extends CredentialsSignin {
  code = 'email_not_verified'
}

export class SignInUnavailable extends CredentialsSignin {
  code = 'unavailable'
}

export interface AuthorizedUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

type CredentialInput = Partial<Record<'email' | 'password', unknown>> | undefined

export async function authorizeCredentials(
  credentials: CredentialInput
): Promise<AuthorizedUser | null> {
  const email = typeof credentials?.email === 'string' ? credentials.email : ''
  const password = typeof credentials?.password === 'string' ? credentials.password : ''

  if (!email || !password) {
    return null
  }

  // Counted before any database or bcrypt work so a guess costs the attacker a slot, not us CPU.
  let rateLimit
  try {
    rateLimit = await checkRateLimit('login', email)
  } catch (error) {
    console.error('Login rate limit unavailable:', error)
    throw new SignInUnavailable()
  }
  if (!rateLimit.success) {
    throw new RateLimitedSignin()
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.password) {
    return null
  }

  const isValid = await bcrypt.compare(password, user.password)

  if (!isValid) {
    return null
  }

  const skipVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true'
  if (!skipVerification && !user.emailVerified) {
    throw new EmailNotVerifiedSignin()
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  }
}
