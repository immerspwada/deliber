<script setup lang="ts">
/**
 * Feature: F177 - Driver Arrival Card
 * Display driver arrival notification
 */

interface Props {
  driverName: string
  vehicleInfo: string
  licensePlate: string
  arrivalTime: string
  driverPhoto?: string
  otp?: string
}

defineProps<Props>()

const emit = defineEmits<{
  call: []
  chat: []
}>()
</script>

<template>
  <div class="driver-arrival-card">
    <div class="arrival-header">
      <div class="arrival-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
      <div class="arrival-text">
        <span class="arrival-title">คนขับมาถึงแล้ว!</span>
        <span class="arrival-time">{{ arrivalTime }}</span>
      </div>
    </div>
    
    <div class="driver-section">
      <div class="driver-avatar">
        <img v-if="driverPhoto" :src="driverPhoto" :alt="driverName" />
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="driver-info">
        <span class="driver-name">{{ driverName }}</span>
        <span class="vehicle-info">{{ vehicleInfo }}</span>
      </div>
      <div class="license-plate">{{ licensePlate }}</div>
    </div>
  </div>
</template>

    <div v-if="otp" class="otp-section">
      <span class="otp-label">รหัส OTP</span>
      <span class="otp-code">{{ otp }}</span>
    </div>
    
    <div class="action-buttons">
      <button type="button" class="action-btn" @click="emit('call')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
        โทร
      </button>
      <button type="button" class="action-btn" @click="emit('chat')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        แชท
      </button>
    </div>
  </div>
</template>

<style scoped>
.driver-arrival-card {
  background: #fff;
  border-radius: 12px;
  border: 2px solid #276ef1;
  padding: 16px;
}

.arrival-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.arrival-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #276ef1;
  border-radius: 50%;
  color: #fff;
}

.arrival-text {
  flex: 1;
}

.arrival-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #276ef1;
}

.arrival-time {
  font-size: 12px;
  color: #6b6b6b;
}

.driver-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 48px;
  height: 48px;
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
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.driver-name {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.vehicle-info {
  font-size: 12px;
  color: #6b6b6b;
}

.license-plate {
  font-size: 16px;
  font-weight: 700;
  color: #000;
  padding: 6px 12px;
  background: #f6f6f6;
  border-radius: 8px;
  letter-spacing: 1px;
}

.otp-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 10px;
  margin-bottom: 16px;
}

.otp-label {
  font-size: 13px;
  color: #6b6b6b;
}

.otp-code {
  font-size: 24px;
  font-weight: 700;
  color: #000;
  letter-spacing: 4px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
}

.action-btn:hover {
  background: #000;
  color: #fff;
}
</style>