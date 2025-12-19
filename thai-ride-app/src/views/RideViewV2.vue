<script setup lang="ts">
/**
 * RideViewV2 - Diamond Standard Ride Booking UI
 * 
 * Feature: F02 - Customer Ride Booking (Enhanced)
 * 
 * Diamond Standard:
 * ✅ 50-Session Endurance: Proper cleanup, no memory leaks
 * ✅ Multi-Dimensional Seamless Flow: Optimistic UI, 60fps animations
 * ✅ Zero-Error Defensive Programming: Graceful error handling
 * 
 * MUNEEF Style: Green accent (#00A86B), white background, rounded corners
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import MapView from '../components/MapView.vue'
import LocationPicker from '../components/LocationPicker.vue'
import { useRideBookingV2, type Location, RIDE_TYPES } from '../composables/useRideBookingV2'
import { useAuthStore } from '../stores/auth'
import { useServices } from '../composables/useServices'

const router = useRouter()
const authStore = useAuthStore()
const { savedPlaces, recentPlaces, homePlace, workPlace, fetchSavedPlaces, fetchRecentPlaces } = useServices()

// Diamond Standard Composable
const {
  loading,
  error,
  bookingState,
  currentRide,
  matchedDriver,
  estimatedFare,
  estimatedDistance,
  estimatedTime,
  surgeMultiplier,
  isCalculating,
  isBooking,
  viewMode,
  hasActiveRide,
  selectedRideType,
  finalFare,
  currentStepIndex,
  initialize,
  setPickup,
  setDestination,
  selectRideType,
  createRide,
  cancelRide,
  calculateCancellationFee,
  goToStep,
  goBack,
  goNext,
  triggerHaptic
} = useRideBookingV2()

// Local UI state
const showLocationPicker = ref(false)
const locationPickerType = ref<'pickup' | 'destination'>('pickup')
const isGettingLocation = ref(false)
const showCancelSheet = ref(false)
const cancelReason = ref('')
const isLoadingPlaces = ref(true)
const showCancelSuccess = ref(false)
const cancelResult = ref<{ fee: number; refund: number } | null>(null)

// Step labels
const stepLabels = [
  { key: 'pickup', label: 'จุดรับ', number: 1 },
  { key: 'destination', label: 'จุดหมาย', number: 2 },
  { key: 'options', label: 'เลือกรถ', number: 3 },
  { key: 'confirm', label: 'ยืนยัน', number: 4 }
] as const

// Cancel reasons
const cancelReasons = [
  'เปลี่ยนใจ',
  'รอนานเกินไป',
  'ราคาสูงเกินไป',
  'จองผิดสถานที่',
  'มีเหตุฉุกเฉิน',
  'อื่นๆ'
]

// Computed
const canProceed = computed(() => {
  const { step, pickup, destination } = bookingState.value
  if (step === 'pickup') return !!pickup
  if (step === 'destination') return !!destination
  if (step === 'options') return true
  return true
})

const mapPickup = computed(() => bookingState.value.pickup)
const mapDestination = computed(() => bookingState.value.destination)
const hasRoute = computed(() => !!(mapPickup.value && mapDestination.value && estimatedDistance.value > 0))

// Initialize
onMounted(async () => {
  if (authStore.user?.id) {
    await initialize(authStore.user.id)
    isLoadingPlaces.value = true
    await Promise.all([fetchSavedPlaces(), fetchRecentPlaces(5)])
    isLoadingPlaces.value = false
  }
})

// Methods
const useCurrentLocation = async (type: 'pickup' | 'destination') => {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง')
    return
  }
  
  isGettingLocation.value = true
  triggerHaptic('medium')
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const loc: Location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: 'ตำแหน่งปัจจุบัน'
      }
      
      if (type === 'pickup') {
        await setPickup(loc)
        bookingState.value.step = 'destination'
      } else {
        await setDestination(loc)
      }
      
      isGettingLocation.value = false
      triggerHaptic('heavy')
    },
    () => {
      isGettingLocation.value = false
      alert('ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่')
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

const openLocationPicker = (type: 'pickup' | 'destination') => {
  locationPickerType.value = type
  showLocationPicker.value = true
  triggerHaptic('light')
}

const handleLocationSelected = async (location: Location) => {
  showLocationPicker.value = false
  
  if (locationPickerType.value === 'pickup') {
    await setPickup(location)
    bookingState.value.step = 'destination'
  } else {
    await setDestination(location)
  }
}

const selectSavedPlace = async (place: any) => {
  const loc: Location = { lat: place.lat, lng: place.lng, address: place.name }
  await setDestination(loc)
  triggerHaptic('medium')
}

const handleBookRide = async () => {
  if (!authStore.user?.id) {
    router.push('/login')
    return
  }
  
  const ride = await createRide(authStore.user.id)
  if (!ride) {
    alert(error.value || 'ไม่สามารถจองรถได้')
  }
}

// Select cancel reason with haptic feedback
const selectCancelReason = (reason: string) => {
  cancelReason.value = reason
  triggerHaptic('light')
}

const handleCancelRide = async () => {
  if (!cancelReason.value) return
  
  triggerHaptic('medium')
  const result = await cancelRide(cancelReason.value)
  
  if (result.success) {
    showCancelSheet.value = false
    cancelReason.value = ''
    triggerHaptic('heavy')
    
    // Show success modal with options
    cancelResult.value = { fee: result.fee || 0, refund: result.refund || 0 }
    showCancelSuccess.value = true
  } else {
    triggerHaptic('light')
    alert(error.value || 'ไม่สามารถยกเลิกได้ กรุณาลองใหม่')
  }
}

// Handle after cancel actions
const goToHome = () => {
  showCancelSuccess.value = false
  cancelResult.value = null
  router.push('/')
}

const bookAgain = () => {
  showCancelSuccess.value = false
  cancelResult.value = null
  // Reset booking state to start fresh
  bookingState.value.step = 'pickup'
  bookingState.value.pickup = null
  bookingState.value.destination = null
}

// Computed cancellation fee for display
const cancellationFee = computed(() => calculateCancellationFee())

const handleBack = () => {
  if (bookingState.value.step === 'pickup') {
    router.back()
  } else {
    goBack()
  }
}

const formatPrice = (price: number) => `฿${price.toLocaleString()}`
const formatDistance = (km: number) => km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`
const formatTime = (mins: number) => mins < 60 ? `${mins} นาที` : `${Math.floor(mins/60)} ชม. ${mins%60} นาที`
</script>

<template>
  <div class="ride-page">
    <!-- Tracking Mode -->
    <template v-if="viewMode === 'tracking' && currentRide">
      <div class="tracking-view">
        <!-- Map -->
        <div class="map-section">
          <MapView
            :pickup="currentRide.pickup"
            :destination="currentRide.destination"
            :driver-location="matchedDriver ? { lat: matchedDriver.currentLat, lng: matchedDriver.currentLng } : undefined"
            :show-route="true"
            height="100%"
          />
          
          <!-- Top Bar -->
          <div class="top-bar">
            <button class="nav-btn" @click="router.back()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div class="tracking-badge">
              <span class="badge-id">{{ currentRide.trackingId }}</span>
            </div>
            <div class="spacer"></div>
          </div>
        </div>
        
        <!-- Info Panel -->
        <div class="info-panel">
          <div class="panel-handle"></div>
          
          <!-- Status -->
          <div class="status-section">
            <div class="status-icon" :class="currentRide.status">
              <svg v-if="currentRide.status === 'pending'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <svg v-else-if="currentRide.status === 'matched'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <div class="status-text">
              <span class="status-main">
                {{ currentRide.status === 'pending' ? 'กำลังหาคนขับ...' :
                   currentRide.status === 'matched' ? 'คนขับกำลังมารับ' :
                   currentRide.status === 'pickup' ? 'คนขับถึงจุดรับแล้ว' :
                   currentRide.status === 'in_progress' ? 'กำลังเดินทาง' :
                   currentRide.status === 'completed' ? 'ถึงจุดหมายแล้ว' : 'ยกเลิกแล้ว' }}
              </span>
              <span class="status-sub">{{ selectedRideType.label }}</span>
            </div>
          </div>
          
          <!-- Driver Card -->
          <div v-if="matchedDriver" class="driver-card">
            <div class="driver-avatar">
              <img v-if="matchedDriver.avatarUrl" :src="matchedDriver.avatarUrl" alt="Driver" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div class="driver-info">
              <span class="driver-name">{{ matchedDriver.name }}</span>
              <div class="driver-meta">
                <span class="vehicle">{{ matchedDriver.vehicleColor }} {{ matchedDriver.vehiclePlate }}</span>
                <span class="rating">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {{ matchedDriver.rating.toFixed(1) }}
                </span>
              </div>
            </div>
            <button v-if="matchedDriver.phone" class="call-btn" @click="window.location.href = `tel:${matchedDriver.phone}`">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </button>
          </div>
          
          <!-- Locations -->
          <div class="locations-section">
            <div class="location-item">
              <div class="location-dot pickup"></div>
              <div class="location-content">
                <span class="location-label">จุดรับ</span>
                <span class="location-address">{{ currentRide.pickup.address }}</span>
              </div>
            </div>
            <div class="location-connector"></div>
            <div class="location-item">
              <div class="location-dot destination"></div>
              <div class="location-content">
                <span class="location-label">จุดหมาย</span>
                <span class="location-address">{{ currentRide.destination.address }}</span>
              </div>
            </div>
          </div>
          
          <!-- Fare -->
          <div class="fare-section">
            <span class="fare-label">ค่าโดยสาร</span>
            <span class="fare-amount">{{ formatPrice(currentRide.finalFare || currentRide.estimatedFare) }}</span>
          </div>
          
          <!-- Cancel Button -->
          <button 
            v-if="['pending', 'matched'].includes(currentRide.status)"
            class="btn-cancel"
            @click="showCancelSheet = true"
          >
            ยกเลิกการเดินทาง
          </button>
        </div>
      </div>
    </template>

    <!-- Booking Mode -->
    <template v-else>
      <!-- Map Section -->
      <div class="map-section">
        <MapView
          :pickup="mapPickup"
          :destination="mapDestination"
          :show-route="hasRoute"
          height="100%"
        />
        
        <!-- Top Bar -->
        <div class="top-bar">
          <button class="nav-btn" @click="handleBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div class="logo-badge">
            <svg viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#00A86B" stroke-width="2"/>
              <path d="M16 8L22 20H10L16 8Z" fill="#00A86B"/>
            </svg>
            <span>เรียกรถ</span>
          </div>
          <div class="spacer"></div>
        </div>
      </div>

      <!-- Bottom Panel -->
      <div class="bottom-panel" :class="{ expanded: bookingState.step === 'options' || bookingState.step === 'confirm' }">
        <div class="panel-handle"></div>
        
        <!-- Step Indicator -->
        <div class="step-indicator">
          <div class="step-progress">
            <div class="step-progress-fill" :style="{ width: `${(currentStepIndex / 3) * 100}%` }"></div>
          </div>
          <div class="step-items">
            <div 
              v-for="(s, index) in stepLabels" 
              :key="s.key"
              :class="['step-item', { 
                active: s.key === bookingState.step, 
                completed: index < currentStepIndex,
                clickable: index < currentStepIndex
              }]"
              @click="goToStep(s.key as any)"
            >
              <div class="step-circle">
                <template v-if="index < currentStepIndex">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </template>
                <template v-else>{{ s.number }}</template>
              </div>
              <span class="step-text">{{ s.label }}</span>
            </div>
          </div>
        </div>

        <!-- Step 1: Pickup -->
        <div v-if="bookingState.step === 'pickup'" class="step-content" key="pickup">
          <div class="step-header">
            <div class="step-icon pickup">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
              </svg>
            </div>
            <div class="step-header-text">
              <h2>คุณอยู่ที่ไหน?</h2>
              <p>เลือกจุดที่ต้องการให้รถมารับ</p>
            </div>
          </div>
          
          <!-- Current Location Button -->
          <button 
            class="location-option"
            :class="{ loading: isGettingLocation }"
            @click="useCurrentLocation('pickup')"
            :disabled="isGettingLocation"
          >
            <div class="option-icon green">
              <div v-if="isGettingLocation" class="spinner"></div>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div class="option-text">
              <span class="option-title">ตำแหน่งปัจจุบัน</span>
              <span class="option-subtitle">{{ isGettingLocation ? 'กำลังค้นหา...' : 'ใช้ GPS ระบุตำแหน่ง' }}</span>
            </div>
            <svg class="option-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          
          <!-- Map Picker Button -->
          <button class="location-option" @click="openLocationPicker('pickup')">
            <div class="option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="option-text">
              <span class="option-title">เลือกจากแผนที่</span>
              <span class="option-subtitle">ปักหมุดตำแหน่งบนแผนที่</span>
            </div>
            <svg class="option-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          
          <!-- Home/Work shortcuts -->
          <div v-if="homePlace || workPlace" class="quick-places">
            <button v-if="homePlace" class="quick-place" @click="setPickup({ lat: homePlace.lat, lng: homePlace.lng, address: homePlace.name }); bookingState.step = 'destination'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              </svg>
              <span>บ้าน</span>
            </button>
            <button v-if="workPlace" class="quick-place" @click="setPickup({ lat: workPlace.lat, lng: workPlace.lng, address: workPlace.name }); bookingState.step = 'destination'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
              </svg>
              <span>ที่ทำงาน</span>
            </button>
          </div>
        </div>

        <!-- Step 2: Destination -->
        <div v-else-if="bookingState.step === 'destination'" class="step-content" key="destination">
          <div class="step-header">
            <div class="step-icon destination">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="step-header-text">
              <h2>ไปที่ไหน?</h2>
              <p>เลือกจุดหมายปลายทาง</p>
            </div>
          </div>
          
          <!-- Map Picker -->
          <button class="location-option" @click="openLocationPicker('destination')">
            <div class="option-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="option-text">
              <span class="option-title">เลือกจากแผนที่</span>
              <span class="option-subtitle">ปักหมุดตำแหน่งบนแผนที่</span>
            </div>
            <svg class="option-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          
          <!-- Skeleton Loading for Places -->
          <template v-if="isLoadingPlaces">
            <div class="saved-places">
              <div class="skeleton-title"></div>
              <div class="places-list">
                <div v-for="i in 3" :key="i" class="place-item skeleton">
                  <div class="skeleton-icon"></div>
                  <div class="skeleton-text">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line long"></div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          
          <!-- Saved Places -->
          <template v-else>
            <div v-if="savedPlaces.length" class="saved-places">
              <h3>สถานที่บันทึก</h3>
              <div class="places-list">
                <button 
                  v-for="place in savedPlaces.slice(0, 4)" 
                  :key="place.id"
                  class="place-item"
                  @click="selectSavedPlace(place)"
                >
                  <div class="place-icon" :class="place.place_type">
                    <svg v-if="place.place_type === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    </svg>
                    <svg v-else-if="place.place_type === 'work'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="7" width="20" height="14" rx="2"/>
                      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </div>
                  <div class="place-info">
                    <span class="place-name">{{ place.name }}</span>
                    <span class="place-address">{{ place.address }}</span>
                  </div>
                </button>
              </div>
            </div>
            
            <!-- Recent Places -->
            <div v-if="recentPlaces.length" class="recent-places">
              <h3>ล่าสุด</h3>
              <div class="places-list">
                <button 
                  v-for="place in recentPlaces.slice(0, 3)" 
                  :key="place.id"
                  class="place-item"
                  @click="selectSavedPlace(place)"
                >
                  <div class="place-icon recent">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                  </div>
                  <div class="place-info">
                    <span class="place-name">{{ place.name }}</span>
                    <span class="place-address">{{ place.address }}</span>
                  </div>
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Step 3: Options -->
        <div v-else-if="bookingState.step === 'options'" class="step-content" key="options">
          <div class="route-summary">
            <div class="route-info">
              <span class="route-distance">{{ formatDistance(estimatedDistance) }}</span>
              <span class="route-time">{{ formatTime(estimatedTime) }}</span>
            </div>
            <div v-if="surgeMultiplier > 1" class="surge-badge">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              {{ surgeMultiplier.toFixed(1) }}x
            </div>
          </div>
          
          <!-- Ride Types -->
          <div class="ride-types">
            <button 
              v-for="type in RIDE_TYPES" 
              :key="type.value"
              :class="['ride-type-card', { selected: bookingState.rideType === type.value }]"
              @click="selectRideType(type.value)"
            >
              <div class="ride-type-icon" :class="type.value">
                <svg v-if="type.value === 'standard'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
                  <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
                  <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>
                </svg>
                <svg v-else-if="type.value === 'premium'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
                  <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
                  <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>
                  <path d="M12 2l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5z" fill="currentColor"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
                  <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
                  <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>
                  <circle cx="9" cy="10" r="1" fill="currentColor"/>
                  <circle cx="15" cy="10" r="1" fill="currentColor"/>
                </svg>
              </div>
              <div class="ride-type-info">
                <span class="ride-type-name">{{ type.label }}</span>
                <span class="ride-type-desc">{{ type.description }}</span>
                <span class="ride-type-eta">{{ type.eta }}</span>
              </div>
              <div class="ride-type-price">
                {{ formatPrice(Math.round(estimatedFare * type.multiplier * surgeMultiplier)) }}
              </div>
              <div v-if="bookingState.rideType === type.value" class="selected-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
            </button>
          </div>
          
          <!-- Continue Button -->
          <button class="btn-primary" @click="goNext">
            ถัดไป
          </button>
        </div>

        <!-- Step 4: Confirm -->
        <div v-else-if="bookingState.step === 'confirm'" class="step-content" key="confirm">
          <h2 class="confirm-title">ยืนยันการจอง</h2>
          
          <!-- Route Summary -->
          <div class="confirm-route">
            <div class="confirm-location">
              <div class="location-dot pickup"></div>
              <div class="location-text">
                <span class="label">จุดรับ</span>
                <span class="address">{{ bookingState.pickup?.address }}</span>
              </div>
            </div>
            <div class="route-line"></div>
            <div class="confirm-location">
              <div class="location-dot destination"></div>
              <div class="location-text">
                <span class="label">จุดหมาย</span>
                <span class="address">{{ bookingState.destination?.address }}</span>
              </div>
            </div>
          </div>
          
          <!-- Ride Details -->
          <div class="confirm-details">
            <div class="detail-row">
              <span class="detail-label">ประเภทรถ</span>
              <span class="detail-value">{{ selectedRideType.label }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">ระยะทาง</span>
              <span class="detail-value">{{ formatDistance(estimatedDistance) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">เวลาโดยประมาณ</span>
              <span class="detail-value">{{ formatTime(estimatedTime) }}</span>
            </div>
            <div v-if="surgeMultiplier > 1" class="detail-row surge">
              <span class="detail-label">ค่าบริการช่วงเร่งด่วน</span>
              <span class="detail-value">x{{ surgeMultiplier.toFixed(1) }}</span>
            </div>
          </div>
          
          <!-- Total Fare -->
          <div class="confirm-fare">
            <span class="fare-label">ค่าโดยสารรวม</span>
            <span class="fare-amount">{{ formatPrice(finalFare) }}</span>
          </div>
          
          <!-- Book Button -->
          <button 
            class="btn-primary btn-book"
            :disabled="isBooking"
            @click="handleBookRide"
          >
            <span v-if="isBooking" class="spinner"></span>
            <span v-else>ยืนยันเรียกรถ</span>
          </button>
        </div>
      </div>
    </template>

    <!-- Location Picker Modal -->
    <Teleport to="body">
      <div v-if="showLocationPicker" class="modal-overlay" @click="showLocationPicker = false">
        <div class="location-picker-modal" @click.stop>
          <LocationPicker
            :initial-location="locationPickerType === 'pickup' ? bookingState.pickup : bookingState.destination"
            @confirm="handleLocationSelected"
            @cancel="showLocationPicker = false"
          />
        </div>
      </div>
    </Teleport>
    
    <!-- Cancel Sheet -->
    <Teleport to="body">
      <div v-if="showCancelSheet" class="sheet-overlay" @click="showCancelSheet = false">
        <div class="cancel-sheet" @click.stop>
          <div class="sheet-handle"></div>
          <h3>ยกเลิกการเดินทาง</h3>
          <p>กรุณาเลือกเหตุผลในการยกเลิก</p>
          
          <!-- Cancellation Fee Notice -->
          <div v-if="cancellationFee > 0" class="fee-notice warning">
            <svg class="fee-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div class="fee-text">
              <span class="fee-label">ค่าธรรมเนียมยกเลิก</span>
              <span class="fee-amount">฿{{ cancellationFee.toLocaleString() }}</span>
            </div>
          </div>
          <div v-else class="fee-notice success">
            <svg class="fee-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span class="fee-text">ยกเลิกฟรี ไม่มีค่าธรรมเนียม</span>
          </div>
          
          <div class="cancel-reasons">
            <button 
              v-for="reason in cancelReasons" 
              :key="reason"
              :class="['reason-btn', { selected: cancelReason === reason }]"
              @click="selectCancelReason(reason)"
            >
              {{ reason }}
            </button>
          </div>
          
          <div class="sheet-actions">
            <button class="btn-secondary" @click="showCancelSheet = false">ไม่ยกเลิก</button>
            <button 
              class="btn-danger" 
              :disabled="!cancelReason"
              @click="handleCancelRide"
            >
              {{ cancellationFee > 0 ? `ยืนยันยกเลิก (฿${cancellationFee})` : 'ยืนยันยกเลิก' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <!-- Cancel Success Modal -->
    <Teleport to="body">
      <div v-if="showCancelSuccess" class="modal-overlay">
        <div class="success-modal">
          <!-- Success Icon -->
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          
          <h2>ยกเลิกสำเร็จ</h2>
          <p class="success-message">การเดินทางของคุณถูกยกเลิกแล้ว</p>
          
          <!-- Fee/Refund Info -->
          <div v-if="cancelResult" class="cancel-info">
            <div v-if="cancelResult.refund > 0" class="info-row refund">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
              <span>คืนเงิน ฿{{ cancelResult.refund.toLocaleString() }} เข้า Wallet</span>
            </div>
            <div v-if="cancelResult.fee > 0" class="info-row fee">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>หักค่าธรรมเนียม ฿{{ cancelResult.fee.toLocaleString() }}</span>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="success-actions">
            <button class="btn-primary" @click="bookAgain">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"/>
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
              เรียกรถใหม่
            </button>
            <button class="btn-secondary" @click="goToHome">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ============================================
   MUNEEF Style - Diamond Standard
   ============================================ */
.ride-page {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  overflow: hidden;
}

/* Map Section */
.map-section {
  flex: 1;
  position: relative;
  min-height: 45vh;
}

.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 12px) + 12px) 16px 12px;
  z-index: 10;
}

.nav-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #FFFFFF;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.nav-btn:active {
  transform: scale(0.95);
}

.nav-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.logo-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FFFFFF;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.logo-badge svg {
  width: 24px;
  height: 24px;
}

.logo-badge span {
  font-weight: 600;
  color: #1A1A1A;
}

.spacer {
  width: 44px;
}

/* Bottom Panel */
.bottom-panel {
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
  padding: 12px 20px calc(env(safe-area-inset-bottom, 20px) + 20px);
  max-height: 55vh;
  overflow-y: auto;
  transition: max-height 0.3s ease;
}

.bottom-panel.expanded {
  max-height: 65vh;
}

.panel-handle {
  width: 40px;
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  margin: 0 auto 16px;
}

/* Step Indicator */
.step-indicator {
  margin-bottom: 20px;
}

.step-progress {
  height: 3px;
  background: #F0F0F0;
  border-radius: 2px;
  margin-bottom: 12px;
  overflow: hidden;
}

.step-progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.step-items {
  display: flex;
  justify-content: space-between;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: default;
}

.step-item.clickable {
  cursor: pointer;
}

.step-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #F0F0F0;
  color: #999999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.step-item.active .step-circle {
  background: #00A86B;
  color: #FFFFFF;
}

.step-item.completed .step-circle {
  background: #00A86B;
  color: #FFFFFF;
}

.step-item.completed .step-circle svg {
  width: 14px;
  height: 14px;
}

.step-text {
  font-size: 11px;
  color: #999999;
}

.step-item.active .step-text,
.step-item.completed .step-text {
  color: #00A86B;
  font-weight: 500;
}

/* Step Content */
.step-content {
  animation: slideIn 0.25s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.step-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.step-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-icon.pickup {
  background: #E8F5EF;
  color: #00A86B;
}

.step-icon.destination {
  background: #FFEBEE;
  color: #E53935;
}

.step-icon svg {
  width: 24px;
  height: 24px;
}

.step-header-text h2 {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 4px;
}

.step-header-text p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

/* Location Options */
.location-option {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px;
  background: #FFFFFF;
  border: 1.5px solid #F0F0F0;
  border-radius: 14px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.location-option:active {
  transform: scale(0.98);
  border-color: #00A86B;
}

.location-option.loading {
  opacity: 0.7;
  pointer-events: none;
}

.option-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.option-icon.green {
  background: #E8F5EF;
  color: #00A86B;
}

.option-icon svg {
  width: 22px;
  height: 22px;
  color: #666666;
}

.option-icon.green svg {
  color: #00A86B;
}

.option-text {
  flex: 1;
  text-align: left;
}

.option-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.option-subtitle {
  display: block;
  font-size: 13px;
  color: #999999;
  margin-top: 2px;
}

.option-arrow {
  width: 20px;
  height: 20px;
  color: #CCCCCC;
}

/* Quick Places */
.quick-places {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.quick-place {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #F5F5F5;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-place:active {
  transform: scale(0.95);
  background: #E8F5EF;
}

.quick-place svg {
  width: 24px;
  height: 24px;
  color: #666666;
}

.quick-place span {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
}

/* Saved/Recent Places */
.saved-places, .recent-places {
  margin-top: 20px;
}

.saved-places h3, .recent-places h3 {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin: 0 0 12px;
}

.places-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.place-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.place-item:active {
  background: #F5F5F5;
}

.place-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.place-icon.home { background: #E3F2FD; color: #1976D2; }
.place-icon.work { background: #FFF3E0; color: #F57C00; }
.place-icon.other { background: #FCE4EC; color: #E91E63; }
.place-icon.recent { background: #F5F5F5; color: #666666; }

.place-icon svg {
  width: 20px;
  height: 20px;
}

/* Skeleton Loading - MUNEEF Style */
.skeleton-title {
  width: 100px;
  height: 16px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}

.place-item.skeleton {
  cursor: default;
  pointer-events: none;
}

.skeleton-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-line.short {
  width: 60%;
}

.skeleton-line.long {
  width: 85%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.place-info {
  flex: 1;
  text-align: left;
  overflow: hidden;
}

.place-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.place-address {
  display: block;
  font-size: 12px;
  color: #999999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Route Summary */
.route-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #F5F5F5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.route-info {
  display: flex;
  gap: 16px;
}

.route-distance, .route-time {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.surge-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #FFF3E0;
  color: #F57C00;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

/* Ride Types */
.ride-types {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.ride-type-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.ride-type-card:active {
  transform: scale(0.98);
}

.ride-type-card.selected {
  border-color: #00A86B;
  background: #F0FDF4;
}

.ride-type-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ride-type-icon.standard { background: #E8F5EF; color: #00A86B; }
.ride-type-icon.premium { background: #FFF8E1; color: #FFC107; }
.ride-type-icon.shared { background: #E3F2FD; color: #2196F3; }

.ride-type-icon svg {
  width: 28px;
  height: 28px;
}

.ride-type-info {
  flex: 1;
}

.ride-type-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.ride-type-desc {
  display: block;
  font-size: 12px;
  color: #666666;
  margin-top: 2px;
}

.ride-type-eta {
  display: block;
  font-size: 11px;
  color: #00A86B;
  margin-top: 4px;
}

.ride-type-price {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.selected-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.selected-check svg {
  width: 12px;
  height: 12px;
  color: #FFFFFF;
}

/* Confirm Step */
.confirm-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 20px;
}

.confirm-route {
  padding: 16px;
  background: #F5F5F5;
  border-radius: 14px;
  margin-bottom: 16px;
}

.confirm-location {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.location-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.location-dot.pickup { background: #00A86B; }
.location-dot.destination { background: #E53935; }

.location-text .label {
  display: block;
  font-size: 12px;
  color: #666666;
}

.location-text .address {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  margin-top: 2px;
}

.route-line {
  width: 2px;
  height: 24px;
  background: #E0E0E0;
  margin: 8px 0 8px 5px;
}

.confirm-details {
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #F0F0F0;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 14px;
  color: #666666;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.detail-row.surge .detail-value {
  color: #F57C00;
}

.confirm-fare {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #E8F5EF;
  border-radius: 14px;
  margin-bottom: 20px;
}

.fare-label {
  font-size: 14px;
  color: #666666;
}

.fare-amount {
  font-size: 24px;
  font-weight: 700;
  color: #00A86B;
}

/* Buttons */
.btn-primary {
  width: 100%;
  padding: 16px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary:active {
  transform: scale(0.98);
  background: #008F5B;
}

.btn-primary:disabled {
  background: #CCCCCC;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 14px 24px;
  background: #F5F5F5;
  color: #1A1A1A;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-danger {
  padding: 14px 24px;
  background: #E53935;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-danger:disabled {
  background: #FFCDD2;
  cursor: not-allowed;
}

.btn-cancel {
  width: 100%;
  padding: 14px;
  background: transparent;
  color: #E53935;
  border: 1.5px solid #E53935;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 16px;
}

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Tracking View */
.tracking-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tracking-badge {
  background: #FFFFFF;
  padding: 8px 16px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.badge-id {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: monospace;
}

.info-panel {
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
  padding: 12px 20px calc(env(safe-area-inset-bottom, 20px) + 20px);
}

.status-section {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.status-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon.pending { background: #FFF3E0; color: #F57C00; }
.status-icon.matched { background: #E8F5EF; color: #00A86B; }
.status-icon.pickup { background: #E3F2FD; color: #1976D2; }
.status-icon.in_progress { background: #E8F5EF; color: #00A86B; }
.status-icon.completed { background: #E8F5EF; color: #00A86B; }
.status-icon.cancelled { background: #FFEBEE; color: #E53935; }

.status-icon svg {
  width: 24px;
  height: 24px;
}

.status-main {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
}

.status-sub {
  display: block;
  font-size: 13px;
  color: #666666;
  margin-top: 2px;
}

/* Driver Card */
.driver-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: #F5F5F5;
  border-radius: 14px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #E0E0E0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driver-avatar svg {
  width: 28px;
  height: 28px;
  color: #999999;
}

.driver-info {
  flex: 1;
}

.driver-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.driver-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.vehicle {
  font-size: 13px;
  color: #666666;
}

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #F5A623;
}

.call-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #00A86B;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.call-btn svg {
  width: 20px;
  height: 20px;
  color: #FFFFFF;
}

/* Locations Section */
.locations-section {
  padding: 16px;
  background: #F5F5F5;
  border-radius: 14px;
  margin-bottom: 16px;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.location-connector {
  width: 2px;
  height: 20px;
  background: #E0E0E0;
  margin: 6px 0 6px 5px;
}

.location-content {
  flex: 1;
}

.location-label {
  display: block;
  font-size: 12px;
  color: #666666;
}

.location-address {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  margin-top: 2px;
}

/* Fare Section */
.fare-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #E8F5EF;
  border-radius: 12px;
}

.fare-section .fare-label {
  font-size: 14px;
  color: #666666;
}

.fare-section .fare-amount {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

/* Modal & Sheet */
.modal-overlay, .sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.location-picker-modal {
  width: 100%;
  height: 90vh;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
}

.cancel-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  padding: 16px 20px calc(env(safe-area-inset-bottom, 20px) + 20px);
}

.cancel-sheet .sheet-handle {
  width: 40px;
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.cancel-sheet h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 8px;
}

.cancel-sheet p {
  font-size: 14px;
  color: #666666;
  margin: 0 0 16px;
}

/* Fee Notice - MUNEEF Style with Animation */
.fee-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fee-notice.warning {
  background: #FFF3E0;
  border: 1px solid #FFE0B2;
}

.fee-notice.success {
  background: #E8F5EF;
  border: 1px solid #C8E6C9;
}

.fee-notice .fee-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.fee-notice.warning .fee-icon {
  color: #F57C00;
}

.fee-notice.success .fee-icon {
  color: #00A86B;
}

.fee-notice .fee-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fee-notice.success .fee-text {
  flex-direction: row;
  font-size: 14px;
  font-weight: 500;
  color: #00A86B;
}

.fee-notice .fee-label {
  font-size: 13px;
  color: #666666;
}

.fee-notice .fee-amount {
  font-size: 16px;
  font-weight: 700;
  color: #F57C00;
}

.cancel-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.reason-btn {
  padding: 10px 16px;
  background: #F5F5F5;
  border: 1.5px solid transparent;
  border-radius: 20px;
  font-size: 14px;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reason-btn:active {
  transform: scale(0.95);
}

.reason-btn.selected {
  background: #FFEBEE;
  border-color: #E53935;
  color: #E53935;
  animation: selectPop 0.2s ease;
}

@keyframes selectPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.sheet-actions {
  display: flex;
  gap: 12px;
}

.sheet-actions button {
  flex: 1;
}

/* ============================================
   Cancel Success Modal - MUNEEF Style
   ============================================ */
.success-modal {
  background: #FFFFFF;
  border-radius: 24px;
  padding: 32px 24px;
  width: calc(100% - 48px);
  max-width: 360px;
  text-align: center;
  animation: modalPop 0.3s ease-out;
}

@keyframes modalPop {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.success-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #E8F5EF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  animation: iconBounce 0.5s ease-out 0.2s both;
}

@keyframes iconBounce {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.success-icon svg {
  width: 36px;
  height: 36px;
  color: #00A86B;
}

.success-modal h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px;
}

.success-message {
  font-size: 15px;
  color: #666666;
  margin: 0 0 20px;
}

.cancel-info {
  background: #F9F9F9;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 24px;
}

.cancel-info .info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.cancel-info .info-row:not(:last-child) {
  border-bottom: 1px solid #E8E8E8;
}

.cancel-info .info-row svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.cancel-info .info-row.refund svg {
  color: #00A86B;
}

.cancel-info .info-row.refund span {
  color: #00A86B;
  font-weight: 500;
}

.cancel-info .info-row.fee svg {
  color: #F57C00;
}

.cancel-info .info-row.fee span {
  color: #666666;
  font-size: 14px;
}

.success-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.success-actions .btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.success-actions .btn-primary:active {
  transform: scale(0.98);
}

.success-actions .btn-primary svg {
  width: 20px;
  height: 20px;
}

.success-actions .btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #F5F5F5;
  color: #1A1A1A;
  border: none;
  border-radius: 14px;
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.success-actions .btn-secondary:active {
  transform: scale(0.98);
  background: #E8E8E8;
}

.success-actions .btn-secondary svg {
  width: 18px;
  height: 18px;
}
</style>
