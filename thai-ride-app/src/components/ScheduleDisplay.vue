<script setup lang="ts">
/**
 * Feature: F246 - Schedule Display
 * Display scheduled date/time
 */
defineProps<{
  date: string
  showIcon?: boolean
}>()

const formatSchedule = (d: string) => {
  const date = new Date(d)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const isToday = date.toDateString() === today.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()
  
  const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  
  if (isToday) return `วันนี้ ${time}`
  if (isTomorrow) return `พรุ่งนี้ ${time}`
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ` ${time}`
}
</script>

<template>
  <span class="schedule-display">
    <svg v-if="showIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
    {{ formatSchedule(date) }}
  </span>
</template>

<style scoped>
.schedule-display { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: #000; }
</style>
