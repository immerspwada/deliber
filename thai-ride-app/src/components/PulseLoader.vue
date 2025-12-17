<script setup lang="ts">
/**
 * Feature: F229 - Pulse Loader
 * Animated pulse loading indicator
 */
defineProps<{
  size?: 'sm' | 'md' | 'lg'
  color?: string
}>()
</script>

<template>
  <div class="pulse-loader" :class="size || 'md'">
    <span class="pulse-dot" :style="{ background: color || '#000' }" />
    <span class="pulse-dot" :style="{ background: color || '#000' }" />
    <span class="pulse-dot" :style="{ background: color || '#000' }" />
  </div>
</template>

<style scoped>
.pulse-loader { display: flex; align-items: center; gap: 4px; }
.pulse-dot { border-radius: 50%; animation: pulse 1.4s ease-in-out infinite; }
.pulse-dot:nth-child(1) { animation-delay: 0s; }
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }
.pulse-loader.sm .pulse-dot { width: 6px; height: 6px; }
.pulse-loader.md .pulse-dot { width: 8px; height: 8px; }
.pulse-loader.lg .pulse-dot { width: 12px; height: 12px; }
@keyframes pulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
</style>
