/**
 * Cached Tile Layer for Leaflet
 * Custom tile layer that uses IndexedDB cache for offline support
 */

import L from 'leaflet'
import { getTileCacheManager } from '@/services/tileCacheManager'
import type { TileCoordinate, CachedTileLayerOptions } from '@/types/map'

export class CachedTileLayer extends L.TileLayer {
  private cacheManager = getTileCacheManager()
  private offlineMode = false
  private showOfflineIndicator = true
  private offlineIndicatorEl: HTMLElement | null = null

  constructor(
    urlTemplate: string, 
    options?: L.TileLayerOptions & CachedTileLayerOptions
  ) {
    super(urlTemplate, options)
    
    if (options?.offlineMode !== undefined) {
      this.offlineMode = options.offlineMode
    }
    if (options?.showOfflineIndicator !== undefined) {
      this.showOfflineIndicator = options.showOfflineIndicator
    }

    // Initialize cache manager
    this.cacheManager.init().catch(console.error)

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnlineStatus(true))
    window.addEventListener('offline', () => this.handleOnlineStatus(false))
  }

  /**
   * Handle online/offline status changes
   */
  private handleOnlineStatus(isOnline: boolean): void {
    if (!isOnline) {
      this.setOfflineMode(true)
    }
    this.updateOfflineIndicator()
  }

  /**
   * Enable/disable offline mode
   */
  setOfflineMode(enabled: boolean): void {
    this.offlineMode = enabled
    this.updateOfflineIndicator()
  }

  /**
   * Update offline indicator UI
   */
  private updateOfflineIndicator(): void {
    if (!this.showOfflineIndicator) return

    const map = this._map
    if (!map) return

    const container = map.getContainer()
    
    if (this.offlineMode || !navigator.onLine) {
      if (!this.offlineIndicatorEl) {
        this.offlineIndicatorEl = document.createElement('div')
        this.offlineIndicatorEl.className = 'leaflet-offline-indicator'
        this.offlineIndicatorEl.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
          <span>ออฟไลน์</span>
        `
        this.offlineIndicatorEl.style.cssText = `
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 1000;
          pointer-events: none;
        `
        container.appendChild(this.offlineIndicatorEl)
      }
    } else {
      if (this.offlineIndicatorEl) {
        this.offlineIndicatorEl.remove()
        this.offlineIndicatorEl = null
      }
    }
  }

  /**
   * Override createTile to check cache first
   */
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img')
    
    tile.alt = ''
    tile.setAttribute('role', 'presentation')

    const coord: TileCoordinate = {
      x: coords.x,
      y: coords.y,
      z: coords.z
    }

    // Try to load from cache first
    this.loadTileWithCache(tile, coord, done)

    return tile
  }

  /**
   * Load tile with cache support
   */
  private async loadTileWithCache(
    tile: HTMLImageElement, 
    coord: TileCoordinate, 
    done: L.DoneCallback
  ): Promise<void> {
    try {
      // Check cache first
      const cachedBlob = await this.cacheManager.get(coord)
      
      if (cachedBlob) {
        // Use cached tile
        const url = URL.createObjectURL(cachedBlob)
        tile.onload = () => {
          URL.revokeObjectURL(url)
          done(undefined, tile)
        }
        tile.onerror = () => {
          URL.revokeObjectURL(url)
          // Cache might be corrupted, try network
          this.loadFromNetwork(tile, coord, done)
        }
        tile.src = url
        return
      }

      // Not in cache, check if offline
      if (this.offlineMode || !navigator.onLine) {
        // Show placeholder for missing offline tile
        tile.src = this.createPlaceholderDataUrl()
        done(undefined, tile)
        return
      }

      // Load from network
      await this.loadFromNetwork(tile, coord, done)
      
    } catch (error) {
      console.warn('[CachedTileLayer] Error loading tile:', error)
      tile.src = this.createPlaceholderDataUrl()
      done(undefined, tile)
    }
  }

  /**
   * Load tile from network and cache it
   */
  private async loadFromNetwork(
    tile: HTMLImageElement, 
    coord: TileCoordinate, 
    done: L.DoneCallback
  ): Promise<void> {
    const url = this.getTileUrl(coord as unknown as L.Coords)
    
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const blob = await response.blob()
      
      // Cache the tile
      await this.cacheManager.put(coord, blob)
      
      // Display the tile
      const objectUrl = URL.createObjectURL(blob)
      tile.onload = () => {
        URL.revokeObjectURL(objectUrl)
        done(undefined, tile)
      }
      tile.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        done(new Error('Failed to load tile'), tile)
      }
      tile.src = objectUrl
      
    } catch (error) {
      // Network failed, show placeholder
      tile.src = this.createPlaceholderDataUrl()
      done(undefined, tile)
    }
  }

  /**
   * Create a placeholder data URL for missing tiles
   */
  private createPlaceholderDataUrl(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      // Light gray background
      ctx.fillStyle = '#f0f0f0'
      ctx.fillRect(0, 0, 256, 256)
      
      // Grid pattern
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 1
      for (let i = 0; i < 256; i += 32) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, 256)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(256, i)
        ctx.stroke()
      }
    }
    
    return canvas.toDataURL()
  }

  /**
   * Clean up on remove
   */
  onRemove(map: L.Map): this {
    window.removeEventListener('online', () => this.handleOnlineStatus(true))
    window.removeEventListener('offline', () => this.handleOnlineStatus(false))
    
    if (this.offlineIndicatorEl) {
      this.offlineIndicatorEl.remove()
      this.offlineIndicatorEl = null
    }
    
    return super.onRemove(map)
  }
}

/**
 * Factory function for creating cached tile layer
 */
export function cachedTileLayer(
  urlTemplate: string, 
  options?: L.TileLayerOptions & CachedTileLayerOptions
): CachedTileLayer {
  return new CachedTileLayer(urlTemplate, options)
}
