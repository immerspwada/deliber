<script setup lang="ts">
/**
 * Feature: F02 - Customer Ride Booking
 * หน้าเรียกรถสำหรับลูกค้า - Uber Style UI
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
const { getSurgeMultiplier, surgeMultiplier } = useSurgePricing()

// Check for pre-set destination from services page
onMounted(async () => {
  const pendingDest = rideStore.consumeDestination()
  if (pendingDest) {
    destinationLocation.value = pendingDest
    destinationAddress.value = pendingDest.address
  }
  
  // Check surge pricing
  if (pickupLocation.value) {
    await getSurgeMultiplier(pickupLocation.value.lat, pickupLocation.value.lng)
  }
  
  // Initialize ride store if user logged in
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
const showFareResult = ref(false)
const showRideOptions = ref(false)
const showPaymentSheet = ref(false)
const showPromoSheet = ref(false)
const step = ref<'location' | 'options' | 'confirm'>('location')

// Active ride state
const activeRide = ref<RideRequest | null>(null)
const assignedProvider = ref<ServiceProvider | null>(null)
const viewMode = ref<'booking' | 'tracking'>('booking')

// Ride types configuration
const rideTypes = [
  { 
    value: 'standard', 
    label: 'ThaiRide', 
    description: 'รถยนต์ทั่วไป ราคาประหยัด',
    multiplier: 1.0, 
    icon: 'car',
    eta: '3-5 นาที',
    capacity: '4 ที่นั่ง'
  },
  { 
    value: 'premium', 
    label: 'ThaiRide Premium', 
    description: 'รถหรู บริการพิเศษ',
    multiplier: 1.5, 
    icon: 'star',
    eta: '5-8 นาที',
    capacity: '4 ที่นั่ง'
  },
  { 
    value: 'shared', 
    label: 'ThaiRide Share', 
    description: 'ร่วมเดินทาง ประหยัดกว่า',
    multiplier: 0.7, 
    icon: 'users',
    eta: '5-10 นาที',
    capacity: '2 ที่นั่ง'
  }
] as const

const paymentMethods = [
  { value: 'cash', label: 'เงินสด', icon: 'cash' },
  { value: 'wallet', label: 'ThaiRide Wallet', icon: 'wallet' },
  { value: 'card', label: 'บัตรเครดิต/เดบิต', icon: 'card' }
] as const

const canCalculate = computed(() => pickupLocation.value && destinationLocation.value)
const canBook = computed(() => canCalculate.value && showFareResult.value)

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

// Handlers
const handlePickupSelected = async (location: GeoLocation) => {
  pickupLocation.value = location
  showFareResult.value = false
  await getSurgeMultiplier(location.lat, location.lng)
}

const handleDestinationSelected = (location: GeoLocation) => {
  destinationLocation.value = location
  showFareResult.value = false
  if (pickupLocation.value) {
    calculateFare()
  }
}

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
  showFareResult.value = true
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
      // Auto find driver
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
  
  if (confirm('คุณต้องการยกเลิกการเดินทางหรือไม่?')) {
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
  showFareResult.value = false
  step.value = 'location'
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
    step.value = 'location'
    showFareResult.value = false
  } else {
    router.back()
  }
}

watch(rideType, () => {
  if (showFareResult.value && estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, rideType.value)
  }
})
</script>

<template>
  <div class="ride-page">
    <!-- Tracking Mode -->
    <template v-if="viewMode === 'tracking' && activeRide">
      <div class="tracking-view">
        <div class="tracking-header">
          <button class="back-btn" @click="goBack">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="tracking-title">การเดินทางของคุณ</h1>
          <div style="width: 40px"></div>
        </div>
        <RideTracker
          :ride="activeRide"
          :provider="assignedProvider || rideStore.matchedDriver"
          @cancel="handleCancelRide"
          @complete="handleRideComplete"
        />
      </div>
    </template>

    <!-- Booking Mode -->
    <template v-else>
      <!-- Map Background -->
      <div class="map-section">
        <MapView
          :pickup="pickupLocation"
          :destination="destinationLocation"
          :show-route="showFareResult"
          height="100%"
          @route-calculated="handleRouteCalculated"
        />
        
        <!-- Back Button -->
        <button class="map-back-btn" @click="goBack">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
      </div>

      <!-- Bottom Panel -->
      <div class="booking-panel" :class="{ 'panel-expanded': showFareResult }">
        <!-- Location Step -->
        <template v-if="step === 'location'">
          <div class="panel-header">
            <h2 class="panel-title">ไปไหนดี?</h2>
          </div>
          
          <div class="location-inputs">
            <div class="location-row">
              <div class="location-icon pickup-icon">
                <div class="dot"></div>
              </div>
              <LocationPicker
                v-model="pickupAddress"
                placeholder="จุดรับ - ค้นหาหรือใช้ GPS"
                type="pickup"
                @location-selected="handlePickupSelected"
              />
            </div>
            
            <div class="location-divider">
              <div class="divider-line"></div>
            </div>
            
            <div class="location-row">
              <div class="location-icon dest-icon">
                <div class="square"></div>
              </div>
              <LocationPicker
                v-model="destinationAddress"
                placeholder="จุดหมาย - ค้นหาสถานที่"
                type="destination"
                @location-selected="handleDestinationSelected"
              />
            </div>
          </div>

          <!-- Quick Places -->
          <div class="quick-places">
            <button class="quick-place-btn" @click="router.push('/customer/saved-places')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              <span>บ้าน</span>
            </button>
            <button class="quick-place-btn" @click="router.push('/customer/saved-places')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
              </svg>
              <span>ที่ทำงาน</span>
            </button>
            <button class="quick-place-btn" @click="router.push('/customer/saved-places')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
              <span>บันทึกไว้</span>
            </button>
          </div>
        </template>

        <!-- Options Step -->
        <template v-else-if="step === 'options'">
          <div class="panel-header">
            <h2 class="panel-title">เลือกประเภทรถ</h2>
            <div class="route-summary">
              <span class="route-distance">{{ estimatedDistance.toFixed(1) }} กม.</span>
              <span class="route-dot">•</span>
              <span class="route-time">{{ estimatedTime }} นาที</span>
            </div>
          </div>

          <!-- Surge Warning -->
          <div v-if="surgeMultiplier > 1" class="surge-warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span>ช่วงเวลาพีค ราคาสูงขึ้น {{ ((surgeMultiplier - 1) * 100).toFixed(0) }}%</span>
          </div>

          <!-- Ride Type Options -->
          <div class="ride-options">
            <button
              v-for="type in rideTypes"
              :key="type.value"
              @click="selectRideType(type.value)"
              :class="['ride-option', { 'ride-option-active': rideType === type.value }]"
            >
              <div class="ride-option-icon">
                <svg v-if="type.icon === 'car'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
                </svg>
                <svg v-else-if="type.icon === 'star'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
                <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <div class="ride-option-info">
                <div class="ride-option-header">
                  <span class="ride-option-name">{{ type.label }}</span>
                  <span class="ride-option-price">฿{{ Math.round(rideStore.calculateFare(estimatedDistance, type.value) * surgeMultiplier) }}</span>
                </div>
                <div class="ride-option-meta">
                  <span class="ride-option-eta">{{ type.eta }}</span>
                  <span class="ride-option-capacity">{{ type.capacity }}</span>
                </div>
                <p class="ride-option-desc">{{ type.description }}</p>
              </div>
              <div v-if="rideType === type.value" class="ride-option-check">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
            </button>
          </div>

          <!-- Passenger Count -->
          <div class="passenger-section">
            <span class="passenger-label">จำนวนผู้โดยสาร</span>
            <div class="passenger-controls">
              <button
                @click="passengerCount = Math.max(1, passengerCount - 1)"
                :disabled="passengerCount <= 1"
                class="passenger-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14"/>
                </svg>
              </button>
              <span class="passenger-count">{{ passengerCount }}</span>
              <button
                @click="passengerCount = Math.min(4, passengerCount + 1)"
                :disabled="passengerCount >= 4"
                class="passenger-btn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Continue Button -->
          <button @click="step = 'confirm'" class="btn-primary">
            ดำเนินการต่อ
          </button>
        </template>

        <!-- Confirm Step -->
        <template v-else-if="step === 'confirm'">
          <div class="panel-header">
            <h2 class="panel-title">ยืนยันการจอง</h2>
          </div>

          <!-- Trip Summary -->
          <div class="trip-summary">
            <div class="trip-locations">
              <div class="trip-location">
                <div class="location-marker pickup"></div>
                <div class="location-details">
                  <span class="location-type">จุดรับ</span>
                  <span class="location-address">{{ pickupAddress || 'ตำแหน่งปัจจุบัน' }}</span>
                </div>
              </div>
              <div class="trip-line"></div>
              <div class="trip-location">
                <div class="location-marker destination"></div>
                <div class="location-details">
                  <span class="location-type">จุดหมาย</span>
                  <span class="location-address">{{ destinationAddress }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Selected Ride Type -->
          <div class="selected-ride">
            <div class="selected-ride-info">
              <span class="selected-ride-name">{{ selectedRideType.label }}</span>
              <span class="selected-ride-meta">{{ estimatedDistance.toFixed(1) }} กม. • {{ estimatedTime }} นาที</span>
            </div>
            <button class="change-btn" @click="step = 'options'">เปลี่ยน</button>
          </div>

          <!-- Payment Method -->
          <div class="payment-method" @click="showPaymentSheet = true">
            <div class="payment-info">
              <svg v-if="paymentMethod === 'cash'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <svg v-else-if="paymentMethod === 'wallet'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12V7H5a2 2 0 010-4h14v4"/>
                <path d="M3 5v14a2 2 0 002 2h16v-5"/>
                <path d="M18 12a2 2 0 100 4 2 2 0 000-4z"/>
              </svg>
              <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <span>{{ paymentMethods.find(p => p.value === paymentMethod)?.label }}</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>

          <!-- Promo Code -->
          <div class="promo-section" @click="showPromoSheet = true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span v-if="promoCode">{{ promoCode }}</span>
            <span v-else class="promo-placeholder">ใส่โค้ดส่วนลด</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>

          <!-- Fare Breakdown -->
          <div class="fare-breakdown">
            <div class="fare-row">
              <span>ค่าโดยสาร</span>
              <span>฿{{ estimatedFare.toFixed(0) }}</span>
            </div>
            <div v-if="surgeMultiplier > 1" class="fare-row surge">
              <span>ค่าบริการช่วงพีค (x{{ surgeMultiplier.toFixed(1) }})</span>
              <span>+฿{{ (estimatedFare * (surgeMultiplier - 1)).toFixed(0) }}</span>
            </div>
            <div class="fare-row total">
              <span>รวมทั้งหมด</span>
              <span class="fare-total">฿{{ finalFare }}</span>
            </div>
          </div>

          <!-- Book Button -->
          <button @click="bookRide" :disabled="isBooking" class="btn-primary book-btn">
            <template v-if="isBooking">
              <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>กำลังจอง...</span>
            </template>
            <template v-else>
              <span>จองรถ • ฿{{ finalFare }}</span>
            </template>
          </button>
        </template>
      </div>
    </template>

    <!-- Payment Method Sheet -->
    <BottomSheet v-model="showPaymentSheet" title="เลือกวิธีชำระเงิน">
      <div class="payment-options">
        <button
          v-for="method in paymentMethods"
          :key="method.value"
          @click="paymentMethod = method.value; showPaymentSheet = false"
          :class="['payment-option', { 'payment-option-active': paymentMethod === method.value }]"
        >
          <svg v-if="method.icon === 'cash'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <svg v-else-if="method.icon === 'wallet'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12V7H5a2 2 0 010-4h14v4"/>
            <path d="M3 5v14a2 2 0 002 2h16v-5"/>
            <path d="M18 12a2 2 0 100 4 2 2 0 000-4z"/>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <span>{{ method.label }}</span>
          <div v-if="paymentMethod === method.value" class="check-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
        </button>
      </div>
    </BottomSheet>

    <!-- Promo Code Sheet -->
    <BottomSheet v-model="showPromoSheet" title="โค้ดส่วนลด">
      <div class="promo-input-section">
        <input
          v-model="promoCode"
          type="text"
          placeholder="ใส่โค้ดส่วนลด"
          class="promo-input"
        />
        <button @click="showPromoSheet = false" class="btn-primary">
          ใช้โค้ด
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.ride-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

/* Tracking View */
.tracking-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tracking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5e5;
}

.tracking-title {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}

/* Map Section */
.map-section {
  position: relative;
  height: 45vh;
  min-height: 280px;
}

.map-back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 44px;
  height: 44px;
  background: #fff;
  border: none;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Booking Panel */
.booking-panel {
  flex: 1;
  background: #fff;
  border-radius: 20px 20px 0 0;
  margin-top: -20px;
  position: relative;
  z-index: 5;
  padding: 20px 16px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-expanded {
  min-height: 55vh;
}

.panel-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #000;
}

.route-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b6b6b;
}

.route-dot {
  font-size: 8px;
}

/* Location Inputs */
.location-inputs {
  background: #f6f6f6;
  border-radius: 12px;
  padding: 4px;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px;
}

.location-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pickup-icon .dot {
  width: 10px;
  height: 10px;
  background: #000;
  border-radius: 50%;
}

.dest-icon .square {
  width: 10px;
  height: 10px;
  background: #000;
}

.location-divider {
  padding-left: 36px;
}

.divider-line {
  height: 1px;
  background: #e5e5e5;
}

.location-row :deep(.location-picker) {
  flex: 1;
}

.location-row :deep(.input-wrapper) {
  border: none;
  background: transparent;
  padding: 12px 0;
}

/* Quick Places */
.quick-places {
  display: flex;
  gap: 8px;
}

.quick-place-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: #f6f6f6;
  border: none;
  border-radius: 12px;
  font-size: 12px;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
}

.quick-place-btn:hover {
  background: #e5e5e5;
}

/* Surge Warning */
.surge-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff3cd;
  border-radius: 8px;
  font-size: 13px;
  color: #856404;
}

/* Ride Options */
.ride-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ride-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.ride-option:hover {
  border-color: #ccc;
}

.ride-option-active {
  border-color: #000;
  background: #f6f6f6;
}

.ride-option-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ride-option-info {
  flex: 1;
  min-width: 0;
}

.ride-option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.ride-option-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.ride-option-price {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.ride-option-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 2px;
}

.ride-option-desc {
  font-size: 12px;
  color: #6b6b6b;
  margin: 0;
}

.ride-option-check {
  width: 24px;
  height: 24px;
  background: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

/* Passenger Section */
.passenger-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f6f6f6;
  border-radius: 12px;
}

.passenger-label {
  font-size: 14px;
  font-weight: 500;
}

.passenger-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.passenger-btn {
  width: 36px;
  height: 36px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.passenger-btn:hover:not(:disabled) {
  border-color: #000;
}

.passenger-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.passenger-count {
  font-size: 18px;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}

/* Trip Summary */
.trip-summary {
  background: #f6f6f6;
  border-radius: 12px;
  padding: 16px;
}

.trip-locations {
  display: flex;
  flex-direction: column;
}

.trip-location {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.location-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.location-marker.pickup {
  background: #000;
}

.location-marker.destination {
  background: #000;
  border-radius: 2px;
}

.trip-line {
  width: 2px;
  height: 24px;
  background: #ccc;
  margin-left: 5px;
  margin: 4px 0 4px 5px;
}

.location-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.location-type {
  font-size: 11px;
  color: #6b6b6b;
  text-transform: uppercase;
}

.location-address {
  font-size: 14px;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Selected Ride */
.selected-ride {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
}

.selected-ride-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selected-ride-name {
  font-size: 15px;
  font-weight: 600;
}

.selected-ride-meta {
  font-size: 13px;
  color: #6b6b6b;
}

.change-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

/* Payment Method */
.payment-method {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
  cursor: pointer;
}

.payment-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 500;
}

/* Promo Section */
.promo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
}

.promo-section span {
  flex: 1;
}

.promo-placeholder {
  color: #6b6b6b;
}

/* Fare Breakdown */
.fare-breakdown {
  background: #f6f6f6;
  border-radius: 12px;
  padding: 16px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
  color: #6b6b6b;
}

.fare-row.surge {
  color: #856404;
}

.fare-row.total {
  border-top: 1px solid #e5e5e5;
  margin-top: 8px;
  padding-top: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.fare-total {
  font-size: 24px;
  font-weight: 700;
}

/* Buttons */
.btn-primary {
  width: 100%;
  padding: 16px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.book-btn {
  margin-top: auto;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  gap: 16px;
  padding: 16px;
  background: #fff;
  border: 2px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s;
}

.payment-option:hover {
  border-color: #ccc;
}

.payment-option-active {
  border-color: #000;
}

.payment-option span {
  flex: 1;
}

.check-icon {
  width: 24px;
  height: 24px;
  background: #000;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
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
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
}

.promo-input:focus {
  border-color: #000;
}

/* Responsive */
@media (min-width: 768px) {
  .ride-page {
    max-width: 480px;
    margin: 0 auto;
  }
}
</style>
