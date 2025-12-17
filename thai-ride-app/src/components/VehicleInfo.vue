<script setup lang="ts">
/**
 * Feature: F247 - Vehicle Info
 * Compact vehicle info display
 */
defineProps<{
  plateNumber: string
  model: string
  color: string
}>()
</script>

<template>
  <div class="vehicle-info">
    <span class="plate-number">{{ plateNumber }}</span>
    <span class="vehicle-details">{{ model }} - {{ color }}</span>
  </div>
</template>

<style scoped>
.vehicle-info { display: flex; flex-direction: column; gap: 2px; }
.plate-number { font-size: 16px; font-weight: 700; color: #000; letter-spacing: 0.5px; }
.vehicle-details { font-size: 13px; color: #6b6b6b; }
</style>
