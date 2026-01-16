import { ref, computed } from 'vue'
import { useSavedPlaces } from './useSavedPlaces'
import { useRecentPlaces } from './useRecentPlaces'
import { reverseGeocode as reverseGeocodeMulti } from './useGeocode'

export interface PlaceResult {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type: 'poi' | 'address' | 'road'
  source: 'google' | 'nominatim' | 'saved' | 'recent'
  distance?: number // meters from current location
  placeType?: string
  icon?: string
}

export interface UnifiedSearchResult {
  saved: PlaceResult[]
  recent: PlaceResult[]
  search: PlaceResult[]
}

export interface PlaceSearchOptions {
  lat?: number
  lng?: number
  radius?: number // meters, default 50000
  types?: string[]
  language?: string // default 'th'
  includeRecent?: boolean
  includeSaved?: boolean
}

// API URLs
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const GOOGLE_PLACES_URL = 'https://maps.googleapis.com/maps/api/place'

// Cache for search results (5 minutes TTL)
const searchCache = new Map<string, { results: PlaceResult[]; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Get Google Maps API key from environment
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

export function usePlaceSearch() {
  const savedPlacesComposable = useSavedPlaces()
  const recentPlacesComposable = useRecentPlaces()
  
  const results = ref<PlaceResult[]>([])
  const groupedResults = ref<UnifiedSearchResult>({
    saved: [],
    recent: [],
    search: []
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ============================================
  // Distance Calculation
  // ============================================
  
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // ============================================
  // Cache Operations
  // ============================================
  
  function getCacheKey(query: string, lat?: number, lng?: number): string {
    return `${query.toLowerCase()}_${lat?.toFixed(2) || ''}_${lng?.toFixed(2) || ''}`
  }

  function getCachedResults(query: string, lat?: number, lng?: number): PlaceResult[] | null {
    const key = getCacheKey(query, lat, lng)
    const cached = searchCache.get(key)
    
    if (cached && cached.expires > Date.now()) {
      return cached.results
    }
    
    // Clean up expired entry
    if (cached) {
      searchCache.delete(key)
    }
    
    return null
  }

  function setCachedResults(query: string, lat: number | undefined, lng: number | undefined, results: PlaceResult[]): void {
    const key = getCacheKey(query, lat, lng)
    searchCache.set(key, {
      results,
      expires: Date.now() + CACHE_TTL
    })
  }

  // ============================================
  // Google Places API Search
  // ============================================
  
  async function searchGooglePlaces(
    query: string,
    options: PlaceSearchOptions = {}
  ): Promise<PlaceResult[]> {
    if (!GOOGLE_API_KEY) {
      throw new Error('Google API key not configured')
    }

    const { lat, lng, radius = 50000, language = 'th' } = options
    
    const params = new URLSearchParams({
      input: query,
      key: GOOGLE_API_KEY,
      language,
      components: 'country:th'
    })

    if (lat && lng) {
      params.append('location', `${lat},${lng}`)
      params.append('radius', radius.toString())
    }

    const response = await fetch(
      `${GOOGLE_PLACES_URL}/autocomplete/json?${params}`
    )

    if (!response.ok) {
      throw new Error('Google Places search failed')
    }

    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(data.error_message || 'Google Places API error')
    }

    // Get place details for each prediction
    const places: PlaceResult[] = []
    
    for (const prediction of (data.predictions || []).slice(0, 5)) {
      try {
        const details = await getGooglePlaceDetails(prediction.place_id)
        if (details) {
          places.push({
            ...details,
            source: 'google',
            distance: lat && lng ? calculateDistance(lat, lng, details.lat, details.lng) : undefined
          })
        }
      } catch {
        // Skip failed place details
      }
    }

    return places
  }

  async function getGooglePlaceDetails(placeId: string): Promise<PlaceResult | null> {
    if (!GOOGLE_API_KEY) return null

    const params = new URLSearchParams({
      place_id: placeId,
      key: GOOGLE_API_KEY,
      fields: 'place_id,name,formatted_address,geometry,types',
      language: 'th'
    })

    const response = await fetch(
      `${GOOGLE_PLACES_URL}/details/json?${params}`
    )

    if (!response.ok) return null

    const data = await response.json()
    
    if (data.status !== 'OK' || !data.result) return null

    const result = data.result
    return {
      id: result.place_id,
      name: result.name || result.formatted_address?.split(',')[0] || 'Unknown',
      address: result.formatted_address || '',
      lat: result.geometry?.location?.lat || 0,
      lng: result.geometry?.location?.lng || 0,
      type: getPlaceTypeFromGoogle(result.types || []),
      source: 'google'
    }
  }

  function getPlaceTypeFromGoogle(types: string[]): 'poi' | 'address' | 'road' {
    const poiTypes = ['restaurant', 'cafe', 'store', 'shopping_mall', 'hospital', 'school', 'bank', 'gas_station', 'airport', 'train_station', 'bus_station']
    const roadTypes = ['route', 'street_address']
    
    if (types.some(t => poiTypes.includes(t))) return 'poi'
    if (types.some(t => roadTypes.includes(t))) return 'road'
    return 'address'
  }

  // ============================================
  // Nominatim Search (Fallback)
  // ============================================
  
  async function searchNominatim(
    query: string,
    options: PlaceSearchOptions = {}
  ): Promise<PlaceResult[]> {
    const { lat, lng } = options
    
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '8',
      countrycodes: 'th',
      'accept-language': 'th,en'
    })

    if (lat && lng) {
      const delta = 0.1
      params.append('viewbox', `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`)
      params.append('bounded', '0')
    }

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': 'GOBEAR/1.0' }
    })

    if (!response.ok) {
      throw new Error('Nominatim search failed')
    }

    const data = await response.json()

    return data.map((item: any) => ({
      id: item.place_id?.toString() || crypto.randomUUID(),
      name: formatPlaceName(item),
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: getPlaceType(item),
      source: 'nominatim' as const,
      distance: lat && lng ? calculateDistance(lat, lng, parseFloat(item.lat), parseFloat(item.lon)) : undefined
    }))
  }

  // ============================================
  // Unified Search
  // ============================================
  
  async function searchPlaces(
    query: string,
    options: PlaceSearchOptions = {}
  ): Promise<PlaceResult[]> {
    if (!query || query.length < 2) {
      results.value = []
      groupedResults.value = { saved: [], recent: [], search: [] }
      return []
    }

    const { lat, lng, includeRecent = true, includeSaved = true } = options
    
    loading.value = true
    error.value = null

    try {
      const queryLower = query.toLowerCase()
      
      // 1. Search saved places (local, instant)
      let savedMatches: PlaceResult[] = []
      if (includeSaved) {
        savedMatches = savedPlacesComposable.savedPlaces.value
          .filter(p => 
            p.name.toLowerCase().includes(queryLower) ||
            p.address.toLowerCase().includes(queryLower) ||
            (p.customName && p.customName.toLowerCase().includes(queryLower))
          )
          .map(p => ({
            id: p.id,
            name: p.customName || p.name,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
            type: 'address' as const,
            source: 'saved' as const,
            icon: savedPlacesComposable.getPlaceIcon(p.placeType),
            distance: lat && lng ? calculateDistance(lat, lng, p.lat, p.lng) : undefined
          }))
      }

      // 2. Search recent places (local, instant)
      let recentMatches: PlaceResult[] = []
      if (includeRecent) {
        const allRecent = [
          ...recentPlacesComposable.recentPickups.value,
          ...recentPlacesComposable.recentDestinations.value
        ]
        
        recentMatches = allRecent
          .filter(p => 
            p.name.toLowerCase().includes(queryLower) ||
            p.address.toLowerCase().includes(queryLower)
          )
          .map(p => ({
            id: p.id,
            name: p.name,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
            type: 'address' as const,
            source: 'recent' as const,
            distance: lat && lng ? calculateDistance(lat, lng, p.lat, p.lng) : undefined
          }))
          .slice(0, 5)
      }

      // 3. Check cache for external search
      let searchResults = getCachedResults(query, lat, lng)
      
      if (!searchResults) {
        // 4. Try Google Places first, fallback to Nominatim
        try {
          if (GOOGLE_API_KEY) {
            searchResults = await searchGooglePlaces(query, options)
          } else {
            searchResults = await searchNominatim(query, options)
          }
        } catch (googleError) {
          console.warn('[usePlaceSearch] Google Places failed, trying Nominatim:', googleError)
          try {
            searchResults = await searchNominatim(query, options)
          } catch (nominatimError) {
            console.warn('[usePlaceSearch] Nominatim also failed:', nominatimError)
            searchResults = []
          }
        }
        
        // Cache results
        if (searchResults.length > 0) {
          setCachedResults(query, lat, lng, searchResults)
        }
      }

      // 5. Sort each group by distance
      if (lat && lng) {
        savedMatches.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
        recentMatches.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
        searchResults.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
      }

      // 6. Update grouped results
      groupedResults.value = {
        saved: savedMatches,
        recent: recentMatches,
        search: searchResults
      }

      // 7. Combine all results (saved first, then recent, then search)
      results.value = [
        ...savedMatches,
        ...recentMatches,
        ...searchResults
      ]

      return results.value
    } catch (err: any) {
      error.value = err.message || 'ค้นหาไม่สำเร็จ'
      results.value = []
      groupedResults.value = { saved: [], recent: [], search: [] }
      return []
    } finally {
      loading.value = false
    }
  }

  // Legacy search method for backward compatibility
  const searchPlacesLegacy = async (query: string, lat?: number, lng?: number): Promise<PlaceResult[]> => {
    return searchPlaces(query, { lat, lng, includeRecent: false, includeSaved: false })
  }

  // Reverse geocode - get address from coordinates (uses multi-provider fallback)
  const reverseGeocode = async (lat: number, lng: number): Promise<PlaceResult | null> => {
    try {
      const result = await reverseGeocodeMulti(lat, lng)
      return {
        id: crypto.randomUUID(),
        name: result.name,
        address: result.address,
        lat: result.lat,
        lng: result.lng,
        type: 'address',
        source: result.source === 'google' ? 'google' : 'nominatim'
      }
    } catch {
      return null
    }
  }

  // Get place details by ID
  async function getPlaceDetails(placeId: string, source: 'google' | 'nominatim' = 'google'): Promise<PlaceResult | null> {
    if (source === 'google' && GOOGLE_API_KEY) {
      return getGooglePlaceDetails(placeId)
    }
    
    // For nominatim, we don't have a details endpoint, return null
    return null
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
    groupedResults.value = { saved: [], recent: [], search: [] }
    error.value = null
  }

  // Clear cache
  const clearCache = () => {
    searchCache.clear()
  }

  return {
    results,
    groupedResults,
    loading,
    error,
    searchPlaces,
    searchPlacesLegacy,
    reverseGeocode,
    getPlaceDetails,
    clearResults,
    clearCache,
    // Expose for testing
    calculateDistance
  }
}
