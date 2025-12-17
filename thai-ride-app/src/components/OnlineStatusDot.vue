<script setup lang="ts">
/**
 * Feature: F227 - Online Status Dot
 * Display online/offline status indicator
 */
defineProps<{
  online: boolean
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}>()
</script>

<template>
  <span class="online-status-dot" :class="[{ online, pulse: pulse && online }, size || 'md']" />
</template>

<style scoped>
.online-status-dot { display: inline-block; border-radius: 50%; background: #ccc; }
.online-status-dot.online { background: #10b981; }
.online-status-dot.sm { width: 8px; height: 8px; }
.online-status-dot.md { width: 10px; height: 10px; }
.online-status-dot.lg { width: 14px; height: 14px; }
.online-status-dot.pulse { animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>
