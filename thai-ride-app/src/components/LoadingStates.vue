<!--
  Feature: F65 - Loading States Component
  
  แสดงสถานะ Loading ต่างๆ
  - Spinner
  - Skeleton
  - Progress
  - Searching animation
-->
<template>
  <div class="loading-container" :class="variant">
    <!-- Spinner -->
    <template v-if="variant === 'spinner'">
      <div class="spinner" :style="{ width: size + 'px', height: size + 'px' }">
        <svg viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke-width="4" />
        </svg>
      </div>
      <span v-if="text" class="loading-text">{{ text }}</span>
    </template>

    <!-- Dots -->
    <template v-else-if="variant === 'dots'">
      <div class="dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span v-if="text" class="loading-text">{{ text }}</span>
    </template>

    <!-- Searching -->
    <template v-else-if="variant === 'searching'">
      <div class="searching-animation">
        <div class="pulse-ring"></div>
        <div class="pulse-ring delay-1"></div>
        <div class="pulse-ring delay-2"></div>
        <div class="center-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/>
            <circle cx="7.5" cy="17" r="1.5"/>
            <circle cx="16.5" cy="17" r="1.5"/>
          </svg>
        </div>
      </div>
      <span v-if="text" class="loading-text">{{ text }}</span>
    </template>

    <!-- Progress -->
    <template v-else-if="variant === 'progress'">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <span v-if="text" class="loading-text">{{ text }}</span>
    </template>

    <!-- Skeleton Card -->
    <template v-else-if="variant === 'skeleton-card'">
      <div class="skeleton-card">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line subtitle"></div>
        </div>
      </div>
    </template>

    <!-- Skeleton List -->
    <template v-else-if="variant === 'skeleton-list'">
      <div class="skeleton-list">
        <div v-for="i in count" :key="i" class="skeleton-item">
          <div class="skeleton-icon"></div>
          <div class="skeleton-content">
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- Full Page -->
    <template v-else-if="variant === 'fullpage'">
      <div class="fullpage-loader">
        <div class="logo-animation">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/>
            <circle cx="7.5" cy="17" r="1.5"/>
            <circle cx="16.5" cy="17" r="1.5"/>
          </svg>
        </div>
        <span v-if="text" class="loading-text">{{ text }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'spinner' | 'dots' | 'searching' | 'progress' | 'skeleton-card' | 'skeleton-list' | 'fullpage'
  size?: number
  text?: string
  progress?: number
  count?: number
}

withDefaults(defineProps<Props>(), {
  variant: 'spinner',
  size: 32,
  progress: 0,
  count: 3
})
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.loading-text {
  font-size: 14px;
  color: #6b6b6b;
}

/* Spinner */
.spinner svg {
  animation: rotate 1.5s linear infinite;
}

.spinner circle {
  stroke: #00A86B;
  stroke-linecap: round;
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% { transform: rotate(360deg); }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

/* Dots */
.dots {
  display: flex;
  gap: 6px;
}

.dots span {
  width: 8px;
  height: 8px;
  background: #00A86B;
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.dots span:nth-child(1) { animation-delay: -0.32s; }
.dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Searching Animation */
.searching-animation {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid #00A86B;
  border-radius: 50%;
  animation: pulse-ring 2s ease-out infinite;
  opacity: 0;
}

.pulse-ring.delay-1 { animation-delay: 0.5s; }
.pulse-ring.delay-2 { animation-delay: 1s; }

@keyframes pulse-ring {
  0% {
    transform: scale(0.3);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

.center-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  border-radius: 50%;
  color: #ffffff;
  z-index: 1;
}

/* Progress */
.progress-bar {
  width: 200px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Skeleton */
.skeleton-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  width: 100%;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-line.title {
  width: 60%;
}

.skeleton-line.subtitle {
  width: 40%;
  height: 12px;
}

.skeleton-line.short {
  width: 50%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Skeleton List */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.skeleton-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
}

.skeleton-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(90deg, #e5e5e5 25%, #d5d5d5 50%, #e5e5e5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* Full Page */
.fullpage-loader {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #ffffff;
  z-index: 9999;
}

.logo-animation {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  border-radius: 20px;
  color: #ffffff;
  animation: logo-pulse 1.5s ease-in-out infinite;
}

@keyframes logo-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
</style>
