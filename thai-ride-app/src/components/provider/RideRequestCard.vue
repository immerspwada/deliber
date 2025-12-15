<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface RideRequest {
  id: string
  tracking_id?: string
  pickup_address: string
  destination_address: string
  ride_type: string
  estimated_fare: number
  distance?: number
  duration?: number
  passenger_name?: string
  passenger_rating?: number
  created_at: string
}

const props = defineProps<{
  request: RideRequest
  autoDeclineSeconds?: number
}>()

const emit = defineEmits<{
  'accept': []
  'decline': []
}>()

const countdown = ref(props.autoDeclineSeconds || 30)
let countdownInterval: number | null = null

onMounted(() => {
  if (props.autoDeclineSeconds) {
    countdownInterval = window.setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        emit('decline')
      }
    }, 1000)
  }
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})

const rideTypeLabel = (type: string) => {
  switch (type) {
    case 'premium': return 'Premium'
    case 'shared': return 'Shared'
    default: return 'Standard'
  }
}
</script>

<template>
  <div class="request-card">
    <!-- Countdown -->
    <div v-if="autoDeclineSeconds" class="countdown-bar">
      <div 
        class="countdown-fill" 
        :style="{ width: `${(countdown / autoDeclineSeconds) * 100}%` }"
      ></div>
    </div>

    <!-- Header -->
    <div class="request-header">
      <div class="request-type">
        <span class="type-badge" :class="request.ride_type">
          {{ rideTypeLabel(request.ride_type) }}
        </span>
        <span v-if="autoDeclineSeconds" class="countdown-text">{{ countdown }}s</span>
      </div>
      <div class="request-fare">฿{{ request.estimated_fare }}</div>
    </div>

    <!-- Passenger Info -->
    <div v-if="request.passenger_name" class="passenger-row">
      <div class="passenger-avatar">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
      <span class="passenger-name">{{ request.passenger_name }}</span>
      <div v-if="request.passenger_rating" class="passenger-rating">
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
        <span>{{ request.passenger_rating }}</span>
      </div>
    </div>

    <!-- Route -->
    <div class="route-info">
      <div class="route-point">
        <div class="route-dot pickup"></div>
        <span>{{ request.pickup_address }}</span>
      </div>
      <div class="route-line"></div>
      <div class="route-point">
        <div class="route-dot destination"></div>
        <span>{{ request.destination_address }}</span>
      </div>
    </div>

    <!-- Meta -->
    <div class="request-meta">
      <span v-if="request.distance" class="meta-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
        </svg>
        {{ request.distance }} กม.
      </span>
      <span v-if="request.duration" class="meta-item">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        {{ request.duration }} นาที
      </span>
    </div>

    <!-- Actions -->
    <div class="request-actions">
      <button @click="$emit('decline')" class="btn-decline">
        ปฏิเสธ
      </button>
      <button @click="$emit('accept')" class="btn-accept">
        รับงาน
      </button>
    </div>
  </div>
</template>

<style scoped>
.request-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

/* Countdown */
.countdown-bar {
  height: 4px;
  background: #E5E5E5;
}

.countdown-fill {
  height: 100%;
  background: #000;
  transition: width 1s linear;
}

/* Header */
.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
}

.request-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-badge {
  padding: 4px 10px;
  background: #F6F6F6;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.type-badge.premium {
  background: #000;
  color: white;
}

.countdown-text {
  font-size: 13px;
  color: #E11900;
  font-weight: 600;
}

.request-fare {
  font-size: 24px;
  font-weight: 700;
  color: #276EF1;
}

/* Passenger */
.passenger-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px 12px;
}

.passenger-avatar {
  width: 32px;
  height: 32px;
  background: #F6F6F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.passenger-avatar svg {
  width: 18px;
  height: 18px;
  color: #666;
}

.passenger-name {
  font-size: 14px;
  font-weight: 500;
}

.passenger-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  font-size: 13px;
  color: #666;
}

.passenger-rating svg {
  width: 14px;
  height: 14px;
  color: #F59E0B;
}

/* Route */
.route-info {
  padding: 0 16px 12px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.route-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.route-dot.pickup {
  background: #276EF1;
}

.route-dot.destination {
  background: #000;
}

.route-line {
  width: 2px;
  height: 16px;
  background: #E5E5E5;
  margin-left: 4px;
}

/* Meta */
.request-meta {
  display: flex;
  gap: 16px;
  padding: 0 16px 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
}

.meta-item svg {
  width: 16px;
  height: 16px;
}

/* Actions */
.request-actions {
  display: flex;
  border-top: 1px solid #E5E5E5;
}

.btn-decline,
.btn-accept {
  flex: 1;
  padding: 16px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-decline {
  background: white;
  color: #666;
}

.btn-decline:hover {
  background: #F6F6F6;
}

.btn-accept {
  background: #000;
  color: white;
}

.btn-accept:hover {
  opacity: 0.9;
}
</style>
