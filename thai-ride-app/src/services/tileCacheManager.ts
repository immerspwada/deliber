/**
 * Tile Cache Manager
 * Manages map tile caching in IndexedDB with LRU eviction
 */

import type { 
  TileCoordinate, 
  CachedTile, 
  CacheStats, 
  CacheConfig 
} from '@/types/map'
import { DEFAULT_CACHE_CONFIG } from '@/types/map'

// IndexedDB wrapper
class TileCacheDB {
  private db: IDBDatabase | null = null
  private readonly config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
  }

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, 1)

      request.onerror = () => reject(request.error)
      
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create tiles store
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false })
        }

        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' })
        }
      }
    })
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  getStore(mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not opened')
    const tx = this.db.transaction(this.config.storeName, mode)
    return tx.objectStore(this.config.storeName)
  }

  getMetadataStore(mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) throw new Error('Database not opened')
    const tx = this.db.transaction('metadata', mode)
    return tx.objectStore('metadata')
  }
}

export class TileCacheManager {
  private db: TileCacheDB
  private config: CacheConfig
  private initialized = false

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
    this.db = new TileCacheDB(this.config)
  }

  /**
   * Initialize the cache manager
   */
  async init(): Promise<void> {
    if (this.initialized) return
    await this.db.open()
    this.initialized = true
  }

  /**
   * Generate cache key from tile coordinates
   */
  private getTileKey(coord: TileCoordinate): string {
    return `${coord.z}/${coord.x}/${coord.y}`
  }

  /**
   * Store a tile in cache
   */
  async put(coord: TileCoordinate, blob: Blob): Promise<void> {
    await this.init()
    
    const key = this.getTileKey(coord)
    const now = Date.now()
    
    const tile: CachedTile = {
      key,
      blob,
      timestamp: now,
      size: blob.size,
      lastAccessed: now
    }

    return new Promise((resolve, reject) => {
      const store = this.db.getStore('readwrite')
      const request = store.put(tile)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get a tile from cache
   */
  async get(coord: TileCoordinate): Promise<Blob | null> {
    await this.init()
    
    const key = this.getTileKey(coord)

    return new Promise((resolve, reject) => {
      const store = this.db.getStore('readwrite')
      const request = store.get(key)
      
      request.onsuccess = () => {
        const tile = request.result as CachedTile | undefined
        
        if (!tile) {
          resolve(null)
          return
        }

        // Check TTL
        const ttlMs = this.config.ttlDays * 24 * 60 * 60 * 1000
        if (Date.now() - tile.timestamp > ttlMs) {
          // Tile expired, delete it
          store.delete(key)
          resolve(null)
          return
        }

        // Update last accessed time for LRU
        tile.lastAccessed = Date.now()
        store.put(tile)
        
        resolve(tile.blob)
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Check if tile exists and is valid
   */
  async has(coord: TileCoordinate): Promise<boolean> {
    const blob = await this.get(coord)
    return blob !== null
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    await this.init()

    return new Promise((resolve, reject) => {
      const store = this.db.getStore('readonly')
      const request = store.openCursor()
      
      let sizeBytes = 0
      let tileCount = 0
      let oldestTimestamp: number | null = null
      let newestTimestamp: number | null = null

      request.onsuccess = () => {
        const cursor = request.result
        
        if (cursor) {
          const tile = cursor.value as CachedTile
          sizeBytes += tile.size
          tileCount++
          
          if (oldestTimestamp === null || tile.timestamp < oldestTimestamp) {
            oldestTimestamp = tile.timestamp
          }
          if (newestTimestamp === null || tile.timestamp > newestTimestamp) {
            newestTimestamp = tile.timestamp
          }
          
          cursor.continue()
        } else {
          resolve({
            sizeBytes,
            sizeMB: Math.round(sizeBytes / (1024 * 1024) * 100) / 100,
            tileCount,
            oldestTile: oldestTimestamp ? new Date(oldestTimestamp) : null,
            newestTile: newestTimestamp ? new Date(newestTimestamp) : null
          })
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Clear all cached tiles
   */
  async clear(): Promise<void> {
    await this.init()

    return new Promise((resolve, reject) => {
      const store = this.db.getStore('readwrite')
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Remove expired tiles
   */
  async pruneExpired(): Promise<number> {
    await this.init()
    
    const ttlMs = this.config.ttlDays * 24 * 60 * 60 * 1000
    const cutoff = Date.now() - ttlMs
    let removed = 0

    return new Promise((resolve, reject) => {
      const store = this.db.getStore('readwrite')
      const index = store.index('timestamp')
      const range = IDBKeyRange.upperBound(cutoff)
      const request = index.openCursor(range)

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          cursor.delete()
          removed++
          cursor.continue()
        } else {
          resolve(removed)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Enforce size limit using LRU eviction
   */
  async enforceSizeLimit(): Promise<number> {
    await this.init()
    
    const stats = await this.getStats()
    const maxBytes = this.config.maxSizeMB * 1024 * 1024
    
    if (stats.sizeBytes <= maxBytes) return 0

    const bytesToRemove = stats.sizeBytes - maxBytes
    let removedBytes = 0
    let removedCount = 0

    return new Promise((resolve, reject) => {
      const store = this.db.getStore('readwrite')
      const index = store.index('lastAccessed')
      const request = index.openCursor()

      request.onsuccess = () => {
        const cursor = request.result
        
        if (cursor && removedBytes < bytesToRemove) {
          const tile = cursor.value as CachedTile
          removedBytes += tile.size
          removedCount++
          cursor.delete()
          cursor.continue()
        } else {
          resolve(removedCount)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all tile keys (for debugging)
   */
  async getAllKeys(): Promise<string[]> {
    await this.init()

    return new Promise((resolve, reject) => {
      const store = this.db.getStore('readonly')
      const request = store.getAllKeys()
      request.onsuccess = () => resolve(request.result as string[])
      request.onerror = () => reject(request.error)
    })
  }
}

// Singleton instance
let cacheManagerInstance: TileCacheManager | null = null

export function getTileCacheManager(config?: Partial<CacheConfig>): TileCacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new TileCacheManager(config)
  }
  return cacheManagerInstance
}
