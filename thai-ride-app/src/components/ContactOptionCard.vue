<script setup lang="ts">
/**
 * Feature: F225 - Contact Option Card
 * Contact support option card
 */
defineProps<{
  title: string
  description: string
  icon: string
  availability?: string
  responseTime?: string
  onClick?: () => void
}>()
</script>

<template>
  <button type="button" class="contact-option-card" @click="onClick">
    <div class="option-icon" v-html="icon" />
    <div class="option-content">
      <h4 class="option-title">{{ title }}</h4>
      <p class="option-desc">{{ description }}</p>
      <div class="option-meta">
        <span v-if="availability" class="meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {{ availability }}
        </span>
        <span v-if="responseTime" class="meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          {{ responseTime }}
        </span>
      </div>
    </div>
    <svg class="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  </button>
</template>

<style scoped>
.contact-option-card { width: 100%; display: flex; align-items: center; gap: 16px; padding: 16px; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; text-align: left; cursor: pointer; transition: all 0.2s; }
.contact-option-card:hover { border-color: #000; background: #fafafa; }
.option-icon { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; background: #000; border-radius: 14px; color: #fff; flex-shrink: 0; }
.option-content { flex: 1; min-width: 0; }
.option-title { font-size: 15px; font-weight: 600; color: #000; margin: 0 0 4px; }
.option-desc { font-size: 13px; color: #6b6b6b; margin: 0 0 8px; }
.option-meta { display: flex; gap: 12px; }
.meta-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #6b6b6b; }
.arrow-icon { color: #6b6b6b; flex-shrink: 0; }
</style>
