import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}))

vi.mock('@/lib/tokens', () => ({
  getPasswordResetToken: vi.fn(),
  deletePasswordResetToken: vi.fn(),
}))

vi.mock('bcryptjs', () => ({ default: { hash: vi.fn() } }))

vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  checkRateLimit: vi.fn(),
}))

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getPasswordResetToken, deletePasswordResetToken } from '@/lib/tokens'
import { checkRateLimit } from '@/lib/rate-limit'
import { POST } from './route'

const mockHash = bcrypt.hash as unknown as Mock<(a: string, rounds: number) => Promise<string>>
const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockUpdate = vi.mocked(prisma.user.update)
const mockGetToken = vi.mocked(getPasswordResetToken)
const mockDeleteToken = vi.mocked(deletePasswordResetToken)
const mockCheckRateLimit = vi.mocked(checkRateLimit)

const ALLOWED = { success: true, remaining: 4, reset: 0, retryAfter: 0 }
const LIMITED = { success: false, remaining: 0, reset: 0, retryAfter: 45 }

const NOW = new Date('2026-09-26T12:00:00Z')
const FUTURE = new Date(NOW.getTime() + 60_000)
const PAST = new Date(NOW.getTime() - 60_000)
const EMAIL = 'brad@example.com'

const user = {
  id: 'user-1',
  email: EMAIL,
  emailVerified: NOW,
  name: 'Brad',
  image: null,
  password: 'old-hash',
  isPro: false,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  editorPreferences: null,
  createdAt: NOW,
  updatedAt: NOW,
}

const resetToken = { identifier: `password-reset:${EMAIL}`, token: 'tok', expires: FUTURE, email: EMAIL }
const validBody = { token: 'tok', password: 'newpassword', confirmPassword: 'newpassword' }

function postRaw(body: string) {
  return POST(
    new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  )
}

function post(body: unknown) {
  return postRaw(JSON.stringify(body))
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    mockCheckRateLimit.mockResolvedValue(ALLOWED)
    mockGetToken.mockResolvedValue(resetToken)
    mockFindUnique.mockResolvedValue(user)
    mockHash.mockResolvedValue('new-hash')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('checks the rate limit before reading the body', async () => {
    mockCheckRateLimit.mockResolvedValue(LIMITED)

    const res = await postRaw('not json')

    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('45')
    expect(await res.json()).toEqual({ error: 'Too many attempts. Please try again in 45 seconds.' })
    expect(mockCheckRateLimit).toHaveBeenCalledWith('resetPassword')
    expect(mockGetToken).not.toHaveBeenCalled()
  })

  it('returns 400 when the token is missing', async () => {
    const res = await post({ password: 'newpassword', confirmPassword: 'newpassword' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Reset token is required' })
  })

  it('returns 400 when a password field is missing', async () => {
    const res = await post({ token: 'tok', password: 'newpassword' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Password and confirm password are required' })
  })

  it('returns 400 when the passwords do not match', async () => {
    const res = await post({ ...validBody, confirmPassword: 'different1' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Passwords do not match' })
  })

  it('returns 400 when the password is shorter than 8 characters', async () => {
    const res = await post({ token: 'tok', password: 'short', confirmPassword: 'short' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Password must be at least 8 characters' })
    expect(mockGetToken).not.toHaveBeenCalled()
  })

  it('returns 400 for an unknown token', async () => {
    mockGetToken.mockResolvedValue(null)

    const res = await post(validBody)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid or expired reset token' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('deletes an expired token and returns 400 without changing the password', async () => {
    mockGetToken.mockResolvedValue({ ...resetToken, expires: PAST })

    const res = await post(validBody)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Reset token has expired. Please request a new one.' })
    expect(mockDeleteToken).toHaveBeenCalledWith('tok')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 when the token email no longer matches a user', async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await post(validBody)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'User not found' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('hashes the new password, stores it, and deletes the used token', async () => {
    const res = await post(validBody)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    })
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: EMAIL } })
    expect(mockHash).toHaveBeenCalledWith('newpassword', 12)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { password: 'new-hash' } })
    expect(mockDeleteToken).toHaveBeenCalledWith('tok')
    expect(mockUpdate.mock.invocationCallOrder[0]).toBeLessThan(mockDeleteToken.mock.invocationCallOrder[0])
  })

  it('returns 500 when a dependency throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetToken.mockRejectedValue(new Error('db down'))

    const res = await post(validBody)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'An error occurred while resetting your password' })
    errorSpy.mockRestore()
  })
})
