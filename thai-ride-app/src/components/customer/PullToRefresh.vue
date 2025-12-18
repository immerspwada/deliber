<script setup lang="ts">
/**
 * PullToRefresh - Enhanced Pull-to-Refresh Component
 * 
 * Pull-to-refresh ที่ลื่นไหลพร้อม haptic feedback
 * MUNEEF Style: สีเขียว #00A86B, animations นุ่มนวล
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useHapticFeedback } from '../../composables/useHapticFeedback'
import { quickTrack } from '../../composables/useUXTracking'

interface Props {
  threshold?: number
  maxPull?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 80,
  maxPull: 120,
  disabled: false
})

const emit = defineEmits<{
  'refresh': []
}>()

const haptic = useHapticFeedback()

const containerRef = ref<HTMLElement | null>(null)
const pullDistance = ref(0)
const isPulling = ref(false)
const isRefreshing = ref(false)
const startY = ref(0)
const hasTriggeredHaptic = ref(false)

const pullProgress = computed(() => {
  return Math.min(pullDistance.value / props.threshold, 1)
})

const indicatorStyle = computed(() => ({
  transform: `translateY(${pullDistance.value - 60}px)`,
  opacity: pullProgress.value
}))

const spinnerRotation = computed(() => {
  if (isRefreshing.value) return 0
  return pullProgress.value * 180
})

const statusText = computed(() => {
  if (isRefreshing.value) return 'กำลังโหลด...'
  if (pullDistance.value >= props.threshold) return 'ปล่อยเพื่อรีเฟรช'
  return 'ดึงลงเพื่อรีเฟรช'
})

const handleTouchStart = (e: TouchEvent) => {
  if (props.disabled || isRefreshing.value) return
  
  const scrollTop = containerRef.value?.scrollTop || 0
  if (scrollTop <= 0 && e.touches[0]) {
    startY.value = e.touches[0].clientY
    isPulling.value = true
    hasTriggeredHaptic.value = false
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || isRefreshing.value || !e.touches[0]) return
  
  const currentY = e.touches[0].clientY
  const diff = currentY - startY.value
  
  if (diff > 0) {
    // Apply resistance
    const resistance = 0.5
    pullDistance.value = Math.min(diff * resistance, props.maxPull)
    
    // Prevent scroll
    if (pullDistance.value > 10) {
      e.preventDefault()
    }
    
    // Haptic feedback at threshold
    if (pullDistance.value >= props.threshold && !hasTriggeredHaptic.value) {
      haptic.medium()
      hasTriggeredHaptic.value = true
    } else if (pullDistance.value < props.threshold && hasTriggeredHaptic.value) {
      hasTriggeredHaptic.value = false
    }
  }
}

const handleTouchEnd = async () => {
  if (!isPulling.value) return
  
  const pullStartTime = Date.now() - (pullDistance.value > 0 ? 500 : 0) // Approximate pull duration
  const success = pullDistance.value >= props.threshold && !isRefreshing.value
  
  isPulling.value = false
  
  if (success) {
    isRefreshing.value = true
    pullDistance.value = props.threshold
    haptic.success()
    
    // Track successful pull-to-refresh
    quickTrack('pull_to_refresh', 'gesture', { 
      success: true, 
      durationMs: Date.now() - pullStartTime,
      threshold: props.threshold
    })
    
    emit('refresh')
  } else {
    // Track cancelled pull-to-refresh
    if (pullDistance.value > 10) {
      quickTrack('pull_to_refresh', 'gesture', { 
        success: false, 
        durationMs: Date.now() - pullStartTime,
        pullDistance: pullDistance.value,
        threshold: props.threshold
      })
    }
    pullDistance.value = 0
  }
}

const completeRefresh = () => {
  isRefreshing.value = false
  pullDistance.value = 0
}

// Expose method to parent
defineExpose({
  completeRefresh
})

onMounted(() => {
  const el = containerRef.value
  if (!el) return
  
  el.addEventListener('touchstart', handleTouchStart, { passive: true })
  el.addEventListener('touchmove', handleTouchMove, { passive: false })
  el.addEventListener('touchend', handleTouchEnd, { passive: true })
})

onUnmounted(() => {
  const el = containerRef.value
  if (!el) return
  
  el.removeEventListener('touchstart', handleTouchStart)
  el.removeEventListener('touchmove', handleTouchMove)
  el.removeEventListener('touchend', handleTouchEnd)
})
</script>

<template>
  <div ref="containerRef" class="pull-to-refresh-container">
    <!-- Pull Indicator -->
    <div 
      class="pull-indicator" 
      :class="{ visible: pullDistance > 0, refreshing: isRefreshing }"
      :style="indicatorStyle"
    >
      <div class="indicator-content">
        <!-- Spinner -->
        <div 
          class="pull-spinner" 
          :class="{ spinning: isRefreshing }"
          :style="{ transform: `rotate(${spinnerRotation}deg)` }"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 11-6.219-8.56"/>
          </svg>
        </div>
        
        <!-- Progress Ring (when pulling) -->
        <svg v-if="!isRefreshing" class="progress-ring" viewBox="0 0 36 36">
          <circle 
            cx="18" 
            cy="18" 
            r="16" 
            fill="none" 
            stroke="#E8E8E8" 
            stroke-width="2"
          />
          <circle 
            cx="18" 
            cy="18" 
            r="16" 
            fill="none" 
            stroke="#00A86B" 
            stroke-width="2"
            stroke-linecap="round"
            :stroke-dasharray="`${pullProgress * 100}, 100`"
            transform="rotate(-90 18 18)"
          />
        </svg>
        
        <!-- Status Text -->
        <span class="status-text">{{ statusText }}</span>
      </div>
    </div>
    
    <!-- Content -->
    <div class="pull-content" :style="{ transform: `translateY(${pullDistance}px)` }">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.pull-to-refresh-container {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  -webkit-overflow-scrolling: touch;
}

.pull-indicator {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-60px);
  z-index: 100;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.pull-indicator.visible {
  opacity: 1;
}

.indicator-content {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: #FFFFFF;
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.pull-spinner {
  width: 24px;
  height: 24px;
  color: #00A86B;
  transition: transform 0.1s ease;
}

.pull-spinner.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pull-spinner svg {
  width: 100%;
  height: 100%;
}

.progress-ring {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
}

.status-text {
  font-size: 13px;
  font-weight: 500;
  color: #666666;
  white-space: nowrap;
}

.pull-content {
  transition: transform 0.1s ease;
  will-change: transform;
}

.pull-indicator.refreshing + .pull-content {
  transition: transform 0.3s ease;
}
</style>
