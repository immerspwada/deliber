<script setup lang="ts">
/**
 * Feature: F242 - Promotion Badge
 * Display promotion/discount badge
 */
defineProps<{
  type: 'percentage' | 'fixed' | 'free'
  value?: number
  label?: string
}>()
</script>

<template>
  <span class="promotion-badge">
    <template v-if="type === 'percentage'">-{{ value }}%</template>
    <template v-else-if="type === 'fixed'">-฿{{ value }}</template>
    <template v-else>{{ label || 'ฟรี' }}</template>
  </span>
</template>

<style scoped>
.promotion-badge { display: inline-block; padding: 4px 10px; background: #ef4444; color: #fff; font-size: 12px; font-weight: 700; border-radius: 6px; }
</style>
