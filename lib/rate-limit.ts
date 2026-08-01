import { LRUCache } from 'lru-cache'

interface RateLimitEntry { count: number; resetAt: number }

const cache = new LRUCache<string, RateLimitEntry>({ max: 10000 })

/**
 * Returns { ok: true } if under limit, { ok: false, retryAfter } if blocked.
 * @param key        Identifier (e.g. IP or email)
 * @param limit      Max attempts in window
 * @param windowMs   Window duration in ms
 */
export function rateLimit(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now   = Date.now()
  const entry = cache.get(key)

  if (!entry || now > entry.resetAt) {
    cache.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  cache.set(key, entry)
  return { ok: true, remaining: limit - entry.count }
}
