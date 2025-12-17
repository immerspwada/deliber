<script setup lang="ts">
/**
 * Feature: F254 - Success Message
 * Display success message
 */
defineProps<{
  title?: string
  message: string
  actionLabel?: string
  onAction?: () => void
}>()
</script>

<template>
  <div class="success-message">
    <div class="success-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>
    <h4 v-if="title" class="success-title">{{ title }}</h4>
    <p class="success-text">{{ message }}</p>
    <button v-if="actionLabel && onAction" type="button" class="action-btn" @click="onAction">{{ actionLabel }}</button>
  </div>
</template>

<style scoped>
.success-message { display: flex; flex-direction: column; align-items: center; padding: 32px 24px; text-align: center; }
.success-icon { color: #10b981; margin-bottom: 16px; }
.success-title { font-size: 18px; font-weight: 600; color: #000; margin: 0 0 8px; }
.success-text { font-size: 14px; color: #6b6b6b; margin: 0 0 20px; }
.action-btn { padding: 12px 24px; background: #000; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.action-btn:hover { background: #333; }
</style>
