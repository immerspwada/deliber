/**
 * useCacheInvalidation - Smart cache invalidation system
 * 
 * Features:
 * - Stale-while-revalidate pattern
 * - Cache versioning
 * - Automatic invalidation on data changes
 * - Background refresh
 */
import { ref, onMounted, onUnmounted } from 'vue'

interface CacheEntry<T> {
  data: T
  timestamp: number
  version: number
  stale: boolean
}

interface CacheConfig {
  ttl?: number // Time to live (ms)
  staleTime?: number // Time before marking as stale (ms)
  version?: number // Cache version
}

const CACHE_VERSION = 1 // Increment to invalidate all caches
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
const DEFAULT_STALE_TIME = 2 * 60 * 1000 // 2 minutes

export function useCacheInvalidation() {
  const cacheStore = new Map<string, CacheEntry<any>>()
  const refreshCallbacks = new Map<string, () => Promise<any>>()
  
  /**
   * Get cached data with stale-while-revalidate
   */
  function get<T>(
    key: string,
    config: CacheConfig = {}
  ): { data: T | null; isStale: boolean } {
    const entry = cacheStore.get(key)
    
    if (!entry) {
      return { data: null, isStale: false }
    }
    
    const {
      ttl = DEFAULT_TTL,
      staleTime = DEFAULT_STALE_TIME,
      version = CACHE_VERSION
    } = config
    
    const now = Date.now()
    const age = now - entry.timestamp
    
    // Check version mismatch
    if (entry.version !== version) {
      cacheStore.delete(key)
      return { data: null, isStale: false }
    }
    
    // Check if expired
    if (age > ttl) {
      cacheStore.delete(key)
      return { data: null, isStale: false }
    }
    
    // Check if stale
    const isStale = age > staleTime
    
    // Trigger background refresh if stale
    if (isStale && refreshCallbacks.has(key)) {
      const refresh = refreshCallbacks.get(key)!
      refresh().then(newData => {
        set(key, newData, config)
      }).catch(() => {
        // Keep stale data on error
      })
    }
    
    return { data: entry.data, isStale }
  }
  
  /**
   * Set cache data
   */
  function set<T>(
    key: string,
    data: T,
    config: CacheConfig = {}
  ): void {
    const { version = CACHE_VERSION } = config
    
    cacheStore.set(key, {
      data,
      timestamp: Date.now(),
      version,
      stale: false
    })
  }
  
  /**
   * Register refresh callback for background updates
   */
  function registerRefresh(
    key: string,
    callback: () => Promise<any>
  ): void {
    refreshCallbacks.set(key, callback)
  }
  
  /**
   * Invalidate specific cache key
   */
  function invalidate(key: string): void {
    cacheStore.delete(key)
  }
  
  /**
   * Invalidate cache by pattern
   */
  function invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = []
    
    cacheStore.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => cacheStore.delete(key))
  }
  
  /**
   * Invalidate all caches
   */
  function invalidateAll(): void {
    cacheStore.clear()
    refreshCallbacks.clear()
  }
  
  /**
   * Get cache statistics
   */
  function getStats() {
    const now = Date.now()
    let totalSize = 0
    let staleCount = 0
    let freshCount = 0
    
    cacheStore.forEach(entry => {
      totalSize++
      const age = now - entry.timestamp
      if (age > DEFAULT_STALE_TIME) {
        staleCount++
      } else {
        freshCount++
      }
    })
    
    return {
      totalSize,
      staleCount,
      freshCount,
      hitRate: 0 // TODO: Track hits/misses
    }
  }
  
  /**
   * Cleanup expired entries
   */
  function cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    cacheStore.forEach((entry, key) => {
      const age = now - entry.timestamp
      if (age > DEFAULT_TTL) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => {
      cacheStore.delete(key)
      refreshCallbacks.delete(key)
    })
  }
  
  // Auto cleanup every 5 minutes
  let cleanupInterval: NodeJS.Timeout | null = null
  
  onMounted(() => {
    cleanupInterval = setInterval(cleanup, 5 * 60 * 1000)
  })
  
  onUnmounted(() => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
    }
  })
  
  return {
    get,
    set,
    registerRefresh,
    invalidate,
    invalidatePattern,
    invalidateAll,
    getStats,
    cleanup
  }
}

/**
 * Cache key builders
 */
export const CacheKeys = {
  wallet: (userId: string) => `wallet:${userId}`,
  loyalty: (userId: string) => `loyalty:${userId}`,
  orders: (userId: string) => `orders:${userId}`,
  notifications: (userId: string) => `notifications:${userId}`,
  savedPlaces: (userId: string) => `saved-places:${userId}`,
  recentPlaces: (userId: string) => `recent-places:${userId}`,
  
  // Pattern matchers
  userPattern: (userId: string) => new RegExp(`^.*:${userId}$`),
  allOrders: () => new RegExp(`^orders:.*$`),
  allWallets: () => new RegExp(`^wallet:.*$`)
}
