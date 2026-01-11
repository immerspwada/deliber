/**
 * Composable: useMapPreloader
 * Hook for preloading map tiles based on user context
 */
import { onMounted, watch } from 'vue'
import { 
  initMapTilePreloader, 
  preloadTilesForLocation,
  preloadSavedPlaces,
  getPreloadStats
} from '../utils/mapTilePreloader'

interface UseMapPreloaderOptions {
  /** Auto-initialize on mount */
  autoInit?: boolean
  /** Preload on location change */
  watchLocation?: boolean
}

export function useMapPreloader(options: UseMapPreloaderOptions = {}) {
  const { autoInit = true, watchLocation = true } = options

  /**
   * Initialize preloader
   */
  async function init(): Promise<void> {
    await initMapTilePreloader()
  }

  /**
   * Preload tiles for a specific location
   */
  async function preloadLocation(
    lat: number, 
    lng: number, 
    priority: 'high' | 'low' = 'low'
  ): Promise<number> {
    return preloadTilesForLocation(lat, lng, { priority })
  }

  /**
   * Preload tiles for saved places
   */
  async function preloadPlaces(
    places: Array<{ lat: number; lng: number }>
  ): Promise<void> {
    await preloadSavedPlaces(places)
  }

  /**
   * Get current preload statistics
   */
  function getStats() {
    return getPreloadStats()
  }

  // Auto-initialize on mount
  if (autoInit) {
    onMounted(() => {
      // Delay initialization to not block initial render
      setTimeout(init, 2000)
    })
  }

  return {
    init,
    preloadLocation,
    preloadPlaces,
    getStats
  }
}

/**
 * Preload tiles when destination is selected
 * Use this in ride booking flow
 */
export function useDestinationPreloader() {
  /**
   * Preload tiles around destination when selected
   */
  async function preloadDestination(lat: number, lng: number): Promise<void> {
    // Preload with high priority since user is about to view this area
    await preloadTilesForLocation(lat, lng, {
      zoomLevels: [15, 16],
      radius: 2,
      priority: 'high'
    })
  }

  /**
   * Preload route tiles between pickup and destination
   */
  async function preloadRoute(
    pickup: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<void> {
    // Calculate midpoint
    const midLat = (pickup.lat + destination.lat) / 2
    const midLng = (pickup.lng + destination.lng) / 2

    // Preload pickup, midpoint, and destination
    await Promise.all([
      preloadTilesForLocation(pickup.lat, pickup.lng, {
        zoomLevels: [15, 16],
        radius: 1,
        priority: 'high'
      }),
      preloadTilesForLocation(midLat, midLng, {
        zoomLevels: [14, 15],
        radius: 1,
        priority: 'low'
      }),
      preloadTilesForLocation(destination.lat, destination.lng, {
        zoomLevels: [15, 16],
        radius: 1,
        priority: 'high'
      })
    ])
  }

  return {
    preloadDestination,
    preloadRoute
  }
}
