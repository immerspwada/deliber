<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import MapView from './MapView.vue'
import { useServices } from '../composables/useServices'
import { useSoundNotification } from '../composables/useSoundNotification'
import type { RideRequest, ServiceProvider } from '../types/database'
import type { GeoLocation } from '../composables/useLocation'

// Extended provider type with user info
interface ProviderWithUser extends ServiceProvider {
  users?: {
    name?: string
    phone?: string
    avatar_url?: string
  }
  // Also support direct properties from matchedDriver
  name?: string
  phone?: string
  avatar_url?: string
  eta?: number // ETA in minutes
}

const props = defineProps<{
  ride: RideRequest
  provider?: ProviderWithUser | null
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'complete'): void
  (e: 'driverArrived'): void
}>()

const { subscribeToRide, subscribeToDriverLocation } = useServices()
const { notify, playSound, haptic } = useSoundNotification()

const currentRide = ref<RideRequest>(props.ride)
const providerLocation = ref<GeoLocation | null>(null)
const rideSubscription = ref<{ unsubscribe: () => void } | null>(null)
const driverSubscription = ref<{ unsubscribe: () => void } | null>(null)

// ETA Countdown State
const etaSeconds = ref(0)
const etaInterval = ref<ReturnType<typeof setInterval> | null>(null)
const showShareSuccess = ref(false)
const hasPlayedArrivalSound = ref(false)

// Computed driver info - support both nested users object and direct properties
const driverName = computed(() => {
  if (props.provider?.users?.name) return props.provider.users.name
  if (props.provider?.name) return props.provider.name
  return 'คนขับ'
})

const driverPhone = computed(() => {
  if (props.provider?.users?.phone) return props.provider.users.phone
  if (props.provider?.phone) return props.provider.phone
  return null
})

const driverAvatar = computed(() => {
  if (props.provider?.users?.avatar_url) return props.provider.users.avatar_url
  if (props.provider?.avatar_url) return props.provider.avatar_url
  return null
})

const driverRating = computed(() => {
  return props.provider?.rating?.toFixed(1) || '5.0'
})

const totalTrips = computed(() => {
  return props.provider?.total_trips || 0
})

const vehicleInfo = computed(() => {
  const parts = []
  if (props.provider?.vehicle_color) parts.push(props.provider.vehicle_color)
  if (props.provider?.vehicle_type) parts.push(props.provider.vehicle_type)
  return parts.join(' ')
})

// ETA Computed
const initialEta = computed(() => {
  // Get ETA from provider (in minutes) or default to 5
  return props.provider?.eta || 5
})

const etaDisplay = computed(() => {
  if (etaSeconds.value <= 0) return 'มาถึงแล้ว'
  
  const minutes = Math.floor(etaSeconds.value / 60)
  const seconds = etaSeconds.value % 60
  
  if (minutes > 0) {
    return `${minutes} นาที ${seconds.toString().padStart(2, '0')} วินาที`
  }
  return `${seconds} วินาที`
})

const etaProgress = computed(() => {
  const totalSeconds = initialEta.value * 60
  if (totalSeconds <= 0) return 100
  return Math.max(0, Math.min(100, ((totalSeconds - etaSeconds.value) / totalSeconds) * 100))
})

const showEta = computed(() => {
  return props.provider && ['matched', 'pickup'].includes(currentRide.value.status || '')
})

// Share Trip URL - use /tracking/:trackingId for guest access
const shareUrl = computed(() => {
  const trackingId = currentRide.value.tracking_id
  if (!trackingId) return ''
  // Use current origin for the tracking URL
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return `${baseUrl}/tracking/${trackingId}`
})

// Play arrival sound when ETA reaches 0
const playArrivalNotification = () => {
  if (hasPlayedArrivalSound.value) return
  
  hasPlayedArrivalSound.value = true
  notify('arrival', true) // Play sound + vibrate
  emit('driverArrived')
}

// Start ETA countdown
const startEtaCountdown = () => {
  if (etaInterval.value) {
    clearInterval(etaInterval.value)
  }
  
  // Reset arrival sound flag when starting new countdown
  hasPlayedArrivalSound.value = false
  
  // Set initial ETA in seconds
  etaSeconds.value = initialEta.value * 60
  
  etaInterval.value = setInterval(() => {
    if (etaSeconds.value > 0) {
      etaSeconds.value--
      
      // Play arrival sound when reaching 0
      if (etaSeconds.value === 0) {
        playArrivalNotification()
      }
    } else {
      if (etaInterval.value) {
        clearInterval(etaInterval.value)
      }
    }
  }, 1000)
}

// Stop ETA countdown
const stopEtaCountdown = () => {
  if (etaInterval.value) {
    clearInterval(etaInterval.value)
    etaInterval.value = null
  }
}

// Share trip function
const shareTrip = async () => {
  const shareData = {
    title: 'ติดตามการเดินทาง',
    text: `ติดตามการเดินทางของฉัน - หมายเลข ${currentRide.value.tracking_id}`,
    url: shareUrl.value
  }
  
  try {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData)
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl.value)
      showShareSuccess.value = true
      setTimeout(() => {
        showShareSuccess.value = false
      }, 2000)
    }
  } catch (err) {
    // User cancelled or error - try clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl.value)
      showShareSuccess.value = true
      setTimeout(() => {
        showShareSuccess.value = false
      }, 2000)
    } catch {
      console.error('Failed to share or copy:', err)
    }
  }
}

// Status display mapping - using Uber style colors (black/gray for most, only status colors for success/error)
const statusConfig = {
  pending: { label: 'กำลังค้นหาคนขับ', color: '#000000', icon: 'search' },
  matched: { label: 'พบคนขับแล้ว', color: '#000000', icon: 'check' },
  pickup: { label: 'คนขับกำลังมารับ', color: '#000000', icon: 'car' },
  in_progress: { label: 'กำลังเดินทาง', color: '#000000', icon: 'navigation' },
  completed: { label: 'เสร็จสิ้น', color: '#276EF1', icon: 'flag' },
  cancelled: { label: 'ยกเลิกแล้ว', color: '#E11900', icon: 'x' }
}

const currentStatus = computed(() => {
  const status = currentRide.value.status || 'pending'
  return (statusConfig as Record<string, any>)[status] || statusConfig.pending
})

const pickupLocation = computed<GeoLocation>(() => ({
  lat: currentRide.value.pickup_lat,
  lng: currentRide.value.pickup_lng,
  address: currentRide.value.pickup_address
}))

const destinationLocation = computed<GeoLocation>(() => ({
  lat: currentRide.value.destination_lat,
  lng: currentRide.value.destination_lng,
  address: currentRide.value.destination_address
}))

const canCancel = computed(() => 
  ['pending', 'matched'].includes(currentRide.value.status || '')
)

const isActive = computed(() => 
  ['pending', 'matched', 'pickup', 'in_progress'].includes(currentRide.value.status || '')
)

// Subscribe to ride updates (realtime)
const setupSubscriptions = () => {
  // Subscribe to ride status changes
  rideSubscription.value = subscribeToRide(
    currentRide.value.id,
    (status, ride) => {
      const previousStatus = currentRide.value.status
      
      if (ride) {
        currentRide.value = ride
      } else {
        currentRide.value.status = status as any
      }
      
      // Play sound notifications based on status change
      if (status !== previousStatus) {
        if (status === 'pickup') {
          // Driver arrived at pickup point
          notify('arrival', true)
        } else if (status === 'in_progress') {
          // Trip started
          playSound('status_change')
          haptic('medium')
        } else if (status === 'completed') {
          // Trip completed
          notify('success', true)
          emit('complete')
        } else if (status === 'cancelled') {
          // Trip cancelled
          notify('error', true)
        }
      }
      
      if (status === 'completed') {
        emit('complete')
      }
    }
  )

  // Subscribe to driver location if matched
  if (props.provider?.id) {
    driverSubscription.value = subscribeToDriverLocation(
      props.provider.id,
      (location) => {
        providerLocation.value = {
          ...location,
          address: 'ตำแหน่งคนขับ'
        }
      }
    )
  }
}

// Cleanup subscriptions
const cleanupSubscriptions = () => {
  if (rideSubscription.value) {
    rideSubscription.value.unsubscribe()
  }
  if (driverSubscription.value) {
    driverSubscription.value.unsubscribe()
  }
}

watch(() => props.ride, (newRide) => {
  currentRide.value = newRide
}, { deep: true })

watch(() => props.provider, (newProvider) => {
  if (newProvider?.id && !driverSubscription.value) {
    driverSubscription.value = subscribeToDriverLocation(
      newProvider.id,
      (location) => {
        providerLocation.value = {
          ...location,
          address: 'ตำแหน่งคนขับ'
        }
      }
    )
  }
  
  // Start ETA countdown when provider is matched
  if (newProvider && ['matched', 'pickup'].includes(currentRide.value.status || '')) {
    startEtaCountdown()
  }
})

// Watch for status changes to manage ETA
watch(() => currentRide.value.status, (newStatus) => {
  if (newStatus === 'matched' || newStatus === 'pickup') {
    if (!etaInterval.value) {
      startEtaCountdown()
    }
  } else {
    stopEtaCountdown()
  }
})

onMounted(() => {
  setupSubscriptions()
  
  // Start ETA if already matched
  if (props.provider && ['matched', 'pickup'].includes(currentRide.value.status || '')) {
    startEtaCountdown()
  }
})

onUnmounted(() => {
  cleanupSubscriptions()
  stopEtaCountdown()
})
</script>

<template>
  <div class="ride-tracker">
    <!-- Tracking ID Badge -->
    <div v-if="currentRide.tracking_id" class="tracking-badge">
      <svg class="tracking-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <span class="tracking-label">หมายเลขติดตาม</span>
      <span class="tracking-id">{{ currentRide.tracking_id }}</span>
    </div>

    <!-- Status Header -->
    <div class="status-header" :style="{ borderColor: currentStatus.color }">
      <div class="status-indicator" :style="{ backgroundColor: currentStatus.color }">
        <svg v-if="currentStatus.icon === 'search'" class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <svg v-else-if="currentStatus.icon === 'check'" class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <svg v-else-if="currentStatus.icon === 'car'" class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
        </svg>
        <svg v-else-if="currentStatus.icon === 'navigation'" class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>
        <svg v-else-if="currentStatus.icon === 'flag'" class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/>
        </svg>
        <svg v-else class="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
      <div class="status-text">
        <span class="status-label">{{ currentStatus.label }}</span>
        <span v-if="isActive" class="status-pulse"></span>
      </div>
    </div>

    <!-- Map -->
    <MapView
      :pickup="pickupLocation"
      :destination="destinationLocation"
      :show-route="true"
      height="200px"
    />

    <!-- Provider Info Card - Enhanced -->
    <div v-if="provider && currentRide.status !== 'pending'" class="provider-card">
      <!-- Avatar with verified badge -->
      <div class="provider-avatar-wrapper">
        <div class="provider-avatar">
          <img v-if="driverAvatar" :src="driverAvatar" alt="Driver" class="avatar-img" />
          <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div class="verified-badge" title="ยืนยันตัวตนแล้ว">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
        </div>
      </div>
      
      <!-- Driver Info -->
      <div class="provider-info">
        <span class="provider-name">{{ driverName }}</span>
        
        <!-- Rating & Trips -->
        <div class="provider-stats">
          <div class="stat-item rating">
            <svg class="star-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span>{{ driverRating }}</span>
          </div>
          <span class="stat-divider"></span>
          <div class="stat-item trips">
            <svg class="trips-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>{{ totalTrips }} เที่ยว</span>
          </div>
        </div>
        
        <!-- Vehicle Info -->
        <div class="vehicle-info">
          <span v-if="provider.vehicle_plate" class="vehicle-plate">{{ provider.vehicle_plate }}</span>
          <span v-if="vehicleInfo" class="vehicle-type">{{ vehicleInfo }}</span>
        </div>
      </div>
      
      <!-- Call Button -->
      <a 
        v-if="driverPhone" 
        :href="`tel:${driverPhone}`" 
        class="contact-btn" 
        title="โทรหาคนขับ"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
      </a>
      <button v-else class="contact-btn disabled" title="ไม่มีเบอร์โทร" disabled>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
      </button>
    </div>
    
    <!-- Phone Number Display -->
    <div v-if="provider && driverPhone && currentRide.status !== 'pending'" class="phone-display">
      <svg class="phone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
      </svg>
      <a :href="`tel:${driverPhone}`" class="phone-number">{{ driverPhone }}</a>
    </div>
    
    <!-- ETA Countdown -->
    <div v-if="showEta" class="eta-section">
      <div class="eta-header">
        <div class="eta-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="eta-info">
          <span class="eta-label">เวลาที่คาดว่าจะมาถึง</span>
          <span class="eta-time">{{ etaDisplay }}</span>
        </div>
      </div>
      <div class="eta-progress-bar">
        <div class="eta-progress-fill" :style="{ width: `${etaProgress}%` }"></div>
      </div>
    </div>
    
    <!-- Share Trip Button -->
    <div v-if="currentRide.tracking_id && isActive" class="share-section">
      <button class="share-btn" @click="shareTrip">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
        </svg>
        <span>แชร์การเดินทาง</span>
      </button>
      <Transition name="fade">
        <div v-if="showShareSuccess" class="share-success">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>คัดลอกลิงก์แล้ว</span>
        </div>
      </Transition>
    </div>

    <!-- Trip Details -->
    <div class="trip-details">
      <div class="trip-location">
        <div class="location-dot pickup"></div>
        <div class="location-text">
          <span class="location-label">จุดรับ</span>
          <span class="location-address">{{ currentRide.pickup_address }}</span>
        </div>
      </div>
      <div class="trip-line"></div>
      <div class="trip-location">
        <div class="location-dot destination"></div>
        <div class="location-text">
          <span class="location-label">จุดหมาย</span>
          <span class="location-address">{{ currentRide.destination_address }}</span>
        </div>
      </div>
    </div>

    <!-- Fare Info -->
    <div class="fare-info">
      <span class="fare-label">ค่าโดยสาร</span>
      <span class="fare-amount">฿{{ currentRide.estimated_fare }}</span>
    </div>

    <!-- Actions -->
    <div v-if="canCancel" class="actions">
      <button @click="emit('cancel')" class="btn-secondary cancel-btn">
        ยกเลิกการเดินทาง
      </button>
    </div>
  </div>
</template>

<style scoped>
.ride-tracker {
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* Tracking Badge */
.tracking-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: #E8F5EF;
  border-bottom: 1px solid var(--color-border);
}

.tracking-icon {
  width: 18px;
  height: 18px;
  color: #00A86B;
  flex-shrink: 0;
}

.tracking-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.tracking-id {
  font-size: 14px;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  color: #00A86B;
  margin-left: auto;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-left: 4px solid;
  background-color: var(--color-secondary);
}

.status-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon {
  width: 20px;
  height: 20px;
  color: white;
}

.status-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 16px;
  font-weight: 600;
}

.status-pulse {
  width: 8px;
  height: 8px;
  background-color: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

/* Enhanced Provider Card */
.provider-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.provider-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.provider-avatar {
  width: 56px;
  height: 56px;
  background-color: var(--color-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid #00A86B;
}

.provider-avatar svg {
  width: 28px;
  height: 28px;
  color: var(--color-text-muted);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.verified-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.verified-badge svg {
  width: 18px;
  height: 18px;
  color: #00A86B;
}

.provider-info {
  flex: 1;
  min-width: 0;
}

.provider-name {
  font-size: 16px;
  font-weight: 600;
  display: block;
  color: var(--color-text-primary);
}

.provider-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.stat-item.rating {
  color: #F59E0B;
  font-weight: 500;
}

.star-icon {
  width: 14px;
  height: 14px;
}

.trips-icon {
  width: 14px;
  height: 14px;
  color: #00A86B;
}

.stat-divider {
  width: 4px;
  height: 4px;
  background-color: var(--color-border);
  border-radius: 50%;
}

.vehicle-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.vehicle-plate {
  font-size: 12px;
  font-weight: 600;
  background-color: #00A86B;
  color: white;
  padding: 3px 8px;
  border-radius: 6px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}

.vehicle-type {
  font-size: 12px;
  color: var(--color-text-muted);
}

.contact-btn {
  width: 48px;
  height: 48px;
  border: none;
  background-color: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  flex-shrink: 0;
}

.contact-btn:hover {
  background-color: #008F5B;
  transform: scale(1.05);
}

.contact-btn.disabled {
  background-color: var(--color-secondary);
  cursor: not-allowed;
}

.contact-btn svg {
  width: 22px;
  height: 22px;
  color: white;
}

.contact-btn.disabled svg {
  color: var(--color-text-muted);
}

/* Phone Display */
.phone-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #F5F5F5;
  border-bottom: 1px solid var(--color-border);
}

.phone-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-muted);
}

.phone-number {
  font-size: 14px;
  font-weight: 500;
  color: #00A86B;
  text-decoration: none;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}

.phone-number:hover {
  text-decoration: underline;
}

/* ETA Section */
.eta-section {
  padding: 16px;
  background-color: #FFF9E6;
  border-bottom: 1px solid var(--color-border);
}

.eta-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.eta-icon {
  width: 40px;
  height: 40px;
  background-color: #F59E0B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.eta-icon svg {
  width: 22px;
  height: 22px;
  color: white;
}

.eta-info {
  flex: 1;
}

.eta-label {
  font-size: 12px;
  color: var(--color-text-muted);
  display: block;
}

.eta-time {
  font-size: 18px;
  font-weight: 700;
  color: #B45309;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}

.eta-progress-bar {
  height: 6px;
  background-color: #FDE68A;
  border-radius: 3px;
  overflow: hidden;
}

.eta-progress-fill {
  height: 100%;
  background-color: #F59E0B;
  border-radius: 3px;
  transition: width 1s linear;
}

/* Share Section */
.share-section {
  padding: 12px 16px;
  background-color: #F5F5F5;
  border-bottom: 1px solid var(--color-border);
  position: relative;
}

.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background-color: white;
  border: 2px solid #00A86B;
  border-radius: 12px;
  color: #00A86B;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.share-btn:hover {
  background-color: #E8F5EF;
}

.share-btn:active {
  transform: scale(0.98);
}

.share-btn svg {
  width: 20px;
  height: 20px;
}

.share-success {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #00A86B;
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.share-success svg {
  width: 18px;
  height: 18px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.trip-details {
  padding: 16px;
}

.trip-location {
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

.location-dot.pickup {
  background-color: #00A86B;
}

.location-dot.destination {
  background-color: #E53935;
}

.trip-line {
  width: 2px;
  height: 20px;
  background-color: var(--color-border);
  margin-left: 5px;
  margin: 4px 0 4px 5px;
}

.location-text {
  display: flex;
  flex-direction: column;
}

.location-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.location-address {
  font-size: 14px;
  color: var(--color-text-primary);
}

.fare-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-top: 1px solid var(--color-border);
}

.fare-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.fare-amount {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

.actions {
  padding: 16px;
  padding-top: 0;
}

.cancel-btn {
  width: 100%;
  color: var(--color-error);
}
</style>
