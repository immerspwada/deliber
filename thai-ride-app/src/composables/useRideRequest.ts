/**
 * Composable: useRideRequest
 * จัดการ state และ logic ทั้งหมดของการจองรถ
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useRideStore } from '../stores/ride'
import { useLocation, type GeoLocation } from './useLocation'
import { useWallet } from './useWallet'
import { useServices } from './useServices'
import { supabase } from '../lib/supabase'
import { reverseGeocode as reverseGeocodeMulti } from './useGeocode'
import { useCustomerRideRealtime } from './useCustomerRideRealtime'
import { useToast } from './useToast'

export type RideStep = 'select' | 'searching' | 'tracking' | 'rating'

export interface VehicleOption {
  id: string
  name: string
  multiplier: number
  eta: string
  icon: string
}

export interface MatchedDriver {
  id: string
  name: string
  phone?: string
  rating?: number
  total_trips?: number
  vehicle_type?: string
  vehicle_color?: string
  vehicle_plate?: string
  avatar_url?: string
  current_lat?: number
  current_lng?: number
}

export interface NearbyPlace {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  type: string
  icon: string
  distance?: number
}

const DEFAULT_VEHICLES: VehicleOption[] = [
  { id: 'bike', name: 'มอเตอร์ไซค์', multiplier: 0.7, eta: '3 นาที', icon: 'bike' },
  { id: 'car', name: 'รถยนต์', multiplier: 1.0, eta: '5 นาที', icon: 'car' },
  { id: 'premium', name: 'พรีเมียม', multiplier: 1.5, eta: '7 นาที', icon: 'premium' }
]

export interface BookingOptions {
  paymentMethod: 'wallet' | 'cash' | 'card'
  scheduledTime: string | null
  promoCode: string | null
  promoDiscount: number
  finalAmount: number
  notes?: string
}

export function useRideRequest() {
  const router = useRouter()
  const authStore = useAuthStore()
  const rideStore = useRideStore()
  const { calculateDistance, calculateTravelTime } = useLocation()
  const { savedPlaces, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()
  const { balance, fetchBalance } = useWallet()

  // Core state
  const currentStep = ref<RideStep>('select')
  const pickup = ref<GeoLocation | null>(null)
  const destination = ref<GeoLocation | null>(null)
  const selectedVehicle = ref<string>('car')
  
  // Loading states
  const isBooking = ref(false)
  const isGettingLocation = ref(false)
  const isLoadingVehicles = ref(false)
  
  // Search state
  const searchQuery = ref('')
  const isSearchFocused = ref(false)
  const searchResults = ref<Array<{ id: string; name: string; address: string; lat: number; lng: number }>>([])
  
  // Timer state
  const searchingSeconds = ref(0)
  let searchingInterval: ReturnType<typeof setInterval> | null = null
  
  // Nearby places
  const nearbyPlaces = ref<NearbyPlace[]>([])
  const isLoadingNearby = ref(false)
  const nearbyPlacesCache = new Map<string, NearbyPlace[]>()
  
  // Fare & Trip
  const estimatedFare = ref(0)
  const estimatedTime = ref(0)
  const estimatedDistance = ref(0)
  
  // Active ride
  const activeRide = ref<Record<string, unknown> | null>(null)
  const matchedDriver = ref<MatchedDriver | null>(null)
  const driverETA = ref(0)
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
  
  // Rating
  const userRating = ref(0)
  const isSubmittingRating = ref(false)
  
  // Vehicles
  const vehicles = ref<VehicleOption[]>([])

  // Computed
  const selectedVehicleInfo = computed(() => 
    vehicles.value.find(v => v.id === selectedVehicle.value)
  )
  
  const finalFare = computed(() => 
    Math.round(estimatedFare.value * (selectedVehicleInfo.value?.multiplier || 1))
  )
  
  const currentBalance = computed(() => balance.value?.balance ?? 0)
  
  const hasEnoughBalance = computed(() => 
    currentBalance.value >= finalFare.value
  )
  
  const canBook = computed(() => 
    pickup.value && 
    destination.value && 
    !isBooking.value && 
    hasEnoughBalance.value
  )

  const statusText = computed(() => {
    if (!activeRide.value) return ''
    const s = activeRide.value.status as string
    const driverName = matchedDriver.value?.name || 'คนขับ'
    const statusMap: Record<string, string> = {
      'pending': 'กำลังหาคนขับ...',
      'matched': matchedDriver.value ? `${driverName} กำลังมารับ (${driverETA.value || 5} นาที)` : 'พบคนขับแล้ว กำลังโหลดข้อมูล...',
      'arriving': `${driverName} ใกล้ถึงแล้ว`,
      'arrived': `${driverName} ถึงจุดรับแล้ว`,
      'pickup': `${driverName} ถึงจุดรับแล้ว`,
      'picked_up': 'กำลังเดินทาง',
      'in_progress': 'กำลังเดินทาง',
      'completed': 'ถึงแล้ว!',
      'cancelled': 'ยกเลิกแล้ว'
    }
    return statusMap[s] || s
  })

  // Watch for status changes
  watch(() => activeRide.value?.status, (newStatus) => {
    if (newStatus === 'matched' || newStatus === 'arriving') {
      driverETA.value = 5
    }
    if (newStatus === 'completed') {
      currentStep.value = 'rating'
    }
  })

  // Methods
  async function fetchVehicleTypes(): Promise<void> {
    isLoadingVehicles.value = true
    try {
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('id, name, price_multiplier, estimated_eta_minutes, icon')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        vehicles.value = (data as Array<{
          id: string
          name: string
          price_multiplier: number | null
          estimated_eta_minutes: number | null
          icon: string | null
        }>).map(v => ({
          id: v.id,
          name: v.name,
          multiplier: v.price_multiplier || 1.0,
          eta: `${v.estimated_eta_minutes || 5} นาที`,
          icon: v.icon || 'car'
        }))
      } else {
        vehicles.value = DEFAULT_VEHICLES
      }
    } catch {
      vehicles.value = DEFAULT_VEHICLES
    } finally {
      isLoadingVehicles.value = false
    }
  }

  async function getCurrentLocation(): Promise<void> {
    if (!navigator.geolocation) {
      console.warn('[RideRequest] Geolocation not supported')
      // Set default location (Bangkok)
      pickup.value = {
        lat: 13.7563,
        lng: 100.5018,
        address: 'กรุงเทพมหานคร'
      }
      return
    }
    
    isGettingLocation.value = true
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        })
      })
      
      pickup.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: 'ตำแหน่งปัจจุบัน'
      }
      
      // Reverse geocode in background (non-blocking)
      reverseGeocodePickup(position.coords.latitude, position.coords.longitude)
      
      // Fetch nearby places in background
      fetchNearbyPlaces(position.coords.latitude, position.coords.longitude)
      
    } catch (error) {
      console.warn('[RideRequest] Geolocation error:', error)
      // Set default location on error
      pickup.value = {
        lat: 13.7563,
        lng: 100.5018,
        address: 'กรุงเทพมหานคร (ไม่สามารถระบุตำแหน่งได้)'
      }
    } finally {
      isGettingLocation.value = false
    }
  }
  
  async function reverseGeocodePickup(lat: number, lng: number): Promise<void> {
    try {
      const result = await reverseGeocodeMulti(lat, lng)
      if (result.source !== 'coordinates' && pickup.value) {
        pickup.value.address = result.name
        console.log(`[RideRequest] Pickup geocoded via ${result.source}: ${result.name}`)
      }
    } catch {
      // Silently ignore reverse geocoding errors
    }
  }

  async function fetchNearbyPlaces(lat: number, lng: number): Promise<void> {
    const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`
    const cached = nearbyPlacesCache.get(cacheKey)
    if (cached) {
      nearbyPlaces.value = cached
      return
    }

    isLoadingNearby.value = true
    nearbyPlaces.value = []

    const categories = [
      { type: 'mall', query: 'mall', icon: 'shopping' },
      { type: 'hospital', query: 'hospital', icon: 'hospital' },
      { type: 'station', query: 'station', icon: 'train' },
      { type: 'airport', query: 'airport', icon: 'plane' },
      { type: 'university', query: 'university', icon: 'school' },
      { type: 'temple', query: 'temple', icon: 'temple' }
    ]

    const allPlaces: NearbyPlace[] = []

    // Try Photon API for each category (more reliable than Nominatim)
    try {
      for (const cat of categories.slice(0, 4)) { // Limit to 4 categories for speed
        try {
          const photonResponse = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(cat.query)}&lat=${lat}&lon=${lng}&limit=3&lang=en`,
            { headers: { Accept: 'application/json' } }
          )
          
          if (photonResponse.ok) {
            const data = await photonResponse.json()
            const features = data.features || []
            
            for (const feature of features) {
              const props = feature.properties || {}
              const coords = feature.geometry?.coordinates || []
              
              if (coords.length < 2) continue
              
              const name = props.name || props.street || ''
              if (!name) continue
              
              // Calculate distance and skip if too far (> 10km)
              const dist = calculateDistance(lat, lng, coords[1], coords[0])
              if (dist > 10000) continue
              
              allPlaces.push({
                id: `photon-${props.osm_id || Math.random()}`,
                name,
                address: [props.street, props.district, props.city].filter(Boolean).join(', ') || '',
                lat: coords[1],
                lng: coords[0],
                type: cat.type,
                icon: cat.icon,
                distance: dist
              })
            }
          }
        } catch {
          // Continue to next category
        }
      }
      
      console.log(`[RideRequest] Photon found ${allPlaces.length} nearby places`)
    } catch {
      console.log('[RideRequest] Photon nearby search failed')
    }

    // Skip Nominatim fallback if we have enough results (Nominatim is down anyway)
    // Only try if we have zero results
    if (allPlaces.length === 0) {
      console.log('[RideRequest] No Photon results, skipping Nominatim (likely down)')
    }

    // Sort by distance and dedupe
    const sortedPlaces = allPlaces
      .filter((place, index, self) => 
        index === self.findIndex(p => p.name === place.name)
      )
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, 8)

    nearbyPlaces.value = sortedPlaces
    nearbyPlacesCache.set(cacheKey, sortedPlaces)
    isLoadingNearby.value = false
  }

  function searchPlaces(): void {
    if (searchQuery.value.length < 2) {
      searchResults.value = []
      return
    }
    const query = searchQuery.value.toLowerCase()
    const allPlaces = [...(savedPlaces.value || []), ...(recentPlaces.value || [])]
    searchResults.value = allPlaces
      .filter(p => 
        p.name?.toLowerCase().includes(query) || 
        p.address?.toLowerCase().includes(query)
      )
      .slice(0, 5)
      .map(p => ({ id: p.id, name: p.name, address: p.address, lat: p.lat, lng: p.lng }))
  }

  function selectDestination(place: { name: string; address: string; lat: number; lng: number }): void {
    destination.value = {
      lat: place.lat,
      lng: place.lng,
      address: place.name || place.address
    }
    searchQuery.value = place.name || place.address
    searchResults.value = []
    isSearchFocused.value = false
    calculateFare()
  }

  /**
   * Calculate fare - MUST match ride.ts store formula!
   * Base: 35 THB + distance * perKmRate
   * perKmRate: standard=10, premium=15, shared=8
   * Minimum: standard=50, premium=80, shared=40
   */
  function calculateFare(): void {
    if (!pickup.value || !destination.value) return
    const dist = calculateDistance(
      pickup.value.lat, pickup.value.lng,
      destination.value.lat, destination.value.lng
    )
    estimatedDistance.value = dist
    estimatedTime.value = calculateTravelTime(dist)
    // Use standard rate (10 THB/km) - matches ride.ts store
    const baseFare = 35
    const perKmRate = 10 // standard rate
    const minimumFare = 50
    estimatedFare.value = Math.round(Math.max(baseFare + dist * perKmRate, minimumFare))
  }

  function handleRouteCalculated(info: { distance: number; duration: number }): void {
    estimatedDistance.value = info.distance
    estimatedTime.value = info.duration
    // Use standard rate (10 THB/km) - matches ride.ts store
    const baseFare = 35
    const perKmRate = 10 // standard rate
    const minimumFare = 50
    estimatedFare.value = Math.round(Math.max(baseFare + info.distance * perKmRate, minimumFare))
  }

  async function checkActiveRide(): Promise<void> {
    if (!authStore.user?.id) return
    
    console.log('[RideRequest] Checking for active ride...')
    
    // Query updated for providers_v2 schema - include all active statuses
    // Include vehicle info columns: vehicle_type, vehicle_plate, vehicle_color
    // Include media: avatar_url, vehicle_photo_url
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('ride_requests')
      .select(`
        *,
        provider:provider_id (
          id, user_id, first_name, last_name, phone_number, rating, total_trips,
          vehicle_type, vehicle_plate, vehicle_color, avatar_url, vehicle_photo_url
        )
      `)
      .eq('user_id', authStore.user.id)
      .in('status', ['pending', 'matched', 'arrived', 'arriving', 'picked_up', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[RideRequest] Error checking active ride:', error)
      return
    }

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rideData = data as any
      console.log('[RideRequest] Found active ride:', rideData.id, 'status:', rideData.status)
      activeRide.value = rideData
      
      // Set pickup and destination from active ride
      if (rideData.pickup_lat && rideData.pickup_lng) {
        pickup.value = {
          lat: Number(rideData.pickup_lat),
          lng: Number(rideData.pickup_lng),
          address: String(rideData.pickup_address || 'จุดรับ')
        }
      }
      if (rideData.destination_lat && rideData.destination_lng) {
        destination.value = {
          lat: Number(rideData.destination_lat),
          lng: Number(rideData.destination_lng),
          address: String(rideData.destination_address || 'จุดหมาย')
        }
      }
      
      // Set fare info
      if (rideData.estimated_fare) {
        estimatedFare.value = Number(rideData.estimated_fare)
      }
      
      const provider = rideData.provider as Record<string, unknown> | undefined
      if (provider && provider.id) {
        // providers_v2 has first_name, last_name, phone_number, vehicle info directly
        const fullName = `${provider.first_name || ''} ${provider.last_name || ''}`.trim()
        matchedDriver.value = {
          id: String(provider.id),
          name: fullName || 'คนขับ',
          phone: String(provider.phone_number || ''),
          rating: Number(provider.rating) || 4.8,
          total_trips: Number(provider.total_trips) || 0,
          vehicle_type: String(provider.vehicle_type || ''),
          vehicle_color: String(provider.vehicle_color || ''),
          vehicle_plate: String(provider.vehicle_plate || ''),
          avatar_url: provider.avatar_url ? String(provider.avatar_url) : undefined,
          current_lat: 0,
          current_lng: 0
        }
        
        // Fetch current provider location
        fetchProviderLocation(String(provider.id))
      } else if (rideData.provider_id) {
        // Fallback: If JOIN didn't return provider data (RLS issue), fetch separately
        console.log('[RideRequest] Provider JOIN returned null, fetching separately:', rideData.provider_id)
        await fetchProviderInfo(String(rideData.provider_id))
      }
      
      // Set correct step based on status
      const status = rideData.status as string
      if (status === 'pending') {
        currentStep.value = 'searching'
        // Start searching timer
        searchingSeconds.value = 0
        searchingInterval = setInterval(() => { searchingSeconds.value++ }, 1000)
      } else if (status === 'completed') {
        currentStep.value = 'rating'
      } else {
        // matched, arrived, arriving, picked_up, in_progress -> tracking
        currentStep.value = 'tracking'
      }
      
      console.log('[RideRequest] Set step to:', currentStep.value)
      setupRealtimeTracking(String(rideData.id))
    } else {
      console.log('[RideRequest] No active ride found')
    }
  }

  function setupRealtimeTracking(rideId: string): void {
    if (!rideId || rideId === 'undefined' || rideId === 'null') return

    realtimeChannel = supabase
      .channel(`ride-${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ride_requests',
        filter: `id=eq.${rideId}`
      }, async (payload) => {
        console.log('[RideRequest] Realtime update received:', payload.new)
        activeRide.value = { ...activeRide.value, ...payload.new }
        
        const newStatus = payload.new.status as string
        const newProviderId = payload.new.provider_id as string | null
        
        if (newStatus === 'completed') {
          currentStep.value = 'rating'
          cleanupSearching()
        } else if (newStatus === 'cancelled') {
          resetAll()
        } else if (newStatus !== 'pending') {
          // Status changed to matched/arrived/in_progress etc.
          currentStep.value = 'tracking'
          cleanupSearching()
          
          // If we have a provider_id but no matchedDriver, fetch provider info
          if (newProviderId && !matchedDriver.value) {
            console.log('[RideRequest] Fetching provider info for:', newProviderId)
            await fetchProviderInfo(newProviderId)
          }
        }
      })
      // Listen for provider location updates
      .on('broadcast', { event: 'provider_location' }, (payload) => {
        console.log('[RideRequest] Provider location update:', payload)
        if (matchedDriver.value && payload.payload) {
          matchedDriver.value.current_lat = payload.payload.lat
          matchedDriver.value.current_lng = payload.payload.lng
        }
      })
      .subscribe()
    
    // Also subscribe to provider_locations table for realtime updates
    if (activeRide.value) {
      const providerId = (activeRide.value as Record<string, unknown>).provider_id
      if (providerId) {
        subscribeToProviderLocation(String(providerId))
      }
    }
  }
  
  async function fetchProviderInfo(providerId: string): Promise<void> {
    try {
      console.log('[RideRequest] Fetching provider info via RPC for ride:', activeRide.value?.id)
      
      // First try using RPC function (bypasses RLS)
      if (activeRide.value?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rpcData, error: rpcError } = await (supabase as any)
          .rpc('get_matched_provider_for_ride', { p_ride_id: activeRide.value.id })
        
        if (!rpcError && rpcData?.success && rpcData?.provider) {
          const p = rpcData.provider
          const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim()
          matchedDriver.value = {
            id: String(p.id),
            name: fullName || 'คนขับ',
            phone: String(p.phone_number || ''),
            rating: Number(p.rating) || 4.8,
            total_trips: Number(p.total_trips) || 0,
            vehicle_type: String(p.vehicle_type || ''),
            vehicle_color: String(p.vehicle_color || ''),
            vehicle_plate: String(p.vehicle_plate || ''),
            avatar_url: p.avatar_url ? String(p.avatar_url) : undefined,
            current_lat: Number(p.current_lat) || 0,
            current_lng: Number(p.current_lng) || 0
          }
          console.log('[RideRequest] Provider info loaded via RPC:', matchedDriver.value.name)
          
          // Subscribe to provider location updates
          subscribeToProviderLocation(String(p.id))
          fetchProviderLocation(String(p.id))
          return
        }
        
        console.log('[RideRequest] RPC failed or no data, trying direct query:', rpcError?.message || rpcData?.error)
      }
      
      // Fallback: Direct query (may fail due to RLS)
      console.log('[RideRequest] Trying direct provider query:', providerId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('providers_v2')
        .select('id, user_id, first_name, last_name, phone_number, rating, total_trips, vehicle_type, vehicle_plate, vehicle_color, avatar_url, vehicle_photo_url, current_lat, current_lng')
        .eq('id', providerId)
        .maybeSingle()
      
      if (error) {
        console.error('[RideRequest] Error fetching provider:', error)
        return
      }
      
      if (data) {
        const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim()
        matchedDriver.value = {
          id: String(data.id),
          name: fullName || 'คนขับ',
          phone: String(data.phone_number || ''),
          rating: Number(data.rating) || 4.8,
          total_trips: Number(data.total_trips) || 0,
          vehicle_type: String(data.vehicle_type || ''),
          vehicle_color: String(data.vehicle_color || ''),
          vehicle_plate: String(data.vehicle_plate || ''),
          avatar_url: data.avatar_url ? String(data.avatar_url) : undefined,
          current_lat: Number(data.current_lat) || 0,
          current_lng: Number(data.current_lng) || 0
        }
        console.log('[RideRequest] Provider info loaded via direct query:', matchedDriver.value.name)
        
        // Subscribe to provider location updates
        subscribeToProviderLocation(providerId)
        
        // Also fetch from provider_locations table for more accurate location
        fetchProviderLocation(providerId)
      }
    } catch (error) {
      console.error('[RideRequest] Exception fetching provider:', error)
    }
  }
  
  function subscribeToProviderLocation(providerId: string): void {
    supabase
      .channel(`provider-location-${providerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'provider_locations',
        filter: `provider_id=eq.${providerId}`
      }, (payload) => {
        console.log('[RideRequest] Provider location from DB:', payload)
        if (matchedDriver.value && payload.new) {
          const loc = payload.new as Record<string, unknown>
          matchedDriver.value.current_lat = Number(loc.latitude) || 0
          matchedDriver.value.current_lng = Number(loc.longitude) || 0
        }
      })
      .subscribe()
  }

  async function bookRide(options?: BookingOptions): Promise<void> {
    if (!pickup.value || !destination.value) {
      console.warn('[RideRequest] Missing pickup or destination')
      return
    }
    
    if (!authStore.user) {
      console.warn('[RideRequest] User not authenticated')
      router.push('/login')
      return
    }

    // Determine the fare to check based on options
    const fareToCheck = options?.finalAmount ?? finalFare.value
    const paymentMethod = options?.paymentMethod ?? 'wallet'
    
    // Only check balance for wallet payments
    if (paymentMethod === 'wallet' && currentBalance.value < fareToCheck) {
      const goToWallet = confirm(
        `ยอดเงินไม่เพียงพอ\n\nค่าโดยสาร: ฿${fareToCheck.toLocaleString()}\nยอดคงเหลือ: ฿${currentBalance.value.toLocaleString()}\n\nต้องการเติมเงินหรือไม่?`
      )
      if (goToWallet) {
        router.push('/customer/wallet')
      }
      return
    }

    isBooking.value = true
    currentStep.value = 'searching'
    searchingSeconds.value = 0
    searchingInterval = setInterval(() => { searchingSeconds.value++ }, 1000)

    try {
      // Map vehicle type to ride type
      const rideTypeMap: Record<string, 'standard' | 'premium' | 'shared'> = {
        'bike': 'standard',
        'car': 'standard',
        'premium': 'premium',
        'shared': 'shared'
      }
      const rideType = rideTypeMap[selectedVehicle.value] || 'standard'
      
      // Log booking details
      console.log('[RideRequest] Creating ride request...', {
        userId: authStore.user.id,
        pickup: pickup.value.address,
        destination: destination.value.address,
        rideType,
        paymentMethod,
        scheduledTime: options?.scheduledTime,
        promoCode: options?.promoCode,
        finalAmount: fareToCheck
      })
      
      const ride = await rideStore.createRideRequest(
        authStore.user.id,
        pickup.value,
        destination.value,
        rideType,
        1,
        undefined, // specialRequests
        options?.scheduledTime ?? undefined,
        options?.notes
      )
      
      if (ride) {
        console.log('[RideRequest] Ride created:', ride.rideId)
        activeRide.value = rideStore.currentRide
        
        // Store booking options in active ride for reference
        if (activeRide.value) {
          activeRide.value.payment_method = paymentMethod
          activeRide.value.scheduled_time = options?.scheduledTime
          activeRide.value.promo_code = options?.promoCode
          activeRide.value.promo_discount = options?.promoDiscount
          activeRide.value.final_amount = fareToCheck
        }
        
        setupRealtimeTracking(ride.rideId)
        
        // For scheduled rides, show confirmation and return to select
        if (options?.scheduledTime) {
          cleanupSearching()
          currentStep.value = 'select'
          alert(`จองล่วงหน้าสำเร็จ!\n\nเวลา: ${new Date(options.scheduledTime).toLocaleString('th-TH')}\nค่าโดยสาร: ฿${fareToCheck.toLocaleString()}`)
          resetAll()
          return
        }
        
        // Find driver in background for immediate rides
        rideStore.findAndMatchDriver().then(driver => {
          if (driver) {
            if (searchingInterval) {
              clearInterval(searchingInterval)
              searchingInterval = null
            }
            matchedDriver.value = driver
            
            // Fetch provider location after matching
            if (driver.id) {
              fetchProviderLocation(driver.id)
            }
            
            currentStep.value = 'tracking'
            console.log('[RideRequest] Driver matched:', driver.name)
          }
        }).catch(err => {
          console.warn('[RideRequest] Driver matching error:', err)
        })
      } else {
        console.warn('[RideRequest] Ride creation failed')
        cleanupSearching()
        currentStep.value = 'select'
        alert(rideStore.error || 'ไม่สามารถสร้างคำขอได้ กรุณาลองใหม่')
      }
    } catch (error) {
      console.error('[RideRequest] Book ride error:', error)
      cleanupSearching()
      currentStep.value = 'select'
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      isBooking.value = false
    }
  }
  
  async function fetchProviderLocation(providerId: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('provider_locations')
        .select('latitude, longitude, heading, updated_at')
        .eq('provider_id', providerId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (!error && data && matchedDriver.value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const locData = data as any
        matchedDriver.value.current_lat = Number(locData.latitude) || 0
        matchedDriver.value.current_lng = Number(locData.longitude) || 0
        console.log('[RideRequest] Provider location loaded:', {
          lat: matchedDriver.value.current_lat,
          lng: matchedDriver.value.current_lng
        })
      }
    } catch (error) {
      console.warn('[RideRequest] Failed to fetch provider location:', error)
    }
  }
  
  function cleanupSearching(): void {
    if (searchingInterval) {
      clearInterval(searchingInterval)
      searchingInterval = null
    }
  }

  async function cancelRide(): Promise<void> {
    cleanupSearching()

    if (activeRide.value) {
      if (!confirm('ยกเลิกการเดินทาง?')) {
        if (currentStep.value === 'searching') {
          searchingInterval = setInterval(() => { searchingSeconds.value++ }, 1000)
        }
        return
      }
      const success = await rideStore.cancelRide(String(activeRide.value.id))
      if (success) resetAll()
    } else {
      resetAll()
    }
  }

  function resetAll(): void {
    cleanupSearching()
    activeRide.value = null
    matchedDriver.value = null
    currentStep.value = 'select'
    destination.value = null
    searchQuery.value = ''
    userRating.value = 0
    estimatedFare.value = 0
    estimatedDistance.value = 0
    estimatedTime.value = 0
  }

  async function submitRating(): Promise<void> {
    if (!activeRide.value || userRating.value === 0) return
    
    const rideId = activeRide.value.id
    const providerId = activeRide.value.provider_id || matchedDriver.value?.id
    const userId = authStore.user?.id
    
    if (!rideId || !providerId || !userId) {
      console.error('[RideRequest] Missing data for rating:', { rideId, providerId, userId })
      alert('ไม่สามารถส่งคะแนนได้ ข้อมูลไม่ครบ')
      return
    }
    
    isSubmittingRating.value = true
    try {
      console.log('[RideRequest] Submitting rating:', { rideId, providerId, userId, rating: userRating.value })
      
      // Insert rating directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: ratingError } = await (supabase as any)
        .from('ride_ratings')
        .insert({
          ride_id: rideId,
          user_id: userId,
          provider_id: providerId,
          rating: userRating.value,
          tip_amount: 0,
          comment: null
        })
      
      if (ratingError) {
        console.error('[RideRequest] Rating insert error:', ratingError)
        // Continue anyway - rating is not critical for UX
      } else {
        console.log('[RideRequest] Rating submitted successfully')
      }
      
      // Update ride status to completed if not already
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('ride_requests')
        .update({ status: 'completed' })
        .eq('id', rideId)
      
      // Reset and go back to select
      resetAll()
      
    } catch (error) {
      console.error('[RideRequest] Submit rating error:', error)
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      isSubmittingRating.value = false
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function callDriver(): void {
    if (matchedDriver.value?.phone) {
      window.location.href = `tel:${matchedDriver.value.phone}`
    }
  }  function callEmergency(): void {
    if (confirm('โทร 191?')) {
      window.location.href = 'tel:191'
    }
  }

  // Initialize
  async function initialize(): Promise<void> {
    getCurrentLocation()
    await fetchVehicleTypes()
    if (authStore.user?.id) {
      await Promise.all([
        fetchSavedPlaces(),
        fetchRecentPlaces(5),
        fetchBalance()
      ])
      await checkActiveRide()
    }
  }

  // Cleanup
  function cleanup(): void {
    rideStore.unsubscribeAll()
    if (searchingInterval) clearInterval(searchingInterval)
    if (realtimeChannel) supabase.removeChannel(realtimeChannel)
  }

  onUnmounted(cleanup)

  return {
    // State
    currentStep,
    pickup,
    destination,
    selectedVehicle,
    isBooking,
    isGettingLocation,
    isLoadingVehicles,
    searchQuery,
    isSearchFocused,
    searchResults,
    searchingSeconds,
    nearbyPlaces,
    isLoadingNearby,
    estimatedFare,
    estimatedTime,
    estimatedDistance,
    activeRide,
    matchedDriver,
    driverETA,
    userRating,
    isSubmittingRating,
    vehicles,
    savedPlaces,
    recentPlaces,
    
    // Computed
    selectedVehicleInfo,
    finalFare,
    currentBalance,
    hasEnoughBalance,
    canBook,
    statusText,
    
    // Methods
    initialize,
    cleanup,
    getCurrentLocation,
    searchPlaces,
    selectDestination,
    handleRouteCalculated,
    bookRide,
    cancelRide,
    resetAll,
    submitRating,
    formatTime,
    callDriver,
    callEmergency
  }
}
