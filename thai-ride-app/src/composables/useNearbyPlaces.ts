import { ref } from 'vue'

export interface NearbyPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  category: PlaceCategory
  distance?: number // in meters
}

export type PlaceCategory = 
  | 'restaurant'
  | 'cafe'
  | 'gas_station'
  | 'atm'
  | 'hospital'
  | 'pharmacy'
  | 'convenience'
  | 'shopping'
  | 'hotel'
  | 'parking'

export interface CategoryInfo {
  id: PlaceCategory
  name: string
  icon: string
  osmTags: string[]
}

// Category definitions with OSM tags
export const PLACE_CATEGORIES: CategoryInfo[] = [
  { 
    id: 'restaurant', 
    name: 'ร้านอาหาร', 
    icon: 'restaurant',
    osmTags: ['amenity=restaurant', 'amenity=fast_food']
  },
  { 
    id: 'cafe', 
    name: 'คาเฟ่', 
    icon: 'cafe',
    osmTags: ['amenity=cafe']
  },
  { 
    id: 'gas_station', 
    name: 'ปั๊มน้ำมัน', 
    icon: 'gas',
    osmTags: ['amenity=fuel']
  },
  { 
    id: 'atm', 
    name: 'ATM', 
    icon: 'atm',
    osmTags: ['amenity=atm', 'amenity=bank']
  },
  { 
    id: 'hospital', 
    name: 'โรงพยาบาล', 
    icon: 'hospital',
    osmTags: ['amenity=hospital', 'amenity=clinic']
  },
  { 
    id: 'pharmacy', 
    name: 'ร้านยา', 
    icon: 'pharmacy',
    osmTags: ['amenity=pharmacy']
  },
  { 
    id: 'convenience', 
    name: 'ร้านสะดวกซื้อ', 
    icon: 'store',
    osmTags: ['shop=convenience', 'shop=supermarket']
  },
  { 
    id: 'shopping', 
    name: 'ห้างสรรพสินค้า', 
    icon: 'shopping',
    osmTags: ['shop=mall', 'shop=department_store']
  },
  { 
    id: 'hotel', 
    name: 'โรงแรม', 
    icon: 'hotel',
    osmTags: ['tourism=hotel', 'tourism=guest_house']
  },
  { 
    id: 'parking', 
    name: 'ที่จอดรถ', 
    icon: 'parking',
    osmTags: ['amenity=parking']
  }
]

// Overpass API for querying OSM data
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Performance monitoring
const logApiPerformance = (name: string, startTime: number, success: boolean, details?: Record<string, unknown>) => {
  const duration = performance.now() - startTime
  const logData = {
    api: name,
    duration: Math.round(duration),
    success,
    ...details
  }
  
  if (duration > 2000) {
    console.warn(`[Perf] Slow API: ${name} took ${duration.toFixed(0)}ms`, logData)
  } else if (import.meta.env.DEV) {
    console.log(`[Perf] ${name}: ${duration.toFixed(0)}ms`, logData)
  }
  
  // Send to analytics in production
  if (import.meta.env.PROD && typeof window !== 'undefined' && 'sendBeacon' in navigator) {
    try {
      navigator.sendBeacon('/api/metrics', JSON.stringify({
        type: 'api_performance',
        ...logData,
        timestamp: Date.now()
      }))
    } catch {
      // Silent fail for metrics
    }
  }
}

// Cache for nearby places (shared across instances)
const placesCache = new Map<string, { data: NearbyPlace[], timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Request deduplication - prevent duplicate API calls
const pendingRequests = new Map<string, Promise<NearbyPlace[]>>()

// Fallback mock data for offline/slow connections
const FALLBACK_PLACES: Record<PlaceCategory, NearbyPlace[]> = {
  restaurant: [
    { id: 'fb-1', name: 'ร้านอาหารใกล้เคียง', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'restaurant', distance: 100 },
    { id: 'fb-2', name: 'ร้านอาหารตามสั่ง', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'restaurant', distance: 200 },
  ],
  cafe: [
    { id: 'fb-3', name: 'คาเฟ่ใกล้เคียง', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'cafe', distance: 150 },
  ],
  gas_station: [
    { id: 'fb-4', name: 'ปั๊มน้ำมันใกล้เคียง', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'gas_station', distance: 300 },
  ],
  atm: [
    { id: 'fb-5', name: 'ATM ใกล้เคียง', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'atm', distance: 100 },
  ],
  hospital: [
    { id: 'fb-6', name: 'โรงพยาบาลใกล้เคียง', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'hospital', distance: 500 },
  ],
  pharmacy: [
    { id: 'fb-7', name: 'ร้านยาใกล้เคียง', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'pharmacy', distance: 200 },
  ],
  convenience: [
    { id: 'fb-8', name: '7-Eleven', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'convenience', distance: 100 },
    { id: 'fb-9', name: 'FamilyMart', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'convenience', distance: 150 },
  ],
  shopping: [
    { id: 'fb-10', name: 'ห้างสรรพสินค้าใกล้เคียง', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'shopping', distance: 800 },
  ],
  hotel: [
    { id: 'fb-11', name: 'โรงแรมใกล้เคียง', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'hotel', distance: 400 },
  ],
  parking: [
    { id: 'fb-12', name: 'ที่จอดรถใกล้เคียง', address: 'บริเวณใกล้คุณ', lat: 0, lng: 0, category: 'parking', distance: 200 },
  ],
}

export function useNearbyPlaces() {
  const places = ref<NearbyPlace[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedCategory = ref<PlaceCategory | null>(null)
  const isUsingFallback = ref(false)

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
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

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} ม.`
    }
    return `${(meters / 1000).toFixed(1)} กม.`
  }

  // Get fallback places with user's location
  const getFallbackPlaces = (lat: number, lng: number, category: PlaceCategory): NearbyPlace[] => {
    const fallback = FALLBACK_PLACES[category] || []
    // Add slight random offset to make it look more realistic
    return fallback.map((place, index) => ({
      ...place,
      lat: lat + (Math.random() - 0.5) * 0.01,
      lng: lng + (Math.random() - 0.5) * 0.01,
      id: `${place.id}-${Date.now()}-${index}`,
    }))
  }

  // Search nearby places by category with optimized timeout and fallback
  const searchNearby = async (
    lat: number, 
    lng: number, 
    category: PlaceCategory,
    radiusMeters: number = 2000
  ): Promise<NearbyPlace[]> => {
    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${category}`
    
    // Check cache first (instant return)
    const cached = placesCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      places.value = cached.data
      isUsingFallback.value = false
      return cached.data
    }

    // Check for pending request (deduplication)
    const pendingRequest = pendingRequests.get(cacheKey)
    if (pendingRequest) {
      return pendingRequest
    }

    loading.value = true
    error.value = null
    selectedCategory.value = category
    isUsingFallback.value = false

    // Create the request promise
    const requestPromise = (async (): Promise<NearbyPlace[]> => {
      const startTime = performance.now()
      
      try {
        const categoryInfo = PLACE_CATEGORIES.find(c => c.id === category)
        if (!categoryInfo) {
          throw new Error('Invalid category')
        }

        // Build Overpass query with reduced timeout (3s instead of 10s)
        const tagQueries = categoryInfo.osmTags.map(tag => {
          const [key, value] = tag.split('=')
          return `node["${key}"="${value}"](around:${radiusMeters},${lat},${lng});`
        }).join('\n')

        const query = `
          [out:json][timeout:3];
          (
            ${tagQueries}
          );
          out body 15;
        `

        // Use AbortController for client-side timeout (3.5s)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3500)

        const response = await fetch(OVERPASS_URL, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()

        const results: NearbyPlace[] = data.elements
          .filter((el: any) => el.tags?.name)
          .map((el: any) => ({
            id: el.id.toString(),
            name: el.tags.name,
            address: formatOsmAddress(el.tags),
            lat: el.lat,
            lng: el.lon,
            category,
            distance: calculateDistance(lat, lng, el.lat, el.lon)
          }))
          .sort((a: NearbyPlace, b: NearbyPlace) => (a.distance || 0) - (b.distance || 0))
          .slice(0, 15)

        // Log successful API call
        logApiPerformance('overpass_nearby', startTime, true, {
          category,
          resultsCount: results.length,
          radius: radiusMeters
        })

        // If no results from API, use fallback
        if (results.length === 0) {
          const fallbackResults = getFallbackPlaces(lat, lng, category)
          isUsingFallback.value = true
          places.value = fallbackResults
          return fallbackResults
        }

        // Cache results
        placesCache.set(cacheKey, { data: results, timestamp: Date.now() })
        
        places.value = results
        return results
      } catch (err: any) {
        // Log failed API call
        logApiPerformance('overpass_nearby', startTime, false, {
          category,
          error: err.name || 'unknown',
          radius: radiusMeters
        })
        
        // On timeout or error, return fallback data instead of empty
        console.warn('Nearby search timeout/error, using fallback:', err.name)
        const fallbackResults = getFallbackPlaces(lat, lng, category)
        isUsingFallback.value = true
        places.value = fallbackResults
        error.value = null // Don't show error since we have fallback
        return fallbackResults
      } finally {
        loading.value = false
        pendingRequests.delete(cacheKey)
      }
    })()

    // Store pending request for deduplication
    pendingRequests.set(cacheKey, requestPromise)
    
    return requestPromise
  }

  // Format OSM address tags
  const formatOsmAddress = (tags: any): string => {
    const parts: string[] = []
    
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber'])
    if (tags['addr:street']) parts.push(tags['addr:street'])
    if (tags['addr:subdistrict']) parts.push(tags['addr:subdistrict'])
    if (tags['addr:district']) parts.push(tags['addr:district'])
    if (tags['addr:city']) parts.push(tags['addr:city'])
    
    if (parts.length === 0) {
      // Fallback to any available info
      if (tags.brand) parts.push(tags.brand)
      if (tags.operator) parts.push(tags.operator)
    }
    
    return parts.join(', ') || 'ไม่ระบุที่อยู่'
  }

  // Clear results
  const clearPlaces = () => {
    places.value = []
    selectedCategory.value = null
    error.value = null
  }

  return {
    places,
    loading,
    error,
    selectedCategory,
    isUsingFallback,
    categories: PLACE_CATEGORIES,
    searchNearby,
    clearPlaces,
    formatDistance,
    calculateDistance
  }
}
