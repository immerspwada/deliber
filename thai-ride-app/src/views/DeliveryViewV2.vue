<script setup lang="ts">
/**
 * DeliveryViewV2 - Streamlined Delivery UX
 * Design: "2 Steps to Send" - ง่าย รวดเร็ว ไหลลื่น
 * MUNEEF Style: Green accent, clean, modern
 * 
 * @syncs-with
 * - Provider: useProvider.ts (acceptDelivery, updateDeliveryStatus)
 * - Admin: useAdmin.ts (ดู/จัดการ delivery orders)
 */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import MapView from '../components/MapView.vue'
import LocationPicker from '../components/LocationPicker.vue'
import AddressSearchInput from '../components/AddressSearchInput.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useDelivery, type DeliveryRequest, QUALITY_PRESETS, type ImageQuality } from '../composables/useDelivery'
import { useServices } from '../composables/useServices'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { calculateDistance, getCurrentPosition } = useLocation()
const { 
  createDeliveryRequest, 
  calculateFee, 
  calculateTimeRange, 
  fetchDeliveryHistory,
  formatStatus,
  uploadPackagePhoto,
  compressImage,
  deliveryHistory,
  loading, 
  error: deliveryError, 
  clearError 
} = useDelivery()
const { homePlace, workPlace, recentPlaces, fetchSavedPlaces, fetchRecentPlaces } = useServices()

// UI State
const currentStep = ref<'locations' | 'details'>('locations')
const isGettingLocation = ref(false)
const showPickupPicker = ref(false)
const showDropoffPicker = ref(false)
const showConfirmSheet = ref(false)
const showHistory = ref(false)
const historyLoading = ref(false)
const isAnimating = ref(false)

// Locations
const pickupLocation = ref<GeoLocation | null>(null)
const pickupAddress = ref('')
const dropoffLocation = ref<GeoLocation | null>(null)
const dropoffAddress = ref('')

// Package & Recipient
const recipientPhone = ref('')
const packageType = ref<'document' | 'small' | 'medium' | 'large'>('small')
const notes = ref('')

// Package Photo
const packagePhoto = ref<string | null>(null)
const packagePhotoFile = ref<File | null>(null)
const isUploadingPhoto = ref(false)
const photoInputRef = ref<HTMLInputElement | null>(null)
const selectedQuality = ref<ImageQuality>('medium')

// Photo handling functions
const triggerPhotoUpload = () => {
  photoInputRef.value?.click()
}

const handlePhotoSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('กรุณาเลือกไฟล์รูปภาพ')
    return
  }

  // Validate file size (max 10MB before compression)
  if (file.size > 10 * 1024 * 1024) {
    alert('ไฟล์ใหญ่เกินไป (สูงสุด 10MB)')
    return
  }

  haptic('light')
  isUploadingPhoto.value = true

  try {
    // Compress image
    const compressed = await compressImage(file, selectedQuality.value)
    packagePhotoFile.value = compressed

    // Create preview URL
    const reader = new FileReader()
    reader.onload = (e) => {
      packagePhoto.value = e.target?.result as string
    }
    reader.readAsDataURL(compressed)
    haptic('medium')
  } catch (err) {
    console.error('Error processing photo:', err)
    alert('ไม่สามารถประมวลผลรูปภาพได้')
  } finally {
    isUploadingPhoto.value = false
    // Reset input
    input.value = ''
  }
}

const removePhoto = () => {
  haptic('light')
  packagePhoto.value = null
  packagePhotoFile.value = null
}

// Calculated
const distance = ref(0)
const fee = ref(0)
const timeRange = ref({ min: 15, max: 30 })

const packageTypes = [
  { value: 'document', label: 'เอกสาร', icon: 'doc', price: 25 },
  { value: 'small', label: 'เล็ก', icon: 'small', price: 35 },
  { value: 'medium', label: 'กลาง', icon: 'medium', price: 50 },
  { value: 'large', label: 'ใหญ่', icon: 'large', price: 80 }
] as const

const hasRoute = computed(() => !!(pickupLocation.value && dropoffLocation.value))
const canProceed = computed(() => pickupLocation.value && dropoffLocation.value)
const canSubmit = computed(() => canProceed.value && recipientPhone.value.length >= 9)

// Auto-calculate when locations change
watch([pickupLocation, dropoffLocation, packageType], () => {
  if (pickupLocation.value && dropoffLocation.value) {
    distance.value = calculateDistance(
      pickupLocation.value.lat, pickupLocation.value.lng,
      dropoffLocation.value.lat, dropoffLocation.value.lng
    )
    fee.value = calculateFee(distance.value, packageType.value)
    timeRange.value = calculateTimeRange(distance.value)
  }
})

onMounted(async () => {
  fetchSavedPlaces()
  fetchRecentPlaces()
  // Pre-fill sender phone
  if (authStore.user) {
    recipientPhone.value = ''
  }
})

// Load delivery history
const loadHistory = async () => {
  if (deliveryHistory.value.length > 0) {
    showHistory.value = true
    return
  }
  historyLoading.value = true
  await fetchDeliveryHistory(10)
  historyLoading.value = false
  showHistory.value = true
}

// Format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'วันนี้'
  if (days === 1) return 'เมื่อวาน'
  if (days < 7) return `${days} วันที่แล้ว`
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

// Get status color
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#F5A623',
    matched: '#2196F3',
    pickup: '#2196F3',
    in_transit: '#00A86B',
    delivered: '#00A86B',
    failed: '#E53935',
    cancelled: '#999999'
  }
  return colors[status] || '#666666'
}

// Haptic
const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    navigator.vibrate({ light: 10, medium: 25, heavy: 50 }[type])
  }
}

// Use current location for pickup
const useCurrentLocation = async () => {
  isGettingLocation.value = true
  haptic('medium')
  try {
    const loc = await getCurrentPosition()
    if (loc) {
      pickupLocation.value = loc
      pickupAddress.value = loc.address || 'ตำแหน่งปัจจุบัน'
      haptic('heavy')
    }
  } catch {
    alert('ไม่สามารถระบุตำแหน่งได้')
  } finally {
    isGettingLocation.value = false
  }
}

// Select saved place
const selectPlace = (place: any, type: 'pickup' | 'dropoff') => {
  haptic('light')
  const loc = { lat: place.lat, lng: place.lng, address: place.address }
  if (type === 'pickup') {
    pickupLocation.value = loc
    pickupAddress.value = place.name
  } else {
    dropoffLocation.value = loc
    dropoffAddress.value = place.name
  }
}

// Handle map picker confirm
const handlePickerConfirm = (loc: GeoLocation, type: 'pickup' | 'dropoff') => {
  haptic('heavy')
  if (type === 'pickup') {
    pickupLocation.value = loc
    pickupAddress.value = loc.address || 'ตำแหน่งที่เลือก'
    showPickupPicker.value = false
  } else {
    dropoffLocation.value = loc
    dropoffAddress.value = loc.address || 'ตำแหน่งที่เลือก'
    showDropoffPicker.value = false
  }
}

// Handle address search select
const handleAddressSelect = (place: any, type: 'pickup' | 'dropoff') => {
  haptic('light')
  const loc = { lat: place.lat, lng: place.lng, address: place.address }
  if (type === 'pickup') {
    pickupLocation.value = loc
    pickupAddress.value = place.name || place.address
  } else {
    dropoffLocation.value = loc
    dropoffAddress.value = place.name || place.address
  }
}

// Proceed to details with animation
const goToDetails = async () => {
  if (!canProceed.value) return
  haptic('medium')
  isAnimating.value = true
  await nextTick()
  currentStep.value = 'details'
  setTimeout(() => { isAnimating.value = false }, 300)
}

// Submit delivery
const handleSubmit = async () => {
  if (!canSubmit.value || !pickupLocation.value || !dropoffLocation.value) return
  clearError()
  haptic('heavy')

  // Upload photo if exists
  let photoUrl: string | undefined
  if (packagePhotoFile.value) {
    isUploadingPhoto.value = true
    try {
      const url = await uploadPackagePhoto(packagePhotoFile.value)
      if (url) {
        photoUrl = url
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
      // Continue without photo if upload fails
    } finally {
      isUploadingPhoto.value = false
    }
  }

  const result = await createDeliveryRequest({
    senderName: authStore.user?.name || 'ผู้ส่ง',
    senderPhone: (authStore.user as any)?.phone_number || '',
    senderAddress: pickupAddress.value,
    senderLocation: pickupLocation.value,
    recipientName: 'ผู้รับ',
    recipientPhone: recipientPhone.value,
    recipientAddress: dropoffAddress.value,
    recipientLocation: dropoffLocation.value,
    packageType: packageType.value,
    packageWeight: 1,
    packageDescription: notes.value,
    packagePhoto: photoUrl,
    distanceKm: distance.value
  })

  if (result) {
    router.push(`/tracking/${result.tracking_id}`)
  }
}

const goBack = async () => {
  haptic('light')
  if (showHistory.value) {
    showHistory.value = false
    return
  }
  if (currentStep.value === 'details') {
    isAnimating.value = true
    await nextTick()
    currentStep.value = 'locations'
    setTimeout(() => { isAnimating.value = false }, 300)
  } else {
    router.push('/customer')
  }
}

const clearLocation = (type: 'pickup' | 'dropoff') => {
  haptic('light')
  if (type === 'pickup') {
    pickupLocation.value = null
    pickupAddress.value = ''
  } else {
    dropoffLocation.value = null
    dropoffAddress.value = ''
  }
}
</script>

<template>
  <div class="delivery-page">
    <!-- Header -->
    <header class="header" :class="{ 'header-solid': showHistory }">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <div class="header-center">
        <h1 class="title">{{ showHistory ? 'ประวัติการส่ง' : 'ส่งพัสดุ' }}</h1>
        <!-- Step Indicator -->
        <div v-if="!showHistory" class="step-indicator">
          <div :class="['step-dot', { active: currentStep === 'locations' }]"></div>
          <div class="step-line"></div>
          <div :class="['step-dot', { active: currentStep === 'details' }]"></div>
        </div>
      </div>
      <button v-if="!showHistory" class="history-btn" @click="loadHistory">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      </button>
      <div v-else class="header-spacer"></div>
    </header>

    <!-- Map -->
    <div v-if="!showHistory" class="map-container">
      <MapView
        :pickup="pickupLocation"
        :destination="dropoffLocation"
        :show-route="hasRoute"
        height="100%"
      />
    </div>

    <!-- History Panel -->
    <Transition name="fade-slide">
      <div v-if="showHistory" class="history-panel">
        <!-- Loading Skeleton -->
        <div v-if="historyLoading" class="history-skeleton">
          <div v-for="i in 4" :key="i" class="skeleton-item">
            <div class="skeleton-icon"></div>
            <div class="skeleton-content">
              <div class="skeleton-line w-60"></div>
              <div class="skeleton-line w-80"></div>
              <div class="skeleton-line w-40"></div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="deliveryHistory.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <p class="empty-text">ยังไม่มีประวัติการส่งพัสดุ</p>
          <button class="empty-btn" @click="showHistory = false">ส่งพัสดุเลย</button>
        </div>

        <!-- History List -->
        <div v-else class="history-list">
          <button 
            v-for="item in deliveryHistory" 
            :key="item.id"
            class="history-item"
            @click="router.push(`/tracking/${item.tracking_id}`)"
          >
            <div class="history-icon" :style="{ background: getStatusColor(item.status) + '20' }">
              <svg viewBox="0 0 24 24" fill="none" :stroke="getStatusColor(item.status)" stroke-width="2">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
            </div>
            <div class="history-info">
              <div class="history-header">
                <span class="history-tracking">{{ item.tracking_id }}</span>
                <span class="history-date">{{ formatDate(item.created_at) }}</span>
              </div>
              <p class="history-route">{{ item.sender_address }} → {{ item.recipient_address }}</p>
              <div class="history-footer">
                <span class="history-status" :style="{ color: getStatusColor(item.status) }">
                  {{ formatStatus(item.status) }}
                </span>
                <span class="history-fee">฿{{ item.estimated_fee }}</span>
              </div>
            </div>
            <svg class="history-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Bottom Sheet -->
    <div v-if="!showHistory" class="bottom-sheet" :class="{ expanded: currentStep === 'details', animating: isAnimating }">
      <div class="sheet-handle"></div>

      <!-- Step 1: Locations -->
      <Transition name="step-fade" mode="out-in">
        <div v-if="currentStep === 'locations'" key="locations" class="step-content">
        <!-- Route Card -->
        <div class="route-card">
          <!-- Pickup -->
          <div class="location-row">
            <div class="location-number pickup">1</div>
            <div class="location-input-wrapper">
              <div v-if="pickupLocation" class="location-selected" @click="showPickupPicker = true">
                <span class="location-text">{{ pickupAddress }}</span>
                <button class="clear-btn" @click.stop="clearLocation('pickup')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <button v-else class="location-placeholder" @click="showPickupPicker = true">
                <span>จุดรับพัสดุ</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="route-line"></div>

          <!-- Dropoff -->
          <div class="location-row">
            <div class="location-number dropoff">2</div>
            <div class="location-input-wrapper">
              <div v-if="dropoffLocation" class="location-selected" @click="showDropoffPicker = true">
                <span class="location-text">{{ dropoffAddress }}</span>
                <button class="clear-btn" @click.stop="clearLocation('dropoff')">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <button v-else class="location-placeholder" @click="showDropoffPicker = true">
                <span>จุดส่งพัสดุ</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button class="quick-btn" @click="useCurrentLocation" :disabled="isGettingLocation">
            <div class="quick-icon gps">
              <svg v-if="!isGettingLocation" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
              </svg>
              <div v-else class="spinner-small"></div>
            </div>
            <span>ตำแหน่งปัจจุบัน</span>
          </button>
          <button v-if="homePlace" class="quick-btn" @click="selectPlace(homePlace, pickupLocation ? 'dropoff' : 'pickup')">
            <div class="quick-icon home">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <span>บ้าน</span>
          </button>
          <button v-if="workPlace" class="quick-btn" @click="selectPlace(workPlace, pickupLocation ? 'dropoff' : 'pickup')">
            <div class="quick-icon work">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
              </svg>
            </div>
            <span>ที่ทำงาน</span>
          </button>
        </div>

        <!-- Recent Places -->
        <div v-if="recentPlaces.length > 0" class="recent-section">
          <h4 class="section-title">ล่าสุด</h4>
          <div class="recent-list">
            <button 
              v-for="place in recentPlaces.slice(0, 4)" 
              :key="place.id"
              class="recent-item"
              @click="selectPlace(place, pickupLocation ? 'dropoff' : 'pickup')"
            >
              <div class="recent-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <div class="recent-info">
                <span class="recent-name">{{ place.name }}</span>
                <span class="recent-address">{{ place.address }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Summary & Continue - Always show but disabled when not ready -->
        <div class="summary-bar" :class="{ ready: hasRoute }">
          <div class="summary-info">
            <span v-if="hasRoute" class="summary-distance">{{ distance.toFixed(1) }} km</span>
            <span v-else class="summary-hint">เลือกจุดรับและจุดส่ง</span>
            <span v-if="hasRoute" class="summary-time">~{{ timeRange.min }}-{{ timeRange.max }} นาที</span>
          </div>
          <button class="continue-btn" :disabled="!canProceed" @click="goToDetails">
            <span>ถัดไป</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        </div>
      </Transition>

      <!-- Step 2: Details -->
      <Transition name="step-fade" mode="out-in">
        <div v-if="currentStep === 'details'" key="details" class="step-content details-step">
        <!-- Route Summary -->
        <div class="route-summary">
          <div class="route-point">
            <div class="point-dot pickup"></div>
            <span>{{ pickupAddress }}</span>
          </div>
          <div class="route-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <div class="route-point">
            <div class="point-dot dropoff"></div>
            <span>{{ dropoffAddress }}</span>
          </div>
        </div>

        <!-- Package Type -->
        <div class="form-section">
          <h4 class="section-title">ประเภทพัสดุ</h4>
          <div class="package-grid">
            <button 
              v-for="pkg in packageTypes" 
              :key="pkg.value"
              :class="['package-btn', { active: packageType === pkg.value }]"
              @click="packageType = pkg.value; haptic('light')"
            >
              <div class="package-icon">
                <svg v-if="pkg.value === 'document'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
              <span class="package-label">{{ pkg.label }}</span>
            </button>
          </div>
        </div>

        <!-- Package Photo Upload -->
        <div class="form-section">
          <h4 class="section-title">รูปพัสดุ (ไม่บังคับ)</h4>
          <p class="section-hint">ถ่ายรูปพัสดุเพื่อให้ไรเดอร์เห็นก่อนรับงาน</p>
          
          <!-- Hidden file input -->
          <input 
            ref="photoInputRef"
            type="file"
            accept="image/*"
            capture="environment"
            class="hidden-input"
            @change="handlePhotoSelect"
          />
          
          <!-- Photo Preview or Upload Button -->
          <div v-if="packagePhoto" class="photo-preview">
            <img :src="packagePhoto" alt="Package preview" class="preview-img" />
            <div class="photo-overlay">
              <button class="photo-action-btn change" @click="triggerPhotoUpload">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>เปลี่ยน</span>
              </button>
              <button class="photo-action-btn remove" @click="removePhoto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
                <span>ลบ</span>
              </button>
            </div>
          </div>
          
          <button 
            v-else 
            class="photo-upload-btn" 
            :disabled="isUploadingPhoto"
            @click="triggerPhotoUpload"
          >
            <div v-if="isUploadingPhoto" class="upload-loading">
              <div class="spinner-small"></div>
              <span>กำลังประมวลผล...</span>
            </div>
            <div v-else class="upload-content">
              <div class="upload-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <span class="upload-text">ถ่ายรูปหรือเลือกจากอัลบั้ม</span>
              <span class="upload-hint">ช่วยให้ไรเดอร์ตัดสินใจรับงานได้ง่ายขึ้น</span>
            </div>
          </button>
          
          <!-- Quality Selector -->
          <div v-if="packagePhoto" class="quality-selector">
            <span class="quality-label">คุณภาพรูป:</span>
            <div class="quality-options">
              <button 
                v-for="(preset, key) in QUALITY_PRESETS" 
                :key="key"
                :class="['quality-btn', { active: selectedQuality === key }]"
                @click="selectedQuality = key as ImageQuality"
              >
                {{ preset.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Recipient Phone -->
        <div class="form-section">
          <h4 class="section-title">เบอร์ผู้รับ</h4>
          <input 
            v-model="recipientPhone"
            type="tel"
            class="phone-input"
            placeholder="0812345678"
            maxlength="10"
          />
        </div>

        <!-- Notes -->
        <div class="form-section">
          <h4 class="section-title">หมายเหตุ (ไม่บังคับ)</h4>
          <textarea 
            v-model="notes"
            class="notes-input"
            placeholder="เช่น ฝากไว้หน้าบ้าน, โทรก่อนส่ง"
            rows="2"
          ></textarea>
        </div>

        <!-- Error -->
        <div v-if="deliveryError" class="error-msg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4m0 4h.01"/>
          </svg>
          <span>{{ deliveryError }}</span>
        </div>

        <!-- Submit -->
        <div class="submit-section">
          <div class="price-display">
            <span class="price-label">ค่าส่ง</span>
            <span class="price-value">฿{{ fee }}</span>
          </div>
          <button 
            class="submit-btn" 
            :disabled="!canSubmit || loading"
            @click="handleSubmit"
          >
            <span v-if="loading">กำลังส่ง...</span>
            <span v-else>ส่งเลย</span>
          </button>
        </div>
        </div>
      </Transition>
    </div>

    <!-- Location Picker Modal - Pickup -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="showPickupPicker" class="picker-modal">
          <LocationPicker
            title="เลือกจุดรับพัสดุ"
            :initial-location="pickupLocation"
            @confirm="(loc) => handlePickerConfirm(loc, 'pickup')"
            @cancel="showPickupPicker = false"
          />
        </div>
      </Transition>
    </Teleport>

    <!-- Location Picker Modal - Dropoff -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div v-if="showDropoffPicker" class="picker-modal">
          <LocationPicker
            title="เลือกจุดส่งพัสดุ"
            :initial-location="dropoffLocation"
            @confirm="(loc) => handlePickerConfirm(loc, 'dropoff')"
            @cancel="showDropoffPicker = false"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ===== Base Layout ===== */
* {
  box-sizing: border-box;
}

.delivery-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  overflow: hidden;
}

/* ===== Map ===== */
.map-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 45vh;
  z-index: 1;
}

/* ===== Header ===== */
.header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top, 0));
  background: linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0));
}

.header.header-solid {
  background: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.header-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #E8E8E8;
  transition: all 0.3s ease;
}

.step-dot.active {
  background: #00A86B;
  transform: scale(1.2);
}

.step-line {
  width: 20px;
  height: 2px;
  background: #E8E8E8;
}

.back-btn,
.history-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #FFFFFF;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.back-btn:active,
.history-btn:active {
  transform: scale(0.95);
}

.back-btn svg,
.history-btn svg {
  width: 20px;
  height: 20px;
  color: #1A1A1A;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
}

.header-spacer {
  width: 40px;
}

/* ===== History Panel ===== */
.history-panel {
  flex: 1;
  padding: 80px 20px 20px;
  overflow-y: auto;
  background: #F8F9FA;
}

/* Skeleton Loading */
.history-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-item {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: #FFFFFF;
  border-radius: 14px;
}

.skeleton-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(90deg, #E8E8E8 25%, #F5F5F5 50%, #E8E8E8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #E8E8E8 25%, #F5F5F5 50%, #E8E8E8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-line.w-40 { width: 40%; }
.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-80 { width: 80%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: #E8F5EF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
  color: #00A86B;
}

.empty-text {
  font-size: 16px;
  color: #666666;
  margin-bottom: 20px;
}

.empty-btn {
  padding: 14px 28px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.empty-btn:hover {
  background: #008F5B;
}

/* History List */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #FFFFFF;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.history-item:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.history-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-icon svg {
  width: 22px;
  height: 22px;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.history-tracking {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: monospace;
}

.history-date {
  font-size: 12px;
  color: #999999;
}

.history-route {
  font-size: 13px;
  color: #666666;
  margin: 0 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-status {
  font-size: 12px;
  font-weight: 500;
}

.history-fee {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.history-arrow {
  width: 18px;
  height: 18px;
  color: #CCCCCC;
  flex-shrink: 0;
}

/* ===== Bottom Sheet ===== */
.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  top: 40vh;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
  overflow-y: auto;
  transition: top 0.3s ease;
  padding-bottom: env(safe-area-inset-bottom, 16px);
  z-index: 10;
}

.bottom-sheet.expanded {
  top: 25vh;
}

.bottom-sheet.animating {
  overflow: hidden;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  margin: 12px auto;
}

.step-content {
  padding: 0 20px 20px;
}

/* ===== Route Card ===== */
.route-card {
  background: #F8F9FA;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.location-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.location-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.location-dot.pickup {
  background: #00A86B;
}

.location-dot.dropoff {
  background: #E53935;
}

/* Location Number Badges */
.location-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.location-number.pickup {
  background: #00A86B;
}

.location-number.dropoff {
  background: #E53935;
}

.route-line {
  width: 2px;
  height: 24px;
  background: linear-gradient(to bottom, #00A86B, #E53935);
  margin-left: 13px;
  margin: 4px 0 4px 13px;
}

.location-input-wrapper {
  flex: 1;
}

.location-placeholder {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  color: #999999;
  cursor: pointer;
  transition: border-color 0.2s;
}

.location-placeholder:hover {
  border-color: #00A86B;
}

.location-placeholder svg {
  width: 18px;
  height: 18px;
  color: #999999;
}

.location-selected {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #E8F5EF;
  border: 2px solid #00A86B;
  border-radius: 12px;
  cursor: pointer;
}

.location-text {
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clear-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0,0,0,0.1);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-left: 8px;
}

.clear-btn svg {
  width: 14px;
  height: 14px;
  color: #666666;
}

/* ===== Quick Actions ===== */
.quick-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.quick-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  border-color: #00A86B;
  background: #F8FBF9;
}

.quick-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-icon.gps {
  background: #E8F5EF;
}

.quick-icon.home {
  background: #FFF3E0;
}

.quick-icon.work {
  background: #E3F2FD;
}

.quick-icon svg {
  width: 22px;
  height: 22px;
}

.quick-icon.gps svg { color: #00A86B; }
.quick-icon.home svg { color: #F5A623; }
.quick-icon.work svg { color: #2196F3; }

.quick-btn span {
  font-size: 13px;
  font-weight: 500;
  color: #666666;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Recent Section ===== */
.recent-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 12px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.recent-item:hover {
  border-color: #00A86B;
  background: #F8FBF9;
}

.recent-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
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

/* ===== Summary Bar ===== */
.summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #F8F9FA;
  border-radius: 16px;
  margin-top: auto;
  transition: all 0.3s ease;
}

.summary-bar.ready {
  background: #E8F5EF;
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-distance {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.summary-hint {
  font-size: 14px;
  color: #999999;
}

.summary-time {
  font-size: 13px;
  color: #666666;
}

.continue-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.continue-btn:hover:not(:disabled) {
  background: #008F5B;
}

.continue-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.continue-btn:disabled {
  background: #CCCCCC;
  box-shadow: none;
  cursor: not-allowed;
}

.continue-btn svg {
  width: 18px;
  height: 18px;
}

/* ===== Step 2: Details ===== */
.details-step {
  padding-top: 8px;
}

.route-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F8F9FA;
  border-radius: 14px;
  margin-bottom: 20px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.point-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-dot.pickup { background: #00A86B; }
.point-dot.dropoff { background: #E53935; }

.route-point span {
  font-size: 13px;
  color: #666666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-arrow {
  flex-shrink: 0;
}

.route-arrow svg {
  width: 18px;
  height: 18px;
  color: #999999;
}

/* ===== Form Sections ===== */
.form-section {
  margin-bottom: 20px;
}

.form-section .section-title {
  margin-bottom: 10px;
}

/* Package Grid */
.package-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.package-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: #FFFFFF;
  border: 2px solid #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.package-btn:hover {
  border-color: #00A86B;
}

.package-btn.active {
  border-color: #00A86B;
  background: #E8F5EF;
}

.package-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.package-icon svg {
  width: 28px;
  height: 28px;
  color: #666666;
}

.package-btn.active .package-icon svg {
  color: #00A86B;
}

.package-label {
  font-size: 12px;
  font-weight: 500;
  color: #666666;
}

.package-btn.active .package-label {
  color: #00A86B;
}

/* Phone Input */
.phone-input {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s;
  background: #FFFFFF;
}

.phone-input:focus {
  border-color: #00A86B;
}

.phone-input::placeholder {
  color: #999999;
}

/* Notes Input */
.notes-input {
  width: 100%;
  padding: 14px 16px;
  font-size: 15px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  outline: none;
  resize: none;
  font-family: inherit;
  transition: border-color 0.2s;
  background: #FFFFFF;
}

.notes-input:focus {
  border-color: #00A86B;
}

.notes-input::placeholder {
  color: #999999;
}

/* ===== Photo Upload Section ===== */
.section-hint {
  font-size: 13px;
  color: #999999;
  margin-bottom: 12px;
}

.hidden-input {
  display: none;
}

.photo-upload-btn {
  width: 100%;
  padding: 20px;
  background: #F8F9FA;
  border: 2px dashed #E8E8E8;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.photo-upload-btn:hover:not(:disabled) {
  border-color: #00A86B;
  background: #F8FBF9;
}

.photo-upload-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.upload-loading span {
  font-size: 14px;
  color: #666666;
}

.upload-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #E8F5EF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-icon svg {
  width: 24px;
  height: 24px;
  color: #00A86B;
}

.upload-text {
  font-size: 15px;
  font-weight: 500;
  color: #1A1A1A;
}

.upload-hint {
  font-size: 12px;
  color: #999999;
}

/* Photo Preview */
.photo-preview {
  position: relative;
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: #F8F9FA;
}

.preview-img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
}

.photo-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.photo-action-btn.change {
  background: rgba(255,255,255,0.9);
  color: #1A1A1A;
}

.photo-action-btn.change:hover {
  background: #FFFFFF;
}

.photo-action-btn.remove {
  background: rgba(229,57,53,0.9);
  color: #FFFFFF;
}

.photo-action-btn.remove:hover {
  background: #E53935;
}

.photo-action-btn svg {
  width: 16px;
  height: 16px;
}

/* Quality Selector */
.quality-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  background: #F8F9FA;
  border-radius: 10px;
}

.quality-label {
  font-size: 13px;
  color: #666666;
  white-space: nowrap;
}

.quality-options {
  display: flex;
  gap: 8px;
  flex: 1;
}

.quality-btn {
  flex: 1;
  padding: 8px 12px;
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s;
}

.quality-btn:hover {
  border-color: #00A86B;
}

.quality-btn.active {
  background: #00A86B;
  border-color: #00A86B;
  color: #FFFFFF;
}

/* Error Message */
.error-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #FFEBEE;
  border-radius: 12px;
  margin-bottom: 16px;
}

.error-msg svg {
  width: 20px;
  height: 20px;
  color: #E53935;
  flex-shrink: 0;
}

.error-msg span {
  font-size: 14px;
  color: #C62828;
}

/* ===== Submit Section ===== */
.submit-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #F8F9FA;
  border-radius: 16px;
  margin-top: 8px;
}

.price-display {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-label {
  font-size: 13px;
  color: #666666;
}

.price-value {
  font-size: 24px;
  font-weight: 700;
  color: #00A86B;
}

.submit-btn {
  padding: 16px 32px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.submit-btn:hover:not(:disabled) {
  background: #008F5B;
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.submit-btn:disabled {
  background: #CCCCCC;
  box-shadow: none;
  cursor: not-allowed;
}

/* ===== Picker Modal ===== */
.picker-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: #FFFFFF;
}

/* Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* Step Transition */
.step-fade-enter-active,
.step-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.step-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.step-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Fade Slide for History */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Step Transition for Bottom Sheet */
.step-transition-enter-active,
.step-transition-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.step-transition-enter-from,
.step-transition-leave-to {
  opacity: 0;
  transform: translateY(50px);
}

/* ===== Responsive ===== */
@media (max-width: 360px) {
  .package-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quick-actions {
    flex-wrap: wrap;
  }
  
  .quick-btn {
    flex: 0 0 calc(50% - 6px);
  }
}
</style>
