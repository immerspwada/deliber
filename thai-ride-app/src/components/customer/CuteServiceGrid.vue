<script setup lang="ts">
/**
 * CuteServiceGrid - Grid บริการแบบน่ารัก
 * MUNEEF Style: สีเขียว #00A86B, icons น่ารัก, animations
 */
import { ref } from 'vue'
import { useHapticFeedback } from '../../composables/useHapticFeedback'

interface Service {
  id: string
  name: string
  description: string
  route: string
  color: string
  badge?: string
}

interface Props {
  services: Service[]
  title?: string
  columns?: 2 | 3 | 4
}

const props = withDefaults(defineProps<Props>(), {
  title: 'บริการของเรา',
  columns: 4
})

const emit = defineEmits<{
  'service-click': [service: Service]
}>()

const haptic = useHapticFeedback()
const pressedId = ref<string | null>(null)

const handlePress = (id: string) => {
  pressedId.value = id
  haptic.light()
}

const handleRelease = () => {
  pressedId.value = null
}

const handleClick = (service: Service) => {
  haptic.medium()
  emit('service-click', service)
}
</script>

<template>
  <section class="service-grid-section">
    <h3 v-if="title" class="section-title">{{ title }}</h3>
    
    <div class="services-grid" :class="`cols-${columns}`">
      <button
        v-for="service in services"
        :key="service.id"
        class="service-item"
        :class="{ pressed: pressedId === service.id }"
        :style="{ '--accent': service.color }"
        @mousedown="handlePress(service.id)"
        @mouseup="handleRelease"
        @mouseleave="handleRelease"
        @touchstart="handlePress(service.id)"
        @touchend="handleRelease"
        @click="handleClick(service)"
      >
        <!-- Badge -->
        <span v-if="service.badge" class="service-badge">{{ service.badge }}</span>
        
        <!-- Icon Container -->
        <div class="service-icon">
          <!-- Ride -->
          <svg v-if="service.id === 'ride'" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="28" width="48" height="20" rx="6" :fill="service.color"/>
            <rect x="14" y="18" width="36" height="18" rx="5" :fill="service.color"/>
            <rect x="18" y="21" width="12" height="10" rx="3" fill="#FFFFFF" opacity="0.4"/>
            <rect x="34" y="21" width="12" height="10" rx="3" fill="#FFFFFF" opacity="0.4"/>
            <circle cx="20" cy="48" r="7" fill="#333"/>
            <circle cx="20" cy="48" r="3" fill="#666"/>
            <circle cx="44" cy="48" r="7" fill="#333"/>
            <circle cx="44" cy="48" r="3" fill="#666"/>
            <!-- Cute Face -->
            <circle cx="26" cy="38" r="2" fill="#FFFFFF"/>
            <circle cx="38" cy="38" r="2" fill="#FFFFFF"/>
            <path d="M28 42 Q32 46 36 42" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
          </svg>
          
          <!-- Delivery -->
          <svg v-else-if="service.id === 'delivery'" viewBox="0 0 64 64" fill="none">
            <rect x="10" y="16" width="28" height="28" rx="5" :fill="service.color"/>
            <path d="M24 16v28M10 30h28" stroke="#FFFFFF" stroke-width="2" opacity="0.4"/>
            <rect x="38" y="28" width="16" height="16" rx="3" :fill="service.color" opacity="0.8"/>
            <circle cx="18" cy="52" r="6" fill="#333"/>
            <circle cx="46" cy="52" r="6" fill="#333"/>
            <!-- Package Face -->
            <circle cx="18" cy="26" r="2" fill="#FFFFFF"/>
            <circle cx="30" cy="26" r="2" fill="#FFFFFF"/>
            <path d="M20 32 Q24 35 28 32" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
          </svg>
          
          <!-- Shopping -->
          <svg v-else-if="service.id === 'shopping'" viewBox="0 0 64 64" fill="none">
            <path d="M12 20h40l-5 28H17L12 20z" :fill="service.color"/>
            <path d="M22 20V14a10 10 0 0120 0v6" stroke="#FFFFFF" stroke-width="3" fill="none" opacity="0.5"/>
            <circle cx="22" cy="52" r="5" fill="#333"/>
            <circle cx="42" cy="52" r="5" fill="#333"/>
            <!-- Bag Face -->
            <circle cx="26" cy="32" r="2" fill="#FFFFFF"/>
            <circle cx="38" cy="32" r="2" fill="#FFFFFF"/>
            <path d="M28 38 Q32 42 36 38" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
            <!-- Items -->
            <rect x="28" y="26" width="8" height="12" rx="2" fill="#FFFFFF" opacity="0.3"/>
          </svg>
          
          <!-- Queue -->
          <svg v-else-if="service.id === 'queue'" viewBox="0 0 64 64" fill="none">
            <rect x="10" y="10" width="44" height="44" rx="8" :fill="service.color"/>
            <rect x="18" y="20" width="28" height="5" rx="2" fill="#FFFFFF" opacity="0.4"/>
            <rect x="18" y="30" width="20" height="5" rx="2" fill="#FFFFFF" opacity="0.4"/>
            <rect x="18" y="40" width="24" height="5" rx="2" fill="#FFFFFF" opacity="0.4"/>
            <!-- Number Badge -->
            <circle cx="48" cy="48" r="10" fill="#FFD700"/>
            <text x="48" y="52" text-anchor="middle" font-size="12" font-weight="bold" fill="#1A1A1A">1</text>
          </svg>
          
          <!-- Moving -->
          <svg v-else-if="service.id === 'moving'" viewBox="0 0 64 64" fill="none">
            <rect x="6" y="26" width="38" height="24" rx="5" :fill="service.color"/>
            <rect x="12" y="30" width="10" height="10" rx="2" fill="#FFFFFF" opacity="0.4"/>
            <rect x="26" y="30" width="10" height="10" rx="2" fill="#FFFFFF" opacity="0.4"/>
            <rect x="12" y="44" width="10" height="4" rx="1" fill="#FFFFFF" opacity="0.4"/>
            <circle cx="16" cy="54" r="5" fill="#333"/>
            <circle cx="34" cy="54" r="5" fill="#333"/>
            <rect x="44" y="34" width="14" height="16" rx="3" fill="#333"/>
            <!-- Truck Face -->
            <circle cx="20" cy="36" r="1.5" fill="#FFFFFF"/>
            <circle cx="28" cy="36" r="1.5" fill="#FFFFFF"/>
          </svg>
          
          <!-- Laundry -->
          <svg v-else-if="service.id === 'laundry'" viewBox="0 0 64 64" fill="none">
            <rect x="12" y="8" width="40" height="48" rx="6" :fill="service.color"/>
            <circle cx="32" cy="36" r="14" fill="#FFFFFF" opacity="0.3"/>
            <circle cx="32" cy="36" r="9" fill="#FFFFFF"/>
            <path d="M26 36c0-3 3-5 6-4s6 1 6-2" stroke="currentColor" stroke-width="2" fill="none" :style="{ color: service.color }"/>
            <rect x="18" y="14" width="8" height="5" rx="2" fill="#FFFFFF" opacity="0.4"/>
            <rect x="28" y="14" width="8" height="5" rx="2" fill="#FFFFFF" opacity="0.4"/>
            <!-- Bubbles -->
            <circle cx="44" cy="28" r="3" fill="#FFFFFF" opacity="0.5"/>
            <circle cx="48" cy="36" r="2" fill="#FFFFFF" opacity="0.4"/>
          </svg>
          
          <!-- Default -->
          <svg v-else viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="22" :fill="service.color"/>
            <path d="M32 18v14l10 5" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </div>
        
        <!-- Service Name -->
        <span class="service-name">{{ service.name }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.service-grid-section {
  padding: 0 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 16px;
}

.services-grid {
  display: grid;
  gap: 12px;
}

.services-grid.cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.services-grid.cols-3 {
  grid-template-columns: repeat(3, 1fr);
}

.services-grid.cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

.service-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 8px;
  background: #FFFFFF;
  border: 2px solid #F5F5F5;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.service-item:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, white);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.service-item.pressed {
  transform: scale(0.95);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, white);
}

.service-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 3px 6px;
  background: #E53935;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 700;
  color: #FFFFFF;
}

.service-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.service-item:hover .service-icon {
  transform: scale(1.1);
}

.service-item.pressed .service-icon {
  transform: scale(0.95);
}

.service-icon svg {
  width: 100%;
  height: 100%;
}

.service-name {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  text-align: center;
}

/* Responsive */
@media (max-width: 360px) {
  .services-grid.cols-4 {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .service-icon {
    width: 48px;
    height: 48px;
  }
  
  .service-name {
    font-size: 12px;
  }
}
</style>
