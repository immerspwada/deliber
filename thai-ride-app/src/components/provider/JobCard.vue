<script setup lang="ts">
/**
 * JobCard Component - Production Ready
 * Displays job details with accessibility and touch-friendly design
 * 
 * Role Impact:
 * - Provider: View and accept available jobs
 * - Customer: No access
 * - Admin: View only (monitoring)
 */

import { computed } from 'vue'
import type { Job } from '../../types/provider'

interface Props {
  job: Job
  loading?: boolean
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true
})

const emit = defineEmits<{
  accept: [jobId: string]
  view: [jobId: string]
  navigate: [location: { lat: number; lng: number; address: string }]
}>()

// Computed
const serviceIcon = computed(() => {
  const icons: Record<string, string> = {
    ride: '🚗',
    delivery: '📦',
    shopping: '🛒',
    moving: '📦',
    laundry: '👕'
  }
  return icons[props.job.service_type] || '🚗'
})

const serviceName = computed(() => {
  const names: Record<string, string> = {
    ride: 'รับส่ง',
    delivery: 'ส่งของ',
    shopping: 'ช้อปปิ้ง',
    moving: 'ขนของ',
    laundry: 'ซักรีด'
  }
  return names[props.job.service_type] || 'บริการ'
})

const estimatedTime = computed(() => {
  if (!props.job.estimated_duration) return 'ไม่ระบุ'
  const minutes = Math.round(props.job.estimated_duration)
  return `${minutes} นาที`
})

const estimatedDistance = computed(() => {
  if (!props.job.estimated_distance) return 'ไม่ระบุ'
  const km = props.job.estimated_distance.toFixed(1)
  return `${km} กม.`
})

const estimatedEarnings = computed(() => {
  if (!props.job.estimated_earnings) return '฿0'
  return `฿${props.job.estimated_earnings.toLocaleString()}`
})

const timeAgo = computed(() => {
  if (!props.job.created_at) return ''
  const now = Date.now()
  const created = new Date(props.job.created_at).getTime()
  const diff = Math.floor((now - created) / 1000) // seconds
  
  if (diff < 60) return 'เมื่อสักครู่'
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`
  return `${Math.floor(diff / 86400)} วันที่แล้ว`
})

const isScheduled = computed(() => {
  return props.job.scheduled_at && new Date(props.job.scheduled_at) > new Date()
})

const scheduledTime = computed(() => {
  if (!props.job.scheduled_at) return ''
  return new Date(props.job.scheduled_at).toLocaleString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Methods
function handleAccept(): void {
  if (!props.loading) {
    emit('accept', props.job.id)
  }
}

function handleView(): void {
  emit('view', props.job.id)
}

function handleNavigate(): void {
  if (props.job.pickup_location) {
    emit('navigate', {
      lat: props.job.pickup_location.lat,
      lng: props.job.pickup_location.lng,
      address: props.job.pickup_address || 'จุดรับ'
    })
  }
}
</script>

<template>
  <article 
    class="job-card"
    :class="{ scheduled: isScheduled }"
    role="article"
    :aria-label="`งาน${serviceName} ${estimatedEarnings}`"
  >
    <!-- Header -->
    <header class="job-header">
      <div class="service-badge">
        <span class="service-icon" aria-hidden="true">{{ serviceIcon }}</span>
        <span class="service-name">{{ serviceName }}</span>
      </div>
      
      <div class="earnings">
        <span class="earnings-amount">{{ estimatedEarnings }}</span>
      </div>
    </header>

    <!-- Scheduled Badge -->
    <div v-if="isScheduled" class="scheduled-badge">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      <span>จองล่วงหน้า: {{ scheduledTime }}</span>
    </div>

    <!-- Locations -->
    <div class="locations">
      <!-- Pickup -->
      <div class="location-item pickup">
        <div class="location-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <div class="location-text">
          <span class="location-label">จุดรับ</span>
          <span class="location-address">{{ job.pickup_address || 'ไม่ระบุ' }}</span>
        </div>
      </div>

      <!-- Divider -->
      <div class="location-divider" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>

      <!-- Dropoff -->
      <div class="location-item dropoff">
        <div class="location-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="location-text">
          <span class="location-label">จุดส่ง</span>
          <span class="location-address">{{ job.dropoff_address || 'ไม่ระบุ' }}</span>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="job-stats">
      <div class="stat">
        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
        </svg>
        <span>{{ estimatedDistance }}</span>
      </div>
      
      <div class="stat">
        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>{{ estimatedTime }}</span>
      </div>
      
      <div class="stat time-ago">
        <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <span>{{ timeAgo }}</span>
      </div>
    </div>

    <!-- Actions -->
    <footer v-if="showActions" class="job-actions">
      <button
        type="button"
        class="btn btn-navigate"
        @click="handleNavigate"
        :disabled="loading || !job.pickup_location"
        aria-label="นำทางไปจุดรับ"
        title="เปิดแผนที่นำทาง"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 11l19-9-9 19-2-8-8-2z"/>
        </svg>
        <span>นำทาง</span>
      </button>
      
      <button
        type="button"
        class="btn btn-secondary"
        @click="handleView"
        :disabled="loading"
        aria-label="ดูรายละเอียดงาน"
      >
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <span>ดูรายละเอียด</span>
      </button>
      
      <button
        type="button"
        class="btn btn-primary"
        @click="handleAccept"
        :disabled="loading"
        :aria-busy="loading"
        aria-label="รับงาน"
      >
        <svg v-if="loading" class="btn-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        <svg v-else class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 13l4 4L19 7"/>
        </svg>
        <span>{{ loading ? 'กำลังรับงาน...' : 'รับงาน' }}</span>
      </button>
    </footer>
  </article>
</template>

<style scoped>
/* Card */
.job-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s;
  border: 2px solid transparent;
}

.job-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.job-card.scheduled {
  border-color: #f59e0b;
  background: linear-gradient(to bottom, #fffbeb 0%, white 100%);
}

/* Header */
.job-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.service-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f1f5f9;
  border-radius: 20px;
}

.service-icon {
  font-size: 18px;
}

.service-name {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.earnings {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.earnings-amount {
  font-size: 24px;
  font-weight: 700;
  color: #16a34a;
  line-height: 1;
}

/* Scheduled Badge */
.scheduled-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #92400e;
}

.scheduled-badge .icon {
  width: 16px;
  height: 16px;
  color: #d97706;
}

/* Locations */
.locations {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.location-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.location-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.location-icon svg {
  width: 20px;
  height: 20px;
}

.location-item.pickup .location-icon {
  color: #16a34a;
}

.location-item.dropoff .location-icon {
  color: #ef4444;
}

.location-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.location-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.location-address {
  font-size: 14px;
  color: #1e293b;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.location-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  margin: 4px 0;
}

.location-divider svg {
  width: 20px;
  height: 20px;
  color: #cbd5e1;
}

/* Stats */
.job-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 12px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.stat-icon {
  width: 16px;
  height: 16px;
  color: #64748b;
}

.stat.time-ago {
  margin-left: auto;
  color: #94a3b8;
}

/* Actions */
.job-actions {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 8px;
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

.btn-primary {
  background: #16a34a;
  color: white;
}

.btn-primary:not(:disabled):hover {
  background: #15803d;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:not(:disabled):hover {
  background: #e2e8f0;
}

.btn-navigate {
  background: #3b82f6;
  color: white;
  padding: 12px;
}

.btn-navigate:not(:disabled):hover {
  background: #2563eb;
}

.btn-navigate span {
  display: none;
}

@media (min-width: 400px) {
  .btn-navigate {
    padding: 12px 16px;
  }
  
  .btn-navigate span {
    display: inline;
  }
}

/* Animations */
.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 360px) {
  .job-actions {
    grid-template-columns: 1fr;
  }
  
  .earnings-amount {
    font-size: 20px;
  }
}
</style>
