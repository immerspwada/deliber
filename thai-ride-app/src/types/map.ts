/**
 * Map Types for Tile Caching and Preloading
 */

// Tile coordinate for cache key
export interface TileCoordinate {
  x: number
  y: number
  z: number // zoom level
}

// Cache statistics
export interface CacheStats {
  sizeBytes: number
  sizeMB: number
  tileCount: number
  oldestTile: Date | null
  newestTile: Date | null
}

// Cached tile entry in IndexedDB
export interface CachedTile {
  key: string // "z/x/y" format
  blob: Blob
  timestamp: number // Unix timestamp when cached
  size: number // bytes
  lastAccessed: number // For LRU eviction
}

// Preload configuration
export interface PreloadConfig {
  maxTiles: number // default: 50
  zoomLevels: number[] // default: [12, 13, 14, 15, 16]
  radiusKm: number // default: 2
}

// Preload progress tracking
export interface PreloadProgress {
  total: number
  loaded: number
  failed: number
  percentage: number
  status: 'idle' | 'loading' | 'completed' | 'cancelled'
}

// Offline area for download
export interface OfflineArea {
  id: string
  name: string
  center: { lat: number; lng: number }
  radiusKm: number
  downloadedAt: Date
  tileCount: number
  sizeMB: number
}

// Download progress
export interface DownloadProgress {
  status: 'idle' | 'downloading' | 'completed' | 'failed' | 'cancelled'
  total: number
  downloaded: number
  failed: number
  percentage: number
  estimatedSizeMB: number
}

// Cache configuration
export interface CacheConfig {
  maxSizeMB: number // default: 100
  ttlDays: number // default: 7
  dbName: string // default: 'map-tiles-cache'
  storeName: string // default: 'tiles'
}

// Tile layer options
export interface CachedTileLayerOptions {
  offlineMode?: boolean
  showOfflineIndicator?: boolean
  tileSize?: number
  maxZoom?: number
  minZoom?: number
}

// Default configurations
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSizeMB: 100,
  ttlDays: 7,
  dbName: 'map-tiles-cache',
  storeName: 'tiles'
}

export const DEFAULT_PRELOAD_CONFIG: PreloadConfig = {
  maxTiles: 50,
  zoomLevels: [12, 13, 14, 15, 16],
  radiusKm: 2
}

// Tile URL templates
export const TILE_PROVIDERS = {
  carto: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  cartoDark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
} as const

export type TileProvider = keyof typeof TILE_PROVIDERS
