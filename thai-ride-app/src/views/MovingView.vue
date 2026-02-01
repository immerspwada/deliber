<script setup lang="ts">
/**
 * Feature: F06 - Moving Service
 * Minimal Clean Design - White-Black-Gray Theme
 * Enhanced UX Flow: 1.จุดรับ → 2.จุดส่ง → 3.รายละเอียด → 4.ยืนยัน
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MapView from '../components/MapView.vue'
import LocationPicker from '../components/LocationPicker.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useMoving, type CreateMovingInput } from '../composables/useMoving'
import { useServices } from '../composables/useServices'
import { useWallet } from '../composables/useWallet'
import { useAuthStore } from '../stores/auth'
import '@/styles/delivery-minimal.css'
import type { PlaceResult } from '../composables/usePlaceSearch'

const router = useRouter()
const authStore = useAuthStore()
const { calculateDistance, getCurrentPosition } = useLocation()
const {
  createMovingRequest,
  calculatePrice,
  loading,
  error: movingError,
  clearError,
  serviceTypeLabels
} = useMoving()
const {
  homePlace,
  workPlace,
  recentPlaces,
  savedPlaces,
  fetchSavedPlaces,
  fetchRecentPlaces
} = useServices()
const wallet = useWallet()

// Step Flow
type Step = 'pickup' | 'dropoff' | 'details' | 'confirm'
const currentStep = ref<Step>('pickup')

// UI State
const isGettingLocation = ref(false)
const showPickupMapPicker = ref(false)
const showDropoffMapPicker = ref(false)
const pressedButton = ref<string | null>(null)
const showExitConfirm = ref(false)

// Swipe gesture state
const touchStartX = ref(0)
const touchStartY = ref(0)
const isSwiping = ref(false)
const swipeThreshold = 80
const swipeOffset = ref(0)
const stepDirection = ref<'next' | 'prev' | null>(null)

// Location data
const pickupAddress = ref('')
const pickupLocation = ref<GeoLocation | null>(null)
const dropoffAddress = ref('')
const dropoffLocation = ref<GeoLocation | null>(null)

// Moving details
const serviceType = ref<'small' | 'medium' | 'large'>('small')
const helperCount = ref(1)
const itemDescription = ref('')
const specialInstructions = ref('')

// Results
const estimatedPrice = ref(0)
const estimatedDistance = ref(0)

// Wallet
const walletBalance = computed(() => wallet.balance.value.balance)

// Service type options with minimal design
const serviceTypes = [
  {
    id: 'small' as const,
    label: 'ขนาดเล็ก',
    description: 'กล่องเล็ก, กระเป๋า',
    basePrice: 150,
    icon: '📦'
  },
  {
    id: 'medium' as const,
    label: 'ขนาดกลาง',
    description: 'เฟอร์นิเจอร์เล็ก',
    basePrice: 350,
    icon: '🛋️'
  },
  {
    id: 'large' as const,
    label: 'ขนาดใหญ่',
    description: 'เฟอร์นิเจอร์ใหญ่',
    basePrice: 1500,
    icon: '🏠'
  }
]

const selectedServiceType = computed(() => 
  serviceTypes.find(t => t.id === serviceType.value)
)

// Price calculation
const helperFee = computed(() => {
  const additionalHelpers = Math.max(0, helperCount.value - 1)
  return additionalHelpers * 100
})

const totalPrice = computed(() => {
  const base = selectedServiceType.value?.basePrice || 0
  return Math.round(base + helperFee.value)
})

const finalPrice = computed(() => totalPrice.value)

// Auto-calculate when locations change
const autoCalculate = async () => {
  if (pickupLocation.value && dropoffLocation.value) {
    const distance = calculateDistance(
      pickupLocation.value.lat,
      pickupLocation.value.lng,
      dropoffLocation.value.lat,
      dropoffLocation.value.lng
    )
    estimatedDistance.value = distance
    estimatedPrice.value = totalPrice.value
  }
}

watch([pickupLocation, dropoffLocation, serviceType, helperCount], autoCalculate)

const canSubmit = computed(() => 
  pickupLocation.value && dropoffLocation.value && helperCount.value > 0
)

// Validation
const validationErrors = computed(() => {
  const errors: string[] = []
  if (!pickupLocation.value) errors.push('กรุณาเลือกจุดรับของ')
  if (!dropoffLocation.value) errors.push('กรุณาเลือกจุดส่งของ')
  if (helperCount.value < 1) errors.push('กรุณาเลือกจำนวนคนขนของ')
  return errors
})

const showValidationError = () => {
  if (validationErrors.value.length > 0) {
    const errorMsg = validationErrors.value.join('\n• ')
    alert(`กรุณากรอกข้อมูลให้ครบถ้วน:\n\n• ${errorMsg}`)
    triggerHaptic('heavy')
  }
}

const hasRoute = computed(() => !!(pickupLocation.value && dropoffLocation.value))

// Haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 }
    navigator.vibrate(patterns[type])
  }
}

const handleButtonPress = (id: string) => {
  pressedButton.value = id
  triggerHaptic('light')
}

const handleButtonRelease = () => {
  pressedButton.value = null
}

// Use current location
const useCurrentLocationForPickup = async () => {
  isGettingLocation.value = true
  triggerHaptic('medium')

  try {
    const loc = await getCurrentPosition()
    if (loc) {
      pickupLocation.value = loc
      pickupAddress.value = loc.address || 'ตำแหน่งปัจจุบัน'
      triggerHaptic('heavy')
      await new Promise(resolve => setTimeout(resolve, 200))
      currentStep.value = 'dropoff'
    }
  } catch {
    alert('ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่')
  } finally {
    isGettingLocation.value = false
  }
}

// Handle place selections
const handlePickupSelect = (place: PlaceResult) => {
  triggerHaptic('light')
  pickupAddress.value = place.name
  pickupLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.address
  }
  currentStep.value = 'dropoff'
}

const handleDropoffSelect = (place: PlaceResult) => {
  triggerHaptic('light')
  dropoffAddress.value = place.name
  dropoffLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.address
  }
  currentStep.value = 'details'
}

const selectSavedPlaceForPickup = (place: any) => {
  triggerHaptic('medium')
  pickupAddress.value = place.name
  pickupLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.address
  }
  currentStep.value = 'dropoff'
}

const selectSavedPlaceForDropoff = (place: any) => {
  triggerHaptic('medium')
  dropoffAddress.value = place.name
  dropoffLocation.value = {
    lat: place.lat,
    lng: place.lng,
    address: place.address
  }
  currentStep.value = 'details'
}

const handleMapPickerConfirm = (location: GeoLocation, type: 'pickup' | 'dropoff') => {
  triggerHaptic('heavy')
  if (type === 'pickup') {
    pickupLocation.value = location
    pickupAddress.value = location.address
    showPickupMapPicker.value = false
    currentStep.value = 'dropoff'
  } else {
    dropoffLocation.value = location
    dropoffAddress.value = location.address
    showDropoffMapPicker.value = false
    currentStep.value = 'details'
  }
}

const handleRouteCalculated = async (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
}

const selectServiceType = (type: 'small' | 'medium' | 'large') => {
  triggerHaptic('light')
  serviceType.value = type
}

const incrementHelpers = () => {
  if (helperCount.value < 5) {
    helperCount.value++
    triggerHaptic('light')
  }
}

const decrementHelpers = () => {
  if (helperCount.value > 1) {
    helperCount.value--
    triggerHaptic('light')
  }
}

const handleSubmit = async () => {
  clearError()
  
  if (!canSubmit.value) {
    showValidationError()
    return
  }
  
  if (!pickupLocation.value || !dropoffLocation.value) return

  // Check wallet balance
  await wallet.fetchBalance()
  if (walletBalance.value < finalPrice.value) {
    alert(
      `ยอดเงินในกระเป๋าไม่เพียงพอ\nคงเหลือ: ฿${walletBalance.value.toLocaleString()}\nค่าบริการ: ฿${finalPrice.value.toLocaleString()}\n\nกรุณาเติมเงินก่อนสั่งบริการ`
    )
    return
  }

  triggerHaptic('heavy')

  const result = await createMovingRequest({
    service_type: serviceType.value,
    pickup_address: pickupAddress.value,
    pickup_lat: pickupLocation.value.lat,
    pickup_lng: pickupLocation.value.lng,
    destination_address: dropoffAddress.value,
    destination_lat: dropoffLocation.value.lat,
    destination_lng: dropoffLocation.value.lng,
    item_description: itemDescription.value || specialInstructions.value,
    helper_count: helperCount.value
  })

  if (result) {
    router.push(`/tracking/${result.tracking_id}`)
  }
}

const goBack = () => {
  triggerHaptic('light')
  if (currentStep.value === 'dropoff') currentStep.value = 'pickup'
  else if (currentStep.value === 'details') currentStep.value = 'dropoff'
  else if (currentStep.value === 'confirm') currentStep.value = 'details'
  else router.push('/customer')
}

const hasEnteredData = computed(() => {
  return pickupAddress.value || dropoffAddress.value || itemDescription.value || specialInstructions.value
})

const goHome = () => {
  triggerHaptic('medium')
  if (hasEnteredData.value) {
    showExitConfirm.value = true
  } else {
    router.push('/customer')
  }
}

const confirmExit = () => {
  triggerHaptic('heavy')
  showExitConfirm.value = false
  router.push('/customer')
}

const cancelExit = () => {
  triggerHaptic('light')
  showExitConfirm.value = false
}

// Swipe gesture handlers
const handleTouchStart = (e: TouchEvent) => {
  if (showPickupMapPicker.value || showDropoffMapPicker.value) return
  const touch = e.touches[0]
  if (touch) {
    touchStartX.value = touch.clientX
    touchStartY.value = touch.clientY
    isSwiping.value = true
    swipeOffset.value = 0
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isSwiping.value) return
  const touch = e.touches[0]
  if (!touch) return

  const deltaX = touch.clientX - touchStartX.value
  const deltaY = touch.clientY - touchStartY.value

  if (Math.abs(deltaY) > Math.abs(deltaX)) {
    isSwiping.value = false
    return
  }

  swipeOffset.value = deltaX
}

const handleTouchEnd = () => {
  if (!isSwiping.value) return

  const deltaX = swipeOffset.value

  if (Math.abs(deltaX) > swipeThreshold) {
    if (deltaX > 0 && currentStep.value !== 'pickup') {
      stepDirection.value = 'prev'
      goBack()
    } else if (deltaX < 0) {
      stepDirection.value = 'next'
      if (currentStep.value === 'pickup' && pickupLocation.value) {
        currentStep.value = 'dropoff'
      } else if (currentStep.value === 'dropoff' && dropoffLocation.value) {
        currentStep.value = 'details'
      } else if (currentStep.value === 'details' && canSubmit.value) {
        currentStep.value = 'confirm'
      }
    }
  }

  isSwiping.value = false
  swipeOffset.value = 0
  setTimeout(() => {
    stepDirection.value = null
  }, 300)
}

onMounted(async () => {
  await wallet.fetchBalance()
  await fetchSavedPlaces()
  await fetchRecentPlaces()
})
</script>

<template>
  <div 
    class="delivery-view"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Top Bar -->
    <div class="top-bar">
      <button 
        class="back-btn"
        :class="{ pressed: pressedButton === 'back' }"
        @mousedown="handleButtonPress('back')"
        @mouseup="handleButtonRelease"
        @mouseleave="handleButtonRelease"
        @touchstart.prevent="handleButtonPress('back')"
        @touchend.prevent="handleButtonRelease"
        @click="goBack"
        aria-label="ย้อนกลับ"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1 class="page-title">ขนย้าย</h1>
      <button 
        class="home-btn"
        :class="{ pressed: pressedButton === 'home' }"
        @mousedown="handleButtonPress('home')"
        @mouseup="handleButtonRelease"
        @mouseleave="handleButtonRelease"
        @touchstart.prevent="handleButtonPress('home')"
        @touchend.prevent="handleButtonRelease"
        @click="goHome"
        aria-label="กลับหน้าหลัก"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </button>
    </div>

    <!-- Map Section -->
    <div class="map-section">
      <MapView
        v-if="hasRoute"
        :pickup-location="pickupLocation"
        :dropoff-location="dropoffLocation"
        :show-route="true"
        @route-calculated="handleRouteCalculated"
      />
      <div v-else class="map-placeholder">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <p>เลือกจุดรับและจุดส่งเพื่อดูเส้นทาง</p>
      </div>

      <!-- Route Info Overlay -->
      <div v-if="hasRoute" class="route-info-overlay">
        <div class="route-info-content">
          <div class="info-item">
            <span class="info-label">ระยะทาง</span>
            <span class="info-value">{{ estimatedDistance.toFixed(1) }} กม.</span>
          </div>
          <div class="info-divider"></div>
          <div class="info-item">
            <span class="info-label">ค่าบริการ</span>
            <span class="info-value price">฿{{ totalPrice.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Panel -->
    <div class="bottom-panel" :class="{ 'step-transition': stepDirection }">
      <!-- Step Progress Bar -->
      <div class="step-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill"
            :style="{ 
              width: currentStep === 'pickup' ? '25%' : 
                     currentStep === 'dropoff' ? '50%' : 
                     currentStep === 'details' ? '75%' : '100%' 
            }"
          ></div>
        </div>
        <div class="step-labels">
          <span :class="{ active: currentStep === 'pickup' }">จุดรับ</span>
          <span :class="{ active: currentStep === 'dropoff' }">จุดส่ง</span>
          <span :class="{ active: currentStep === 'details' }">รายละเอียด</span>
          <span :class="{ active: currentStep === 'confirm' }">ยืนยัน</span>
        </div>
      </div>

      <!-- Step 1: Pickup Location -->
      <div v-if="currentStep === 'pickup'" class="step-content">
        <h2 class="step-title">จุดรับของ</h2>
        
        <!-- Current Location Button -->
        <button
          class="location-btn current-location"
          :class="{ pressed: pressedButton === 'current-pickup' }"
          :disabled="isGettingLocation"
          @mousedown="handleButtonPress('current-pickup')"
          @mouseup="handleButtonRelease"
          @mouseleave="handleButtonRelease"
          @touchstart.prevent="handleButtonPress('current-pickup')"
          @touchend.prevent="handleButtonRelease"
          @click="useCurrentLocationForPickup"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>{{ isGettingLocation ? 'กำลังระบุตำแหน่ง...' : 'ใช้ตำแหน่งปัจจุบัน' }}</span>
        </button>

        <!-- Quick Access Buttons -->
        <div class="quick-access">
          <button
            v-if="homePlace"
            class="quick-btn"
            :class="{ pressed: pressedButton === 'home-pickup' }"
            @mousedown="handleButtonPress('home-pickup')"
            @mouseup="handleButtonRelease"
            @mouseleave="handleButtonRelease"
            @touchstart.prevent="handleButtonPress('home-pickup')"
            @touchend.prevent="handleButtonRelease"
            @click="selectSavedPlaceForPickup(homePlace)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            <span>บ้าน</span>
          </button>
          <button
            v-if="workPlace"
            class="quick-btn"
            :class="{ pressed: pressedButton === 'work-pickup' }"
            @mousedown="handleButtonPress('work-pickup')"
            @mouseup="handleButtonRelease"
            @mouseleave="handleButtonRelease"
            @touchstart.prevent="handleButtonPress('work-pickup')"
            @touchend.prevent="handleButtonRelease"
            @click="selectSavedPlaceForPickup(workPlace)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            <span>ที่ทำงาน</span>
          </button>
        </div>

        <!-- Map Picker Button -->
        <button
          class="location-btn map-picker"
          :class="{ pressed: pressedButton === 'map-pickup' }"
          @mousedown="handleButtonPress('map-pickup')"
          @mouseup="handleButtonRelease"
          @mouseleave="handleButtonRelease"
          @touchstart.prevent="handleButtonPress('map-pickup')"
          @touchend.prevent="handleButtonRelease"
          @click="showPickupMapPicker = true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          </svg>
          <span>เลือกจากแผนที่</span>
        </button>

        <!-- Saved Places -->
        <div v-if="savedPlaces.length > 0" class="saved-places">
          <h3 class="section-subtitle">สถานที่ที่บันทึกไว้</h3>
          <div class="places-list">
            <button
              v-for="place in savedPlaces"
              :key="place.id"
              class="place-item"
              @click="selectSavedPlaceForPickup(place)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <div class="place-info">
                <span class="place-name">{{ place.name }}</span>
                <span class="place-address">{{ place.address }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Recent Places -->
        <div v-if="recentPlaces.length > 0" class="recent-places">
          <h3 class="section-subtitle">สถานที่ล่าสุด</h3>
          <div class="places-list">
            <button
              v-for="place in recentPlaces.slice(0, 3)"
              :key="place.id"
              class="place-item"
              @click="selectSavedPlaceForPickup(place)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <div class="place-info">
                <span class="place-name">{{ place.name }}</span>
                <span class="place-address">{{ place.address }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2: Dropoff Location -->
      <div v-if="currentStep === 'dropoff'" class="step-content">
        <h2 class="step-title">จุดส่งของ</h2>
        
        <!-- Selected Pickup Display -->
        <div class="selected-location">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>{{ pickupAddress }}</span>
        </div>

        <!-- Quick Access Buttons -->
        <div class="quick-access">
          <button
            v-if="homePlace"
            class="quick-btn"
            :class="{ pressed: pressedButton === 'home-dropoff' }"
            @mousedown="handleButtonPress('home-dropoff')"
            @mouseup="handleButtonRelease"
            @mouseleave="handleButtonRelease"
            @touchstart.prevent="handleButtonPress('home-dropoff')"
            @touchend.prevent="handleButtonRelease"
            @click="selectSavedPlaceForDropoff(homePlace)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            <span>บ้าน</span>
          </button>
          <button
            v-if="workPlace"
            class="quick-btn"
            :class="{ pressed: pressedButton === 'work-dropoff' }"
            @mousedown="handleButtonPress('work-dropoff')"
            @mouseup="handleButtonRelease"
            @mouseleave="handleButtonRelease"
            @touchstart.prevent="handleButtonPress('work-dropoff')"
            @touchend.prevent="handleButtonRelease"
            @click="selectSavedPlaceForDropoff(workPlace)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            <span>ที่ทำงาน</span>
          </button>
        </div>

        <!-- Map Picker Button -->
        <button
          class="location-btn map-picker"
          :class="{ pressed: pressedButton === 'map-dropoff' }"
          @mousedown="handleButtonPress('map-dropoff')"
          @mouseup="handleButtonRelease"
          @mouseleave="handleButtonRelease"
          @touchstart.prevent="handleButtonPress('map-dropoff')"
          @touchend.prevent="handleButtonRelease"
          @click="showDropoffMapPicker = true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          </svg>
          <span>เลือกจากแผนที่</span>
        </button>

        <!-- Saved Places -->
        <div v-if="savedPlaces.length > 0" class="saved-places">
          <h3 class="section-subtitle">สถานที่ที่บันทึกไว้</h3>
          <div class="places-list">
            <button
              v-for="place in savedPlaces"
              :key="place.id"
              class="place-item"
              @click="selectSavedPlaceForDropoff(place)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <div class="place-info">
                <span class="place-name">{{ place.name }}</span>
                <span class="place-address">{{ place.address }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Step 3: Moving Details -->
      <div v-if="currentStep === 'details'" class="step-content">
        <h2 class="step-title">รายละเอียดการขนย้าย</h2>

        <!-- Service Type Selection -->
        <div class="service-type-section">
          <h3 class="section-subtitle">ขนาดของที่ต้องขนย้าย</h3>
          <div class="service-type-grid">
            <button
              v-for="type in serviceTypes"
              :key="type.id"
              class="service-type-card"
              :class="{ 
                selected: serviceType === type.id,
                pressed: pressedButton === `service-${type.id}`
              }"
              @mousedown="handleButtonPress(`service-${type.id}`)"
              @mouseup="handleButtonRelease"
              @mouseleave="handleButtonRelease"
              @touchstart.prevent="handleButtonPress(`service-${type.id}`)"
              @touchend.prevent="handleButtonRelease"
              @click="selectServiceType(type.id)"
            >
              <div class="service-icon">{{ type.icon }}</div>
              <div class="service-info">
                <span class="service-label">{{ type.label }}</span>
                <span class="service-description">{{ type.description }}</span>
                <span class="service-price">฿{{ type.basePrice.toLocaleString() }}</span>
              </div>
              <div v-if="serviceType === type.id" class="check-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </button>
          </div>
        </div>

        <!-- Helper Count -->
        <div class="helper-section">
          <h3 class="section-subtitle">จำนวนคนขนของ</h3>
          <div class="helper-counter">
            <button
              class="counter-btn"
              :class="{ pressed: pressedButton === 'helper-minus' }"
              :disabled="helperCount <= 1"
              @mousedown="handleButtonPress('helper-minus')"
              @mouseup="handleButtonRelease"
              @mouseleave="handleButtonRelease"
              @touchstart.prevent="handleButtonPress('helper-minus')"
              @touchend.prevent="handleButtonRelease"
              @click="decrementHelpers"
              aria-label="ลดจำนวนคนขนของ"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <div class="counter-display">
              <span class="counter-value">{{ helperCount }}</span>
              <span class="counter-label">คน</span>
            </div>
            <button
              class="counter-btn"
              :class="{ pressed: pressedButton === 'helper-plus' }"
              :disabled="helperCount >= 5"
              @mousedown="handleButtonPress('helper-plus')"
              @mouseup="handleButtonRelease"
              @mouseleave="handleButtonRelease"
              @touchstart.prevent="handleButtonPress('helper-plus')"
              @touchend.prevent="handleButtonRelease"
              @click="incrementHelpers"
              aria-label="เพิ่มจำนวนคนขนของ"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
          <p v-if="helperFee > 0" class="helper-fee-note">
            +฿{{ helperFee.toLocaleString() }} (คนเพิ่ม {{ helperCount - 1 }} คน × ฿100)
          </p>
        </div>

        <!-- Item Description -->
        <div class="form-group">
          <label for="item-description" class="form-label">รายการของที่ต้องขนย้าย (ไม่บังคับ)</label>
          <textarea
            id="item-description"
            v-model="itemDescription"
            class="form-textarea"
            rows="3"
            placeholder="เช่น โซฟา 1 ตัว, โต๊ะทำงาน, กล่องเสื้อผ้า 5 กล่อง"
            maxlength="500"
          ></textarea>
          <span class="char-count">{{ itemDescription.length }}/500</span>
        </div>

        <!-- Special Instructions -->
        <div class="form-group">
          <label for="special-instructions" class="form-label">คำแนะนำพิเศษ (ไม่บังคับ)</label>
          <textarea
            id="special-instructions"
            v-model="specialInstructions"
            class="form-textarea"
            rows="2"
            placeholder="เช่น ต้องใช้บันไดขึ้นชั้น 3, ของหนักมาก, ระวังของแตก"
            maxlength="300"
          ></textarea>
          <span class="char-count">{{ specialInstructions.length }}/300</span>
        </div>

        <!-- Next Button -->
        <button
          class="next-btn"
          :class="{ pressed: pressedButton === 'next-details' }"
          @mousedown="handleButtonPress('next-details')"
          @mouseup="handleButtonRelease"
          @mouseleave="handleButtonRelease"
          @touchstart.prevent="handleButtonPress('next-details')"
          @touchend.prevent="handleButtonRelease"
          @click="currentStep = 'confirm'"
        >
          <span>ถัดไป</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <!-- Step 4: Confirm -->
      <div v-if="currentStep === 'confirm'" class="step-content">
        <h2 class="step-title">ยืนยันการขนย้าย</h2>

        <!-- Route Summary -->
        <div class="summary-section">
          <h3 class="section-subtitle">เส้นทาง</h3>
          <div class="route-summary">
            <div class="route-point">
              <div class="point-icon pickup">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div class="point-info">
                <span class="point-label">จุดรับของ</span>
                <span class="point-address">{{ pickupAddress }}</span>
              </div>
            </div>
            <div class="route-line"></div>
            <div class="route-point">
              <div class="point-icon dropoff">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div class="point-info">
                <span class="point-label">จุดส่งของ</span>
                <span class="point-address">{{ dropoffAddress }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Service Summary -->
        <div class="summary-section">
          <h3 class="section-subtitle">รายละเอียดบริการ</h3>
          <div class="service-summary">
            <div class="summary-row">
              <span class="summary-label">ขนาด</span>
              <span class="summary-value">{{ selectedServiceType?.label }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">จำนวนคนขนของ</span>
              <span class="summary-value">{{ helperCount }} คน</span>
            </div>
            <div v-if="itemDescription" class="summary-row">
              <span class="summary-label">รายการของ</span>
              <span class="summary-value">{{ itemDescription }}</span>
            </div>
            <div v-if="specialInstructions" class="summary-row">
              <span class="summary-label">คำแนะนำ</span>
              <span class="summary-value">{{ specialInstructions }}</span>
            </div>
          </div>
        </div>

        <!-- Price Breakdown -->
        <div class="summary-section">
          <h3 class="section-subtitle">ค่าบริการ</h3>
          <div class="price-breakdown">
            <div class="price-row">
              <span class="price-label">ค่าบริการพื้นฐาน</span>
              <span class="price-value">฿{{ selectedServiceType?.basePrice.toLocaleString() }}</span>
            </div>
            <div v-if="helperFee > 0" class="price-row">
              <span class="price-label">ค่าคนขนของเพิ่ม ({{ helperCount - 1 }} คน)</span>
              <span class="price-value">฿{{ helperFee.toLocaleString() }}</span>
            </div>
            <div class="price-divider"></div>
            <div class="price-row total">
              <span class="price-label">ยอดรวม</span>
              <span class="price-value">฿{{ finalPrice.toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Wallet Balance -->
        <div class="wallet-info" :class="{ insufficient: walletBalance < finalPrice }">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          <span class="wallet-label">ยอดเงินคงเหลือ:</span>
          <span class="wallet-balance">฿{{ walletBalance.toLocaleString() }}</span>
        </div>

        <!-- Insufficient Balance Warning -->
        <div v-if="walletBalance < finalPrice" class="warning-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อนสั่งบริการ</span>
        </div>

        <!-- Submit Button -->
        <button
          class="submit-btn"
          :class="{ 
            pressed: pressedButton === 'submit',
            disabled: !canSubmit || walletBalance < finalPrice
          }"
          :disabled="!canSubmit || loading || walletBalance < finalPrice"
          @mousedown="handleButtonPress('submit')"
          @mouseup="handleButtonRelease"
          @mouseleave="handleButtonRelease"
          @touchstart.prevent="handleButtonPress('submit')"
          @touchend.prevent="handleButtonRelease"
          @click="handleSubmit"
        >
          <span v-if="loading">กำลังสร้างคำสั่ง...</span>
          <span v-else>ยืนยันการขนย้าย</span>
        </button>
      </div>
    </div>

    <!-- Map Picker Modals -->
    <LocationPicker
      v-if="showPickupMapPicker"
      title="เลือกจุดรับของ"
      @confirm="(loc) => handleMapPickerConfirm(loc, 'pickup')"
      @cancel="showPickupMapPicker = false"
    />
    <LocationPicker
      v-if="showDropoffMapPicker"
      title="เลือกจุดส่งของ"
      @confirm="(loc) => handleMapPickerConfirm(loc, 'dropoff')"
      @cancel="showDropoffMapPicker = false"
    />

    <!-- Exit Confirmation Modal -->
    <div v-if="showExitConfirm" class="modal-overlay" @click="cancelExit">
      <div class="modal-content" @click.stop>
        <h3 class="modal-title">ยกเลิกการขนย้าย?</h3>
        <p class="modal-message">ข้อมูลที่กรอกจะไม่ถูกบันทึก</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="cancelExit">ยกเลิก</button>
          <button class="modal-btn confirm" @click="confirmExit">ออก</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/styles/delivery-minimal.css';

/* Additional Moving-specific styles */
.service-type-grid {
  display: grid;
  gap: 12px;
}

.service-type-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.service-type-card.selected {
  border-color: #000;
  background: #f9fafb;
}

.service-type-card.pressed {
  transform: scale(0.98);
}

.service-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.service-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-label {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.service-description {
  font-size: 13px;
  color: #6b7280;
}

.service-price {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  margin-top: 4px;
}

.check-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #000;
}

.helper-section {
  margin-top: 24px;
}

.helper-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 12px;
}

.counter-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.counter-btn:hover:not(:disabled) {
  border-color: #000;
}

.counter-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.counter-btn.pressed {
  transform: scale(0.95);
}

.counter-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 80px;
}

.counter-value {
  font-size: 32px;
  font-weight: 700;
  color: #000;
}

.counter-label {
  font-size: 14px;
  color: #6b7280;
}

.helper-fee-note {
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  margin-top: 12px;
}

.form-group {
  margin-top: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #000;
  margin-bottom: 8px;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 15px;
  color: #000;
  resize: vertical;
  transition: border-color 0.2s;
}

.form-textarea:focus {
  outline: none;
  border-color: #000;
}

.form-textarea::placeholder {
  color: #9ca3af;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.next-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 24px;
  transition: all 0.2s;
}

.next-btn.pressed {
  transform: scale(0.98);
}

.route-summary {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.point-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-icon.pickup {
  background: #e5e7eb;
  color: #000;
}

.point-icon.dropoff {
  background: #000;
  color: #fff;
}

.point-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.point-label {
  font-size: 13px;
  color: #6b7280;
}

.point-address {
  font-size: 15px;
  font-weight: 500;
  color: #000;
}

.route-line {
  width: 2px;
  height: 24px;
  background: #e5e7eb;
  margin-left: 15px;
}

.service-summary,
.price-breakdown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-row,
.price-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.summary-label,
.price-label {
  font-size: 14px;
  color: #6b7280;
  flex: 1;
}

.summary-value,
.price-value {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  text-align: right;
}

.price-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.price-row.total {
  margin-top: 4px;
}

.price-row.total .price-label,
.price-row.total .price-value {
  font-size: 18px;
  font-weight: 700;
}

.wallet-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  margin-top: 16px;
}

.wallet-info.insufficient {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.wallet-label {
  font-size: 14px;
  color: #6b7280;
}

.wallet-balance {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  margin-left: auto;
}

.wallet-info.insufficient .wallet-balance {
  color: #dc2626;
}

.warning-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 2px solid #fecaca;
  border-radius: 12px;
  color: #dc2626;
  font-size: 14px;
  margin-top: 12px;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 24px;
  transition: all 0.2s;
}

.submit-btn.pressed {
  transform: scale(0.98);
}

.submit-btn.disabled,
.submit-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
