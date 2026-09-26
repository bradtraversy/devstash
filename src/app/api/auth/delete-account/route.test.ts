import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import type { Session } from 'next-auth'
import Stripe from 'stripe'

const { retrieve, cancel } = vi.hoisted(() => ({ retrieve: vi.fn(), cancel: vi.fn() }))

vi.mock('@/auth', () => ({ auth: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn(), delete: vi.fn() } },
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ subscriptions: { retrieve, cancel } }),
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { DELETE } from './route'

const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>
const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockDelete = vi.mocked(prisma.user.delete)

const NOW = new Date('2026-09-26T12:00:00Z')
const session: Session = { user: { id: 'user-1', isPro: true }, expires: '2099-01-01T00:00:00.000Z' }

const user = {
  id: 'user-1',
  email: 'brad@example.com',
  emailVerified: NOW,
  name: 'Brad',
  image: null,
  password: 'stored-hash',
  isPro: true,
  stripeCustomerId: 'cus_1',
  stripeSubscriptionId: 'sub_1',
  editorPreferences: null,
  createdAt: NOW,
  updatedAt: NOW,
}

describe('DELETE /api/auth/delete-account', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetAllMocks()
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockAuth.mockResolvedValue(session)
    mockFindUnique.mockResolvedValue(user)
    mockDelete.mockResolvedValue(user)
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('returns 401 without a session', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await DELETE()

    expect(res.status).toBe(401)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes the user directly when there is no subscription', async () => {
    mockFindUnique.mockResolvedValue({ ...user, stripeSubscriptionId: null })

    const res = await DELETE()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: 'Account deleted successfully' })
    expect(retrieve).not.toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'user-1' } })
  })

  it('cancels an active subscription before deleting the user', async () => {
    retrieve.mockResolvedValue({ status: 'active' })

    const res = await DELETE()

    expect(res.status).toBe(200)
    expect(retrieve).toHaveBeenCalledWith('sub_1')
    expect(cancel).toHaveBeenCalledWith('sub_1')
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(mockDelete.mock.invocationCallOrder[0])
  })

  it('skips the cancel call when the subscription is already canceled', async () => {
    retrieve.mockResolvedValue({ status: 'canceled' })

    const res = await DELETE()

    expect(res.status).toBe(200)
    expect(cancel).not.toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalled()
  })

  it('still deletes when Stripe no longer knows the subscription', async () => {
    retrieve.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        code: 'resource_missing',
        message: 'No such subscription',
        type: 'invalid_request_error',
      })
    )

    const res = await DELETE()

    expect(res.status).toBe(200)
    expect(cancel).not.toHaveBeenCalled()
    expect(mockDelete).toHaveBeenCalled()
  })

  it('returns 502 and keeps the account when Stripe fails for another reason', async () => {
    retrieve.mockRejectedValue(new Error('stripe unreachable'))

    const res = await DELETE()

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({
      error: 'We could not cancel your subscription. Please try again or contact support.',
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns 502 for a Stripe invalid request that is not resource_missing', async () => {
    retrieve.mockRejectedValue(
      new Stripe.errors.StripeInvalidRequestError({
        code: 'parameter_invalid_empty',
        message: 'Invalid subscription id',
        type: 'invalid_request_error',
      })
    )

    const res = await DELETE()

    expect(res.status).toBe(502)
    expect(cancel).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns 502 and keeps the account when the cancel call itself fails', async () => {
    retrieve.mockResolvedValue({ status: 'active' })
    cancel.mockRejectedValue(new Error('stripe unreachable'))

    const res = await DELETE()

    expect(res.status).toBe(502)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns 500 when the database throws', async () => {
    mockFindUnique.mockRejectedValue(new Error('db down'))

    const res = await DELETE()

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'An error occurred while deleting your account' })
  })
})
