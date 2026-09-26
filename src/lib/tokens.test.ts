import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  generateVerificationToken,
  getVerificationToken,
  deleteVerificationToken,
  generatePasswordResetToken,
  getPasswordResetToken,
  deletePasswordResetToken,
} from './tokens'

const mockDeleteMany = vi.mocked(prisma.verificationToken.deleteMany)
const mockCreate = vi.mocked(prisma.verificationToken.create)
const mockFindUnique = vi.mocked(prisma.verificationToken.findUnique)
const mockDelete = vi.mocked(prisma.verificationToken.delete)

const NOW = new Date('2026-09-26T12:00:00Z')
const HOUR = 60 * 60 * 1000
const EMAIL = 'brad@example.com'
const RESET_IDENTIFIER = `password-reset:${EMAIL}`

describe('tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    mockCreate.mockResolvedValue({ identifier: EMAIL, token: 'created-token', expires: NOW })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateVerificationToken', () => {
    it('replaces any existing token for the email and returns the stored one', async () => {
      const token = await generateVerificationToken(EMAIL)

      expect(token).toBe('created-token')
      expect(mockDeleteMany).toHaveBeenCalledWith({ where: { identifier: EMAIL } })
      expect(mockDeleteMany.mock.invocationCallOrder[0]).toBeLessThan(mockCreate.mock.invocationCallOrder[0])
    })

    it('stores a 32-byte hex token that expires in 24 hours', async () => {
      await generateVerificationToken(EMAIL)

      const { data } = mockCreate.mock.calls[0][0]
      expect(data.identifier).toBe(EMAIL)
      expect(data.token).toMatch(/^[0-9a-f]{64}$/)
      expect(data.expires).toEqual(new Date(NOW.getTime() + 24 * HOUR))
    })

    it('generates a different token on every call', async () => {
      await generateVerificationToken(EMAIL)
      await generateVerificationToken(EMAIL)

      expect(mockCreate.mock.calls[0][0].data.token).not.toBe(mockCreate.mock.calls[1][0].data.token)
    })
  })

  describe('getVerificationToken', () => {
    it('looks the token up by value', async () => {
      const row = { identifier: EMAIL, token: 'abc', expires: NOW }
      mockFindUnique.mockResolvedValue(row)

      expect(await getVerificationToken('abc')).toEqual(row)
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { token: 'abc' } })
    })
  })

  describe('deleteVerificationToken', () => {
    it('deletes by token value', async () => {
      await deleteVerificationToken('abc')

      expect(mockDelete).toHaveBeenCalledWith({ where: { token: 'abc' } })
    })
  })

  describe('generatePasswordResetToken', () => {
    it('namespaces the identifier with the reset prefix and expires in one hour', async () => {
      const token = await generatePasswordResetToken(EMAIL)

      expect(token).toBe('created-token')
      expect(mockDeleteMany).toHaveBeenCalledWith({ where: { identifier: RESET_IDENTIFIER } })
      const { data } = mockCreate.mock.calls[0][0]
      expect(data.identifier).toBe(RESET_IDENTIFIER)
      expect(data.token).toMatch(/^[0-9a-f]{64}$/)
      expect(data.expires).toEqual(new Date(NOW.getTime() + HOUR))
    })
  })

  describe('getPasswordResetToken', () => {
    it('returns null for an unknown token', async () => {
      mockFindUnique.mockResolvedValue(null)

      expect(await getPasswordResetToken('nope')).toBeNull()
    })

    it('refuses a verification token presented as a reset token', async () => {
      mockFindUnique.mockResolvedValue({ identifier: EMAIL, token: 'abc', expires: NOW })

      expect(await getPasswordResetToken('abc')).toBeNull()
    })

    it('strips the prefix into an email field', async () => {
      mockFindUnique.mockResolvedValue({ identifier: RESET_IDENTIFIER, token: 'abc', expires: NOW })

      expect(await getPasswordResetToken('abc')).toEqual({
        identifier: RESET_IDENTIFIER,
        token: 'abc',
        expires: NOW,
        email: EMAIL,
      })
    })
  })

  describe('deletePasswordResetToken', () => {
    it('deletes by token value', async () => {
      await deletePasswordResetToken('abc')

      expect(mockDelete).toHaveBeenCalledWith({ where: { token: 'abc' } })
    })
  })
})
