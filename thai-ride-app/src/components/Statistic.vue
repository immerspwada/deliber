<script setup lang="ts">
/**
 * Feature: F394 - Statistic
 * Statistic display component
 */
withDefaults(defineProps<{
  title: string
  value: number | string
  prefix?: string
  suffix?: string
  precision?: number
  valueStyle?: Record<string, string>
  trend?: 'up' | 'down'
  trendValue?: string
}>(), {
  precision: 0
})

const formatValue = (val: number | string, precision: number) => {
  if (typeof val === 'string') return val
  return val.toLocaleString('th-TH', { minimumFractionDigits: precision, maximumFractionDigits: precision })
}
</script>

<template>
  <div class="statistic">
    <div class="statistic-title">{{ title }}</div>
    <div class="statistic-content" :style="valueStyle">
      <span v-if="prefix" class="statistic-prefix">{{ prefix }}</span>
      <span class="statistic-value">{{ formatValue(value, precision) }}</span>
      <span v-if="suffix" class="statistic-suffix">{{ suffix }}</span>
    </div>
    <div v-if="trend && trendValue" class="statistic-trend" :class="trend">
      <svg v-if="trend === 'up'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      <span>{{ trendValue }}</span>
    </div>
  </div>
</template>

<style scoped>
.statistic { }
.statistic-title { font-size: 13px; color: #6b6b6b; margin-bottom: 4px; }
.statistic-content { display: flex; align-items: baseline; gap: 4px; }
.statistic-prefix { font-size: 20px; color: #000; }
.statistic-value { font-size: 28px; font-weight: 700; color: #000; }
.statistic-suffix { font-size: 14px; color: #6b6b6b; }
.statistic-trend { display: flex; align-items: center; gap: 4px; font-size: 13px; margin-top: 4px; }
.statistic-trend.up { color: #22c55e; }
.statistic-trend.down { color: #e11900; }
</style>
