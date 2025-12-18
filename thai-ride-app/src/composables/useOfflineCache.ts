/**
 * Feature: Offline Mode Cache
 * ใช้ localStorage เก็บข้อมูลสำคัญเพื่อใช้งานแม้ไม่มี internet
 */

import { ref } from 'vue'

// Cache keys
const CACHE_KEYS = {
  SAVED_PLACES: 'gobear_saved_places',
  RECENT_PLACES: 'gobear_recent_places',
  RECENT_TRIPS: 'gobear_recent_trips',
  USER_PROFILE: 'gobear_user_profile',
  WALLET_BALANCE: 'gobear_wallet_balance',
  LAST_SYNC: 'gobear_last_sync'
} as const

// Cache expiry times (in milliseconds)
const CACHE_EXPIRY = {
  SAVED_PLACES: 24 * 60 * 60 * 1000, // 24 hours
  RECENT_PLACES: 12 * 60 * 60 * 1000, // 12 hours
  RECENT_TRIPS: 6 * 60 * 60 * 1000, // 6 hours
  USER_PROFILE: 24 * 60 * 60 * 1000, // 24 hours
  WALLET_BALANCE: 5 * 60 * 1000 // 5 minutes
} as const

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

export function useOfflineCache() {
  const isOnline = ref(navigator.onLine)
  const lastSyncTime = ref<Date | null>(null)

  // Listen to online/offline events
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOnline.value = true
    })
    window.addEventListener('offline', () => {
      isOnline.value = false
    })
  }

  // Generic cache setter
  const setCache = <T>(key: string, data: T, expiryMs: number): void => {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiry: expiryMs
      }
      localStorage.setItem(key, JSON.stringify(entry))
    } catch (err) {
      console.warn('Failed to cache data:', err)
    }
  }

  // Generic cache getter
  const getCache = <T>(key: string): T | null => {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null

      const entry: CacheEntry<T> = JSON.parse(stored)
      const isExpired = Date.now() - entry.timestamp > entry.expiry

      if (isExpired) {
        localStorage.removeItem(key)
        return null
      }

      return entry.data
    } catch {
      return null
    }
  }

  // Clear specific cache
  const clearCache = (key: string): void => {
    localStorage.removeItem(key)
  }

  // Clear all app caches
  const clearAllCache = (): void => {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  // Saved Places
  const cacheSavedPlaces = (places: any[]): void => {
    setCache(CACHE_KEYS.SAVED_PLACES, places, CACHE_EXPIRY.SAVED_PLACES)
  }

  const getCachedSavedPlaces = (): any[] | null => {
    return getCache<any[]>(CACHE_KEYS.SAVED_PLACES)
  }

  // Recent Places
  const cacheRecentPlaces = (places: any[]): void => {
    setCache(CACHE_KEYS.RECENT_PLACES, places, CACHE_EXPIRY.RECENT_PLACES)
  }

  const getCachedRecentPlaces = (): any[] | null => {
    return getCache<any[]>(CACHE_KEYS.RECENT_PLACES)
  }

  // Recent Trips
  const cacheRecentTrips = (trips: any[]): void => {
    setCache(CACHE_KEYS.RECENT_TRIPS, trips, CACHE_EXPIRY.RECENT_TRIPS)
  }

  const getCachedRecentTrips = (): any[] | null => {
    return getCache<any[]>(CACHE_KEYS.RECENT_TRIPS)
  }

  // User Profile
  const cacheUserProfile = (profile: any): void => {
    setCache(CACHE_KEYS.USER_PROFILE, profile, CACHE_EXPIRY.USER_PROFILE)
  }

  const getCachedUserProfile = (): any | null => {
    return getCache<any>(CACHE_KEYS.USER_PROFILE)
  }

  // Wallet Balance
  const cacheWalletBalance = (balance: any): void => {
    setCache(CACHE_KEYS.WALLET_BALANCE, balance, CACHE_EXPIRY.WALLET_BALANCE)
  }

  const getCachedWalletBalance = (): any | null => {
    return getCache<any>(CACHE_KEYS.WALLET_BALANCE)
  }

  // Update last sync time
  const updateLastSync = (): void => {
    const now = new Date()
    lastSyncTime.value = now
    localStorage.setItem(CACHE_KEYS.LAST_SYNC, now.toISOString())
  }

  // Get last sync time
  const getLastSync = (): Date | null => {
    const stored = localStorage.getItem(CACHE_KEYS.LAST_SYNC)
    if (stored) {
      lastSyncTime.value = new Date(stored)
      return lastSyncTime.value
    }
    return null
  }

  // Check if cache is stale
  const isCacheStale = (key: string): boolean => {
    const stored = localStorage.getItem(key)
    if (!stored) return true

    try {
      const entry = JSON.parse(stored)
      return Date.now() - entry.timestamp > entry.expiry
    } catch {
      return true
    }
  }

  // Get cache age in minutes
  const getCacheAge = (key: string): number | null => {
    const stored = localStorage.getItem(key)
    if (!stored) return null

    try {
      const entry = JSON.parse(stored)
      return Math.floor((Date.now() - entry.timestamp) / 60000)
    } catch {
      return null
    }
  }

  // Initialize - load last sync time
  getLastSync()

  return {
    isOnline,
    lastSyncTime,
    // Generic
    setCache,
    getCache,
    clearCache,
    clearAllCache,
    // Specific caches
    cacheSavedPlaces,
    getCachedSavedPlaces,
    cacheRecentPlaces,
    getCachedRecentPlaces,
    cacheRecentTrips,
    getCachedRecentTrips,
    cacheUserProfile,
    getCachedUserProfile,
    cacheWalletBalance,
    getCachedWalletBalance,
    // Sync
    updateLastSync,
    getLastSync,
    isCacheStale,
    getCacheAge,
    // Constants
    CACHE_KEYS
  }
}
