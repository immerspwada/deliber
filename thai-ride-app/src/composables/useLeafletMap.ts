import { ref, onUnmounted, type Ref } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix Leaflet default icon issue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

// ============================================
// Offline Map Tile Caching
// ============================================
const TILE_CACHE_NAME = 'thai-ride-map-tiles-v1'
const TILE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

// Initialize tile cache
const initTileCache = async () => {
  if (!('caches' in window)) return null
  try {
    return await caches.open(TILE_CACHE_NAME)
  } catch {
    return null
  }
}

// Custom tile layer with caching
class CachedTileLayer extends L.TileLayer {
  private tileCache: Cache | null = null
  
  async initialize() {
    this.tileCache = await initTileCache()
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img')
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
  const isMapReady = ref(false)
  const mapError = ref<string | null>(null)

  const initMap = (element: HTMLElement, options: MapOptions = {}): L.Map => {
    const center = options.center || { lat: 13.7563, lng: 100.5018 }
    const zoom = options.zoom || 14

    const map = L.map(element, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      attributionControl: true
    })

    // CartoDB Positron (Light) - Uber-style clean map with offline caching
    const tileLayer = new CachedTileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    })
    tileLayer.initialize() // Initialize cache
    tileLayer.addTo(map)

    mapInstance.value = map
    isMapReady.value = true
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
    cleanup
  }
}
