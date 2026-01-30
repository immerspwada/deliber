/**
 * useHistoryCache - Smart Caching System for History
 * 
 * Features:
 * - IndexedDB persistence
 * - Smart invalidation
 * - Offline support
 * - Background sync
 */

import { ref, watch } from 'vue'
import type { RideHistoryItem } from './useRideHistory'

interface CacheEntry {
  data: RideHistoryItem[]
  timestamp: number
  filter?: string
}

const DB_NAME = 'history_cache'
const DB_VERSION = 1
const STORE_NAME = 'history'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useHistoryCache() {
  const db = ref<IDBDatabase | null>(null)
  const isOnline = ref(navigator.onLine)

  // Initialize IndexedDB
  const initDB = async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'filter' })
        }
      }
    })
  }

  // Get cached data
  const getCached = async (filter: string = 'all'): Promise<RideHistoryItem[] | null> => {
    try {
      if (!db.value) {
        db.value = await initDB()
      }

      return new Promise((resolve) => {
        try {
          const transaction = db.value!.transaction([STORE_NAME], 'readonly')
          const store = transaction.objectStore(STORE_NAME)
          const request = store.get(filter)

          request.onsuccess = () => {
            const entry = request.result as CacheEntry | undefined
            
            if (!entry) {
              resolve(null)
              return
            }

            // Check if cache is still valid
            const age = Date.now() - entry.timestamp
            if (age > CACHE_DURATION) {
              resolve(null)
              return
            }

            resolve(entry.data)
          }

          request.onerror = () => {
            console.error('IndexedDB get error:', request.error)
            resolve(null) // Fail silently
          }
        } catch (error) {
          console.error('Transaction error:', error)
          resolve(null) // Fail silently
        }
      })
    } catch (error) {
      console.error('Error getting cached data:', error)
      return null // Fail silently
    }
  }

  // Sanitize data for IndexedDB (remove non-serializable properties)
  const sanitizeData = (data: RideHistoryItem[]): RideHistoryItem[] => {
    return data.map(item => ({
      id: item.id,
      tracking_id: item.tracking_id,
      type: item.type,
      typeName: item.typeName,
      from: item.from,
      to: item.to,
      date: item.date,
      time: item.time,
      fare: item.fare,
      status: item.status,
      rating: item.rating,
      driver_name: item.driver_name,
      driver_tracking_id: item.driver_tracking_id,
      vehicle: item.vehicle,
      created_at: item.created_at
    }))
  }

  // Set cache
  const setCache = async (data: RideHistoryItem[], filter: string = 'all'): Promise<void> => {
    try {
      if (!db.value) {
        db.value = await initDB()
      }

      // Sanitize data to ensure it's serializable
      const sanitizedData = sanitizeData(data)

      const entry: CacheEntry = {
        data: sanitizedData,
        timestamp: Date.now(),
        filter
      }

      return new Promise((resolve, reject) => {
        const transaction = db.value!.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(entry)

        request.onsuccess = () => resolve()
        request.onerror = () => {
          console.error('IndexedDB put error:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('Error setting cache:', error)
      // Don't throw - fail silently for cache operations
    }
  }

  // Clear cache
  const clearCache = async (): Promise<void> => {
    try {
      if (!db.value) {
        db.value = await initDB()
      }

      return new Promise((resolve, reject) => {
        const transaction = db.value!.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  // Clear specific filter cache
  const clearFilterCache = async (filter: string): Promise<void> => {
    try {
      if (!db.value) {
        db.value = await initDB()
      }

      return new Promise((resolve, reject) => {
        const transaction = db.value!.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(filter)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error clearing filter cache:', error)
    }
  }

  // Check if cache is valid
  const isCacheValid = async (filter: string = 'all'): Promise<boolean> => {
    try {
      if (!db.value) {
        db.value = await initDB()
      }

      return new Promise((resolve, reject) => {
        const transaction = db.value!.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(filter)

        request.onsuccess = () => {
          const entry = request.result as CacheEntry | undefined
          
          if (!entry) {
            resolve(false)
            return
          }

          const age = Date.now() - entry.timestamp
          resolve(age <= CACHE_DURATION)
        }

        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Error checking cache validity:', error)
      return false
    }
  }

  // Listen to online/offline events
  window.addEventListener('online', () => {
    isOnline.value = true
  })

  window.addEventListener('offline', () => {
    isOnline.value = false
  })

  return {
    getCached,
    setCache,
    clearCache,
    clearFilterCache,
    isCacheValid,
    isOnline
  }
}
