/**
 * Rate Limiting Middleware for Edge Functions
 * Prevents brute force attacks and API abuse
 */

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (req: Request) => string // Custom key generator
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (consider Redis for production)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Rate limiter middleware
 */
export async function rateLimit(
  req: Request,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now()
  
  // Generate key (IP + endpoint by default)
  const key = config.keyGenerator 
    ? config.keyGenerator(req)
    : `${getClientIP(req)}:${new URL(req.url).pathname}`
  
  // Clean expired entries
  cleanExpiredEntries(now)
  
  // Get current entry
  let entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetTime) {
    // Create new entry
    entry = {
      count: 1,
      resetTime: now + config.windowMs
    }
    rateLimitStore.set(key, entry)
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime
    }
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }
  
  // Increment counter
  entry.count++
  rateLimitStore.set(key, entry)
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  }
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  // Check various headers for real IP
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = req.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback
  return 'unknown'
}

/**
 * Clean expired entries to prevent memory leaks
 */
function cleanExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(
  resetTime: number,
  message = 'Too many requests'
): Response {
  return new Response(
    JSON.stringify({
      error: 'RATE_LIMITED',
      message,
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString()
      }
    }
  )
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  // Strict limits for sensitive operations
  OTP_GENERATION: { windowMs: 60 * 1000, maxRequests: 3 }, // 3 per minute
  OTP_VERIFICATION: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
  WITHDRAWAL_REQUEST: { windowMs: 60 * 1000, maxRequests: 2 }, // 2 per minute
  DOCUMENT_UPLOAD: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  
  // Moderate limits for regular operations
  JOB_MATCHING: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
  JOB_ACCEPTANCE: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute
  
  // Generous limits for frequent operations
  NOTIFICATION_DISPATCH: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
} as const