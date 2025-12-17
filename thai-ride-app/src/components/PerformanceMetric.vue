<script setup lang="ts">
/**
 * Feature: F210 - Performance Metric
 * Display single performance metric with trend
 */
defineProps<{
  label: string
  value: string | number
  unit?: string
  trend?: number
  target?: number
  icon?: string
  color?: string
}>()

const getTrendIcon = (trend: number) => {
  if (trend > 0) return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
  if (trend < 0) return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>'
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>'
}
</script>

<template>
  <div class="performance-metric">
    <div v-if="icon" class="metric-icon" :style="{ background: color || '#f6f6f6' }" v-html="icon" />
    <div class="metric-content">
      <span class="metric-label">{{ label }}</span>
      <div class="metric-value-row">
        <span class="metric-value">{{ value }}<span v-if="unit" class="metric-unit">{{ unit }}</span></span>
        <span v-if="trend !== undefined" class="metric-trend" :class="{ up: trend > 0, down: trend < 0 }">
          <span v-html="getTrendIcon(trend)" />
          {{ Math.abs(trend) }}%
        </span>
      </div>
      <div v-if="target" class="metric-target">
        <div class="target-bar">
          <div class="target-fill" :style="{ width: `${Math.min((Number(value) / target) * 100, 100)}%` }" />
        </div>
        <span class="target-label">เป้าหมาย: {{ target }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.performance-metric { display: flex; gap: 14px; padding: 16px; background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; }
.metric-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: #000; flex-shrink: 0; }
.metric-content { flex: 1; min-width: 0; }
.metric-label { font-size: 12px; color: #6b6b6b; display: block; margin-bottom: 4px; }
.metric-value-row { display: flex; align-items: baseline; gap: 8px; }
.metric-value { font-size: 24px; font-weight: 700; color: #000; }
.metric-unit { font-size: 14px; font-weight: 500; color: #6b6b6b; margin-left: 2px; }
.metric-trend { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; color: #6b6b6b; }
.metric-trend.up { color: #10b981; }
.metric-trend.down { color: #ef4444; }
.metric-target { margin-top: 10px; }
.target-bar { height: 6px; background: #e5e5e5; border-radius: 3px; overflow: hidden; }
.target-fill { height: 100%; background: #000; border-radius: 3px; transition: width 0.3s; }
.target-label { font-size: 11px; color: #6b6b6b; margin-top: 4px; display: block; }
</style>
