<script setup lang="ts">
/**
 * Feature: F250 - Date Display
 * Display formatted date
 */
defineProps<{
  date: string
  format?: 'short' | 'long' | 'relative'
  showIcon?: boolean
}>()

const formatDate = (d: string, format: string) => {
  const date = new Date(d)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (format === 'relative') {
    if (days === 0) return 'วันนี้'
    if (days === 1) return 'เมื่อวาน'
    if (days < 7) return `${days} วันที่แล้ว`
    if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }
  
  if (format === 'long') {
    return date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
}
</script>

<template>
  <span class="date-display">
    <svg v-if="showIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
    {{ formatDate(date, format || 'short') }}
  </span>
</template>

<style scoped>
.date-display { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: #6b6b6b; }
</style>
