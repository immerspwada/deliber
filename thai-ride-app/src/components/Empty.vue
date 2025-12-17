<script setup lang="ts">
/**
 * Feature: F392 - Empty
 * Empty state component
 */
withDefaults(defineProps<{
  description?: string
  image?: 'default' | 'simple' | 'none'
}>(), {
  description: 'ไม่มีข้อมูล',
  image: 'default'
})

const defaultImage = '<svg width="120" height="100" viewBox="0 0 120 100" fill="none"><rect x="20" y="20" width="80" height="60" rx="4" fill="#f6f6f6" stroke="#e5e5e5" stroke-width="2"/><path d="M40 50h40M40 60h25" stroke="#e5e5e5" stroke-width="2" stroke-linecap="round"/><circle cx="60" cy="35" r="8" fill="#e5e5e5"/></svg>'
const simpleImage = '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e5e5e5" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h4"/></svg>'
</script>

<template>
  <div class="empty">
    <div v-if="image !== 'none'" class="empty-image" v-html="image === 'simple' ? simpleImage : defaultImage"></div>
    <p class="empty-description">{{ description }}</p>
    <div class="empty-footer">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; }
.empty-image { margin-bottom: 16px; }
.empty-description { font-size: 14px; color: #6b6b6b; margin: 0 0 16px; }
.empty-footer:empty { display: none; }
</style>
