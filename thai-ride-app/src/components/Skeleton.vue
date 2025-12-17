<script setup lang="ts">
/**
 * Feature: F367 - Skeleton
 * Skeleton loading placeholder
 */
withDefaults(defineProps<{
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string
  height?: string
  lines?: number
}>(), {
  variant: 'text',
  width: '100%',
  height: '1em',
  lines: 1
})

const variantStyles = {
  text: { borderRadius: '4px' },
  circular: { borderRadius: '50%' },
  rectangular: { borderRadius: '0' },
  rounded: { borderRadius: '8px' }
}
</script>

<template>
  <div class="skeleton-wrapper">
    <div v-for="i in lines" :key="i" class="skeleton" :style="{ width: i === lines && lines > 1 ? '80%' : width, height, ...variantStyles[variant] }"></div>
  </div>
</template>

<style scoped>
.skeleton-wrapper { display: flex; flex-direction: column; gap: 8px; }
.skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; }
@keyframes skeleton-loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
