<script setup lang="ts">
/**
 * View: SharedRideTrackingView
 * หน้าติดตามการเดินทางแบบ public (ไม่ต้อง login)
 * 
 * Features:
 * - Live ETA updates via realtime subscription
 * - Share link analytics tracking
 * - Auto-refresh ride status
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useShareTrip, type SharedRideInfo } from '../../composables/useShareTrip'
import { useRealtimeETA } from '../../composables/useRealtimeETA'
import { supabase } from '../../lib/supabase'
import MapView from '../../components/MapView.vue'

const route = useRoute()
const shareToken = computed(() => route.params.token as string)

const { loading, error, getSharedRideInfo, logShareLinkView } = useShareTrip()

const rideInfo = ref<SharedRideInfo | null>(null)
const lastUpdated = ref<Date | null>(null)
const liveDriverLocation = ref<{ lat: number; lng: number } | null>(null)
let refreshInterval: ReturnType<typeof setInterval> | null = null
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
let locationChannel: ReturnType<typeof supabase.channel> | null = null

// Live ETA tracking - use live location if available, otherwise from rideInfo
const driverLocationRef = computed(() => {
  // Prefer live location from realtime subscription
  if (liveDriverLocation.value) {
    return liveDriverLocation.value
  }
  // Fallback to rideInfo
  if (!rideInfo.value?.provider?.current_lat || !rideInfo.value?.provider?.current_lng) {
    return null
  }
  return {
    lat: rideInfo.value.provider.current_lat,
    lng: rideInfo.value.provider.current_lng
  }
})

const targetLocationRef = computed(() => {
  if (!rideInfo.value?.ride) return null
  const status = rideInfo.value.ride.status
  // If driver is on the way to pickup, target is pickup location
  if (['matched', 'arriving', 'arrived', 'pickup'].includes(status)) {
    return {
      lat: rideInfo.value.ride.pickup_lat,
      lng: rideInfo.value.ride.pickup_lng
    }
  }
  // If in progress, target is destination
  if (['picked_up', 'in_progress'].includes(status)) {
    return {
      lat: rideInfo.value.ride.destination_lat,
      lng: rideInfo.value.ride.destination_lng
    }
  }
  return null
})

// Use realtime ETA composable
const { etaText, distanceText, isDriverNearby, isDriverApproaching } = useRealtimeETA(
  driverLocationRef,
  targetLocationRef
)

// ETA display text based on ride status
const etaLabel = computed(() => {
  if (!rideInfo.value?.ride) return ''
  const status = rideInfo.value.ride.status
  if (['matched', 'arriving'].includes(status)) {
    return 'คนขับจะถึงจุดรับใน'
  }
  if (['picked_up', 'in_progress'].includes(status)) {
    return 'ถึงปลายทางใน'
  }
  return ''
})

// Show ETA section only when relevant
const showETA = computed(() => {
  if (!rideInfo.value?.ride || !etaText.value) return false
  const status = rideInfo.value.ride.status
  return ['matched', 'arriving', 'picked_up', 'in_progress'].includes(status)
})

// Status text mapping
const statusTextMap: Record<string, string> = {
  'pending': 'กำลังหาคนขับ...',
  'matched': 'พบคนขับแล้ว',
  'arriving': 'คนขับกำลังมารับ',
  'arrived': 'คนขับถึงจุดรับแล้ว',
  'pickup': 'คนขับถึงจุดรับแล้ว',
  'picked_up': 'กำลังเดินทาง',
  'in_progress': 'กำลังเดินทาง',
  'completed': 'ถึงปลายทางแล้ว',
  'cancelled': 'ยกเลิกแล้ว'
}

const statusText = computed(() => {
  if (!rideInfo.value?.ride?.status) return 'กำลังโหลด...'
  return statusTextMap[rideInfo.value.ride.status] || rideInfo.value.ride.status
})

const isActive = computed(() => {
  const status = rideInfo.value?.ride?.status
  return status && !['completed', 'cancelled'].includes(status)
})

// Driver location for map
const driverLocation = computed(() => {
  if (!rideInfo.value?.provider?.current_lat || !rideInfo.value?.provider?.current_lng) {
    return null
  }
  return {
    lat: rideInfo.value.provider.current_lat,
    lng: rideInfo.value.provider.current_lng,
    heading: 0
  }
})

// Pickup location
const pickup = computed(() => {
  if (!rideInfo.value?.ride) return null
  return {
    lat: rideInfo.value.ride.pickup_lat,
    lng: rideInfo.value.ride.pickup_lng,
    address: rideInfo.value.ride.pickup_address
  }
})

// Destination location
const destination = computed(() => {
  if (!rideInfo.value?.ride) return null
  return {
    lat: rideInfo.value.ride.destination_lat,
    lng: rideInfo.value.ride.destination_lng,
    address: rideInfo.value.ride.destination_address
  }
})

// Format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

// Log analytics view on page load
async function logAnalyticsView(): Promise<void> {
  if (!shareToken.value) return
  
  try {
    await logShareLinkView(shareToken.value)
    console.log('[SharedTracking] Analytics view logged')
  } catch (err) {
    console.warn('[SharedTracking] Failed to log analytics:', err)
  }
}

// Load ride info
async function loadRideInfo(): Promise<void> {
  if (!shareToken.value) return
  
  const info = await getSharedRideInfo(shareToken.value)
  if (info) {
    rideInfo.value = info
    lastUpdated.value = new Date()
    
    // Setup realtime if ride is active
    if (isActive.value && info.ride?.id) {
      setupRealtime(info.ride.id)
      setupLocationTracking(info.ride.provider_id)
    }
  }
}

// Setup realtime subscription for ride status
function setupRealtime(rideId: string): void {
  cleanupRealtime()
  
  realtimeChannel = supabase
    .channel(`shared-ride-${rideId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'ride_requests',
      filter: `id=eq.${rideId}`
    }, (payload) => {
      console.log('[SharedTracking] Ride update:', payload.new)
      if (rideInfo.value) {
        rideInfo.value = {
          ...rideInfo.value,
          ride: {
            ...rideInfo.value.ride,
            status: payload.new.status as string
          }
        }
        lastUpdated.value = new Date()
      }
    })
    .subscribe()
}

// Setup realtime subscription for driver location
function setupLocationTracking(providerId?: string): void {
  if (!providerId) return
  
  cleanupLocationChannel()
  
  locationChannel = supabase
    .channel(`shared-location-${providerId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'provider_location_history',
      filter: `provider_id=eq.${providerId}`
    }, (payload) => {
      console.log('[SharedTracking] Location update:', payload.new)
      const newLocation = payload.new as { latitude?: number; longitude?: number }
      if (newLocation.latitude && newLocation.longitude) {
        liveDriverLocation.value = {
          lat: newLocation.latitude,
          lng: newLocation.longitude
        }
        lastUpdated.value = new Date()
      }
    })
    .subscribe()
}

// Cleanup realtime channels
function cleanupRealtime(): void {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

function cleanupLocationChannel(): void {
  if (locationChannel) {
    supabase.removeChannel(locationChannel)
    locationChannel = null
  }
}

// Auto refresh every 30 seconds
function startAutoRefresh(): void {
  refreshInterval = setInterval(() => {
    if (isActive.value) {
      loadRideInfo()
    }
  }, 30000)
}

// Watch for driver nearby/approaching status
watch([isDriverNearby, isDriverApproaching], ([nearby, approaching]) => {
  if (nearby) {
    console.log('[SharedTracking] Driver is nearby!')
  } else if (approaching) {
    console.log('[SharedTracking] Driver is approaching')
  }
})

onMounted(() => {
  loadRideInfo()
  logAnalyticsView()
  startAutoRefresh()
})

onUnmounted(() => {
  cleanupRealtime()
  cleanupLocationChannel()
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<template>
  <div class="shared-tracking-view">
    <!-- Loading State -->
    <div v-if="loading && !rideInfo" class="loading-state">
      <div class="loading-spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h2>{{ error }}</h2>
      <p>ลิงก์อาจหมดอายุหรือไม่ถูกต้อง</p>
    </div>

    <!-- Ride Info -->
    <template v-else-if="rideInfo">
      <!-- Map Area -->
      <div class="map-area">
        <MapView
          :pickup="pickup"
          :destination="destination"
          :show-route="true"
          :driver-location="driverLocation"
          height="100%"
        />
        
        <!-- Status Badge -->
        <div class="status-badge" :class="{ active: isActive, completed: rideInfo.ride.status === 'completed' }">
          <div class="status-dot"></div>
          <span>{{ statusText }}</span>
        </div>
      </div>

      <!-- Info Card -->
      <div class="info-card">
        <!-- Header -->
        <div class="card-header">
          <h1>ติดตามการเดินทาง</h1>
          <span v-if="lastUpdated" class="last-updated">
            อัพเดทล่าสุด {{ formatTime(lastUpdated) }}
          </span>
        </div>

        <!-- Driver Info -->
        <div v-if="rideInfo.provider" class="driver-section">
          <div class="driver-avatar">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <div class="driver-info">
            <span class="driver-name">{{ rideInfo.provider.name }}</span>
            <div class="vehicle-info">
              <span class="vehicle-plate">{{ rideInfo.provider.vehicle_plate }}</span>
              <span v-if="rideInfo.provider.vehicle_color" class="vehicle-color">
                {{ rideInfo.provider.vehicle_color }}
              </span>
              <span v-if="rideInfo.provider.vehicle_type" class="vehicle-type">
                {{ rideInfo.provider.vehicle_type }}
              </span>
            </div>
          </div>
        </div>

        <!-- Live ETA Section -->
        <div v-if="showETA" class="eta-section" :class="{ nearby: isDriverNearby, approaching: isDriverApproaching }">
          <div class="eta-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
          <div class="eta-content">
            <span class="eta-label">{{ etaLabel }}</span>
            <span class="eta-value">{{ etaText }}</span>
            <span v-if="distanceText" class="eta-distance">{{ distanceText }}</span>
          </div>
          <div v-if="isDriverNearby" class="eta-badge nearby">
            ใกล้ถึงแล้ว!
          </div>
          <div v-else-if="isDriverApproaching" class="eta-badge approaching">
            กำลังมา
          </div>
        </div>

        <!-- Trip Points -->
        <div class="trip-points">
          <div class="trip-point">
            <div class="point-marker green"></div>
            <div class="point-info">
              <span class="point-label">จุดรับ</span>
              <span class="point-address">{{ rideInfo.ride.pickup_address }}</span>
            </div>
          </div>
          <div class="trip-line"></div>
          <div class="trip-point">
            <div class="point-marker red"></div>
            <div class="point-info">
              <span class="point-label">ปลายทาง</span>
              <span class="point-address">{{ rideInfo.ride.destination_address }}</span>
            </div>
          </div>
        </div>

        <!-- Fare Info -->
        <div v-if="rideInfo.ride.estimated_fare" class="fare-info">
          <span class="fare-label">ค่าโดยสารโดยประมาณ</span>
          <span class="fare-amount">฿{{ rideInfo.ride.estimated_fare.toLocaleString() }}</span>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          <p class="powered-by">Powered by Thai Ride App</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.shared-tracking-view {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

/* Loading State */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #00a86b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  text-align: center;
  color: #666;
}

.error-state svg {
  color: #e53935;
}

.error-state h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.error-state p {
  font-size: 14px;
  margin: 0;
}

/* Map Area */
.map-area {
  flex: 1;
  min-height: 300px;
  position: relative;
}

.status-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.status-badge.active .status-dot {
  background: #00a86b;
  animation: pulse 2s ease-in-out infinite;
}

.status-badge.completed .status-dot {
  background: #3b82f6;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.status-badge span {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

/* Info Card */
.info-card {
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card-header h1 {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.last-updated {
  font-size: 12px;
  color: #999;
}

/* Driver Section */
.driver-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 48px;
  height: 48px;
  background: #e0f2fe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0369a1;
}

.driver-info {
  flex: 1;
}

.driver-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.vehicle-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.vehicle-plate {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  font-family: 'SF Mono', 'Menlo', monospace;
}

.vehicle-color,
.vehicle-type {
  font-size: 12px;
  color: #666;
  padding: 2px 8px;
  background: #e8e8e8;
  border-radius: 6px;
}

/* Live ETA Section */
.eta-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%);
  border: 1px solid #bae6fd;
  border-radius: 12px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.eta-section.nearby {
  background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%);
  border-color: #86efac;
}

.eta-section.approaching {
  background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%);
  border-color: #fcd34d;
}

.eta-icon {
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0369a1;
  flex-shrink: 0;
}

.eta-section.nearby .eta-icon {
  color: #16a34a;
}

.eta-section.approaching .eta-icon {
  color: #d97706;
}

.eta-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.eta-label {
  font-size: 12px;
  color: #666;
}

.eta-value {
  font-size: 20px;
  font-weight: 700;
  color: #0369a1;
}

.eta-section.nearby .eta-value {
  color: #16a34a;
}

.eta-section.approaching .eta-value {
  color: #d97706;
}

.eta-distance {
  font-size: 13px;
  color: #666;
}

.eta-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.eta-badge.nearby {
  background: #16a34a;
  color: #fff;
  animation: pulse-badge 1.5s ease-in-out infinite;
}

.eta-badge.approaching {
  background: #d97706;
  color: #fff;
}

@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* Trip Points */
.trip-points {
  position: relative;
  padding-left: 24px;
  margin-bottom: 20px;
}

.trip-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.point-marker {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.point-marker.green { background: #00a86b; }
.point-marker.red { background: #e53935; }

.trip-line {
  position: absolute;
  left: 29px;
  top: 28px;
  bottom: 28px;
  width: 2px;
  background: #e0e0e0;
}

.point-info {
  flex: 1;
}

.point-label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}

.point-address {
  font-size: 14px;
  color: #1a1a1a;
  line-height: 1.4;
}

/* Fare Info */
.fare-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  margin-bottom: 20px;
}

.fare-label {
  font-size: 14px;
  color: #166534;
}

.fare-amount {
  font-size: 18px;
  font-weight: 700;
  color: #166534;
}

/* Footer */
.card-footer {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.powered-by {
  font-size: 12px;
  color: #999;
  margin: 0;
}
</style>
