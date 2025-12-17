<script setup lang="ts">
/**
 * Feature: F360 - Infinite Scroll
 * Infinite scroll loader component
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  loading?: boolean
  hasMore?: boolean
  threshold?: number
}>(), {
  loading: false,
  hasMore: true,
  threshold: 100
})

const emit = defineEmits<{ (e: 'loadMore'): void }>()

const sentinel = ref<HTMLElement>()

let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && !props.loading && props.hasMore) {
        emit('loadMore')
      }
    },
    { rootMargin: `${props.threshold}px` }
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="infinite-scroll">
    <slot></slot>
    <div ref="sentinel" class="sentinel">
      <div v-if="loading" class="loading-indicator">
        <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span>กำลังโหลด...</span>
      </div>
      <div v-else-if="!hasMore" class="end-message">
        <span>ไม่มีข้อมูลเพิ่มเติม</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.infinite-scroll { position: relative; }
.sentinel { padding: 20px; text-align: center; }
.loading-indicator { display: flex; align-items: center; justify-content: center; gap: 8px; color: #6b6b6b; font-size: 14px; }
.spinner { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.end-message { color: #6b6b6b; font-size: 13px; }
</style>
