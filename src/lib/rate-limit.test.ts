import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { limitMock, ctorMock } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  ctorMock: vi.fn(),
}))

vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow = vi.fn((tokens: number, window: string) => ({ tokens, window }))
    constructor(options: unknown) {
      ctorMock(options)
    }
    limit = limitMock
  }
  return { Ratelimit }
})

vi.mock('@upstash/redis', () => ({
  Redis: class Redis {
    constructor(public options: unknown) {}
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' })),
}))

async function load() {
  vi.resetModules()
  return import('./rate-limit')
}

const ok = { success: true, remaining: 4, reset: Date.now() + 1000, pending: Promise.resolve() }

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token')
    limitMock.mockResolvedValue(ok)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keys per-user limits by identifier alone so a new IP does not reset the budget', async () => {
    const { checkRateLimit } = await load()
    await checkRateLimit('ai', 'user_1')
    await checkRateLimit('upload', 'user_1')
    expect(limitMock).toHaveBeenNthCalledWith(1, 'user_1')
    expect(limitMock).toHaveBeenNthCalledWith(2, 'user_1')
  })

  it('keys login by ip and email, and ip-only limits by the first forwarded address', async () => {
    const { checkRateLimit } = await load()
    await checkRateLimit('login', 'a@b.c')
    await checkRateLimit('register')
    expect(limitMock).toHaveBeenNthCalledWith(1, '203.0.113.9:a@b.c')
    expect(limitMock).toHaveBeenNthCalledWith(2, '203.0.113.9')
  })

  it('constructs one limiter per type and reuses it', async () => {
    const { checkRateLimit } = await load()
    await checkRateLimit('ai', 'u1')
    await checkRateLimit('ai', 'u2')
    await checkRateLimit('login', 'x')
    expect(ctorMock).toHaveBeenCalledTimes(2)
  })

  it('fails closed for login and password reset when Redis errors', async () => {
    const { checkRateLimit } = await load()
    limitMock.mockRejectedValue(new Error('redis down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const login = await checkRateLimit('login', 'a@b.c')
    const reset = await checkRateLimit('resetPassword')
    expect(login.success).toBe(false)
    expect(login.retryAfter).toBeGreaterThan(0)
    expect(reset.success).toBe(false)
  })

  it('fails open for non-credential limits when Redis errors', async () => {
    const { checkRateLimit } = await load()
    limitMock.mockRejectedValue(new Error('redis down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const ai = await checkRateLimit('ai', 'u1')
    expect(ai.success).toBe(true)
  })

  it('fails open with a warning in development when Upstash is not configured', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { checkRateLimit } = await load()
    const result = await checkRateLimit('login', 'a@b.c')
    expect(result.success).toBe(true)
    expect(warn).toHaveBeenCalled()
    expect(limitMock).not.toHaveBeenCalled()
  })

  it('throws in production when Upstash is not configured', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    vi.stubEnv('NODE_ENV', 'production')
    const { checkRateLimit } = await load()
    await expect(checkRateLimit('login', 'a@b.c')).rejects.toThrow(/not configured/)
  })
})
