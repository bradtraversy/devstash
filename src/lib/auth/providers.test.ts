import { describe, it, expect, vi, afterEach } from 'vitest'
import { pickGitHubEmail, requestGitHubProfile } from './providers'

const email = (address: string, primary: boolean, verified: boolean) => ({ email: address, primary, verified })

describe('pickGitHubEmail', () => {
  it('keeps the public profile email', () => {
    expect(pickGitHubEmail('public@example.com', [email('other@example.com', true, true)])).toBe(
      'public@example.com'
    )
  })

  it('prefers the primary verified email', () => {
    const emails = [email('second@example.com', false, true), email('primary@example.com', true, true)]
    expect(pickGitHubEmail(null, emails)).toBe('primary@example.com')
  })

  it('skips an unverified primary for another verified email', () => {
    const emails = [email('victim@example.com', true, false), email('mine@example.com', false, true)]
    expect(pickGitHubEmail(null, emails)).toBe('mine@example.com')
  })

  it('returns null when no email is verified', () => {
    expect(pickGitHubEmail(null, [email('victim@example.com', true, false)])).toBeNull()
    expect(pickGitHubEmail(null, [])).toBeNull()
    expect(pickGitHubEmail(undefined, null)).toBeNull()
  })
})

describe('requestGitHubProfile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(profile: object, emails: object[] | null) {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/user/emails')) {
        return emails ? new Response(JSON.stringify(emails)) : new Response('', { status: 403 })
      }
      return new Response(JSON.stringify(profile))
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('uses the public email without asking for the list', async () => {
    const fetchMock = stubFetch({ id: 1, email: 'public@example.com' }, [])

    const profile = await requestGitHubProfile({ tokens: { access_token: 'token' } })

    expect(profile.email).toBe('public@example.com')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never returns an unverified address from the email list', async () => {
    stubFetch({ id: 1, email: null }, [email('victim@example.com', true, false)])

    const profile = await requestGitHubProfile({ tokens: { access_token: 'token' } })

    expect(profile.email).toBeNull()
    expect(profile.id).toBe(1)
  })

  it('returns a null email when the list cannot be read', async () => {
    stubFetch({ id: 1, email: null }, null)

    expect((await requestGitHubProfile({ tokens: { access_token: 'token' } })).email).toBeNull()
  })
})
