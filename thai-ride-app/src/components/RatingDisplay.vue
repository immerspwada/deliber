<script setup lang="ts">
/**
 * Feature: F239 - Rating Display
 * Compact rating display with star
 */
defineProps<{
  rating: number
  count?: number
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <span class="rating-display" :class="size || 'md'">
    <svg viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
    <span class="rating-value">{{ rating.toFixed(1) }}</span>
    <span v-if="count !== undefined" class="rating-count">({{ count }})</span>
  </span>
</template>

<style scoped>
.rating-display { display: inline-flex; align-items: center; gap: 4px; }
.rating-display svg { flex-shrink: 0; }
.rating-display.sm svg { width: 12px; height: 12px; }
.rating-display.md svg { width: 14px; height: 14px; }
.rating-display.lg svg { width: 18px; height: 18px; }
.rating-value { font-weight: 600; color: #000; }
.rating-display.sm .rating-value { font-size: 12px; }
.rating-display.md .rating-value { font-size: 14px; }
.rating-display.lg .rating-value { font-size: 16px; }
.rating-count { color: #6b6b6b; }
.rating-display.sm .rating-count { font-size: 11px; }
.rating-display.md .rating-count { font-size: 12px; }
.rating-display.lg .rating-count { font-size: 14px; }
</style>
