<script setup lang="ts">
/**
 * Feature: F253 - Error Message
 * Display error message with retry option
 */
defineProps<{
  title?: string
  message: string
  retryLabel?: string
  onRetry?: () => void
}>()
</script>

<template>
  <div class="error-message">
    <div class="error-icon">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>
    <h4 v-if="title" class="error-title">{{ title }}</h4>
    <p class="error-text">{{ message }}</p>
    <button v-if="onRetry" type="button" class="retry-btn" @click="onRetry">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
      </svg>
      {{ retryLabel || 'ลองอีกครั้ง' }}
    </button>
  </div>
</template>

<style scoped>
.error-message { display: flex; flex-direction: column; align-items: center; padding: 32px 24px; text-align: center; }
.error-icon { color: #ef4444; margin-bottom: 16px; }
.error-title { font-size: 16px; font-weight: 600; color: #000; margin: 0 0 8px; }
.error-text { font-size: 14px; color: #6b6b6b; margin: 0 0 20px; }
.retry-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #f6f6f6; border: none; border-radius: 8px; font-size: 14px; color: #000; cursor: pointer; }
.retry-btn:hover { background: #e5e5e5; }
</style>
