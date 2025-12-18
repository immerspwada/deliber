<script setup lang="ts">
/**
 * Feature: F03 - Delivery Service
 * MUNEEF Style UI - Clean and Modern
 * Enhanced UX Flow: 1.จุดรับ → 2.จุดส่ง → 3.รายละเอียด → 4.ยืนยัน
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MapView from '../components/MapView.vue'
import LocationPicker from '../components/LocationPicker.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useDelivery, QUALITY_PRESETS, type ImageQuality } from '../composables/useDelivery'
import { useServices } from '../composables/useServices'
import { useAuthStore } from '../stores/auth'
import type { PlaceResult } from '../composables/usePlaceSearch'

const router = useRouter()
const authStore = useAuthStore()
const { calculateDistance, getCurrentPosition } = useLocation()
const { createDeliveryRequest, calculateFee, calculateTimeRange, uploadPackagePhoto, compressImage, loading, error: deliveryError, clearError } = useDelivery()
const { homePlace, workPlace, recentPlaces, savedPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()

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
const swipeThreshold = 80 // minimum swipe distance

// Sender info
const senderName = ref('')
const senderPhone = ref('')
const senderAddress = ref('')
const senderLocation = ref<GeoLocation | null>(null)

// Recipient info
const recipientName = ref('')
const recipientPhone = ref('')
const recipientAddress = ref('')
const recipientLocation = ref<GeoLocation | null>(null)

// Package info
const packageDescription = ref('')
const packageWeight = ref('1')
const packageType = ref<'document' | 'small' | 'medium' | 'large'>('small')
const specialInstructions = ref('')

// Package photo
const packagePhoto = ref<string | null>(null)
const packagePhotoFile = ref<File | null>(null)
const isUploadingPhoto = ref(false)
const photoInputRef = ref<HTMLInputElement | null>(null)
const selectedQuality = ref<ImageQuality>('medium')
const showQualitySelector = ref(false)

// Results
const deliveryFee = ref(0)
const estimatedTime = ref(0)
const estimatedTimeRange = ref({ min: 15, max: 30 })
const estimatedDistance = ref(0)

// Favorite places (not home/work)
const favoritePlaces = computed(() => 
  savedPlaces.value.filter(p => p.place_type === 'other').slice(0, 3)
)

// Step labels
const stepLabels = [
  { key: 'pickup', label: 'จุดรับ', number: 1 },
  { key: 'dropoff', label: 'จุดส่ง', number: 2 },
  { key: 'details', label: 'รายละเอียด', number: 3 },
  { key: 'confirm', label: 'ยืนยัน', number: 4 }
] as const

const currentStepIndex = computed(() => stepLabels.findIndex(s => s.key === currentStep.value))

// Package types with SVG icons
const packageTypes = [
  { value: 'document', label: 'เอกสาร', maxWeight: 0.5, desc: 'จดหมาย, สัญญา' },
  { value: 'small', label: 'เล็ก', maxWeight: 5, desc: 'กล่องเล็ก, ซอง' },
  { value: 'medium', label: 'กลาง', maxWeight: 15, desc: 'กล่องกลาง' },
  { value: 'large', label: 'ใหญ่', maxWeight: 30, desc: 'กล่องใหญ่' }
] as const

fetchSavedPlaces()
fetchRecentPlaces()

onMounted(() => {
  if (authStore.user) {
    senderName.value = (authStore.user as any).first_name || authStore.user.name || ''
    senderPhone.value = (authStore.user as any).phone_number || authStore.user.phone || ''
  }
})

// Auto calculate when both locations set
const autoCalculate = () => {
  if (senderLocation.value && recipientLocation.value) {
    estimatedDistance.value = calculateDistance(
      senderLocation.value.lat, senderLocation.value.lng,
      recipientLocation.value.lat, recipientLocation.value.lng
    )
    estimatedTime.value = Math.ceil((estimatedDistance.value / 25) * 60)
    estimatedTimeRange.value = calculateTimeRange(estimatedDistance.value)
    deliveryFee.value = calculateFee(estimatedDistance.value, packageType.value)
  }
}

// Photo upload handlers
const triggerPhotoUpload = () => {
  photoInputRef.value?.click()
}

const handlePhotoSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  triggerHaptic('light')
  isUploadingPhoto.value = true
  
  try {
    // Compress image using selected quality preset
    const compressedFile = await compressImage(file, selectedQuality.value)
    packagePhotoFile.value = compressedFile
    
    // Create preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      packagePhoto.value = e.target?.result as string
    }
    reader.readAsDataURL(compressedFile)
    
    triggerHaptic('medium')
  } catch (err) {
    console.error('Error processing photo:', err)
    alert('ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่')
  } finally {
    isUploadingPhoto.value = false
  }
}

const selectQuality = (quality: ImageQuality) => {
  triggerHaptic('light')
  selectedQuality.value = quality
  showQualitySelector.value = false
}

const removePhoto = () => {
  triggerHaptic('light')
  packagePhoto.value = null
  packagePhotoFile.value = null
  if (photoInputRef.value) {
    photoInputRef.value.value = ''
  }
}

watch([senderLocation, recipientLocation, packageType], autoCalculate)

const canSubmit = computed(() => 
  senderLocation.value && recipientLocation.value && recipientPhone.value
)

const hasRoute = computed(() => !!(senderLocation.value && recipientLocation.value))

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
      senderLocation.value = loc
      senderAddress.value = loc.address || 'ตำแหน่งปัจจุบัน'
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
void function handlePickupSelect(place: PlaceResult) {
  triggerHaptic('light')
  senderAddress.value = place.name
  senderLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
  currentStep.value = 'dropoff'
}

void function handleDropoffSelect(place: PlaceResult) {
  triggerHaptic('light')
  recipientAddress.value = place.name
  recipientLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
  currentStep.value = 'details'
}

const selectSavedPlaceForPickup = (place: any) => {
  triggerHaptic('medium')
  senderAddress.value = place.name
  senderLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
  currentStep.value = 'dropoff'
}

const selectSavedPlaceForDropoff = (place: any) => {
  triggerHaptic('medium')
  recipientAddress.value = place.name
  recipientLocation.value = { lat: place.lat, lng: place.lng, address: place.address }
  currentStep.value = 'details'
}

const handleMapPickerConfirm = (location: GeoLocation, type: 'pickup' | 'dropoff') => {
  triggerHaptic('heavy')
  if (type === 'pickup') {
    senderLocation.value = location
    senderAddress.value = location.address
    showPickupMapPicker.value = false
    currentStep.value = 'dropoff'
  } else {
    recipientLocation.value = location
    recipientAddress.value = location.address
    showDropoffMapPicker.value = false
    currentStep.value = 'details'
  }
}

const handleRouteCalculated = (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
  estimatedTime.value = data.duration
  deliveryFee.value = calculateFee(data.distance, packageType.value)
}

const selectPackageType = (type: 'document' | 'small' | 'medium' | 'large') => {
  triggerHaptic('light')
  packageType.value = type
}

const handleSubmit = async () => {
  clearError()
  if (!canSubmit.value || !senderLocation.value || !recipientLocation.value) return
  
  triggerHaptic('heavy')
  
  // Upload photo if exists
  let uploadedPhotoUrl: string | undefined
  if (packagePhotoFile.value) {
    isUploadingPhoto.value = true
    uploadedPhotoUrl = (await uploadPackagePhoto(packagePhotoFile.value)) || undefined
    isUploadingPhoto.value = false
  }
  
  const result = await createDeliveryRequest({
    senderName: senderName.value || 'ผู้ส่ง',
    senderPhone: senderPhone.value,
    senderAddress: senderAddress.value,
    senderLocation: senderLocation.value,
    recipientName: recipientName.value || 'ผู้รับ',
    recipientPhone: recipientPhone.value,
    recipientAddress: recipientAddress.value,
    recipientLocation: recipientLocation.value,
    packageType: packageType.value,
    packageWeight: parseFloat(packageWeight.value) || 1,
    packageDescription: packageDescription.value || specialInstructions.value,
    packagePhoto: uploadedPhotoUrl,
    distanceKm: estimatedDistance.value
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

// Check if user has entered any data
const hasEnteredData = computed(() => {
  return senderAddress.value || recipientAddress.value || 
         packageDescription.value || specialInstructions.value ||
         packagePhoto.value !== null
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
  }
}

const handleTouchEnd = (e: TouchEvent) => {
  if (!isSwiping.value) return
  isSwiping.value = false
  
  const touch = e.changedTouches[0]
  if (!touch) return
  
  const deltaX = touch.clientX - touchStartX.value
  const deltaY = touch.clientY - touchStartY.value
  
  // Only trigger if horizontal swipe is dominant
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
    if (deltaX > 0) {
      // Swipe right - go back
      goBack()
    } else {
      // Swipe left - go next (if allowed)
      handleSwipeNext()
    }
  }
}

const handleSwipeNext = () => {
  if (currentStep.value === 'pickup' && senderLocation.value) {
    triggerHaptic('medium')
    currentStep.value = 'dropoff'
  } else if (currentStep.value === 'dropoff' && recipientLocation.value) {
    triggerHaptic('medium')
    currentStep.value = 'details'
  } else if (currentStep.value === 'details' && recipientPhone.value) {
    triggerHaptic('medium')
    currentStep.value = 'confirm'
  }
}

const goToStep = (targetStep: Step) => {
  const targetIndex = stepLabels.findIndex(s => s.key === targetStep)
  if (targetIndex <= currentStepIndex.value) {
    currentStep.value = targetStep
  }
}

const clearPickup = () => {
  senderLocation.value = null
  senderAddress.value = ''
}

const clearDropoff = () => {
  recipientLocation.value = null
  recipientAddress.value = ''
}
</script>

<template>
  <div 
    class="delivery-page"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- Exit Confirmation Dialog -->
    <Transition name="modal">
      <div v-if="showExitConfirm" class="confirm-overlay" @click.self="cancelExit">
        <div class="confirm-dialog">
          <div class="confirm-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#F5A623" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 class="confirm-title">ออกจากหน้านี้?</h3>
          <p class="confirm-message">ข้อมูลที่กรอกไว้จะหายไป</p>
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="cancelExit">ยกเลิก</button>
            <button class="confirm-btn exit" @click="confirmExit">ออก</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Error Toast -->
    <Transition name="toast">
      <div v-if="deliveryError" class="error-toast" @click="clearError">
        <div class="error-icon">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke-width="2"/>
            <path stroke-linecap="round" stroke-width="2" d="M12 8v4m0 4h.01"/>
          </svg>
        </div>
        <span class="error-message">{{ deliveryError }}</span>
        <button class="error-close" @click.stop="clearError">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Top Bar (Fixed at top) -->
    <div class="top-bar">
      <button class="nav-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <span class="page-title">ส่งพัสดุ</span>
      <button class="nav-btn home-btn" @click="goHome" title="กลับหน้าหลัก">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      </button>
    </div>

    <!-- Map Section -->
    <div class="map-section">
      <MapView
        :pickup="senderLocation"
        :destination="recipientLocation"
        :show-route="hasRoute"
        height="100%"
        @route-calculated="handleRouteCalculated"
      />
    </div>

    <!-- Bottom Panel -->
    <div class="bottom-panel" :class="{ expanded: currentStep === 'details' || currentStep === 'confirm' }">
      <div class="panel-handle"></div>
      
      <!-- Step Indicator -->
      <div class="step-indicator">
        <div 
          v-for="(s, index) in stepLabels" 
          :key="s.key"
          :class="['step-item', { 
            active: s.key === currentStep, 
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

      <!-- Step 1: จุดรับพัสดุ -->
      <template v-if="currentStep === 'pickup'">
        <div class="step-content animate-step">
          <div class="step-header">
            <div class="step-header-icon pickup-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
              </svg>
            </div>
            <div class="step-header-text">
              <h2 class="step-title">รับพัสดุที่ไหน?</h2>
              <p class="step-desc">เลือกจุดที่ไรเดอร์จะมารับของ</p>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions-grid">
            <button 
              class="quick-action-card"
              :class="{ 'is-loading': isGettingLocation, 'is-pressed': pressedButton === 'current-loc' }"
              @mousedown="handleButtonPress('current-loc')"
              @mouseup="handleButtonRelease"
              @touchstart="handleButtonPress('current-loc')"
              @touchend="handleButtonRelease"
              @click="useCurrentLocationForPickup"
              :disabled="isGettingLocation"
            >
              <div class="action-card-icon">
                <template v-if="isGettingLocation">
                  <div class="mini-spinner"></div>
                </template>
                <template v-else>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
                  </svg>
                </template>
              </div>
              <div class="action-card-content">
                <span class="action-card-title">ตำแหน่งปัจจุบัน</span>
                <span class="action-card-subtitle">{{ isGettingLocation ? 'กำลังค้นหา...' : 'ใช้ GPS ระบุตำแหน่ง' }}</span>
              </div>
              <div class="action-card-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </button>
            
            <button 
              class="quick-action-card"
              :class="{ 'is-pressed': pressedButton === 'map-picker' }"
              @mousedown="handleButtonPress('map-picker')"
              @mouseup="handleButtonRelease"
              @touchstart="handleButtonPress('map-picker')"
              @touchend="handleButtonRelease"
              @click="showPickupMapPicker = true; triggerHaptic('light')"
            >
              <div class="action-card-icon map-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div class="action-card-content">
                <span class="action-card-title">เลือกจากแผนที่</span>
                <span class="action-card-subtitle">ปักหมุดตำแหน่งบนแผนที่</span>
              </div>
              <div class="action-card-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </button>
          </div>

          <!-- Quick Saved Places -->
          <div v-if="homePlace || workPlace" class="quick-destinations">
            <h4 class="section-title-small">สถานที่บันทึกไว้</h4>
            <div class="quick-dest-row">
              <button 
                v-if="homePlace" 
                class="quick-dest-chip"
                :class="{ 'is-pressed': pressedButton === 'home' }"
                @mousedown="handleButtonPress('home')"
                @mouseup="handleButtonRelease"
                @touchstart="handleButtonPress('home')"
                @touchend="handleButtonRelease"
                @click="selectSavedPlaceForPickup(homePlace)"
              >
                <div class="chip-icon home">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9,22 9,12 15,12 15,22"/>
                  </svg>
                </div>
                <span>บ้าน</span>
              </button>
              <button 
                v-if="workPlace" 
                class="quick-dest-chip"
                :class="{ 'is-pressed': pressedButton === 'work' }"
                @mousedown="handleButtonPress('work')"
                @mouseup="handleButtonRelease"
                @touchstart="handleButtonPress('work')"
                @touchend="handleButtonRelease"
                @click="selectSavedPlaceForPickup(workPlace)"
              >
                <div class="chip-icon work">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                  </svg>
                </div>
                <span>ที่ทำงาน</span>
              </button>
            </div>
          </div>

          <!-- Recent Places -->
          <div v-if="recentPlaces.length > 0" class="places-section">
            <h4 class="section-title-small">เคยใช้เมื่อเร็วๆ นี้</h4>
            <div class="places-list">
              <button 
                v-for="(place, index) in recentPlaces.slice(0, 3)" 
                :key="place.id"
                class="place-item animate-item"
                :style="{ animationDelay: `${index * 50}ms` }"
                @click="selectSavedPlaceForPickup(place)"
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

          <!-- Selected Location -->
          <Transition name="scale-fade">
            <div v-if="senderLocation" class="selected-location-card success">
              <div class="success-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <div class="location-marker pickup">
                <div class="marker-dot pulse"></div>
              </div>
              <div class="location-info">
                <span class="location-sublabel">จุดรับพัสดุ</span>
                <span class="location-label">{{ senderAddress }}</span>
              </div>
              <button class="change-btn" @click="clearPickup; triggerHaptic('light')">
                เปลี่ยน
              </button>
            </div>
          </Transition>

          <!-- Continue Button -->
          <Transition name="slide-up">
            <button 
              v-if="senderLocation" 
              class="continue-btn primary"
              @click="currentStep = 'dropoff'; triggerHaptic('medium')"
            >
              <span>ไปเลือกจุดส่ง</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </Transition>
        </div>
      </template>

      <!-- Step 2: จุดส่งพัสดุ -->
      <template v-else-if="currentStep === 'dropoff'">
        <div class="step-content animate-step">
          <div class="step-header">
            <div class="step-header-icon destination-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="step-header-text">
              <h2 class="step-title">ส่งพัสดุที่ไหน?</h2>
              <p class="step-desc">เลือกจุดหมายปลายทาง</p>
            </div>
          </div>

          <!-- Route Preview -->
          <div class="route-preview-card">
            <div class="route-preview-item">
              <div class="route-dot pickup"></div>
              <div class="route-preview-text">
                <span class="route-preview-label">จุดรับ</span>
                <span class="route-preview-value">{{ senderAddress }}</span>
              </div>
              <button class="edit-btn" @click="currentStep = 'pickup'; triggerHaptic('light')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
            <div class="route-connector-line"></div>
            <div class="route-preview-item destination-slot">
              <div class="route-dot destination empty"></div>
              <div class="route-preview-text">
                <span class="route-preview-label">จุดส่ง</span>
                <span class="route-preview-placeholder">เลือกจุดส่งด้านล่าง</span>
              </div>
            </div>
          </div>

          <!-- Quick Saved Places -->
          <div v-if="homePlace || workPlace" class="quick-destinations">
            <h4 class="section-title-small">ส่งไปที่</h4>
            <div class="quick-dest-row">
              <button 
                v-if="homePlace" 
                class="quick-dest-chip"
                @click="selectSavedPlaceForDropoff(homePlace)"
              >
                <div class="chip-icon home">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    <polyline points="9,22 9,12 15,12 15,22"/>
                  </svg>
                </div>
                <span>บ้าน</span>
              </button>
              <button 
                v-if="workPlace" 
                class="quick-dest-chip"
                @click="selectSavedPlaceForDropoff(workPlace)"
              >
                <div class="chip-icon work">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                  </svg>
                </div>
                <span>ที่ทำงาน</span>
              </button>
            </div>
          </div>

          <!-- Map Picker Button -->
          <button 
            class="map-picker-btn"
            @click="showDropoffMapPicker = true; triggerHaptic('light')"
          >
            <div class="map-picker-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="map-picker-text">
              <span class="map-picker-title">เลือกจากแผนที่</span>
              <span class="map-picker-subtitle">ปักหมุดตำแหน่งที่ต้องการ</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="map-picker-arrow">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          <!-- Favorite Places -->
          <div v-if="favoritePlaces.length > 0" class="places-section">
            <h4 class="section-title-small">สถานที่โปรด</h4>
            <div class="places-list">
              <button 
                v-for="(place, index) in favoritePlaces" 
                :key="place.id"
                class="place-item animate-item"
                :style="{ animationDelay: `${index * 50}ms` }"
                @click="selectSavedPlaceForDropoff(place)"
              >
                <div class="place-icon favorite">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
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
          <div v-if="recentPlaces.length > 0" class="places-section">
            <h4 class="section-title-small">เคยส่งไป</h4>
            <div class="places-list">
              <button 
                v-for="(place, index) in recentPlaces.slice(0, 3)" 
                :key="place.id"
                class="place-item animate-item"
                :style="{ animationDelay: `${(index + favoritePlaces.length) * 50}ms` }"
                @click="selectSavedPlaceForDropoff(place)"
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

          <!-- Selected Location -->
          <Transition name="scale-fade">
            <div v-if="recipientLocation" class="selected-location-card success destination">
              <div class="success-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <div class="location-marker destination">
                <div class="marker-dot"></div>
              </div>
              <div class="location-info">
                <span class="location-sublabel">จุดส่งพัสดุ</span>
                <span class="location-label">{{ recipientAddress }}</span>
              </div>
              <button class="change-btn" @click="clearDropoff; triggerHaptic('light')">
                เปลี่ยน
              </button>
            </div>
          </Transition>

          <!-- Continue Button -->
          <Transition name="slide-up">
            <button 
              v-if="recipientLocation" 
              class="continue-btn primary"
              @click="currentStep = 'details'; triggerHaptic('medium')"
            >
              <span>ไปกรอกรายละเอียด</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </Transition>
        </div>
      </template>

      <!-- Step 3: รายละเอียดพัสดุ -->
      <template v-else-if="currentStep === 'details'">
        <div class="step-content animate-step">
          <div class="step-header">
            <div class="step-header-icon details-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <div class="step-header-text">
              <h2 class="step-title">รายละเอียดพัสดุ</h2>
              <p class="step-desc">เลือกประเภทและกรอกข้อมูลผู้รับ</p>
            </div>
          </div>

          <!-- Route Summary -->
          <div class="route-summary-card-enhanced">
            <div class="route-summary-header">
              <div class="route-summary-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                </svg>
              </div>
              <span class="route-summary-title">เส้นทางจัดส่ง</span>
            </div>
            <div class="route-summary-body">
              <div class="route-point-enhanced">
                <div class="route-dot-enhanced pickup"></div>
                <div class="route-point-text">
                  <span class="route-point-label">รับที่</span>
                  <span class="route-point-value">{{ senderAddress }}</span>
                </div>
              </div>
              <div class="route-connector-enhanced"></div>
              <div class="route-point-enhanced">
                <div class="route-dot-enhanced destination"></div>
                <div class="route-point-text">
                  <span class="route-point-label">ส่งที่</span>
                  <span class="route-point-value">{{ recipientAddress }}</span>
                </div>
              </div>
            </div>
            <div class="route-stats-enhanced">
              <div class="stat-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
              </div>
              <div class="stat-chip time-range">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span>{{ estimatedTimeRange.min }}-{{ estimatedTimeRange.max }} นาที</span>
              </div>
            </div>
          </div>

          <!-- Package Photo Upload -->
          <div class="photo-upload-section">
            <div class="photo-header">
              <h4 class="section-title-small">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
                ถ่ายรูปพัสดุ (แนะนำ)
              </h4>
              <!-- Quality Selector Toggle -->
              <button 
                class="quality-toggle-btn"
                @click="showQualitySelector = !showQualitySelector; triggerHaptic('light')"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
                <span>{{ QUALITY_PRESETS[selectedQuality].label }}</span>
              </button>
            </div>
            <p class="photo-hint">ช่วยให้ไรเดอร์ระบุพัสดุได้ง่ายขึ้น</p>
            
            <!-- Quality Selector Dropdown -->
            <Transition name="slide-down">
              <div v-if="showQualitySelector" class="quality-selector">
                <div class="quality-selector-header">
                  <span>คุณภาพรูปภาพ</span>
                  <span class="quality-hint">เลือกตามความเร็ว internet</span>
                </div>
                <div class="quality-options">
                  <button
                    v-for="(preset, key) in QUALITY_PRESETS"
                    :key="key"
                    :class="['quality-option', { active: selectedQuality === key }]"
                    @click="selectQuality(key as ImageQuality)"
                  >
                    <div class="quality-option-icon">
                      <svg v-if="key === 'low'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      <svg v-else-if="key === 'medium'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                      </svg>
                    </div>
                    <div class="quality-option-info">
                      <span class="quality-option-label">{{ preset.label }}</span>
                      <span class="quality-option-desc">{{ preset.description }} ({{ preset.estimatedSize }})</span>
                    </div>
                    <div v-if="selectedQuality === key" class="quality-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </Transition>
            
            <input 
              ref="photoInputRef"
              type="file" 
              accept="image/*" 
              capture="environment"
              class="hidden-input"
              @change="handlePhotoSelect"
            />
            
            <div v-if="!packagePhoto" class="photo-upload-area" @click="triggerPhotoUpload">
              <div class="upload-icon" :class="{ 'is-loading': isUploadingPhoto }">
                <template v-if="isUploadingPhoto">
                  <div class="mini-spinner"></div>
                </template>
                <template v-else>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </template>
              </div>
              <span class="upload-text">{{ isUploadingPhoto ? 'กำลังประมวลผล...' : 'แตะเพื่อถ่ายรูป' }}</span>
              <span class="upload-subtext">หรือเลือกจากคลังรูป</span>
            </div>
            
            <div v-else class="photo-preview">
              <img :src="packagePhoto" alt="Package photo" class="preview-image" />
              <button class="remove-photo-btn" @click="removePhoto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              </button>
              <div class="photo-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Package Type Selection -->
          <div class="package-type-section">
            <h4 class="section-title-small">ประเภทพัสดุ</h4>
            <div class="package-type-grid">
              <button
                v-for="(type, index) in packageTypes"
                :key="type.value"
                @click="selectPackageType(type.value)"
                :class="['package-type-card', { active: packageType === type.value }]"
                :style="{ animationDelay: `${index * 50}ms` }"
              >
                <div class="package-type-icon">
                  <svg v-if="type.value === 'document'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <div class="package-type-info">
                  <span class="package-type-name">{{ type.label }}</span>
                  <span class="package-type-weight">≤{{ type.maxWeight }} กก.</span>
                </div>
                <div v-if="packageType === type.value" class="package-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <!-- Recipient Phone -->
          <div class="input-section">
            <label class="input-label-enhanced">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <span>เบอร์ผู้รับ (จำเป็น)</span>
            </label>
            <input 
              v-model="recipientPhone" 
              type="tel" 
              placeholder="08X-XXX-XXXX" 
              class="input-field-enhanced"
              inputmode="tel"
            />
            <p v-if="!recipientPhone" class="input-hint">ไรเดอร์จะโทรหาผู้รับเมื่อถึงจุดส่ง</p>
          </div>

          <!-- Recipient Name (Optional) -->
          <div class="input-section">
            <label class="input-label-enhanced">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>ชื่อผู้รับ (ไม่บังคับ)</span>
            </label>
            <input 
              v-model="recipientName" 
              type="text" 
              placeholder="ชื่อผู้รับพัสดุ" 
              class="input-field-enhanced"
            />
          </div>

          <!-- Special Instructions (Optional) -->
          <div class="input-section">
            <label class="input-label-enhanced">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <span>หมายเหตุ (ไม่บังคับ)</span>
            </label>
            <textarea 
              v-model="specialInstructions" 
              placeholder="เช่น วางหน้าประตู, โทรก่อนส่ง..." 
              class="textarea-field-enhanced"
              rows="2"
            ></textarea>
          </div>

          <!-- Continue Button -->
          <button 
            class="continue-btn primary"
            :disabled="!recipientPhone"
            @click="currentStep = 'confirm'; triggerHaptic('medium')"
          >
            <span>ดูสรุปและยืนยัน</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </template>

      <!-- Step 4: ยืนยันการส่ง -->
      <template v-else-if="currentStep === 'confirm'">
        <div class="step-content animate-step">
          <div class="step-header">
            <div class="step-header-icon confirm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div class="step-header-text">
              <h2 class="step-title">ยืนยันการส่ง</h2>
              <p class="step-desc">ตรวจสอบรายละเอียดก่อนเรียกไรเดอร์</p>
            </div>
          </div>

          <!-- Confirm Route Card -->
          <div class="confirm-card">
            <div class="confirm-card-header">
              <span class="confirm-card-title">เส้นทาง</span>
              <button class="edit-link" @click="currentStep = 'pickup'; triggerHaptic('light')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
            <div class="confirm-card-body">
              <div class="confirm-route-point">
                <div class="confirm-dot pickup"></div>
                <div class="confirm-route-text">
                  <span class="confirm-route-label">รับพัสดุที่</span>
                  <span class="confirm-route-value">{{ senderAddress }}</span>
                </div>
              </div>
              <div class="confirm-route-line"></div>
              <div class="confirm-route-point">
                <div class="confirm-dot destination"></div>
                <div class="confirm-route-text">
                  <span class="confirm-route-label">ส่งพัสดุที่</span>
                  <span class="confirm-route-value">{{ recipientAddress }}</span>
                </div>
              </div>
            </div>
            <div class="confirm-card-stats">
              <div class="confirm-stat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                <span>{{ estimatedDistance.toFixed(1) }} กม.</span>
              </div>
              <div class="confirm-stat-divider"></div>
              <div class="confirm-stat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span>{{ estimatedTimeRange.min }}-{{ estimatedTimeRange.max }} นาที</span>
              </div>
            </div>
          </div>

          <!-- Package Photo Preview (if uploaded) -->
          <div v-if="packagePhoto" class="confirm-card photo-card">
            <div class="confirm-card-header">
              <span class="confirm-card-title">รูปพัสดุ</span>
              <button class="edit-link" @click="currentStep = 'details'; triggerHaptic('light')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
            <div class="confirm-photo-preview">
              <img :src="packagePhoto" alt="Package" class="confirm-photo-img" />
              <div class="photo-verified-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span>รูปพัสดุพร้อมส่ง</span>
              </div>
            </div>
          </div>

          <!-- Package Info Card -->
          <div class="confirm-card">
            <div class="confirm-card-header">
              <span class="confirm-card-title">พัสดุ</span>
              <button class="edit-link" @click="currentStep = 'details'; triggerHaptic('light')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
            <div class="confirm-card-body">
              <div class="confirm-info-row">
                <span class="confirm-info-label">ประเภท</span>
                <span class="confirm-info-value">{{ packageTypes.find(t => t.value === packageType)?.label }}</span>
              </div>
              <div class="confirm-info-row">
                <span class="confirm-info-label">ผู้รับ</span>
                <span class="confirm-info-value">{{ recipientName || '-' }}</span>
              </div>
              <div class="confirm-info-row">
                <span class="confirm-info-label">เบอร์ผู้รับ</span>
                <span class="confirm-info-value">{{ recipientPhone }}</span>
              </div>
              <div v-if="specialInstructions" class="confirm-info-row">
                <span class="confirm-info-label">หมายเหตุ</span>
                <span class="confirm-info-value">{{ specialInstructions }}</span>
              </div>
            </div>
          </div>

          <!-- Fee Summary -->
          <div class="fee-summary-card">
            <div class="fee-summary-header">
              <span class="fee-summary-title">สรุปค่าส่ง</span>
            </div>
            <div class="fee-summary-body">
              <div class="fee-row">
                <span class="fee-label">ค่าส่งพัสดุ</span>
                <span class="fee-value">฿{{ deliveryFee }}</span>
              </div>
              <div class="fee-row">
                <span class="fee-label">ระยะทาง</span>
                <span class="fee-value">{{ estimatedDistance.toFixed(1) }} กม.</span>
              </div>
              <div class="fee-divider"></div>
              <div class="fee-row total">
                <span class="fee-label">รวมทั้งหมด</span>
                <span class="fee-value total">฿{{ deliveryFee }}</span>
              </div>
            </div>
          </div>

          <!-- Confirm Button -->
          <button 
            @click="handleSubmit" 
            :disabled="!canSubmit || loading" 
            :class="['confirm-book-btn', { 'is-loading': loading }]"
          >
            <template v-if="loading">
              <div class="booking-spinner"></div>
              <div class="booking-text">
                <span class="booking-title">กำลังเรียกไรเดอร์...</span>
                <span class="booking-subtitle">รอสักครู่</span>
              </div>
            </template>
            <template v-else>
              <div class="confirm-btn-content">
                <span class="confirm-btn-text">ยืนยันส่งพัสดุ</span>
                <span class="confirm-btn-price">฿{{ deliveryFee }}</span>
              </div>
              <div class="confirm-btn-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </template>
          </button>

          <!-- Safety Note -->
          <div class="safety-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>พัสดุของคุณได้รับการคุ้มครองโดย GOBEAR</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Pickup Map Picker -->
    <LocationPicker
      v-if="showPickupMapPicker"
      v-model="senderAddress"
      placeholder="เลือกจุดรับพัสดุ"
      type="pickup"
      @location-selected="(loc) => handleMapPickerConfirm(loc, 'pickup')"
      @confirm="(loc) => handleMapPickerConfirm(loc, 'pickup')"
      @close="showPickupMapPicker = false"
    />

    <!-- Dropoff Map Picker -->
    <LocationPicker
      v-if="showDropoffMapPicker"
      v-model="recipientAddress"
      placeholder="เลือกจุดส่งพัสดุ"
      type="destination"
      @location-selected="(loc) => handleMapPickerConfirm(loc, 'dropoff')"
      @confirm="(loc) => handleMapPickerConfirm(loc, 'dropoff')"
      @close="showDropoffMapPicker = false"
    />
  </div>
</template>

<style scoped>
.delivery-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
}

/* Map Section */
.map-section {
  position: relative;
  height: 45vh;
  flex-shrink: 0;
  margin-top: calc(76px + env(safe-area-inset-top));
}

/* Top Bar */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top));
  z-index: 100;
  background: linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 70%, transparent 100%);
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

.nav-btn.home-btn {
  background: rgba(0, 168, 107, 0.1);
}

.nav-btn.home-btn svg {
  stroke: #00A86B;
}

.nav-btn.home-btn:active {
  background: rgba(0, 168, 107, 0.2);
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
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
  min-height: 60vh;
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

.animate-step {
  animation: stepFadeIn 0.4s ease-out;
}

@keyframes stepFadeIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Step Header */
.step-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 8px;
}

.step-header-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-header-icon svg {
  width: 24px;
  height: 24px;
}

.step-header-icon.pickup-icon {
  background: #E8F5EF;
  color: #00A86B;
}

.step-header-icon.destination-icon {
  background: #FFEBEE;
  color: #E53935;
}

.step-header-icon.details-icon {
  background: #E3F2FD;
  color: #1976D2;
}

.step-header-icon.confirm-icon {
  background: #DCFCE7;
  color: #16A34A;
}

.step-header-text {
  flex: 1;
}

.step-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 2px;
}

.step-desc {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

/* Quick Actions Grid */
.quick-actions-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #FFFFFF;
  border: 1.5px solid #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.quick-action-card:hover {
  border-color: #00A86B;
  background: #FAFFFE;
}

.quick-action-card:active,
.quick-action-card.is-pressed {
  transform: scale(0.98);
  background: #F0FDF4;
}

.quick-action-card.is-loading {
  opacity: 0.8;
  pointer-events: none;
}

.action-card-icon {
  width: 44px;
  height: 44px;
  background: #E8F5EF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
  flex-shrink: 0;
}

.action-card-icon svg {
  width: 22px;
  height: 22px;
}

.action-card-icon.map-icon {
  background: #E3F2FD;
  color: #1976D2;
}

.action-card-content {
  flex: 1;
  min-width: 0;
}

.action-card-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.action-card-subtitle {
  display: block;
  font-size: 12px;
  color: #666666;
}

.action-card-arrow {
  width: 20px;
  height: 20px;
  color: #CCCCCC;
  flex-shrink: 0;
}

.action-card-arrow svg {
  width: 100%;
  height: 100%;
}

/* Mini Spinner */
.mini-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid #E8F5EF;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Quick Destinations */
.quick-destinations {
  margin-bottom: 4px;
}

.section-title-small {
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 10px;
}

.quick-dest-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-dest-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #FFFFFF;
  border: 1.5px solid #E8E8E8;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-dest-chip:hover {
  border-color: #00A86B;
  background: #FAFFFE;
}

.quick-dest-chip:active,
.quick-dest-chip.is-pressed {
  transform: scale(0.96);
  background: #F0FDF4;
}

.chip-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-icon svg {
  width: 14px;
  height: 14px;
}

.chip-icon.home {
  background: #E3F2FD;
  color: #1976D2;
}

.chip-icon.work {
  background: #F3E5F5;
  color: #7B1FA2;
}

.quick-dest-chip span {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
}

/* Section Divider */
.section-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #E8E8E8;
}

.section-divider span {
  font-size: 12px;
  color: #999999;
  white-space: nowrap;
}

/* Places Section */
.places-section {
  margin-top: 8px;
}

.places-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.place-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #FFFFFF;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  animation: itemSlideIn 0.3s ease-out forwards;
  opacity: 0;
}

@keyframes itemSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.place-item:hover {
  background: #F5F5F5;
}

.place-item:active {
  transform: scale(0.99);
  background: #F0F0F0;
}

.place-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.place-icon svg {
  width: 18px;
  height: 18px;
}

.place-icon.favorite {
  background: #FEF3C7;
  color: #F59E0B;
}

.place-icon.recent {
  background: #F3F4F6;
  color: #6B7280;
}

.place-info {
  flex: 1;
  min-width: 0;
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
  position: relative;
}

.selected-location-card.success {
  background: #F0FDF4;
}

.selected-location-card.destination {
  background: #FEF2F2;
  border-color: #E53935;
}

.success-check {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0, 168, 107, 0.3);
}

.selected-location-card.destination .success-check {
  background: #E53935;
  box-shadow: 0 2px 8px rgba(229, 57, 53, 0.3);
}

.success-check svg {
  width: 14px;
  height: 14px;
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

.marker-dot.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.location-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.location-sublabel {
  font-size: 11px;
  font-weight: 500;
  color: #00A86B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selected-location-card.destination .location-sublabel {
  color: #E53935;
}

.location-label {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* Continue Button */
.continue-btn {
  width: 100%;
  padding: 18px 24px;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
}

.continue-btn.primary {
  background: #00A86B;
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.continue-btn.primary:hover {
  background: #008F5B;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 168, 107, 0.35);
}

.continue-btn.primary:active {
  transform: translateY(0) scale(0.98);
}

.continue-btn.primary:disabled {
  background: #CCCCCC;
  box-shadow: none;
  cursor: not-allowed;
}

.continue-btn svg {
  width: 20px;
  height: 20px;
}

/* Route Preview Card */
.route-preview-card {
  background: #F8F8F8;
  border-radius: 14px;
  padding: 16px;
}

.route-preview-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.route-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.route-dot.pickup {
  background: #00A86B;
}

.route-dot.destination {
  background: #E53935;
}

.route-dot.destination.empty {
  background: transparent;
  border: 2px dashed #E53935;
}

.route-preview-text {
  flex: 1;
  min-width: 0;
}

.route-preview-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.route-preview-value {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-preview-placeholder {
  display: block;
  font-size: 14px;
  color: #999999;
  font-style: italic;
}

.edit-btn {
  width: 32px;
  height: 32px;
  background: #FFFFFF;
  border: none;
  border-radius: 8px;
  color: #666666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.edit-btn svg {
  width: 16px;
  height: 16px;
}

.edit-btn:hover {
  background: #F0F0F0;
  color: #1A1A1A;
}

.route-connector-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, #00A86B, #E53935);
  margin: 8px 0 8px 5px;
}

.destination-slot {
  opacity: 0.7;
}

/* Map Picker Button */
.map-picker-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #FFFFFF;
  border: 1.5px dashed #CCCCCC;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.map-picker-btn:hover {
  border-color: #00A86B;
  border-style: solid;
  background: #FAFFFE;
}

.map-picker-btn:active {
  transform: scale(0.98);
}

.map-picker-icon {
  width: 44px;
  height: 44px;
  background: #E3F2FD;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1976D2;
  flex-shrink: 0;
}

.map-picker-icon svg {
  width: 22px;
  height: 22px;
}

.map-picker-text {
  flex: 1;
}

.map-picker-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.map-picker-subtitle {
  display: block;
  font-size: 12px;
  color: #666666;
}

.map-picker-arrow {
  width: 20px;
  height: 20px;
  color: #CCCCCC;
  flex-shrink: 0;
}

/* Route Summary Card Enhanced */
.route-summary-card-enhanced {
  background: #F8F8F8;
  border-radius: 16px;
  overflow: hidden;
}

.route-summary-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #F0F0F0;
}

.route-summary-icon {
  width: 32px;
  height: 32px;
  background: #E8F5EF;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.route-summary-icon svg {
  width: 16px;
  height: 16px;
}

.route-summary-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.route-summary-body {
  padding: 16px;
}

.route-point-enhanced {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.route-dot-enhanced {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.route-dot-enhanced.pickup {
  background: #00A86B;
}

.route-dot-enhanced.destination {
  background: #E53935;
}

.route-point-text {
  flex: 1;
  min-width: 0;
}

.route-point-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.route-point-value {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-connector-enhanced {
  width: 2px;
  height: 24px;
  background: linear-gradient(to bottom, #00A86B, #E53935);
  margin: 8px 0 8px 5px;
}

.route-stats-enhanced {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #FFFFFF;
  border-top: 1px solid #F0F0F0;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #F5F5F5;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
}

.stat-chip svg {
  width: 14px;
  height: 14px;
  color: #00A86B;
}

/* Package Type Section */
.package-type-section {
  margin-bottom: 8px;
}

.package-type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.package-type-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #FFFFFF;
  border: 2px solid #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  animation: itemSlideIn 0.3s ease-out forwards;
  opacity: 0;
}

.package-type-card:hover {
  border-color: #00A86B;
  background: #FAFFFE;
}

.package-type-card:active {
  transform: scale(0.98);
}

.package-type-card.active {
  border-color: #00A86B;
  background: #F0FDF4;
}

.package-type-icon {
  width: 40px;
  height: 40px;
  background: #F5F5F5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666666;
  flex-shrink: 0;
}

.package-type-card.active .package-type-icon {
  background: #E8F5EF;
  color: #00A86B;
}

.package-type-icon svg {
  width: 20px;
  height: 20px;
}

.package-type-info {
  flex: 1;
  min-width: 0;
}

.package-type-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 2px;
}

.package-type-weight {
  display: block;
  font-size: 12px;
  color: #666666;
}

.package-check {
  width: 24px;
  height: 24px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  flex-shrink: 0;
}

.package-check svg {
  width: 14px;
  height: 14px;
}

/* Input Section */
.input-section {
  margin-bottom: 12px;
}

.input-label-enhanced {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  margin-bottom: 8px;
}

.input-label-enhanced svg {
  width: 16px;
  height: 16px;
}

.input-field-enhanced {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
  color: #1A1A1A;
  outline: none;
  transition: all 0.2s ease;
}

.input-field-enhanced:focus {
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.input-field-enhanced::placeholder {
  color: #999999;
}

.textarea-field-enhanced {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
  color: #1A1A1A;
  outline: none;
  resize: none;
  font-family: inherit;
  transition: all 0.2s ease;
}

.textarea-field-enhanced:focus {
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.textarea-field-enhanced::placeholder {
  color: #999999;
}

.input-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #999999;
}

/* Confirm Card */
.confirm-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  overflow: hidden;
}

.confirm-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #F8F8F8;
  border-bottom: 1px solid #F0F0F0;
}

.confirm-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.edit-link {
  width: 32px;
  height: 32px;
  background: #FFFFFF;
  border: none;
  border-radius: 8px;
  color: #00A86B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-link svg {
  width: 16px;
  height: 16px;
}

.edit-link:hover {
  background: #F0F0F0;
}

.confirm-card-body {
  padding: 16px;
}

.confirm-route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.confirm-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.confirm-dot.pickup {
  background: #00A86B;
}

.confirm-dot.destination {
  background: #E53935;
}

.confirm-route-text {
  flex: 1;
  min-width: 0;
}

.confirm-route-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: #999999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.confirm-route-value {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.confirm-route-line {
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, #00A86B, #E53935);
  margin: 8px 0 8px 5px;
}

.confirm-card-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #F8F8F8;
  border-top: 1px solid #F0F0F0;
}

.confirm-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #666666;
}

.confirm-stat svg {
  width: 14px;
  height: 14px;
  color: #00A86B;
}

.confirm-stat-divider {
  width: 1px;
  height: 16px;
  background: #E0E0E0;
}

.confirm-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #F5F5F5;
}

.confirm-info-row:last-child {
  border-bottom: none;
}

.confirm-info-label {
  font-size: 14px;
  color: #666666;
}

.confirm-info-value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}

/* Fee Summary Card */
.fee-summary-card {
  background: #F0FDF4;
  border: 2px solid #00A86B;
  border-radius: 16px;
  overflow: hidden;
}

.fee-summary-header {
  padding: 14px 16px;
  background: #E8F5EF;
  border-bottom: 1px solid rgba(0, 168, 107, 0.2);
}

.fee-summary-title {
  font-size: 14px;
  font-weight: 600;
  color: #00A86B;
}

.fee-summary-body {
  padding: 16px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.fee-label {
  font-size: 14px;
  color: #666666;
}

.fee-value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.fee-divider {
  height: 1px;
  background: rgba(0, 168, 107, 0.2);
  margin: 8px 0;
}

.fee-row.total {
  padding-top: 12px;
}

.fee-row.total .fee-label {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.fee-row.total .fee-value {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

/* Confirm Book Button */
.confirm-book-btn {
  width: 100%;
  padding: 18px 24px;
  background: linear-gradient(135deg, #00A86B 0%, #00C77B 100%);
  border: none;
  border-radius: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.35);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.confirm-book-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

.confirm-book-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 168, 107, 0.4);
}

.confirm-book-btn:active {
  transform: translateY(0) scale(0.98);
}

.confirm-book-btn:disabled {
  background: #CCCCCC;
  box-shadow: none;
  cursor: not-allowed;
}

.confirm-book-btn:disabled::before {
  display: none;
}

.confirm-book-btn.is-loading {
  justify-content: center;
  pointer-events: none;
}

.confirm-book-btn.is-loading::before {
  display: none;
}

.confirm-btn-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.confirm-btn-text {
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

.confirm-btn-price {
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
}

.confirm-btn-icon {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  flex-shrink: 0;
}

.confirm-btn-icon svg {
  width: 24px;
  height: 24px;
}

/* Booking Spinner */
.booking-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 12px;
}

.booking-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.booking-title {
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}

.booking-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

/* Safety Note */
.safety-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #F8F8F8;
  border-radius: 12px;
  margin-top: 8px;
}

.safety-note svg {
  width: 16px;
  height: 16px;
  color: #00A86B;
  flex-shrink: 0;
}

.safety-note span {
  font-size: 12px;
  color: #666666;
}

/* Error Toast */
.error-toast {
  position: fixed;
  top: 16px;
  left: 16px;
  right: 16px;
  top: calc(16px + env(safe-area-inset-top));
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 14px;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.error-icon {
  width: 32px;
  height: 32px;
  background: #FEE2E2;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #E53935;
  flex-shrink: 0;
}

.error-icon svg {
  width: 18px;
  height: 18px;
}

.error-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #B91C1C;
}

.error-close {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #B91C1C;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.error-close:hover {
  background: #FEE2E2;
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: all 0.3s ease;
}

.scale-fade-enter-from,
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Animate Item */
.animate-item {
  animation: itemSlideIn 0.3s ease-out forwards;
  opacity: 0;
}

/* Time Range Chip */
.stat-chip.time-range {
  background: #E8F5EF;
}

.stat-chip.time-range svg {
  color: #00A86B;
}

/* Photo Upload Section */
.photo-upload-section {
  margin-bottom: 16px;
}

.photo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.photo-upload-section .section-title-small {
  display: flex;
  align-items: center;
  gap: 8px;
}

.photo-upload-section .section-title-small svg {
  width: 16px;
  height: 16px;
  color: #00A86B;
}

.quality-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #F5F5F5;
  border: 1px solid #E8E8E8;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quality-toggle-btn:hover {
  background: #E8F5EF;
  border-color: #00A86B;
  color: #00A86B;
}

.quality-toggle-btn svg {
  width: 14px;
  height: 14px;
}

/* Quality Selector Dropdown */
.quality-selector {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.quality-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #F0F0F0;
}

.quality-selector-header span:first-child {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.quality-hint {
  font-size: 11px;
  color: #999999;
}

.quality-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quality-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F8F8F8;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quality-option:hover {
  background: #F0F0F0;
}

.quality-option.active {
  background: #E8F5EF;
  border-color: #00A86B;
}

.quality-option-icon {
  width: 36px;
  height: 36px;
  background: #FFFFFF;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666666;
}

.quality-option.active .quality-option-icon {
  background: #00A86B;
  color: #FFFFFF;
}

.quality-option-icon svg {
  width: 18px;
  height: 18px;
}

.quality-option-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quality-option-label {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.quality-option-desc {
  font-size: 12px;
  color: #999999;
}

.quality-check {
  width: 24px;
  height: 24px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
}

.quality-check svg {
  width: 14px;
  height: 14px;
}

/* Slide Down Animation */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.photo-hint {
  font-size: 12px;
  color: #999999;
  margin: 4px 0 12px;
}

.hidden-input {
  display: none;
}

.photo-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 24px;
  background: #F8F8F8;
  border: 2px dashed #CCCCCC;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.photo-upload-area:hover {
  border-color: #00A86B;
  background: #FAFFFE;
}

.photo-upload-area:active {
  transform: scale(0.98);
}

.upload-icon {
  width: 56px;
  height: 56px;
  background: #E8F5EF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.upload-icon svg {
  width: 28px;
  height: 28px;
}

.upload-icon.is-loading {
  background: #F5F5F5;
}

.upload-text {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.upload-subtext {
  font-size: 12px;
  color: #999999;
}

/* Photo Preview */
.photo-preview {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #F5F5F5;
}

.preview-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.remove-photo-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  color: #FFFFFF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-photo-btn:hover {
  background: rgba(229, 57, 53, 0.9);
}

.remove-photo-btn svg {
  width: 20px;
  height: 20px;
}

.photo-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #00A86B;
  border-radius: 20px;
  color: #FFFFFF;
}

.photo-badge svg {
  width: 16px;
  height: 16px;
}

/* Confirm Photo Card */
.confirm-card.photo-card {
  overflow: hidden;
}

.confirm-photo-preview {
  position: relative;
}

.confirm-photo-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.photo-verified-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(0, 168, 107, 0.9);
  border-radius: 16px;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 500;
}

.photo-verified-badge svg {
  width: 14px;
  height: 14px;
}

/* Exit Confirmation Dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.confirm-dialog {
  background: #FFFFFF;
  border-radius: 20px;
  padding: 28px 24px;
  max-width: 320px;
  width: 100%;
  text-align: center;
  animation: dialogIn 0.25s ease;
}

@keyframes dialogIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.confirm-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  background: #FFF8E1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon svg {
  width: 28px;
  height: 28px;
}

.confirm-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px;
}

.confirm-message {
  font-size: 14px;
  color: #666666;
  margin: 0 0 24px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn:active {
  transform: scale(0.97);
}

.confirm-btn.cancel {
  background: #F5F5F5;
  color: #666666;
}

.confirm-btn.exit {
  background: #E53935;
  color: #FFFFFF;
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .confirm-dialog,
.modal-leave-active .confirm-dialog {
  transition: transform 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .confirm-dialog,
.modal-leave-to .confirm-dialog {
  transform: scale(0.9);
}
</style>
