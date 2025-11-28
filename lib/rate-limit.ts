/**
 * Basic in-memory rate limiter
 * Note: This is per-server instance. For production with multiple servers,
 * consider using a distributed solution like Upstash Redis.
 */

type RateLimitStore = Map<string, { count: number; resetAt: number }>

const stores: Map<string, RateLimitStore> = new Map()

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

const configs = {
  contactRequest: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 per hour
  authAction: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 per 15 min
  publicApi: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
}

/**
 * Get client IP from request headers
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const realIP = req.headers.get("x-real-ip")
  const cfConnectingIP = req.headers.get("cf-connecting-ip") // Cloudflare

  return (
    cfConnectingIP ||
    (forwarded ? forwarded.split(",")[0].trim() : null) ||
    realIP ||
    "unknown"
  )
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  type: keyof typeof configs
): { allowed: boolean; resetAt?: Date; remaining?: number } {
  const config = configs[type]
  const store = stores.get(type) || new Map()
  stores.set(type, store)

  const now = Date.now()
  const record = store.get(identifier)

  // Clean up expired entries periodically (every 1000 checks)
  if (Math.random() < 0.001) {
    for (const [key, value] of store.entries()) {
      if (value.resetAt < now) {
        store.delete(key)
      }
    }
  }

  if (!record || record.resetAt < now) {
    // First request or window expired - allow and start new window
    store.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return { allowed: true, remaining: config.maxRequests - 1 }
  }

  // Within window - check if limit exceeded
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      resetAt: new Date(record.resetAt),
      remaining: 0,
    }
  }

  // Increment and allow
  record.count++
  store.set(identifier, record)

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
  }
}

/**
 * Rate limit middleware helper
 */
export function rateLimit(type: keyof typeof configs) {
  return (req: Request) => {
    const ip = getClientIP(req)
    return checkRateLimit(ip, type)
  }
}
