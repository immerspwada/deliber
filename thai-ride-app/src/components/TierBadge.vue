<script setup lang="ts">
/**
 * Feature: F244 - Tier Badge
 * Display membership tier badge
 */
defineProps<{
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}>()

const config = {
  bronze: { label: 'Bronze', color: '#cd7f32', bg: '#fef3e2' },
  silver: { label: 'Silver', color: '#6b6b6b', bg: '#f6f6f6' },
  gold: { label: 'Gold', color: '#d4af37', bg: '#fef9e7' },
  platinum: { label: 'Platinum', color: '#4a5568', bg: '#e2e8f0' }
}
</script>

<template>
  <span class="tier-badge" :style="{ color: config[tier].color, background: config[tier].bg }">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
    {{ config[tier].label }}
  </span>
</template>

<style scoped>
.tier-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
</style>
