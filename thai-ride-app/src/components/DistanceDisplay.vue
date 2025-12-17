<script setup lang="ts">
/**
 * Feature: F230 - Distance Display
 * Display distance with appropriate unit
 */
defineProps<{
  meters: number
  showIcon?: boolean
}>()

const formatDistance = (m: number) => {
  if (m < 1000) return `${Math.round(m)} ม.`
  return `${(m / 1000).toFixed(1)} กม.`
}
</script>

<template>
  <span class="distance-display">
    <svg v-if="showIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
    {{ formatDistance(meters) }}
  </span>
</template>

<style scoped>
.distance-display { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: #6b6b6b; }
</style>
