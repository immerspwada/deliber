<!--
  Feature: F59 - Driver Info Card Component
  
  แสดงข้อมูลคนขับ
  - รูปภาพ/ชื่อ/คะแนน
  - ข้อมูลรถ
  - ปุ่มโทร/แชท
-->
<template>
  <div class="driver-card">
    <!-- Driver Info -->
    <div class="driver-main">
      <div class="driver-avatar">
        <img v-if="driver.avatar" :src="driver.avatar" :alt="driver.name" />
        <span v-else class="avatar-initial">{{ driver.name.charAt(0) }}</span>
      </div>
      <div class="driver-details">
        <div class="driver-name">{{ driver.name }}</div>
        <div class="driver-rating">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffc043">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>{{ driver.rating.toFixed(1) }}</span>
          <span class="trip-count">({{ driver.tripCount }} เที่ยว)</span>
        </div>
      </div>
    </div>

    <!-- Vehicle Info -->
    <div class="vehicle-info">
      <div class="vehicle-model">{{ driver.vehicleModel }}</div>
      <div class="license-plate">{{ driver.licensePlate }}</div>
      <div v-if="driver.vehicleColor" class="vehicle-color">
        <span class="color-dot" :style="{ background: getColorCode(driver.vehicleColor) }"></span>
        <span>{{ driver.vehicleColor }}</span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="showActions" class="action-buttons">
      <button class="action-btn" @click="$emit('call')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <span>โทร</span>
      </button>
      <button class="action-btn" @click="$emit('chat')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>แชท</span>
      </button>
      <button class="action-btn" @click="$emit('share')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        <span>แชร์</span>
      </button>
    </div>

    <!-- ETA Info -->
    <div v-if="eta" class="eta-info">
      <div class="eta-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      </div>
      <div class="eta-text">
        <span class="eta-label">{{ etaLabel }}</span>
        <span class="eta-value">{{ eta }} นาที</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Driver {
  name: string
  avatar?: string
  rating: number
  tripCount: number
  vehicleModel: string
  licensePlate: string
  vehicleColor?: string
}

interface Props {
  driver: Driver
  showActions?: boolean
  eta?: number
  etaLabel?: string
}

withDefaults(defineProps<Props>(), {
  showActions: true,
  etaLabel: 'ถึงจุดรับใน'
})

defineEmits<{
  (e: 'call'): void
  (e: 'chat'): void
  (e: 'share'): void
}>()

const getColorCode = (color: string): string => {
  const colors: Record<string, string> = {
    'ขาว': '#ffffff',
    'ดำ': '#000000',
    'เงิน': '#c0c0c0',
    'เทา': '#808080',
    'แดง': '#e11900',
    'น้ำเงิน': '#276ef1',
    'เขียว': '#22c55e',
    'เหลือง': '#ffc043',
    'ส้ม': '#f57c00',
    'ม่วง': '#9333ea',
    'ชมพู': '#ec4899',
    'น้ำตาล': '#92400e'
  }
  return colors[color] || '#6b6b6b'
}
</script>

<style scoped>
.driver-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.driver-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.driver-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initial {
  color: #ffffff;
  font-size: 24px;
  font-weight: 600;
}

.driver-details {
  flex: 1;
}

.driver-name {
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 14px;
  color: #000000;
}

.trip-count {
  color: #6b6b6b;
  font-size: 13px;
}

.vehicle-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
  margin-bottom: 12px;
}

.vehicle-model {
  font-size: 14px;
  font-weight: 500;
  color: #000000;
}

.license-plate {
  font-size: 16px;
  font-weight: 700;
  color: #000000;
  background: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e5e5e5;
}

.vehicle-color {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b6b6b;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #e5e5e5;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  color: #000000;
  cursor: pointer;
  transition: background 0.2s ease;
}

.action-btn:hover {
  background: #e5e5e5;
}

.eta-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #000000;
  border-radius: 8px;
  color: #ffffff;
}

.eta-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.eta-text {
  display: flex;
  flex-direction: column;
}

.eta-label {
  font-size: 12px;
  opacity: 0.8;
}

.eta-value {
  font-size: 18px;
  font-weight: 600;
}
</style>
