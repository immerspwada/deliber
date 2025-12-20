/**
 * Cache Manager
 * Client-side caching with TTL and LRU eviction
 */

import { logger } from '../utils/logger'

export interface CacheEntry<T> {
  value: T
  expiresAt: number
  accessedAt: number
}

export interface CacheOptions {
  ttl?: number // Time to live in ms
  maxSize?: number // Maximum number of entries
}

const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const DEFAULT_MAX_SIZE = 100

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private maxSize: number
  private defaultTTL: number

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || DEFAULT_MAX_SIZE
    this.defaultTTL = options.ttl || DEFAULT_TTL
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    // Update access time for LRU
    entry.accessedAt = Date.now()
    
    return entry.value as T
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl || this.defaultTTL),
      accessedAt: Date.now()
    })
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now()
    let cleared = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleared++
      }
    }
    
    return cleared
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt
        oldestKey = key
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) return cached
    
    const value = await factory()
    this.set(key, value, ttl)
    return value
  }
}

// Global cache instance
const globalCache = new CacheManager()

// Named caches for different purposes
const caches: Map<string, CacheManager> = new Map()

/**
 * Get or create named cache
 */
export function getCache(name: string, options?: CacheOptions): CacheManager {
  if (!caches.has(name)) {
    caches.set(name, new CacheManager(options))
  }
  return caches.get(name)!
}

/**
 * Get global cache
 */
export function getGlobalCache(): CacheManager {
  return globalCache
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  globalCache.clear()
  caches.forEach(cache => cache.clear())
  logger.info('All caches cleared')
}

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    return globalCache.getOrSet(key, () => fn(...args), ttl)
  }) as T
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  ttl = DEFAULT_TTL
): T {
  const cache = new Map<string, { value: ReturnType<T>; expiresAt: number }>()
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    const cached = cache.get(key)
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value
    }
    
    const result = fn(...args)
    cache.set(key, { value: result, expiresAt: Date.now() + ttl })
    return result
  }) as T
}

export { CacheManager }
export default globalCache
