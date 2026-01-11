/**
 * Centralized Leaflet Loader - Prevents CSS Import Duplication
 * MUNEEF Design System - Performance Optimized
 */

let leafletLoaded = false
let leafletPromise: Promise<typeof import('leaflet')> | null = null

export interface LeafletLoader {
  L: typeof import('leaflet')
  loaded: boolean
}

/**
 * Load Leaflet library and CSS only once
 * Prevents duplicate CSS imports and improves performance
 */
export async function loadLeaflet(): Promise<LeafletLoader> {
  if (leafletLoaded && leafletPromise) {
    const L = await leafletPromise
    return { L: L.default || L, loaded: true }
  }

  if (!leafletPromise) {
    // Import CSS first to ensure styles are loaded
    leafletPromise = import('leaflet/dist/leaflet.css').then(() => {
      return import('leaflet')
    }).then((leafletModule) => {
      leafletLoaded = true
      return leafletModule
    })
  }

  const L = await leafletPromise
  return { L: L.default || L, loaded: true }
}

/**
 * Fix default marker icons for Leaflet
 * Must be called after Leaflet is loaded
 */
export function fixLeafletIcons(L: any): void {
  // Fix default marker icons
  delete (L.Icon.Default.prototype as any)._getIconUrl
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

/**
 * Create optimized Leaflet map instance
 * With MUNEEF design system integration
 */
export function createOptimizedMap(
  container: HTMLElement,
  options: {
    center?: [number, number]
    zoom?: number
    zoomControl?: boolean
    attributionControl?: boolean
  } = {}
): any {
  return new Promise(async (resolve, reject) => {
    try {
      const { L } = await loadLeaflet()
      
      // Fix icons
      fixLeafletIcons(L)
      
      // Create map with optimized settings
      const map = L.map(container, {
        center: options.center || [13.7563, 100.5018], // Bangkok default
        zoom: options.zoom || 13,
        zoomControl: options.zoomControl ?? true,
        attributionControl: options.attributionControl ?? false,
        preferCanvas: true, // Better performance
        renderer: L.canvas(), // Use canvas renderer
        maxZoom: 18,
        minZoom: 8,
        worldCopyJump: true,
        zoomAnimation: false, // Instant response (MUNEEF principle)
        fadeAnimation: false,
        markerZoomAnimation: false,
      })

      // Add optimized tile layer - OpenStreetMap for reliability
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        tileSize: 256,
        crossOrigin: 'anonymous',
      }).addTo(map)

      resolve(map)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Cleanup map instance
 */
export function cleanupMap(map: any): void {
  if (map && typeof map.remove === 'function') {
    map.remove()
  }
}