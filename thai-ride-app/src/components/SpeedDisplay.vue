<script setup lang="ts">
/**
 * Feature: F281 - Speed Display
 * Current speed display for drivers
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  speed: number
  unit?: 'kmh' | 'mph'
  speedLimit?: number
  showWarning?: boolean
}>(), {
  unit: 'kmh',
  showWarning: true
})

const displaySpeed = computed(() => {
  if (props.unit === 'mph') return Math.round(props.speed * 0.621371)
  return Math.round(props.speed)
})

const unitLabel = computed(() => props.unit === 'mph' ? 'mph' : 'km/h')

const isOverLimit = computed(() => {
  if (!props.speedLimit) return false
  return props.speed > props.speedLimit
})
</script>

<template>
  <div class="speed-display" :class="{ warning: isOverLimit && showWarning }">
    <div class="speed-value">{{ displaySpeed }}</div>
    <div class="speed-unit">{{ unitLabel }}</div>
    <div v-if="speedLimit && showWarning" class="speed-limit">
      <span class="limit-label">จำกัด</span>
      <span class="limit-value">{{ speedLimit }}</span>
    </div>
  </div>
</template>

<style scoped>
.speed-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  background: #000;
  border-radius: 12px;
  color: #fff;
  min-width: 100px;
}

.speed-display.warning {
  background: #e11900;
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.speed-value {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.speed-unit {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
}

.speed-limit {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.limit-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.limit-value {
  font-size: 18px;
  font-weight: 600;
}
</style>
