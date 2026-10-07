import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { updateMany: vi.fn() } },
}))

import { prisma } from '@/lib/prisma'
import { checkOAuthSignIn, onLinkAccount, OAUTH_EMAIL_UNVERIFIED_URL } from './oauth'

const mockUpdateMany = vi.mocked(prisma.user.updateMany)

const google = { provider: 'google' }
const github = { provider: 'github' }
const verifiedGoogle = { email: 'brad@gmail.com', email_verified: true }

const markedVerified = (email: string) => ({
  where: { email, emailVerified: null },
  data: { emailVerified: expect.any(Date), password: null },
})

describe('checkOAuthSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateMany.mockResolvedValue({ count: 0 })
  })

  it('lets a verified Google email through and verifies the matching account before linking', async () => {
    const result = await checkOAuthSignIn({ user: { email: 'brad@gmail.com' }, account: google, profile: verifiedGoogle })

    expect(result).toBe(true)
    expect(mockUpdateMany).toHaveBeenCalledWith(markedVerified('brad@gmail.com'))
  })

  it('rejects a Google email that is not verified', async () => {
    for (const email_verified of [false, null, undefined]) {
      const result = await checkOAuthSignIn({
        user: { email: 'brad@gmail.com' },
        account: google,
        profile: { email: 'brad@gmail.com', email_verified },
      })
      expect(result).toBe(OAUTH_EMAIL_UNVERIFIED_URL)
    }
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('rejects a Google profile without an email', async () => {
    const result = await checkOAuthSignIn({
      user: { email: 'brad@gmail.com' },
      account: google,
      profile: { email_verified: true },
    })

    expect(result).toBe(OAUTH_EMAIL_UNVERIFIED_URL)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('does not verify a returning account whose email differs from the Google address', async () => {
    const result = await checkOAuthSignIn({
      user: { email: 'brad@example.com' },
      account: google,
      profile: verifiedGoogle,
    })

    expect(result).toBe(true)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('stops the sign-in when verifying the account fails', async () => {
    mockUpdateMany.mockRejectedValue(new Error('db down'))

    await expect(
      checkOAuthSignIn({ user: { email: 'brad@gmail.com' }, account: google, profile: verifiedGoogle })
    ).rejects.toThrow('db down')
  })

  it('lets GitHub through when it supplied a verified email', async () => {
    expect(await checkOAuthSignIn({ user: { email: 'brad@example.com' }, account: github })).toBe(true)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('rejects a new GitHub sign-up without a verified email', async () => {
    expect(await checkOAuthSignIn({ user: { email: null }, account: github })).toBe(OAUTH_EMAIL_UNVERIFIED_URL)
  })

  it('leaves credentials sign-in alone', async () => {
    expect(await checkOAuthSignIn({ user: { email: 'brad@example.com' }, account: { provider: 'credentials' } })).toBe(
      true
    )
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})

describe('onLinkAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateMany.mockResolvedValue({ count: 1 })
  })

  it('verifies a new Google user', async () => {
    await onLinkAccount({ user: { email: 'brad@gmail.com' }, account: google, profile: { email: 'brad@gmail.com' } })

    expect(mockUpdateMany).toHaveBeenCalledWith(markedVerified('brad@gmail.com'))
  })

  it('skips Google linked to a signed-in account with another email', async () => {
    await onLinkAccount({ user: { email: 'brad@example.com' }, account: google, profile: { email: 'brad@gmail.com' } })

    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('ignores other providers', async () => {
    await onLinkAccount({ user: { email: 'brad@example.com' }, account: github, profile: { email: 'brad@example.com' } })

    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})
