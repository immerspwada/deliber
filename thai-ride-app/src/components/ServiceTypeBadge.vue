<script setup lang="ts">
/**
 * Feature: F238 - Service Type Badge
 * Display service type badge
 */
defineProps<{
  type: 'ride' | 'delivery' | 'shopping'
}>()

const config = {
  ride: { label: 'เรียกรถ', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h14v-5l-2-4H7l-2 4v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>' },
  delivery: { label: 'ส่งของ', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' },
  shopping: { label: 'ซื้อของ', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' }
}
</script>

<template>
  <span class="service-type-badge" :class="type">
    <span class="badge-icon" v-html="config[type].icon" />
    {{ config[type].label }}
  </span>
</template>

<style scoped>
.service-type-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; background: #f6f6f6; color: #000; }
.service-type-badge.ride { background: #e8f0fe; color: #276ef1; }
.service-type-badge.delivery { background: #fef3c7; color: #92400e; }
.service-type-badge.shopping { background: #d1fae5; color: #065f46; }
.badge-icon { display: flex; }
</style>
