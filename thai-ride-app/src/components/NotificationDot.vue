<script setup lang="ts">
/**
 * Feature: F245 - Notification Dot
 * Simple notification indicator dot
 */
defineProps<{
  count?: number
  max?: number
  show?: boolean
}>()
</script>

<template>
  <span v-if="show !== false && (count === undefined || count > 0)" class="notification-dot" :class="{ 'has-count': count !== undefined }">
    <template v-if="count !== undefined">
      {{ count > (max || 99) ? `${max || 99}+` : count }}
    </template>
  </span>
</template>

<style scoped>
.notification-dot { display: inline-flex; align-items: center; justify-content: center; min-width: 8px; height: 8px; background: #ef4444; border-radius: 50%; }
.notification-dot.has-count { min-width: 18px; height: 18px; padding: 0 5px; font-size: 10px; font-weight: 600; color: #fff; }
</style>
