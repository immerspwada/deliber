<script setup lang="ts">
import { computed } from 'vue'
import MapView from '../MapView.vue'

interface Passenger {
  id: string
  name: string
  phone: string
  rating: number
  photo?: string
}

interface Location {
  lat: number
  lng: number
  address: string
}

interface ActiveRide {
  id: string
  tracking_id: string
  passenger: Passenger
  pickup: Location
  destination: Location
  fare: number
  status: 'matched' | 'arriving' | 'arrived' | 'picked_up' | 'in_progress' | 'completed'
  distance: number
  duration: number
  ride_type: string
}

const props = defineProps<{
  ride: ActiveRide
  currentLocation?: { lat: number; lng: number }
}>()

const emit = defineEmits<{
  'update-status': [status: ActiveRide['status']]
  'call': []
  'chat': []
  'cancel': []
  'navigate': []
}>()

const statusSteps = [
  { key: 'matched', label: 'รับงานแล้ว' },
  { key: 'arriving', label: 'กำลังไปรับ' },
  { key: 'arrived', label: 'ถึงจุดรับแล้ว' },
  { key: 'picked_up', label: 'รับผู้โดยสารแล้ว' },
  { key: 'in_progress', label: 'กำลังเดินทาง' },
  { key: 'completed', label: 'เสร็จสิ้น' }
]

const currentStepIndex = computed(() => 
  statusSteps.findIndex(s => s.key === props.ride.status)
)

const nextStatus = computed((): ActiveRide['status'] | null => {
  const nextIndex = currentStepIndex.value + 1
  const nextStep = statusSteps[nextIndex]
  if (nextStep) {
    return nextStep.key as ActiveRide['status']
  }
  return null
})

const nextButtonText = computed(() => {
  switch (props.ride.status) {
    case 'matched': return 'เริ่มไปรับผู้โดยสาร'
    case 'arriving': return 'ถึงจุดรับแล้ว'
    case 'arrived': return 'รับผู้โดยสารแล้ว'
    case 'picked_up': return 'เริ่มเดินทาง'
    case 'in_progress': return 'ถึงจุดหมายแล้ว'
    default: return 'ดำเนินการต่อ'
  }
})

const showPickupInfo = computed(() => 
  ['matched', 'arriving', 'arrived'].includes(props.ride.status)
)

const mapDestination = computed(() => {
  if (showPickupInfo.value) {
    return { lat: props.ride.pickup.lat, lng: props.ride.pickup.lng, address: props.ride.pickup.address }
  }
  return { lat: props.ride.destination.lat, lng: props.ride.destination.lng, address: props.ride.destination.address }
})

const handleNextStep = () => {
  if (nextStatus.value) {
    emit('update-status', nextStatus.value)
  }
}
</script>

<template>
  <div class="active-ride">
    <!-- Map -->
    <div class="ride-map">
      <MapView
        :pickup="currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng, address: 'ตำแหน่งของคุณ' } : null"
        :destination="mapDestination"
        :show-route="true"
        height="100%"
      />
      
      <!-- Navigate button -->
      <button @click="$emit('navigate')" class="navigate-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>
        <span>นำทาง</span>
      </button>
    </div>

    <!-- Bottom Panel -->
    <div class="ride-panel">
      <!-- Progress Steps -->
      <div class="progress-steps">
        <div 
          v-for="(step, index) in statusSteps.slice(0, 5)" 
          :key="step.key"
          :class="['step', { active: index <= currentStepIndex, current: index === currentStepIndex }]"
        >
          <div class="step-dot"></div>
          <span v-if="index === currentStepIndex" class="step-label">{{ step.label }}</span>
        </div>
      </div>

      <!-- Passenger Info -->
      <div class="passenger-card">
        <div class="passenger-info">
          <div class="passenger-avatar">
            <img v-if="ride.passenger.photo" :src="ride.passenger.photo" :alt="ride.passenger.name" />
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <div class="passenger-details">
            <span class="passenger-name">{{ ride.passenger.name }}</span>
            <div class="passenger-rating">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
              <span>{{ ride.passenger.rating }}</span>
            </div>
          </div>
        </div>
        <div class="contact-buttons">
          <button @click="$emit('call')" class="contact-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
          </button>
          <button @click="$emit('chat')" class="contact-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Location Info -->
      <div class="location-info">
        <div v-if="showPickupInfo" class="location-item pickup">
          <div class="location-dot"></div>
          <div class="location-text">
            <span class="location-label">จุดรับ</span>
            <span class="location-address">{{ ride.pickup.address }}</span>
          </div>
        </div>
        <div v-else class="location-item destination">
          <div class="location-dot"></div>
          <div class="location-text">
            <span class="location-label">จุดหมาย</span>
            <span class="location-address">{{ ride.destination.address }}</span>
          </div>
        </div>
      </div>

      <!-- Ride Info -->
      <div class="ride-info">
        <div class="info-item">
          <span class="info-label">ระยะทาง</span>
          <span class="info-value">{{ ride.distance }} กม.</span>
        </div>
        <div class="info-item">
          <span class="info-label">เวลา</span>
          <span class="info-value">{{ ride.duration }} นาที</span>
        </div>
        <div class="info-item fare">
          <span class="info-label">ค่าโดยสาร</span>
          <span class="info-value">฿{{ ride.fare }}</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          v-if="ride.status !== 'completed'"
          @click="handleNextStep" 
          class="btn-primary"
        >
          {{ nextButtonText }}
        </button>
        <button 
          v-if="['matched', 'arriving'].includes(ride.status)"
          @click="$emit('cancel')" 
          class="btn-cancel"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.active-ride {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F6F6F6;
}

.ride-map {
  flex: 1;
  position: relative;
  min-height: 40vh;
}

.navigate-btn {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #000;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 100;
}

.navigate-btn svg {
  width: 20px;
  height: 20px;
}

.ride-panel {
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 16px 20px;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 32px rgba(0,0,0,0.1);
}

/* Progress Steps */
.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 0 8px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
  position: relative;
}

.step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #E5E5E5;
}

.step.active:not(:last-child)::after {
  background: #000;
}

.step-dot {
  width: 14px;
  height: 14px;
  background: #E5E5E5;
  border-radius: 50%;
  z-index: 1;
  transition: all 0.3s ease;
}

.step.active .step-dot {
  background: #000;
}

.step.current .step-dot {
  box-shadow: 0 0 0 4px rgba(0,0,0,0.1);
}

.step-label {
  font-size: 11px;
  color: #000;
  font-weight: 500;
  white-space: nowrap;
}

/* Passenger Card */
.passenger-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #F6F6F6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.passenger-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.passenger-avatar {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.passenger-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.passenger-avatar svg {
  width: 28px;
  height: 28px;
  color: #666;
}

.passenger-details {
  display: flex;
  flex-direction: column;
}

.passenger-name {
  font-size: 16px;
  font-weight: 600;
}

.passenger-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
}

.passenger-rating svg {
  width: 14px;
  height: 14px;
  color: #F59E0B;
}

.contact-buttons {
  display: flex;
  gap: 8px;
}

.contact-btn {
  width: 44px;
  height: 44px;
  background: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.contact-btn:hover {
  background: #E5E5E5;
}

.contact-btn svg {
  width: 22px;
  height: 22px;
}

/* Location Info */
.location-info {
  margin-bottom: 16px;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #F6F6F6;
  border-radius: 10px;
}

.location-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
}

.location-item.pickup .location-dot {
  background: #276EF1;
}

.location-item.destination .location-dot {
  background: #000;
}

.location-text {
  display: flex;
  flex-direction: column;
}

.location-label {
  font-size: 12px;
  color: #666;
}

.location-address {
  font-size: 15px;
  font-weight: 500;
}

/* Ride Info */
.ride-info {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.info-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #F6F6F6;
  border-radius: 10px;
}

.info-item.fare {
  background: #000;
  color: white;
}

.info-label {
  font-size: 11px;
  color: #666;
}

.info-item.fare .info-label {
  color: rgba(255,255,255,0.7);
}

.info-value {
  font-size: 16px;
  font-weight: 700;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary {
  width: 100%;
  padding: 16px;
  background: #000;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel {
  width: 100%;
  padding: 14px;
  background: none;
  color: #E11900;
  border: none;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
</style>
