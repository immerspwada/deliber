<script setup lang="ts">
/**
 * LocationTracker Component - Production Ready
 * GPS tracking status and controls
 * 
 * Role Impact:
 * - Provider: Control location tracking
 * - Customer: No access
 * - Admin: View only
 */

import { computed } from 'vue'
import { useProviderLocation } from '../../composables/useProviderLocation'

interface Props {
  autoStart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoStart: false
})

const {
  currentLocation,
  isTracking,
  error,
  accuracy,
  isAccurate,
  startTracking,
  stopTracking,
  getCurrentPosition
} = useProviderLocation()

// Computed
const statusText = computed(() => {
  if (error.value) return 'เกิดข้อผิดพลาด'
  if (!isTracking.value) return 'ปิดการติดตาม'
  if (!currentLocation.value) return 'กำลังค้นหาตำแหน่ง...'
  return 'กำลังติดตาม'
})

const statusClass = computed(() => {
  if (error.value) return 'error'
  if (!isTracking.value) return 'inactive'
  if (!currentLocation.value) return 'searching'
  return 'active'
})

const accuracyText = computed(() => {
  if (!currentLocation.value) return 'ไม่ทราบ'
  const acc = Math.round(accuracy.value)
  return `±${acc}m`
})

const accuracyClass = computed(() => {
  if (!currentLocation.value) return 'unknown'
  if (isAccurate.value) return 'good'
  if (accuracy.value < 100) return 'fair'
  return 'poor'
})

const lastUpdateText = computed(() => {
  if (!currentLocation.value) return 'ไม่เคยอัพเดท'
  const now = Date.now()
  const diff = Math.floor((now - currentLocation.value.timestamp) / 1000)
  
  if (diff < 10) return 'เมื่อสักครู่'
  if (diff < 60) return `${diff} วินาทีที่แล้ว`
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`
  return 'นานมาแล้ว'
})

// Methods
async function handleToggle(): Promise<void> {
  if (isTracking.value) {
    stopTracking()
  } else {
    await startTracking()
  }
}

async function handleRefresh(): Promise<void> {
  await getCurrentPosition()
}

// Auto-start if enabled
if (props.autoStart) {
  startTracking()
}
</script>

<template>
  <div class="location-tracker">
    <!-- Status Header -->
    <div class="tracker-header">
      <div class="status-indicator" :class="statusClass">
        <div v-if="isTracking && !error" class="status-pulse"></div>
        <svg v-if="error" class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        <svg v-else-if="!isTracking" class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <svg v-else class="status-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      
      <div class="status-text">
        <h3 class="status-title">{{ statusText }}</h3>
        <p v-if="error" class="status-error">{{ error }}</p>
        <p v-else-if="currentLocation" class="status-detail">
          อัพเดทล่าสุด: {{ lastUpdateText }}
        </p>
      </div>
    </div>

    <!-- Location Details -->
    <div v-if="currentLocation && !error" class="location-details">
      <div class="detail-item">
        <span class="detail-label">ความแม่นยำ</span>
        <span class="detail-value" :class="accuracyClass">
          {{ accuracyText }}
        </span>
      </div>
      
      <div v-if="currentLocation.speed !== null" class="detail-item">
        <span class="detail-label">ความเร็ว</span>
        <span class="detail-value">
          {{ Math.round((currentLocation.speed || 0) * 3.6) }} km/h
        </span>
      </div>
      
      <div class="detail-item">
        <span class="detail-label">พิกัด</span>
        <span class="detail-value coords">
          {{ currentLocation.latitude.toFixed(6) }}, {{ currentLocation.longitude.toFixed(6) }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="tracker-actions">
      <button
        type="button"
        class="btn btn-toggle"
        :class="{ active: isTracking }"
        :aria-label="isTracking ? 'หยุดติดตาม' : 'เริ่มติดตาม'"
        @click="handleToggle"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path v-if="isTracking" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <path v-else d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
          <circle v-if="!isTracking" cx="12" cy="12" r="10"/>
        </svg>
        <span>{{ isTracking ? 'หยุดติดตาม' : 'เริ่มติดตาม' }}</span>
      </button>
      
      <button
        type="button"
        class="btn btn-refresh"
        :disabled="!isTracking"
        aria-label="รีเฟรชตำแหน่ง"
        @click="handleRefresh"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2"/>
        </svg>
        <span>รีเฟรช</span>
      </button>
    </div>

    <!-- Battery Warning -->
    <div v-if="isTracking" class="battery-warning">
      <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/>
        <path d="M23 13v-2"/>
      </svg>
      <span>การติดตามตำแหน่งจะใช้แบตเตอรี่เพิ่มขึ้น</span>
    </div>
  </div>
</template>

<style scoped>
/* Container */
.location-tracker {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Header */
.tracker-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.status-indicator {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-indicator.inactive {
  background: #f1f5f9;
}

.status-indicator.searching {
  background: #fef3c7;
}

.status-indicator.active {
  background: #dcfce7;
}

.status-indicator.error {
  background: #fee2e2;
}

.status-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 16px;
  background: #16a34a;
  opacity: 0.3;
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.1;
  }
}

.status-icon {
  width: 28px;
  height: 28px;
  z-index: 1;
}

.status-indicator.inactive .status-icon {
  color: #64748b;
}

.status-indicator.searching .status-icon {
  color: #d97706;
}

.status-indicator.active .status-icon {
  color: #16a34a;
}

.status-indicator.error .status-icon {
  color: #dc2626;
}

.status-text {
  flex: 1;
  min-width: 0;
}

.status-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.status-detail {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.status-error {
  font-size: 13px;
  color: #dc2626;
  margin: 0;
}

/* Location Details */
.location-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: #f8fafc;
  border-radius: 12px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-label {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.detail-value.good {
  color: #16a34a;
}

.detail-value.fair {
  color: #d97706;
}

.detail-value.poor {
  color: #dc2626;
}

.detail-value.unknown {
  color: #94a3b8;
}

.detail-value.coords {
  font-size: 12px;
  font-family: 'Courier New', monospace;
  color: #64748b;
}

/* Actions */
.tracker-actions {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:not(:disabled):active {
  transform: scale(0.98);
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.btn-toggle {
  background: #f1f5f9;
  color: #475569;
}

.btn-toggle.active {
  background: #16a34a;
  color: white;
}

.btn-toggle:not(:disabled):hover {
  background: #e2e8f0;
}

.btn-toggle.active:not(:disabled):hover {
  background: #15803d;
}

.btn-refresh {
  background: #f1f5f9;
  color: #475569;
}

.btn-refresh:not(:disabled):hover {
  background: #e2e8f0;
}

/* Battery Warning */
.battery-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  font-size: 12px;
  color: #92400e;
}

.warning-icon {
  width: 16px;
  height: 16px;
  color: #d97706;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 360px) {
  .tracker-actions {
    grid-template-columns: 1fr;
  }
}
</style>
