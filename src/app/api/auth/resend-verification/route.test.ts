import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

vi.mock('@/lib/tokens', () => ({ generateVerificationToken: vi.fn() }))

vi.mock('@/lib/email', () => ({ sendVerificationEmail: vi.fn() }))

vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { POST } from './route'

const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockGenerateToken = vi.mocked(generateVerificationToken)
const mockSendEmail = vi.mocked(sendVerificationEmail)
const mockCheckRateLimit = vi.mocked(checkRateLimit)

const ALLOWED = { success: true, remaining: 2, reset: 0, retryAfter: 0 }
const LIMITED = { success: false, remaining: 0, reset: 0, retryAfter: 30 }

const NOW = new Date('2026-09-26T12:00:00Z')
const EMAIL = 'brad@example.com'

const user = {
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

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCheckRateLimit.mockResolvedValue(ALLOWED)
    mockFindUnique.mockResolvedValue(user)
    mockGenerateToken.mockResolvedValue('tok')
  })

  it('returns 400 when the email is missing', async () => {
    const res = await post({})

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Email is required' })
    expect(mockCheckRateLimit).not.toHaveBeenCalled()
  })

  it('rate limits per email and stops before the lookup', async () => {
    mockCheckRateLimit.mockResolvedValue(LIMITED)

    const res = await post({ email: EMAIL })

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
    expect(mockCheckRateLimit).toHaveBeenCalledWith('resendVerification', EMAIL)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('does not reveal whether an account exists', async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await post({ email: 'nobody@example.com' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: true,
      message: 'If an account exists with this email, a verification link has been sent.',
    })
    expect(mockGenerateToken).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('tells an already verified user to sign in without sending anything', async () => {
    mockFindUnique.mockResolvedValue({ ...user, emailVerified: NOW })

    const res = await post({ email: EMAIL })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: 'Email is already verified. You can sign in.' })
    expect(mockGenerateToken).not.toHaveBeenCalled()
  })

  it('issues a fresh token and emails it to an unverified user', async () => {
    const res = await post({ email: EMAIL })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: 'Verification email sent. Please check your inbox.' })
    expect(mockGenerateToken).toHaveBeenCalledWith(EMAIL)
    expect(mockSendEmail).toHaveBeenCalledWith(EMAIL, 'tok')
  })

  it('returns 500 when a dependency throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSendEmail.mockRejectedValue(new Error('resend down'))

    const res = await post({ email: EMAIL })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'An error occurred while sending the verification email' })
    errorSpy.mockRestore()
  })
})
