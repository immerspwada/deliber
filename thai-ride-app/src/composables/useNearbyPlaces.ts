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

// Cache for nearby places
const placesCache = new Map<string, { data: NearbyPlace[], timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useNearbyPlaces() {
  const places = ref<NearbyPlace[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedCategory = ref<PlaceCategory | null>(null)

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

  // Search nearby places by category
  const searchNearby = async (
    lat: number, 
    lng: number, 
    category: PlaceCategory,
    radiusMeters: number = 2000
  ): Promise<NearbyPlace[]> => {
    // Check cache first
    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}_${category}`
    const cached = placesCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      places.value = cached.data
      return cached.data
    }

    loading.value = true
    error.value = null
    selectedCategory.value = category

    try {
      const categoryInfo = PLACE_CATEGORIES.find(c => c.id === category)
      if (!categoryInfo) {
        throw new Error('Invalid category')
      }

      // Build Overpass query
      const tagQueries = categoryInfo.osmTags.map(tag => {
        const [key, value] = tag.split('=')
        return `node["${key}"="${value}"](around:${radiusMeters},${lat},${lng});`
      }).join('\n')

      const query = `
        [out:json][timeout:10];
        (
          ${tagQueries}
        );
        out body 20;
      `

      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

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

      // Cache results
      placesCache.set(cacheKey, { data: results, timestamp: Date.now() })
      
      places.value = results
      return results
    } catch (err: any) {
      console.error('Nearby search error:', err)
      error.value = 'ไม่สามารถค้นหาได้ กรุณาลองใหม่'
      places.value = []
      return []
    } finally {
      loading.value = false
    }
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
    categories: PLACE_CATEGORIES,
    searchNearby,
    clearPlaces,
    formatDistance,
    calculateDistance
  }
}
