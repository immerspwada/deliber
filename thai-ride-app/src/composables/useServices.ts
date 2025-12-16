import { ref, computed } from 'vue'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useRideStore } from '../stores/ride'

export interface SavedPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  place_type: 'home' | 'work' | 'other'
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

export function useServices() {
  const authStore = useAuthStore()
  const rideStore = useRideStore()

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

  // Fetch saved places with network error handling and timeout
  const fetchSavedPlaces = async () => {
    if (!authStore.user?.id) return []

    try {
      // Add timeout protection
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const { data, error: fetchError } = await (supabase
        .from('saved_places') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('place_type', { ascending: true })
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (fetchError) throw fetchError
      savedPlaces.value = data || []
      return data || []
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('Failed to fetch') || err.message?.includes('aborted')) {
        console.warn('Network error or timeout fetching saved places')
        // Don't set error - just return empty silently
      } else {
        console.warn('Error fetching saved places:', err.message)
      }
      return savedPlaces.value // Return cached value if available
    }
  }

  // Fetch recent places with timeout protection
  const fetchRecentPlaces = async (limit = 10) => {
    if (!authStore.user?.id) return []

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const { data, error: fetchError } = await (supabase
        .from('recent_places') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('last_used_at', { ascending: false })
        .limit(limit)
        .abortSignal(controller.signal)

      clearTimeout(timeoutId)

      if (fetchError) throw fetchError
      recentPlaces.value = data || []
      return data || []
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('Failed to fetch')) {
        console.warn('Network error or timeout fetching recent places')
      } else {
        console.warn('Error fetching recent places:', err.message)
      }
      return recentPlaces.value // Return cached value
    }
  }

  // Add to recent places
  const addRecentPlace = async (place: { name: string; address: string; lat: number; lng: number }) => {
    if (!authStore.user?.id) return

    try {
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
            search_count: existing.search_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        await (supabase.from('recent_places') as any).insert({
          user_id: authStore.user.id,
          ...place
        })
      }

      await fetchRecentPlaces()
    } catch (err: any) {
      error.value = err.message
    }
  }

  // Save a place with retry logic
  const savePlace = async (place: Omit<SavedPlace, 'id'>, retryCount = 0): Promise<any> => {
    const MAX_RETRIES = 2
    
    // Check Supabase configuration
    if (!isSupabaseConfigured) {
      console.error('savePlace: Supabase not configured')
      error.value = 'ระบบยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแล'
      return null
    }
    
    if (!authStore.user?.id) {
      console.warn('savePlace: No user logged in')
      error.value = 'กรุณาเข้าสู่ระบบก่อน'
      return null
    }

    console.log('savePlace: Starting with user_id:', authStore.user.id)
    console.log('savePlace: Place data:', place)

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

      const { data, error: insertError } = await (supabase
        .from('saved_places') as any)
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error('Insert place error:', insertError)
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
