<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import MapView from '../components/MapView.vue'
import ChatModal from '../components/ChatModal.vue'
import SafetyModal from '../components/SafetyModal.vue'
import FareSplitModal from '../components/FareSplitModal.vue'
import VoiceCallModal from '../components/VoiceCallModal.vue'
import LocationPermissionModal from '../components/LocationPermissionModal.vue'
import RideInputStep from '../components/ride/RideInputStep.vue'
import VehicleSelectStep from '../components/ride/VehicleSelectStep.vue'
import SearchingStep from '../components/ride/SearchingStep.vue'
import DriverMatchedStep from '../components/ride/DriverMatchedStep.vue'
import RidingStep from '../components/ride/RidingStep.vue'
import RideRatingModal from '../components/ride/RideRatingModal.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useServices } from '../composables/useServices'
import { useRideStore } from '../stores/ride'
import { useAdvancedFeatures } from '../composables/useAdvancedFeatures'
import { useToast } from '../composables/useToast'

// Constants
const DRIVER_SEARCH_TIMEOUT = 2500
const DEFAULT_LOCATION = { lat: 13.7563, lng: 100.5018, address: 'กรุงเทพฯ' }

// Types
type RideStep = 'input' | 'select' | 'searching' | 'matched' | 'riding'

interface Stop {
  id: string
  address: string
  lat?: number
  lng?: number
  contactName?: string
  contactPhone?: string
}

interface RideSubscription {
  unsubscribe: () => void
}

const router = useRouter()
const rideStore = useRideStore()
const { reverseGeocode, getCurrentPosition, shouldShowPermissionModal } = useLocation()

// Location permission modal
const showLocationPermission = ref(false)
const pendingLocationAction = ref<'gps' | null>(null)
const {
  recentPlaces,
  currentDriver,
  homePlace,
  workPlace,
  fetchSavedPlaces,
  fetchRecentPlaces,
  validatePromoCode,
  createRide,
  findDriver,
  cancelRide: cancelRideService,
  submitRating: submitRatingService,
  subscribeToRide
} = useServices()

// State
const step = ref<RideStep>('input')
const pickup = ref('')
const destination = ref('')
const selectedVehicle = ref('standard')
const routeInfo = ref<{ distance: number; duration: number } | null>(null)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

// Location state
const pickupLocation = ref<GeoLocation | null>(null)
const destinationLocation = ref<GeoLocation | null>(null)

// Promo state
const promoCode = ref('')
const promoApplied = ref(false)
const promoDiscount = ref(0)
const scheduledTime = ref('')

// Ride state
const rideProgress = ref(35)
const currentRideId = ref('')
const multiStops = ref<Stop[]>([])

// Subscriptions - properly typed for cleanup
const subscriptions = ref<RideSubscription[]>([])

// Modal states
const showChatModal = ref(false)
const showSafetyModal = ref(false)
const showFareSplit = ref(false)
const showVoiceCall = ref(false)
const showRating = ref(false)

// Advanced features
const { initiateVoiceCall, createFareSplit } = useAdvancedFeatures()

// Vehicle options for ride service
const vehicleOptions = [
  { id: 'standard', name: 'ThaiRide', desc: '4 ที่นั่ง', price: 45, time: 3 },
  { id: 'premium', name: 'Premium', desc: 'รถหรู', price: 85, time: 5 },
  { id: 'moto', name: 'Moto', desc: '1 ที่นั่ง', price: 25, time: 2 },
  { id: 'xl', name: 'ThaiRide XL', desc: '6 ที่นั่ง', price: 75, time: 4 }
]

// Calculate price based on distance
const estimatedPrice = computed(() => {
  const base = vehicleOptions.find((v) => v.id === selectedVehicle.value)?.price || 45
  const distance = routeInfo.value?.distance || 5
  return Math.round(base + distance * 8)
})

// Final price with discount
const finalPrice = computed(() => {
  return Math.max(0, estimatedPrice.value - promoDiscount.value)
})

// Driver info with fallback
const driver = computed(() => {
  if (currentDriver.value) {
    return currentDriver.value
  }
  return {
    name: 'กำลังค้นหา...',
    photo: '',
    rating: 0,
    trips: 0,
    vehicle: '',
    color: '',
    plate: '',
    eta: 0
  }
})

// Cleanup all subscriptions
const cleanupSubscriptions = () => {
  subscriptions.value.forEach(sub => {
    try {
      sub.unsubscribe()
    } catch (e) {
      console.warn('Error unsubscribing:', e)
    }
  })
  subscriptions.value = []
}

// Initialize on mount
onMounted(async () => {
  // Set default location immediately for stability
  if (!pickupLocation.value) {
    pickupLocation.value = DEFAULT_LOCATION
    pickup.value = DEFAULT_LOCATION.address
  }

  // Fetch places in background (non-blocking) - use cached data first
  // These functions already have deduplication and caching built-in
  fetchSavedPlaces().catch(() => [])
  fetchRecentPlaces().catch(() => [])

  // Restore active ride from database if exists
  if (rideStore.currentRide) {
    try {
      const ride = rideStore.currentRide
      currentRideId.value = ride.id
      pickup.value = ride.pickup_address || DEFAULT_LOCATION.address
      destination.value = ride.destination_address || ''
      pickupLocation.value = {
        lat: ride.pickup_lat || DEFAULT_LOCATION.lat,
        lng: ride.pickup_lng || DEFAULT_LOCATION.lng,
        address: ride.pickup_address || DEFAULT_LOCATION.address
      }
      if (ride.destination_lat && ride.destination_lng) {
        destinationLocation.value = {
          lat: ride.destination_lat,
          lng: ride.destination_lng,
          address: ride.destination_address || ''
        }
      }

      // Set step based on ride status
      const status = ride.status
      if (status === 'pending') {
        step.value = 'searching'
      } else if (status === 'matched' || status === 'pickup') {
        step.value = 'matched'
      } else if (status === 'in_progress') {
        step.value = 'riding'
      }

      // Subscribe to ride updates with error handling
      try {
        const subscription = subscribeToRide(ride.id, (newStatus) => {
          if (newStatus === 'matched') {
            step.value = 'matched'
          } else if (newStatus === 'in_progress') {
            step.value = 'riding'
          } else if (newStatus === 'completed') {
            showRating.value = true
          } else if (newStatus === 'cancelled') {
            resetRideState()
          }
        })
        subscriptions.value.push(subscription)
      } catch (subError) {
        console.warn('Error subscribing to ride:', subError)
      }
    } catch (restoreError) {
      console.warn('Error restoring ride state:', restoreError)
      resetRideState()
    }
  }

  // Get current location in background (non-blocking)
  if (!rideStore.currentRide) {
    centerOnCurrentLocation().catch(() => {
      // Already have default location set above
      console.warn('Using default location')
    })
  }
})

// Cleanup on unmount
onUnmounted(() => {
  cleanupSubscriptions()
})



// Handle location detected from map
const onLocationDetected = async (location: { lat: number; lng: number }) => {
  // Set location immediately with loading state
  pickupLocation.value = {
    lat: location.lat,
    lng: location.lng,
    address: 'กำลังค้นหาที่อยู่...'
  }
  pickup.value = 'กำลังค้นหาที่อยู่...'
  
  // Reverse geocode to get actual address
  try {
    const address = await reverseGeocode(location.lat, location.lng)
    // Format address to show meaningful name (soi, road, district)
    const formattedAddress = formatThaiAddress(address)
    pickupLocation.value = {
      lat: location.lat,
      lng: location.lng,
      address: address
    }
    pickup.value = formattedAddress
  } catch {
    // Fallback to generic text if geocoding fails (don't show coordinates)
    pickup.value = 'ตำแหน่งปัจจุบัน'
    pickupLocation.value = {
      lat: location.lat,
      lng: location.lng,
      address: 'ตำแหน่งปัจจุบัน'
    }
  }
}

// Format Thai address to show meaningful short name
const formatThaiAddress = (fullAddress: string): string => {
  if (!fullAddress) return 'ไม่ทราบที่อยู่'
  
  // Split by comma and get meaningful parts
  const parts = fullAddress.split(',').map(p => p.trim())
  
  // Look for soi, road, or district
  const meaningfulParts: string[] = []
  
  for (const part of parts) {
    const lower = part.toLowerCase()
    // Skip country, province, postal code
    if (lower.includes('thailand') || lower.includes('ประเทศไทย')) continue
    if (/^\d{5}$/.test(part)) continue // postal code
    if (lower.includes('bangkok') && meaningfulParts.length > 0) continue
    if (lower.includes('กรุงเทพ') && meaningfulParts.length > 0) continue
    
    meaningfulParts.push(part)
    if (meaningfulParts.length >= 2) break
  }
  
  return meaningfulParts.length > 0 ? meaningfulParts.join(', ') : parts[0] || 'ไม่ทราบที่อยู่'
}

// GPS button handler - get current location with real address
const centerOnCurrentLocation = async () => {
  // Check if we should show permission modal first
  const shouldShow = await shouldShowPermissionModal()
  if (shouldShow) {
    pendingLocationAction.value = 'gps'
    showLocationPermission.value = true
    return
  }

  await executeGetCurrentLocation()
}

// Execute GPS location fetch
const executeGetCurrentLocation = async () => {
  loading.value = true
  pickup.value = 'กำลังค้นหาตำแหน่ง...'
  
  try {
    // Use the composable with retry mechanism
    const location = await getCurrentPosition()
    
    pickupLocation.value = {
      lat: location.lat,
      lng: location.lng,
      address: location.address
    }
    
    // Format address to show meaningful name
    pickup.value = formatThaiAddress(location.address)
  } catch (error: any) {
    console.warn('Geolocation error:', error)
    errorMessage.value = error.message || 'ไม่สามารถระบุตำแหน่งได้'
    pickup.value = ''
    setTimeout(() => { errorMessage.value = null }, 3000)
  } finally {
    loading.value = false
  }
}

// Handle permission modal responses
const handleLocationPermissionAllow = async () => {
  showLocationPermission.value = false
  if (pendingLocationAction.value === 'gps') {
    await executeGetCurrentLocation()
  }
  pendingLocationAction.value = null
}

const handleLocationPermissionDeny = () => {
  showLocationPermission.value = false
  pendingLocationAction.value = null
}

// Route calculation handler
const onRouteCalculated = (data: { distance: number; duration: number }) => {
  routeInfo.value = data
}

// Select saved place (home/work)
const selectSavedPlace = (type: 'home' | 'work') => {
  const place = type === 'home' ? homePlace.value : workPlace.value
  if (place) {
    destination.value = place.name
    destinationLocation.value = {
      lat: place.lat,
      lng: place.lng,
      address: place.address
    }
  } else {
    // แสดง toast แจ้งผู้ใช้และไปหน้าเพิ่มสถานที่
    const toast = useToast()
    const label = type === 'home' ? 'บ้าน' : 'ที่ทำงาน'
    toast.info(`กรุณาเพิ่มที่อยู่${label}ก่อน`)
    router.push({ path: '/saved-places', query: { add: type } })
  }
}

// Select recent place
const selectRecentPlace = (place: { name: string; address: string; lat?: number; lng?: number }) => {
  destination.value = place.name
  if (place.lat && place.lng) {
    destinationLocation.value = {
      lat: place.lat,
      lng: place.lng,
      address: place.address
    }
  }
}

// Select search result from place search API
const selectSearchResult = (place: { name: string; address: string; lat: number; lng: number }) => {
  destination.value = place.name
  destinationLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.address
  }
}

// Confirm destination and move to vehicle selection
const confirmDestination = () => {
  if (!pickup.value || !destination.value) return
  
  // Generate destination location if not set
  if (!destinationLocation.value) {
    const lat = (pickupLocation.value?.lat || DEFAULT_LOCATION.lat) + (Math.random() - 0.5) * 0.05
    const lng = (pickupLocation.value?.lng || DEFAULT_LOCATION.lng) + (Math.random() - 0.5) * 0.05
    destinationLocation.value = { lat, lng, address: destination.value }
  }
  step.value = 'select'
}

// Apply promo code
const applyPromo = async (code: string) => {
  if (!code) return
  
  loading.value = true
  try {
    const result = await validatePromoCode(code, estimatedPrice.value)
    
    if (result.is_valid) {
      promoApplied.value = true
      promoDiscount.value = result.discount_amount
      promoCode.value = code
    } else {
      errorMessage.value = result.message || 'โค้ดไม่ถูกต้อง'
      setTimeout(() => { errorMessage.value = null }, 3000)
    }
  } catch (e) {
    errorMessage.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    setTimeout(() => { errorMessage.value = null }, 3000)
  } finally {
    loading.value = false
  }
}

// Remove promo
const removePromo = () => {
  promoApplied.value = false
  promoDiscount.value = 0
  promoCode.value = ''
}

// Get scheduled date time
const getScheduledDateTime = (): string => {
  const now = new Date()
  switch (scheduledTime.value) {
    case '15min':
      now.setMinutes(now.getMinutes() + 15)
      break
    case '30min':
      now.setMinutes(now.getMinutes() + 30)
      break
    case '1hr':
      now.setHours(now.getHours() + 1)
      break
  }
  return now.toISOString()
}

// Request ride with timeout protection
const requestRide = async () => {
  if (!pickupLocation.value || !destinationLocation.value) {
    errorMessage.value = 'กรุณาระบุจุดรับและจุดหมาย'
    setTimeout(() => { errorMessage.value = null }, 3000)
    return
  }

  step.value = 'searching'
  loading.value = true
  errorMessage.value = null

  // Timeout protection - auto fallback after 10 seconds
  const timeoutId = setTimeout(() => {
    if (step.value === 'searching') {
      console.warn('Ride request timeout - using demo mode')
      step.value = 'matched'
      loading.value = false
    }
  }, 10000)

  try {
    const rideType = selectedVehicle.value === 'premium' ? 'premium' : 'standard'
    const ride = await createRide({
      pickup: {
        lat: pickupLocation.value.lat,
        lng: pickupLocation.value.lng,
        address: pickup.value
      },
      destination: {
        lat: destinationLocation.value.lat,
        lng: destinationLocation.value.lng,
        address: destination.value
      },
      rideType: rideType as 'standard' | 'premium',
      scheduledTime: scheduledTime.value ? getScheduledDateTime() : undefined,
      promoCode: promoApplied.value ? promoCode.value : undefined
    })

    clearTimeout(timeoutId)

    if (ride) {
      currentRideId.value = ride.id

      // Subscribe to ride updates with error handling
      try {
        const subscription = subscribeToRide(ride.id, (status) => {
          if (status === 'matched') {
            step.value = 'matched'
          } else if (status === 'in_progress') {
            step.value = 'riding'
          } else if (status === 'completed') {
            showRating.value = true
          }
        })
        subscriptions.value.push(subscription)
      } catch (subError) {
        console.warn('Subscription error:', subError)
      }

      // Find driver with timeout
      const driverTimeout = setTimeout(() => {
        if (step.value === 'searching') {
          step.value = 'matched'
        }
      }, DRIVER_SEARCH_TIMEOUT)

      try {
        const foundDriver = await findDriver()
        clearTimeout(driverTimeout)
        if (foundDriver) {
          step.value = 'matched'
        }
      } catch (driverError) {
        clearTimeout(driverTimeout)
        console.warn('Driver search error:', driverError)
        step.value = 'matched' // Fallback to demo
      }
    } else {
      // Fallback for demo without auth
      setTimeout(() => {
        step.value = 'matched'
      }, DRIVER_SEARCH_TIMEOUT)
    }
  } catch (e: any) {
    clearTimeout(timeoutId)
    console.error('Error requesting ride:', e)
    errorMessage.value = e.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    step.value = 'select'
  } finally {
    loading.value = false
  }
}

// Cancel ride
const cancelRide = async () => {
  try {
    await cancelRideService()
  } catch (e) {
    console.warn('Error cancelling ride:', e)
  }
  
  cleanupSubscriptions()
  resetRideState()
}

// Reset ride state
const resetRideState = () => {
  step.value = 'input'
  destinationLocation.value = null
  routeInfo.value = null
  destination.value = ''
  promoApplied.value = false
  promoDiscount.value = 0
  promoCode.value = ''
  scheduledTime.value = ''
  currentRideId.value = ''
}

// Complete ride (demo)
const completeRide = () => {
  showRating.value = true
}

// Submit rating
const handleRatingSubmit = async (rating: number, tip: number) => {
  try {
    if (rating > 0) {
      await submitRatingService(rating, tip)
    }
  } catch (e) {
    console.warn('Error submitting rating:', e)
  }
  
  cleanupSubscriptions()
  showRating.value = false
  resetRideState()
}

// Fare split handler
const handleFareSplitConfirm = async (participants: Array<{ phone?: string; email?: string; amount: number }>) => {
  if (currentRideId.value && finalPrice.value > 0) {
    try {
      await createFareSplit(currentRideId.value, finalPrice.value, participants, 'custom')
    } catch (e) {
      console.warn('Error creating fare split:', e)
    }
  }
  showFareSplit.value = false
}

// Voice call handlers
const openVoiceCall = async () => {
  if (currentDriver.value?.id) {
    try {
      await initiateVoiceCall(currentRideId.value, currentDriver.value.id, 'provider')
    } catch (e) {
      console.warn('Error initiating voice call:', e)
    }
  }
  showVoiceCall.value = true
}

const openChat = () => {
  currentRideId.value = currentRideId.value || rideStore.currentRide?.id || 'demo-ride'
  showChatModal.value = true
}

const openSafety = () => {
  currentRideId.value = currentRideId.value || rideStore.currentRide?.id || 'demo-ride'
  showSafetyModal.value = true
}

// Navigation
const goBack = () => {
  if (step.value === 'select') {
    step.value = 'input'
    destinationLocation.value = null
    routeInfo.value = null
  } else if (step.value === 'matched') {
    step.value = 'select'
  } else {
    router.back()
  }
}

// Multi-stops update
const handleMultiStopsUpdate = (stops: Stop[]) => {
  multiStops.value = stops
}
</script>

<template>
  <div class="services-page">
    <!-- Error Toast -->
    <div v-if="errorMessage" class="error-toast">
      {{ errorMessage }}
    </div>

    <!-- Map - Full screen background -->
    <div class="map-area">
      <MapView
        :pickup="pickupLocation"
        :destination="destinationLocation"
        :show-route="!!destinationLocation"
        height="100%"
        @route-calculated="onRouteCalculated"
        @location-detected="onLocationDetected"
      />
      
      <!-- Center pin when selecting destination -->
      <div v-if="step === 'input' && !destinationLocation" class="center-pin">
        <svg width="32" height="40" viewBox="0 0 24 32" fill="none">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="#000"/>
          <circle cx="12" cy="12" r="4" fill="#fff"/>
        </svg>
        <div class="pin-shadow"></div>
      </div>

      <!-- Back button -->
      <button v-if="step !== 'input'" @click="goBack" class="map-back-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>

      <!-- GPS button -->
      <button @click="centerOnCurrentLocation" class="gps-btn" :disabled="loading">
        <svg v-if="!loading" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06z"/>
        </svg>
        <svg v-else class="animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="32"/>
        </svg>
      </button>
    </div>

    <!-- Bottom Sheet -->
    <div :class="['bottom-sheet', `step-${step}`]">
      <!-- Drag handle -->
      <div class="sheet-handle"></div>

      <!-- Step: Input -->
      <RideInputStep
        v-if="step === 'input'"
        :pickup="pickup"
        :destination="destination"
        :home-place="homePlace || null"
        :work-place="workPlace || null"
        :recent-places="recentPlaces"
        :current-lat="pickupLocation?.lat"
        :current-lng="pickupLocation?.lng"
        @update:pickup="pickup = $event"
        @update:destination="destination = $event"
        @update:multiStops="handleMultiStopsUpdate"
        @confirm="confirmDestination"
        @select-saved-place="selectSavedPlace"
        @select-recent-place="selectRecentPlace"
        @select-search-result="selectSearchResult"
      />

      <!-- Step: Select vehicle -->
      <VehicleSelectStep
        v-else-if="step === 'select'"
        :pickup="pickup"
        :destination="destination"
        :route-info="routeInfo"
        :vehicle-options="vehicleOptions"
        :selected-vehicle="selectedVehicle"
        :estimated-price="estimatedPrice"
        :final-price="finalPrice"
        :promo-applied="promoApplied"
        :promo-discount="promoDiscount"
        @update:selectedVehicle="selectedVehicle = $event"
        @request-ride="requestRide"
        @apply-promo="applyPromo"
        @remove-promo="removePromo"
        @update:scheduledTime="scheduledTime = $event"
        @open-fare-split="showFareSplit = true"
      />

      <!-- Step: Searching -->
      <SearchingStep
        v-else-if="step === 'searching'"
        @cancel="cancelRide"
      />

      <!-- Step: Matched -->
      <DriverMatchedStep
        v-else-if="step === 'matched'"
        :driver="driver"
        @call="openVoiceCall"
        @chat="openChat"
        @safety="openSafety"
        @cancel="cancelRide"
      />

      <!-- Step: Riding -->
      <RidingStep
        v-else-if="step === 'riding'"
        :destination="destination"
        :duration="routeInfo?.duration || 15"
        :progress="rideProgress"
        @chat="openChat"
        @safety="openSafety"
        @complete="completeRide"
      />
    </div>

    <!-- Modals -->
    <ChatModal
      :ride-id="currentRideId"
      :driver-name="driver.name"
      :show="showChatModal"
      @close="showChatModal = false"
    />

    <SafetyModal
      :ride-id="currentRideId"
      :show="showSafetyModal"
      :current-location="pickupLocation ? { lat: pickupLocation.lat, lng: pickupLocation.lng } : undefined"
      @close="showSafetyModal = false"
    />

    <FareSplitModal
      :show="showFareSplit"
      :total-amount="finalPrice"
      @close="showFareSplit = false"
      @confirm="handleFareSplitConfirm"
    />

    <VoiceCallModal
      :show="showVoiceCall"
      :driver-name="driver.name"
      :driver-phone="'081-234-5678'"
      :ride-id="currentRideId || 'demo-ride'"
      @close="showVoiceCall = false"
      @end="showVoiceCall = false"
    />

    <RideRatingModal
      :show="showRating"
      :driver-name="driver.name"
      :final-price="finalPrice"
      @close="showRating = false"
      @submit="handleRatingSubmit"
    />

    <!-- Location Permission Modal -->
    <LocationPermissionModal
      :show="showLocationPermission"
      @allow="handleLocationPermissionAllow"
      @deny="handleLocationPermissionDeny"
    />
  </div>
</template>

<style scoped>
.services-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F6F6F6;
  overflow: hidden;
}

/* Error Toast */
.error-toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #E11900;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 1100;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Map Area */
.map-area {
  flex: 1;
  position: relative;
  min-height: 40vh;
}

.map-area :deep(.map-wrapper) {
  border-radius: 0;
  height: 100% !important;
}

.center-pin {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -100%);
  z-index: 100;
  pointer-events: none;
}

.pin-shadow {
  width: 12px;
  height: 6px;
  background: rgba(0,0,0,0.2);
  border-radius: 50%;
  margin: 4px auto 0;
}

.map-back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 52px;
  height: 52px;
  background: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  cursor: pointer;
  z-index: 100;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.map-back-btn:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,0.16);
}

.map-back-btn:active {
  transform: scale(0.92);
  background: #F6F6F6;
}

.map-back-btn svg {
  width: 26px;
  height: 26px;
  stroke-width: 2;
}

.gps-btn {
  position: absolute;
  bottom: 24px;
  right: 16px;
  width: 52px;
  height: 52px;
  background: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  cursor: pointer;
  z-index: 100;
  transition: all 0.2s ease;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.gps-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(0,0,0,0.16);
}

.gps-btn:active:not(:disabled) {
  transform: scale(0.92);
  background: #F6F6F6;
}

.gps-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.gps-btn svg {
  width: 24px;
  height: 24px;
  stroke-width: 1.5;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Bottom Sheet */
.bottom-sheet {
  background: white;
  border-radius: 28px 28px 0 0;
  padding: 16px 20px 28px;
  padding-bottom: calc(28px + env(safe-area-inset-bottom));
  box-shadow: 0 -12px 40px rgba(0,0,0,0.12);
  transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
  max-height: 70vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.sheet-handle {
  width: 48px;
  height: 5px;
  background: #E0E0E0;
  border-radius: 3px;
  margin: 0 auto 20px;
  cursor: grab;
  touch-action: none;
}
</style>
