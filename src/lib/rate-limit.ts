import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { headers } from 'next/headers'

// Create Redis client (lazy initialization)
let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Upstash Redis is not configured; refusing to run production without rate limiting')
    }
    console.warn('Upstash Redis not configured - rate limiting disabled')
    return null
  }

  redis = new Redis({ url, token })
  return redis
}

type KeyBy = 'ip' | 'ip+id' | 'id'

// Rate limit configurations for different endpoints. failClosed limits protect credentials and
// deny on a Redis error; the rest fail open.
export const rateLimitConfigs = {
  // Login: 5 attempts per 15 minutes per IP and email
  login: {
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'ratelimit:login',
    keyBy: 'ip+id',
    failClosed: true,
  },
  // Register: 3 attempts per hour per IP
  register: {
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'ratelimit:register',
    keyBy: 'ip',
    failClosed: false,
  },
  // Forgot password: 3 attempts per hour per IP
  forgotPassword: {
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'ratelimit:forgot-password',
    keyBy: 'ip',
    failClosed: false,
  },
  // Reset password: 5 attempts per 15 minutes per IP
  resetPassword: {
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'ratelimit:reset-password',
    keyBy: 'ip',
    failClosed: true,
  },
  // Resend verification: 3 attempts per 15 minutes per IP and email
  resendVerification: {
    limiter: Ratelimit.slidingWindow(3, '15 m'),
    prefix: 'ratelimit:resend-verification',
    keyBy: 'ip+id',
    failClosed: false,
  },
  // File upload: 10 uploads per hour per user, regardless of IP
  upload: {
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'ratelimit:upload',
    keyBy: 'id',
    failClosed: false,
  },
  // AI requests: 20 per hour per user, regardless of IP
  ai: {
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: 'ratelimit:ai',
    keyBy: 'id',
    failClosed: false,
  },
} as const satisfies Record<string, { limiter: unknown; prefix: string; keyBy: KeyBy; failClosed: boolean }>

export type RateLimitType = keyof typeof rateLimitConfigs

// One Ratelimit per type so the library's in-memory cache survives between calls.
const limiters = new Map<RateLimitType, Ratelimit>()

function getLimiter(type: RateLimitType, redisClient: Redis): Ratelimit {
  const existing = limiters.get(type)
  if (existing) return existing
  const config = rateLimitConfigs[type]
  const created = new Ratelimit({ redis: redisClient, limiter: config.limiter, prefix: config.prefix })
  limiters.set(type, created)
  return created
}

function buildKey(keyBy: KeyBy, ip: string, identifier?: string): string {
  if (keyBy === 'id' && identifier) return identifier
  if (keyBy === 'ip+id' && identifier) return `${ip}:${identifier}`
  return ip
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number // Unix timestamp when the rate limit resets
  retryAfter: number // Seconds until can retry
}

/**
 * Get the client IP address from headers
 */
export async function getClientIP(): Promise<string> {
  const headersList = await headers()
  // Vercel/production: x-forwarded-for header
  const forwardedFor = headersList.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }
  // Fallback for other proxies
  const realIP = headersList.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  // Development fallback
  return '127.0.0.1'
}

/**
 * Check rate limit for a given type and identifier
 * @param type - The type of rate limit to check
 * @param identifier - Additional identifier (e.g., email) to combine with IP
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(
  type: RateLimitType,
  identifier?: string
): Promise<RateLimitResult> {
  const redisClient = getRedis()

  // Development without Redis: fail open (production throws in getRedis)
  if (!redisClient) {
    return {
      success: true,
      remaining: -1,
      reset: 0,
      retryAfter: 0,
    }
  }

  const config = rateLimitConfigs[type]
  const ip = await getClientIP()
  const key = buildKey(config.keyBy, ip, identifier)

  try {
    const result = await getLimiter(type, redisClient).limit(key)

    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000),
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    if (config.failClosed) {
      return { success: false, remaining: 0, reset: Date.now() + 60_000, retryAfter: 60 }
    }
    return { success: true, remaining: -1, reset: 0, retryAfter: 0 }
  }
}

/**
 * Format retry time for user-friendly message
 */
export function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`
}

/**
 * Create a rate limit error response
 */
export function rateLimitResponse(retryAfter: number) {
  const retryTime = formatRetryTime(retryAfter)
  return new Response(
    JSON.stringify({
      error: `Too many attempts. Please try again in ${retryTime}.`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  )
}
