<script setup lang="ts">
/**
 * ETACountdown - Shows estimated time of arrival countdown
 * F175 - Cross-Role Integration
 * Updates every second, shows "กำลังมาถึง" when < 1 minute
 * Shows distance remaining
 * MUNEEF Style: Primary #00A86B, Background #FFFFFF
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCrossRoleEvents, type ProviderLocationPayload } from '@/lib/crossRoleEventBus'

// Props
interface Props {
  eta: Date
  distance: number // in km
  requestId?: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'arrived': []
  'eta-update': [seconds: number]
}>()

const { subscribe } = useCrossRoleEvents()

// State
const currentEta = ref<Date>(props.eta)
const currentDistance = ref<number>(props.distance)
const remainingSeconds = ref<number>(0)
const hasArrived = ref(false)
let countdownInterval: ReturnType<typeof setInterval> | null = null

// Computed
const etaMinutes = computed(() => Math.ceil(remainingSeconds.value / 60))

const etaDisplay = computed(() => {
  if (hasArrived.value) return 'มาถึงแล้ว!'
  if (remainingSeconds.value <= 0) return 'กำลังมาถึง'
  if (remainingSeconds.value < 60) return 'กำลังมาถึง'
  
  const mins = Math.floor(remainingSeconds.value / 60)
  const secs = remainingSeconds.value % 60
  
  if (mins === 0) {
    return `${secs} วินาที`
  }
  if (mins < 60) {
    return `${mins} นาที`
  }
  
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours} ชม. ${remainingMins} นาที`
})

const distanceDisplay = computed(() => {
  if (currentDistance.value < 1) {
    return `${Math.round(currentDistance.value * 1000)} ม.`
  }
  return `${currentDistance.value.toFixed(1)} กม.`
})

const etaProgress = computed(() => {
  const initialSeconds = calculateInitialSeconds()
  if (initialSeconds <= 0) return 100
  const progress = ((initialSeconds - remainingSeconds.value) / initialSeconds) * 100
  return Math.min(100, Math.max(0, progress))
})

const urgencyLevel = computed(() => {
  if (hasArrived.value) return 'arrived'
  if (remainingSeconds.value <= 60) return 'imminent'
  if (remainingSeconds.value <= 180) return 'soon'
  return 'normal'
})

const urgencyColor = computed(() => {
  switch (urgencyLevel.value) {
    case 'arrived': return '#00A86B'
    case 'imminent': return '#E53935'
    case 'soon': return '#F5A623'
    default: return '#00A86B'
  }
})

// Calculate initial seconds from ETA
function calculateInitialSeconds(): number {
  const now = new Date()
  const etaTime = new Date(props.eta)
  return Math.max(0, Math.floor((etaTime.getTime() - now.getTime()) / 1000))
}

// Calculate remaining seconds
function calculateRemainingSeconds(): number {
  const now = new Date()
  const etaTime = new Date(currentEta.value)
  return Math.max(0, Math.floor((etaTime.getTime() - now.getTime()) / 1000))
}

// Update ETA from new data
function updateETA(newEta: Date, newDistance?: number) {
  currentEta.value = newEta
  if (newDistance !== undefined) {
    currentDistance.value = newDistance
  }
  remainingSeconds.value = calculateRemainingSeconds()
}

// Start countdown
function startCountdown() {
  if (countdownInterval) return
  
  remainingSeconds.value = calculateRemainingSeconds()
  
  countdownInterval = setInterval(() => {
    if (remainingSeconds.value > 0 && !hasArrived.value) {
      remainingSeconds.value--
      emit('eta-update', remainingSeconds.value)
      
      // Check if arrived
      if (remainingSeconds.value <= 0) {
        hasArrived.value = true
        emit('arrived')
        stopCountdown()
      }
    }
  }, 1000)
}

// Stop countdown
function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

// Mark as arrived
function markArrived() {
  hasArrived.value = true
  remainingSeconds.value = 0
  emit('arrived')
  stopCountdown()
}

// Watch for prop changes
watch(() => props.eta, (newEta) => {
  updateETA(newEta)
})

watch(() => props.distance, (newDistance) => {
  currentDistance.value = newDistance
  
  // If distance is very small, mark as arrived
  if (newDistance < 0.05) { // 50 meters
    markArrived()
  }
})

// Subscribe to cross-role events
let unsubscribe: (() => void) | null = null

onMounted(() => {
  startCountdown()
  
  // Subscribe to provider location updates for dynamic ETA
  if (props.requestId) {
    unsubscribe = subscribe<ProviderLocationPayload>(
      'provider:location_updated',
      (event) => {
        // Could update ETA based on new location
        // For now, just check if very close
        if (currentDistance.value < 0.05) {
          markArrived()
        }
      },
      { requestIds: [props.requestId] }
    )
  }
})

onUnmounted(() => {
  stopCountdown()
  if (unsubscribe) {
    unsubscribe()
  }
})

// Expose methods
defineExpose({
  updateETA,
  markArrived
})
</script>

<template>
  <div 
    class="eta-countdown"
    :class="urgencyLevel"
    :style="{ '--urgency-color': urgencyColor }"
  >
    <!-- Circular Progress -->
    <div class="progress-ring">
      <svg viewBox="0 0 100 100">
        <!-- Background circle -->
        <circle
          class="progress-bg"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#F0F0F0"
          stroke-width="8"
        />
        <!-- Progress circle -->
        <circle
          class="progress-bar"
          cx="50"
          cy="50"
          r="45"
          fill="none"
          :stroke="urgencyColor"
          stroke-width="8"
          stroke-linecap="round"
          :stroke-dasharray="283"
          :stroke-dashoffset="283 - (283 * etaProgress / 100)"
          transform="rotate(-90 50 50)"
        />
      </svg>
      
      <!-- Center Content -->
      <div class="progress-content">
        <div v-if="hasArrived" class="arrived-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <template v-else-if="remainingSeconds < 60">
          <div class="imminent-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"/>
              <path d="M5 17H3v-4l2-5h9l4 5h3v4h-2"/>
            </svg>
          </div>
        </template>
        <template v-else>
          <span class="eta-value">{{ etaMinutes }}</span>
          <span class="eta-unit">นาที</span>
        </template>
      </div>
      
      <!-- Pulse effect for imminent -->
      <div v-if="urgencyLevel === 'imminent'" class="pulse-ring"></div>
    </div>
    
    <!-- ETA Info -->
    <div class="eta-info">
      <span class="eta-label">{{ etaDisplay }}</span>
      <span v-if="!hasArrived" class="eta-subtitle">
        ถึงจุดรับโดยประมาณ
      </span>
    </div>
    
    <!-- Distance Badge -->
    <div v-if="!hasArrived" class="distance-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span>{{ distanceDisplay }}</span>
    </div>
    
    <!-- Arrival Celebration -->
    <Transition name="bounce">
      <div v-if="hasArrived" class="arrival-celebration">
        <div class="confetti confetti-1"></div>
        <div class="confetti confetti-2"></div>
        <div class="confetti confetti-3"></div>
        <div class="confetti confetti-4"></div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.eta-countdown {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.eta-countdown.imminent {
  border-color: #E53935;
  background: #FFF5F5;
  animation: shake 0.5s ease infinite;
}

.eta-countdown.arrived {
  border-color: #00A86B;
  background: #E8F5EF;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

/* Progress Ring */
.progress-ring {
  position: relative;
  width: 120px;
  height: 120px;
}

.progress-ring svg {
  width: 100%;
  height: 100%;
}

.progress-bar {
  transition: stroke-dashoffset 0.5s ease, stroke 0.3s ease;
}

.progress-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.eta-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--urgency-color);
  line-height: 1;
}

.eta-unit {
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  margin-top: 2px;
}

.arrived-icon,
.imminent-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--urgency-color);
  animation: pop 0.3s ease;
}

.arrived-icon svg,
.imminent-icon svg {
  width: 100%;
  height: 100%;
}

.imminent-icon {
  animation: bounce-car 0.5s ease infinite;
}

@keyframes pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes bounce-car {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* Pulse Ring */
.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid #E53935;
  animation: pulse-expand 1.5s ease-out infinite;
}

@keyframes pulse-expand {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0;
  }
}

/* ETA Info */
.eta-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.eta-label {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.eta-subtitle {
  font-size: 13px;
  color: #666666;
}

/* Distance Badge */
.distance-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #F5F5F5;
  border-radius: 20px;
}

.distance-badge svg {
  width: 16px;
  height: 16px;
  color: #00A86B;
}

.distance-badge span {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

/* Arrival Celebration */
.arrival-celebration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.confetti {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.confetti-1 {
  background: #00A86B;
  top: 20%;
  left: 20%;
  animation: confetti-fall 1s ease-out forwards;
}

.confetti-2 {
  background: #F5A623;
  top: 30%;
  right: 25%;
  animation: confetti-fall 1.2s ease-out 0.1s forwards;
}

.confetti-3 {
  background: #2196F3;
  top: 25%;
  left: 50%;
  animation: confetti-fall 1.1s ease-out 0.2s forwards;
}

.confetti-4 {
  background: #E53935;
  top: 15%;
  right: 30%;
  animation: confetti-fall 1.3s ease-out 0.15s forwards;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100px) rotate(720deg);
    opacity: 0;
  }
}

/* Transitions */
.bounce-enter-active {
  animation: bounce-in 0.5s ease;
}

.bounce-leave-active {
  animation: bounce-in 0.3s ease reverse;
}

@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
