<script setup lang="ts">
/**
 * Feature: F174 - Job Notification Toast
 * Toast แจ้งเตือนงานใหม่สำหรับ Provider
 * 
 * Tables: -
 * Composables: useCrossRoleEvents, useProviderJobPool
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCrossRoleEvents, type CrossRoleEvent, type RequestCreatedPayload } from '@/lib/crossRoleEventBus'
import { useProviderJobPool, type JobRequest } from '@/composables/useProviderJobPool'

interface ToastItem {
  id: string
  job: JobRequest | RequestCreatedPayload
  timestamp: Date
  isVisible: boolean
}

interface Props {
  maxToasts?: number
  autoHideDuration?: number
  position?: 'top' | 'bottom'
  soundEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxToasts: 3,
  autoHideDuration: 8000,
  position: 'top',
  soundEnabled: true
})

const emit = defineEmits<{
  accept: [job: JobRequest | RequestCreatedPayload]
  dismiss: [id: string]
  viewDetails: [job: JobRequest | RequestCreatedPayload]
}>()
</script>

<template>
  <Teleport to="body">
    <div :class="['toast-container', position]">
      <TransitionGroup name="toast">
        <div
          v-for="toast in visibleToasts"
          :key="toast.id"
          class="toast-item"
        >
          <!-- Toast Header -->
          <div class="toast-header">
            <div class="toast-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <span class="toast-title">งานใหม่!</span>
            <button type="button" class="close-btn" @click="dismissToast(toast.id)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <!-- Toast Content -->
          <div class="toast-content">
            <div class="job-info">
              <div class="info-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="10" r="3"/>
                  <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/>
                </svg>
                <span class="info-text">{{ getPickupAddress(toast.job) }}</span>
              </div>
              <div class="info-row fare">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v12M9 9h6M9 15h6"/>
                </svg>
                <span class="fare-amount">฿{{ getEstimatedFare(toast.job).toLocaleString() }}</span>
              </div>
              <div v-if="getDistance(toast.job)" class="info-row distance">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{{ getDistance(toast.job).toFixed(1) }} กม.</span>
              </div>
            </div>
          </div>

          <!-- Toast Actions -->
          <div class="toast-actions">
            <button type="button" class="action-btn secondary" @click="handleViewDetails(toast)">
              ดูรายละเอียด
            </button>
            <button type="button" class="action-btn primary" @click="handleAccept(toast)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              รับงาน
            </button>
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ animationDuration: `${autoHideDuration}ms` }"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script lang="ts">
// Additional script for methods (to keep template clean)
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCrossRoleEvents, type CrossRoleEvent, type RequestCreatedPayload } from '@/lib/crossRoleEventBus'
import type { JobRequest } from '@/composables/useProviderJobPool'
</script>

<script setup lang="ts">
// State
const toasts = ref<ToastItem[]>([])
const audioRef = ref<HTMLAudioElement | null>(null)

const { subscribe } = useCrossRoleEvents()

// Computed
const visibleToasts = computed(() => 
  toasts.value.filter(t => t.isVisible).slice(0, props.maxToasts)
)

// Methods
function getPickupAddress(job: JobRequest | RequestCreatedPayload): string {
  if ('pickup_address' in job && job.pickup_address) {
    return job.pickup_address
  }
  if ('pickupLat' in job) {
    return `${job.pickupLat.toFixed(4)}, ${job.pickupLng.toFixed(4)}`
  }
  return 'ไม่ระบุที่อยู่'
}

function getEstimatedFare(job: JobRequest | RequestCreatedPayload): number {
  if ('estimated_fare' in job) return job.estimated_fare || 0
  if ('estimatedFare' in job) return job.estimatedFare || 0
  return 0
}

function getDistance(job: JobRequest | RequestCreatedPayload): number | null {
  if ('distance' in job && job.distance) return job.distance
  return null
}

function addToast(job: JobRequest | RequestCreatedPayload) {
  const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  toasts.value.unshift({
    id,
    job,
    timestamp: new Date(),
    isVisible: true
  })

  // Play sound
  if (props.soundEnabled) {
    playNotificationSound()
  }

  // Auto hide
  setTimeout(() => {
    dismissToast(id)
  }, props.autoHideDuration)
}

function dismissToast(id: string) {
  const toast = toasts.value.find(t => t.id === id)
  if (toast) {
    toast.isVisible = false
    emit('dismiss', id)
    
    // Remove from array after animation
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 300)
  }
}

function handleAccept(toast: ToastItem) {
  emit('accept', toast.job)
  dismissToast(toast.id)
}

function handleViewDetails(toast: ToastItem) {
  emit('viewDetails', toast.job)
}

function playNotificationSound() {
  try {
    if (!audioRef.value) {
      audioRef.value = new Audio('/sounds/new-job.mp3')
    }
    audioRef.value.currentTime = 0
    audioRef.value.play().catch(() => {})
  } catch {}
}

// Subscribe to new job events
let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = subscribe('request:created', (event: CrossRoleEvent<RequestCreatedPayload>) => {
    addToast(event.payload)
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// Expose methods for external use
defineExpose({
  addToast,
  dismissToast
})
</script>


<style scoped>
.toast-container {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: calc(100% - 32px);
  max-width: 400px;
  pointer-events: none;
}

.toast-container.top {
  top: 16px;
}

.toast-container.bottom {
  bottom: 16px;
}

.toast-item {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  pointer-events: auto;
  border: 1px solid #E8E8E8;
}

/* Toast Header */
.toast-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #E8F5EF;
  border-bottom: 1px solid #F0F0F0;
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #00A86B;
  border-radius: 8px;
}

.toast-icon svg {
  stroke: #FFFFFF;
}

.toast-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #00A86B;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.close-btn svg {
  stroke: #666666;
}

/* Toast Content */
.toast-content {
  padding: 16px;
}

.job-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-row svg {
  stroke: #666666;
  flex-shrink: 0;
}

.info-text {
  font-size: 14px;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-row.fare svg {
  stroke: #00A86B;
}

.fare-amount {
  font-size: 18px;
  font-weight: 700;
  color: #00A86B;
}

.info-row.distance {
  color: #666666;
  font-size: 13px;
}

/* Toast Actions */
.toast-actions {
  display: flex;
  gap: 10px;
  padding: 0 16px 16px;
}

.action-btn {
  flex: 1;
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
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: #00A86B;
  color: #FFFFFF;
}

.action-btn.primary:hover {
  background: #008F5B;
}

.action-btn.primary svg {
  stroke: #FFFFFF;
}

.action-btn.secondary {
  background: #F5F5F5;
  color: #1A1A1A;
}

.action-btn.secondary:hover {
  background: #E8E8E8;
}

/* Progress Bar */
.progress-bar {
  height: 3px;
  background: #F0F0F0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  animation: progress linear forwards;
}

@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Transitions */
.toast-enter-active {
  animation: slideIn 0.3s ease-out;
}

.toast-leave-active {
  animation: slideOut 0.3s ease-in;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
}

/* Bottom position animations */
.toast-container.bottom .toast-enter-active {
  animation: slideInBottom 0.3s ease-out;
}

.toast-container.bottom .toast-leave-active {
  animation: slideOutBottom 0.3s ease-in;
}

@keyframes slideInBottom {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOutBottom {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
}
</style>
