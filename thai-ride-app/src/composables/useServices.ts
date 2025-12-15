import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
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
  tracking_id: string  // Human-readable tracking ID (e.g., DRV-20251215-000001)
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

// Mock drivers for demo when no real drivers available
const MOCK_DRIVERS: DriverInfo[] = [
  {
    id: 'mock-1',
    tracking_id: 'DRV-20251101-000042',
    name: 'สมชาย ใจดี',
    rating: 4.85,
    trips: 1250,
    vehicle: 'Toyota Camry',
    color: 'สีดำ',
    plate: 'กข 1234',
    eta: 3,
    lat: 13.7563,
    lng: 100.5018
  },
  {
    id: 'mock-2',
    tracking_id: 'DRV-20251020-000007',
    name: 'วิชัย ขับรถ',
    rating: 4.92,
    trips: 890,
    vehicle: 'Honda City',
    color: 'สีขาว',
    plate: 'กค 5678',
    eta: 5,
    lat: 13.758,
    lng: 100.5035
  }
]

export function useServices() {
  const authStore = useAuthStore()
  const rideStore = useRideStore()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const savedPlaces = ref<SavedPlace[]>([])
  const recentPlaces = ref<RecentPlace[]>([])
  const currentDriver = ref<DriverInfo | null>(null)
  const currentRideId = ref<string | null>(null)

  // Fetch saved places
  const fetchSavedPlaces = async () => {
    if (!authStore.user?.id) return []

    try {
      const { data, error: fetchError } = await (supabase
        .from('saved_places') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('place_type', { ascending: true })

      if (fetchError) throw fetchError
      savedPlaces.value = data || []
      return data || []
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  // Fetch recent places
  const fetchRecentPlaces = async (limit = 10) => {
    if (!authStore.user?.id) return []

    try {
      const { data, error: fetchError } = await (supabase
        .from('recent_places') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('last_used_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError
      recentPlaces.value = data || []
      return data || []
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  // Add to recent places
  const addRecentPlace = async (place: { name: string; address: string; lat: number; lng: number }) => {
    if (!authStore.user?.id) return

    try {
      // Check if place already exists
      const { data: existing } = await (supabase
        .from('recent_places') as any)
        .select('id, search_count')
        .eq('user_id', authStore.user.id)
        .eq('name', place.name)
        .single()

      if (existing) {
        // Update existing
        await (supabase
          .from('recent_places') as any)
          .update({
            search_count: existing.search_count + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        // Insert new
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

  // Save a place (home/work/other)
  const savePlace = async (place: Omit<SavedPlace, 'id'>) => {
    if (!authStore.user?.id) return null

    try {
      // If saving home or work, remove existing
      if (place.place_type === 'home' || place.place_type === 'work') {
        await (supabase
          .from('saved_places') as any)
          .delete()
          .eq('user_id', authStore.user.id)
          .eq('place_type', place.place_type)
      }

      const { data, error: insertError } = await (supabase
        .from('saved_places') as any)
        .insert({ user_id: authStore.user.id, ...place })
        .select()
        .single()

      if (insertError) throw insertError
      await fetchSavedPlaces()
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    }
  }


  // Validate promo code
  const validatePromoCode = async (code: string, orderAmount: number): Promise<PromoValidation> => {
    try {
      // Try real validation if user is logged in
      if (authStore.user?.id) {
        const { data, error: rpcError } = await (supabase.rpc as any)('validate_promo_code', {
          p_code: code,
          p_user_id: authStore.user.id,
          p_order_amount: orderAmount
        })

        if (!rpcError && data?.[0]) {
          return data[0]
        }
      }

      // Demo mode - validate against known codes
      const demoPromos: Record<string, { discount: number; type: 'fixed' | 'percentage'; desc: string }> = {
        'FIRST50': { discount: 50, type: 'fixed', desc: 'ส่วนลดสำหรับผู้ใช้ใหม่' },
        'SAVE20': { discount: 20, type: 'fixed', desc: 'ลด 20 บาท' },
        'RIDE10': { discount: 10, type: 'percentage', desc: 'ลด 10%' },
        'WEEKEND': { discount: 15, type: 'percentage', desc: 'ส่วนลดวันหยุด' }
      }

      const promo = demoPromos[code.toUpperCase()]
      if (promo) {
        const discountAmount = promo.type === 'fixed' 
          ? promo.discount 
          : Math.min(orderAmount * (promo.discount / 100), 100)
        return {
          is_valid: true,
          discount_amount: discountAmount,
          message: promo.desc,
          promo_id: code.toUpperCase()
        }
      }

      return { is_valid: false, discount_amount: 0, message: 'โค้ดไม่ถูกต้องหรือหมดอายุ', promo_id: null }
    } catch (err: any) {
      return { is_valid: false, discount_amount: 0, message: err.message, promo_id: null }
    }
  }

  // Use promo code (mark as used)
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
      // Calculate fare
      const distance = rideStore.calculateDistance(
        params.pickup.lat,
        params.pickup.lng,
        params.destination.lat,
        params.destination.lng
      )
      const estimatedFare = rideStore.calculateFare(distance, params.rideType)

      // If user is logged in, create real ride
      if (authStore.user?.id) {
        const { data: ride, error: insertError } = await (supabase
          .from('ride_requests') as any)
          .insert({
            user_id: authStore.user.id,
            pickup_lat: params.pickup.lat,
            pickup_lng: params.pickup.lng,
            pickup_address: params.pickup.address,
            destination_lat: params.destination.lat,
            destination_lng: params.destination.lng,
            destination_address: params.destination.address,
            ride_type: params.rideType,
            scheduled_time: params.scheduledTime || null,
            estimated_fare: estimatedFare,
            status: 'pending'
          })
          .select()
          .single()

        if (insertError) {
          console.warn('Error creating ride:', insertError.message)
        } else if (ride) {
          currentRideId.value = ride.id as string

          // Add destination to recent places
          await addRecentPlace({
            name: params.destination.address?.split(',')[0] || 'ปลายทาง',
            address: params.destination.address,
            lat: params.destination.lat,
            lng: params.destination.lng
          })

          // Use promo code if provided
          if (params.promoCode) {
            await usePromoCode(params.promoCode)
          }

          return ride
        }
      }

      // Demo mode - return mock ride
      console.log('Demo mode: creating mock ride')
      const mockRide = {
        id: `mock-ride-${Date.now()}`,
        user_id: 'demo-user',
        pickup_lat: params.pickup.lat,
        pickup_lng: params.pickup.lng,
        pickup_address: params.pickup.address,
        destination_lat: params.destination.lat,
        destination_lng: params.destination.lng,
        destination_address: params.destination.address,
        ride_type: params.rideType,
        estimated_fare: estimatedFare,
        status: 'pending'
      }
      currentRideId.value = mockRide.id
      return mockRide
    } catch (err: any) {
      console.warn('Create ride error:', err.message)
      // Return mock ride for demo
      const mockRide = {
        id: `mock-ride-${Date.now()}`,
        status: 'pending'
      }
      currentRideId.value = mockRide.id
      return mockRide
    } finally {
      loading.value = false
    }
  }


  // Find and match driver
  const findDriver = async (pickupLat: number, pickupLng: number): Promise<DriverInfo | null> => {
    loading.value = true

    try {
      // Find nearby drivers
      const { data: drivers, error: findError } = await (supabase.rpc as any)('find_nearby_providers', {
        lat: pickupLat,
        lng: pickupLng,
        radius_km: 5,
        provider_type_filter: 'driver'
      })

      if (findError) {
        console.warn('Error finding drivers:', findError.message)
      }

      if (drivers && drivers.length > 0) {
        // Get first available driver with user info
        const driver = drivers[0]
        const { data: providerData } = await (supabase
          .from('service_providers') as any)
          .select(`
            *,
            users:user_id (
              name,
              avatar_url
            )
          `)
          .eq('id', driver.provider_id)
          .single()

        if (providerData) {
          const user = providerData.users as any
          currentDriver.value = {
            id: providerData.id,
            tracking_id: providerData.tracking_id || `DRV-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
            name: user?.name || 'คนขับ',
            rating: providerData.rating || 4.8,
            trips: providerData.total_trips || 0,
            vehicle: providerData.vehicle_type || 'รถยนต์',
            color: providerData.vehicle_color || 'สีดำ',
            plate: providerData.vehicle_plate || 'กข 1234',
            photo: user?.avatar_url,
            eta: Math.ceil(driver.distance_km * 2) || 3,
            lat: providerData.current_lat,
            lng: providerData.current_lng
          }

          // Update ride with matched driver
          if (currentRideId.value) {
            await (supabase
              .from('ride_requests') as any)
              .update({
                provider_id: providerData.id,
                status: 'matched'
              })
              .eq('id', currentRideId.value)
          }

          return currentDriver.value
        }
      }

      // Use mock driver for demo
      console.log('Using mock driver for demo')
      const mockDriver = MOCK_DRIVERS[Math.floor(Math.random() * MOCK_DRIVERS.length)]
      currentDriver.value = { ...mockDriver } as DriverInfo
      return currentDriver.value
    } catch (err: any) {
      console.warn('Driver search error, using mock:', err.message)
      // Fallback to mock driver
      const mockDriver = MOCK_DRIVERS[Math.floor(Math.random() * MOCK_DRIVERS.length)]
      currentDriver.value = { ...mockDriver } as DriverInfo
      return currentDriver.value
    } finally {
      loading.value = false
    }
  }

  // Cancel ride
  const cancelRide = async () => {
    if (!currentRideId.value) return false

    try {
      // Only update if it's a real ride (not mock)
      if (!currentRideId.value.startsWith('mock-')) {
        const { error: updateError } = await (supabase
          .from('ride_requests') as any)
          .update({ status: 'cancelled' })
          .eq('id', currentRideId.value)

        if (updateError) throw updateError
      }

      currentRideId.value = null
      currentDriver.value = null
      return true
    } catch (err: any) {
      error.value = err.message
      // Still reset state even on error
      currentRideId.value = null
      currentDriver.value = null
      return true
    }
  }

  // Submit rating
  const submitRating = async (rating: number, tipAmount: number, comment?: string) => {
    // For demo mode, just reset state
    if (!currentRideId.value || currentRideId.value.startsWith('mock-')) {
      currentRideId.value = null
      currentDriver.value = null
      return true
    }

    if (!currentDriver.value || !authStore.user?.id) {
      currentRideId.value = null
      currentDriver.value = null
      return true
    }

    try {
      // Insert rating
      await (supabase.from('ride_ratings') as any).insert({
        ride_id: currentRideId.value,
        user_id: authStore.user.id,
        provider_id: currentDriver.value.id,
        rating,
        tip_amount: tipAmount,
        comment
      })

      // Update ride status
      await (supabase
        .from('ride_requests') as any)
        .update({ status: 'completed' })
        .eq('id', currentRideId.value)

      // Update provider rating (average)
      const { data: ratings } = await (supabase
        .from('ride_ratings') as any)
        .select('rating')
        .eq('provider_id', currentDriver.value.id)

      if (ratings && ratings.length > 0) {
        const avgRating = ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
        await (supabase
          .from('service_providers') as any)
          .update({
            rating: Math.round(avgRating * 100) / 100,
            total_trips: ratings.length
          })
          .eq('id', currentDriver.value.id)
      }

      currentRideId.value = null
      currentDriver.value = null
      return true
    } catch (err: any) {
      error.value = err.message
      currentRideId.value = null
      currentDriver.value = null
      return true
    }
  }

  // Subscribe to ride updates (realtime)
  const subscribeToRide = (rideId: string, callback: (status: string, ride?: any) => void) => {
    // Skip subscription for mock rides - simulate updates instead
    if (rideId.startsWith('mock-')) {
      // Simulate realtime updates for demo
      const statuses: string[] = ['matched', 'pickup', 'in_progress', 'completed']
      let index = 0
      const interval = setInterval(() => {
        if (index < statuses.length) {
          const status = statuses[index]
          if (status) {
            callback(status)
          }
          index++
        } else {
          clearInterval(interval)
        }
      }, 5000) // Update every 5 seconds for demo
      
      return { 
        unsubscribe: () => clearInterval(interval)
      }
    }

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

  // Subscribe to driver location updates (realtime)
  const subscribeToDriverLocation = (
    providerId: string, 
    callback: (location: { lat: number; lng: number }) => void
  ) => {
    // Mock driver movement for demo
    if (providerId.startsWith('mock-')) {
      let lat = currentDriver.value?.lat || 13.7563
      let lng = currentDriver.value?.lng || 100.5018
      
      const interval = setInterval(() => {
        // Simulate driver moving
        lat += (Math.random() - 0.5) * 0.001
        lng += (Math.random() - 0.5) * 0.001
        callback({ lat, lng })
      }, 3000)
      
      return { unsubscribe: () => clearInterval(interval) }
    }

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

  // Get home place
  const homePlace = computed(() => savedPlaces.value.find((p) => p.place_type === 'home'))

  // Get work place
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
    fetchSavedPlaces,
    fetchRecentPlaces,
    addRecentPlace,
    savePlace,
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
