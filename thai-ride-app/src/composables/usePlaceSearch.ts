import { ref } from 'vue'

export interface PlaceResult {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type: 'poi' | 'address' | 'road'
}

// Nominatim API for OpenStreetMap geocoding (free, no API key needed)
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export function usePlaceSearch() {
  const results = ref<PlaceResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Search places by query
  const searchPlaces = async (query: string, lat?: number, lng?: number): Promise<PlaceResult[]> => {
    if (!query || query.length < 2) {
      results.value = []
      return []
    }

    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '8',
        countrycodes: 'th', // Limit to Thailand
        'accept-language': 'th,en'
      })

      // Add viewbox for nearby search if coordinates provided
      if (lat && lng) {
        const delta = 0.1 // ~10km radius
        params.append('viewbox', `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`)
        params.append('bounded', '0') // Prefer but don't limit to viewbox
      }

      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: {
          'User-Agent': 'GOBEAR/1.0'
        }
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()

      results.value = data.map((item: any) => ({
        id: item.place_id?.toString() || Math.random().toString(),
        name: formatPlaceName(item),
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: getPlaceType(item)
      }))

      return results.value
    } catch (err: any) {
      error.value = err.message
      results.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  // Reverse geocode - get address from coordinates
  const reverseGeocode = async (lat: number, lng: number): Promise<PlaceResult | null> => {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: '1',
        'accept-language': 'th,en'
      })

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params}`,
        {
          headers: {
            'User-Agent': 'ThaiRideApp/1.0'
          }
        }
      )

      if (!response.ok) return null

      const data = await response.json()

      return {
        id: data.place_id?.toString() || Math.random().toString(),
        name: formatPlaceName(data),
        address: data.display_name,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        type: getPlaceType(data)
      }
    } catch {
      return null
    }
  }

  // Format place name from Nominatim response
  const formatPlaceName = (item: any): string => {
    const addr = item.address || {}
    
    // Try to get a meaningful name
    if (item.name && item.name !== item.display_name) {
      return item.name
    }
    
    // Build name from address components
    const parts: string[] = []
    
    if (addr.amenity) parts.push(addr.amenity)
    else if (addr.shop) parts.push(addr.shop)
    else if (addr.building) parts.push(addr.building)
    else if (addr.road) {
      if (addr.house_number) {
        parts.push(`${addr.house_number} ${addr.road}`)
      } else {
        parts.push(addr.road)
      }
    }
    
    if (addr.suburb) parts.push(addr.suburb)
    else if (addr.neighbourhood) parts.push(addr.neighbourhood)
    
    if (addr.subdistrict) parts.push(addr.subdistrict)
    else if (addr.district) parts.push(addr.district)
    
    return parts.length > 0 ? parts.slice(0, 2).join(', ') : item.display_name?.split(',')[0] || 'Unknown'
  }

  // Determine place type
  const getPlaceType = (item: any): 'poi' | 'address' | 'road' => {
    const type = item.type || ''
    const category = item.class || ''
    
    if (['amenity', 'shop', 'tourism', 'leisure'].includes(category)) {
      return 'poi'
    }
    if (['highway', 'road'].includes(category) || type === 'road') {
      return 'road'
    }
    return 'address'
  }

  // Clear results
  const clearResults = () => {
    results.value = []
    error.value = null
  }

  return {
    results,
    loading,
    error,
    searchPlaces,
    reverseGeocode,
    clearResults
  }
}
