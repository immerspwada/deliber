<script setup lang="ts">
/**
 * Feature: F02 - Customer Ride Booking (Redesigned UX/UI)
 * MUNEEF Style - Clean, Friendly, Easy to Understand
 * 
 * Flow: 1.ไปไหน? → 2.รับที่ไหน? → 3.เลือกรถ → 4.ยืนยัน
 * 
 * Design Principles:
 * - Progressive disclosure (แสดงข้อมูลทีละขั้น)
 * - Clear visual hierarchy
 * - Friendly micro-interactions
 * - Accessible touch targets (min 44px)
 */
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useRideStore } from '../../stores/ride'
import { useAuthStore } from '../../stores/auth'
import { useServices } from '../../composables/useServices'
import { useLocation, type GeoLocation } from '../../composables/useLocation'
import { useSurgePricing } from '../../composables/useSurgePricing'
import MapView from '../../components/MapView.vue'
import RideTracker from '../../components/RideTracker.vue'

const router = useRouter()
const rideStore = useRideStore()
const authStore = useAuthStore()
const { calculateDistance, calculateTravelTime } = useLocation()
const { calculateSurge, currentMultiplier } = useSurgePricing()
const { 
  savedPlaces, 
  recentPlaces, 
  homePlace, 
  workPlace, 
  fetchSavedPlaces, 
  fetchRecentPlaces 
} = useServices()

// ============================================
// STATE MANAGEMENT
// ============================================

// Core booking state
const pickupLocation = ref<GeoLocation | null>(null)
const destinationLocation = ref<GeoLocation | null>(null)
const pickupAddress = ref('')
const destinationAddress = ref('')
const rideType = ref<'standard' | 'premium' | 'shared'>('standard')
const passengerCount = ref(1)
const paymentMethod = ref<'cash' | 'wallet'>('cash')
const specialRequests = ref('')

// UI state
const currentStep = ref<'destination' | 'pickup' | 'vehicle' | 'confirm'>('destination')
const isLoading = ref(false)
const isBooking = ref(false)
const isGettingLocation = ref(false)
const showSearchSheet = ref(false)
const searchType = ref<'pickup' | 'destination'>('destination')
const searchQuery = ref('')
const isLoadingPlaces = ref(true) // Loading state for saved places

// Fare calculation
const estimatedFare = ref(0)
const estimatedTime = ref(0)
const estimatedDistance = ref(0)

// Active ride tracking
const activeRide = ref<any>(null)
const viewMode = ref<'booking' | 'tracking'>('booking')

// Animation states
const isTransitioning = ref(false)
const slideDirection = ref<'left' | 'right'>('left')

// ============================================
// COMPUTED PROPERTIES
// ============================================

const stepProgress = computed(() => {
  const steps = ['destination', 'pickup', 'vehicle', 'confirm']
  return ((steps.indexOf(currentStep.value) + 1) / steps.length) * 100
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 'destination': return !!destinationLocation.value
    case 'pickup': return !!pickupLocation.value
    case 'vehicle': return true
    case 'confirm': return true
    default: return false
  }
})

const hasRoute = computed(() => 
  !!(pickupLocation.value && destinationLocation.value && estimatedDistance.value > 0)
)

const finalFare = computed(() => {
  let fare = estimatedFare.value
  if (currentMultiplier.value > 1) {
    fare = fare * currentMultiplier.value
  }
  return Math.round(fare)
})

const selectedVehicle = computed(() => 
  vehicleTypes.find(v => v.id === rideType.value) || vehicleTypes[0]
)

const favoritePlaces = computed(() => 
  savedPlaces.value.filter(p => p.place_type === 'other').slice(0, 3)
)

// ============================================
// VEHICLE TYPES
// ============================================

const vehicleTypes = [
  {
    id: 'standard',
    name: 'มาตรฐาน',
    description: 'สะดวก ประหยัด',
    icon: 'car',
    multiplier: 1.0,
    eta: '2-4 นาที',
    capacity: 4,
    features: ['เบาะนั่งสบาย', 'แอร์เย็น']
  },
  {
    id: 'premium',
    name: 'พรีเมียม',
    description: 'หรูหรา สะดวกสบาย',
    icon: 'premium',
    multiplier: 1.5,
    eta: '3-5 นาที',
    capacity: 4,
    features: ['รถหรู', 'น้ำดื่มฟรี', 'ชาร์จมือถือ']
  },
  {
    id: 'shared',
    name: 'แชร์',
    description: 'ประหยัดสุด',
    icon: 'share',
    multiplier: 0.7,
    eta: '5-10 นาที',
    capacity: 2,
    features: ['ร่วมเดินทาง', 'ราคาถูก']
  }
] as const

// ============================================
// LIFECYCLE
// ============================================

onMounted(async () => {
  console.log('[RideBooking] onMounted - Starting initialization')
  console.log('[RideBooking] authStore.user:', authStore.user?.id)
  
  // Check for pending destination from home
  const pendingDest = rideStore.consumeDestination()
  if (pendingDest) {
    destinationLocation.value = pendingDest
    destinationAddress.value = pendingDest.address
    currentStep.value = 'pickup'
  }

  // Wait for auth to be ready, then fetch data
  isLoadingPlaces.value = true
  
  // Try to initialize immediately if user exists
  if (authStore.user?.id) {
    console.log('[RideBooking] User found, initializing data')
    await initializeUserData()
  } else {
    console.log('[RideBooking] No user yet, waiting 500ms...')
    // Wait a bit for auth to initialize, then try again
    await new Promise(resolve => setTimeout(resolve, 500))
    if (authStore.user?.id) {
      console.log('[RideBooking] User found after wait, initializing data')
      await initializeUserData()
    } else {
      console.log('[RideBooking] Still no user, fetching places anyway (cache/demo mode)')
      // Still no user - fetch places anyway (will use cache/demo mode)
      await Promise.all([
        fetchSavedPlaces(),
        fetchRecentPlaces(5)
      ])
    }
  }
  
  console.log('[RideBooking] Saved places loaded:', savedPlaces.value.length)
  console.log('[RideBooking] Recent places loaded:', recentPlaces.value.length)
  console.log('[RideBooking] Home place:', homePlace.value)
  console.log('[RideBooking] Work place:', workPlace.value)
  
  isLoadingPlaces.value = false
})

// Helper function to initialize user data
const initializeUserData = async () => {
  await rideStore.initialize(authStore.user!.id)
  
  // Check for active ride
  if (rideStore.hasActiveRide && rideStore.currentRide) {
    activeRide.value = rideStore.currentRide
    viewMode.value = 'tracking'
  }
  
  // Fetch saved places
  await Promise.all([
    fetchSavedPlaces(),
    fetchRecentPlaces(5)
  ])
}

onUnmounted(() => {
  rideStore.unsubscribeAll()
})

// ============================================
// HAPTIC FEEDBACK
// ============================================

const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 }
    navigator.vibrate(patterns[type])
  }
}

// ============================================
// NAVIGATION
// ============================================

const goBack = () => {
  haptic('light')
  slideDirection.value = 'right'
  
  switch (currentStep.value) {
    case 'pickup':
      currentStep.value = 'destination'
      break
    case 'vehicle':
      currentStep.value = 'pickup'
      break
    case 'confirm':
      currentStep.value = 'vehicle'
      break
    default:
      // กลับไปหน้าหลัก Customer
      router.push('/customer')
  }
}

const goNext = async () => {
  if (!canProceed.value) return
  
  haptic('medium')
  slideDirection.value = 'left'
  isTransitioning.value = true
  
  await nextTick()
  
  switch (currentStep.value) {
    case 'destination':
      currentStep.value = 'pickup'
      break
    case 'pickup':
      await calculateFare()
      currentStep.value = 'vehicle'
      break
    case 'vehicle':
      currentStep.value = 'confirm'
      break
    case 'confirm':
      await bookRide()
      break
  }
  
  setTimeout(() => {
    isTransitioning.value = false
  }, 300)
}

// ============================================
// LOCATION HANDLERS
// ============================================

const useCurrentLocation = async () => {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง')
    return
  }
  
  isGettingLocation.value = true
  haptic('medium')
  
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000
      })
    })
    
    const loc: GeoLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      address: 'ตำแหน่งปัจจุบัน'
    }
    
    pickupLocation.value = loc
    pickupAddress.value = loc.address
    
    await calculateSurge(loc.lat, loc.lng)
    haptic('heavy')
    
    // Auto advance to next step
    await new Promise(resolve => setTimeout(resolve, 200))
    goNext()
    
  } catch {
    alert('ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่')
  } finally {
    isGettingLocation.value = false
  }
}

const selectPlace = async (place: { name: string; address: string; lat: number; lng: number }, type: 'pickup' | 'destination') => {
  haptic('light')
  
  const loc: GeoLocation = {
    lat: place.lat,
    lng: place.lng,
    address: place.name
  }
  
  if (type === 'destination') {
    destinationLocation.value = loc
    destinationAddress.value = place.name
    showSearchSheet.value = false
    
    // Auto advance
    await new Promise(resolve => setTimeout(resolve, 150))
    goNext()
  } else {
    pickupLocation.value = loc
    pickupAddress.value = place.name
    showSearchSheet.value = false
    
    await calculateSurge(loc.lat, loc.lng)
    await new Promise(resolve => setTimeout(resolve, 150))
    goNext()
  }
}

const openSearch = (type: 'pickup' | 'destination') => {
  haptic('light')
  searchType.value = type
  searchQuery.value = ''
  showSearchSheet.value = true
}

// ============================================
// FARE CALCULATION
// ============================================

const calculateFare = async () => {
  if (!pickupLocation.value || !destinationLocation.value) return
  
  isLoading.value = true
  
  try {
    // Calculate distance
    if (estimatedDistance.value === 0) {
      estimatedDistance.value = calculateDistance(
        pickupLocation.value.lat, pickupLocation.value.lng,
        destinationLocation.value.lat, destinationLocation.value.lng
      )
      estimatedTime.value = calculateTravelTime(estimatedDistance.value)
    }
    
    // Calculate fare
    estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, rideType.value)
    
  } finally {
    isLoading.value = false
  }
}

const selectVehicle = (type: 'standard' | 'premium' | 'shared') => {
  haptic('light')
  rideType.value = type
  
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, type)
  }
}

// ============================================
// BOOKING
// ============================================

const bookRide = async () => {
  if (!pickupLocation.value || !destinationLocation.value) return
  
  if (!authStore.user) {
    router.push('/login')
    return
  }
  
  isBooking.value = true
  haptic('heavy')
  
  try {
    const ride = await rideStore.createRideRequest(
      authStore.user.id,
      pickupLocation.value,
      destinationLocation.value,
      rideType.value,
      passengerCount.value,
      specialRequests.value || undefined
    )
    
    if (ride) {
      activeRide.value = rideStore.currentRide
      viewMode.value = 'tracking'
      await rideStore.findAndMatchDriver()
    } else {
      alert(rideStore.error || 'ไม่สามารถจองรถได้ กรุณาลองใหม่')
    }
  } catch (error) {
    console.error('Booking error:', error)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  } finally {
    isBooking.value = false
  }
}

const cancelRide = async () => {
  if (!activeRide.value) return
  
  if (confirm('ต้องการยกเลิกการเดินทางนี้หรือไม่?')) {
    haptic('medium')
    const success = await rideStore.cancelRide(activeRide.value.id)
    if (success) {
      resetBooking()
    } else {
      alert('ไม่สามารถยกเลิกได้ กรุณาลองใหม่')
    }
  }
}

const handleRideComplete = () => {
  router.push(`/customer/receipt/${activeRide.value?.id}`)
  resetBooking()
}

const resetBooking = () => {
  activeRide.value = null
  viewMode.value = 'booking'
  currentStep.value = 'destination'
  pickupLocation.value = null
  destinationLocation.value = null
  pickupAddress.value = ''
  destinationAddress.value = ''
  estimatedFare.value = 0
  estimatedDistance.value = 0
  estimatedTime.value = 0
}

// Watch for vehicle type changes
watch(rideType, () => {
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, rideType.value)
  }
})

const handleRouteCalculated = (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
  estimatedTime.value = data.duration
}
</script>

<template>
  <div class="ride-booking">
    <!-- Tracking Mode -->
    <template v-if="viewMode === 'tracking' && activeRide">
      <RideTracker
        :ride="activeRide"
        :provider="rideStore.matchedDriver as any"
        @cancel="cancelRide"
        @complete="handleRideComplete"
      />
    </template>

    <!-- Booking Mode -->
    <template v-else>
      <!-- Map Background -->
      <div class="map-container">
        <MapView
          :pickup="pickupLocation"
          :destination="destinationLocation"
          :show-route="hasRoute"
          height="100%"
          @route-calculated="handleRouteCalculated"
        />
        
        <!-- Floating Header -->
        <header class="floating-header">
          <button class="header-btn" @click="goBack" aria-label="กลับ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          
          <div class="header-logo">
            <!-- Cute Logo Icon -->
            <svg viewBox="0 0 32 32" fill="none" class="logo-icon">
              <circle cx="16" cy="16" r="13" stroke="#00A86B" stroke-width="2"/>
              <circle cx="16" cy="16" r="8" fill="#E8F5EF"/>
              <path d="M11 16L14 19L21 12" stroke="#00A86B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="24" cy="8" r="2" fill="#00A86B" opacity="0.5"/>
              <circle cx="8" cy="10" r="1.5" fill="#00A86B" opacity="0.4"/>
            </svg>
            <span class="logo-text">เรียกรถ</span>
          </div>
          
          <div class="header-spacer"></div>
        </header>
      </div>

      <!-- Bottom Sheet -->
      <div class="bottom-sheet" :class="{ expanded: currentStep === 'vehicle' || currentStep === 'confirm' }">
        <!-- Handle -->
        <div class="sheet-handle">
          <div class="handle-bar"></div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${stepProgress}%` }"></div>
          </div>
          <div class="progress-steps">
            <div 
              v-for="(label, index) in ['ไปไหน', 'รับที่ไหน', 'เลือกรถ', 'ยืนยัน']" 
              :key="index"
              class="progress-step"
              :class="{ 
                active: index === ['destination', 'pickup', 'vehicle', 'confirm'].indexOf(currentStep),
                completed: index < ['destination', 'pickup', 'vehicle', 'confirm'].indexOf(currentStep)
              }"
            >
              <div class="step-dot">
                <svg v-if="index < ['destination', 'pickup', 'vehicle', 'confirm'].indexOf(currentStep)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <span class="step-label">{{ label }}</span>
            </div>
          </div>
        </div>

        <!-- Step Content -->
        <div class="step-content">
          <!-- Step 1: Destination -->
          <Transition :name="slideDirection === 'left' ? 'slide-left' : 'slide-right'" mode="out-in">
            <div v-if="currentStep === 'destination'" key="destination" class="step-panel">
              <div class="step-header">
                <div class="step-icon destination">
                  <!-- Cute Location Pin with heart -->
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8 2 5 5.5 5 9.5C5 15 12 22 12 22C12 22 19 15 19 9.5C19 5.5 16 2 12 2Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 7C12 7 10 8.5 10 10C10 11.1 10.9 12 12 12C13.1 12 14 11.1 14 10C14 8.5 12 7 12 7Z" fill="currentColor"/>
                  </svg>
                </div>
                <div class="step-info">
                  <h2>คุณจะไปไหน?</h2>
                  <p>เลือกจุดหมายปลายทาง</p>
                </div>
              </div>

              <!-- Destination Input -->
              <button class="location-input" @click="openSearch('destination')">
                <div class="input-icon red">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                </div>
                <div class="input-content">
                  <span v-if="destinationAddress" class="input-value">{{ destinationAddress }}</span>
                  <span v-else class="input-placeholder">ค้นหาจุดหมาย...</span>
                </div>
                <svg class="input-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <!-- Quick Places -->
              <div class="quick-places">
                <h3 class="section-title">สถานที่บันทึก</h3>
                
                <!-- Loading State -->
                <div v-if="isLoadingPlaces" class="places-loading">
                  <div class="loading-skeleton"></div>
                  <div class="loading-skeleton"></div>
                </div>
                
                <!-- Empty State - No saved places -->
                <div v-else-if="!homePlace && !workPlace && favoritePlaces.length === 0" class="places-empty">
                  <div class="empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
                      <path d="M12 2C8 2 5 5.5 5 9.5C5 15 12 22 12 22C12 22 19 15 19 9.5C19 5.5 16 2 12 2Z"/>
                      <circle cx="12" cy="9.5" r="2.5"/>
                    </svg>
                  </div>
                  <p class="empty-text">ยังไม่มีสถานที่บันทึก</p>
                  <button class="add-place-btn" @click="router.push('/customer/saved-places')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    <span>เพิ่มสถานที่</span>
                  </button>
                </div>
                
                <!-- Places Grid -->
                <div v-else class="places-grid">
                  <!-- Home -->
                  <button 
                    v-if="homePlace"
                    class="place-card"
                    @click="selectPlace(homePlace, 'destination')"
                  >
                    <div class="place-icon home">
                      <!-- Cute Home Icon with chimney -->
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M4 10L12 4L20 10V20C20 20.5 19.5 21 19 21H5C4.5 21 4 20.5 4 20V10Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 21V14H15V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M17 7V4H15V5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        <circle cx="12" cy="10" r="1.5" fill="currentColor" opacity="0.5"/>
                      </svg>
                    </div>
                    <span class="place-name">บ้าน</span>
                  </button>

                  <!-- Work -->
                  <button 
                    v-if="workPlace"
                    class="place-card"
                    @click="selectPlace(workPlace, 'destination')"
                  >
                    <div class="place-icon work">
                      <!-- Cute Building Icon -->
                      <svg viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="6" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/>
                        <path d="M4 10H20" stroke="currentColor" stroke-width="1.5"/>
                        <rect x="8" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
                        <rect x="13" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
                        <path d="M10 22V18H14V22" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M8 3L12 6L16 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                    </div>
                    <span class="place-name">ที่ทำงาน</span>
                  </button>

                  <!-- Favorites -->
                  <button 
                    v-for="place in favoritePlaces"
                    :key="place.id"
                    class="place-card"
                    @click="selectPlace(place, 'destination')"
                  >
                    <div class="place-icon favorite">
                      <!-- Cute Heart Star Icon -->
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 4L14 9H19L15 12.5L16.5 18L12 14.5L7.5 18L9 12.5L5 9H10L12 4Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                        <circle cx="18" cy="5" r="1.5" fill="currentColor" opacity="0.4"/>
                        <circle cx="6" cy="6" r="1" fill="currentColor" opacity="0.3"/>
                      </svg>
                    </div>
                    <span class="place-name">{{ place.name }}</span>
                  </button>
                  
                  <!-- Add Place Button -->
                  <button 
                    class="place-card add-card"
                    @click="router.push('/customer/saved-places')"
                  >
                    <div class="place-icon add">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                    </div>
                    <span class="place-name">เพิ่ม</span>
                  </button>
                </div>
              </div>

              <!-- Recent Places -->
              <div v-if="recentPlaces.length > 0" class="recent-places">
                <h3 class="section-title">ล่าสุด</h3>
                <div class="recent-list">
                  <button 
                    v-for="place in recentPlaces.slice(0, 4)"
                    :key="place.id"
                    class="recent-item"
                    @click="selectPlace(place, 'destination')"
                  >
                    <div class="recent-icon">
                      <!-- Cute Clock Icon -->
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
                        <path d="M12 7V12L15 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                      </svg>
                    </div>
                    <div class="recent-info">
                      <span class="recent-name">{{ place.name }}</span>
                      <span class="recent-address">{{ place.address }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Step 2: Pickup -->
          <Transition :name="slideDirection === 'left' ? 'slide-left' : 'slide-right'" mode="out-in">
            <div v-if="currentStep === 'pickup'" key="pickup" class="step-panel">
              <div class="step-header">
                <div class="step-icon pickup">
                  <!-- Cute GPS/Crosshair Icon -->
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/>
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    <path d="M12 2V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M12 19V22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M2 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M19 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
                <div class="step-info">
                  <h2>รับที่ไหน?</h2>
                  <p>เลือกจุดที่ต้องการให้รถมารับ</p>
                </div>
              </div>

              <!-- Current Location Button -->
              <button 
                class="current-location-btn"
                :class="{ loading: isGettingLocation }"
                @click="useCurrentLocation"
                :disabled="isGettingLocation"
              >
                <div class="btn-icon">
                  <div v-if="isGettingLocation" class="spinner"></div>
                  <!-- Cute GPS/Location Icon -->
                  <svg v-else viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/>
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    <path d="M12 2V5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <path d="M12 19V22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <path d="M2 12H5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                    <path d="M19 12H22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                  </svg>
                </div>
                <div class="btn-content">
                  <span class="btn-title">{{ isGettingLocation ? 'กำลังค้นหา...' : 'ใช้ตำแหน่งปัจจุบัน' }}</span>
                  <span class="btn-subtitle">ระบุตำแหน่งด้วย GPS</span>
                </div>
                <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <!-- Or Divider -->
              <div class="divider">
                <span>หรือ</span>
              </div>

              <!-- Search Pickup -->
              <button class="location-input" @click="openSearch('pickup')">
                <div class="input-icon green">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                </div>
                <div class="input-content">
                  <span v-if="pickupAddress" class="input-value">{{ pickupAddress }}</span>
                  <span v-else class="input-placeholder">ค้นหาจุดรับ...</span>
                </div>
                <svg class="input-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>

              <!-- Saved Places for Pickup -->
              <div v-if="homePlace || workPlace" class="quick-places compact">
                <div class="places-row">
                  <button 
                    v-if="homePlace"
                    class="place-chip"
                    @click="selectPlace(homePlace, 'pickup')"
                  >
                    <!-- Cute Home Icon Mini -->
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M4 10L12 4L20 10V20C20 20.5 19.5 21 19 21H5C4.5 21 4 20.5 4 20V10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M9 21V15H15V21" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <span>บ้าน</span>
                  </button>
                  <button 
                    v-if="workPlace"
                    class="place-chip"
                    @click="selectPlace(workPlace, 'pickup')"
                  >
                    <!-- Cute Building Icon Mini -->
                    <svg viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="6" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/>
                      <path d="M4 10H20" stroke="currentColor" stroke-width="1.5"/>
                      <rect x="8" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.6"/>
                      <rect x="13" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.6"/>
                    </svg>
                    <span>ที่ทำงาน</span>
                  </button>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Step 3: Vehicle Selection -->
          <Transition :name="slideDirection === 'left' ? 'slide-left' : 'slide-right'" mode="out-in">
            <div v-if="currentStep === 'vehicle'" key="vehicle" class="step-panel">
              <div class="step-header compact">
                <div class="step-icon vehicle">
                  <!-- Cute Car Icon -->
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="10" width="20" height="8" rx="4" stroke="currentColor" stroke-width="1.8"/>
                    <path d="M5 10C5 10 6 6 8 5C10 4 14 4 16 5C18 6 19 10 19 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    <circle cx="6.5" cy="18" r="2" stroke="currentColor" stroke-width="1.8"/>
                    <circle cx="17.5" cy="18" r="2" stroke="currentColor" stroke-width="1.8"/>
                    <circle cx="8" cy="8" r="1" fill="currentColor"/>
                    <circle cx="16" cy="8" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <div class="step-info">
                  <h2>เลือกประเภทรถ</h2>
                  <p>{{ estimatedDistance.toFixed(1) }} กม. • {{ estimatedTime }} นาที</p>
                </div>
              </div>

              <!-- Route Summary -->
              <div class="route-summary">
                <div class="route-point">
                  <div class="point-dot green"></div>
                  <span class="point-text">{{ pickupAddress }}</span>
                </div>
                <div class="route-line"></div>
                <div class="route-point">
                  <div class="point-dot red"></div>
                  <span class="point-text">{{ destinationAddress }}</span>
                </div>
              </div>

              <!-- Vehicle Options -->
              <div class="vehicle-options">
                <button 
                  v-for="vehicle in vehicleTypes"
                  :key="vehicle.id"
                  class="vehicle-card"
                  :class="{ selected: rideType === vehicle.id }"
                  @click="selectVehicle(vehicle.id as any)"
                >
                  <div class="vehicle-icon">
                    <!-- Cute Standard Car Icon -->
                    <svg v-if="vehicle.icon === 'car'" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="10" width="20" height="8" rx="4" stroke="currentColor" stroke-width="1.8"/>
                      <path d="M5 10C5 10 6 6 8 5C10 4 14 4 16 5C18 6 19 10 19 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <circle cx="6.5" cy="18" r="2" stroke="currentColor" stroke-width="1.8"/>
                      <circle cx="17.5" cy="18" r="2" stroke="currentColor" stroke-width="1.8"/>
                      <circle cx="8" cy="8" r="1" fill="currentColor"/>
                      <circle cx="16" cy="8" r="1" fill="currentColor"/>
                      <path d="M10 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <!-- Cute Premium Star Icon with sparkles -->
                    <svg v-else-if="vehicle.icon === 'premium'" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3L14.5 9.5L21 10.5L16 15L17.5 21.5L12 18L6.5 21.5L8 15L3 10.5L9.5 9.5L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                      <circle cx="19" cy="5" r="1.5" fill="currentColor" opacity="0.6"/>
                      <circle cx="5" cy="6" r="1" fill="currentColor" opacity="0.4"/>
                      <circle cx="20" cy="15" r="1" fill="currentColor" opacity="0.5"/>
                    </svg>
                    <!-- Cute Share/People Icon -->
                    <svg v-else viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="7" r="3.5" stroke="currentColor" stroke-width="1.8"/>
                      <circle cx="5" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
                      <circle cx="19" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M7 21C7 17.5 9 15 12 15C15 15 17 17.5 17 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M2 20C2 17.5 3 16 5 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
                      <path d="M22 20C22 17.5 21 16 19 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
                    </svg>
                  </div>
                  
                  <div class="vehicle-info">
                    <div class="vehicle-header">
                      <span class="vehicle-name">{{ vehicle.name }}</span>
                      <span class="vehicle-eta">{{ vehicle.eta }}</span>
                    </div>
                    <span class="vehicle-desc">{{ vehicle.description }}</span>
                    <div class="vehicle-features">
                      <span v-for="feature in vehicle.features.slice(0, 2)" :key="feature" class="feature-tag">
                        {{ feature }}
                      </span>
                    </div>
                  </div>
                  
                  <div class="vehicle-price">
                    <span class="price-amount">฿{{ Math.round(estimatedFare * vehicle.multiplier) }}</span>
                    <span class="price-capacity">{{ vehicle.capacity }} ที่นั่ง</span>
                  </div>
                  
                  <div class="vehicle-check">
                    <svg v-if="rideType === vehicle.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </Transition>

          <!-- Step 4: Confirm -->
          <Transition :name="slideDirection === 'left' ? 'slide-left' : 'slide-right'" mode="out-in">
            <div v-if="currentStep === 'confirm'" key="confirm" class="step-panel">
              <div class="step-header compact">
                <div class="step-icon confirm">
                  <!-- Cute Checkmark with sparkle -->
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
                    <path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="19" cy="5" r="1.5" fill="currentColor" opacity="0.5"/>
                    <circle cx="5" cy="7" r="1" fill="currentColor" opacity="0.4"/>
                  </svg>
                </div>
                <div class="step-info">
                  <h2>ยืนยันการจอง</h2>
                  <p>ตรวจสอบรายละเอียดก่อนจอง</p>
                </div>
              </div>

              <!-- Booking Summary -->
              <div class="booking-summary">
                <!-- Route -->
                <div class="summary-section">
                  <div class="summary-route">
                    <div class="route-point">
                      <div class="point-dot green"></div>
                      <div class="point-info">
                        <span class="point-label">จุดรับ</span>
                        <span class="point-address">{{ pickupAddress }}</span>
                      </div>
                    </div>
                    <div class="route-line-vertical"></div>
                    <div class="route-point">
                      <div class="point-dot red"></div>
                      <div class="point-info">
                        <span class="point-label">จุดหมาย</span>
                        <span class="point-address">{{ destinationAddress }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Vehicle & Payment -->
                <div class="summary-section">
                  <div class="summary-row">
                    <span class="row-label">ประเภทรถ</span>
                    <span class="row-value">{{ selectedVehicle.name }}</span>
                  </div>
                  <div class="summary-row">
                    <span class="row-label">ระยะทาง</span>
                    <span class="row-value">{{ estimatedDistance.toFixed(1) }} กม.</span>
                  </div>
                  <div class="summary-row">
                    <span class="row-label">เวลาโดยประมาณ</span>
                    <span class="row-value">{{ estimatedTime }} นาที</span>
                  </div>
                  <div class="summary-row">
                    <span class="row-label">การชำระเงิน</span>
                    <span class="row-value">{{ paymentMethod === 'cash' ? 'เงินสด' : 'กระเป๋าเงิน' }}</span>
                  </div>
                </div>

                <!-- Total -->
                <div class="summary-total">
                  <span class="total-label">ค่าโดยสารโดยประมาณ</span>
                  <span class="total-amount">฿{{ finalFare }}</span>
                </div>

                <!-- Surge Warning -->
                <div v-if="currentMultiplier > 1" class="surge-warning">
                  <!-- Cute Lightning Icon -->
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L4 14H11L10 22L19 10H12L13 2Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="17" cy="5" r="1.5" fill="currentColor" opacity="0.4"/>
                    <circle cx="7" cy="19" r="1" fill="currentColor" opacity="0.3"/>
                  </svg>
                  <span>ช่วงเวลาที่มีความต้องการสูง (x{{ currentMultiplier.toFixed(1) }})</span>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Action Button -->
        <div class="action-area">
          <button 
            class="action-btn"
            :class="{ 
              disabled: !canProceed,
              loading: isBooking,
              confirm: currentStep === 'confirm'
            }"
            @click="goNext"
            :disabled="!canProceed || isBooking"
          >
            <span v-if="isBooking" class="btn-loading">
              <div class="spinner white"></div>
              <span>กำลังจอง...</span>
            </span>
            <span v-else-if="currentStep === 'confirm'" class="btn-text">
              <span>ยืนยันจอง</span>
              <span class="btn-price">฿{{ finalFare }}</span>
            </span>
            <span v-else class="btn-text">ถัดไป</span>
          </button>
        </div>
      </div>

      <!-- Search Sheet -->
      <Transition name="sheet">
        <div v-if="showSearchSheet" class="search-sheet-overlay" @click.self="showSearchSheet = false">
          <div class="search-sheet">
            <div class="search-header">
              <button class="close-btn" @click="showSearchSheet = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              <h3>{{ searchType === 'destination' ? 'เลือกจุดหมาย' : 'เลือกจุดรับ' }}</h3>
            </div>
            
            <div class="search-input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input 
                v-model="searchQuery"
                type="text"
                :placeholder="searchType === 'destination' ? 'ค้นหาจุดหมาย...' : 'ค้นหาจุดรับ...'"
                class="search-input"
                autofocus
              />
            </div>

            <div class="search-results">
              <!-- Saved Places -->
              <div v-if="!searchQuery" class="search-section">
                <h4>สถานที่บันทึก</h4>
                <button 
                  v-if="homePlace"
                  class="search-result-item"
                  @click="selectPlace(homePlace, searchType)"
                >
                  <div class="result-icon home">
                    <!-- Cute Home Icon -->
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M4 10L12 4L20 10V20C20 20.5 19.5 21 19 21H5C4.5 21 4 20.5 4 20V10Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M9 21V14H15V21" stroke="currentColor" stroke-width="1.8"/>
                      <circle cx="12" cy="10" r="1.5" fill="currentColor" opacity="0.5"/>
                    </svg>
                  </div>
                  <div class="result-info">
                    <span class="result-name">บ้าน</span>
                    <span class="result-address">{{ homePlace.address }}</span>
                  </div>
                </button>
                <button 
                  v-if="workPlace"
                  class="search-result-item"
                  @click="selectPlace(workPlace, searchType)"
                >
                  <div class="result-icon work">
                    <!-- Cute Building Icon -->
                    <svg viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="6" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/>
                      <path d="M4 10H20" stroke="currentColor" stroke-width="1.5"/>
                      <rect x="8" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
                      <rect x="13" y="13" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.5"/>
                    </svg>
                  </div>
                  <div class="result-info">
                    <span class="result-name">ที่ทำงาน</span>
                    <span class="result-address">{{ workPlace.address }}</span>
                  </div>
                </button>
              </div>

              <!-- Recent Places -->
              <div v-if="!searchQuery && recentPlaces.length > 0" class="search-section">
                <h4>ล่าสุด</h4>
                <button 
                  v-for="place in recentPlaces"
                  :key="place.id"
                  class="search-result-item"
                  @click="selectPlace(place, searchType)"
                >
                  <div class="result-icon recent">
                    <!-- Cute Clock Icon -->
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
                      <path d="M12 7V12L15 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    </svg>
                  </div>
                  <div class="result-info">
                    <span class="result-name">{{ place.name }}</span>
                    <span class="result-address">{{ place.address }}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
/* ============================================
   BASE STYLES
   ============================================ */
.ride-booking {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* ============================================
   MAP CONTAINER
   ============================================ */
.map-container {
  position: relative;
  flex: 1;
  min-height: 45vh;
  z-index: 0;
}

.floating-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top, 0));
  z-index: 1001;
}

.header-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.header-btn:active {
  transform: scale(0.95);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.header-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo-icon {
  width: 28px;
  height: 28px;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.header-spacer {
  width: 44px;
}

/* ============================================
   BOTTOM SHEET
   ============================================ */
.bottom-sheet {
  position: relative;
  z-index: 5;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  padding: 12px 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0));
  max-height: 55vh;
  overflow-y: auto;
  transition: max-height 0.3s ease;
}

.bottom-sheet.expanded {
  max-height: 65vh;
}

.sheet-handle {
  display: flex;
  justify-content: center;
  padding-bottom: 12px;
}

.handle-bar {
  width: 40px;
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
}

/* ============================================
   PROGRESS BAR
   ============================================ */
.progress-container {
  margin-bottom: 20px;
}

.progress-bar {
  height: 4px;
  background: #F0F0F0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.step-dot {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  color: #999999;
  transition: all 0.2s ease;
}

.step-dot svg {
  width: 14px;
  height: 14px;
  color: #FFFFFF;
}

.progress-step.active .step-dot {
  background: #00A86B;
  color: #FFFFFF;
}

.progress-step.completed .step-dot {
  background: #00A86B;
}

.step-label {
  font-size: 11px;
  color: #999999;
  text-align: center;
  transition: color 0.2s ease;
}

.progress-step.active .step-label {
  color: #00A86B;
  font-weight: 600;
}

.progress-step.completed .step-label {
  color: #00A86B;
}

/* ============================================
   STEP CONTENT
   ============================================ */
.step-content {
  position: relative;
  min-height: 200px;
}

.step-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 8px;
}

.step-header.compact {
  margin-bottom: 4px;
}

.step-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  flex-shrink: 0;
}

.step-icon svg {
  width: 24px;
  height: 24px;
}

.step-icon.destination {
  background: #FFEBEE;
  color: #E53935;
}

.step-icon.pickup {
  background: #E8F5EF;
  color: #00A86B;
}

.step-icon.vehicle {
  background: #E3F2FD;
  color: #1976D2;
}

.step-icon.confirm {
  background: #E8F5EF;
  color: #00A86B;
}

.step-info h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.step-info p {
  font-size: 14px;
  color: #666666;
  margin: 4px 0 0;
}

/* ============================================
   LOCATION INPUT
   ============================================ */
.location-input {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.location-input:hover {
  background: #F0F0F0;
}

.location-input:active {
  transform: scale(0.99);
}

.input-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.input-icon.green {
  color: #00A86B;
}

.input-icon.red {
  color: #E53935;
}

.input-icon svg {
  width: 12px;
  height: 12px;
}

.input-content {
  flex: 1;
  text-align: left;
}

.input-value {
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
}

.input-placeholder {
  font-size: 15px;
  color: #999999;
}

.input-arrow {
  width: 20px;
  height: 20px;
  color: #999999;
  flex-shrink: 0;
}

/* ============================================
   QUICK PLACES
   ============================================ */
.quick-places {
  margin-top: 8px;
}

.quick-places.compact {
  margin-top: 16px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #666666;
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.places-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* Loading State */
.places-loading {
  display: flex;
  gap: 12px;
}

.loading-skeleton {
  width: 80px;
  height: 80px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 14px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty State */
.places-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px;
  background: #F9F9F9;
  border-radius: 14px;
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-text {
  font-size: 14px;
  color: #999;
  margin: 0 0 16px;
}

.add-place-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-place-btn:hover {
  background: #008F5B;
}

.add-place-btn svg {
  width: 16px;
  height: 16px;
}

/* Add Card */
.place-card.add-card {
  border-style: dashed;
  border-color: #CCC;
  background: #FAFAFA;
}

.place-card.add-card:hover {
  border-color: #00A86B;
  background: #E8F5EF;
}

.place-icon.add {
  background: #F0F0F0;
  color: #666;
}

.place-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.place-card:hover {
  border-color: #00A86B;
  background: #E8F5EF;
}

.place-card:active {
  transform: scale(0.97);
}

.place-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.place-icon svg {
  width: 20px;
  height: 20px;
}

.place-icon.home {
  background: #E3F2FD;
  color: #1976D2;
}

.place-icon.work {
  background: #FFF3E0;
  color: #F57C00;
}

.place-icon.favorite {
  background: #FCE4EC;
  color: #E91E63;
}

.place-name {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  text-align: center;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.places-row {
  display: flex;
  gap: 10px;
}

.place-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #F5F5F5;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.place-chip:hover {
  background: #E8F5EF;
}

.place-chip:active {
  transform: scale(0.97);
}

.place-chip svg {
  width: 18px;
  height: 18px;
  color: #666666;
}

.place-chip span {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

/* ============================================
   RECENT PLACES
   ============================================ */
.recent-places {
  margin-top: 16px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  text-align: left;
  width: 100%;
}

.recent-item:hover {
  background: #F5F5F5;
}

.recent-item:active {
  background: #E8E8E8;
}

.recent-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 10px;
  flex-shrink: 0;
}

.recent-icon svg {
  width: 18px;
  height: 18px;
  color: #666666;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-address {
  display: block;
  font-size: 12px;
  color: #999999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============================================
   CURRENT LOCATION BUTTON
   ============================================ */
.current-location-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #E8F5EF;
  border: 2px solid #00A86B;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.current-location-btn:hover:not(:disabled) {
  background: #D4EDE3;
}

.current-location-btn:active:not(:disabled) {
  transform: scale(0.99);
}

.current-location-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.current-location-btn.loading {
  border-color: #999999;
  background: #F5F5F5;
}

.btn-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  border-radius: 12px;
  flex-shrink: 0;
}

.current-location-btn.loading .btn-icon {
  background: #999999;
}

.btn-icon svg {
  width: 22px;
  height: 22px;
  color: #FFFFFF;
}

.btn-content {
  flex: 1;
  text-align: left;
}

.btn-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.btn-subtitle {
  display: block;
  font-size: 13px;
  color: #666666;
  margin-top: 2px;
}

.btn-arrow {
  width: 20px;
  height: 20px;
  color: #00A86B;
  flex-shrink: 0;
}

.current-location-btn.loading .btn-arrow {
  color: #999999;
}

/* ============================================
   DIVIDER
   ============================================ */
.divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 8px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #E8E8E8;
}

.divider span {
  font-size: 13px;
  color: #999999;
}

/* ============================================
   SPINNER
   ============================================ */
.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.white {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.mini-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>

<style scoped>
/* ============================================
   ROUTE SUMMARY
   ============================================ */
.route-summary {
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  background: #F5F5F5;
  border-radius: 14px;
  margin-bottom: 8px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 12px;
}

.point-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-dot.green {
  background: #00A86B;
}

.point-dot.red {
  background: #E53935;
}

.point-text {
  font-size: 14px;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-line {
  width: 2px;
  height: 20px;
  background: #E8E8E8;
  margin-left: 4px;
}

.route-line-vertical {
  width: 2px;
  height: 24px;
  background: #E8E8E8;
  margin-left: 4px;
}

/* ============================================
   VEHICLE OPTIONS
   ============================================ */
.vehicle-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vehicle-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 2px solid #E8E8E8;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.vehicle-card:hover {
  border-color: #00A86B;
}

.vehicle-card:active {
  transform: scale(0.99);
}

.vehicle-card.selected {
  border-color: #00A86B;
  background: #E8F5EF;
}

.vehicle-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 12px;
  flex-shrink: 0;
}

.vehicle-card.selected .vehicle-icon {
  background: #00A86B;
}

.vehicle-icon svg {
  width: 24px;
  height: 24px;
  color: #666666;
}

.vehicle-card.selected .vehicle-icon svg {
  color: #FFFFFF;
}

.vehicle-info {
  flex: 1;
  min-width: 0;
}

.vehicle-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vehicle-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.vehicle-eta {
  font-size: 12px;
  color: #00A86B;
  background: #E8F5EF;
  padding: 2px 8px;
  border-radius: 10px;
}

.vehicle-desc {
  display: block;
  font-size: 13px;
  color: #666666;
  margin-top: 2px;
}

.vehicle-features {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.feature-tag {
  font-size: 11px;
  color: #999999;
  background: #F5F5F5;
  padding: 2px 8px;
  border-radius: 8px;
}

.vehicle-card.selected .feature-tag {
  background: rgba(0, 168, 107, 0.15);
  color: #00A86B;
}

.vehicle-price {
  text-align: right;
  flex-shrink: 0;
}

.price-amount {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.price-capacity {
  display: block;
  font-size: 11px;
  color: #999999;
  margin-top: 2px;
}

.vehicle-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.2s ease;
}

.vehicle-card.selected .vehicle-check {
  opacity: 1;
  transform: scale(1);
}

.vehicle-check svg {
  width: 14px;
  height: 14px;
  color: #FFFFFF;
}
</style>

<style scoped>
/* ============================================
   BOOKING SUMMARY
   ============================================ */
.booking-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-section {
  padding: 14px 16px;
  background: #F5F5F5;
  border-radius: 14px;
}

.summary-route {
  display: flex;
  flex-direction: column;
}

.summary-route .route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.summary-route .point-dot {
  margin-top: 4px;
}

.point-info {
  flex: 1;
  min-width: 0;
}

.point-label {
  display: block;
  font-size: 11px;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.point-address {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  margin-top: 2px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.summary-row:not(:last-child) {
  border-bottom: 1px solid #E8E8E8;
}

.row-label {
  font-size: 14px;
  color: #666666;
}

.row-value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #00A86B;
  border-radius: 14px;
}

.total-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.total-amount {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
}

.surge-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #FFF3E0;
  border-radius: 12px;
}

.surge-warning svg {
  width: 20px;
  height: 20px;
  color: #F57C00;
  flex-shrink: 0;
}

.surge-warning span {
  font-size: 13px;
  color: #E65100;
}

/* ============================================
   ACTION AREA
   ============================================ */
.action-area {
  padding-top: 16px;
  margin-top: auto;
}

.action-btn {
  width: 100%;
  padding: 18px 24px;
  background: #00A86B;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.action-btn:hover:not(:disabled) {
  background: #008F5B;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 168, 107, 0.35);
}

.action-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.3);
}

.action-btn:disabled {
  background: #E8E8E8;
  box-shadow: none;
  cursor: not-allowed;
}

.action-btn.disabled {
  background: #E8E8E8;
  box-shadow: none;
}

.action-btn.loading {
  background: #999999;
}

.action-btn.confirm {
  background: #00A86B;
}

.btn-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 17px;
  font-weight: 600;
  color: #FFFFFF;
}

.btn-price {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 15px;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}
</style>

<style scoped>
/* ============================================
   SEARCH SHEET
   ============================================ */
.search-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.search-sheet {
  width: 100%;
  max-height: 85vh;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0));
  overflow-y: auto;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.close-btn svg {
  width: 20px;
  height: 20px;
  color: #666666;
}

.search-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F5F5F5;
  border-radius: 14px;
  margin-bottom: 20px;
}

.search-input-wrapper svg {
  width: 20px;
  height: 20px;
  color: #999999;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 16px;
  color: #1A1A1A;
  outline: none;
}

.search-input::placeholder {
  color: #999999;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-section h4 {
  font-size: 12px;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  text-align: left;
  width: 100%;
}

.search-result-item:hover {
  background: #F5F5F5;
}

.search-result-item:active {
  background: #E8E8E8;
}

.result-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.result-icon svg {
  width: 20px;
  height: 20px;
}

.result-icon.home {
  background: #E3F2FD;
  color: #1976D2;
}

.result-icon.work {
  background: #FFF3E0;
  color: #F57C00;
}

.result-icon.recent {
  background: #F5F5F5;
  color: #666666;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
}

.result-address {
  display: block;
  font-size: 13px;
  color: #999999;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ============================================
   ANIMATIONS
   ============================================ */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.25s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.sheet-enter-active,
.sheet-leave-active {
  transition: all 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .search-sheet,
.sheet-leave-to .search-sheet {
  transform: translateY(100%);
}

/* ============================================
   CUTE ICON ANIMATIONS
   ============================================ */

/* Base icon transition for all SVGs */
.place-icon svg,
.step-icon svg,
.vehicle-icon svg,
.recent-icon svg,
.result-icon svg,
.btn-icon svg {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Bounce animation on hover for place cards */
.place-card:hover .place-icon svg {
  transform: scale(1.15) rotate(-5deg);
}

.place-card:active .place-icon svg {
  transform: scale(0.95);
}

/* Wiggle animation for vehicle icons on hover */
.vehicle-card:hover .vehicle-icon svg {
  animation: wiggle 0.5s ease-in-out;
}

.vehicle-card.selected .vehicle-icon svg {
  animation: pop 0.3s ease-out;
}

/* Pulse animation for step icons */
.step-icon svg {
  animation: gentle-pulse 2s ease-in-out infinite;
}

/* Bounce for recent items */
.recent-item:hover .recent-icon svg {
  transform: scale(1.1);
}

.recent-item:active .recent-icon svg {
  transform: scale(0.9);
}

/* Search result icon animations */
.search-result-item:hover .result-icon svg {
  transform: scale(1.12) rotate(3deg);
}

.search-result-item:active .result-icon svg {
  transform: scale(0.95);
}

/* GPS button icon animation */
.current-location-btn:hover:not(:disabled) .btn-icon svg {
  animation: spin-once 0.6s ease-out;
}

/* Place chip hover */
.place-chip:hover svg {
  transform: scale(1.15);
}

.place-chip:active svg {
  transform: scale(0.9);
}

/* Header logo animation */
.header-logo:hover .logo-icon {
  animation: bounce 0.5s ease;
}

/* Keyframe animations */
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-8deg); }
  50% { transform: rotate(8deg); }
  75% { transform: rotate(-4deg); }
}

@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes gentle-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
}

@keyframes spin-once {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
  50% { transform: translateY(0); }
  70% { transform: translateY(-2px); }
}

/* Color transitions for selected states */
.vehicle-card .vehicle-icon {
  transition: background-color 0.25s ease, box-shadow 0.25s ease;
}

.vehicle-card.selected .vehicle-icon {
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.vehicle-card .vehicle-icon svg {
  transition: color 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Progress step dot animations */
.step-dot {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.progress-step.active .step-dot {
  animation: pop 0.4s ease-out;
}

.progress-step.completed .step-dot svg {
  animation: check-pop 0.3s ease-out;
}

@keyframes check-pop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); opacity: 1; }
}

/* Surge warning icon pulse */
.surge-warning svg {
  animation: pulse-warning 1.5s ease-in-out infinite;
}

@keyframes pulse-warning {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Location input icon hover */
.location-input:hover .input-icon svg {
  transform: scale(1.2);
}

.location-input .input-icon svg {
  transition: transform 0.2s ease;
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (min-width: 768px) {
  .bottom-sheet {
    max-width: 480px;
    margin: 0 auto;
    border-radius: 24px;
    margin-bottom: 20px;
    box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.15);
  }
  
  .search-sheet {
    max-width: 480px;
    margin: 0 auto;
    border-radius: 24px;
    margin-bottom: 20px;
  }
}
</style>
