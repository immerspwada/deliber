<script setup lang="ts">
/**
 * Shopping Notification Component
 * Toast notification with icon, animation, and haptic feedback
 */
import { ref, watch, onMounted } from 'vue'

interface Props {
  show: boolean
  type?: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 4000,
  icon: ''
})

const emit = defineEmits<{
  close: []
}>()

const isVisible = ref(false)
let timeoutId: number | null = null

watch(() => props.show, (newVal) => {
  if (newVal) {
    isVisible.value = true
    
    // Auto close after duration
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => {
      close()
    }, props.duration)
  }
})

const close = () => {
  isVisible.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}

const getIcon = () => {
  if (props.icon) return props.icon
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  return icons[props.type]
}

const getColor = () => {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  }
  return colors[props.type]
}

onMounted(() => {
  if (props.show) {
    isVisible.value = true
  }
})
</script>

<template>
  <Transition name="notification">
    <div
      v-if="isVisible"
      class="notification-toast"
      :class="[getColor(), `notification-${type}`]"
      @click="close"
    >
      <div class="notification-icon">
        {{ getIcon() }}
      </div>
      <div class="notification-content">
        <p class="notification-message">{{ message }}</p>
      </div>
      <button
        class="notification-close"
        type="button"
        aria-label="ปิด"
        @click.stop="close"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.notification-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  color: white;
  max-width: 90vw;
  min-width: 280px;
  backdrop-filter: blur(10px);
}

.notification-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
}

.notification-message {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  margin: 0;
}

.notification-close {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.notification-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.notification-close svg {
  width: 14px;
  height: 14px;
}

/* Animations */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.95);
}

/* Type-specific styles */
.notification-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.notification-error {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.notification-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.notification-info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}
</style>
