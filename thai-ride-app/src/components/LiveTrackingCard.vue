<script setup lang="ts">
/**
 * Feature: F169 - Live Tracking Card
 * Display live tracking info with ETA
 */

interface Props {
  status: 'arriving' | 'in_progress' | 'nearby'
  driverName: string
  driverPhoto?: string
  vehicleInfo: string
  licensePlate: string
  eta: string
  distance?: string
  rating?: number
}

defineProps<Props>()

const emit = defineEmits<{
  call: []
  chat: []
  share: []
  cancel: []
}>()

const statusConfig = {
  arriving: { label: 'กำลังมารับคุณ', color: '#276ef1' },
  in_progress: { label: 'กำลังเดินทาง', color: '#2e7d32' },
  nearby: { label: 'ใกล้ถึงแล้ว', color: '#ef6c00' }
}
</script>

<template>
  <div class="live-tracking-card">
    <div class="status-banner" :style="{ background: statusConfig[status].color }">
      <span class="status-text">{{ statusConfig[status].label }}</span>
      <span class="eta-text">{{ eta }}</span>
    </div>
    
    <div class="driver-section">
      <div class="driver-avatar">
        <img v-if="driverPhoto" :src="driverPhoto" :alt="driverName" />
        <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="driver-info">
        <h4 class="driver-name">{{ driverName }}</h4>
        <div class="driver-rating" v-if="rating">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {{ rating.toFixed(1) }}
        </div>
      </div>
      <div class="driver-actions">
        <button type="button" class="action-btn" @click="emit('call')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </button>
        <button type="button" class="action-btn" @click="emit('chat')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </button>
      </div>
    </div>
</template>

    <div class="vehicle-section">
      <div class="vehicle-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
      <div class="vehicle-info">
        <span class="vehicle-model">{{ vehicleInfo }}</span>
        <span class="license-plate">{{ licensePlate }}</span>
      </div>
      <span v-if="distance" class="distance-badge">{{ distance }}</span>
    </div>
    
    <div class="action-buttons">
      <button type="button" class="share-btn" @click="emit('share')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
        </svg>
        แชร์การเดินทาง
      </button>
      <button type="button" class="cancel-btn" @click="emit('cancel')">ยกเลิก</button>
    </div>
  </div>
</template>

<style scoped>
.live-tracking-card {
  background: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.status-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  color: #fff;
}

.status-text {
  font-size: 14px;
  font-weight: 600;
}

.eta-text {
  font-size: 16px;
  font-weight: 700;
}

.driver-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.driver-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #6b6b6b;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driver-info {
  flex: 1;
}

.driver-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b6b6b;
}

.driver-rating svg {
  color: #ffc107;
}

.driver-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  color: #000;
  cursor: pointer;
}

.action-btn:hover {
  background: #000;
  color: #fff;
}

.vehicle-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f6f6f6;
}

.vehicle-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 10px;
  color: #000;
}

.vehicle-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vehicle-model {
  font-size: 14px;
  color: #000;
}

.license-plate {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  letter-spacing: 1px;
}

.distance-badge {
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  background: #fff;
  border-radius: 16px;
  color: #6b6b6b;
}

.action-buttons {
  display: flex;
  gap: 12px;
  padding: 16px;
}

.share-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  color: #000;
  cursor: pointer;
}

.share-btn:hover {
  background: #e5e5e5;
}

.cancel-btn {
  padding: 12px 20px;
  background: none;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  font-size: 13px;
  color: #e11900;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #ffebee;
  border-color: #e11900;
}
</style>