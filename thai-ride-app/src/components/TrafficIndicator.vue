<script setup lang="ts">
/**
 * Feature: F285 - Traffic Indicator
 * Traffic congestion level indicator
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  level: 'low' | 'moderate' | 'heavy' | 'severe'
  showLabel?: boolean
  delay?: number
}>(), {
  showLabel: true
})

const config = computed(() => {
  const configs = {
    low: { color: '#276ef1', label: 'การจราจรคล่องตัว', bars: 1 },
    moderate: { color: '#f5a623', label: 'การจราจรปานกลาง', bars: 2 },
    heavy: { color: '#ff6b00', label: 'การจราจรหนาแน่น', bars: 3 },
    severe: { color: '#e11900', label: 'การจราจรติดขัดมาก', bars: 4 }
  }
  return configs[props.level]
})

const formattedDelay = computed(() => {
  if (!props.delay) return null
  if (props.delay >= 60) return Math.round(props.delay / 60) + ' ชม.'
  return props.delay + ' นาที'
})
</script>

<template>
  <div class="traffic-indicator" :style="{ '--color': config.color }">
    <div class="bars">
      <div v-for="i in 4" :key="i" class="bar" :class="{ active: i <= config.bars }"></div>
    </div>
    <div v-if="showLabel" class="info">
      <span class="label">{{ config.label }}</span>
      <span v-if="formattedDelay" class="delay">+{{ formattedDelay }}</span>
    </div>
  </div>
</template>

<style scoped>
.traffic-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
}

.bar {
  width: 4px;
  background: #e5e5e5;
  border-radius: 1px;
}

.bar:nth-child(1) { height: 4px; }
.bar:nth-child(2) { height: 8px; }
.bar:nth-child(3) { height: 12px; }
.bar:nth-child(4) { height: 16px; }

.bar.active {
  background: var(--color);
}

.info {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color);
}

.delay {
  font-size: 11px;
  color: #6b6b6b;
}
</style>
