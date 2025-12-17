<script setup lang="ts">
/**
 * Feature: F358 - Pull To Refresh
 * Pull to refresh component for mobile
 */
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  loading?: boolean
  threshold?: number
}>(), {
  loading: false,
  threshold: 80
})

const emit = defineEmits<{ (e: 'refresh'): void }>()

const pullDistance = ref(0)
const isPulling = ref(false)
const startY = ref(0)

const onTouchStart = (e: TouchEvent) => {
  if (window.scrollY === 0 && e.touches[0]) {
    startY.value = e.touches[0].clientY
    isPulling.value = true
  }
}

const onTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || !e.touches[0]) return
  const currentY = e.touches[0].clientY
  const diff = currentY - startY.value
  if (diff > 0) {
    pullDistance.value = Math.min(diff * 0.5, props.threshold * 1.5)
  }
}

const onTouchEnd = () => {
  if (pullDistance.value >= props.threshold) {
    emit('refresh')
  }
  pullDistance.value = 0
  isPulling.value = false
}
</script>

<template>
  <div class="pull-to-refresh" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <div class="refresh-indicator" :style="{ height: pullDistance + 'px', opacity: pullDistance / threshold }">
      <div class="indicator-content" :class="{ spinning: loading }">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </div>
    </div>
    <slot></slot>
  </div>
</template>

<style scoped>
.pull-to-refresh { position: relative; }
.refresh-indicator { display: flex; align-items: center; justify-content: center; overflow: hidden; transition: height 0.2s; }
.indicator-content { color: #6b6b6b; }
.indicator-content.spinning { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
