<script setup lang="ts">
/**
 * Feature: Multi-Role Ride Booking System V3 - Provider Available Rides
 * Task 5.3: ProviderAvailableRidesV3.vue
 * 
 * Shows pending rides sorted by distance with race-safe acceptance
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProviderDashboardV3 } from '../../composables/useProviderDashboardV3'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const {
  availableRides,
  isLoading,
  error,
  acceptRide,
  subscribeToNewRides
} = useProviderDashboardV3()

const acceptingRideId = ref<string | null>(null)
const showErrorModal = ref(false)
const errorMessage = ref('')

// Handle ride acceptance
const handleAcceptRide = async (rideId: string) => {
  acceptingRideId.value = rideId
  
  const result = await acceptRide(rideId)
  
  if (result.success) {
    // Navigate to active ride view
    router.push('/provider/active-ride')
  } else {
    // Handle race condition
    if (result.error === 'RIDE_ALREADY_ACCEPTED') {
      errorMessage.value = 'งานนี้มีคนรับแล้ว'
    } else if (result.error === 'RIDE_NOT_FOUND') {
      errorMessage.value = 'ไม่พบงานนี้'
    } else {
      errorMessage.value = 'ไม่สามารถรับงานได้ กรุณาลองใหม่'
    }
    showErrorModal.value = true
  }
  
  acceptingRideId.value = null
}

const formatDistance = (km: number) => 
  km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`

const formatFare = (fare: number) => `฿${fare.toLocaleString()}`

onMounted(async () => {
  if (!authStore.user) {
    router.push('/provider/login')
    return
  }
  
  await subscribeToNewRides()
})

onUnmounted(() => {
  // Cleanup handled by composable
})
</script>

<template>
  <div class="available-rides-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <h1>งานใกล้คุณ</h1>
      <div class="spacer"></div>
    </div>

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
      <button class="retry-btn" @click="subscribeToNewRides">ลองใหม่</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="availableRides.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12h8M12 8v8"/>
      </svg>
      <h3>ไม่มีงานใหม่</h3>
      <p>รอสักครู่ จะมีงานเข้ามาเร็วๆ นี้</p>
    </div>

    <!-- Rides List -->
    <div v-else class="rides-list">
      <div class="list-header">
        <span>{{ availableRides.length }} งานใกล้คุณ</span>
        <span class="sort-label">เรียงตามระยะทาง</span>
      </div>

      <div
        v-for="ride in availableRides"
        :key="ride.id"
        class="ride-card"
      >
        <!-- Distance Badge -->
        <div class="distance-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {{ formatDistance(ride.distance || 0) }}
        </div>

        <!-- Ride Info -->
        <div class="ride-info">
          <div class="location-row">
            <div class="location-dot pickup"></div>
            <span class="location-text">{{ ride.pickup_address }}</span>
          </div>
          <div class="location-connector"></div>
          <div class="location-row">
            <div class="location-dot destination"></div>
            <span class="location-text">{{ ride.destination_address }}</span>
          </div>
        </div>

        <!-- Ride Meta -->
        <div class="ride-meta">
          <div class="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
              <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
              <path d="M5 17h-2v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>
            </svg>
            <span>{{ ride.vehicle_type === 'car' ? 'รถเก๋ง' : ride.vehicle_type === 'motorcycle' ? 'มอเตอร์ไซค์' : 'รถตู้' }}</span>
          </div>
          <div class="meta-item fare">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>{{ formatFare(ride.estimated_fare) }}</span>
          </div>
        </div>

        <!-- Accept Button -->
        <button
          class="btn-accept"
          :disabled="acceptingRideId === ride.id"
          @click="handleAcceptRide(ride.id)"
        >
          <span v-if="acceptingRideId === ride.id" class="spinner-small"></span>
          <span v-else>รับงาน</span>
        </button>
      </div>
    </div>

    <!-- Error Modal -->
    <Teleport to="body">
      <div v-if="showErrorModal" class="modal-overlay" @click="showErrorModal = false">
        <div class="error-modal" @click.stop>
          <div class="modal-icon error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h3>ไม่สามารถรับงานได้</h3>
          <p>{{ errorMessage }}</p>
          <button class="btn-close" @click="showErrorModal = false">ตกลง</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.available-rides-page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 80px;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  padding-top: calc(12px + env(safe-area-inset-top));
  background: #fff;
  border-bottom: 1px solid #E8E8E8;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1A1A1A;
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
}

.spacer {
  width: 40px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
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

.empty-state svg {
  width: 64px;
  height: 64px;
  color: #CCC;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.empty-state p {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.retry-btn {
  padding: 12px 24px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.rides-list {
  padding: 16px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
}

.list-header span:first-child {
  font-weight: 600;
  color: #1A1A1A;
}

.sort-label {
  color: #666;
  font-size: 12px;
}

.ride-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  position: relative;
}

.distance-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #E8F5EF;
  color: #00A86B;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.distance-badge svg {
  width: 14px;
  height: 14px;
}

.ride-info {
  margin-bottom: 16px;
  padding-right: 80px;
}

.location-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
}

.location-dot {
  width: 10px;
  height: 10px;
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
  height: 16px;
  background: #E8E8E8;
  margin-left: 4px;
}

.location-text {
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.4;
}

.ride-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
}

.meta-item svg {
  width: 16px;
  height: 16px;
}

.meta-item.fare {
  color: #00A86B;
  font-weight: 600;
}

.btn-accept {
  width: 100%;
  padding: 14px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-accept:hover:not(:disabled) {
  background: #008F5B;
  transform: translateY(-1px);
}

.btn-accept:disabled {
  background: #CCC;
  cursor: not-allowed;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.error-modal {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  max-width: 320px;
  width: 100%;
  text-align: center;
}

.modal-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  background: #FFEBEE;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #E53935;
}

.modal-icon svg {
  width: 28px;
  height: 28px;
}

.error-modal h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px;
}

.error-modal p {
  font-size: 14px;
  color: #666;
  margin: 0 0 20px;
}

.btn-close {
  width: 100%;
  padding: 14px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
</style>
