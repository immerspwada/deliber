<script setup lang="ts">
/**
 * Feature: F186 - Heatmap Legend
 * Display heatmap color legend
 */

interface Props {
  title?: string
  minLabel?: string
  maxLabel?: string
  colors?: string[]
}

withDefaults(defineProps<Props>(), {
  title: 'ความหนาแน่น',
  minLabel: 'ต่ำ',
  maxLabel: 'สูง',
  colors: () => ['#e8f5e9', '#a5d6a7', '#66bb6a', '#43a047', '#2e7d32']
})
</script>

<template>
  <div class="heatmap-legend">
    <span class="legend-title">{{ title }}</span>
    <div class="legend-bar">
      <span class="legend-label">{{ minLabel }}</span>
      <div class="color-gradient" :style="{ background: `linear-gradient(to right, ${colors.join(', ')})` }"></div>
      <span class="legend-label">{{ maxLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.heatmap-legend {
  background: #fff;
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.legend-title {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #6b6b6b;
  margin-bottom: 6px;
}

.legend-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-label {
  font-size: 10px;
  color: #999;
}

.color-gradient {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  min-width: 80px;
}
</style>