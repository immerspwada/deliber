<script setup lang="ts">
/**
 * Feature: F224 - Help Category Card
 * Help center category card
 */
defineProps<{
  title: string
  description?: string
  icon: string
  articleCount?: number
  onClick?: () => void
}>()
</script>

<template>
  <button type="button" class="help-category-card" @click="onClick">
    <div class="category-icon" v-html="icon" />
    <div class="category-content">
      <h4 class="category-title">{{ title }}</h4>
      <p v-if="description" class="category-desc">{{ description }}</p>
      <span v-if="articleCount" class="article-count">{{ articleCount }} บทความ</span>
    </div>
    <svg class="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  </button>
</template>

<style scoped>
.help-category-card { width: 100%; display: flex; align-items: center; gap: 16px; padding: 16px; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; text-align: left; cursor: pointer; transition: all 0.2s; }
.help-category-card:hover { border-color: #000; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.category-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #f6f6f6; border-radius: 12px; color: #000; flex-shrink: 0; }
.category-content { flex: 1; min-width: 0; }
.category-title { font-size: 15px; font-weight: 600; color: #000; margin: 0 0 4px; }
.category-desc { font-size: 13px; color: #6b6b6b; margin: 0 0 6px; }
.article-count { font-size: 12px; color: #6b6b6b; }
.arrow-icon { color: #6b6b6b; flex-shrink: 0; }
</style>
