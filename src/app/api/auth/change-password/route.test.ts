import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { Session } from 'next-auth'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}))

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}))

import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { POST } from './route'

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>
const mockCompare = bcrypt.compare as unknown as Mock<(a: string, b: string) => Promise<boolean>>
const mockHash = bcrypt.hash as unknown as Mock<(a: string, rounds: number) => Promise<string>>
const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockUpdate = vi.mocked(prisma.user.update)

const NOW = new Date('2026-09-26T12:00:00Z')
const session: Session = { user: { id: 'user-1', isPro: false }, expires: '2099-01-01T00:00:00.000Z' }

const user = {
  id: 'user-1',
  email: 'brad@example.com',
  emailVerified: NOW,
  name: 'Brad',
  image: null,
  password: 'stored-hash',
  isPro: false,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  editorPreferences: null,
  createdAt: NOW,
  updatedAt: NOW,
}

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(session)
    mockFindUnique.mockResolvedValue(user)
    mockCompare.mockResolvedValue(true)
    mockHash.mockResolvedValue('new-hash')
  })

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await post({ currentPassword: 'old-password', newPassword: 'new-password' })

    expect(res.status).toBe(401)
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 400 when either password is missing', async () => {
    const res = await post({ currentPassword: 'old-password' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Current password and new password are required' })
  })

  it('returns 400 when the new password is shorter than 8 characters', async () => {
    const res = await post({ currentPassword: 'old-password', newPassword: 'short' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'New password must be at least 8 characters' })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns 400 for an OAuth-only account with no stored password', async () => {
    mockFindUnique.mockResolvedValue({ ...user, password: null })

    const res = await post({ currentPassword: 'old-password', newPassword: 'new-password' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Password change is not available for OAuth accounts' })
    expect(mockCompare).not.toHaveBeenCalled()
  })

  it('returns 400 when the current password does not match', async () => {
    mockCompare.mockResolvedValue(false)

    const res = await post({ currentPassword: 'wrong', newPassword: 'new-password' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Current password is incorrect' })
    expect(mockCompare).toHaveBeenCalledWith('wrong', 'stored-hash')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('hashes and stores the new password for the session user', async () => {
    const res = await post({ currentPassword: 'old-password', newPassword: 'new-password' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: 'Password changed successfully' })
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'user-1' }, select: { id: true, password: true } })
    expect(mockHash).toHaveBeenCalledWith('new-password', 12)
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { password: 'new-hash' } })
  })

  it('returns 500 when a dependency throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFindUnique.mockRejectedValue(new Error('db down'))

    const res = await post({ currentPassword: 'old-password', newPassword: 'new-password' })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'An error occurred while changing your password' })
    errorSpy.mockRestore()
  })
})
