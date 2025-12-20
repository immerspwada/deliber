/**
 * Rate Limiter - Client-side rate limiting
 * Task: Production Readiness
 * 
 * Provides client-side rate limiting to prevent API abuse
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

interface RateLimiterOptions {
  maxRequests: number
  windowMs: number
  onLimitReached?: (endpoint: string) => void
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  maxRequests: 100,
  windowMs: 60000 // 1 minute
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private options: RateLimiterOptions

  constructor(options: Partial<RateLimiterOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    
    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), this.options.windowMs)
  }

  /**
   * Check if request is allowed
   */
  isAllowed(endpoint: string): boolean {
    const now = Date.now()
    const entry = this.limits.get(endpoint)

    if (!entry || now - entry.windowStart >= this.options.windowMs) {
      // New window
      this.limits.set(endpoint, { count: 1, windowStart: now })
      return true
    }

    if (entry.count >= this.options.maxRequests) {
      this.options.onLimitReached?.(endpoint)
      return false
    }

    entry.count++
    return true
  }

  /**
   * Get remaining requests for endpoint
   */
  getRemaining(endpoint: string): number {
    const entry = this.limits.get(endpoint)
    if (!entry) return this.options.maxRequests
    
    const now = Date.now()
    if (now - entry.windowStart >= this.options.windowMs) {
      return this.options.maxRequests
    }
    
    return Math.max(0, this.options.maxRequests - entry.count)
  }

  /**
   * Get time until reset (ms)
   */
  getResetTime(endpoint: string): number {
    const entry = this.limits.get(endpoint)
    if (!entry) return 0
    
    const elapsed = Date.now() - entry.windowStart
    return Math.max(0, this.options.windowMs - elapsed)
  }

  /**
   * Reset limit for endpoint
   */
  reset(endpoint: string): void {
    this.limits.delete(endpoint)
  }

  /**
   * Reset all limits
   */
  resetAll(): void {
    this.limits.clear()
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [endpoint, entry] of this.limits.entries()) {
      if (now - entry.windowStart >= this.options.windowMs) {
        this.limits.delete(endpoint)
      }
    }
  }
}

// Singleton instances for different rate limit tiers
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  onLimitReached: (endpoint) => {
    console.warn(`[RateLimiter] Rate limit reached for: ${endpoint}`)
  }
})

export const authRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60000,
  onLimitReached: (endpoint) => {
    console.warn(`[RateLimiter] Auth rate limit reached for: ${endpoint}`)
  }
})

export const searchRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60000,
  onLimitReached: (endpoint) => {
    console.warn(`[RateLimiter] Search rate limit reached for: ${endpoint}`)
  }
})

/**
 * Rate limit decorator for async functions
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string,
  limiter: RateLimiter = apiRateLimiter
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (!limiter.isAllowed(endpoint)) {
      throw new Error(`Rate limit exceeded for ${endpoint}. Try again in ${Math.ceil(limiter.getResetTime(endpoint) / 1000)}s`)
    }
    return fn(...args)
  }) as T
}

/**
 * Create a rate-limited version of a function
 */
export function createRateLimitedFn<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: Partial<RateLimiterOptions> & { endpoint: string }
): T {
  const limiter = new RateLimiter(options)
  return withRateLimit(fn, options.endpoint, limiter)
}

export { RateLimiter }
