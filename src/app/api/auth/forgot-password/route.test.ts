import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

vi.mock('@/lib/tokens', () => ({ generatePasswordResetToken: vi.fn() }))

vi.mock('@/lib/email', () => ({ sendPasswordResetEmail: vi.fn() }))

vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { generatePasswordResetToken } from '@/lib/tokens'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { POST } from './route'

const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockGenerateToken = vi.mocked(generatePasswordResetToken)
const mockSendEmail = vi.mocked(sendPasswordResetEmail)
const mockCheckRateLimit = vi.mocked(checkRateLimit)

const ALLOWED = { success: true, remaining: 2, reset: 0, retryAfter: 0 }
const LIMITED = { success: false, remaining: 0, reset: 0, retryAfter: 3600 }

const NOW = new Date('2026-09-26T12:00:00Z')
const EMAIL = 'brad@example.com'
const SAFE_MESSAGE = 'If an account exists with this email, a password reset link has been sent.'

const user = {
  id: 'user-1',
  email: EMAIL,
  emailVerified: NOW,
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

function postRaw(body: string) {
  return POST(
    new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  )
}

function post(body: unknown) {
  return postRaw(JSON.stringify(body))
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue(ALLOWED)
    mockFindUnique.mockResolvedValue(user)
    mockGenerateToken.mockResolvedValue('tok')
  })

  it('checks the rate limit before reading the body', async () => {
    mockCheckRateLimit.mockResolvedValue(LIMITED)

    const res = await postRaw('not json')

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('3600')
    expect(await res.json()).toEqual({ error: 'Too many attempts. Please try again in 60 minutes.' })
    expect(mockCheckRateLimit).toHaveBeenCalledWith('forgotPassword')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 400 when the email is missing', async () => {
    const res = await post({})

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Email is required' })
  })

  it('returns the same message for an unknown email without sending anything', async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await post({ email: 'nobody@example.com' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: SAFE_MESSAGE })
    expect(mockGenerateToken).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns the same message for an OAuth-only account without sending anything', async () => {
    mockFindUnique.mockResolvedValue({ ...user, password: null })

    const res = await post({ email: EMAIL })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: SAFE_MESSAGE })
    expect(mockGenerateToken).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('issues a reset token and emails it to a password account', async () => {
    const res = await post({ email: EMAIL })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: SAFE_MESSAGE })
    expect(mockGenerateToken).toHaveBeenCalledWith(EMAIL)
    expect(mockSendEmail).toHaveBeenCalledWith(EMAIL, 'tok')
  })

  it('returns 500 when a dependency throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFindUnique.mockRejectedValue(new Error('db down'))

    const res = await post({ email: EMAIL })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'An error occurred while processing your request' })
    errorSpy.mockRestore()
  })
})
