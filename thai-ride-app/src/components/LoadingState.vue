<script setup lang="ts">
/**
 * LoadingState - แสดง loading state ที่สวยงาม
 * รองรับหลาย variants
 */
interface Props {
  /** Loading variant */
  variant?: 'spinner' | 'skeleton' | 'dots' | 'pulse'
  /** Loading message */
  message?: string
  /** Size */
  size?: 'small' | 'medium' | 'large'
  /** Full screen overlay */
  fullscreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'spinner',
  message: '',
  size: 'medium',
  fullscreen: false
})
</script>

<template>
  <div 
    class="loading-state" 
    :class="{ 
      fullscreen, 
      [`size-${size}`]: true,
      [`variant-${variant}`]: true 
    }"
  >
    <div class="loading-content">
      <!-- Spinner -->
      <div v-if="variant === 'spinner'" class="spinner">
        <svg viewBox="0 0 50 50">
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
          />
        </svg>
      </div>
      
      <!-- Dots -->
      <div v-else-if="variant === 'dots'" class="dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      
      <!-- Pulse -->
      <div v-else-if="variant === 'pulse'" class="pulse">
        <div class="pulse-ring"></div>
        <div class="pulse-ring"></div>
        <div class="pulse-ring"></div>
      </div>
      
      <!-- Message -->
      <p v-if="message" class="loading-message">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.loading-state.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  z-index: 9999;
  padding: 0;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* Spinner */
.spinner {
  width: 48px;
  height: 48px;
  color: #00a86b;
}

.size-small .spinner {
  width: 32px;
  height: 32px;
}

.size-large .spinner {
  width: 64px;
  height: 64px;
}

.spinner svg {
  width: 100%;
  height: 100%;
  animation: rotate 1.5s linear infinite;
}

.spinner circle {
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
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
  gap: 8px;
}

.dot {
  width: 12px;
  height: 12px;
  background: #00a86b;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.size-small .dot {
  width: 8px;
  height: 8px;
}

.size-large .dot {
  width: 16px;
  height: 16px;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Pulse */
.pulse {
  position: relative;
  width: 48px;
  height: 48px;
}

.size-small .pulse {
  width: 32px;
  height: 32px;
}

.size-large .pulse {
  width: 64px;
  height: 64px;
}

.pulse-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 3px solid #00a86b;
  border-radius: 50%;
  animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

.pulse-ring:nth-child(2) {
  animation-delay: 0.5s;
}

.pulse-ring:nth-child(3) {
  animation-delay: 1s;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.33);
    opacity: 1;
  }
  80%, 100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* Message */
.loading-message {
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  margin: 0;
}

.size-small .loading-message {
  font-size: 12px;
}

.size-large .loading-message {
  font-size: 16px;
}
</style>
