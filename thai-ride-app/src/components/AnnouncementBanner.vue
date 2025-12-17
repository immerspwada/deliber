<script setup lang="ts">
/**
 * Feature: F217 - Announcement Banner
 * System announcement banner
 */
defineProps<{
  title: string
  message: string
  type?: 'info' | 'warning' | 'success' | 'error'
  dismissible?: boolean
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
}>()

const typeConfig = {
  info: { bg: '#f6f6f6', color: '#000', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' },
  warning: { bg: '#fef3c7', color: '#92400e', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
  success: { bg: '#d1fae5', color: '#065f46', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
  error: { bg: '#fee2e2', color: '#991b1b', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' }
}
</script>

<template>
  <div class="announcement-banner" :style="{ background: typeConfig[type || 'info'].bg, color: typeConfig[type || 'info'].color }">
    <span class="banner-icon" v-html="typeConfig[type || 'info'].icon" />
    <div class="banner-content">
      <h4 class="banner-title">{{ title }}</h4>
      <p class="banner-message">{{ message }}</p>
    </div>
    <div class="banner-actions">
      <button v-if="actionLabel && onAction" type="button" class="action-btn" @click="onAction">{{ actionLabel }}</button>
      <button v-if="dismissible && onDismiss" type="button" class="dismiss-btn" @click="onDismiss">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.announcement-banner { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-radius: 12px; }
.banner-icon { flex-shrink: 0; margin-top: 2px; }
.banner-content { flex: 1; min-width: 0; }
.banner-title { font-size: 14px; font-weight: 600; margin: 0 0 2px; }
.banner-message { font-size: 13px; margin: 0; opacity: 0.9; }
.banner-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.action-btn { padding: 6px 14px; background: rgba(0,0,0,0.1); border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; color: inherit; }
.action-btn:hover { background: rgba(0,0,0,0.15); }
.dismiss-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 6px; cursor: pointer; color: inherit; opacity: 0.7; }
.dismiss-btn:hover { opacity: 1; background: rgba(0,0,0,0.1); }
</style>
