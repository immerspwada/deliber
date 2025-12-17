<script setup lang="ts">
/**
 * Feature: F296 - Driver Location
 * Driver location card with ETA
 */
defineProps<{
  driverName: string
  driverPhoto?: string
  vehiclePlate: string
  vehicleModel: string
  eta: number
  distance: number
  status: 'arriving' | 'waiting' | 'in_transit'
}>()

const emit = defineEmits<{
  'call': []
  'message': []
}>()

const statusLabels = {
  arriving: 'กำลังมารับคุณ',
  waiting: 'รอคุณอยู่',
  in_transit: 'กำลังเดินทาง'
}
</script>

<template>
  <div class="driver-location">
    <div class="status-bar" :class="status">
      <span class="status-text">{{ statusLabels[status] }}</span>
      <span class="eta">{{ eta }} นาที</span>
    </div>
    
    <div class="driver-info">
      <div class="avatar">
        <img v-if="driverPhoto" :src="driverPhoto" :alt="driverName" />
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      
      <div class="details">
        <span class="name">{{ driverName }}</span>
        <span class="vehicle">{{ vehicleModel }} • {{ vehiclePlate }}</span>
      </div>
      
      <div class="actions">
        <button type="button" class="action-btn" @click="emit('message')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </button>
        <button type="button" class="action-btn" @click="emit('call')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="distance-info">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span>ห่างจากคุณ {{ (distance / 1000).toFixed(1) }} กม.</span>
    </div>
  </div>
</template>

<style scoped>
.driver-location {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  overflow: hidden;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
}

.status-bar.arriving {
  background: #276ef1;
  color: #fff;
}

.status-bar.waiting {
  background: #f5a623;
  color: #fff;
}

.status-bar.in_transit {
  background: #000;
  color: #fff;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.avatar {
  width: 48px;
  height: 48px;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 16px;
  font-weight: 600;
}

.vehicle {
  font-size: 13px;
  color: #6b6b6b;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 40px;
  height: 40px;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.distance-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: #f6f6f6;
  font-size: 13px;
  color: #6b6b6b;
}
</style>
