/**
 * Geocoding composable with multiple provider fallbacks
 * 
 * Providers (in order of preference):
 * 1. Google Maps Geocoding API (if API key configured)
 * 2. Nominatim (OpenStreetMap) - free, but rate limited
 * 3. Photon (Komoot) - free, based on OSM data
 * 4. Coordinates fallback
 */
import { ref } from 'vue'

export interface GeocodeResult {
  name: string
  address: string
  lat: number
  lng: number
  source: 'google' | 'nominatim' | 'photon' | 'coordinates'
}

// API endpoints
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse'
const PHOTON_URL = 'https://photon.komoot.io/reverse'

// Get Google Maps API key from environment
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

// Simple in-memory cache
const geocodeCache = new Map<string, { result: GeocodeResult; expires: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)}_${lng.toFixed(5)}`
}

function getCached(lat: number, lng: number): GeocodeResult | null {
  const key = getCacheKey(lat, lng)
  const cached = geocodeCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.result
  }
  if (cached) geocodeCache.delete(key)
  return null
}

function setCache(lat: number, lng: number, result: GeocodeResult): void {
  const key = getCacheKey(lat, lng)
  geocodeCache.set(key, { result, expires: Date.now() + CACHE_TTL })
}

/**
 * Format coordinates as readable string
 */
function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

/**
 * Google Maps Geocoding API
 */
async function geocodeWithGoogle(lat: number, lng: number): Promise<GeocodeResult | null> {
  if (!GOOGLE_API_KEY) return null
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=th`,
      { signal: controller.signal }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    if (data.status !== 'OK' || !data.results?.[0]) return null
    
    const result = data.results[0]
    const components = result.address_components || []
    
    // Extract meaningful name
    let name = ''
    const route = components.find((c: any) => c.types.includes('route'))
    const sublocality = components.find((c: any) => c.types.includes('sublocality'))
    const locality = components.find((c: any) => c.types.includes('locality'))
    
    if (route) name = route.long_name
    else if (sublocality) name = sublocality.long_name
    else if (locality) name = locality.long_name
    else name = result.formatted_address?.split(',')[0] || formatCoordinates(lat, lng)
    
    return {
      name,
      address: result.formatted_address || name,
      lat,
      lng,
      source: 'google'
    }
  } catch {
    return null
  }
}

/**
 * Nominatim (OpenStreetMap) reverse geocoding
 */
async function geocodeWithNominatim(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(
      `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=th,en`,
      { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'ThaiRideApp/1.0'
        },
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data || data.error) return null
    
    const addr = data.address || {}
    
    // Build meaningful name from address components
    let name = ''
    if (addr.amenity) name = addr.amenity
    else if (addr.shop) name = addr.shop
    else if (addr.building) name = addr.building
    else if (addr.road) {
      name = addr.house_number ? `${addr.house_number} ${addr.road}` : addr.road
    } else if (addr.suburb) name = addr.suburb
    else if (addr.subdistrict) name = addr.subdistrict
    else if (addr.district) name = addr.district
    else name = data.display_name?.split(',')[0] || formatCoordinates(lat, lng)
    
    // Build short address
    const addressParts: string[] = []
    if (name) addressParts.push(name)
    if (addr.suburb && addr.suburb !== name) addressParts.push(addr.suburb)
    else if (addr.subdistrict && addr.subdistrict !== name) addressParts.push(addr.subdistrict)
    if (addr.district) addressParts.push(addr.district)
    
    return {
      name,
      address: addressParts.length > 0 ? addressParts.slice(0, 3).join(', ') : data.display_name || name,
      lat,
      lng,
      source: 'nominatim'
    }
  } catch {
    return null
  }
}

/**
 * Photon (Komoot) reverse geocoding - OSM-based alternative
 */
async function geocodeWithPhoton(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(
      `${PHOTON_URL}?lat=${lat}&lon=${lng}&lang=en`,
      { 
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      }
    )
    
    clearTimeout(timeoutId)
    
    if (!response.ok) return null
    
    const data = await response.json()
    
    if (!data.features?.[0]) return null
    
    const feature = data.features[0]
    const props = feature.properties || {}
    
    // Build name from properties
    let name = props.name || props.street || props.district || props.city || ''
    if (!name) name = formatCoordinates(lat, lng)
    
    // Build address
    const addressParts: string[] = []
    if (props.housenumber && props.street) {
      addressParts.push(`${props.housenumber} ${props.street}`)
    } else if (props.street) {
      addressParts.push(props.street)
    } else if (props.name) {
      addressParts.push(props.name)
    }
    if (props.district) addressParts.push(props.district)
    if (props.city) addressParts.push(props.city)
    
    return {
      name,
      address: addressParts.length > 0 ? addressParts.slice(0, 3).join(', ') : name,
      lat,
      lng,
      source: 'photon'
    }
  } catch {
    return null
  }
}

/**
 * Main reverse geocode function with fallback chain
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  // Check cache first
  const cached = getCached(lat, lng)
  if (cached) return cached
  
  // Fallback result
  const fallback: GeocodeResult = {
    name: formatCoordinates(lat, lng),
    address: formatCoordinates(lat, lng),
    lat,
    lng,
    source: 'coordinates'
  }
  
  // Try providers in order (Photon first since Nominatim is often down)
  const providers = [
    () => geocodeWithGoogle(lat, lng),
    () => geocodeWithPhoton(lat, lng),
    () => geocodeWithNominatim(lat, lng)
  ]
  
  for (const provider of providers) {
    try {
      const result = await provider()
      if (result && result.name !== formatCoordinates(lat, lng)) {
        setCache(lat, lng, result)
        return result
      }
    } catch {
      // Continue to next provider
    }
  }
  
  // Return coordinates as last resort
  return fallback
}

/**
 * Composable for reactive geocoding
 */
export function useGeocode() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastResult = ref<GeocodeResult | null>(null)
  
  async function geocode(lat: number, lng: number): Promise<GeocodeResult> {
    loading.value = true
    error.value = null
    
    try {
      const result = await reverseGeocode(lat, lng)
      lastResult.value = result
      return result
    } catch (e) {
      error.value = 'ไม่สามารถค้นหาที่อยู่ได้'
      return {
        name: formatCoordinates(lat, lng),
        address: formatCoordinates(lat, lng),
        lat,
        lng,
        source: 'coordinates'
      }
    } finally {
      loading.value = false
    }
  }
  
  function clearCache(): void {
    geocodeCache.clear()
  }
  
  return {
    loading,
    error,
    lastResult,
    geocode,
    reverseGeocode,
    clearCache
  }
}

export default useGeocode
