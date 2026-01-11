/**
 * Enhanced Saved Places Features
 * - Favorite Places Sorting (by usage frequency)
 * - Place Categories
 * - Offline Places Support
 */

import { ref, computed, watch } from 'vue'
import { useOfflineCache } from './useOfflineCache'

// Place Categories
export type PlaceCategory = 
  | 'restaurant' 
  | 'shopping' 
  | 'hospital' 
  | 'school' 
  | 'gym' 
  | 'cafe' 
  | 'bank' 
  | 'gas_station'
  | 'other'

export interface PlaceCategoryInfo {
  id: PlaceCategory
  label: string
  icon: string
  color: string
}

export const PLACE_CATEGORIES: PlaceCategoryInfo[] = [
  { id: 'restaurant', label: 'ร้านอาหาร', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z', color: '#FF5722' },
  { id: 'shopping', label: 'ห้างสรรพสินค้า', icon: 'M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-2.76 0-5-2.24-5-5h2c0 1.66 1.34 3 3 3s3-1.34 3-3h2c0 2.76-2.24 5-5 5z', color: '#E91E63' },
  { id: 'hospital', label: 'โรงพยาบาล', icon: 'M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z', color: '#F44336' },
  { id: 'school', label: 'โรงเรียน/มหาวิทยาลัย', icon: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z', color: '#3F51B5' },
  { id: 'gym', label: 'ฟิตเนส', icon: 'M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29l-1.43-1.43z', color: '#4CAF50' },
  { id: 'cafe', label: 'คาเฟ่', icon: 'M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z', color: '#795548' },
  { id: 'bank', label: 'ธนาคาร', icon: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z', color: '#607D8B' },
  { id: 'gas_station', label: 'ปั๊มน้ำมัน', icon: 'M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5z', color: '#FF9800' },
  { id: 'other', label: 'อื่นๆ', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', color: '#9E9E9E' }
]

// Enhanced Place interface
export interface EnhancedPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  place_type: 'home' | 'work' | 'other'
  category?: PlaceCategory
  use_count: number
  last_used_at?: string
  is_offline_available: boolean
  sort_order?: number
}

// Storage keys
const STORAGE_KEYS = {
  PLACE_USAGE: 'gobear_place_usage',
  PLACE_CATEGORIES: 'gobear_place_categories',
  OFFLINE_PLACES: 'gobear_offline_places',
  SORT_PREFERENCE: 'gobear_places_sort'
}

export type SortOption = 'default' | 'frequency' | 'recent' | 'alphabetical'

export function useSavedPlacesEnhanced() {
  const { isOnline, setCache, getCache } = useOfflineCache()
  
  // State
  const placeUsage = ref<Record<string, number>>({})
  const placeCategories = ref<Record<string, PlaceCategory>>({})
  const offlinePlaces = ref<EnhancedPlace[]>([])
  const sortOption = ref<SortOption>('default')
  const selectedCategory = ref<PlaceCategory | 'all'>('all')

  // Load from localStorage
  const loadFromStorage = () => {
    try {
      const usage = localStorage.getItem(STORAGE_KEYS.PLACE_USAGE)
      if (usage) placeUsage.value = JSON.parse(usage)

      const categories = localStorage.getItem(STORAGE_KEYS.PLACE_CATEGORIES)
      if (categories) placeCategories.value = JSON.parse(categories)

      const offline = localStorage.getItem(STORAGE_KEYS.OFFLINE_PLACES)
      if (offline) offlinePlaces.value = JSON.parse(offline)

      const sort = localStorage.getItem(STORAGE_KEYS.SORT_PREFERENCE)
      if (sort) sortOption.value = sort as SortOption
    } catch (err) {
      console.warn('Failed to load places data from storage:', err)
    }
  }

  // Save to localStorage
  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLACE_USAGE, JSON.stringify(placeUsage.value))
      localStorage.setItem(STORAGE_KEYS.PLACE_CATEGORIES, JSON.stringify(placeCategories.value))
      localStorage.setItem(STORAGE_KEYS.OFFLINE_PLACES, JSON.stringify(offlinePlaces.value))
      localStorage.setItem(STORAGE_KEYS.SORT_PREFERENCE, sortOption.value)
    } catch (err) {
      console.warn('Failed to save places data to storage:', err)
    }
  }

  // Initialize
  loadFromStorage()

  // ============================================
  // Feature 1: Favorite Places Sorting
  // ============================================
  
  // Track place usage
  const trackPlaceUsage = (placeId: string) => {
    placeUsage.value[placeId] = (placeUsage.value[placeId] || 0) + 1
    saveToStorage()
  }

  // Get usage count for a place
  const getUsageCount = (placeId: string): number => {
    return placeUsage.value[placeId] || 0
  }

  // Sort places by different criteria
  const sortPlaces = (places: any[], option: SortOption = sortOption.value): any[] => {
    const sorted = [...places]
    
    switch (option) {
      case 'frequency':
        return sorted.sort((a, b) => {
          const countA = placeUsage.value[a.id] || 0
          const countB = placeUsage.value[b.id] || 0
          return countB - countA
        })
      
      case 'recent':
        return sorted.sort((a, b) => {
          const dateA = a.last_used_at ? new Date(a.last_used_at).getTime() : 0
          const dateB = b.last_used_at ? new Date(b.last_used_at).getTime() : 0
          return dateB - dateA
        })
      
      case 'alphabetical':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'th'))
      
      default:
        return sorted.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    }
  }

  // Set sort option
  const setSortOption = (option: SortOption) => {
    sortOption.value = option
    saveToStorage()
  }

  // Get top used places
  const getTopUsedPlaces = (places: any[], limit = 5): any[] => {
    return sortPlaces(places, 'frequency').slice(0, limit)
  }

  // ============================================
  // Feature 2: Place Categories
  // ============================================
  
  // Set category for a place
  const setPlaceCategory = (placeId: string, category: PlaceCategory) => {
    placeCategories.value[placeId] = category
    saveToStorage()
  }

  // Get category for a place
  const getPlaceCategory = (placeId: string): PlaceCategory => {
    return placeCategories.value[placeId] || 'other'
  }

  // Get category info
  const getCategoryInfo = (category: PlaceCategory): PlaceCategoryInfo | undefined => {
    return PLACE_CATEGORIES.find(c => c.id === category)
  }

  // Filter places by category
  const filterByCategory = (places: any[], category: PlaceCategory | 'all'): any[] => {
    if (category === 'all') return places
    return places.filter(p => getPlaceCategory(p.id) === category)
  }

  // Set selected category filter
  const setSelectedCategory = (category: PlaceCategory | 'all') => {
    selectedCategory.value = category
  }

  // Get places grouped by category
  const getPlacesByCategory = (places: any[]): Record<PlaceCategory, any[]> => {
    const grouped: Record<PlaceCategory, any[]> = {
      restaurant: [],
      shopping: [],
      hospital: [],
      school: [],
      gym: [],
      cafe: [],
      bank: [],
      gas_station: [],
      other: []
    }

    places.forEach(place => {
      const category = getPlaceCategory(place.id)
      grouped[category].push(place)
    })

    return grouped
  }

  // Auto-detect category from place name/address
  const autoDetectCategory = (name: string, address: string): PlaceCategory => {
    const text = `${name} ${address}`.toLowerCase()
    
    if (/ร้านอาหาร|restaurant|อาหาร|ข้าว|ก๋วยเตี๋ยว|ส้มตำ|buffet|บุฟเฟ่ต์/.test(text)) return 'restaurant'
    if (/ห้าง|mall|เซ็นทรัล|โรบินสัน|เทสโก้|บิ๊กซี|โลตัส|shopping/.test(text)) return 'shopping'
    if (/โรงพยาบาล|hospital|คลินิก|clinic|แพทย์/.test(text)) return 'hospital'
    if (/โรงเรียน|มหาวิทยาลัย|school|university|วิทยาลัย/.test(text)) return 'school'
    if (/ฟิตเนส|gym|fitness|ยิม|สระว่ายน้ำ/.test(text)) return 'gym'
    if (/คาเฟ่|cafe|coffee|กาแฟ|starbucks|amazon/.test(text)) return 'cafe'
    if (/ธนาคาร|bank|atm|กสิกร|ไทยพาณิชย์|กรุงเทพ|กรุงไทย/.test(text)) return 'bank'
    if (/ปั๊ม|gas|station|น้ำมัน|ptt|shell|esso|caltex/.test(text)) return 'gas_station'
    
    return 'other'
  }

  // ============================================
  // Feature 3: Offline Places
  // ============================================
  
  // Save place for offline use
  const saveForOffline = (place: any) => {
    const exists = offlinePlaces.value.find(p => p.id === place.id)
    if (!exists) {
      const enhancedPlace: EnhancedPlace = {
        ...place,
        category: getPlaceCategory(place.id),
        use_count: getUsageCount(place.id),
        is_offline_available: true
      }
      offlinePlaces.value.push(enhancedPlace)
      saveToStorage()
    }
  }

  // Remove place from offline
  const removeFromOffline = (placeId: string) => {
    offlinePlaces.value = offlinePlaces.value.filter(p => p.id !== placeId)
    saveToStorage()
  }

  // Check if place is available offline
  const isOfflineAvailable = (placeId: string): boolean => {
    return offlinePlaces.value.some(p => p.id === placeId)
  }

  // Get offline places
  const getOfflinePlaces = (): EnhancedPlace[] => {
    return offlinePlaces.value
  }

  // Sync offline places with server data
  const syncOfflinePlaces = (serverPlaces: any[]) => {
    // Update offline places with latest server data
    offlinePlaces.value = offlinePlaces.value.map(offlinePlace => {
      const serverPlace = serverPlaces.find(p => p.id === offlinePlace.id)
      if (serverPlace) {
        return {
          ...offlinePlace,
          ...serverPlace,
          is_offline_available: true
        }
      }
      return offlinePlace
    })
    saveToStorage()
  }

  // Get places (with offline fallback)
  const getPlacesWithOfflineFallback = (serverPlaces: any[]): any[] => {
    if (isOnline.value && serverPlaces.length > 0) {
      return serverPlaces
    }
    // Return offline places when offline
    return offlinePlaces.value
  }

  // Clear all offline data
  const clearOfflineData = () => {
    offlinePlaces.value = []
    saveToStorage()
  }

  // Get offline storage size (approximate)
  const getOfflineStorageSize = (): string => {
    const data = JSON.stringify(offlinePlaces.value)
    const bytes = new Blob([data]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Watch for changes and auto-save
  watch([placeUsage, placeCategories, offlinePlaces, sortOption], () => {
    saveToStorage()
  }, { deep: true })

  return {
    // State
    placeUsage,
    placeCategories,
    offlinePlaces,
    sortOption,
    selectedCategory,
    isOnline,
    
    // Feature 1: Sorting
    trackPlaceUsage,
    getUsageCount,
    sortPlaces,
    setSortOption,
    getTopUsedPlaces,
    
    // Feature 2: Categories
    setPlaceCategory,
    getPlaceCategory,
    getCategoryInfo,
    filterByCategory,
    setSelectedCategory,
    getPlacesByCategory,
    autoDetectCategory,
    PLACE_CATEGORIES,
    
    // Feature 3: Offline
    saveForOffline,
    removeFromOffline,
    isOfflineAvailable,
    getOfflinePlaces,
    syncOfflinePlaces,
    getPlacesWithOfflineFallback,
    clearOfflineData,
    getOfflineStorageSize
  }
}
