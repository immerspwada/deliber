<script setup lang="ts">
/**
 * Component: PullToRefreshIndicator
 * Visual indicator for pull-to-refresh action
 */
import { computed } from 'vue'

const props = defineProps<{
  pullDistance: number
  isRefreshing: boolean
  canRelease: boolean
  progress: number
}>()

// Computed styles
const indicatorStyle = computed(() => ({
  transform: `translateY(${Math.min(props.pullDistance, 60)}px)`,
  opacity: props.pullDistance > 10 ? 1 : 0
}))

const spinnerRotation = computed(() => {
  if (props.isRefreshing) return 0
  return (props.progress / 100) * 360
})

const spinnerStyle = computed(() => ({
  transform: `rotate(${spinnerRotation.value}deg)`
}))
</script>

<template>
  <div 
    class="pull-indicator"
    :class="{ 
      visible: pullDistance > 10,
      'can-release': canRelease,
      refreshing: isRefreshing
    }"
    :style="indicatorStyle"
  >
    <div class="indicator-content">
      <!-- Spinner -->
      <div class="spinner-wrapper" :style="spinnerStyle">
        <svg 
          class="spinner" 
          :class="{ spinning: isRefreshing }"
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2.5"
        >
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      </div>
      
      <!-- Text -->
      <Transition name="fade" mode="out-in">
        <span v-if="isRefreshing" key="refreshing" class="indicator-text">
          กำลังรีเฟรช...
        </span>
        <span v-else-if="canRelease" key="release" class="indicator-text">
          ปล่อยเพื่อรีเฟรช
        </span>
        <span v-else key="pull" class="indicator-text">
          ดึงลงเพื่อรีเฟรช
        </span>
      </Transition>
    </div>
    
    <!-- Progress bar -->
    <div class="progress-bar">
      <div 
        class="progress-fill" 
        :style="{ width: `${progress}%` }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.pull-indicator {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: calc(env(safe-area-inset-top) + 8px);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.pull-indicator.visible {
  opacity: 1;
}

.indicator-content {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  padding: 10px 18px;
  border-radius: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.spinner-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
}

.spinner {
  color: #00a86b;
}

.spinner.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.indicator-text {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.pull-indicator.can-release .indicator-text {
  color: #00a86b;
}

.pull-indicator.can-release .spinner {
  color: #00a86b;
}

.progress-bar {
  width: 60px;
  height: 3px;
  background: rgba(0, 168, 107, 0.2);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #00a86b;
  border-radius: 2px;
  transition: width 0.1s ease;
}

.pull-indicator.refreshing .progress-fill {
  width: 100% !important;
  animation: progress-pulse 1s ease-in-out infinite;
}

@keyframes progress-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
