<script setup lang="ts">
/**
 * Feature: F286 - Arrival Time
 * Estimated arrival time display
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  arrivalTime: Date | string
  duration?: number
  showDuration?: boolean
  size?: 'sm' | 'md' | 'lg'
}>(), {
  showDuration: true,
  size: 'md'
})

const formattedTime = computed(() => {
  const date = new Date(props.arrivalTime)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
})

const formattedDuration = computed(() => {
  if (!props.duration) return null
  const hours = Math.floor(props.duration / 60)
  const mins = props.duration % 60
  if (hours > 0) return `${hours} ชม. ${mins} นาที`
  return `${mins} นาที`
})
</script>

<template>
  <div class="arrival-time" :class="size">
    <div class="time-value">{{ formattedTime }}</div>
    <div class="time-label">ถึงโดยประมาณ</div>
    <div v-if="showDuration && formattedDuration" class="duration">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12,6 12,12 16,14"/>
      </svg>
      {{ formattedDuration }}
    </div>
  </div>
</template>

<style scoped>
.arrival-time {
  text-align: center;
}

.time-value {
  font-weight: 700;
  color: #000;
}

.time-label {
  color: #6b6b6b;
}

.duration {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 4px 8px;
  background: #f6f6f6;
  border-radius: 4px;
  color: #6b6b6b;
}

.arrival-time.sm .time-value { font-size: 20px; }
.arrival-time.sm .time-label { font-size: 11px; }
.arrival-time.sm .duration { font-size: 11px; }

.arrival-time.md .time-value { font-size: 28px; }
.arrival-time.md .time-label { font-size: 13px; }
.arrival-time.md .duration { font-size: 12px; }

.arrival-time.lg .time-value { font-size: 36px; }
.arrival-time.lg .time-label { font-size: 14px; }
.arrival-time.lg .duration { font-size: 13px; }
</style>
