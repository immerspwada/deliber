<script setup lang="ts">
/**
 * Feature: F241 - Trip Type Icon
 * Display trip type icon
 */
defineProps<{
  type: 'standard' | 'premium' | 'xl' | 'motorcycle'
  size?: number
}>()
</script>

<template>
  <div class="trip-type-icon" :style="{ width: `${size || 40}px`, height: `${size || 40}px` }">
    <svg v-if="type === 'standard'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
    </svg>
    <svg v-else-if="type === 'premium'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M4 17h16v-6l-3-5H7l-3 5v6z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M7 11h10"/>
    </svg>
    <svg v-else-if="type === 'xl'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="2" y="8" width="20" height="10" rx="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M2 12h20"/>
    </svg>
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M5 17h6l4-7h4"/>
    </svg>
  </div>
</template>

<style scoped>
.trip-type-icon { display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 10px; color: #000; }
.trip-type-icon svg { width: 60%; height: 60%; }
</style>
