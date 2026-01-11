/**
 * Map Tile Preloader
 * Preload map tiles for frequently used areas to improve map loading performance
 * 
 * Features:
 * - Preload tiles for user's current location
 * - Preload tiles for saved places
 * - Preload tiles for popular areas (Bangkok hotspots)
 * - Cache tiles in Service Worker
 * - Smart preloading based on user behavior
 */

// Tile URL template for OpenStreetMap
const TILE_URL_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

// Popular areas in Bangkok (lat, lng, name)
const POPULAR_AREAS: Array<{ lat: number; lng: number; name: string }> = [
  { lat: 13.7563, lng: 100.5018, name: 'Bangkok Center' },
  { lat: 13.7466, lng: 100.5392, name: 'Siam' },
  { lat: 13.7308, lng: 100.5695, name: 'Asoke' },
  { lat: 13.7276, lng: 100.5280, name: 'Silom' },
  { lat: 13.8117, lng: 100.5619, name: 'Chatuchak' },
  { lat: 13.6900, lng: 100.7501, name: 'Suvarnabhumi Airport' },
  { lat: 13.9126, lng: 100.6068, name: 'Don Mueang Airport' }
]

// Zoom levels to preload (14-16 are most commonly used)
const PRELOAD_ZOOM_LEVELS = [14, 15, 16]

// Maximum tiles to preload per session
const MAX_TILES_PER_SESSION = 50

// Cache name for map tiles
const TILE_CACHE_NAME = 'map-tiles-preload'

// Track preloaded tiles to avoid duplicates
const preloadedTiles = new Set<string>()
let tilesPreloadedThisSession = 0

/**
 * Convert lat/lng to tile coordinates
 */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom)
  const x = Math.floor((lng + 180) / 360 * n)
  const latRad = lat * Math.PI / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return { x, y }
}

/**
 * Get tile URL
 */
function getTileUrl(x: number, y: number, z: number): string {
  return TILE_URL_TEMPLATE
    .replace('{z}', z.toString())
    .replace('{x}', x.toString())
    .replace('{y}', y.toString())
}

/**
 * Get surrounding tiles for a location
 */
function getSurroundingTiles(lat: number, lng: number, zoom: number, radius: number = 1): string[] {
  const center = latLngToTile(lat, lng, zoom)
  const tiles: string[] = []
  
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const url = getTileUrl(center.x + dx, center.y + dy, zoom)
      if (!preloadedTiles.has(url)) {
        tiles.push(url)
      }
    }
  }
  
  return tiles
}

/**
 * Preload a single tile
 */
async function preloadTile(url: string): Promise<boolean> {
  if (preloadedTiles.has(url) || tilesPreloadedThisSession >= MAX_TILES_PER_SESSION) {
    return false
  }

  try {
    // Check if already in cache
    const cache = await caches.open(TILE_CACHE_NAME)
    const cached = await cache.match(url)
    
    if (cached) {
      preloadedTiles.add(url)
      return false
    }

    // Fetch and cache
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit'
    })

    if (response.ok) {
      await cache.put(url, response.clone())
      preloadedTiles.add(url)
      tilesPreloadedThisSession++
      return true
    }
    
    return false
  } catch {
    return false
  }
}

/**
 * Preload tiles for a specific location
 */
export async function preloadTilesForLocation(
  lat: number, 
  lng: number, 
  options: { 
    zoomLevels?: number[]
    radius?: number
    priority?: 'high' | 'low'
  } = {}
): Promise<number> {
  const { 
    zoomLevels = PRELOAD_ZOOM_LEVELS, 
    radius = 1,
    priority = 'low'
  } = options

  if (!('caches' in window)) {
    return 0
  }

  const allTiles: string[] = []
  
  for (const zoom of zoomLevels) {
    const tiles = getSurroundingTiles(lat, lng, zoom, radius)
    allTiles.push(...tiles)
  }

  // Limit tiles
  const tilesToPreload = allTiles.slice(0, MAX_TILES_PER_SESSION - tilesPreloadedThisSession)
  
  if (tilesToPreload.length === 0) {
    return 0
  }

  let preloadedCount = 0

  if (priority === 'high') {
    // Preload immediately in parallel (limited concurrency)
    const batchSize = 4
    for (let i = 0; i < tilesToPreload.length; i += batchSize) {
      const batch = tilesToPreload.slice(i, i + batchSize)
      const results = await Promise.all(batch.map(preloadTile))
      preloadedCount += results.filter(Boolean).length
    }
  } else {
    // Preload in background using requestIdleCallback
    for (const url of tilesToPreload) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => {
          const success = await preloadTile(url)
          if (success) preloadedCount++
        }, { timeout: 5000 })
      } else {
        setTimeout(async () => {
          const success = await preloadTile(url)
          if (success) preloadedCount++
        }, 100)
      }
    }
  }

  return preloadedCount
}

/**
 * Preload tiles for popular areas
 */
export async function preloadPopularAreas(): Promise<void> {
  if (!('caches' in window)) return

  // Preload in background with low priority
  for (const area of POPULAR_AREAS) {
    await preloadTilesForLocation(area.lat, area.lng, {
      zoomLevels: [14, 15],
      radius: 1,
      priority: 'low'
    })
    
    // Small delay between areas
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

/**
 * Preload tiles for saved places
 */
export async function preloadSavedPlaces(
  places: Array<{ lat: number; lng: number }>
): Promise<void> {
  if (!('caches' in window) || places.length === 0) return

  // Preload first 5 saved places with higher priority
  const topPlaces = places.slice(0, 5)
  
  for (const place of topPlaces) {
    await preloadTilesForLocation(place.lat, place.lng, {
      zoomLevels: [15, 16],
      radius: 1,
      priority: 'high'
    })
  }
}

/**
 * Preload tiles for current location
 */
export async function preloadCurrentLocation(): Promise<void> {
  if (!('caches' in window) || !navigator.geolocation) return

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000 // 5 minutes
      })
    })

    await preloadTilesForLocation(
      position.coords.latitude,
      position.coords.longitude,
      {
        zoomLevels: [14, 15, 16],
        radius: 2,
        priority: 'high'
      }
    )
  } catch {
    // Fallback to Bangkok center
    await preloadTilesForLocation(13.7563, 100.5018, {
      zoomLevels: [14, 15],
      radius: 1,
      priority: 'low'
    })
  }
}

/**
 * Initialize map tile preloading
 * Call this on app startup
 */
export async function initMapTilePreloader(): Promise<void> {
  if (!('caches' in window)) {
    console.log('[MapTilePreloader] Cache API not available')
    return
  }

  // Wait for idle time before preloading
  if ('requestIdleCallback' in window) {
    requestIdleCallback(async () => {
      console.log('[MapTilePreloader] Starting background preload...')
      
      // Preload current location first (high priority)
      await preloadCurrentLocation()
      
      // Then preload popular areas (low priority)
      await preloadPopularAreas()
      
      console.log(`[MapTilePreloader] Preloaded ${tilesPreloadedThisSession} tiles`)
    }, { timeout: 10000 })
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(async () => {
      await preloadCurrentLocation()
      await preloadPopularAreas()
    }, 3000)
  }
}

/**
 * Get preload statistics
 */
export function getPreloadStats(): { 
  preloadedCount: number
  sessionCount: number
  maxPerSession: number
} {
  return {
    preloadedCount: preloadedTiles.size,
    sessionCount: tilesPreloadedThisSession,
    maxPerSession: MAX_TILES_PER_SESSION
  }
}

/**
 * Clear preload cache
 */
export async function clearPreloadCache(): Promise<void> {
  if ('caches' in window) {
    await caches.delete(TILE_CACHE_NAME)
    preloadedTiles.clear()
    tilesPreloadedThisSession = 0
  }
}
