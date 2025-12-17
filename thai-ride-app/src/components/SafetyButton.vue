<script setup lang="ts">
/**
 * Feature: F134 - Safety Button (SOS)
 * Emergency SOS button component
 */
import { ref } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

withDefaults(defineProps<Props>(), {
  size: 'md',
  showLabel: true
})

const emit = defineEmits<{
  activate: []
}>()

const isPressed = ref(false)
const pressTimer = ref<number>()
const progress = ref(0)

const HOLD_DURATION = 3000

const startPress = () => {
  isPressed.value = true
  progress.value = 0
  
  const startTime = Date.now()
  const animate = () => {
    const elapsed = Date.now() - startTime
    progress.value = Math.min((elapsed / HOLD_DURATION) * 100, 100)
    
    if (progress.value >= 100) {
      emit('activate')
      cancelPress()
    } else if (isPressed.value) {
      pressTimer.value = requestAnimationFrame(animate)
    }
  }
  pressTimer.value = requestAnimationFrame(animate)
}

const cancelPress = () => {
  isPressed.value = false
  progress.value = 0
  if (pressTimer.value) {
    cancelAnimationFrame(pressTimer.value)
  }
}
</script>

<template>
  <div class="safety-button-wrapper" :class="size">
    <button
      type="button"
      class="safety-button"
      :class="{ pressed: isPressed }"
      @mousedown="startPress"
      @mouseup="cancelPress"
      @mouseleave="cancelPress"
      @touchstart.prevent="startPress"

      @touchend="cancelPress"
    >
      <svg class="progress-ring" viewBox="0 0 100 100">
        <circle class="ring-bg" cx="50" cy="50" r="45" />
        <circle 
          class="ring-progress" 
          cx="50" cy="50" r="45"
          :style="{ strokeDashoffset: 283 - (283 * progress / 100) }"
        />
      </svg>
      <div class="button-content">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>
        <span class="sos-text">SOS</span>
      </div>
    </button>
    <span v-if="showLabel" class="safety-label">
      {{ isPressed ? 'กดค้างไว้...' : 'กดค้าง 3 วินาที' }}
    </span>
  </div>
</template>

<style scoped>
.safety-button-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.safety-button {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #e11900;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: transform 0.2s, box-shadow 0.2s;
}

.safety-button:hover {
  transform: scale(1.05);
}

.safety-button.pressed {
  transform: scale(0.95);
  box-shadow: 0 0 0 8px rgba(225, 25, 0, 0.2);
}

.progress-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.2);
  stroke-width: 4;
}

.ring-progress {
  fill: none;
  stroke: #fff;
  stroke-width: 4;
  stroke-dasharray: 283;
  stroke-dashoffset: 283;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s;
}

.button-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  z-index: 1;
}

.sos-text {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
}

.safety-label {
  font-size: 13px;
  color: #6b6b6b;
}

/* Sizes */
.sm .safety-button { width: 64px; height: 64px; }
.sm .button-content svg { width: 20px; height: 20px; }
.sm .sos-text { font-size: 10px; }

.lg .safety-button { width: 120px; height: 120px; }
.lg .button-content svg { width: 40px; height: 40px; }
.lg .sos-text { font-size: 18px; }
</style>
