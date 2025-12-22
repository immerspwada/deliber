<script setup lang="ts">
/**
 * AcceptJobOverlay - Full screen loading overlay during job acceptance
 * Shows animated loading state with job details
 */
import { computed } from 'vue'

const props = defineProps<{
  show: boolean
  jobType?: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  customerName?: string
  fare?: number
}>()

const jobTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    ride: 'เรียกรถ',
    delivery: 'ส่งของ',
    shopping: 'ซื้อของ',
    queue: 'จองคิว',
    moving: 'ขนย้าย',
    laundry: 'ซักผ้า'
  }
  return labels[props.jobType || 'ride'] || 'งาน'
})
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="show" class="accept-overlay">
        <div class="overlay-content">
          <!-- Animated Circle -->
          <div class="loading-circle">
            <div class="circle-ring"></div>
            <div class="circle-ring delay-1"></div>
            <div class="circle-ring delay-2"></div>
            <div class="check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
          </div>
          
          <!-- Text -->
          <h2 class="overlay-title">กำลังรับงาน...</h2>
          <p class="overlay-subtitle">{{ jobTypeLabel }}</p>
          
          <!-- Job Details -->
          <div v-if="customerName || fare" class="job-preview">
            <div v-if="customerName" class="preview-item">
              <span class="preview-label">ลูกค้า</span>
              <span class="preview-value">{{ customerName }}</span>
            </div>
            <div v-if="fare" class="preview-item">
              <span class="preview-label">ค่าบริการ</span>
              <span class="preview-value fare">฿{{ fare.toLocaleString() }}</span>
            </div>
          </div>
          
          <!-- Progress Dots -->
          <div class="progress-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.accept-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 168, 107, 0.95);
  backdrop-filter: blur(8px);
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px;
}

/* Animated Loading Circle */
.loading-circle {
  position: relative;
  width: 120px;
  height: 120px;
  margin-bottom: 24px;
}

.circle-ring {
  position: absolute;
  inset: 0;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.circle-ring.delay-1 {
  inset: 10px;
  animation-delay: 0.15s;
  border-width: 2px;
}

.circle-ring.delay-2 {
  inset: 20px;
  animation-delay: 0.3s;
  border-width: 2px;
  opacity: 0.7;
}

.check-icon {
  position: absolute;
  inset: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  animation: pulse 1.5s ease-in-out infinite;
}

.check-icon svg {
  width: 40px;
  height: 40px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

/* Text */
.overlay-title {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 8px 0;
}

.overlay-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 24px 0;
}

/* Job Preview */
.job-preview {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 16px 24px;
  margin-bottom: 24px;
  min-width: 200px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.preview-item:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.preview-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.preview-value {
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
}

.preview-value.fare {
  font-size: 18px;
  font-weight: 700;
}

/* Progress Dots */
.progress-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: dotPulse 1.4s ease-in-out infinite;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dotPulse {
  0%, 80%, 100% { 
    transform: scale(0.8);
    background: rgba(255, 255, 255, 0.5);
  }
  40% { 
    transform: scale(1.2);
    background: #FFFFFF;
  }
}

/* Transitions */
.overlay-enter-active,
.overlay-leave-active {
  transition: all 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.overlay-enter-from .overlay-content,
.overlay-leave-to .overlay-content {
  transform: scale(0.9);
}
</style>
