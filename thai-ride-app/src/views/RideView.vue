<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import LocationPicker from '../components/LocationPicker.vue'
import MapView from '../components/MapView.vue'
import RideTracker from '../components/RideTracker.vue'
import { useLocation, type GeoLocation } from '../composables/useLocation'
import { useRideStore } from '../stores/ride'
import { useAuthStore } from '../stores/auth'
import type { RideRequest, ServiceProvider } from '../types/database'

const rideStore = useRideStore()
const authStore = useAuthStore()
const { calculateDistance, calculateTravelTime } = useLocation()

// Form state
const pickupAddress = ref('')
const destinationAddress = ref('')
const pickupLocation = ref<GeoLocation | null>(null)
const destinationLocation = ref<GeoLocation | null>(null)
const rideType = ref<'standard' | 'premium' | 'shared'>('standard')
const passengerCount = ref(1)

// UI state
const isCalculating = ref(false)
const isBooking = ref(false)
const estimatedFare = ref(0)
const estimatedTime = ref(0)
const estimatedDistance = ref(0)
const showFareResult = ref(false)

// Active ride state
const activeRide = ref<RideRequest | null>(null)
const assignedProvider = ref<ServiceProvider | null>(null)
const viewMode = ref<'booking' | 'tracking'>('booking')

const rideTypes = [
  { value: 'standard', label: 'มาตรฐาน', multiplier: 1.0, icon: 'car' },
  { value: 'premium', label: 'พรีเมียม', multiplier: 1.5, icon: 'car-premium' },
  { value: 'shared', label: 'ร่วมเดินทาง', multiplier: 0.8, icon: 'car-shared' }
] as const

const canCalculate = computed(() => pickupLocation.value && destinationLocation.value)

const handlePickupSelected = (location: GeoLocation) => {
  pickupLocation.value = location
  showFareResult.value = false
}

const handleDestinationSelected = (location: GeoLocation) => {
  destinationLocation.value = location
  showFareResult.value = false
}

const handleRouteCalculated = (data: { distance: number; duration: number }) => {
  estimatedDistance.value = data.distance
  estimatedTime.value = data.duration
}

const calculateFare = async () => {
  if (!canCalculate.value || !pickupLocation.value || !destinationLocation.value) return
  
  isCalculating.value = true
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Calculate distance if not already calculated by map
  if (estimatedDistance.value === 0) {
    estimatedDistance.value = calculateDistance(
      pickupLocation.value.lat, pickupLocation.value.lng,
      destinationLocation.value.lat, destinationLocation.value.lng
    )
    estimatedTime.value = calculateTravelTime(estimatedDistance.value)
  }
  
  // Calculate fare
  estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, rideType.value)
  showFareResult.value = true
  isCalculating.value = false
}

const bookRide = async () => {
  if (!pickupLocation.value || !destinationLocation.value) return
  
  // Check if user is logged in
  if (!authStore.user) {
    alert('กรุณาเข้าสู่ระบบก่อนจองรถ')
    return
  }
  
  isBooking.value = true
  
  try {
    const ride = await rideStore.createRideRequest(
      authStore.user.id,
      pickupLocation.value,
      destinationLocation.value,
      rideType.value,
      passengerCount.value
    )
    
    if (ride) {
      activeRide.value = ride
      viewMode.value = 'tracking'
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
  alert('การเดินทางเสร็จสิ้น ขอบคุณที่ใช้บริการ')
  resetBooking()
}

const resetBooking = () => {
  activeRide.value = null
  assignedProvider.value = null
  viewMode.value = 'booking'
  showFareResult.value = false
  pickupAddress.value = ''
  destinationAddress.value = ''
  pickupLocation.value = null
  destinationLocation.value = null
  estimatedFare.value = 0
  estimatedDistance.value = 0
  estimatedTime.value = 0
}

// Recalculate when ride type changes
watch(rideType, () => {
  if (showFareResult.value && estimatedDistance.value > 0) {
    estimatedFare.value = rideStore.calculateFare(estimatedDistance.value, rideType.value)
  }
})
</script>

<template>
  <div class="page-container">
    <div class="content-container">
      <!-- Tracking Mode -->
      <template v-if="viewMode === 'tracking' && activeRide">
        <div class="page-header">
          <h1 class="page-title">การเดินทางของคุณ</h1>
        </div>
        <RideTracker
          :ride="activeRide"
          :provider="assignedProvider"
          @cancel="handleCancelRide"
          @complete="handleRideComplete"
        />
      </template>

      <!-- Booking Mode -->
      <template v-else>
        <div class="page-header">
          <h1 class="page-title">เรียกรถ</h1>
          <p class="page-subtitle">ระบุจุดรับและจุดหมายของคุณ</p>
        </div>

        <!-- Location Inputs -->
      <div class="form-section">
        <div class="location-inputs">
          <LocationPicker
            v-model="pickupAddress"
            placeholder="จุดรับ - ค้นหาหรือใช้ GPS"
            type="pickup"
            @location-selected="handlePickupSelected"
          />
          <div class="location-divider"></div>
          <LocationPicker
            v-model="destinationAddress"
            placeholder="จุดหมาย - ค้นหาสถานที่"
            type="destination"
            @location-selected="handleDestinationSelected"
          />
        </div>
      </div>

      <!-- Map -->
      <MapView
        :pickup="pickupLocation"
        :destination="destinationLocation"
        :show-route="true"
        height="220px"
        @route-calculated="handleRouteCalculated"
      />

      <!-- Ride Type Selection -->
      <div class="form-section">
        <label class="label">ประเภทรถ</label>
        <div class="ride-type-grid">
          <button
            v-for="type in rideTypes"
            :key="type.value"
            @click="rideType = type.value"
            :class="['ride-type-option', { 'ride-type-option-active': rideType === type.value }]"
          >
            <svg v-if="type.icon === 'car'" class="ride-type-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
            </svg>
            <svg v-else-if="type.icon === 'car-premium'" class="ride-type-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            <svg v-else class="ride-type-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span class="ride-type-label">{{ type.label }}</span>
            <span class="ride-type-price">x{{ type.multiplier }}</span>
          </button>
        </div>
      </div>

      <!-- Passenger Count -->
      <div class="form-section">
        <label class="label">จำนวนผู้โดยสาร</label>
        <div class="passenger-selector">
          <button
            @click="passengerCount = Math.max(1, passengerCount - 1)"
            :disabled="passengerCount <= 1"
            class="passenger-btn"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
            </svg>
          </button>
          <span class="passenger-count">{{ passengerCount }}</span>
          <button
            @click="passengerCount = Math.min(4, passengerCount + 1)"
            :disabled="passengerCount >= 4"
            class="passenger-btn"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Calculate Button -->
      <button
        @click="calculateFare"
        :disabled="!canCalculate || isCalculating"
        class="btn-primary"
      >
        <span v-if="isCalculating" class="btn-loading">
          <svg class="spinner" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>กำลังคำนวณ</span>
        </span>
        <span v-else>คำนวณค่าโดยสาร</span>
      </button>

      <!-- Fare Result -->
      <div v-if="showFareResult" class="fare-result">
        <div class="fare-details">
          <div class="fare-row">
            <span class="fare-label">ระยะทาง</span>
            <span class="fare-value">{{ estimatedDistance.toFixed(1) }} กม.</span>
          </div>
          <div class="fare-row">
            <span class="fare-label">เวลาโดยประมาณ</span>
            <span class="fare-value">{{ estimatedTime }} นาที</span>
          </div>
          <div class="fare-row fare-row-total">
            <span class="fare-label">ค่าโดยสารประมาณ</span>
            <span class="fare-amount">฿{{ estimatedFare.toFixed(0) }}</span>
          </div>
        </div>
        <button @click="bookRide" :disabled="isBooking" class="btn-primary book-btn">
          <span v-if="isBooking" class="btn-loading">
            <svg class="spinner" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>กำลังจอง...</span>
          </span>
          <template v-else>
            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            จองรถเลย
          </template>
        </button>
      </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  padding: 24px 0 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.form-section {
  margin-bottom: 20px;
}

.location-inputs {
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.location-divider {
  height: 1px;
  background-color: var(--color-border);
  margin-left: 34px;
}

.ride-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.ride-type-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ride-type-option:hover {
  border-color: var(--color-text-muted);
}

.ride-type-option-active {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
  color: white;
}

.ride-type-icon {
  width: 28px;
  height: 28px;
  margin-bottom: 8px;
}

.ride-type-label {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.ride-type-price {
  font-size: 11px;
  opacity: 0.7;
}

.passenger-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 12px;
  background-color: var(--color-surface);
  border-radius: var(--radius-sm);
}

.passenger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.passenger-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  background-color: var(--color-secondary);
}

.passenger-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.passenger-btn svg {
  width: 20px;
  height: 20px;
}

.passenger-count {
  font-size: 24px;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.fare-result {
  margin-top: 24px;
  padding: 20px;
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
}

.fare-details {
  margin-bottom: 16px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.fare-row-total {
  border-top: 1px solid var(--color-border);
  margin-top: 8px;
  padding-top: 16px;
}

.fare-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.fare-value {
  font-size: 14px;
  font-weight: 500;
}

.fare-amount {
  font-size: 28px;
  font-weight: 700;
}

.book-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-icon {
  width: 20px;
  height: 20px;
}
</style>
