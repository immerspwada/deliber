import { ref, computed } from 'vue'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useRideStore } from '../stores/ride'
import { useOfflineCache } from './useOfflineCache'

export interface SavedPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  place_type: 'home' | 'work' | 'other'
  sort_order?: number
}

export interface RecentPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  last_used_at: string
}

export interface PromoValidation {
  is_valid: boolean
  discount_amount: number
  message: string
  promo_id: string | null
}

export interface DriverInfo {
  id: string
  name: string
  rating: number
  trips: number
  vehicle: string
  color: string
  plate: string
  photo?: string
  eta: number
  lat: number
  lng: number
}

// Helper function to save place to localStorage (for demo mode)
const savePlaceToLocalStorage = (place: Omit<SavedPlace, 'id'>): SavedPlace => {
  const STORAGE_KEY = 'demo_saved_places'
  const existingPlaces: SavedPlace[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  
  // Remove existing place of same type (home/work)
  const filteredPlaces = existingPlaces.filter(p => 
    place.place_type === 'other' || p.place_type !== place.place_type
  )
  
  const newPlace: SavedPlace = {
    ...place,
    id: 'demo-place-' + Date.now()
  }
  
  filteredPlaces.push(newPlace)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredPlaces))
  
  console.log('savePlaceToLocalStorage: Saved', newPlace)
  return newPlace
}

// Helper function to get places from localStorage (for demo mode)
const getPlacesFromLocalStorage = (): SavedPlace[] => {
  const STORAGE_KEY = 'demo_saved_places'
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
}

// Helper function to delete place from localStorage (for demo mode)
const deletePlaceFromLocalStorage = (id: string): boolean => {
  const STORAGE_KEY = 'demo_saved_places'
  const existingPlaces: SavedPlace[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  const filteredPlaces = existingPlaces.filter(p => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredPlaces))
  return true
}

// Helper function to save recent place to localStorage (for demo mode)
const saveRecentPlaceToLocalStorage = (place: { name: string; address: string; lat: number; lng: number }): RecentPlace => {
  const STORAGE_KEY = 'demo_recent_places'
  const existingPlaces: RecentPlace[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  
  // Check if place already exists (by address)
  const existingIndex = existingPlaces.findIndex(p => p.address === place.address)
  
  const newPlace: RecentPlace = {
    id: existingIndex >= 0 ? existingPlaces[existingIndex].id : 'demo-recent-' + Date.now(),
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    last_used_at: new Date().toISOString()
  }
  
  // Remove existing if found
  if (existingIndex >= 0) {
    existingPlaces.splice(existingIndex, 1)
  }
  
  // Add to beginning (most recent first)
  existingPlaces.unshift(newPlace)
  
  // Keep only last 20 places
  const trimmedPlaces = existingPlaces.slice(0, 20)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedPlaces))
  
  console.log('saveRecentPlaceToLocalStorage: Saved', newPlace)
  return newPlace
}

// Helper function to get recent places from localStorage (for demo mode)
const getRecentPlacesFromLocalStorage = (): RecentPlace[] => {
  const STORAGE_KEY = 'demo_recent_places'
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
}

export function useServices() {
  const authStore = useAuthStore()
  const rideStore = useRideStore()
  const { cacheSavedPlaces, getCachedSavedPlaces, cacheRecentPlaces, getCachedRecentPlaces, isOnline, updateLastSync } = useOfflineCache()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const savedPlaces = ref<SavedPlace[]>([])
  const recentPlaces = ref<RecentPlace[]>([])

  // Current driver from ride store
  const currentDriver = computed<DriverInfo | null>(() => {
    if (!rideStore.matchedDriver) return null
    const d = rideStore.matchedDriver
    return {
      id: d.id,
      name: d.name,
      rating: d.rating,
      trips: d.total_trips,
      vehicle: d.vehicle_type,
      color: d.vehicle_color,
      plate: d.vehicle_plate,
      photo: d.avatar_url,
      eta: d.eta,
      lat: d.current_lat,
      lng: d.current_lng
    }
  })

  // Current ride ID from ride store
  const currentRideId = computed(() => rideStore.currentRide?.id || null)

  // Initialize - restore active ride
  const initialize = async () => {
    if (authStore.user?.id) {
      await rideStore.initialize(authStore.user.id)
    }
  }

  // Fetch saved places with network error handling, timeout, caching and deduplication
  const fetchSavedPlaces = async (forceRefresh = false) => {
    if (!authStore.user?.id) return []

    // Check if demo mode - get from localStorage
    const isDemoMode = localStorage.getItem('demo_mode') === 'true'
    if (isDemoMode || authStore.user.id.startsWith('user-')) {
      console.log('fetchSavedPlaces: Demo mode - loading from localStorage')
      const demoPlaces = getPlacesFromLocalStorage()
      savedPlaces.value = demoPlaces
      return demoPlaces
    }

    // Try offline cache first (always check cache first for speed)
    const cached = getCachedSavedPlaces()
    if (cached && !forceRefresh) {
      savedPlaces.value = cached
      // Return cached immediately, refresh in background if online
      if (isOnline.value) {
        refreshSavedPlacesInBackground()
      }
      return cached
    }

    // No cache or force refresh - fetch from server with simple timeout
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500) // 2.5s timeout

      const { data, error: fetchError } = await (supabase
        .from('saved_places') as any)
        .select('*')
        .eq('user_id', authStore.user!.id)
        .order('place_type', { ascending: true })
        .order('sort_order', { ascending: true })
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (fetchError) throw fetchError
      
      const result = data || []
      savedPlaces.value = result
      cacheSavedPlaces(result)
      updateLastSync()
      return result
    } catch (err: any) {
      console.warn('Error fetching saved places:', err.message)
      // Return cached data as fallback
      if (cached) {
        savedPlaces.value = cached
        return cached
      }
      return savedPlaces.value
    }
  }

  // Background refresh for saved places
  const refreshSavedPlacesInBackground = async () => {
    try {
      const { data } = await (supabase
        .from('saved_places') as any)
        .select('*')
        .eq('user_id', authStore.user!.id)
        .order('place_type', { ascending: true })
        .order('sort_order', { ascending: true })

      if (data) {
        savedPlaces.value = data
        cacheSavedPlaces(data)
      }
    } catch {
      // Silent fail for background refresh
    }
  }

  // Fetch recent places with timeout protection and caching
  const fetchRecentPlaces = async (limit = 10, forceRefresh = false) => {
    if (!authStore.user?.id) return []

    // Check if demo mode - get from localStorage
    const isDemoMode = localStorage.getItem('demo_mode') === 'true'
    if (isDemoMode || authStore.user.id.startsWith('user-')) {
      console.log('fetchRecentPlaces: Demo mode - loading from localStorage')
      const demoPlaces = getRecentPlacesFromLocalStorage()
      recentPlaces.value = demoPlaces.slice(0, limit)
      return recentPlaces.value
    }

    // Try cache first for speed
    const cached = getCachedRecentPlaces()
    if (cached && !forceRefresh) {
      recentPlaces.value = cached.slice(0, limit)
      // Refresh in background if online
      if (isOnline.value) {
        refreshRecentPlacesInBackground(limit)
      }
      return recentPlaces.value
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500) // 2.5s timeout

      // Select specific columns to handle schema differences
      // The trigger will sync name/place_name and last_used_at/last_visited_at
      const { data, error: fetchError } = await (supabase
        .from('recent_places') as any)
        .select('id, name, address, lat, lng, search_count, last_used_at')
        .eq('user_id', authStore.user!.id)
        .order('last_used_at', { ascending: false })
        .limit(limit)
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (fetchError) throw fetchError
      
      // Map data to ensure consistent format
      const result = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name || item.place_name || 'สถานที่ล่าสุด',
        address: item.address,
        lat: item.lat,
        lng: item.lng,
        last_used_at: item.last_used_at || item.last_visited_at
      }))
      
      recentPlaces.value = result
      cacheRecentPlaces(result)
      return result
    } catch (err: any) {
      // Don't log AbortError - it's expected when navigating away
      if (err.name !== 'AbortError') {
        console.warn('Error fetching recent places:', err.message)
      }
      if (cached) {
        recentPlaces.value = cached.slice(0, limit)
        return recentPlaces.value
      }
      return recentPlaces.value
    }
  }

  // Background refresh for recent places
  const refreshRecentPlacesInBackground = async (limit: number) => {
    try {
      const { data } = await (supabase
        .from('recent_places') as any)
        .select('id, name, address, lat, lng, search_count, last_used_at')
        .eq('user_id', authStore.user!.id)
        .order('last_used_at', { ascending: false })
        .limit(limit)

      if (data) {
        // Map data to ensure consistent format
        const result = data.map((item: any) => ({
          id: item.id,
          name: item.name || item.place_name || 'สถานที่ล่าสุด',
          address: item.address,
          lat: item.lat,
          lng: item.lng,
          last_used_at: item.last_used_at || item.last_visited_at
        }))
        recentPlaces.value = result
        cacheRecentPlaces(result)
      }
    } catch {
      // Silent fail for background refresh
    }
  }

  // Add to recent places (production-ready)
  const addRecentPlace = async (place: { name: string; address: string; lat: number; lng: number }) => {
    if (!authStore.user?.id) return

    // Check if demo mode - save to localStorage
    const isDemoMode = localStorage.getItem('demo_mode') === 'true'
    if (isDemoMode || authStore.user.id.startsWith('user-')) {
      console.log('addRecentPlace: Demo mode - saving to localStorage')
      saveRecentPlaceToLocalStorage(place)
      await fetchRecentPlaces(10, true)
      return
    }

    try {
      // Try using the RPC function first (more reliable)
      const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)('add_or_update_recent_place', {
        p_user_id: authStore.user.id,
        p_name: place.name,
        p_address: place.address,
        p_lat: place.lat,
        p_lng: place.lng
      })

      if (rpcError) {
        console.warn('RPC add_or_update_recent_place failed, falling back to direct insert:', rpcError.message)
        
        // Fallback: Direct insert/update
        const { data: existing } = await (supabase
          .from('recent_places') as any)
          .select('id, search_count')
          .eq('user_id', authStore.user.id)
          .eq('name', place.name)
          .single()

        if (existing) {
          await (supabase
            .from('recent_places') as any)
            .update({
              search_count: (existing.search_count || 1) + 1,
              last_used_at: new Date().toISOString()
            })
            .eq('id', existing.id)
        } else {
          await (supabase.from('recent_places') as any).insert({
            user_id: authStore.user.id,
            name: place.name,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            search_count: 1,
            last_used_at: new Date().toISOString()
          })
        }
      }

      // Refresh recent places list
      await fetchRecentPlaces(10, true)
    } catch (err: any) {
      console.error('addRecentPlace error:', err.message)
      // Don't set error.value - this is a non-critical operation
    }
  }

  // Save a place with retry logic
  const savePlace = async (place: Omit<SavedPlace, 'id'>, retryCount = 0): Promise<any> => {
    const MAX_RETRIES = 2
    
    if (!authStore.user?.id) {
      console.warn('savePlace: No user logged in')
      error.value = 'กรุณาเข้าสู่ระบบก่อน'
      return null
    }

    console.log('savePlace: Starting with user_id:', authStore.user.id)
    console.log('savePlace: Place data:', place)
    
    // Check if demo mode - save to localStorage instead
    const isDemoMode = localStorage.getItem('demo_mode') === 'true'
    if (isDemoMode || authStore.user.id.startsWith('user-')) {
      console.log('savePlace: Demo mode - saving to localStorage')
      return savePlaceToLocalStorage(place)
    }
    
    // Check Supabase configuration
    if (!isSupabaseConfigured) {
      console.error('savePlace: Supabase not configured')
      error.value = 'ระบบยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแล'
      return null
    }

    try {
      // Delete existing home/work place first
      if (place.place_type === 'home' || place.place_type === 'work') {
        console.log('savePlace: Deleting existing', place.place_type)
        const { error: deleteError } = await (supabase
          .from('saved_places') as any)
          .delete()
          .eq('user_id', authStore.user.id)
          .eq('place_type', place.place_type)
        
        if (deleteError) {
          console.warn('Delete existing place error:', deleteError)
        }
      }

      const insertData = {
        user_id: authStore.user.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        place_type: place.place_type
      }

      console.log('savePlace: Inserting data:', insertData)

      console.log('savePlace: About to insert with user_id type:', typeof insertData.user_id, 'value:', insertData.user_id)
      
      const { data, error: insertError } = await (supabase
        .from('saved_places') as any)
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error('Insert place error:', insertError)
        console.error('Insert error code:', insertError.code)
        console.error('Insert error details:', insertError.details)
        console.error('Insert error hint:', insertError.hint)
        throw insertError
      }
      
      console.log('savePlace: Success!', data)
      await fetchSavedPlaces()
      return data
    } catch (err: any) {
      console.error('savePlace error:', err)
      console.error('savePlace error type:', err.constructor.name)
      console.error('savePlace error message:', err.message)
      
      // Handle network errors with retry
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying savePlace... attempt ${retryCount + 2}`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          return savePlace(place, retryCount + 1)
        }
        error.value = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
      } else {
        error.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      }
      return null
    }
  }

  // Delete a saved place
  const deletePlace = async (placeId: string): Promise<boolean> => {
    if (!authStore.user?.id) return false

    // Check if demo mode - delete from localStorage
    const isDemoMode = localStorage.getItem('demo_mode') === 'true'
    if (isDemoMode || authStore.user.id.startsWith('user-')) {
      console.log('deletePlace: Demo mode - deleting from localStorage')
      deletePlaceFromLocalStorage(placeId)
      await fetchSavedPlaces()
      return true
    }

    try {
      const { error: deleteError } = await (supabase
        .from('saved_places') as any)
        .delete()
        .eq('id', placeId)
        .eq('user_id', authStore.user.id)

      if (deleteError) throw deleteError
      await fetchSavedPlaces()
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    }
  }

  // Update sort order for saved places (drag-and-drop reordering)
  const updatePlacesSortOrder = async (placeIds: string[], sortOrders: number[]): Promise<boolean> => {
    if (!authStore.user?.id) return false
    if (placeIds.length !== sortOrders.length) return false

    // Demo mode - save to localStorage
    const isDemoMode = localStorage.getItem('demo_mode') === 'true'
    if (isDemoMode || authStore.user.id.startsWith('user-')) {
      try {
        const places = getPlacesFromLocalStorage()
        placeIds.forEach((id, index) => {
          const place = places.find((p: any) => p.id === id)
          if (place) {
            place.sort_order = sortOrders[index]
          }
        })
        // Sort and save back
        places.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        localStorage.setItem('demo_saved_places', JSON.stringify(places))
        await fetchSavedPlaces()
        return true
      } catch {
        return false
      }
    }

    try {
      const { error: rpcError } = await (supabase.rpc as any)('update_places_sort_order', {
        p_user_id: authStore.user.id,
        p_place_ids: placeIds,
        p_sort_orders: sortOrders
      })

      if (rpcError) throw rpcError
      await fetchSavedPlaces()
      return true
    } catch (err: any) {
      error.value = err.message
      return false
    }
  }

  // Validate promo code
  const validatePromoCode = async (code: string, orderAmount: number): Promise<PromoValidation> => {
    try {
      if (!authStore.user?.id) {
        return { is_valid: false, discount_amount: 0, message: 'กรุณาเข้าสู่ระบบ', promo_id: null }
      }

      const { data, error: rpcError } = await (supabase.rpc as any)('validate_promo_code', {
        p_code: code,
        p_user_id: authStore.user.id,
        p_order_amount: orderAmount
      })

      if (rpcError) {
        return { is_valid: false, discount_amount: 0, message: rpcError.message, promo_id: null }
      }

      if (data?.[0]) {
        return data[0]
      }

      return { is_valid: false, discount_amount: 0, message: 'โค้ดไม่ถูกต้องหรือหมดอายุ', promo_id: null }
    } catch (err: any) {
      return { is_valid: false, discount_amount: 0, message: err.message, promo_id: null }
    }
  }

  // Use promo code
  const usePromoCode = async (code: string): Promise<boolean> => {
    if (!authStore.user?.id) return false

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('use_promo_code', {
        p_code: code,
        p_user_id: authStore.user.id
      })

      if (rpcError) throw rpcError
      return data || false
    } catch {
      return false
    }
  }

  // Create ride request
  const createRide = async (params: {
    pickup: { lat: number; lng: number; address: string }
    destination: { lat: number; lng: number; address: string }
    rideType: 'standard' | 'premium' | 'shared'
    scheduledTime?: string
    promoCode?: string
  }) => {
    loading.value = true
    error.value = null

    try {
      if (!authStore.user?.id) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return null
      }

      const ride = await rideStore.createRideRequest(
        authStore.user.id,
        params.pickup,
        params.destination,
        params.rideType
      )

      if (!ride) {
        error.value = rideStore.error || 'ไม่สามารถสร้างคำขอได้'
        return null
      }

      await addRecentPlace({
        name: params.destination.address?.split(',')[0] || 'ปลายทาง',
        address: params.destination.address,
        lat: params.destination.lat,
        lng: params.destination.lng
      })

      if (params.promoCode) {
        await usePromoCode(params.promoCode)
      }

      return ride
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Find and match driver
  const findDriver = async (): Promise<DriverInfo | null> => {
    loading.value = true
    error.value = null

    try {
      const driver = await rideStore.findAndMatchDriver()
      
      if (!driver) {
        error.value = rideStore.error || 'ไม่พบคนขับในบริเวณใกล้เคียง'
        return null
      }

      return {
        id: driver.id,
        name: driver.name,
        rating: driver.rating,
        trips: driver.total_trips,
        vehicle: driver.vehicle_type,
        color: driver.vehicle_color,
        plate: driver.vehicle_plate,
        photo: driver.avatar_url,
        eta: driver.eta,
        lat: driver.current_lat,
        lng: driver.current_lng
      }
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Cancel ride
  const cancelRide = async () => {
    return rideStore.cancelRide()
  }

  // Submit rating
  const submitRating = async (rating: number, tipAmount: number, comment?: string) => {
    return rideStore.submitRating(rating, tipAmount, comment)
  }

  // Subscribe to ride updates
  const subscribeToRide = (rideId: string, callback: (status: string, ride?: any) => void) => {
    return supabase
      .channel(`ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${rideId}`
        },
        (payload) => {
          const ride = payload.new as any
          callback(ride.status, ride)
        }
      )
      .subscribe()
  }

  // Subscribe to driver location
  const subscribeToDriverLocation = (
    providerId: string, 
    callback: (location: { lat: number; lng: number }) => void
  ) => {
    return supabase
      .channel(`driver:${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_providers',
          filter: `id=eq.${providerId}`
        },
        (payload) => {
          const provider = payload.new as any
          if (provider.current_lat && provider.current_lng) {
            callback({
              lat: provider.current_lat,
              lng: provider.current_lng
            })
          }
        }
      )
      .subscribe()
  }

  const homePlace = computed(() => savedPlaces.value.find((p) => p.place_type === 'home'))
  const workPlace = computed(() => savedPlaces.value.find((p) => p.place_type === 'work'))

  return {
    loading,
    error,
    savedPlaces,
    recentPlaces,
    currentDriver,
    currentRideId,
    homePlace,
    workPlace,
    initialize,
    fetchSavedPlaces,
    fetchRecentPlaces,
    addRecentPlace,
    savePlace,
    deletePlace,
    updatePlacesSortOrder,
    validatePromoCode,
    usePromoCode,
    createRide,
    findDriver,
    cancelRide,
    submitRating,
    subscribeToRide,
    subscribeToDriverLocation
  }
}
