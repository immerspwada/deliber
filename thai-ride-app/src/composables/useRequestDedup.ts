/**
 * Feature: Request Deduplication
 * ป้องกันการ fetch ซ้ำซ้อนเมื่อ component mount หลายครั้ง
 */

import { ref } from 'vue'

// Store for pending requests
const pendingRequests = new Map<string, Promise<any>>()

// Store for cached results with TTL
const cachedResults = new Map<string, { data: any; timestamp: number; ttl: number }>()

// Default TTL: 30 seconds
const DEFAULT_TTL = 30 * 1000

export function useRequestDedup() {
  const loading = ref(false)

  /**
   * Execute a request with deduplication
   * If the same request is already in flight, return the existing promise
   * If result is cached and not expired, return cached result
   */
  const dedupRequest = async <T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      ttl?: number // Time to live in ms
      forceRefresh?: boolean // Bypass cache
    } = {}
  ): Promise<T> => {
    const { ttl = DEFAULT_TTL, forceRefresh = false } = options

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = cachedResults.get(key)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data as T
      }
    }

    // Check if request is already in flight
    const pending = pendingRequests.get(key)
    if (pending) {
      return pending as Promise<T>
    }

    // Execute new request
    loading.value = true
    const promise = requestFn()
      .then((result) => {
        // Cache the result
        cachedResults.set(key, {
          data: result,
          timestamp: Date.now(),
          ttl
        })
        return result
      })
      .finally(() => {
        // Remove from pending
        pendingRequests.delete(key)
        loading.value = false
      })

    // Store as pending
    pendingRequests.set(key, promise)

    return promise
  }

  /**
   * Invalidate cache for a specific key
   */
  const invalidateCache = (key: string): void => {
    cachedResults.delete(key)
  }

  /**
   * Invalidate all caches matching a pattern
   */
  const invalidateCachePattern = (pattern: string): void => {
    const regex = new RegExp(pattern)
    for (const key of cachedResults.keys()) {
      if (regex.test(key)) {
        cachedResults.delete(key)
      }
    }
  }

  /**
   * Clear all caches
   */
  const clearAllCache = (): void => {
    cachedResults.clear()
  }

  /**
   * Check if a request is currently pending
   */
  const isPending = (key: string): boolean => {
    return pendingRequests.has(key)
  }

  /**
   * Check if result is cached
   */
  const isCached = (key: string): boolean => {
    const cached = cachedResults.get(key)
    if (!cached) return false
    return Date.now() - cached.timestamp < cached.ttl
  }

  /**
   * Get cached result without making request
   */
  const getCached = <T>(key: string): T | null => {
    const cached = cachedResults.get(key)
    if (!cached) return null
    if (Date.now() - cached.timestamp >= cached.ttl) {
      cachedResults.delete(key)
      return null
    }
    return cached.data as T
  }

  return {
    loading,
    dedupRequest,
    invalidateCache,
    invalidateCachePattern,
    clearAllCache,
    isPending,
    isCached,
    getCached
  }
}

// Singleton instance for global deduplication
let globalInstance: ReturnType<typeof useRequestDedup> | null = null

export function useGlobalRequestDedup() {
  if (!globalInstance) {
    globalInstance = useRequestDedup()
  }
  return globalInstance
}

// Request key generators for common operations
export const RequestKeys = {
  savedPlaces: (userId: string) => `saved_places_${userId}`,
  recentPlaces: (userId: string) => `recent_places_${userId}`,
  rideHistory: (userId: string) => `ride_history_${userId}`,
  walletBalance: (userId: string) => `wallet_balance_${userId}`,
  notifications: (userId: string) => `notifications_${userId}`,
  userProfile: (userId: string) => `user_profile_${userId}`,
  nearbyDrivers: (lat: number, lng: number) => `nearby_drivers_${lat.toFixed(3)}_${lng.toFixed(3)}`,
  promoValidation: (code: string, userId: string) => `promo_${code}_${userId}`
}
