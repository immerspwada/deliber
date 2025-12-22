<script setup lang="ts">
/**
 * JobTimer - Shows elapsed time since job was created
 * Critical for Provider to prioritize urgent jobs
 * 
 * Enhanced V2:
 * - Countdown mode for expiring jobs
 * - Better urgency animations
 * - Haptic feedback on urgent
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  createdAt: string
  expiresAt?: string
  compact?: boolean
  showCountdown?: boolean
}>()

const emit = defineEmits<{
  expired: []
  urgent: []
}>()

const now = ref(Date.now())
let interval: number | null = null
let hasTriggeredUrgent = false

onMounted(() => {
  interval = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})

const elapsedSeconds = computed(() => {
  const created = new Date(props.createdAt).getTime()
  return Math.floor((now.value - created) / 1000)
})

const remainingSeconds = computed(() => {
  if (!props.expiresAt) return null
  const expires = new Date(props.expiresAt).getTime()
  return Math.max(0, Math.floor((expires - now.value) / 1000))
})

const elapsedDisplay = computed(() => {
  const seconds = elapsedSeconds.value
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) return `${minutes}:${secs.toString().padStart(2, '0')}`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const countdownDisplay = computed(() => {
  if (remainingSeconds.value === null) return null
  const seconds = remainingSeconds.value
  if (seconds <= 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
})

const urgencyLevel = computed(() => {
  // If countdown mode and has expiry
  if (props.showCountdown && remainingSeconds.value !== null) {
    if (remainingSeconds.value <= 0) return 'expired'
    if (remainingSeconds.value <= 10) return 'critical'
    if (remainingSeconds.value <= 30) return 'urgent'
    if (remainingSeconds.value <= 60) return 'warning'
    return 'normal'
  }
  
  // Elapsed time mode
  const seconds = elapsedSeconds.value
  if (seconds < 30) return 'new' // Just created
  if (seconds < 60) return 'normal' // Under 1 min
  if (seconds < 120) return 'warning' // 1-2 min
  if (seconds < 180) return 'urgent' // 2-3 min
  return 'critical' // Over 3 min
})

const urgencyConfig = computed(() => {
  switch (urgencyLevel.value) {
    case 'new':
      return { color: '#00A86B', bgColor: '#E8F5EF', label: 'ใหม่', pulse: true, shake: false }
    case 'normal':
      return { color: '#666666', bgColor: '#F5F5F5', label: '', pulse: false, shake: false }
    case 'warning':
      return { color: '#F59E0B', bgColor: '#FEF3C7', label: 'รอนาน', pulse: false, shake: false }
    case 'urgent':
      return { color: '#EF4444', bgColor: '#FEE2E2', label: 'ด่วน!', pulse: true, shake: false }
    case 'critical':
      return { color: '#FFFFFF', bgColor: '#EF4444', label: 'ด่วนมาก!', pulse: true, shake: true }
    case 'expired':
      return { color: '#FFFFFF', bgColor: '#991B1B', label: 'หมดเวลา', pulse: false, shake: false }
    default:
      return { color: '#666666', bgColor: '#F5F5F5', label: '', pulse: false, shake: false }
  }
})

// Watch for urgent state to emit event
watch(urgencyLevel, (level) => {
  if ((level === 'urgent' || level === 'critical') && !hasTriggeredUrgent) {
    hasTriggeredUrgent = true
    emit('urgent')
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50])
    }
  }
  if (level === 'expired') {
    emit('expired')
  }
})

// Progress for countdown ring
const countdownProgress = computed(() => {
  if (!props.showCountdown || remainingSeconds.value === null) return 100
  // Assume 2 minutes (120s) is full
  const maxSeconds = 120
  return Math.min(100, (remainingSeconds.value / maxSeconds) * 100)
})
</script>

<template>
  <div 
    class="job-timer"
    :class="{ 
      compact, 
      pulse: urgencyConfig.pulse,
      shake: urgencyConfig.shake,
      countdown: showCountdown && countdownDisplay
    }"
    :style="{ 
      color: urgencyConfig.color, 
      backgroundColor: urgencyConfig.bgColor 
    }"
  >
    <!-- Countdown Ring (for countdown mode) -->
    <svg v-if="showCountdown && countdownDisplay" class="countdown-ring" viewBox="0 0 36 36">
      <circle
        class="ring-bg"
        cx="18" cy="18" r="15.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        opacity="0.2"
      />
      <circle
        class="ring-progress"
        cx="18" cy="18" r="15.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        :stroke-dasharray="`${countdownProgress} 100`"
        transform="rotate(-90 18 18)"
      />
    </svg>
    
    <!-- Timer Icon (for elapsed mode) -->
    <svg v-else-if="!compact" class="timer-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
    
    <!-- Time Display -->
    <span class="timer-value">
      {{ showCountdown && countdownDisplay ? countdownDisplay : elapsedDisplay }}
    </span>
    
    <!-- Urgency Label -->
    <span v-if="urgencyConfig.label && !compact" class="urgency-label">
      {{ urgencyConfig.label }}
    </span>
  </div>
</template>

<style scoped>
.job-timer {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  position: relative;
}

.job-timer.compact {
  padding: 2px 6px;
  font-size: 11px;
}

.job-timer.countdown {
  padding: 4px 10px 4px 28px;
}

.timer-icon {
  flex-shrink: 0;
}

.timer-value {
  min-width: 32px;
}

.urgency-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Countdown Ring */
.countdown-ring {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
}

.ring-progress {
  transition: stroke-dasharray 0.3s ease;
}

/* Animations */
.job-timer.pulse {
  animation: pulse-bg 2s ease-in-out infinite;
}

.job-timer.shake {
  animation: shake 0.5s ease-in-out infinite, pulse-bg 2s ease-in-out infinite;
}

@keyframes pulse-bg {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.02); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

/* Critical state glow */
.job-timer.shake::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 8px;
  background: inherit;
  opacity: 0.4;
  filter: blur(4px);
  z-index: -1;
  animation: glow 1s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.2; }
}
</style>
