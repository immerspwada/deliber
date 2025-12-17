<script setup lang="ts">
/**
 * Feature: F231 - Duration Display
 * Display duration in human readable format
 */
defineProps<{
  minutes: number
  showIcon?: boolean
}>()

const formatDuration = (mins: number) => {
  if (mins < 60) return `${mins} นาที`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`
}
</script>

<template>
  <span class="duration-display">
    <svg v-if="showIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
    {{ formatDuration(minutes) }}
  </span>
</template>

<style scoped>
.duration-display { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: #6b6b6b; }
</style>
