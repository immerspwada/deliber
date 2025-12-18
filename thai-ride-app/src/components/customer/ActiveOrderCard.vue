<script setup lang="ts">
/**
 * ActiveOrderCard - Card แสดงออเดอร์ที่กำลังดำเนินการ
 * MUNEEF Style: สีเขียว #00A86B, animations, pulse effect
 */
import { computed } from 'vue'
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface Props {
  id: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  typeName: string
  status: string
  statusText: string
  from: string
  to: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'click': [id: string]
}>()

const haptic = useHapticFeedback()

const typeColor = computed(() => {
  const colors: Record<string, string> = {
    ride: '#00A86B',
    delivery: '#F5A623',
    shopping: '#E53935',
    queue: '#9C27B0',
    moving: '#2196F3',
    laundry: '#00BCD4'
  }
  return colors[props.type] || '#00A86B'
})

const handleClick = () => {
  haptic.light()
  emit('click', props.id)
}
</script>

<template>
  <button 
    class="order-card"
    :style="{ '--type-color': typeColor }"
    @click="handleClick"
  >
    <!-- Pulse Animation -->
    <div class="pulse-ring"></div>
    
    <!-- Type Badge -->
    <div class="type-badge">
      <!-- Ride -->
      <svg v-if="type === 'ride'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 17a2 2 0 104 0 2 2 0 00-4 0zM15 17a2 2 0 104 0 2 2 0 00-4 0z"/>
        <path d="M5 17H3v-4l2-5h9l4 5h3v4h-2"/>
      </svg>
      
      <!-- Delivery -->
      <svg v-else-if="type === 'delivery'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="7" width="12" height="12" rx="1"/>
        <path d="M15 11h4l2 4v4h-6v-8z"/>
        <circle cx="7" cy="19" r="2"/>
        <circle cx="17" cy="19" r="2"/>
      </svg>
      
      <!-- Shopping -->
      <svg v-else-if="type === 'shopping'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 6h15l-1.5 9h-12L6 6z"/>
        <circle cx="9" cy="20" r="1.5"/>
        <circle cx="18" cy="20" r="1.5"/>
        <path d="M6 6L5 3H2"/>
      </svg>
      
      <!-- Queue -->
      <svg v-else-if="type === 'queue'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <path d="M8 9h8M8 13h5"/>
      </svg>
      
      <!-- Moving -->
      <svg v-else-if="type === 'moving'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="8" width="10" height="10" rx="1"/>
        <path d="M14 12h4l2 3v3h-6v-6z"/>
        <circle cx="8" cy="18" r="2"/>
        <circle cx="16" cy="18" r="2"/>
      </svg>
      
      <!-- Laundry -->
      <svg v-else-if="type === 'laundry'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="2" width="18" height="20" rx="2"/>
        <circle cx="12" cy="13" r="5"/>
        <circle cx="7" cy="6" r="1"/>
        <circle cx="10" cy="6" r="1"/>
      </svg>
      
      <!-- Default -->
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    </div>
    
    <!-- Order Info -->
    <div class="order-info">
      <div class="order-header">
        <span class="order-type">{{ typeName }}</span>
        <span class="order-status">{{ statusText }}</span>
      </div>
      <div class="order-route">
        <span class="route-from">{{ from }}</span>
        <svg class="route-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        <span class="route-to">{{ to }}</span>
      </div>
    </div>
    
    <!-- Arrow -->
    <div class="card-arrow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  </button>
</template>

<style scoped>
.order-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  background: #FFFFFF;
  border: 2px solid #F0F0F0;
  border-radius: 18px;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  transition: all 0.2s ease;
}

.order-card:hover {
  border-color: var(--type-color);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.order-card:active {
  transform: scale(0.98);
}

/* Pulse Animation */
.pulse-ring {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--type-color);
  opacity: 0.2;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.2;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.1;
  }
}

/* Type Badge */
.type-badge {
  position: relative;
  z-index: 1;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--type-color);
  border-radius: 14px;
  flex-shrink: 0;
}

.type-badge svg {
  width: 24px;
  height: 24px;
  color: #FFFFFF;
}

/* Order Info */
.order-info {
  flex: 1;
  min-width: 0;
}

.order-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.order-type {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.order-status {
  padding: 3px 8px;
  background: color-mix(in srgb, var(--type-color) 15%, white);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--type-color);
}

.order-route {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666666;
}

.route-from,
.route-to {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.route-arrow {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: #CCCCCC;
}

/* Card Arrow */
.card-arrow {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #CCCCCC;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.order-card:hover .card-arrow {
  transform: translateX(4px);
  color: var(--type-color);
}

.card-arrow svg {
  width: 20px;
  height: 20px;
}
</style>
