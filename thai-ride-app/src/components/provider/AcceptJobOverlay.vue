<script setup lang="ts">
/**
 * AcceptJobOverlay - Full screen loading overlay during job acceptance
 * Shows animated loading state with job details
 * 
 * Enhanced V2:
 * - Success state with confetti animation
 * - Smooth state transitions
 * - Better haptic feedback integration
 */
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  show: boolean
  jobType?: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  customerName?: string
  fare?: number
  success?: boolean
}>()

const emit = defineEmits<{
  complete: []
}>()

// Internal state for animation phases
const phase = ref<'loading' | 'success'>('loading')

// Watch for success prop to trigger success animation
watch(() => props.success, (isSuccess) => {
  if (isSuccess) {
    phase.value = 'success'
    // Trigger haptic on success
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50, 30, 100])
    }
    // Auto-emit complete after animation
    setTimeout(() => {
      emit('complete')
    }, 1500)
  }
})

// Reset phase when overlay closes
watch(() => props.show, (isShowing) => {
  if (!isShowing) {
    setTimeout(() => {
      phase.value = 'loading'
    }, 300)
  }
})

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

const jobTypeIcon = computed(() => {
  const icons: Record<string, string> = {
    ride: 'M8 7h8m-8 4h8m-4 4v4m-4-4h8a2 2 0 002-2V7a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z',
    delivery: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    shopping: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    queue: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
    moving: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    laundry: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
  }
  return icons[props.jobType || 'ride'] || icons.ride
})
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="show" class="accept-overlay" :class="{ success: phase === 'success' }">
        <div class="overlay-content">
          <!-- Loading State -->
          <template v-if="phase === 'loading'">
            <!-- Animated Circle -->
            <div class="loading-circle">
              <div class="circle-ring"></div>
              <div class="circle-ring delay-1"></div>
              <div class="circle-ring delay-2"></div>
              <div class="center-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="jobTypeIcon"/>
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
          </template>

          <!-- Success State -->
          <template v-else>
            <!-- Success Circle with Checkmark -->
            <div class="success-circle">
              <svg class="checkmark" viewBox="0 0 52 52">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
            
            <!-- Confetti -->
            <div class="confetti-container">
              <div v-for="i in 20" :key="i" class="confetti" :style="{ '--i': i }"></div>
            </div>
            
            <!-- Success Text -->
            <h2 class="overlay-title success-title">รับงานสำเร็จ!</h2>
            <p class="overlay-subtitle">เริ่มงานได้เลย</p>
            
            <!-- Job Summary -->
            <div class="success-summary">
              <div class="summary-row">
                <span class="summary-label">{{ jobTypeLabel }}</span>
                <span v-if="fare" class="summary-fare">฿{{ fare.toLocaleString() }}</span>
              </div>
              <div v-if="customerName" class="summary-customer">
                {{ customerName }}
              </div>
            </div>
          </template>
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
  transition: background 0.3s ease;
}

.accept-overlay.success {
  background: rgba(0, 168, 107, 1);
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px;
  position: relative;
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

.center-icon {
  position: absolute;
  inset: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  animation: pulse 1.5s ease-in-out infinite;
}

.center-icon svg {
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

/* Success Circle with Checkmark */
.success-circle {
  width: 120px;
  height: 120px;
  margin-bottom: 24px;
}

.checkmark {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: block;
  stroke-width: 2;
  stroke: #FFFFFF;
  stroke-miterlimit: 10;
  animation: scaleIn 0.3s ease-in-out;
}

.checkmark-circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 2;
  stroke-miterlimit: 10;
  stroke: #FFFFFF;
  fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.checkmark-check {
  transform-origin: 50% 50%;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  stroke-width: 3;
  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.4s forwards;
}

@keyframes stroke {
  100% { stroke-dashoffset: 0; }
}

@keyframes scaleIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* Confetti */
.confetti-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.confetti {
  position: absolute;
  width: 10px;
  height: 10px;
  top: 50%;
  left: 50%;
  opacity: 0;
  animation: confetti 1s ease-out forwards;
  animation-delay: calc(var(--i) * 0.02s);
}

.confetti:nth-child(odd) {
  background: #FFD700;
  border-radius: 50%;
}

.confetti:nth-child(even) {
  background: #FFFFFF;
  border-radius: 2px;
}

.confetti:nth-child(3n) {
  background: #FF6B6B;
}

.confetti:nth-child(4n) {
  background: #4ECDC4;
}

@keyframes confetti {
  0% {
    transform: translate(-50%, -50%) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(
      calc(-50% + (var(--i) - 10) * 30px),
      calc(-50% + (var(--i) - 10) * -40px)
    ) rotate(calc(var(--i) * 45deg));
    opacity: 0;
  }
}

/* Text */
.overlay-title {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0 0 8px 0;
}

.success-title {
  animation: bounceIn 0.5s ease-out;
}

@keyframes bounceIn {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
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

/* Success Summary */
.success-summary {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 16px 24px;
  min-width: 220px;
  animation: slideUp 0.4s ease-out 0.3s both;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.summary-fare {
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
}

.summary-customer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 15px;
  font-weight: 600;
  color: #FFFFFF;
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
