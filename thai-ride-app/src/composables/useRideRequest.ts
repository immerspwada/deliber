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
    if (s === 'pending') return 'กำลังหาคนขับ...'
    if (s === 'matched') return `คนขับมาถึงใน ${driverETA.value} นาที`
    if (s === 'arriving') return 'คนขับใกล้ถึงแล้ว'
    if (s === 'picked_up' || s === 'in_progress') return 'กำลังเดินทาง'
    if (s === 'completed') return 'ถึงแล้ว!'
    return s
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
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { 
          headers: { Accept: 'application/json', 'User-Agent': 'ThaiRideApp/1.0' },
          signal: controller.signal
        }
      )
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const data = await response.json()
        if (data.display_name && pickup.value) {
          pickup.value.address = data.display_name.split(',').slice(0, 2).join(', ')
        }
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
      { type: 'mall', query: 'shopping mall', icon: 'shopping' },
      { type: 'hospital', query: 'hospital', icon: 'hospital' },
      { type: 'station', query: 'train station', icon: 'train' },
      { type: 'airport', query: 'airport', icon: 'plane' },
      { type: 'university', query: 'university', icon: 'school' },
      { type: 'temple', query: 'temple', icon: 'temple' }
    ]

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    const allPlaces: NearbyPlace[] = []

    try {
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i]
        if (i > 0) await delay(1100)

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cat.query)}&format=json&limit=2&viewbox=${lng - 0.05},${lat + 0.05},${lng + 0.05},${lat - 0.05}&bounded=1`,
            { headers: { Accept: 'application/json', 'User-Agent': 'ThaiRideApp/1.0' } }
          )

          if (response.ok) {
            const data = await response.json()
            const places = data.map((place: Record<string, unknown>) => ({
              id: String(place.place_id) || `${cat.type}-${Math.random()}`,
              name: String(place.display_name || '').split(',')[0] || cat.query,
              address: String(place.display_name || '').split(',').slice(1, 3).join(',').trim() || '',
              lat: parseFloat(String(place.lat)),
              lng: parseFloat(String(place.lon)),
              type: cat.type,
              icon: cat.icon
            }))
            allPlaces.push(...places)

            nearbyPlaces.value = allPlaces
              .map(place => ({
                ...place,
                distance: calculateDistance(lat, lng, place.lat, place.lng)
              }))
              .sort((a, b) => (a.distance || 0) - (b.distance || 0))
              .slice(0, 8)
          }
        } catch { /* continue */ }
      }

      const sortedPlaces = allPlaces
        .map(place => ({
          ...place,
          distance: calculateDistance(lat, lng, place.lat, place.lng)
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 8)

      nearbyPlaces.value = sortedPlaces
      nearbyPlacesCache.set(cacheKey, sortedPlaces)
    } catch {
      // ignore
    } finally {
      isLoadingNearby.value = false
    }
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

  function calculateFare(): void {
    if (!pickup.value || !destination.value) return
    const dist = calculateDistance(
      pickup.value.lat, pickup.value.lng,
      destination.value.lat, destination.value.lng
    )
    estimatedDistance.value = dist
    estimatedTime.value = calculateTravelTime(dist)
    estimatedFare.value = Math.round(35 + dist * 12)
  }

  function handleRouteCalculated(info: { distance: number; duration: number }): void {
    estimatedDistance.value = info.distance
    estimatedTime.value = info.duration
    estimatedFare.value = Math.round(35 + info.distance * 12)
  }

  async function checkActiveRide(): Promise<void> {
    if (!authStore.user?.id) return
    
    const { data, error } = await supabase
      .from('ride_requests')
      .select(`
        *,
        provider:provider_id (
          id, user_id, vehicle_type, vehicle_plate, vehicle_color, rating, total_trips, current_lat, current_lng,
          users:user_id (name, phone, avatar_url)
        )
      `)
      .eq('user_id', authStore.user.id)
      .in('status', ['pending', 'matched', 'arriving', 'picked_up', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return

    if (data) {
      activeRide.value = data
      const provider = (data as Record<string, unknown>).provider as Record<string, unknown> | undefined
      if (provider) {
        const user = provider.users as Record<string, unknown> | undefined
        matchedDriver.value = {
          id: String(provider.id),
          name: String(user?.name || 'คนขับ'),
          phone: String(user?.phone || ''),
          rating: Number(provider.rating) || 4.8,
          vehicle_type: String(provider.vehicle_type || 'รถยนต์'),
          vehicle_color: String(provider.vehicle_color || 'สีดำ'),
          vehicle_plate: String(provider.vehicle_plate || ''),
          avatar_url: user?.avatar_url as string | undefined,
          current_lat: Number(provider.current_lat),
          current_lng: Number(provider.current_lng)
        }
      }
      currentStep.value = (data as { status: string }).status === 'pending' ? 'searching' : 'tracking'
      setupRealtimeTracking(String((data as { id: string }).id))
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
      }, (payload) => {
        activeRide.value = { ...activeRide.value, ...payload.new }
        if (payload.new.status === 'completed') {
          currentStep.value = 'rating'
        } else if (payload.new.status === 'cancelled') {
          resetAll()
        } else if (payload.new.status !== 'pending') {
          currentStep.value = 'tracking'
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
        1
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
    isSubmittingRating.value = true
    try {
      const success = await rideStore.submitRating(userRating.value, 0)
      if (success) resetAll()
    } catch (error) {
      console.error('[RideRequest] Submit rating error:', error)
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
