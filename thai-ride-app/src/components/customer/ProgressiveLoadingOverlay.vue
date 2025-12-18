<script setup lang="ts">
/**
 * ProgressiveLoadingOverlay - Loading Overlay with Progress Steps
 * 
 * แสดง loading state ที่มีความหมาย บอกขั้นตอนและความคืบหน้า
 * ลดความกังวลของผู้ใช้ด้วยการบอกว่ากำลังทำอะไรอยู่
 * MUNEEF Style: สีเขียว #00A86B, animations ลื่นไหล
 * 
 * @syncs-with
 * - UX Tracking: useUXTracking.ts (progressive_loading events)
 * - Admin: AdminUXAnalyticsView.vue
 */
import { computed, watch, ref } from 'vue'
import { quickTrack } from '../../composables/useUXTracking'

interface LoadingStep {
  id: string
  label: string
  description?: string
}

interface Props {
  show: boolean
  steps?: LoadingStep[]
  currentStep?: number
  progress?: number
  title?: string
  subtitle?: string
  variant?: 'overlay' | 'inline' | 'fullscreen'
  showProgress?: boolean
  showSteps?: boolean
  cancelable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  steps: () => [],
  currentStep: 0,
  progress: 0,
  title: 'กำลังดำเนินการ',
  subtitle: '',
  variant: 'overlay',
  showProgress: true,
  showSteps: true,
  cancelable: false
})

const emit = defineEmits<{
  'cancel': []
}>()

const currentStepData = computed(() => props.steps[props.currentStep])
const totalSteps = computed(() => props.steps.length)

const progressPercentage = computed(() => {
  if (totalSteps.value === 0) return props.progress
  
  const baseProgress = (props.currentStep / totalSteps.value) * 100
  const stepProgress = (props.progress / 100) * (100 / totalSteps.value)
  return Math.min(baseProgress + stepProgress, 100)
})

const handleCancel = () => {
  // Track loading cancelled
  quickTrack('progressive_loading_completed', 'performance', {
    cancelled: true,
    stepCount: totalSteps.value,
    currentStep: props.currentStep,
    progress: progressPercentage.value
  })
  emit('cancel')
}

// Track loading start/complete
const loadingStartTime = ref<number | null>(null)

watch(() => props.show, (newShow, oldShow) => {
  if (newShow && !oldShow) {
    // Loading started
    loadingStartTime.value = Date.now()
    quickTrack('progressive_loading_started', 'performance', {
      stepCount: totalSteps.value,
      title: props.title
    })
  } else if (!newShow && oldShow && loadingStartTime.value) {
    // Loading completed
    const duration = Date.now() - loadingStartTime.value
    quickTrack('progressive_loading_completed', 'performance', {
      cancelled: false,
      stepCount: totalSteps.value,
      totalDurationMs: duration,
      finalProgress: progressPercentage.value
    })
    loadingStartTime.value = null
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="loading-overlay" :class="variant">
        <div class="loading-content">
          <!-- Animated Logo/Spinner -->
          <div class="loading-spinner">
            <svg viewBox="0 0 80 80" class="spinner-svg">
              <!-- Background circle -->
              <circle cx="40" cy="40" r="35" class="spinner-bg"/>
              <!-- Progress circle -->
              <circle 
                cx="40" 
                cy="40" 
                r="35" 
                class="spinner-progress"
                :style="{ strokeDasharray: `${progressPercentage * 2.2}, 220` }"
              />
              <!-- Center icon -->
              <g class="spinner-icon">
                <path d="M40 25L50 45H30L40 25Z" fill="#00A86B"/>
                <circle cx="40" cy="42" r="5" fill="#00A86B"/>
              </g>
            </svg>
            
            <!-- Pulse rings -->
            <div class="pulse-ring ring-1"></div>
            <div class="pulse-ring ring-2"></div>
          </div>
          
          <!-- Title & Subtitle -->
          <div class="loading-text">
            <h3 class="loading-title">{{ currentStepData?.label || title }}</h3>
            <p v-if="currentStepData?.description || subtitle" class="loading-subtitle">
              {{ currentStepData?.description || subtitle }}
            </p>
          </div>
          
          <!-- Progress Bar -->
          <div v-if="showProgress" class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${progressPercentage}%` }"></div>
            </div>
            <span class="progress-text">{{ Math.round(progressPercentage) }}%</span>
          </div>
          
          <!-- Steps Indicator -->
          <div v-if="showSteps && steps.length > 0" class="steps-container">
            <div 
              v-for="(step, index) in steps" 
              :key="step.id"
              class="step-item"
              :class="{
                completed: index < currentStep,
                active: index === currentStep,
                pending: index > currentStep
              }"
            >
              <div class="step-indicator">
                <svg v-if="index < currentStep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <span class="step-label">{{ step.label }}</span>
            </div>
          </div>
          
          <!-- Cancel Button -->
          <button v-if="cancelable" class="cancel-btn" @click="handleCancel">
            ยกเลิก
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-overlay.overlay {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
}

.loading-overlay.fullscreen {
  background: #FFFFFF;
}

.loading-overlay.inline {
  position: relative;
  background: transparent;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 32px;
  max-width: 320px;
  text-align: center;
}

/* Spinner */
.loading-spinner {
  position: relative;
  width: 100px;
  height: 100px;
}

.spinner-svg {
  width: 100%;
  height: 100%;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner-bg {
  fill: none;
  stroke: #E8E8E8;
  stroke-width: 4;
}

.spinner-progress {
  fill: none;
  stroke: #00A86B;
  stroke-width: 4;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dasharray 0.3s ease;
}

.spinner-icon {
  animation: pulse-icon 1.5s ease-in-out infinite;
}

@keyframes pulse-icon {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.9); opacity: 0.8; }
}

/* Pulse Rings */
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid #00A86B;
  border-radius: 50%;
  opacity: 0;
}

.ring-1 {
  width: 120px;
  height: 120px;
  animation: pulse-ring 2s ease-out infinite;
}

.ring-2 {
  width: 140px;
  height: 140px;
  animation: pulse-ring 2s ease-out infinite 0.5s;
}

@keyframes pulse-ring {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.5;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0;
  }
}

/* Text */
.loading-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.loading-subtitle {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

/* Progress Bar */
.progress-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #E8E8E8;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00A86B, #00C77B);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #00A86B;
}

/* Steps */
.steps-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.step-indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.3s ease;
}

.step-item.completed .step-indicator {
  background: #00A86B;
  color: #FFFFFF;
}

.step-item.completed .step-indicator svg {
  width: 14px;
  height: 14px;
}

.step-item.active .step-indicator {
  background: #00A86B;
  color: #FFFFFF;
  animation: pulse-step 1s ease-in-out infinite;
}

@keyframes pulse-step {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.step-item.pending .step-indicator {
  background: #E8E8E8;
  color: #999999;
}

.step-label {
  font-size: 12px;
  color: #666666;
}

.step-item.active .step-label {
  color: #00A86B;
  font-weight: 600;
}

.step-item.completed .step-label {
  color: #00A86B;
}

/* Cancel Button */
.cancel-btn {
  padding: 12px 24px;
  background: transparent;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  border-color: #E53935;
  color: #E53935;
}

.cancel-btn:active {
  transform: scale(0.98);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
