<script setup lang="ts">
/**
 * StatusUpdateBanner - Animated banner showing status updates
 * F175 - Cross-Role Integration
 * Slides in from top when status changes, auto-dismisses after 5 seconds
 * Different colors for different statuses (matched=blue, arrived=green, etc.)
 * MUNEEF Style: Primary #00A86B, border-radius 12px
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCrossRoleEvents, type StatusChangedPayload } from '@/lib/crossRoleEventBus'

// Props
interface Props {
  status: string
  serviceType: string
  providerName?: string
  autoDismiss?: boolean
  dismissDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  providerName: 'ผู้ให้บริการ',
  autoDismiss: true,
  dismissDelay: 5000
})

// Emits
const emit = defineEmits<{
  'status-change': [status: string]
  'dismiss': []
}>()

const { subscribe } = useCrossRoleEvents()

// State
const isVisible = ref(false)
const currentStatus = ref<string>(props.status)
const isAnimating = ref(false)
let dismissTimer: ReturnType<typeof setTimeout> | null = null

// Status configuration with colors and messages
type StatusConfig = {
  icon: string
  color: string
  bgColor: string
  borderColor: string
  message: string
}

const statusConfig: Record<string, StatusConfig> = {
  pending: {
    icon: 'search',
    color: '#F5A623',
    bgColor: '#FFF8E8',
    borderColor: '#FFE4B5',
    message: 'กำลังหาผู้ให้บริการ...'
  },
  matched: {
    icon: 'user-check',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    borderColor: '#90CAF9',
    message: `${props.providerName} รับงานแล้ว!`
  },
  arriving: {
    icon: 'car',
    color: '#00A86B',
    bgColor: '#E8F5EF',
    borderColor: '#A5D6A7',
    message: `${props.providerName} กำลังมาหาคุณ`
  },
  arrived: {
    icon: 'map-pin',
    color: '#00A86B',
    bgColor: '#E8F5EF',
    borderColor: '#A5D6A7',
    message: `${props.providerName} ถึงแล้ว!`
  },
  picked_up: {
    icon: 'check-circle',
    color: '#00A86B',
    bgColor: '#E8F5EF',
    borderColor: '#A5D6A7',
    message: 'รับแล้ว กำลังเดินทาง'
  },
  in_progress: {
    icon: 'navigation',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    borderColor: '#90CAF9',
    message: 'กำลังดำเนินการ'
  },
  delivering: {
    icon: 'package',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    borderColor: '#90CAF9',
    message: 'กำลังจัดส่ง'
  },
  shopping: {
    icon: 'shopping-cart',
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    borderColor: '#CE93D8',
    message: 'กำลังซื้อของให้คุณ'
  },
  loading: {
    icon: 'box',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    borderColor: '#90CAF9',
    message: 'กำลังขนของขึ้นรถ'
  },
  in_transit: {
    icon: 'truck',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    borderColor: '#90CAF9',
    message: 'กำลังเดินทาง'
  },
  unloading: {
    icon: 'box',
    color: '#2196F3',
    bgColor: '#E3F2FD',
    borderColor: '#90CAF9',
    message: 'กำลังขนของลง'
  },
  in_queue: {
    icon: 'clock',
    color: '#9C27B0',
    bgColor: '#F3E5F5',
    borderColor: '#CE93D8',
    message: 'กำลังต่อคิว'
  },
  waiting: {
    icon: 'hourglass',
    color: '#F5A623',
    bgColor: '#FFF8E8',
    borderColor: '#FFE4B5',
    message: 'รอคิว'
  },
  ready: {
    icon: 'bell',
    color: '#00A86B',
    bgColor: '#E8F5EF',
    borderColor: '#A5D6A7',
    message: 'พร้อมแล้ว!'
  },
  completed: {
    icon: 'check-circle',
    color: '#00A86B',
    bgColor: '#E8F5EF',
    borderColor: '#A5D6A7',
    message: 'เสร็จสิ้น'
  },
  cancelled: {
    icon: 'x-circle',
    color: '#E53935',
    bgColor: '#FFEBEE',
    borderColor: '#EF9A9A',
    message: 'ยกเลิกแล้ว'
  }
}

// Computed
const config = computed<StatusConfig>(() => {
  return statusConfig[currentStatus.value] || {
    icon: 'info',
    color: '#666666',
    bgColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    message: currentStatus.value
  }
})

const statusMessage = computed(() => {
  // Replace provider name placeholder in message
  return config.value.message.replace('ผู้ให้บริการ', props.providerName || 'ผู้ให้บริการ')
})

// Methods
function showBanner(status: string) {
  currentStatus.value = status
  isAnimating.value = true
  isVisible.value = true
  
  // Clear existing timer
  if (dismissTimer) {
    clearTimeout(dismissTimer)
  }
  
  // Animation complete
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
  
  // Auto dismiss
  if (props.autoDismiss && status !== 'pending') {
    dismissTimer = setTimeout(() => {
      dismiss()
    }, props.dismissDelay)
  }
  
  emit('status-change', status)
}

function dismiss() {
  isVisible.value = false
  emit('dismiss')
}

// Watch for status prop changes
watch(() => props.status, (newStatus) => {
  if (newStatus && newStatus !== currentStatus.value) {
    showBanner(newStatus)
  }
}, { immediate: true })

// Subscribe to cross-role events
let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = subscribe<StatusChangedPayload>(
    'request:status_changed',
    (event) => {
      showBanner(event.payload.newStatus)
    }
  )
  
  // Show initial status
  if (props.status) {
    showBanner(props.status)
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
  if (dismissTimer) {
    clearTimeout(dismissTimer)
  }
})

// Expose methods
defineExpose({
  showBanner,
  dismiss
})
</script>

<template>
  <Transition name="slide-down">
    <div 
      v-if="isVisible"
      class="status-banner"
      :style="{ 
        '--status-color': config.color,
        '--status-bg': config.bgColor,
        '--status-border': config.borderColor
      }"
      :class="{ animating: isAnimating }"
    >
      <!-- Progress Bar for pending status -->
      <div class="progress-bar" :class="{ active: currentStatus === 'pending' }"></div>
      
      <!-- Icon -->
      <div class="banner-icon">
        <!-- Search -->
        <svg v-if="config.icon === 'search'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        
        <!-- User Check -->
        <svg v-else-if="config.icon === 'user-check'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <polyline points="17 11 19 13 23 9"/>
        </svg>
        
        <!-- Car -->
        <svg v-else-if="config.icon === 'car'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"/>
          <path d="M5 17H3v-4l2-5h9l4 5h3v4h-2"/>
        </svg>
        
        <!-- Map Pin -->
        <svg v-else-if="config.icon === 'map-pin'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        
        <!-- Check Circle -->
        <svg v-else-if="config.icon === 'check-circle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        
        <!-- Navigation -->
        <svg v-else-if="config.icon === 'navigation'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        
        <!-- Package -->
        <svg v-else-if="config.icon === 'package'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        
        <!-- Shopping Cart -->
        <svg v-else-if="config.icon === 'shopping-cart'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
        </svg>
        
        <!-- Box -->
        <svg v-else-if="config.icon === 'box'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        </svg>
        
        <!-- Truck -->
        <svg v-else-if="config.icon === 'truck'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
        
        <!-- Clock -->
        <svg v-else-if="config.icon === 'clock'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        
        <!-- Hourglass -->
        <svg v-else-if="config.icon === 'hourglass'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 00-.586-1.414L12 12l-4.414 4.414A2 2 0 007 17.828V22M7 2v4.172a2 2 0 00.586 1.414L12 12l4.414-4.414A2 2 0 0017 6.172V2"/>
        </svg>
        
        <!-- Bell -->
        <svg v-else-if="config.icon === 'bell'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        
        <!-- X Circle -->
        <svg v-else-if="config.icon === 'x-circle'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        
        <!-- Info (default) -->
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </div>
      
      <!-- Content -->
      <div class="banner-content">
        <span class="banner-message">{{ statusMessage }}</span>
        <span v-if="serviceType" class="service-type">{{ serviceType }}</span>
      </div>
      
      <!-- Dismiss Button -->
      <button 
        v-if="currentStatus !== 'pending'"
        class="dismiss-btn"
        aria-label="ปิด"
        @click="dismiss"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.status-banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--status-bg);
  border-radius: 12px;
  border: 2px solid var(--status-border);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.status-banner.animating {
  animation: banner-pop 0.3s ease;
}

@keyframes banner-pop {
  0% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Progress Bar */
.progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 3px;
  width: 0;
  background: var(--status-color);
  border-radius: 3px;
}

.progress-bar.active {
  animation: progress-sweep 2s ease-in-out infinite;
}

@keyframes progress-sweep {
  0% {
    width: 0;
    left: 0;
  }
  50% {
    width: 60%;
    left: 20%;
  }
  100% {
    width: 0;
    left: 100%;
  }
}

/* Icon */
.banner-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--status-color);
  border-radius: 50%;
  flex-shrink: 0;
}

.banner-icon svg {
  width: 20px;
  height: 20px;
  color: #FFFFFF;
}

/* Content */
.banner-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.banner-message {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.service-type {
  font-size: 12px;
  color: #666666;
  text-transform: capitalize;
}

/* Dismiss Button */
.dismiss-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #999999;
  transition: all 0.2s ease;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.dismiss-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #666666;
}

.dismiss-btn:active {
  transform: scale(0.9);
}

.dismiss-btn svg {
  width: 18px;
  height: 18px;
}

/* Slide Down Transition */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
