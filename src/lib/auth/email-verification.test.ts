import { describe, it, expect, vi, afterEach } from 'vitest'
import { skipsEmailVerification } from './email-verification'

describe('skipsEmailVerification', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('skips only when the flag is true outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('SKIP_EMAIL_VERIFICATION', 'true')
    expect(skipsEmailVerification()).toBe(true)

    vi.stubEnv('SKIP_EMAIL_VERIFICATION', 'false')
    expect(skipsEmailVerification()).toBe(false)
  })

  it('never skips in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SKIP_EMAIL_VERIFICATION', 'true')
    expect(skipsEmailVerification()).toBe(false)
  })
})
