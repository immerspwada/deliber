<script setup lang="ts">
/**
 * Feature: F233 - Share Button
 * Share content via Web Share API or fallback
 */
import { ref } from 'vue'

const props = defineProps<{
  title: string
  text?: string
  url?: string
}>()

const emit = defineEmits<{
  share: []
  fallback: []
}>()

const canShare = ref(typeof navigator !== 'undefined' && !!navigator.share)

const share = async () => {
  if (canShare.value) {
    try {
      await navigator.share({ title: props.title, text: props.text, url: props.url })
      emit('share')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') emit('fallback')
    }
  } else {
    emit('fallback')
  }
}
</script>

<template>
  <button type="button" class="share-button" @click="share">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
    <span>แชร์</span>
  </button>
</template>

<style scoped>
.share-button { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; background: #000; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
.share-button:hover { background: #333; }
</style>
