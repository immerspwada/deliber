<script setup lang="ts">
/**
 * EnhancedServiceCard - Service Card with Micro-interactions
 * 
 * Card สำหรับแสดงบริการพร้อม animations และ feedback ที่ละเอียด
 * MUNEEF Style: สีเขียว #00A86B, border-radius 16px, touch-friendly 44px+
 */
import { ref } from 'vue'
import { useHapticFeedback } from '../../composables/useHapticFeedback'
import { quickTrack } from '../../composables/useUXTracking'

interface Props {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  route?: string
  badge?: string
  badgeColor?: string
  disabled?: boolean
  loading?: boolean
  variant?: 'default' | 'compact' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  color: '#00A86B',
  disabled: false,
  loading: false,
  variant: 'default'
})

const emit = defineEmits<{
  'click': [id: string]
}>()

const haptic = useHapticFeedback()
const isPressed = ref(false)
const rippleStyle = ref({ left: '0px', top: '0px' })
const showRipple = ref(false)

const handleTouchStart = (e: TouchEvent | MouseEvent) => {
  if (props.disabled || props.loading) return
  
  isPressed.value = true
  haptic.light()
  
  // Calculate ripple position
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  
  let x: number, y: number
  if ('touches' in e) {
    x = e.touches[0].clientX - rect.left
    y = e.touches[0].clientY - rect.top
  } else {
    x = e.clientX - rect.left
    y = e.clientY - rect.top
  }
  
  rippleStyle.value = { left: `${x}px`, top: `${y}px` }
  showRipple.value = true
}

const handleTouchEnd = () => {
  isPressed.value = false
  setTimeout(() => {
    showRipple.value = false
  }, 300)
}

const handleClick = () => {
  if (props.disabled || props.loading) return
  
  haptic.medium()
  
  // Track service card click
  quickTrack('service_card_clicked', 'interaction', {
    serviceId: props.id,
    serviceName: props.name
  })
  
  emit('click', props.id)
}
</script>

<template>
  <button
    class="service-card"
    :class="[variant, { pressed: isPressed, disabled, loading }]"
    :style="{ '--accent': color }"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @mousedown="handleTouchStart"
    @mouseup="handleTouchEnd"
    @mouseleave="handleTouchEnd"
    @click="handleClick"
    :disabled="disabled || loading"
  >
    <!-- Ripple Effect -->
    <span v-if="showRipple" class="ripple" :style="rippleStyle"></span>
    
    <!-- Icon -->
    <div class="card-icon">
      <!-- Loading Spinner -->
      <div v-if="loading" class="icon-spinner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      </div>
      
      <!-- Service Icons -->
      <template v-else>
        <!-- Ride -->
        <svg v-if="icon === 'ride' || id === 'ride'" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="20" width="40" height="16" rx="4" fill="currentColor"/>
          <rect x="8" y="12" width="32" height="14" rx="4" fill="currentColor"/>
          <rect x="12" y="14" width="10" height="8" rx="2" fill="#FFFFFF" opacity="0.3"/>
          <rect x="26" y="14" width="10" height="8" rx="2" fill="#FFFFFF" opacity="0.3"/>
          <circle cx="14" cy="36" r="5" fill="#333"/>
          <circle cx="34" cy="36" r="5" fill="#333"/>
        </svg>
        
        <!-- Delivery -->
        <svg v-else-if="icon === 'delivery' || id === 'delivery'" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="12" width="24" height="24" rx="4" fill="currentColor"/>
          <rect x="12" y="16" width="16" height="16" rx="2" fill="currentColor" opacity="0.7"/>
          <path d="M20 16v16M12 24h16" stroke="#FFFFFF" stroke-width="2" opacity="0.5"/>
          <circle cx="36" cy="36" r="6" fill="#333"/>
          <rect x="28" y="28" width="16" height="12" rx="2" fill="currentColor"/>
        </svg>
        
        <!-- Shopping -->
        <svg v-else-if="icon === 'shopping' || id === 'shopping'" viewBox="0 0 48 48" fill="none">
          <path d="M8 16h32l-4 20H12L8 16z" fill="currentColor"/>
          <path d="M16 16V12a8 8 0 1116 0v4" stroke="currentColor" stroke-width="3" fill="none"/>
          <circle cx="16" cy="40" r="4" fill="#333"/>
          <circle cx="32" cy="40" r="4" fill="#333"/>
          <rect x="18" y="22" width="12" height="8" rx="2" fill="#FFFFFF" opacity="0.3"/>
        </svg>
        
        <!-- Queue -->
        <svg v-else-if="icon === 'queue' || id === 'queue'" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="8" width="32" height="32" rx="6" fill="currentColor"/>
          <rect x="14" y="16" width="20" height="4" rx="2" fill="#FFFFFF" opacity="0.3"/>
          <rect x="14" y="24" width="14" height="4" rx="2" fill="#FFFFFF" opacity="0.3"/>
          <rect x="14" y="32" width="18" height="4" rx="2" fill="#FFFFFF" opacity="0.3"/>
          <circle cx="36" cy="36" r="8" fill="#FFD700"/>
          <text x="36" y="40" text-anchor="middle" font-size="10" font-weight="bold" fill="#1A1A1A">1</text>
        </svg>
        
        <!-- Moving -->
        <svg v-else-if="icon === 'moving' || id === 'moving'" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="20" width="32" height="20" rx="4" fill="currentColor"/>
          <rect x="8" y="24" width="8" height="8" rx="1" fill="#FFFFFF" opacity="0.3"/>
          <rect x="18" y="24" width="8" height="8" rx="1" fill="#FFFFFF" opacity="0.3"/>
          <rect x="8" y="34" width="8" height="4" rx="1" fill="#FFFFFF" opacity="0.3"/>
          <circle cx="12" cy="42" r="4" fill="#333"/>
          <circle cx="28" cy="42" r="4" fill="#333"/>
          <rect x="36" y="28" width="8" height="12" rx="2" fill="#333"/>
        </svg>
        
        <!-- Laundry -->
        <svg v-else-if="icon === 'laundry' || id === 'laundry'" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="8" width="32" height="36" rx="4" fill="currentColor"/>
          <circle cx="24" cy="28" r="10" fill="#FFFFFF" opacity="0.3"/>
          <circle cx="24" cy="28" r="6" fill="#FFFFFF"/>
          <path d="M20 28c0-2 2-4 4-4s4 2 4 4" stroke="currentColor" stroke-width="2" fill="none"/>
          <rect x="14" y="12" width="6" height="4" rx="1" fill="#FFFFFF" opacity="0.3"/>
          <rect x="22" y="12" width="6" height="4" rx="1" fill="#FFFFFF" opacity="0.3"/>
        </svg>
        
        <!-- Default -->
        <svg v-else viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="16" fill="currentColor"/>
          <path d="M24 16v8l6 3" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </template>
    </div>
    
    <!-- Content -->
    <div class="card-content">
      <span class="card-name">{{ name }}</span>
      <span v-if="description && variant !== 'compact'" class="card-description">{{ description }}</span>
    </div>
    
    <!-- Badge -->
    <div v-if="badge" class="card-badge" :style="{ background: badgeColor || '#FFD700' }">
      {{ badge }}
    </div>
    
    <!-- Arrow -->
    <div v-if="variant === 'large'" class="card-arrow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  </button>
</template>

<style scoped>
.service-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.service-card:hover:not(.disabled) {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, white);
}

.service-card.pressed {
  transform: scale(0.98);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, white);
}

.service-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.service-card.loading {
  pointer-events: none;
}

/* Variants */
.service-card.compact {
  padding: 12px;
  flex-direction: column;
  text-align: center;
  gap: 8px;
}

.service-card.large {
  padding: 20px;
}

/* Ripple Effect */
.ripple {
  position: absolute;
  width: 200px;
  height: 200px;
  background: var(--accent);
  opacity: 0.15;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  animation: ripple-effect 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple-effect {
  to {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

/* Icon */
.card-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 14px;
  flex-shrink: 0;
  color: var(--accent);
  transition: all 0.2s ease;
}

.service-card.pressed .card-icon {
  transform: scale(0.95);
}

.service-card.compact .card-icon {
  width: 48px;
  height: 48px;
}

.service-card.large .card-icon {
  width: 64px;
  height: 64px;
}

.card-icon svg {
  width: 32px;
  height: 32px;
}

.service-card.compact .card-icon svg {
  width: 28px;
  height: 28px;
}

.service-card.large .card-icon svg {
  width: 40px;
  height: 40px;
}

.icon-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.icon-spinner svg {
  width: 24px;
  height: 24px;
}

/* Content */
.card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-card.compact .card-content {
  align-items: center;
}

.card-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.service-card.compact .card-name {
  font-size: 13px;
}

.service-card.large .card-name {
  font-size: 18px;
}

.card-description {
  font-size: 13px;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.service-card.large .card-description {
  font-size: 14px;
  white-space: normal;
}

/* Badge */
.card-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  color: #1A1A1A;
}

/* Arrow */
.card-arrow {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #CCCCCC;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.service-card:hover .card-arrow {
  transform: translateX(4px);
  color: var(--accent);
}

.card-arrow svg {
  width: 20px;
  height: 20px;
}
</style>
