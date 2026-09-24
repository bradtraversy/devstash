import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn() },
}))

// next-auth pulls in Next server internals that do not resolve under Vitest; only the base class matters here.
vi.mock('next-auth', () => ({
  CredentialsSignin: class CredentialsSignin extends Error {
    code = 'credentials'
  },
}))

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  authorizeCredentials,
  EmailNotVerifiedSignin,
  RateLimitedSignin,
  SignInUnavailable,
} from './credentials'

const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockCheckRateLimit = vi.mocked(checkRateLimit)
const mockCompare = vi.mocked(bcrypt.compare)

const allowed = { success: true, remaining: 4, reset: 0, retryAfter: 0 }
const blocked = { success: false, remaining: 0, reset: Date.now() + 60_000, retryAfter: 60 }

const verifiedUser = {
  id: 'user_1',
  email: 'brad@example.com',
  name: 'Brad',
  image: null,
  password: 'hashed',
  emailVerified: new Date('2026-01-01'),
}

describe('authorizeCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    mockCheckRateLimit.mockResolvedValue(allowed)
  })

  it('returns null without touching the rate limiter when a field is missing', async () => {
    expect(await authorizeCredentials({ email: 'a@b.c' })).toBeNull()
    expect(await authorizeCredentials({ password: 'x' })).toBeNull()
    expect(await authorizeCredentials(undefined)).toBeNull()
    expect(mockCheckRateLimit).not.toHaveBeenCalled()
  })

  it('consumes a login slot keyed by email before any database work', async () => {
    mockFindUnique.mockResolvedValue(null)
    await authorizeCredentials({ email: 'a@b.c', password: 'x' })
    expect(mockCheckRateLimit).toHaveBeenCalledWith('login', 'a@b.c')
    const limitOrder = mockCheckRateLimit.mock.invocationCallOrder[0]
    const queryOrder = mockFindUnique.mock.invocationCallOrder[0]
    expect(limitOrder).toBeLessThan(queryOrder)
  })

  it('throws a typed rate limit error and skips the database and bcrypt when blocked', async () => {
    mockCheckRateLimit.mockResolvedValue(blocked)
    const attempt = authorizeCredentials({ email: 'a@b.c', password: 'x' })
    await expect(attempt).rejects.toBeInstanceOf(RateLimitedSignin)
    await expect(attempt).rejects.toMatchObject({ code: 'rate_limited' })
    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(mockCompare).not.toHaveBeenCalled()
  })

  it('throws a typed unavailable error when the rate limiter itself fails', async () => {
    mockCheckRateLimit.mockRejectedValue(new Error('Upstash Redis is not configured'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const attempt = authorizeCredentials({ email: 'a@b.c', password: 'x' })
    await expect(attempt).rejects.toBeInstanceOf(SignInUnavailable)
    await expect(attempt).rejects.toMatchObject({ code: 'unavailable' })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns null for an unknown user or a user without a password', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    expect(await authorizeCredentials({ email: 'a@b.c', password: 'x' })).toBeNull()
    mockFindUnique.mockResolvedValueOnce({ ...verifiedUser, password: null } as never)
    expect(await authorizeCredentials({ email: 'a@b.c', password: 'x' })).toBeNull()
    expect(mockCompare).not.toHaveBeenCalled()
  })

  it('returns null on a wrong password', async () => {
    mockFindUnique.mockResolvedValue(verifiedUser as never)
    mockCompare.mockResolvedValue(false as never)
    expect(await authorizeCredentials({ email: 'a@b.c', password: 'wrong' })).toBeNull()
  })

  it('throws a typed error for an unverified email', async () => {
    mockFindUnique.mockResolvedValue({ ...verifiedUser, emailVerified: null } as never)
    mockCompare.mockResolvedValue(true as never)
    const attempt = authorizeCredentials({ email: 'a@b.c', password: 'right' })
    await expect(attempt).rejects.toBeInstanceOf(EmailNotVerifiedSignin)
    await expect(attempt).rejects.toMatchObject({ code: 'email_not_verified' })
  })

  it('lets an unverified user in when verification is skipped by env', async () => {
    vi.stubEnv('SKIP_EMAIL_VERIFICATION', 'true')
    mockFindUnique.mockResolvedValue({ ...verifiedUser, emailVerified: null } as never)
    mockCompare.mockResolvedValue(true as never)
    const user = await authorizeCredentials({ email: 'a@b.c', password: 'right' })
    expect(user).toEqual({ id: 'user_1', email: 'brad@example.com', name: 'Brad', image: null })
  })

  it('returns the safe user shape on success', async () => {
    mockFindUnique.mockResolvedValue(verifiedUser as never)
    mockCompare.mockResolvedValue(true as never)
    const user = await authorizeCredentials({ email: 'a@b.c', password: 'right' })
    expect(user).toEqual({ id: 'user_1', email: 'brad@example.com', name: 'Brad', image: null })
    expect(user).not.toHaveProperty('password')
  })
})
