<script setup lang="ts">
/**
 * Component: RideTrackingView
 * แสดงหน้าจอติดตามการเดินทาง พร้อม Realtime Tracking และ Chat
 */
import { ref, computed, onMounted, watch } from 'vue'
import type { GeoLocation } from '../../composables/useLocation'
import type { MatchedDriver } from '../../composables/useRideRequest'
import { useProviderTracking } from '../../composables/useProviderTracking'
import { useLocationHistory } from '../../composables/useLocationHistory'
import { useGeofencing } from '../../composables/useGeofencing'
import { useRealtimeETA } from '../../composables/useRealtimeETA'
import { useCopyToClipboard } from '../../composables/useCopyToClipboard'
import MapView from '../MapView.vue'
import RideShareETA from './RideShareETA.vue'
import ChatDrawer from '../ChatDrawer.vue'

const props = defineProps<{
  pickup: GeoLocation | null
  destination: GeoLocation | null
  matchedDriver: MatchedDriver | null
  statusText: string
  rideId?: string
  trackingId?: string
}>()

// Format order number for display (short version)
const displayOrderNumber = computed(() => {
  if (props.trackingId) return props.trackingId
  if (props.rideId) {
    // Show first 8 chars of UUID for readability
    return props.rideId.substring(0, 8).toUpperCase()
  }
  return null
})

// Copy to clipboard
const { isCopied, copyOrderNumber } = useCopyToClipboard()

async function handleCopyOrderNumber(): Promise<void> {
  if (displayOrderNumber.value) {
    await copyOrderNumber(displayOrderNumber.value)
  }
}

const emit = defineEmits<{
  callDriver: []
  callEmergency: []
  cancel: []
}>()

// Chat state
const showChat = ref(false)
const unreadMessages = ref(0)

// Provider tracking (realtime location)
const rideIdForTracking = computed(() => props.rideId || '')
const {
  providerLocation,
  loadProviderLocation,
  getDistanceToPickup,
  getEstimatedArrival
} = useProviderTracking(rideIdForTracking.value)

// Provider ID for history and geofencing
const providerId = computed(() => props.matchedDriver?.id || null)

// Location history trail
const {
  coordinates: historyCoordinates,
  hasHistory
} = useLocationHistory(providerId, {
  maxPoints: 30,
  minDistance: 0.05, // 50m
  maxAge: 20 * 60 * 1000 // 20 minutes
})

// Realtime ETA calculation
const driverLoc = computed(() => 
  providerLocation.value 
    ? { lat: providerLocation.value.latitude, lng: providerLocation.value.longitude }
    : null
)
const pickupLoc = computed(() => 
  props.pickup 
    ? { lat: props.pickup.lat, lng: props.pickup.lng }
    : null
)
const {
  etaMinutes: realtimeETA,
  distanceText: realtimeDistance,
  isDriverNearby,
  isDriverApproaching
} = useRealtimeETA(driverLoc, pickupLoc)

// Geofencing alerts
const geofenceZones = computed(() => {
  if (!props.pickup) return []
  return [
    {
      center: { lat: props.pickup.lat, lng: props.pickup.lng },
      radius: 100, // 100m
      name: 'very-close'
    },
    {
      center: { lat: props.pickup.lat, lng: props.pickup.lng },
      radius: 300, // 300m
      name: 'nearby'
    },
    {
      center: { lat: props.pickup.lat, lng: props.pickup.lng },
      radius: 500, // 500m
      name: 'approaching'
    }
  ]
})

const {
  activeZones,
  requestNotificationPermission
} = useGeofencing(driverLoc, geofenceZones, {
  enableNotifications: true,
  enableHaptic: true
})

// Computed driver location (prefer realtime, fallback to matchedDriver)
const realtimeDriverLocation = computed(() => {
  if (providerLocation.value) {
    return {
      lat: providerLocation.value.latitude,
      lng: providerLocation.value.longitude,
      heading: providerLocation.value.heading || 0
    }
  }
  if (props.matchedDriver) {
    return {
      lat: props.matchedDriver.current_lat || 0,
      lng: props.matchedDriver.current_lng || 0,
      heading: 0
    }
  }
  return null
})

// ETA calculation - use realtime ETA if available, fallback to basic calculation
const etaMinutes = computed(() => {
  if (realtimeETA.value !== null) return realtimeETA.value
  if (!props.pickup) return null
  return getEstimatedArrival(props.pickup.lat, props.pickup.lng)
})

const distanceText = computed(() => {
  if (realtimeDistance.value) return realtimeDistance.value
  if (!props.pickup) return null
  const distance = getDistanceToPickup(props.pickup.lat, props.pickup.lng)
  if (distance === null) return null
  if (distance < 1) return `${Math.round(distance * 1000)} ม.`
  return `${distance.toFixed(1)} กม.`
})

// Driver name for chat
const driverName = computed(() => props.matchedDriver?.name || 'คนขับ')

// Helper function to get color code from Thai color name
function getColorCode(colorName: string): string {
  const colorMap: Record<string, string> = {
    'ขาว': '#FFFFFF',
    'ดำ': '#1a1a1a',
    'เทา': '#808080',
    'เงิน': '#C0C0C0',
    'แดง': '#DC2626',
    'น้ำเงิน': '#2563EB',
    'เขียว': '#16A34A',
    'เหลือง': '#EAB308',
    'ส้ม': '#EA580C',
    'ชมพู': '#EC4899',
    'ม่วง': '#9333EA',
    'น้ำตาล': '#92400E',
    'ทอง': '#D97706',
    'ฟ้า': '#0EA5E9',
    'white': '#FFFFFF',
    'black': '#1a1a1a',
    'gray': '#808080',
    'silver': '#C0C0C0',
    'red': '#DC2626',
    'blue': '#2563EB',
    'green': '#16A34A',
    'yellow': '#EAB308',
    'orange': '#EA580C',
    'pink': '#EC4899',
    'purple': '#9333EA',
    'brown': '#92400E',
    'gold': '#D97706'
  }
  return colorMap[colorName.toLowerCase()] || '#808080'
}

// Open chat
function openChat(): void {
  showChat.value = true
  unreadMessages.value = 0
}

// Close chat
function closeChat(): void {
  showChat.value = false
}

// Initialize tracking when rideId is available
watch(() => props.rideId, (newRideId) => {
  if (newRideId) {
    loadProviderLocation()
  }
}, { immediate: true })

onMounted(async () => {
  if (props.rideId) {
    loadProviderLocation()
  }
  
  // Request notification permission for geofencing
  await requestNotificationPermission()
})
</script>

<template>
  <div class="tracking-view">
    <!-- Map Area -->
    <div class="map-area">
      <MapView
        :pickup="pickup"
        :destination="destination"
        :showRoute="true"
        :driverLocation="realtimeDriverLocation"
        :locationHistory="hasHistory ? historyCoordinates : undefined"
        height="100%"
      />
      
      <!-- ETA Badge -->
      <div v-if="etaMinutes || distanceText" class="eta-badge" :class="{ 'nearby': isDriverNearby, 'approaching': isDriverApproaching }">
        <span v-if="etaMinutes" class="eta-time">{{ etaMinutes }} นาที</span>
        <span v-if="distanceText" class="eta-distance">{{ distanceText }}</span>
        <span v-if="isDriverNearby" class="eta-status">ใกล้มากแล้ว!</span>
        <span v-else-if="isDriverApproaching" class="eta-status">กำลังมาถึง</span>
      </div>
      
      <!-- Geofence Alert -->
      <Transition name="slide-down">
        <div v-if="activeZones.length > 0" class="geofence-alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>คนขับอยู่ในพื้นที่แล้ว</span>
        </div>
      </Transition>
    </div>

    <!-- Driver Card -->
    <div class="driver-card">
      <!-- Order Number Badge -->
      <div v-if="displayOrderNumber" class="order-badge" @click="handleCopyOrderNumber">
        <span class="order-label">เลขออเดอร์</span>
        <span class="order-number">#{{ displayOrderNumber }}</span>
        <button type="button" class="copy-btn" :class="{ copied: isCopied }" aria-label="คัดลอกเลขออเดอร์">
          <svg v-if="!isCopied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-indicator"></div>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <!-- Driver Info Card - Enhanced -->
      <div v-if="matchedDriver" class="driver-info-card">
        <!-- Driver Header -->
        <div class="driver-header">
          <div class="driver-avatar-large">
            <img
              v-if="matchedDriver.avatar_url"
              :src="matchedDriver.avatar_url"
              alt="รูปคนขับ"
              class="avatar-img"
            />
            <svg v-else width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <div class="driver-main-info">
            <span class="driver-name-large">{{ matchedDriver.name || 'คนขับ' }}</span>
            <!-- Rating Stars Display -->
            <div class="driver-rating-display">
              <div class="rating-stars">
                <svg v-for="i in 5" :key="i" width="16" height="16" viewBox="0 0 24 24" 
                  :fill="i <= Math.round(matchedDriver.rating || 0) ? '#FFD700' : '#E0E0E0'" 
                  :stroke="i <= Math.round(matchedDriver.rating || 0) ? '#FFD700' : '#E0E0E0'" 
                  stroke-width="1" aria-hidden="true">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              </div>
              <span class="rating-value">{{ (matchedDriver.rating || 0).toFixed(1) }}</span>
              <span v-if="matchedDriver.total_trips" class="trips-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {{ matchedDriver.total_trips.toLocaleString() }} เที่ยว
              </span>
            </div>
          </div>
          <div class="driver-actions">
            <!-- Chat Button -->
            <button class="action-btn chat" @click="openChat" type="button" aria-label="แชทกับคนขับ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <span v-if="unreadMessages > 0" class="unread-badge">{{ unreadMessages }}</span>
            </button>
            <!-- Call Button -->
            <button class="action-btn call" @click="emit('callDriver')" type="button" aria-label="โทรหาคนขับ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Vehicle Info -->
        <div class="vehicle-info-row">
          <div class="vehicle-detail">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <span class="vehicle-plate">{{ matchedDriver.vehicle_plate || 'กข 1234' }}</span>
          </div>
          <div v-if="matchedDriver.vehicle_color" class="vehicle-detail">
            <span class="vehicle-color-dot" :style="{ background: getColorCode(matchedDriver.vehicle_color) }"></span>
            <span>{{ matchedDriver.vehicle_color }}</span>
          </div>
          <div v-if="matchedDriver.vehicle_type" class="vehicle-detail">
            <span class="vehicle-type-badge">{{ matchedDriver.vehicle_type }}</span>
          </div>
        </div>
      </div>

      <!-- No Driver Yet -->
      <div v-else class="no-driver-info">
        <div class="loading-driver">
          <div class="loading-spinner"></div>
          <span>กำลังค้นหาคนขับ...</span>
        </div>
      </div>

      <!-- Trip Info -->
      <div class="trip-info-card">
        <div class="trip-point">
          <div class="point-dot green"></div>
          <span>{{ pickup?.address }}</span>
        </div>
        <div class="trip-point">
          <div class="point-dot red"></div>
          <span>{{ destination?.address }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="card-actions">
        <!-- Share ETA -->
        <RideShareETA
          :ride-id="rideId || 'ride-' + Date.now()"
          :destination-name="destination?.address || 'ปลายทาง'"
          :estimated-arrival="etaMinutes || 5"
          :current-location="realtimeDriverLocation ? { lat: realtimeDriverLocation.lat, lng: realtimeDriverLocation.lng } : undefined"
        />
        
        <button class="sos-btn" type="button" @click="emit('callEmergency')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          SOS
        </button>
        <button class="cancel-btn" type="button" @click="emit('cancel')">
          ยกเลิก
        </button>
      </div>
    </div>

    <!-- Chat Drawer -->
    <ChatDrawer
      v-if="rideId"
      :rideId="rideId"
      :otherUserName="driverName"
      :isOpen="showChat"
      @close="closeChat"
    />
  </div>
</template>

<style scoped>
.tracking-view {
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: hidden;
}

/* Map Area - CRITICAL: Must allow map interaction */
.map-area {
  flex: 1 1 auto;
  min-height: 0;
  background: #e8f5ef;
  position: relative;
  /* CRITICAL: Enable pointer events for map */
  pointer-events: auto !important;
  /* Ensure proper stacking */
  z-index: 1;
  /* Force GPU acceleration */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  /* Ensure it takes available space */
  display: flex;
  flex-direction: column;
}

/* Ensure MapView inside map-area is interactive */
.map-area :deep(.map-wrapper) {
  pointer-events: auto !important;
  /* CRITICAL FIX: Ensure wrapper fills parent completely */
  flex: 1 1 auto;
  height: 100% !important;
  min-height: 0 !important;
  border-radius: 0 !important;
}

.map-area :deep(.map-container) {
  pointer-events: auto !important;
  height: 100% !important;
}

/* Ensure all Leaflet layers are visible and interactive */
.map-area :deep(.leaflet-container) {
  background: #e8f5ef !important;
  z-index: 0 !important;
}

.map-area :deep(.leaflet-tile-pane) {
  z-index: 200 !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.map-area :deep(.leaflet-tile),
.map-area :deep(.osm-tiles) {
  opacity: 1 !important;
  visibility: visible !important;
  display: block !important;
}

.map-area :deep(.leaflet-overlay-pane) {
  z-index: 400 !important;
}

.map-area :deep(.leaflet-marker-pane) {
  z-index: 600 !important;
}

.map-area :deep(.leaflet-popup-pane) {
  z-index: 700 !important;
}

.map-area :deep(.leaflet-control-container) {
  z-index: 800 !important;
}

/* Driver Card */
.driver-card {
  flex: 0 0 auto;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  max-height: 55vh;
  overflow-y: auto;
}

/* Order Badge */
.order-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 12px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.order-badge:hover {
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
}

.order-badge:active {
  transform: scale(0.98);
}

.order-label {
  font-size: 13px;
  color: #0369a1;
  font-weight: 500;
}

.order-number {
  font-size: 16px;
  font-weight: 700;
  color: #0c4a6e;
  font-family: 'SF Mono', 'Menlo', monospace;
  letter-spacing: 0.5px;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #fff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  color: #0369a1;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #e0f2fe;
}

.copy-btn.copied {
  background: #22c55e;
  border-color: #22c55e;
  color: #fff;
}

/* Status Bar */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  background: #00a86b;
  border-radius: 50%;
  animation: pulse-status 2s ease-in-out infinite;
}

@keyframes pulse-status {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.status-text {
  font-size: 16px;
  font-weight: 600;
  color: #00a86b;
}

/* Driver Info Card - Enhanced */
.driver-info-card {
  background: linear-gradient(135deg, #f8fffe 0%, #f0fdf9 100%);
  border: 1px solid #d1fae5;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.driver-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.driver-avatar-large {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0369a1;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.driver-avatar-large .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driver-main-info {
  flex: 1;
  min-width: 0;
}

.driver-name-large {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a1a;
  display: block;
  margin-bottom: 6px;
}

.driver-rating-display {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rating-stars {
  display: flex;
  gap: 2px;
}

.rating-value {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}

.trips-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #0369a1;
}

.trips-badge svg {
  color: #0ea5e9;
}

/* Vehicle Info Row */
.vehicle-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.vehicle-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #4b5563;
}

.vehicle-detail svg {
  color: #6b7280;
}

.vehicle-plate {
  font-weight: 600;
  color: #1f2937;
  font-family: 'SF Mono', 'Menlo', monospace;
  letter-spacing: 0.5px;
}

.vehicle-color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.vehicle-type-badge {
  padding: 2px 8px;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #4b5563;
}

/* No Driver State */
.no-driver-info {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.loading-driver {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #666;
  font-size: 14px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.driver-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.call {
  background: #00a86b;
  color: #fff;
}

.action-btn:active {
  transform: scale(0.95);
}

.action-btn.chat {
  background: #f5f5f5;
  color: #333;
  position: relative;
}

.action-btn.chat:active {
  background: #e8e8e8;
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  background: #e53935;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* ETA Badge - CRITICAL: Must not block map */
.eta-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  background: #fff;
  padding: 8px 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 1000;
  /* CRITICAL: Badge should not block map clicks */
  pointer-events: none !important;
  transition: all 0.3s ease;
}

.eta-badge.nearby {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #fff;
  animation: pulse-badge 1.5s ease-in-out infinite;
}

.eta-badge.approaching {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
}

@keyframes pulse-badge {
  0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3); }
  50% { transform: scale(1.05); box-shadow: 0 4px 16px rgba(34, 197, 94, 0.5); }
}

.eta-time {
  font-size: 14px;
  font-weight: 600;
}

.eta-badge.nearby .eta-time,
.eta-badge.approaching .eta-time {
  color: #fff;
}

.eta-distance {
  font-size: 12px;
  color: #666;
}

.eta-badge.nearby .eta-distance,
.eta-badge.approaching .eta-distance {
  color: rgba(255, 255, 255, 0.9);
}

.eta-status {
  font-size: 11px;
  font-weight: 600;
  margin-top: 2px;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Geofence Alert */
.geofence-alert {
  position: absolute;
  top: 80px;
  left: 16px;
  right: 16px;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 1000;
  pointer-events: none !important;
  animation: slide-in 0.3s ease-out;
}

.geofence-alert svg {
  flex-shrink: 0;
  animation: bounce-icon 1s ease-in-out infinite;
}

.geofence-alert span {
  font-size: 14px;
  font-weight: 600;
}

@keyframes slide-in {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes bounce-icon {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* Slide down transition */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* Trip Info */
.trip-info-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.trip-point {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #1a1a1a;
}

.trip-point span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.point-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-dot.green { background: #00a86b; }
.point-dot.red { background: #e53935; }

/* Action Buttons */
.card-actions {
  display: flex;
  gap: 12px;
}

.sos-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  background: #ffebee;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #e53935;
  cursor: pointer;
  transition: all 0.2s;
}

.sos-btn:active {
  background: #ffcdd2;
  transform: scale(0.98);
}

.cancel-btn {
  flex: 1;
  padding: 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:active {
  background: #e8e8e8;
  transform: scale(0.98);
}
</style>
