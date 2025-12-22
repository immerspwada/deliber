<script setup lang="ts">
/**
 * FloatingActionButton - ปุ่มลอยสำหรับ action หลัก
 * MUNEEF Style: สีเขียว #00A86B
 */
import { ref } from 'vue'
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface Props {
  icon?: 'ride' | 'plus' | 'search' | 'sos'
  color?: string
  size?: 'small' | 'medium' | 'large'
  pulse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'ride',
  color: '#00A86B',
  size: 'medium',
  pulse: false
})

const emit = defineEmits<{
  'click': []
}>()

const { vibrate } = useHapticFeedback()
const isPressed = ref(false)

const handleClick = () => {
  vibrate('medium')
  emit('click')
}
</script>

<template>
  <button
    class="fab"
    :class="[size, { pressed: isPressed, pulse }]"
    :style="{ '--fab-color': color }"
    @mousedown="isPressed = true"
    @mouseup="isPressed = false"
    @mouseleave="isPressed = false"
    @touchstart="isPressed = true"
    @touchend="isPressed = false"
    @click="handleClick"
  >
    <!-- Pulse Ring -->
    <span v-if="pulse" class="pulse-ring"></span>
    
    <!-- Icon -->
    <div class="fab-icon">
      <!-- Ride -->
      <svg v-if="icon === 'ride'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"/>
        <path d="M5 17H3v-4l2-5h9l4 5h3v4h-2"/>
      </svg>
      
      <!-- Plus -->
      <svg v-else-if="icon === 'plus'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      
      <!-- Search -->
      <svg v-else-if="icon === 'search'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      
      <!-- SOS -->
      <svg v-else-if="icon === 'sos'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
    </div>
  </button>
</template>

<style scoped>
.fab {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fab-color);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.35);
  transition: all 0.2s ease;
  /* Touch optimizations */
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.fab.small {
  width: 48px;
  height: 48px;
}

.fab.medium {
  width: 56px;
  height: 56px;
}

.fab.large {
  width: 64px;
  height: 64px;
}

.fab:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 168, 107, 0.45);
}

.fab.pressed {
  transform: scale(0.95);
}

/* Touch-specific styles */
@media (hover: none) {
  .fab:hover {
    transform: none;
    box-shadow: 0 4px 16px rgba(0, 168, 107, 0.35);
  }
  
  .fab.pressed {
    transform: scale(0.95);
    box-shadow: 0 2px 8px rgba(0, 168, 107, 0.25);
  }
}

/* Pulse Animation */
.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--fab-color);
  opacity: 0.3;
  animation: fab-pulse 2s ease-in-out infinite;
}

@keyframes fab-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.fab-icon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab.small .fab-icon svg {
  width: 22px;
  height: 22px;
}

.fab.medium .fab-icon svg {
  width: 26px;
  height: 26px;
}

.fab.large .fab-icon svg {
  width: 30px;
  height: 30px;
}

.fab-icon svg {
  color: #FFFFFF;
}
</style>
