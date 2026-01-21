/**
 * Map Tile Service Composable
 * Unified interface for map tile caching and preloading
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getTileCacheManager } from '@/services/tileCacheManager'
import { getTilePreloader } from '@/services/mapTilePreloader'
import type { CacheStats, PreloadProgress } from '@/types/map'

export function useMapTileService() {
  // Services
  const cacheManager = getTileCacheManager()
  const preloader = getTilePreloader()

  // State
  const isInitialized = ref(false)
  const isOnline = ref(navigator.onLine)
  const cacheStats = ref<CacheStats | null>(null)
  const preloadProgress = ref<PreloadProgress | null>(null)
  const lastLocation = ref<{ lat: number; lng: number } | null>(null)
  const error = ref<string | null>(null)

  // Computed
  const isOffline = computed(() => !isOnline.value)
  const cacheSizeMB = computed(() => cacheStats.value?.sizeMB ?? 0)
  const tileCount = computed(() => cacheStats.value?.tileCount ?? 0)
  const isPreloading = computed(() => preloadProgress.value?.status === 'loading')

  /**
   * Initialize the service
   */
  async function init(): Promise<void> {
    if (isInitialized.value) return

    try {
      await cacheManager.init()
      await refreshStats()
      isInitialized.value = true
    } catch (e) {
      error.value = 'ไม่สามารถเริ่มต้นระบบแคชได้'
      console.error('[useMapTileService] Init error:', e)
    }
  }

  /**
   * Refresh cache statistics
   */
  async function refreshStats(): Promise<void> {
    try {
      cacheStats.value = await cacheManager.getStats()
    } catch (e) {
      console.error('[useMapTileService] Error refreshing stats:', e)
    }
  }

  /**
   * Preload tiles for a location
   */
  async function preloadForLocation(
    lat: number, 
    lng: number, 
    radiusKm = 2
  ): Promise<void> {
    // Check if location changed significantly (>1km)
    if (lastLocation.value) {
      const distance = calculateDistance(
        lastLocation.value.lat, 
        lastLocation.value.lng, 
        lat, 
        lng
      )
      if (distance < 1) {
        // Location hasn't changed much, skip preload
        return
      }
    }

    lastLocation.value = { lat, lng }

    try {
      await preloader.preloadArea(lat, lng, radiusKm, (progress) => {
        preloadProgress.value = progress
      })
      await refreshStats()
    } catch (e) {
      console.error('[useMapTileService] Preload error:', e)
    }
  }

  /**
   * Preload tiles in background (non-blocking)
   */
  function preloadInBackground(lat: number, lng: number, radiusKm = 2): void {
    preloader.preloadAreaIdle(lat, lng, radiusKm, (progress) => {
      preloadProgress.value = progress
    })
  }

  /**
   * Cancel ongoing preload
   */
  function cancelPreload(): void {
    preloader.cancel()
    preloadProgress.value = null
  }

  /**
   * Clear all cached tiles
   */
  async function clearCache(): Promise<void> {
    try {
      await cacheManager.clear()
      await refreshStats()
    } catch (e) {
      error.value = 'ไม่สามารถลบแคชได้'
      console.error('[useMapTileService] Clear error:', e)
    }
  }

  /**
   * Prune expired tiles
   */
  async function pruneExpired(): Promise<number> {
    try {
      const removed = await cacheManager.pruneExpired()
      await refreshStats()
      return removed
    } catch (e) {
      console.error('[useMapTileService] Prune error:', e)
      return 0
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  function calculateDistance(
    lat1: number, 
    lng1: number, 
    lat2: number, 
    lng2: number
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Handle online/offline events
   */
  function handleOnline(): void {
    isOnline.value = true
  }

  function handleOffline(): void {
    isOnline.value = false
  }

  // Lifecycle
  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    init()
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return {
    // State
    isInitialized,
    isOnline,
    isOffline,
    cacheStats,
    cacheSizeMB,
    tileCount,
    preloadProgress,
    isPreloading,
    error,

    // Methods
    init,
    refreshStats,
    preloadForLocation,
    preloadInBackground,
    cancelPreload,
    clearCache,
    pruneExpired
  }
}

/**
 * Auto-preload composable
 * Automatically preloads tiles when user location changes
 */
export function useAutoPreload(
  locationRef: { value: { lat: number; lng: number } | null }
) {
  const { preloadInBackground, isInitialized } = useMapTileService()

  watch(
    () => locationRef.value,
    (newLocation) => {
      if (newLocation && isInitialized.value) {
        preloadInBackground(newLocation.lat, newLocation.lng)
      }
    },
    { immediate: true }
  )
}
