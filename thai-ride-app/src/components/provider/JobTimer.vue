<script setup lang="ts">
/**
 * JobTimer - Shows elapsed time since job was created
 * Critical for Provider to prioritize urgent jobs
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  createdAt: string
  expiresAt?: string
  compact?: boolean
}>()

const now = ref(Date.now())
let interval: number | null = null

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

const urgencyLevel = computed(() => {
  const seconds = elapsedSeconds.value
  if (seconds < 30) return 'new' // Just created
  if (seconds < 60) return 'normal' // Under 1 min
  if (seconds < 120) return 'warning' // 1-2 min
  return 'urgent' // Over 2 min
})

const urgencyConfig = computed(() => {
  switch (urgencyLevel.value) {
    case 'new':
      return { color: '#00A86B', bgColor: '#E8F5EF', label: 'ใหม่', pulse: true }
    case 'normal':
      return { color: '#666666', bgColor: '#F5F5F5', label: '', pulse: false }
    case 'warning':
      return { color: '#F59E0B', bgColor: '#FEF3C7', label: 'รอนาน', pulse: false }
    case 'urgent':
      return { color: '#EF4444', bgColor: '#FEE2E2', label: 'ด่วน!', pulse: true }
    default:
      return { color: '#666666', bgColor: '#F5F5F5', label: '', pulse: false }
  }
})
</script>

<template>
  <div 
    class="job-timer"
    :class="{ compact, pulse: urgencyConfig.pulse }"
    :style="{ 
      color: urgencyConfig.color, 
      backgroundColor: urgencyConfig.bgColor 
    }"
  >
    <!-- Timer Icon -->
    <svg v-if="!compact" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
    
    <!-- Elapsed Time -->
    <span class="timer-value">{{ elapsedDisplay }}</span>
    
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
}

.job-timer.compact {
  padding: 2px 6px;
  font-size: 11px;
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

.job-timer.pulse {
  animation: pulse-bg 2s ease-in-out infinite;
}

@keyframes pulse-bg {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
