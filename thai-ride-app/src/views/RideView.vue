<script setup lang="ts">
/**
 * Feature: F02 - Customer Ride Booking
 * MUNEEF Style UI - Clean and Modern
 * Flow: 1.เลือกจุดรับ → 2.เลือกจุดหมาย → 3.เลือกประเภทรถ → 4.ยืนยันจอง
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import LocationPicker from '../components/LocationPicker.vue'
import MapView from '../components/MapView.vue'
import RideTracker from '../components/RideTracker.vue'
import BottomSheet from '../components/BottomSheet.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useRideStore } from '../stores/ride'
import { useAuthStore } from '../stores/auth'
import { useSurgePricing } from '../composables/useSurgePricing'
import type { RideRequest, ServiceProvider } from '../types/database'

const router = useRouter()
const rideStore = useRideStore()
const authStore = useAuthStore()
const { calculateDistance, calculateTravelTime } = useLocation()
const { calculateSurge, currentMultiplier } = useSurgePricing()

const surgeMultiplier = currentMultiplier

onMounted(async () => {
  const pendingDest = rideStore.consumeDestination()
  if (pendingDest) {
    destinationLocation.value = pendingDest
    destinationAddress.value = pendingDest.address
    // ถ้ามี destination แล้ว ให้ไปขั้นตอนเลือกจุดรับ
    step.value = 'pickup'
  }
  
  if (pickupLocation.value) {
    await calculateSurge(pickupLocation.value.lat, pickupLocation.value.lng)
  }
  
  if (authStore.user?.id) {
    await rideStore.initialize(authStore.user.id)
    if (rideStore.hasActiveRide && rideStore.currentRide) {
      activeRide.value = rideStore.currentRide
      viewMode.value = 'tracking'
    }
  }
})

onUnmounted(() => {
  rideStore.unsubscribeAll()
})

// Form state
const pickupAddress = ref('')
const destinationAddress = ref('')
const pickupLocation = ref<GeoLocation | null>(null)
const destinationLocation = ref<GeoLocation | null>(null)
const rideType = ref<'standard' | 'premium' | 'shared'>('standard')
const passengerCount = ref(1)
const paymentMethod = ref<'cash' | 'wallet' | 'card'>('cash')
const promoCode = ref('')
const specialRequests = ref('')

// UI state
const isCalculating = ref(false)
const isBooking = ref(false)
const estimatedFare = ref(0)
const estimatedTime = ref(0)
const estimatedDistance = ref(0)
const showPaymentSheet = ref(false)
const showPromoSheet = ref(false)
const showPickupMapPicker = ref(false)
const showDestMapPicker = ref(false)

// Search state
const pickupSearchQuery = ref('')
const destSearchQuery = ref('')
const pickupSearchResults = ref<Array<{ id: string; name: string; address: string; lat: number; lng: number }>>([])
const destSearchResults = ref<Array<{ id: string; name: string; address: string; lat: number; lng: number }>>([])

// Step Flow: pickup → destination → options → confirm
const step = ref<'pickup' | 'destination' | 'options' | 'confirm'>('pickup')

// Active ride state
const activeRide = ref<RideRequest | null>(null)
const assignedProvider = ref<ServiceProvider | null>(null)
const viewMode = ref<'booking' | 'tracking'>('booking')

// Step labels for indicator
const stepLabels = [
  { key: 'pickup', label: 'จุดรับ', number: 1 },
  { key: 'destination', label: 'จุดหมาย', number: 2 },
  { key: 'options', label: 'เลือกรถ', number: 3 },
  { key: 'confirm', label: 'ยืนยัน', number: 4 }
] as const

const currentStepIndex = computed(() => {
  return stepLabels.findIndex(s => s.key === step.value)
})

// Ride types - MUNEEF Style
const rideTypes = [
  { 
    value: 'standard', 
    label: 'สบาย', 
    description: 'เดินทางสบายกับคนขับที่ไว้ใจได้',
    multiplier: 1.0, 
    icon: 'comfort',
    eta: '2 นาที',
    capacity: 4,
    priceRange: '88 - 107'
  },
  { 
    value: 'premium', 
    label: 'พรีเมียม', 
    description: 'รถหรูสำหรับโอกาสพิเศษ',
    multiplier: 1.5, 
    icon: 'premium',
    eta: '5 นาที',
    capacity: 4,
    priceRange: '150 - 180'
  },
  { 
    value: 'shared', 
    label: 'แชร์', 
    description: 'แชร์การเดินทาง ประหยัดกว่า',
    multiplier: 0.7, 
    icon: 'share',
    eta: '5 นาที',
    capacity: 2,
    priceRange: '60 - 75'
  }
] as const

const paymentMethods = [
  { value: 'cash', label: 'เงินสด', icon: 'cash' },
  { value: 'wallet', label: 'กระเป๋าเงิน GOBEAR', icon: 'wallet' },
  { value: 'card', label: 'บัตรเครดิต/เดบิต', icon: 'card' }
] as const

const canCalculate = computed(() => pickupLocation.value && destinationLocation.value)
const hasRoute = computed(() => !!(pickupLocation.value && destinationLocation.value && estimatedDistance.value > 0))

const selectedRideType = computed(() => 
  rideTypes.find(t => t.value === rideType.value) || rideTypes[0]
)

const finalFare = computed(() => {
  let fare = estimatedFare.value
  if (surgeMultiplier.value > 1) {
    fare = fare * surgeMultiplier.value
  }
  return Math.round(fare)
})

// Handlers (reserved for future use)
const _handlePickupSelected = async (location: GeoLocation) => {
  pickupLocation.value = location
  pickupAddress.value = location.address
  await calculateSurge(location.lat, location.lng)
  // ไปขั้นตอนถัดไป: เลือกจุดหมาย
  step.value = 'destination'
}

const _handleDestinationSelected = async (location: GeoLocation) => {
  destinationLocation.value = location
  destinationAddress.value = location.address
  // คำนวณค่าโดยสารและไปขั้นตอนเลือกรถ
  await calculateFare()
}

// Export for potential future use
void _handlePickupSelected
void _handleDestinationSelected

const handleRouteCalculated = (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
  estimatedTime.value = data.duration
}

const calculateFare = async () => {
  if (!canCalculate.value || !pickupLocation.value || !destinationLocation.value) return
  
  isCalculating.value = true
  await new Promise(resolve => setTimeout(resolve, 300))
  
  if (estimatedDistance.value === 0) {
    estimatedDistance.value = calculateDistance(
      pickupLocation.value.lat, pickupLocation.value.lng,
      destinationLocation.value.lat, destinationLocation.value.lng
    )
    estimatedTime.value = calculateTravelTime(estimatedDistance.value)
  }
  
  estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, rideType.value)
  step.value = 'options'
  isCalculating.value = false
}

const selectRideType = (type: 'standard' | 'premium' | 'shared') => {
  rideType.value = type
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, type)
  }
}

const bookRide = async () => {
  if (!pickupLocation.value || !destinationLocation.value) return
  
  if (!authStore.user) {
    router.push('/login')
    return
  }
  
  isBooking.value = true
  
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
      activeRide.value = ride
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

const handleCancelRide = async () => {
  if (!activeRide.value) return
  
  if (confirm('ต้องการยกเลิกการเดินทางนี้หรือไม่?')) {
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
  assignedProvider.value = null
  viewMode.value = 'booking'
  step.value = 'pickup'
  pickupAddress.value = ''
  destinationAddress.value = ''
  pickupLocation.value = null
  destinationLocation.value = null
  estimatedFare.value = 0
  estimatedDistance.value = 0
  estimatedTime.value = 0
}

const goBack = () => {
  if (step.value === 'confirm') {
    step.value = 'options'
  } else if (step.value === 'options') {
    step.value = 'destination'
  } else if (step.value === 'destination') {
    step.value = 'pickup'
  } else {
    router.back()
  }
}

const goToStep = (targetStep: 'pickup' | 'destination' | 'options' | 'confirm') => {
  // อนุญาตให้กลับไปขั้นตอนก่อนหน้าเท่านั้น
  const targetIndex = stepLabels.findIndex(s => s.key === targetStep)
  if (targetIndex <= currentStepIndex.value) {
    step.value = targetStep
  }
}

// Mock places for demo
const mockPlaces = [
  { id: '1', name: 'เซ็นทรัลเวิลด์', address: 'ราชดำริ, ปทุมวัน, กรุงเทพฯ', lat: 13.7466, lng: 100.5391 },
  { id: '2', name: 'สยามพารากอน', address: 'พระราม 1, ปทุมวัน, กรุงเทพฯ', lat: 13.7461, lng: 100.5347 },
  { id: '3', name: 'เทอร์มินอล 21', address: 'สุขุมวิท, วัฒนา, กรุงเทพฯ', lat: 13.7377, lng: 100.5603 },
  { id: '4', name: 'เอ็มควอเทียร์', address: 'สุขุมวิท, คลองเตย, กรุงเทพฯ', lat: 13.7314, lng: 100.5697 },
  { id: '5', name: 'ไอคอนสยาม', address: 'เจริญนคร, คลองสาน, กรุงเทพฯ', lat: 13.7267, lng: 100.5100 },
  { id: '6', name: 'สนามบินสุวรรณภูมิ', address: 'บางพลี, สมุทรปราการ', lat: 13.6900, lng: 100.7501 },
  { id: '7', name: 'สนามบินดอนเมือง', address: 'ดอนเมือง, กรุงเทพฯ', lat: 13.9126, lng: 100.6068 },
  { id: '8', name: 'หมอชิต', address: 'จตุจักร, กรุงเทพฯ', lat: 13.8022, lng: 100.5530 }
]

const searchPickupPlaces = () => {
  if (pickupSearchQuery.value.length < 2) {
    pickupSearchResults.value = []
    return
  }
  const query = pickupSearchQuery.value.toLowerCase()
  pickupSearchResults.value = mockPlaces.filter(p => 
    p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query)
  ).slice(0, 5)
}

const searchDestPlaces = () => {
  if (destSearchQuery.value.length < 2) {
    destSearchResults.value = []
    return
  }
  const query = destSearchQuery.value.toLowerCase()
  destSearchResults.value = mockPlaces.filter(p => 
    p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query)
  ).slice(0, 5)
}

const selectPickupPlace = (place: typeof mockPlaces[0]) => {
  pickupLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  pickupAddress.value = place.name
  pickupSearchQuery.value = ''
  pickupSearchResults.value = []
}

const selectDestPlace = async (place: typeof mockPlaces[0]) => {
  destinationLocation.value = { lat: place.lat, lng: place.lng, address: place.name }
  destinationAddress.value = place.name
  destSearchQuery.value = ''
  destSearchResults.value = []
  await calculateFare()
}

const useCurrentLocation = async (type: 'pickup' | 'destination') => {
  if (!navigator.geolocation) {
    alert('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง')
    return
  }
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const loc = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        address: 'ตำแหน่งปัจจุบัน'
      }
      if (type === 'pickup') {
        pickupLocation.value = loc
        pickupAddress.value = loc.address
        await calculateSurge(loc.lat, loc.lng)
        step.value = 'destination'
      } else {
        destinationLocation.value = loc
        destinationAddress.value = loc.address
        await calculateFare()
      }
    },
    () => {
      alert('ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่')
    }
  )
}

const clearPickup = () => {
  pickupLocation.value = null
  pickupAddress.value = ''
  pickupSearchQuery.value = ''
}

const handleMapPickerConfirm = async (location: GeoLocation, type: 'pickup' | 'destination') => {
  if (type === 'pickup') {
    pickupLocation.value = location
    pickupAddress.value = location.address
    showPickupMapPicker.value = false
    await calculateSurge(location.lat, location.lng)
    step.value = 'destination'
  } else {
    destinationLocation.value = location
    destinationAddress.value = location.address
    showDestMapPicker.value = false
    await calculateFare()
  }
}

watch(rideType, () => {
  if (estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, rideType.value)
  }
})
</script>

<template>
  <div class="ride-page">
    <!-- Tracking Mode -->
    <template v-if="viewMode === 'tracking' && activeRide">
      <RideTracker
        :ride="activeRide"
        :provider="(assignedProvider || rideStore.matchedDriver) as any"
        @cancel="handleCancelRide"
        @complete="handleRideComplete"
      />
    </template>

    <!-- Booking Mode -->
    <template v-else>
      <!-- Map Section -->
      <div class="map-section">
        <MapView
          :pickup="pickupLocation"
          :destination="destinationLocation"
          :show-route="hasRoute"
          height="100%"
          @route-calculated="handleRouteCalculated"
        />
        
        <!-- Top Bar -->
        <div class="top-bar">
          <button class="nav-btn" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div class="logo-badge">
            <svg viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#00A86B" stroke-width="2"/>
              <path d="M16 8L22 20H10L16 8Z" fill="#00A86B"/>
              <circle cx="16" cy="18" r="3" fill="#00A86B"/>
            </svg>
            <span>GOBEAR</span>
          </div>
          <button class="nav-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Bottom Panel -->
      <div class="bottom-panel" :class="{ expanded: step === 'options' || step === 'confirm' }">
        <div class="panel-handle"></div>
        
        <!-- Step Indicator -->
        <div class="step-indicator">
          <div 
            v-for="(s, index) in stepLabels" 
            :key="s.key"
            :class="['step-item', { 
              active: s.key === step, 
              completed: index < currentStepIndex,
              clickable: index < currentStepIndex
            }]"
            @click="goToStep(s.key)"
          >
            <div class="step-number">
              <template v-if="index < currentStepIndex">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </template>
              <template v-else>{{ s.number }}</template>
            </div>
            <span class="step-label">{{ s.label }}</span>
          </div>
        </div>

        <!-- Step 1: เลือกจุดรับ -->
        <template v-if="step === 'pickup'">
          <div class="step-content">
            <h2 class="step-title">เลือกจุดรับ</h2>
            <p class="step-desc">กรุณาเลือกตำแหน่งที่ต้องการให้รถมารับ</p>
            
            <!-- Quick Actions -->
            <div class="quick-actions">
              <button class="quick-action-btn" @click="useCurrentLocation('pickup')">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
                  </svg>
                </div>
                <span>ใช้ตำแหน่งปัจจุบัน</span>
              </button>
              <button class="quick-action-btn" @click="showPickupMapPicker = true">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <span>เลือกจากแผนที่</span>
              </button>
            </div>

            <!-- Search Input -->
            <div class="search-input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input 
                v-model="pickupSearchQuery"
                type="text" 
                placeholder="ค้นหาสถานที่..." 
                class="search-input"
                @input="searchPickupPlaces"
              />
            </div>

            <!-- Search Results -->
            <div v-if="pickupSearchResults.length > 0" class="search-results">
              <button 
                v-for="place in pickupSearchResults" 
                :key="place.id"
                class="search-result-item"
                @click="selectPickupPlace(place)"
              >
                <div class="result-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div class="result-info">
                  <span class="result-name">{{ place.name }}</span>
                  <span class="result-address">{{ place.address }}</span>
                </div>
              </button>
            </div>

            <!-- Selected Pickup Display -->
            <div v-if="pickupLocation" class="selected-location-card">
              <div class="location-marker pickup">
                <div class="marker-dot"></div>
              </div>
              <div class="location-info">
                <span class="location-label">{{ pickupAddress }}</span>
              </div>
              <button class="change-btn" @click="clearPickup">
                เปลี่ยน
              </button>
            </div>

            <!-- Continue Button -->
            <button 
              v-if="pickupLocation" 
              class="book-btn"
              @click="step = 'destination'"
            >
              <span>ดำเนินการต่อ</span>
            </button>
          </div>
        </template>

        <!-- Step 2: เลือกจุดหมาย -->
        <template v-else-if="step === 'destination'">
          <div class="step-content">
            <h2 class="step-title">เลือกจุดหมาย</h2>
            <p class="step-desc">คุณต้องการไปที่ไหน?</p>
            
            <!-- Show selected pickup -->
            <div class="selected-location-card compact">
              <div class="location-marker pickup">
                <div class="marker-dot"></div>
              </div>
              <div class="location-info">
                <span class="location-sublabel">จุดรับ</span>
                <span class="location-label">{{ pickupAddress }}</span>
              </div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
              <button class="quick-action-btn" @click="showDestMapPicker = true">
                <div class="action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <span>เลือกจากแผนที่</span>
              </button>
            </div>

            <!-- Search Input -->
            <div class="search-input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input 
                v-model="destSearchQuery"
                type="text" 
                placeholder="ค้นหาจุดหมาย..." 
                class="search-input"
                @input="searchDestPlaces"
              />
            </div>

            <!-- Search Results -->
            <div v-if="destSearchResults.length > 0" class="search-results">
              <button 
                v-for="place in destSearchResults" 
                :key="place.id"
                class="search-result-item"
                @click="selectDestPlace(place)"
              >
                <div class="result-icon destination">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div class="result-info">
                  <span class="result-name">{{ place.name }}</span>
                  <span class="result-address">{{ place.address }}</span>
                </div>
              </button>
            </div>

            <!-- Loading state -->
            <div v-if="isCalculating" class="calculating-state">
              <div class="spinner"></div>
              <span>กำลังคำนวณเส้นทาง...</span>
            </div>
          </div>
        </template>

        <!-- Step 3: เลือกประเภทรถ -->
        <template v-else-if="step === 'options'">
          <div class="step-content">
            <!-- Route Summary -->
            <div class="route-summary">
              <div class="route-locations">
                <div class="route-point">
                  <div class="location-marker pickup"><div class="marker-dot"></div></div>
                  <span>{{ pickupAddress }}</span>
                </div>
                <div class="route-line"></div>
                <div class="route-point">
                  <div class="location-marker destination"><div class="marker-dot"></div></div>
                  <span>{{ destinationAddress }}</span>
                </div>
              </div>
              <div class="route-stats">
                <div class="stat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M2 12h20"/>
                  </svg>
                  <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
                </div>
                <div class="stat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <span>{{ estimatedTime }} นาที</span>
                </div>
              </div>
            </div>

            <div class="ride-details-header">
              <h3>เลือกประเภทรถ</h3>
              <button class="schedule-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span>ตอนนี้</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>

            <!-- Ride Options -->
            <div class="ride-options">
              <button
                v-for="type in rideTypes"
                :key="type.value"
                @click="selectRideType(type.value)"
                :class="['ride-option', { active: rideType === type.value }]"
              >
                <div class="ride-icon">
                  <svg viewBox="0 0 48 48" fill="none">
                    <rect x="4" y="18" width="40" height="18" rx="4" :fill="type.value === 'premium' ? '#1A1A1A' : '#00A86B'"/>
                    <rect x="8" y="10" width="32" height="14" rx="4" :fill="type.value === 'premium' ? '#1A1A1A' : '#00A86B'"/>
                    <rect x="12" y="12" width="10" height="8" rx="2" :fill="type.value === 'premium' ? '#4A4A4A' : '#E8F5EF'"/>
                    <rect x="26" y="12" width="10" height="8" rx="2" :fill="type.value === 'premium' ? '#4A4A4A' : '#E8F5EF'"/>
                    <circle cx="14" cy="36" r="5" fill="#333"/>
                    <circle cx="34" cy="36" r="5" fill="#333"/>
                  </svg>
                </div>
                <div class="ride-info">
                  <div class="ride-name-row">
                    <span class="ride-name">{{ type.label }}</span>
                    <span class="ride-price">฿{{ rideStore.calculateFare(estimatedDistance, type.value) }}</span>
                  </div>
                  <div class="ride-meta">
                    <span>{{ type.eta }}</span>
                    <span class="meta-dot">•</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="capacity-icon">
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M20 21a8 8 0 10-16 0"/>
                    </svg>
                    <span>{{ type.capacity }} คน</span>
                  </div>
                  <p class="ride-desc">{{ type.description }}</p>
                </div>
                <div v-if="rideType === type.value" class="ride-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              </button>
            </div>

            <!-- Continue Button -->
            <button @click="step = 'confirm'" class="book-btn">
              <span>ดำเนินการต่อ</span>
            </button>
          </div>
        </template>

        <!-- Step 4: ยืนยันการจอง -->
        <template v-else-if="step === 'confirm'">
          <div class="step-content">
            <h2 class="step-title">ยืนยันการจอง</h2>
            
            <!-- Route Summary Compact -->
            <div class="confirm-route-card">
              <div class="route-point">
                <div class="location-marker pickup"><div class="marker-dot"></div></div>
                <div class="route-text">
                  <span class="route-label">จุดรับ</span>
                  <span class="route-address">{{ pickupAddress }}</span>
                </div>
              </div>
              <div class="route-connector"></div>
              <div class="route-point">
                <div class="location-marker destination"><div class="marker-dot"></div></div>
                <div class="route-text">
                  <span class="route-label">จุดหมาย</span>
                  <span class="route-address">{{ destinationAddress }}</span>
                </div>
              </div>
            </div>

            <!-- Selected Ride Type -->
            <div class="selected-ride-card">
              <div class="ride-icon-small">
                <svg viewBox="0 0 48 48" fill="none">
                  <rect x="4" y="18" width="40" height="18" rx="4" :fill="rideType === 'premium' ? '#1A1A1A' : '#00A86B'"/>
                  <rect x="8" y="10" width="32" height="14" rx="4" :fill="rideType === 'premium' ? '#1A1A1A' : '#00A86B'"/>
                  <circle cx="14" cy="36" r="5" fill="#333"/>
                  <circle cx="34" cy="36" r="5" fill="#333"/>
                </svg>
              </div>
              <div class="ride-type-info">
                <span class="ride-type-name">{{ selectedRideType.label }}</span>
                <span class="ride-type-desc">{{ selectedRideType.description }}</span>
              </div>
              <button class="change-btn" @click="step = 'options'">เปลี่ยน</button>
            </div>

            <!-- Payment Method -->
            <div class="payment-method-card" @click="showPaymentSheet = true">
              <div class="payment-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="1" y="4" width="22" height="16" rx="2"/>
                  <path d="M1 10h22"/>
                </svg>
              </div>
              <div class="payment-info">
                <span class="payment-label">วิธีชำระเงิน</span>
                <span class="payment-value">{{ paymentMethods.find(p => p.value === paymentMethod)?.label }}</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="arrow-icon">
                <path d="M9 5l7 7-7 7"/>
              </svg>
            </div>

            <!-- Fare Summary -->
            <div class="fare-summary">
              <div class="fare-row">
                <span>ค่าโดยสาร ({{ selectedRideType.label }})</span>
                <span>฿{{ estimatedFare.toFixed(0) }}</span>
              </div>
              <div class="fare-row">
                <span>ระยะทาง</span>
                <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
              </div>
              <div class="fare-row">
                <span>เวลาโดยประมาณ</span>
                <span>{{ estimatedTime }} นาที</span>
              </div>
              <div v-if="surgeMultiplier > 1" class="fare-row surge">
                <span>ช่วงเวลาเร่งด่วน (x{{ surgeMultiplier.toFixed(1) }})</span>
                <span>+฿{{ (estimatedFare * (surgeMultiplier - 1)).toFixed(0) }}</span>
              </div>
              <div class="fare-row total">
                <span>รวมทั้งหมด</span>
                <span>฿{{ finalFare }}</span>
              </div>
            </div>

            <!-- Confirm Book Button -->
            <button @click="bookRide" :disabled="isBooking" class="book-btn confirm-btn">
              <template v-if="isBooking">
                <span class="spinner"></span>
                <span>กำลังค้นหาคนขับ...</span>
              </template>
              <template v-else>
                <span>ยืนยันการจอง • ฿{{ finalFare }}</span>
              </template>
            </button>
          </div>
        </template>
      </div>
    </template>

    <!-- Payment Sheet -->
    <BottomSheet v-model="showPaymentSheet" title="วิธีชำระเงิน">
      <div class="payment-options">
        <button
          v-for="method in paymentMethods"
          :key="method.value"
          @click="paymentMethod = method.value; showPaymentSheet = false"
          :class="['payment-option', { active: paymentMethod === method.value }]"
        >
          <span>{{ method.label }}</span>
          <div v-if="paymentMethod === method.value" class="check-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
        </button>
      </div>
    </BottomSheet>

    <!-- Promo Sheet -->
    <BottomSheet v-model="showPromoSheet" title="โค้ดส่วนลด">
      <div class="promo-input-section">
        <input v-model="promoCode" type="text" placeholder="ใส่โค้ดส่วนลด" class="promo-input" />
        <button @click="showPromoSheet = false" class="apply-btn">ใช้</button>
      </div>
    </BottomSheet>

    <!-- Pickup Map Picker -->
    <LocationPicker
      v-if="showPickupMapPicker"
      v-model="pickupAddress"
      placeholder="เลือกจุดรับ"
      type="pickup"
      @location-selected="(loc) => handleMapPickerConfirm(loc, 'pickup')"
      @confirm="(loc) => handleMapPickerConfirm(loc, 'pickup')"
      @close="showPickupMapPicker = false"
    />

    <!-- Destination Map Picker -->
    <LocationPicker
      v-if="showDestMapPicker"
      v-model="destinationAddress"
      placeholder="เลือกจุดหมาย"
      type="destination"
      @location-selected="(loc) => handleMapPickerConfirm(loc, 'destination')"
      @confirm="(loc) => handleMapPickerConfirm(loc, 'destination')"
      @close="showDestMapPicker = false"
    />
  </div>
</template>

<style scoped>
.ride-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}

/* Map Section */
.map-section {
  position: relative;
  height: 50vh;
  flex-shrink: 0;
}

/* Top Bar */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  z-index: 10;
}

.nav-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.nav-btn:active {
  transform: scale(0.95);
}

.logo-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #FFFFFF;
  border-radius: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo-badge svg {
  width: 28px;
  height: 28px;
}

.logo-badge span {
  font-size: 14px;
  font-weight: 700;
  color: #00A86B;
  letter-spacing: 0.5px;
}

/* Bottom Panel */
.bottom-panel {
  flex: 1;
  background: #FFFFFF;
  border-radius: 28px 28px 0 0;
  margin-top: -24px;
  padding: 12px 20px 24px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  position: relative;
  z-index: 20;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.bottom-panel.expanded {
  min-height: 55vh;
}

.panel-handle {
  width: 40px;
  height: 4px;
  background: #E0E0E0;
  border-radius: 2px;
  margin: 0 auto 12px;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
  margin-bottom: 16px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  position: relative;
}

.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 14px;
  left: calc(50% + 18px);
  width: calc(100% - 36px);
  height: 2px;
  background: #E8E8E8;
}

.step-item.completed:not(:last-child)::after {
  background: #00A86B;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  background: #F5F5F5;
  color: #999999;
  position: relative;
  z-index: 1;
}

.step-item.active .step-number {
  background: #00A86B;
  color: #FFFFFF;
}

.step-item.completed .step-number {
  background: #00A86B;
  color: #FFFFFF;
}

.step-item.completed .step-number svg {
  width: 14px;
  height: 14px;
}

.step-item.clickable {
  cursor: pointer;
}

.step-label {
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  text-align: center;
}

.step-item.active .step-label {
  color: #00A86B;
  font-weight: 600;
}

.step-item.completed .step-label {
  color: #00A86B;
}

/* Step Content */
.step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.step-desc {
  font-size: 14px;
  color: #666666;
  margin: -8px 0 0;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 12px;
}

.quick-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  border-color: #00A86B;
  background: #F8FDF9;
}

.quick-action-btn:active {
  transform: scale(0.98);
}

.action-icon {
  width: 36px;
  height: 36px;
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.action-icon svg {
  width: 18px;
  height: 18px;
}

.quick-action-btn span {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
}

/* Search Input */
.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 12px;
  transition: all 0.2s;
}

.search-input-wrapper:focus-within {
  background: #FFFFFF;
  border-color: #00A86B;
}

.search-icon {
  width: 20px;
  height: 20px;
  color: #999999;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #1A1A1A;
  outline: none;
}

.search-input::placeholder {
  color: #999999;
}

/* Search Results */
.search-results {
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  overflow: hidden;
  max-height: 280px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid #F0F0F0;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: #F8FDF9;
}

.search-result-item:active {
  background: #E8F5EF;
}

.result-icon {
  width: 36px;
  height: 36px;
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
  flex-shrink: 0;
}

.result-icon svg {
  width: 18px;
  height: 18px;
}

.result-icon.destination {
  background: #FFEBEE;
  color: #E53935;
}

.result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.result-address {
  font-size: 12px;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Selected Location Card */
.selected-location-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #E8F5EF;
  border: 2px solid #00A86B;
  border-radius: 14px;
}

.selected-location-card.compact {
  background: #F5F5F5;
  border: 1px solid #E8E8E8;
}

.selected-location-card .location-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.change-btn {
  padding: 8px 14px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #00A86B;
  cursor: pointer;
}

.change-btn:active {
  background: #F5F5F5;
}

/* Calculating State */
.calculating-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: #666666;
  font-size: 14px;
}

/* Route Summary */
.route-summary {
  background: #F5F5F5;
  border-radius: 14px;
  padding: 16px;
}

.route-locations {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 12px;
}

.route-point span {
  font-size: 14px;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-line {
  width: 2px;
  height: 16px;
  background: #E8E8E8;
  margin-left: 11px;
}

.route-stats {
  display: flex;
  gap: 24px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #E8E8E8;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.stat svg {
  width: 18px;
  height: 18px;
  color: #00A86B;
}

/* Confirm Route Card */
.confirm-route-card {
  background: #F5F5F5;
  border-radius: 14px;
  padding: 16px;
}

.confirm-route-card .route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.route-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.route-label {
  font-size: 12px;
  color: #999999;
}

.route-address {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.route-connector {
  width: 2px;
  height: 20px;
  background: #E8E8E8;
  margin: 4px 0 4px 11px;
}

/* Selected Ride Card */
.selected-ride-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 14px;
}

.ride-icon-small {
  width: 48px;
  height: 36px;
  flex-shrink: 0;
}

.ride-icon-small svg {
  width: 100%;
  height: 100%;
}

.ride-type-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ride-type-name {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.ride-type-desc {
  font-size: 12px;
  color: #666666;
}

/* Payment Method Card */
.payment-method-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
}

.payment-method-card:active {
  background: #F5F5F5;
}

.payment-icon {
  width: 40px;
  height: 40px;
  background: #E8F5EF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.payment-icon svg {
  width: 20px;
  height: 20px;
}

.payment-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.payment-label {
  font-size: 12px;
  color: #999999;
}

.payment-value {
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  color: #CCCCCC;
}

/* Confirm Button */
.confirm-btn {
  margin-top: 8px;
}

/* Location Card - Legacy (kept for reference) */
.location-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  padding: 4px;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.location-marker {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.location-marker.pickup .marker-dot {
  background: #00A86B;
}

.location-marker.destination .marker-dot {
  background: #E53935;
}

.location-input {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.location-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-sublabel {
  display: block;
  font-size: 13px;
  color: #999999;
  margin-top: 2px;
}

.location-arrow {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #CCCCCC;
}

.location-arrow svg {
  width: 20px;
  height: 20px;
}

.location-divider {
  height: 1px;
  background: #F0F0F0;
  margin: 0 16px 0 54px;
}

/* Search Section */
.search-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Ride Details Header */
.ride-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ride-details-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.schedule-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #E8F5EF;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #00A86B;
  cursor: pointer;
}

.schedule-badge svg {
  width: 16px;
  height: 16px;
}

/* Ride Options */
.ride-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ride-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.ride-option:active {
  transform: scale(0.98);
}

.ride-option.active {
  border-color: #00A86B;
  background: #F8FDF9;
}

.ride-icon {
  width: 64px;
  height: 48px;
  flex-shrink: 0;
}

.ride-icon svg {
  width: 100%;
  height: 100%;
}

.ride-info {
  flex: 1;
  min-width: 0;
}

.ride-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.ride-name {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
}

.ride-price {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
}

.ride-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666666;
  margin-bottom: 4px;
}

.meta-dot {
  font-size: 8px;
}

.capacity-icon {
  width: 14px;
  height: 14px;
}

.ride-desc {
  font-size: 12px;
  color: #999999;
  margin: 0;
}

.ride-check {
  width: 28px;
  height: 28px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  flex-shrink: 0;
}

.ride-check svg {
  width: 16px;
  height: 16px;
}

/* Book Button */
.book-btn {
  width: 100%;
  padding: 18px 24px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  margin-top: auto;
}

.book-btn:hover:not(:disabled) {
  background: #008F5B;
}

.book-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.book-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Driver Card */
.driver-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 16px;
}

.driver-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driver-info {
  flex: 1;
  min-width: 0;
}

.driver-info h3 {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 4px;
}

.driver-info p {
  font-size: 13px;
  color: #666666;
  margin: 0;
}

.driver-plate {
  padding: 6px 12px;
  background: #FFFFFF;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1A1A1A;
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.driver-rating svg {
  width: 16px;
  height: 16px;
}

.driver-rating span {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  cursor: pointer;
}

.action-btn svg {
  width: 20px;
  height: 20px;
}

.action-btn.share {
  background: #00A86B;
  border-color: #00A86B;
  color: #FFFFFF;
}

.action-btn:active {
  transform: scale(0.98);
}

/* Fare Summary */
.fare-summary {
  background: #F5F5F5;
  border-radius: 12px;
  padding: 16px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666666;
  padding: 8px 0;
}

.fare-row.surge {
  color: #E65100;
}

.fare-row.total {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  border-top: 1px solid #E8E8E8;
  margin-top: 8px;
  padding-top: 12px;
}

/* Payment Options */
.payment-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.payment-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
}

.payment-option.active {
  border-color: #00A86B;
  background: #F8FDF9;
}

.check-mark {
  width: 24px;
  height: 24px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
}

.check-mark svg {
  width: 14px;
  height: 14px;
}

/* Promo Input */
.promo-input-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.promo-input {
  width: 100%;
  padding: 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
}

.promo-input:focus {
  outline: none;
  border-color: #00A86B;
}

.apply-btn {
  width: 100%;
  padding: 16px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
</style>
