<script setup lang="ts">
/**
 * Feature: F223 - FAQ Item
 * Expandable FAQ item
 */
import { ref } from 'vue'

defineProps<{
  question: string
  answer: string
  category?: string
}>()

const isExpanded = ref(false)
</script>

<template>
  <div class="faq-item" :class="{ expanded: isExpanded }">
    <button type="button" class="faq-question" @click="isExpanded = !isExpanded">
      <span class="question-text">{{ question }}</span>
      <svg class="expand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
    <div class="faq-answer">
      <p>{{ answer }}</p>
      <span v-if="category" class="faq-category">{{ category }}</span>
    </div>
  </div>
</template>

<style scoped>
.faq-item { background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden; }
.faq-question { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; background: transparent; border: none; text-align: left; cursor: pointer; }
.faq-question:hover { background: #fafafa; }
.question-text { font-size: 14px; font-weight: 500; color: #000; flex: 1; }
.expand-icon { color: #6b6b6b; transition: transform 0.2s; flex-shrink: 0; }
.faq-item.expanded .expand-icon { transform: rotate(180deg); }
.faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.3s, padding 0.3s; }
.faq-item.expanded .faq-answer { max-height: 500px; padding: 0 16px 16px; }
.faq-answer p { font-size: 14px; color: #6b6b6b; margin: 0; line-height: 1.6; }
.faq-category { display: inline-block; margin-top: 12px; font-size: 11px; color: #6b6b6b; background: #f6f6f6; padding: 4px 10px; border-radius: 10px; }
</style>
