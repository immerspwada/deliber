<script setup lang="ts">
/**
 * Feature: F363 - Shimmer
 * Shimmer loading effect component
 */
withDefaults(defineProps<{
  width?: string
  height?: string
  borderRadius?: string
  animated?: boolean
}>(), {
  width: '100%',
  height: '20px',
  borderRadius: '4px',
  animated: true
})
</script>

<template>
  <div class="shimmer" :class="{ animated }" :style="{ width, height, borderRadius }"></div>
</template>

<style scoped>
.shimmer { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; }
.shimmer.animated { animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
