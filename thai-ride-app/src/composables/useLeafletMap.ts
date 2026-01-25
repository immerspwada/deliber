import { ref, onUnmounted, type Ref } from 'vue'
import L from 'leaflet'
// Note: Leaflet CSS loaded via CDN in index.html

// Fix default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix Leaflet default icon issue
 
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

// ============================================
// Offline Map Tile Caching
// ============================================
const TILE_CACHE_NAME = 'thai-ride-map-tiles-v2'
const TILE_CACHE_MAX_AGE = 14 * 24 * 60 * 60 * 1000 // 14 days

// Su-ngai Kolok, Narathiwat area bounds
const SUNGAI_KOLOK_BOUNDS = {
  north: 6.0800,
  south: 6.0100,
  east: 101.9800,
  west: 101.9000,
  center: { lat: 6.0285, lng: 101.9658 }
}

// Zoom levels to pre-cache (12-16 for city navigation)
const PRECACHE_ZOOM_LEVELS = [12, 13, 14, 15, 16]

// Initialize tile cache
const initTileCache = async () => {
  if (!('caches' in window)) return null
  try {
    return await caches.open(TILE_CACHE_NAME)
  } catch {
    return null
  }
}

// Pre-cache tiles for Su-ngai Kolok area
export const precacheSungaiKolokTiles = async (
  onProgress?: (progress: number, total: number) => void
) => {
  const cache = await initTileCache()
  if (!cache) return { success: false, cached: 0 }

  const tiles: string[] = []
  const subdomains = ['a', 'b', 'c', 'd']

  // Generate tile URLs for the area
  for (const zoom of PRECACHE_ZOOM_LEVELS) {
    const { minX, maxX, minY, maxY } = latLngToTileRange(
      SUNGAI_KOLOK_BOUNDS.north,
      SUNGAI_KOLOK_BOUNDS.south,
      SUNGAI_KOLOK_BOUNDS.east,
      SUNGAI_KOLOK_BOUNDS.west,
      zoom
    )

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const subdomain = subdomains[(x + y) % subdomains.length]
        const url = `https://${subdomain}.basemaps.cartocdn.com/light_all/${zoom}/${x}/${y}.png`
        tiles.push(url)
      }
    }
  }

  let cached = 0
  const total = tiles.length

  for (const url of tiles) {
    try {
      // Check if already cached
      const existing = await cache.match(url)
      if (!existing) {
        const response = await fetch(url)
        if (response.ok) {
          const blob = await response.blob()
          const responseToCache = new Response(blob, {
            headers: { 'Cache-Time': Date.now().toString() }
          })
          await cache.put(url, responseToCache)
        }
      }
      cached++
      onProgress?.(cached, total)
    } catch {
      // Skip failed tiles
      cached++
    }
  }

  return { success: true, cached, total }
}

// Convert lat/lng bounds to tile coordinates
const latLngToTileRange = (
  north: number,
  south: number,
  east: number,
  west: number,
  zoom: number
) => {
  const n = Math.pow(2, zoom)
  
  const minX = Math.floor(((west + 180) / 360) * n)
  const maxX = Math.floor(((east + 180) / 360) * n)
  
  const minY = Math.floor(
    ((1 - Math.log(Math.tan((north * Math.PI) / 180) + 1 / Math.cos((north * Math.PI) / 180)) / Math.PI) / 2) * n
  )
  const maxY = Math.floor(
    ((1 - Math.log(Math.tan((south * Math.PI) / 180) + 1 / Math.cos((south * Math.PI) / 180)) / Math.PI) / 2) * n
  )
  
  return { minX, maxX, minY, maxY }
}

// Get cache statistics
export const getTileCacheStats = async (): Promise<{ count: number; size: number; sizeFormatted: string }> => {
  const cache = await initTileCache()
  if (!cache) return { count: 0, size: 0, sizeFormatted: '0 B' }
  
  const keys = await cache.keys()
  let totalSize = 0
  
  for (const request of keys) {
    const response = await cache.match(request)
    if (response) {
      const blob = await response.blob()
      totalSize += blob.size
    }
  }
  
  return {
    count: keys.length,
    size: totalSize,
    sizeFormatted: formatBytes(totalSize)
  }
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Check if user is in Su-ngai Kolok area
export const isInSungaiKolokArea = (lat: number, lng: number) => {
  return (
    lat >= SUNGAI_KOLOK_BOUNDS.south &&
    lat <= SUNGAI_KOLOK_BOUNDS.north &&
    lng >= SUNGAI_KOLOK_BOUNDS.west &&
    lng <= SUNGAI_KOLOK_BOUNDS.east
  )
}

// Export bounds for map centering
export const SUNGAI_KOLOK_CENTER = SUNGAI_KOLOK_BOUNDS.center

// Custom tile layer with caching
class CachedTileLayer extends L.TileLayer {
  private tileCache: Cache | null = null
  private cacheInitialized = false
  
  async initializeCache() {
    if (!this.cacheInitialized) {
      this.tileCache = await initTileCache()
      this.cacheInitialized = true
    }
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img')
    
    // Ensure URL template is available
    if (!(this as any)._url) {
      done(new Error('Tile URL not set'), tile)
      return tile
    }
    
    const url = this.getTileUrl(coords)

    tile.alt = ''
    tile.setAttribute('role', 'presentation')

    // Try to load from cache first
    this.loadTileWithCache(url, tile, done)

    return tile
  }

  private async loadTileWithCache(url: string, tile: HTMLImageElement, done: L.DoneCallback) {
    try {
      // Try cache first
      if (this.tileCache) {
        const cachedResponse = await this.tileCache.match(url)
        if (cachedResponse) {
          const blob = await cachedResponse.blob()
          tile.src = URL.createObjectURL(blob)
          tile.onload = () => {
            URL.revokeObjectURL(tile.src)
            done(undefined, tile)
          }
          tile.onerror = () => {
            // Cache hit but failed, try network
            this.loadFromNetwork(url, tile, done)
          }
          return
        }
      }

      // No cache, load from network
      await this.loadFromNetwork(url, tile, done)
    } catch {
      // Fallback to default behavior
      tile.src = url
      tile.onload = () => done(undefined, tile)
      tile.onerror = () => done(new Error('Tile load failed'), tile)
    }
  }

  private async loadFromNetwork(url: string, tile: HTMLImageElement, done: L.DoneCallback) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Network error')

      const blob = await response.blob()
      
      // Cache the tile
      if (this.tileCache) {
        const responseToCache = new Response(blob, {
          headers: { 'Cache-Time': Date.now().toString() }
        })
        this.tileCache.put(url, responseToCache).catch(() => {})
      }

      tile.src = URL.createObjectURL(blob)
      tile.onload = () => {
        URL.revokeObjectURL(tile.src)
        done(undefined, tile)
      }
      tile.onerror = () => done(new Error('Tile load failed'), tile)
    } catch {
      tile.src = url // Fallback
      tile.onload = () => done(undefined, tile)
      tile.onerror = () => done(new Error('Tile load failed'), tile)
    }
  }
}

// Clean old cached tiles
const cleanOldTileCache = async () => {
  if (!('caches' in window)) return
  try {
    const cache = await caches.open(TILE_CACHE_NAME)
    const keys = await cache.keys()
    const now = Date.now()

    for (const request of keys) {
      const response = await cache.match(request)
      if (response) {
        const cacheTime = response.headers.get('Cache-Time')
        if (cacheTime && now - parseInt(cacheTime) > TILE_CACHE_MAX_AGE) {
          await cache.delete(request)
        }
      }
    }
  } catch {
    // Ignore cache cleanup errors
  }
}

// Run cache cleanup on load
cleanOldTileCache()

export interface MapOptions {
  center?: { lat: number; lng: number }
  zoom?: number
}

export interface MarkerOptions {
  position: { lat: number; lng: number }
  title?: string
  icon?: 'pickup' | 'destination' | 'driver'
  draggable?: boolean
}

export interface DirectionsResult {
  distance: number
  duration: number
  coordinates: Array<[number, number]>
}

// Custom icons with effects
const createIcon = (type: 'pickup' | 'destination' | 'driver') => {
  if (type === 'pickup') {
    // Pickup: Animated pulse effect with location pin
    const svgIcon = `
      <div class="pickup-marker">
        <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="pickup-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
            </filter>
          </defs>
          <!-- Pulse rings -->
          <circle cx="24" cy="24" r="20" fill="none" stroke="#22C55E" stroke-width="2" opacity="0.3" class="pulse-ring pulse-ring-1"/>
          <circle cx="24" cy="24" r="14" fill="none" stroke="#22C55E" stroke-width="2" opacity="0.5" class="pulse-ring pulse-ring-2"/>
          <!-- Main circle with gradient -->
          <circle cx="24" cy="24" r="10" fill="#22C55E" filter="url(#pickup-shadow)"/>
          <circle cx="24" cy="24" r="6" fill="#fff"/>
          <circle cx="24" cy="24" r="3" fill="#22C55E"/>
        </svg>
      </div>
      <style>
        .pickup-marker { position: relative; }
        .pickup-marker.bounce { animation: marker-drop 0.4s ease-out; }
        .pulse-ring { transform-origin: center; }
        .pulse-ring-1 { animation: pulse-outer 2s ease-out infinite; }
        .pulse-ring-2 { animation: pulse-inner 2s ease-out infinite 0.3s; }
        @keyframes pulse-outer {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes pulse-inner {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes marker-drop {
          0% { transform: translateY(-30px) scale(0.8); opacity: 0; }
          60% { transform: translateY(5px) scale(1.05); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      </style>
    `
    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker pickup-icon',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24]
    })
  }

  if (type === 'destination') {
    // Destination: Pin marker with bounce effect
    const svgIcon = `
      <div class="destination-marker">
        <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="dest-shadow" x="-50%" y="-20%" width="200%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.35"/>
            </filter>
            <linearGradient id="pin-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#FF3B30"/>
              <stop offset="100%" style="stop-color:#C41E14"/>
            </linearGradient>
          </defs>
          <!-- Shadow ellipse -->
          <ellipse cx="18" cy="46" rx="6" ry="2" fill="#000" opacity="0.2"/>
          <!-- Pin body -->
          <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" 
                fill="url(#pin-gradient)" filter="url(#dest-shadow)"/>
          <!-- Inner circle -->
          <circle cx="18" cy="18" r="8" fill="#fff"/>
          <!-- Flag icon inside -->
          <path d="M15 12v12M15 12l6 3-6 3" stroke="#EF4444" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <style>
        .destination-marker { animation: bounce-in 0.5s ease-out; }
        @keyframes bounce-in {
          0% { transform: translateY(-20px) scale(0.8); opacity: 0; }
          60% { transform: translateY(5px) scale(1.05); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      </style>
    `
    return L.divIcon({
      html: svgIcon,
      className: 'custom-marker destination-icon',
      iconSize: [36, 48],
      iconAnchor: [18, 48],
      popupAnchor: [0, -48]
    })
  }

  // Driver: Car icon with rotation capability
  const svgIcon = `
    <div class="driver-marker">
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="driver-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
          </filter>
        </defs>
        <!-- Background circle -->
        <circle cx="20" cy="20" r="18" fill="#000" filter="url(#driver-shadow)"/>
        <!-- Car icon -->
        <g transform="translate(8, 10)">
          <path d="M4 12h16M6 12V8a2 2 0 012-2h8a2 2 0 012 2v4M6 12v4h2v-2h8v2h2v-4" 
                stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <circle cx="7" cy="14" r="2" fill="#fff"/>
          <circle cx="17" cy="14" r="2" fill="#fff"/>
        </g>
      </svg>
    </div>
    <style>
      .driver-marker { transition: transform 0.3s ease; }
    </style>
  `
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker driver-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  })
}

export function useLeafletMap() {
  const mapInstance: Ref<L.Map | null> = ref(null)
  const markers: Ref<L.Marker[]> = ref([])
  const routeLine: Ref<L.Polyline | null> = ref(null)
  const animatedRouteLine: Ref<L.Polyline | null> = ref(null)
  const isMapReady = ref(false)
  const mapError = ref<string | null>(null)
  let routeAnimationFrame: number | null = null

  const initMap = (element: HTMLElement, options: MapOptions = {}): L.Map => {
    const center = options.center || { lat: 13.7563, lng: 100.5018 }
    const zoom = options.zoom || 14

    console.log('[MapView] 🚀 Initializing map at:', center, 'zoom:', zoom)

    // Create map instance
    const map = L.map(element, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: false, // Use SVG for better compatibility
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true
    })

    console.log('[MapView] 📦 Map instance created')

    // Create tile layer with proper configuration
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: ['a', 'b', 'c'],
      maxZoom: 19,
      minZoom: 1,
      tileSize: 256,
      updateWhenIdle: false,
      updateWhenZooming: true,
      keepBuffer: 2,
      className: 'osm-tiles',
      // CRITICAL: Prevent tile loading issues
      errorTileUrl: '', // Don't show error tiles
      detectRetina: false // Disable retina detection to prevent scaling issues
    })

    // Track tile loading
    let tilesLoading = 0
    let tilesLoaded = 0
    let tilesFailed = 0

    tileLayer.on('loading', () => {
      console.log('[MapView] 🔄 Tile layer started loading')
      tilesLoading = 0
      tilesLoaded = 0
      tilesFailed = 0
    })

    tileLayer.on('tileloadstart', () => {
      tilesLoading++
      console.log('[MapView] 📥 Tile load started (total loading:', tilesLoading, ')')
    })

    tileLayer.on('tileload', (e) => {
      tilesLoaded++
      console.log('[MapView] ✅ Tile loaded:', e.coords, '(total loaded:', tilesLoaded, ')')
    })

    tileLayer.on('tileerror', (error) => {
      tilesFailed++
      console.error('[MapView] ❌ Tile load error:', {
        coords: error.coords,
        url: (error.tile as HTMLImageElement)?.src,
        total_failed: tilesFailed
      })
    })

    tileLayer.on('load', () => {
      console.log('[MapView] ✅ All tiles loaded successfully!', {
        loaded: tilesLoaded,
        failed: tilesFailed
      })
      
      // Force map to recalculate size and redraw
      setTimeout(() => {
        if (map) {
          map.invalidateSize({ pan: false })
          console.log('[MapView] 🔄 Map size invalidated and redrawn')
          
          // CRITICAL: Force tile pane to be visible
          const container = map.getContainer()
          const tilePane = container.querySelector('.leaflet-tile-pane') as HTMLElement
          if (tilePane) {
            tilePane.style.opacity = '1'
            tilePane.style.visibility = 'visible'
            tilePane.style.zIndex = '200'
            console.log('[MapView] 🎨 Tile pane visibility forced')
          }
          
          // Force all tile containers to be visible
          const tileContainers = container.querySelectorAll('.leaflet-tile-container') as NodeListOf<HTMLElement>
          tileContainers.forEach((container, index) => {
            container.style.opacity = '1'
            container.style.visibility = 'visible'
            console.log(`[MapView] 🎨 Tile container ${index} visibility forced`)
          })
        }
      }, 100)
    })

    // Add tile layer to map
    tileLayer.addTo(map)
    console.log('[MapView] 📍 Tile layer added to map')

    // Check if tiles are actually visible after a delay
    setTimeout(() => {
      const container = map.getContainer()
      const tilePane = container.querySelector('.leaflet-tile-pane')
      const tiles = tilePane?.querySelectorAll('img.leaflet-tile')
      
      console.log('[MapView] 🔍 Tile check:', {
        container_exists: !!container,
        tile_pane_exists: !!tilePane,
        tile_count: tiles?.length || 0,
        tile_pane_styles: tilePane ? {
          opacity: window.getComputedStyle(tilePane).opacity,
          visibility: window.getComputedStyle(tilePane).visibility,
          display: window.getComputedStyle(tilePane).display,
          zIndex: window.getComputedStyle(tilePane).zIndex
        } : null
      })

      if (tiles && tiles.length > 0) {
        const firstTile = tiles[0] as HTMLImageElement
        console.log('[MapView] 🖼️ First tile details:', {
          src: firstTile.src,
          complete: firstTile.complete,
          naturalWidth: firstTile.naturalWidth,
          naturalHeight: firstTile.naturalHeight,
          width: firstTile.width,
          height: firstTile.height,
          opacity: window.getComputedStyle(firstTile).opacity,
          visibility: window.getComputedStyle(firstTile).visibility
        })
      } else {
        console.warn('[MapView] ⚠️ No tiles found in DOM!')
      }
    }, 1000)

    mapInstance.value = map
    isMapReady.value = true
    
    console.log('[MapView] ✅ Map initialization complete, isMapReady:', isMapReady.value)
    
    return map
  }

  const addMarker = (options: MarkerOptions): L.Marker | null => {
    if (!mapInstance.value) return null

    const icon = options.icon ? createIcon(options.icon) : undefined

    const marker = L.marker([options.position.lat, options.position.lng], {
      icon,
      draggable: options.draggable ?? false,
      title: options.title,
      zIndexOffset: options.icon === 'pickup' ? 1000 : options.icon === 'destination' ? 900 : 800
    }).addTo(mapInstance.value)

    if (options.title) {
      marker.bindPopup(options.title)
    }

    markers.value.push(marker)
    return marker
  }

  const clearMarkers = () => {
    markers.value.forEach((m) => m.remove())
    markers.value = []
  }

  const setCenter = (lat: number, lng: number, zoom?: number) => {
    if (!mapInstance.value) return
    mapInstance.value.setView([lat, lng], zoom || mapInstance.value.getZoom())
  }

  const fitBounds = (locations: Array<{ lat: number; lng: number }>) => {
    if (!mapInstance.value || locations.length === 0) return

    const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng] as L.LatLngTuple))
    mapInstance.value.fitBounds(bounds, { padding: [50, 50] })
  }

  // Get route using OSRM (FREE routing service)
  const getDirections = async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<DirectionsResult | null> => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`

      const response = await fetch(url)
      const data = await response.json()

      if (data.code !== 'Ok' || !data.routes[0]) {
        return null
      }

      const route = data.routes[0]
      const coordinates = route.geometry.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
      )

      // Draw route on map
      if (mapInstance.value) {
        if (routeLine.value) {
          routeLine.value.remove()
        }

        routeLine.value = L.polyline(coordinates, {
          color: '#000000',
          weight: 4,
          opacity: 0.8
        }).addTo(mapInstance.value)

        // Fit map to route
        mapInstance.value.fitBounds(routeLine.value.getBounds(), { padding: [50, 50] })
      }

      return {
        distance: route.distance / 1000, // km
        duration: Math.ceil(route.duration / 60), // minutes
        coordinates
      }
    } catch (err) {
      console.error('Routing error:', err)
      return null
    }
  }

  const clearDirections = () => {
    if (routeLine.value) {
      routeLine.value.remove()
      routeLine.value = null
    }
    if (animatedRouteLine.value) {
      animatedRouteLine.value.remove()
      animatedRouteLine.value = null
    }
    if (routeAnimationFrame) {
      cancelAnimationFrame(routeAnimationFrame)
      routeAnimationFrame = null
    }
  }

  // Animate route drawing from driver to destination
  const animateRoute = (
    coordinates: Array<[number, number]>,
    options: { color?: string; duration?: number; onComplete?: () => void } = {}
  ) => {
    if (!mapInstance.value || coordinates.length < 2) return

    const { color = '#000000', duration = 2000, onComplete } = options

    // Clear existing animated route
    if (animatedRouteLine.value) {
      animatedRouteLine.value.remove()
    }
    if (routeAnimationFrame) {
      cancelAnimationFrame(routeAnimationFrame)
    }

    // Create empty polyline
    animatedRouteLine.value = L.polyline([], {
      color,
      weight: 5,
      opacity: 0.9,
      dashArray: '10, 10',
      className: 'animated-route'
    }).addTo(mapInstance.value)

    const totalPoints = coordinates.length
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Calculate how many points to show
      const pointsToShow = Math.floor(progress * totalPoints)
      const currentCoords = coordinates.slice(0, pointsToShow + 1)
      
      if (animatedRouteLine.value && currentCoords.length > 0) {
        animatedRouteLine.value.setLatLngs(currentCoords)
      }

      if (progress < 1) {
        routeAnimationFrame = requestAnimationFrame(animate)
      } else {
        // Animation complete - make line solid
        if (animatedRouteLine.value) {
          animatedRouteLine.value.setStyle({ dashArray: undefined })
        }
        onComplete?.()
      }
    }

    routeAnimationFrame = requestAnimationFrame(animate)
  }

  // Draw driver path (trail of where driver has been)
  const drawDriverPath = (
    pathCoordinates: Array<{ lat: number; lng: number }>,
    options: { color?: string; fadeOut?: boolean } = {}
  ) => {
    if (!mapInstance.value || pathCoordinates.length < 2) return null

    const { color = '#22C55E', fadeOut = true } = options
    const coords = pathCoordinates.map(p => [p.lat, p.lng] as [number, number])

    // Create gradient effect by drawing multiple lines with decreasing opacity
    if (fadeOut && coords.length > 5) {
      const segments: L.Polyline[] = []
      const segmentSize = Math.ceil(coords.length / 5)
      
      for (let i = 0; i < 5; i++) {
        const start = i * segmentSize
        const end = Math.min((i + 1) * segmentSize + 1, coords.length)
        const segmentCoords = coords.slice(start, end)
        
        if (segmentCoords.length > 1) {
          const opacity = 0.2 + (i * 0.16) // 0.2 to 1.0
          const segment = L.polyline(segmentCoords, {
            color,
            weight: 3,
            opacity
          }).addTo(mapInstance.value!)
          segments.push(segment)
        }
      }
      
      return segments
    }

    // Simple solid line
    return L.polyline(coords, {
      color,
      weight: 3,
      opacity: 0.8
    }).addTo(mapInstance.value)
  }

  const cleanup = () => {
    clearMarkers()
    clearDirections()
    if (mapInstance.value) {
      mapInstance.value.remove()
      mapInstance.value = null
    }
    isMapReady.value = false
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    mapInstance,
    markers,
    isMapReady,
    mapError,
    initMap,
    addMarker,
    clearMarkers,
    setCenter,
    fitBounds,
    getDirections,
    clearDirections,
    animateRoute,
    drawDriverPath,
    cleanup
  }
}
