<script setup lang="ts">
/**
 * Feature: F232 - Copy Button
 * Copy text to clipboard button
 */
import { ref } from 'vue'

defineProps<{
  text: string
  label?: string
}>()

const copied = ref(false)

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (e) {
    console.error('Copy failed', e)
  }
}
</script>

<template>
  <button type="button" class="copy-button" :class="{ copied }" @click="copy(text)">
    <svg v-if="!copied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span v-if="label">{{ copied ? 'คัดลอกแล้ว' : label }}</span>
  </button>
</template>

<style scoped>
.copy-button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: #f6f6f6; border: none; border-radius: 8px; font-size: 13px; color: #000; cursor: pointer; transition: all 0.2s; }
.copy-button:hover { background: #e5e5e5; }
.copy-button.copied { background: #d1fae5; color: #10b981; }
</style>
