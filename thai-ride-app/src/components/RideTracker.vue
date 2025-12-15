<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import MapView from './MapView.vue'
import { useServices } from '../composables/useServices'
import type { RideRequest, ServiceProvider } from '../types/database'
import type { GeoLocation } from '../composables/useLocation'

const props = defineProps<{
  ride: RideRequest
  provider?: ServiceProvider | null
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'complete'): void
}>()

const { subscribeToRide, subscribeToDriverLocation } = useServices()

const currentRide = ref<RideRequest>(props.ride)
const providerLocation = ref<GeoLocation | null>(null)
const rideSubscription = ref<{ unsubscribe: () => void } | null>(null)
const driverSubscription = ref<{ unsubscribe: () => void } | null>(null)

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
      if (ride) {
        currentRide.value = ride
      } else {
        currentRide.value.status = status as any
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
})

onMounted(() => {
  setupSubscriptions()
})

onUnmounted(() => {
  cleanupSubscriptions()
})
</script>

<template>
  <div class="ride-tracker">
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

    <!-- Provider Info -->
    <div v-if="provider && currentRide.status !== 'pending'" class="provider-card">
      <div class="provider-avatar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
      <div class="provider-info">
        <span class="provider-name">คนขับของคุณ</span>
        <div class="provider-details">
          <span v-if="provider.vehicle_plate" class="vehicle-plate">{{ provider.vehicle_plate }}</span>
          <span v-if="provider.vehicle_type" class="vehicle-type">{{ provider.vehicle_type }}</span>
        </div>
        <div class="provider-rating">
          <svg class="star-icon" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <span>{{ provider.rating?.toFixed(1) || '5.0' }}</span>
        </div>
      </div>
      <button class="contact-btn" title="โทรหาคนขับ">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
      </button>
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

.provider-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.provider-avatar {
  width: 48px;
  height: 48px;
  background-color: var(--color-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.provider-avatar svg {
  width: 24px;
  height: 24px;
  color: var(--color-text-muted);
}

.provider-info {
  flex: 1;
}

.provider-name {
  font-size: 14px;
  font-weight: 600;
  display: block;
}

.provider-details {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.vehicle-plate {
  font-size: 12px;
  font-weight: 500;
  background-color: var(--color-primary);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
}

.vehicle-type {
  font-size: 12px;
  color: var(--color-text-muted);
}

.provider-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.star-icon {
  width: 14px;
  height: 14px;
  color: #F59E0B;
}

.contact-btn {
  width: 44px;
  height: 44px;
  border: none;
  background-color: var(--color-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.contact-btn:hover {
  background-color: var(--color-border);
}

.contact-btn svg {
  width: 20px;
  height: 20px;
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
  background-color: var(--color-success);
}

.location-dot.destination {
  background-color: var(--color-error);
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
