<script setup lang="ts">
/**
 * Feature: F243 - Points Display
 * Display loyalty points
 */
defineProps<{
  points: number
  label?: string
  showIcon?: boolean
}>()
</script>

<template>
  <span class="points-display">
    <svg v-if="showIcon" width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
    <span class="points-value">{{ points.toLocaleString() }}</span>
    <span v-if="label" class="points-label">{{ label }}</span>
  </span>
</template>

<style scoped>
.points-display { display: inline-flex; align-items: center; gap: 4px; }
.points-value { font-size: 16px; font-weight: 700; color: #f59e0b; }
.points-label { font-size: 12px; color: #6b6b6b; }
</style>
