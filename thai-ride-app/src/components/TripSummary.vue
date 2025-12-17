<!--
  Feature: F50 - Trip Summary Component
  
  แสดงสรุปการเดินทาง
  - ข้อมูลจุดรับ-ส่ง
  - ข้อมูลคนขับ
  - ค่าโดยสาร
  - ระยะเวลา
-->
<template>
  <div class="trip-summary">
    <!-- Trip Status -->
    <div class="trip-status" :class="statusClass">
      <div class="status-icon">
        <svg v-if="status === 'completed'" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <svg v-else-if="status === 'cancelled'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      </div>
      <div class="status-text">{{ statusText }}</div>
    </div>

    <!-- Route Info -->
    <div class="route-section">
      <div class="route-line">
        <div class="route-dot pickup"></div>
        <div class="route-connector"></div>
        <div class="route-dot destination"></div>
      </div>
      <div class="route-details">
        <div class="route-point">
          <div class="point-label">จุดรับ</div>
          <div class="point-address">{{ pickupAddress }}</div>
          <div class="point-time" v-if="pickupTime">{{ formatTime(pickupTime) }}</div>
        </div>
        <div class="route-point">
          <div class="point-label">จุดหมาย</div>
          <div class="point-address">{{ destinationAddress }}</div>
          <div class="point-time" v-if="dropoffTime">{{ formatTime(dropoffTime) }}</div>
        </div>
      </div>
    </div>

    <!-- Driver Info -->
    <div v-if="driver" class="driver-section">
      <div class="driver-avatar">
        <img v-if="driver.avatar" :src="driver.avatar" :alt="driver.name" />
        <div v-else class="avatar-placeholder">
          {{ driver.name.charAt(0) }}
        </div>
      </div>
      <div class="driver-info">
        <div class="driver-name">{{ driver.name }}</div>
        <div class="driver-vehicle">{{ driver.vehicleModel }} • {{ driver.licensePlate }}</div>
        <div class="driver-rating" v-if="driver.rating">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffc043">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>{{ driver.rating.toFixed(1) }}</span>
        </div>
      </div>
    </div>

    <!-- Trip Stats -->
    <div class="trip-stats">
      <div class="stat-item">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="stat-value">{{ distance }} กม.</div>
        <div class="stat-label">ระยะทาง</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
        </div>
        <div class="stat-value">{{ duration }} นาที</div>
        <div class="stat-label">ระยะเวลา</div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M12 12h.01"/>
            <path d="M17 12h.01"/>
            <path d="M7 12h.01"/>
          </svg>
        </div>
        <div class="stat-value">{{ paymentMethod }}</div>
        <div class="stat-label">ชำระเงิน</div>
      </div>
    </div>

    <!-- Fare Breakdown -->
    <div class="fare-section">
      <div class="fare-header">
        <span>รายละเอียดค่าโดยสาร</span>
      </div>
      <div class="fare-rows">
        <div class="fare-row">
          <span>ค่าโดยสารพื้นฐาน</span>
          <span>฿{{ fare.baseFare }}</span>
        </div>
        <div class="fare-row">
          <span>ค่าระยะทาง</span>
          <span>฿{{ fare.distanceFare }}</span>
        </div>
        <div class="fare-row">
          <span>ค่าเวลา</span>
          <span>฿{{ fare.timeFare }}</span>
        </div>
        <div v-if="fare.surgeFare > 0" class="fare-row surge">
          <span>ค่าช่วงเวลาเร่งด่วน</span>
          <span>+฿{{ fare.surgeFare }}</span>
        </div>
        <div v-if="fare.discount > 0" class="fare-row discount">
          <span>ส่วนลด</span>
          <span>-฿{{ fare.discount }}</span>
        </div>
        <div class="fare-row total">
          <span>รวมทั้งหมด</span>
          <span>฿{{ fare.total }}</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions-section" v-if="showActions">
      <button class="action-btn secondary" @click="$emit('viewReceipt')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <span>ดูใบเสร็จ</span>
      </button>
      <button class="action-btn secondary" @click="$emit('reportIssue')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>แจ้งปัญหา</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Driver {
  name: string
  avatar?: string
  vehicleModel: string
  licensePlate: string
  rating?: number
}

interface Fare {
  baseFare: number
  distanceFare: number
  timeFare: number
  surgeFare: number
  discount: number
  total: number
}

interface Props {
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled'
  pickupAddress: string
  destinationAddress: string
  pickupTime?: Date | string
  dropoffTime?: Date | string
  driver?: Driver
  distance: number
  duration: number
  paymentMethod: string
  fare: Fare
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true
})

defineEmits<{
  (e: 'viewReceipt'): void
  (e: 'reportIssue'): void
}>()

const statusClass = computed(() => {
  switch (props.status) {
    case 'completed': return 'success'
    case 'cancelled': return 'error'
    case 'in_progress': return 'active'
    default: return 'pending'
  }
})

const statusText = computed(() => {
  switch (props.status) {
    case 'pending': return 'รอคนขับรับงาน'
    case 'matched': return 'คนขับกำลังมารับ'
    case 'in_progress': return 'กำลังเดินทาง'
    case 'completed': return 'เดินทางเสร็จสิ้น'
    case 'cancelled': return 'ยกเลิกแล้ว'
    default: return ''
  }
})

const formatTime = (time: Date | string): string => {
  const date = typeof time === 'string' ? new Date(time) : time
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.trip-summary {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
}

/* Status */
.trip-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f6f6f6;
}

.trip-status.success {
  background: #dcfce7;
}

.trip-status.success .status-icon {
  color: #22c55e;
}

.trip-status.error {
  background: #fee2e2;
}

.trip-status.error .status-icon {
  color: #e11900;
}

.trip-status.active {
  background: #dbeafe;
}

.trip-status.active .status-icon {
  color: #276ef1;
}

.status-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 50%;
}

.status-text {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
}

/* Route */
.route-section {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.route-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 4px;
}

.route-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.route-dot.pickup {
  background: #22c55e;
}

.route-dot.destination {
  background: #e11900;
}

.route-connector {
  width: 2px;
  flex: 1;
  min-height: 40px;
  background: #e5e5e5;
  margin: 4px 0;
}

.route-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.route-point {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.point-label {
  font-size: 12px;
  color: #6b6b6b;
}

.point-address {
  font-size: 14px;
  color: #000000;
  font-weight: 500;
}

.point-time {
  font-size: 12px;
  color: #6b6b6b;
}

/* Driver */
.driver-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.driver-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
  color: #ffffff;
  font-size: 20px;
  font-weight: 600;
}

.driver-info {
  flex: 1;
}

.driver-name {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
}

.driver-vehicle {
  font-size: 13px;
  color: #6b6b6b;
  margin-top: 2px;
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 13px;
  color: #000000;
}

/* Stats */
.trip-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.stat-icon {
  color: #6b6b6b;
}

.stat-value {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
}

.stat-label {
  font-size: 12px;
  color: #6b6b6b;
}

/* Fare */
.fare-section {
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.fare-header {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 12px;
}

.fare-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fare-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #6b6b6b;
}

.fare-row.surge {
  color: #f57c00;
}

.fare-row.discount {
  color: #22c55e;
}

.fare-row.total {
  padding-top: 8px;
  border-top: 1px solid #e5e5e5;
  font-weight: 600;
  color: #000000;
}

/* Actions */
.actions-section {
  display: flex;
  gap: 12px;
  padding: 16px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.action-btn.secondary {
  background: #f6f6f6;
  border: none;
  color: #000000;
}

.action-btn.secondary:hover {
  background: #e5e5e5;
}
</style>
