<script setup lang="ts">
/**
 * Feature: F226 - Verification Badge
 * Display verification status badge
 */
defineProps<{
  status: 'verified' | 'pending' | 'unverified' | 'rejected'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}>()

const config = {
  verified: { label: 'ยืนยันแล้ว', color: '#10b981', bg: '#d1fae5', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' },
  pending: { label: 'รอตรวจสอบ', color: '#f59e0b', bg: '#fef3c7', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
  unverified: { label: 'ยังไม่ยืนยัน', color: '#6b6b6b', bg: '#f6f6f6', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' },
  rejected: { label: 'ไม่ผ่าน', color: '#ef4444', bg: '#fee2e2', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' }
}
</script>

<template>
  <span class="verification-badge" :class="[status, size || 'md']" :style="{ color: config[status].color, background: config[status].bg }">
    <span class="badge-icon" v-html="config[status].icon" />
    <span v-if="showLabel" class="badge-label">{{ config[status].label }}</span>
  </span>
</template>

<style scoped>
.verification-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 12px; font-weight: 500; }
.verification-badge.sm { padding: 2px 6px; font-size: 10px; }
.verification-badge.md { padding: 4px 10px; font-size: 12px; }
.verification-badge.lg { padding: 6px 12px; font-size: 14px; }
.badge-icon { display: flex; align-items: center; }
</style>
