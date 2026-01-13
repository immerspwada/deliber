/**
 * Map Tile Preloader
 * Preloads map tiles in background for faster map loading
 */

import type { 
  TileCoordinate, 
  PreloadConfig, 
  PreloadProgress 
} from '@/types/map'
import { DEFAULT_PRELOAD_CONFIG } from '@/types/map'
import { getTileCacheManager } from './tileCacheManager'

// Tile URL template (Carto Light)
const TILE_URL_TEMPLATE = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'

/**
 * Convert lat/lng to tile coordinates at a given zoom level
 */
function latLngToTile(lat: number, lng: number, zoom: number): TileCoordinate {
  const n = Math.pow(2, zoom)
  const x = Math.floor((lng + 180) / 360 * n)
  const latRad = lat * Math.PI / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  
  return { x, y, z: zoom }
}

/**
 * Get tiles within a radius of a center point
 */
function getTilesInRadius(
  centerLat: number, 
  centerLng: number, 
  radiusKm: number,
  zoomLevels: number[]
): TileCoordinate[] {
  const tiles: TileCoordinate[] = []
  
  // Approximate degrees per km at equator
  const degPerKm = 1 / 111
  const latDelta = radiusKm * degPerKm
  const lngDelta = radiusKm * degPerKm / Math.cos(centerLat * Math.PI / 180)
  
  for (const zoom of zoomLevels) {
    const centerTile = latLngToTile(centerLat, centerLng, zoom)
    
    // Calculate tile range based on radius
    const minTile = latLngToTile(centerLat + latDelta, centerLng - lngDelta, zoom)
    const maxTile = latLngToTile(centerLat - latDelta, centerLng + lngDelta, zoom)
    
    const minX = Math.min(minTile.x, maxTile.x)
    const maxX = Math.max(minTile.x, maxTile.x)
    const minY = Math.min(minTile.y, maxTile.y)
    const maxY = Math.max(minTile.y, maxTile.y)
    
    // Add center tile first (highest priority)
    tiles.push(centerTile)
    
    // Add surrounding tiles
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (x !== centerTile.x || y !== centerTile.y) {
          tiles.push({ x, y, z: zoom })
        }
      }
    }
  }
  
  return tiles
}

/**
 * Fetch a single tile
 */
async function fetchTile(coord: TileCoordinate): Promise<Blob> {
  const url = TILE_URL_TEMPLATE
    .replace('{z}', coord.z.toString())
    .replace('{x}', coord.x.toString())
    .replace('{y}', coord.y.toString())
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch tile: ${response.status}`)
  }
  
  return response.blob()
}

export class TilePreloader {
  private config: PreloadConfig
  private progress: PreloadProgress
  private abortController: AbortController | null = null
  private isRunning = false

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = { ...DEFAULT_PRELOAD_CONFIG, ...config }
    this.progress = {
      total: 0,
      loaded: 0,
      failed: 0,
      percentage: 0,
      status: 'idle'
    }
  }

  /**
   * Get current progress
   */
  getProgress(): PreloadProgress {
    return { ...this.progress }
  }

  /**
   * Cancel ongoing preload
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.isRunning = false
    this.progress.status = 'cancelled'
  }

  /**
   * Preload tiles around a location
   */
  async preloadArea(
    lat: number, 
    lng: number, 
    radiusKm?: number,
    onProgress?: (progress: PreloadProgress) => void
  ): Promise<PreloadProgress> {
    if (this.isRunning) {
      console.warn('[TilePreloader] Already running, cancelling previous')
      this.cancel()
    }

    this.isRunning = true
    this.abortController = new AbortController()
    
    const cacheManager = getTileCacheManager()
    await cacheManager.init()
    
    // Get tiles to preload
    const radius = radiusKm ?? this.config.radiusKm
    let tiles = getTilesInRadius(lat, lng, radius, this.config.zoomLevels)
    
    // Limit to max tiles
    tiles = tiles.slice(0, this.config.maxTiles)
    
    // Reset progress
    this.progress = {
      total: tiles.length,
      loaded: 0,
      failed: 0,
      percentage: 0,
      status: 'loading'
    }
    
    onProgress?.(this.getProgress())

    // Preload tiles with concurrency limit
    const concurrency = 4
    const queue = [...tiles]
    const inFlight: Promise<void>[] = []

    const processNext = async (): Promise<void> => {
      if (queue.length === 0 || !this.isRunning) return
      
      const coord = queue.shift()!
      
      try {
        // Check if already cached
        const cached = await cacheManager.has(coord)
        if (cached) {
          this.progress.loaded++
        } else {
          // Fetch and cache
          const blob = await fetchTile(coord)
          await cacheManager.put(coord, blob)
          this.progress.loaded++
        }
      } catch (error) {
        this.progress.failed++
        console.warn('[TilePreloader] Failed to load tile:', coord, error)
      }
      
      // Update percentage
      this.progress.percentage = Math.round(
        ((this.progress.loaded + this.progress.failed) / this.progress.total) * 100
      )
      
      onProgress?.(this.getProgress())
      
      // Process next tile
      await processNext()
    }

    // Start concurrent workers
    for (let i = 0; i < concurrency; i++) {
      inFlight.push(processNext())
    }

    await Promise.all(inFlight)
    
    // Enforce cache size limit
    await cacheManager.enforceSizeLimit()
    
    this.isRunning = false
    this.progress.status = 'completed'
    onProgress?.(this.getProgress())
    
    return this.getProgress()
  }

  /**
   * Preload tiles using requestIdleCallback for non-blocking
   */
  preloadAreaIdle(
    lat: number, 
    lng: number, 
    radiusKm?: number,
    onProgress?: (progress: PreloadProgress) => void
  ): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadArea(lat, lng, radiusKm, onProgress)
      }, { timeout: 5000 })
    } else {
      // Fallback for Safari
      setTimeout(() => {
        this.preloadArea(lat, lng, radiusKm, onProgress)
      }, 100)
    }
  }
}

// Singleton instance
let preloaderInstance: TilePreloader | null = null

export function getTilePreloader(config?: Partial<PreloadConfig>): TilePreloader {
  if (!preloaderInstance) {
    preloaderInstance = new TilePreloader(config)
  }
  return preloaderInstance
}
