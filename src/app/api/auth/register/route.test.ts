import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
}))

vi.mock('@/lib/tokens', () => ({ generateVerificationToken: vi.fn() }))

vi.mock('@/lib/email', () => ({ sendVerificationEmail: vi.fn() }))

vi.mock('bcryptjs', () => ({ default: { hash: vi.fn() } }))

// Keep the real 429 response so the tests assert what a client actually receives.
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}))

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { POST } from './route'

const mockHash = bcrypt.hash as unknown as Mock<(a: string, rounds: number) => Promise<string>>
const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockCreate = vi.mocked(prisma.user.create)
const mockGenerateToken = vi.mocked(generateVerificationToken)
const mockSendEmail = vi.mocked(sendVerificationEmail)
const mockCheckRateLimit = vi.mocked(checkRateLimit)

const ALLOWED = { success: true, remaining: 2, reset: 0, retryAfter: 0 }
const LIMITED = { success: false, remaining: 0, reset: 0, retryAfter: 90 }

const NOW = new Date('2026-09-26T12:00:00Z')
const EMAIL = 'brad@example.com'

const createdUser = {
  id: 'user-1',
  email: EMAIL,
  emailVerified: null,
  name: 'Brad',
  image: null,
  password: 'hashed',
  isPro: false,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  editorPreferences: null,
  createdAt: NOW,
  updatedAt: NOW,
}

const validBody = { name: 'Brad', email: EMAIL, password: 'longenough', confirmPassword: 'longenough' }

function postRaw(body: string) {
  return POST(
    new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  )
}

function post(body: unknown) {
  return postRaw(JSON.stringify(body))
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.stubEnv('SKIP_EMAIL_VERIFICATION', 'false')
    mockCheckRateLimit.mockResolvedValue(ALLOWED)
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue(createdUser)
    mockHash.mockResolvedValue('hashed')
    mockGenerateToken.mockResolvedValue('tok')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('checks the rate limit before reading the body', async () => {
    mockCheckRateLimit.mockResolvedValue(LIMITED)

    const res = await postRaw('not json')

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('90')
    expect(await res.json()).toEqual({ error: 'Too many attempts. Please try again in 2 minutes.' })
    expect(mockCheckRateLimit).toHaveBeenCalledWith('register')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 400 when a required field is missing', async () => {
    const res = await post({ email: EMAIL, password: 'longenough' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Email, password, and confirm password are required' })
  })

  it('returns 400 when the passwords do not match', async () => {
    const res = await post({ ...validBody, confirmPassword: 'different1' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Passwords do not match' })
  })

  it('returns 400 when the password is shorter than 8 characters', async () => {
    const res = await post({ ...validBody, password: 'short', confirmPassword: 'short' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Password must be at least 8 characters' })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 400 when the email is already registered', async () => {
    mockFindUnique.mockResolvedValue(createdUser)

    const res = await post(validBody)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'User with this email already exists' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates an unverified user and sends a verification email', async () => {
    const res = await post(validBody)

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({
      success: true,
      message: 'Please check your email to verify your account',
      user: { id: 'user-1', name: 'Brad', email: EMAIL },
    })
    expect(mockHash).toHaveBeenCalledWith('longenough', 12)
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: 'Brad', email: EMAIL, password: 'hashed', emailVerified: null },
    })
    expect(mockGenerateToken).toHaveBeenCalledWith(EMAIL)
    expect(mockSendEmail).toHaveBeenCalledWith(EMAIL, 'tok')
  })

  it('auto-verifies and skips the email only when SKIP_EMAIL_VERIFICATION is true', async () => {
    vi.stubEnv('SKIP_EMAIL_VERIFICATION', 'true')

    const res = await post({ ...validBody, name: undefined })

    expect(res.status).toBe(201)
    expect((await res.json()).message).toBe('Account created successfully')
    expect(mockCreate).toHaveBeenCalledWith({
      data: { name: null, email: EMAIL, password: 'hashed', emailVerified: NOW },
    })
    expect(mockGenerateToken).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns 500 when a dependency throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFindUnique.mockRejectedValue(new Error('db down'))

    const res = await post(validBody)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'An error occurred during registration' })
    errorSpy.mockRestore()
  })
})
