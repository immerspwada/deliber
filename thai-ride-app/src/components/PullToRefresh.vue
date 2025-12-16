<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const container = ref<HTMLElement | null>(null)
const pullDistance = ref(0)
const isPulling = ref(false)
const isRefreshing = ref(false)

const THRESHOLD = 80
const MAX_PULL = 120

let startY = 0
let currentY = 0

const onTouchStart = (e: TouchEvent) => {
  if (props.loading || isRefreshing.value) return
  if (!container.value) return
  
  // Only trigger if scrolled to top
  const scrollTop = container.value.scrollTop
  if (scrollTop > 0) return
  
  startY = e.touches[0]?.clientY ?? 0
  isPulling.value = true
}

const onTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || props.loading || isRefreshing.value) return
  
  currentY = e.touches[0]?.clientY ?? 0
  const diff = currentY - startY
  
  if (diff > 0) {
    // Apply resistance
    pullDistance.value = Math.min(diff * 0.5, MAX_PULL)
    
    if (pullDistance.value > 10) {
      e.preventDefault()
    }
  }
}

const onTouchEnd = () => {
  if (!isPulling.value) return
  
  isPulling.value = false
  
  if (pullDistance.value >= THRESHOLD && !props.loading) {
    isRefreshing.value = true
    pullDistance.value = 60
    emit('refresh')
    
    // Auto reset after timeout (in case parent doesn't update loading)
    setTimeout(() => {
      if (isRefreshing.value) {
        isRefreshing.value = false
        pullDistance.value = 0
      }
    }, 5000)
  } else {
    pullDistance.value = 0
  }
}

// Watch loading prop to reset state
const resetRefresh = () => {
  if (!props.loading && isRefreshing.value) {
    setTimeout(() => {
      isRefreshing.value = false
      pullDistance.value = 0
    }, 300)
  }
}

onMounted(() => {
  if (container.value) {
    container.value.addEventListener('touchstart', onTouchStart, { passive: true })
    container.value.addEventListener('touchmove', onTouchMove, { passive: false })
    container.value.addEventListener('touchend', onTouchEnd, { passive: true })
  }
})

onUnmounted(() => {
  if (container.value) {
    container.value.removeEventListener('touchstart', onTouchStart)
    container.value.removeEventListener('touchmove', onTouchMove)
    container.value.removeEventListener('touchend', onTouchEnd)
  }
})

// Expose reset function
defineExpose({ resetRefresh })
</script>

<template>
  <div ref="container" class="pull-container">
    <!-- Pull indicator -->
    <div 
      class="pull-indicator"
      :style="{ 
        transform: `translateY(${pullDistance - 60}px)`,
        opacity: Math.min(pullDistance / THRESHOLD, 1)
      }"
    >
      <div :class="['pull-spinner', { spinning: isRefreshing || loading }]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </div>
      <span class="pull-text">
        {{ isRefreshing || loading ? 'กำลังโหลด...' : pullDistance >= THRESHOLD ? 'ปล่อยเพื่อรีเฟรช' : 'ดึงลงเพื่อรีเฟรช' }}
      </span>
    </div>

    <!-- Content -->
    <div 
      class="pull-content"
      :style="{ transform: `translateY(${pullDistance}px)` }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pull-container {
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

.pull-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 10;
  pointer-events: none;
}

.pull-spinner {
  width: 28px;
  height: 28px;
  color: #000;
  transition: transform 0.2s ease;
}

.pull-spinner svg {
  width: 100%;
  height: 100%;
}

.pull-spinner.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pull-text {
  font-size: 12px;
  color: #6B6B6B;
  font-weight: 500;
}

.pull-content {
  transition: transform 0.2s ease;
  will-change: transform;
}

.pull-container:not(:active) .pull-content {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
