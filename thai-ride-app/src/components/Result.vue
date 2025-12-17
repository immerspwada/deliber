<script setup lang="ts">
/**
 * Feature: F390 - Result
 * Result/status page component
 */
withDefaults(defineProps<{
  status: 'success' | 'error' | 'warning' | 'info'
  title: string
  subtitle?: string
}>(), {})

const icons = {
  success: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>',
  error: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e11900" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
  warning: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#276EF1" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
}
</script>

<template>
  <div class="result">
    <div class="result-icon" v-html="icons[status]"></div>
    <h2 class="result-title">{{ title }}</h2>
    <p v-if="subtitle" class="result-subtitle">{{ subtitle }}</p>
    <div class="result-actions">
      <slot name="actions"></slot>
    </div>
    <div class="result-extra">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.result { text-align: center; padding: 48px 24px; }
.result-icon { margin-bottom: 24px; }
.result-title { font-size: 24px; font-weight: 600; color: #000; margin: 0 0 8px; }
.result-subtitle { font-size: 14px; color: #6b6b6b; margin: 0 0 24px; }
.result-actions { display: flex; justify-content: center; gap: 12px; margin-bottom: 24px; }
.result-extra { text-align: left; }
</style>
