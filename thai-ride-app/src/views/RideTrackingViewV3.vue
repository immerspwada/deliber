<script setup lang="ts">
/**
 * Feature: Multi-Role Ride Booking System V3 - Customer Tracking View
 * Task 3.4: RideTrackingViewV3.vue
 * 
 * Real-time ride tracking with provider location and status updates
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRideBookingV3 } from '../composables/useRideBookingV3'
import MapView from '../components/MapView.vue'

const router = useRouter()
const route = useRoute()

const {
  currentRide,
  providerInfo,
  isLoading,
  error,
  cancelRide,
  subscribeToRideUpdates
} = useRideBookingV3()

const showCancelSheet = ref(false)
const cancelReason = ref('')
const isCancelling = ref(false)

const cancelReasons = [
  'เปลี่ยนใจ',
  'รอนานเกินไป',
  'ติดต่อคนขับไม่ได้',
  'มีเหตุฉุกเฉิน',
  'อื่นๆ'
]

// Status labels
const statusLabels: Record<string, string> = {
  pending: 'กำลังหาคนขับ...',
  matched: 'คนขับกำลังมารับ',
  arriving: 'คนขับใกล้ถึงแล้ว',
  picked_up: 'เริ่มเดินทาง',
  in_progress: 'กำลังเดินทาง',
  completed: 'ถึงจุดหมายแล้ว',
  cancelled: 'ยกเลิกแล้ว'
}

const statusColors: Record<string, string> = {
  pending: '#F5A623',
  matched: '#00A86B',
  arriving: '#00A86B',
  picked_up: '#1976D2',
  in_progress: '#1976D2',
  completed: '#4CAF50',
  cancelled: '#E53935'
}

const currentStatus = computed(() => 
  currentRide.value ? statusLabels[currentRide.value.status] || currentRide.value.status : ''
)

const statusColor = computed(() => 
  currentRide.value ? statusColors[currentRide.value.status] || '#666' : '#666'
)

const canCancel = computed(() => 
  currentRide.value && ['pending', 'matched'].includes(currentRide.value.status)
)

const handleCancelRide = async () => {
  if (!cancelReason.value || !currentRide.value) return
  
  if (!confirm('ต้องการยกเลิกการเดินทางนี้หรือไม่?')) return
  
  isCancelling.value = true
  const result = await cancelRide(currentRide.value.id, cancelReason.value)
  isCancelling.value = false
  
  if (result.success) {
    showCancelSheet.value = false
    router.push('/')
  }
}

const callProvider = () => {
  if (providerInfo.value?.phone) {
    window.location.href = `tel:${providerInfo.value.phone}`
  }
}

onMounted(async () => {
  const rideId = route.params.id as string
  if (rideId) {
    await subscribeToRideUpdates(rideId)
  }
})

onUnmounted(() => {
  // Cleanup handled by composable
})
</script>

<template>
  <div class="tracking-page">
    <!-- Map -->
    <div class="map-section">
      <MapView
        v-if="currentRide"
        :pickup="currentRide.pickup"
        :destination="currentRide.destination"
        :driver-location="providerInfo ? { lat: providerInfo.currentLat, lng: providerInfo.currentLng } : undefined"
        :show-route="true"
        height="55vh"
      />
      
      <div class="top-bar">
        <button class="back-btn" @click="router.push('/')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div class="tracking-id" v-if="currentRide">
          {{ currentRide.trackingId }}
        </div>
      </div>
    </div>

    <!-- Info Panel -->
    <div class="info-panel">
      <div class="panel-handle"></div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <span>กำลังโหลด...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Ride Info -->
      <template v-else-if="currentRide">
        <!-- Status -->
        <div class="status-section">
          <div class="status-indicator" :style="{ background: statusColor }"></div>
          <div class="status-text">
            <span class="status-main">{{ currentStatus }}</span>
            <span class="status-sub">{{ currentRide.vehicleType === 'car' ? 'รถเก๋ง' : currentRide.vehicleType === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถตู้' }}</span>
          </div>
        </div>

        <!-- Provider Card -->
        <div v-if="providerInfo" class="provider-card">
          <div class="provider-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="provider-info">
            <span class="provider-name">{{ providerInfo.name }}</span>
            <div class="provider-meta">
              <span class="vehicle">{{ providerInfo.vehiclePlate }}</span>
              <span class="rating">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                {{ providerInfo.rating?.toFixed(1) || 'N/A' }}
              </span>
            </div>
          </div>
          <button class="call-btn" @click="callProvider">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </button>
        </div>

        <!-- Locations -->
        <div class="locations-section">
          <div class="location-item">
            <div class="location-dot pickup"></div>
            <div class="location-text">
              <span class="label">จุดรับ</span>
              <span class="address">{{ currentRide.pickup.address }}</span>
            </div>
          </div>
          <div class="location-connector"></div>
          <div class="location-item">
            <div class="location-dot destination"></div>
            <div class="location-text">
              <span class="label">จุดหมาย</span>
              <span class="address">{{ currentRide.destination.address }}</span>
            </div>
          </div>
        </div>

        <!-- Fare -->
        <div class="fare-section">
          <span>ค่าโดยสาร</span>
          <span class="fare-amount">฿{{ currentRide.estimatedFare.toLocaleString() }}</span>
        </div>

        <!-- Cancel Button -->
        <button
          v-if="canCancel"
          class="btn-cancel"
          @click="showCancelSheet = true"
        >
          ยกเลิกการเดินทาง
        </button>
      </template>
    </div>

    <!-- Cancel Sheet -->
    <Teleport to="body">
      <div v-if="showCancelSheet" class="sheet-overlay" @click="showCancelSheet = false">
        <div class="cancel-sheet" @click.stop>
          <div class="sheet-handle"></div>
          <h3>ยกเลิกการเดินทาง</h3>
          <p>กรุณาเลือกเหตุผล</p>
          
          <div class="cancel-reasons">
            <button
              v-for="reason in cancelReasons"
              :key="reason"
              :class="['reason-btn', { selected: cancelReason === reason }]"
              @click="cancelReason = reason"
            >
              {{ reason }}
            </button>
          </div>

          <button
            class="btn-confirm-cancel"
            :disabled="!cancelReason || isCancelling"
            @click="handleCancelRide"
          >
            <span v-if="isCancelling">กำลังยกเลิก...</span>
            <span v-else>ยืนยันยกเลิก</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.tracking-page {
  min-height: 100vh;
  background: #F5F5F5;
}

.map-section {
  position: relative;
  height: 55vh;
}

.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
}

.back-btn {
  width: 40px;
  height: 40px;
  background: #fff;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tracking-id {
  padding: 8px 16px;
  background: rgba(255,255,255,0.95);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.info-panel {
  background: #fff;
  border-radius: 20px 20px 0 0;
  margin-top: -20px;
  padding: 20px 16px;
  position: relative;
  z-index: 10;
  min-height: 45vh;
}

.panel-handle {
  width: 40px;
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  margin: 0 auto 20px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F8F8F8;
  border-radius: 12px;
  margin-bottom: 16px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-main {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.status-sub {
  font-size: 13px;
  color: #666;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F8F8F8;
  border-radius: 12px;
  margin-bottom: 16px;
}

.provider-avatar {
  width: 48px;
  height: 48px;
  background: #E8F5EF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00A86B;
}

.provider-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.provider-name {
  font-size: 15px;
  font-weight: 600;
}

.provider-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #666;
}

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #F5A623;
}

.call-btn {
  width: 44px;
  height: 44px;
  background: #00A86B;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
}

.locations-section {
  margin-bottom: 16px;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
}

.location-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.location-dot.pickup {
  background: #00A86B;
}

.location-dot.destination {
  background: #E53935;
}

.location-connector {
  width: 2px;
  height: 20px;
  background: #E8E8E8;
  margin-left: 5px;
}

.location-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 12px;
  color: #666;
}

.address {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.fare-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #F8F8F8;
  border-radius: 12px;
  margin-bottom: 16px;
}

.fare-amount {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

.btn-cancel {
  width: 100%;
  padding: 16px;
  background: #fff;
  color: #E53935;
  border: 2px solid #E53935;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}

.cancel-sheet {
  width: 100%;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px 16px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.cancel-sheet h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.cancel-sheet p {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.cancel-reasons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.reason-btn {
  padding: 14px 16px;
  background: #F8F8F8;
  border: 2px solid transparent;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.reason-btn.selected {
  background: #E8F5EF;
  border-color: #00A86B;
}

.btn-confirm-cancel {
  width: 100%;
  padding: 16px;
  background: #E53935;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm-cancel:disabled {
  background: #CCC;
  cursor: not-allowed;
}
</style>
