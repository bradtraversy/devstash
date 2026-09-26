import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}))

vi.mock('@/lib/tokens', () => ({
  getVerificationToken: vi.fn(),
  deleteVerificationToken: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getVerificationToken, deleteVerificationToken } from '@/lib/tokens'
import { GET } from './route'

const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockUpdate = vi.mocked(prisma.user.update)
const mockGetToken = vi.mocked(getVerificationToken)
const mockDeleteToken = vi.mocked(deleteVerificationToken)

const NOW = new Date('2026-09-26T12:00:00Z')
const FUTURE = new Date(NOW.getTime() + 60_000)
const PAST = new Date(NOW.getTime() - 60_000)

const user = {
  id: 'user-1',
  email: 'brad@example.com',
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

const validToken = { identifier: user.email, token: 'tok', expires: FUTURE }

function get(token?: string) {
  const url = new URL('http://localhost/api/auth/verify')
  if (token !== undefined) url.searchParams.set('token', token)
  return GET(new Request(url))
}

describe('GET /api/auth/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 400 when the token is missing', async () => {
    const res = await get()

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Missing verification token' })
    expect(mockGetToken).not.toHaveBeenCalled()
  })

  it('returns 400 for an unknown token', async () => {
    mockGetToken.mockResolvedValue(null)

    const res = await get('nope')

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid verification token' })
  })

  it('deletes an expired token and returns 400 without touching the user', async () => {
    mockGetToken.mockResolvedValue({ ...validToken, expires: PAST })

    const res = await get('tok')

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Verification token has expired' })
    expect(mockDeleteToken).toHaveBeenCalledWith('tok')
    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 when no user matches the token identifier', async () => {
    mockGetToken.mockResolvedValue(validToken)
    mockFindUnique.mockResolvedValue(null)

    const res = await get('tok')

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'User not found' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('short-circuits and deletes the token when the email is already verified', async () => {
    mockGetToken.mockResolvedValue(validToken)
    mockFindUnique.mockResolvedValue({ ...user, emailVerified: PAST })

    const res = await get('tok')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: 'Email already verified' })
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockDeleteToken).toHaveBeenCalledWith('tok')
  })

  it('marks the user verified and deletes the used token', async () => {
    mockGetToken.mockResolvedValue(validToken)
    mockFindUnique.mockResolvedValue(user)
    mockUpdate.mockResolvedValue({ ...user, emailVerified: NOW })

    const res = await get('tok')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: 'Email verified successfully' })
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { emailVerified: NOW } })
    expect(mockDeleteToken).toHaveBeenCalledWith('tok')
  })

  it('returns 500 when a dependency throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetToken.mockRejectedValue(new Error('db down'))

    const res = await get('tok')

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'An error occurred during verification' })
    errorSpy.mockRestore()
  })
})
