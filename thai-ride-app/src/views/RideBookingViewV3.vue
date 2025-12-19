<script setup lang="ts">
/**
 * Feature: Multi-Role Ride Booking System V3 - Customer View
 * Task 3.3: RideBookingViewV3.vue
 * 
 * MUNEEF Style: Clean, modern, green accent (#00A86B)
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRideBookingV3 } from '../composables/useRideBookingV3'
import { useAuthStore } from '../stores/auth'
import LocationPicker from '../components/LocationPicker.vue'
import MapView from '../components/MapView.vue'

const router = useRouter()
const authStore = useAuthStore()

const {
  currentRide,
  isLoading,
  error,
  createRide,
  subscribeToRideUpdates
} = useRideBookingV3()

// Form state
const pickup = ref<{ lat: number; lng: number; address: string } | null>(null)
const destination = ref<{ lat: number; lng: number; address: string } | null>(null)
const vehicleType = ref<'car' | 'motorcycle' | 'van'>('car')
const estimatedFare = ref(0)
const promoCode = ref('')

// UI state
const showPickupPicker = ref(false)
const showDestPicker = ref(false)
const step = ref<'pickup' | 'destination' | 'confirm'>('pickup')

// Vehicle types
const vehicleTypes = [
  { value: 'car', label: 'รถเก๋ง', icon: '🚗', multiplier: 1.0 },
  { value: 'motorcycle', label: 'มอเตอร์ไซค์', icon: '🏍️', multiplier: 0.7 },
  { value: 'van', label: 'รถตู้', icon: '🚐', multiplier: 1.5 }
] as const

const selectedVehicle = computed(() => 
  vehicleTypes.find(v => v.value === vehicleType.value) || vehicleTypes[0]
)

const canBook = computed(() => 
  pickup.value && destination.value && estimatedFare.value > 0
)

// Calculate fare
const calculateFare = () => {
  if (!pickup.value || !destination.value) return
  
  // Simple distance calculation
  const R = 6371 // Earth radius in km
  const dLat = (destination.value.lat - pickup.value.lat) * Math.PI / 180
  const dLon = (destination.value.lng - pickup.value.lng) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pickup.value.lat * Math.PI / 180) * Math.cos(destination.value.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  
  // Base fare + distance
  const baseFare = 35
  const perKm = 12
  estimatedFare.value = Math.round((baseFare + (distance * perKm)) * selectedVehicle.value.multiplier)
}

// Handlers
const handlePickupSelected = (location: any) => {
  pickup.value = location
  showPickupPicker.value = false
  step.value = 'destination'
}

const handleDestSelected = (location: any) => {
  destination.value = location
  showDestPicker.value = false
  calculateFare()
  step.value = 'confirm'
}

const handleBookRide = async () => {
  if (!canBook.value || !authStore.user?.id) return
  
  const ride = await createRide({
    pickup: pickup.value!,
    destination: destination.value!,
    vehicleType: vehicleType.value,
    estimatedFare: estimatedFare.value,
    promoCode: promoCode.value || undefined
  })
  
  if (ride) {
    router.push(`/customer/ride-tracking/${ride.rideId}`)
  }
}

onMounted(() => {
  if (!authStore.user) {
    router.push('/login')
  }
})
</script>

<template>
  <div class="ride-booking-page">
    <!-- Map -->
    <div class="map-section">
      <MapView
        :pickup="pickup"
        :destination="destination"
        :show-route="!!(pickup && destination)"
        height="45vh"
      />
      
      <div class="top-bar">
        <button class="back-btn" @click="router.back()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="title">เรียกรถ</span>
      </div>
    </div>

    <!-- Form -->
    <div class="form-section">
      <!-- Pickup -->
      <div class="location-input" @click="showPickupPicker = true">
        <div class="location-dot pickup"></div>
        <div class="location-text">
          <span class="label">จุดรับ</span>
          <span class="address">{{ pickup?.address || 'เลือกจุดรับ' }}</span>
        </div>
      </div>

      <!-- Destination -->
      <div class="location-input" @click="showDestPicker = true">
        <div class="location-dot destination"></div>
        <div class="location-text">
          <span class="label">จุดหมาย</span>
          <span class="address">{{ destination?.address || 'เลือกจุดหมาย' }}</span>
        </div>
      </div>

      <!-- Vehicle Type -->
      <div v-if="step === 'confirm'" class="vehicle-selector">
        <h3>เลือกประเภทรถ</h3>
        <div class="vehicle-options">
          <button
            v-for="v in vehicleTypes"
            :key="v.value"
            :class="['vehicle-option', { selected: vehicleType === v.value }]"
            @click="vehicleType = v.value; calculateFare()"
          >
            <span class="vehicle-icon">{{ v.icon }}</span>
            <span class="vehicle-label">{{ v.label }}</span>
            <span class="vehicle-price">฿{{ Math.round(estimatedFare * v.multiplier / selectedVehicle.multiplier) }}</span>
          </button>
        </div>
      </div>

      <!-- Promo Code -->
      <div v-if="step === 'confirm'" class="promo-section">
        <input
          v-model="promoCode"
          type="text"
          placeholder="รหัสโปรโมชั่น (ถ้ามี)"
          class="promo-input"
        />
      </div>

      <!-- Fare Display -->
      <div v-if="estimatedFare > 0" class="fare-display">
        <span>ค่าโดยสารโดยประมาณ</span>
        <span class="fare-amount">฿{{ estimatedFare.toLocaleString() }}</span>
      </div>

      <!-- Error -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Book Button -->
      <button
        v-if="step === 'confirm'"
        class="btn-book"
        :disabled="!canBook || isLoading"
        @click="handleBookRide"
      >
        <span v-if="isLoading">กำลังจอง...</span>
        <span v-else>ยืนยันเรียกรถ</span>
      </button>
    </div>

    <!-- Location Pickers -->
    <LocationPicker
      v-if="showPickupPicker"
      type="pickup"
      @confirm="handlePickupSelected"
      @close="showPickupPicker = false"
    />

    <LocationPicker
      v-if="showDestPicker"
      type="destination"
      @confirm="handleDestSelected"
      @close="showDestPicker = false"
    />
  </div>
</template>

<style scoped>
.ride-booking-page {
  min-height: 100vh;
  background: #F5F5F5;
}

.map-section {
  position: relative;
  height: 45vh;
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
  background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%);
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
  color: #1A1A1A;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.form-section {
  padding: 20px 16px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  margin-top: -20px;
  position: relative;
  z-index: 10;
}

.location-input {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #F8F8F8;
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.location-input:hover {
  background: #F0F0F0;
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

.location-dot.destination {
  background: #E53935;
}

.location-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
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

.vehicle-selector {
  margin-top: 24px;
}

.vehicle-selector h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.vehicle-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vehicle-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #F8F8F8;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.vehicle-option.selected {
  background: #E8F5EF;
  border-color: #00A86B;
}

.vehicle-icon {
  font-size: 24px;
}

.vehicle-label {
  flex: 1;
  font-weight: 500;
}

.vehicle-price {
  font-weight: 600;
  color: #00A86B;
}

.promo-section {
  margin-top: 16px;
}

.promo-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.promo-input:focus {
  border-color: #00A86B;
}

.fare-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #F8F8F8;
  border-radius: 12px;
  margin-top: 16px;
  font-weight: 500;
}

.fare-amount {
  font-size: 20px;
  font-weight: 700;
  color: #00A86B;
}

.error-message {
  padding: 12px 16px;
  background: #FFEBEE;
  color: #C62828;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 14px;
}

.btn-book {
  width: 100%;
  padding: 18px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-book:hover:not(:disabled) {
  background: #008F5B;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-book:disabled {
  background: #CCC;
  cursor: not-allowed;
}
</style>
