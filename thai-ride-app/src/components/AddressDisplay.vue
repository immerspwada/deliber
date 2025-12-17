<script setup lang="ts">
/**
 * Feature: F249 - Address Display
 * Display formatted address
 */
defineProps<{
  address: string
  label?: string
  type?: 'pickup' | 'dropoff' | 'default'
  compact?: boolean
}>()
</script>

<template>
  <div class="address-display" :class="[type || 'default', { compact }]">
    <span v-if="!compact" class="address-dot" />
    <div class="address-content">
      <span v-if="label" class="address-label">{{ label }}</span>
      <span class="address-text">{{ address }}</span>
    </div>
  </div>
</template>

<style scoped>
.address-display { display: flex; align-items: flex-start; gap: 10px; }
.address-display.compact { gap: 6px; }
.address-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; background: #6b6b6b; }
.address-display.pickup .address-dot { background: #10b981; }
.address-display.dropoff .address-dot { background: #ef4444; }
.address-content { flex: 1; min-width: 0; }
.address-label { display: block; font-size: 11px; color: #6b6b6b; margin-bottom: 2px; }
.address-text { font-size: 14px; color: #000; display: block; }
.address-display.compact .address-text { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
