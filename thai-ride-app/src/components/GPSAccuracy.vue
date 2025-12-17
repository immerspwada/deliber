<script setup lang="ts">
/**
 * Feature: F280 - GPS Accuracy
 * GPS signal accuracy indicator
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  accuracy?: number | null
  showLabel?: boolean
}>(), {
  showLabel: true
})

const status = computed(() => {
  if (!props.accuracy) return { level: 'none', label: 'ไม่มีสัญญาณ', bars: 0 }
  if (props.accuracy <= 10) return { level: 'excellent', label: 'แม่นยำมาก', bars: 4 }
  if (props.accuracy <= 30) return { level: 'good', label: 'ดี', bars: 3 }
  if (props.accuracy <= 100) return { level: 'fair', label: 'พอใช้', bars: 2 }
  return { level: 'poor', label: 'อ่อน', bars: 1 }
})
</script>

<template>
  <div class="gps-accuracy" :class="status.level">
    <div class="signal-bars">
      <div v-for="i in 4" :key="i" class="bar" :class="{ active: i <= status.bars }"></div>
    </div>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
    </svg>
    <span v-if="showLabel" class="label">{{ status.label }}</span>
    <span v-if="accuracy && showLabel" class="accuracy-value">(±{{ Math.round(accuracy) }}m)</span>
  </div>
</template>

<style scoped>
.gps-accuracy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.signal-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.bar {
  width: 3px;
  background: #e5e5e5;
  border-radius: 1px;
}

.bar:nth-child(1) { height: 4px; }
.bar:nth-child(2) { height: 7px; }
.bar:nth-child(3) { height: 10px; }
.bar:nth-child(4) { height: 14px; }

.bar.active {
  background: currentColor;
}

.label {
  font-weight: 500;
}

.accuracy-value {
  color: #6b6b6b;
}

.gps-accuracy.excellent { color: #276ef1; }
.gps-accuracy.good { color: #276ef1; }
.gps-accuracy.fair { color: #f5a623; }
.gps-accuracy.poor { color: #e11900; }
.gps-accuracy.none { color: #ccc; }
</style>
