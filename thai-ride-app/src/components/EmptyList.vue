<script setup lang="ts">
/**
 * Feature: F252 - Empty List
 * Empty list state component
 */
defineProps<{
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}>()

const defaultIcon = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>'
</script>

<template>
  <div class="empty-list">
    <div class="empty-icon" v-html="icon || defaultIcon" />
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <button v-if="actionLabel && onAction" type="button" class="empty-action" @click="onAction">{{ actionLabel }}</button>
  </div>
</template>

<style scoped>
.empty-list { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; text-align: center; }
.empty-icon { color: #ccc; margin-bottom: 16px; }
.empty-title { font-size: 16px; font-weight: 600; color: #000; margin: 0 0 8px; }
.empty-desc { font-size: 14px; color: #6b6b6b; margin: 0 0 20px; max-width: 280px; }
.empty-action { padding: 12px 24px; background: #000; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; }
.empty-action:hover { background: #333; }
</style>
