<script setup lang="ts">
/**
 * Feature: F123 - Vehicle Type Selector
 * Select vehicle type for ride booking
 */


interface VehicleType {
  id: string
  name: string
  description: string
  price: number
  eta: number
  capacity: number
  icon: 'car' | 'suv' | 'van' | 'motorcycle' | 'premium'
  surge?: number
}

interface Props {
  modelValue: string
  vehicles: VehicleType[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectVehicle = (vehicle: VehicleType) => {
  emit('update:modelValue', vehicle.id)
}

const formatPrice = (price: number, surge?: number) => {
  const finalPrice = surge ? price * surge : price
  return `฿${finalPrice.toLocaleString()}`
}
</script>

<template>
  <div class="vehicle-selector">
    <div v-if="loading" class="loading-state">
      <div v-for="i in 3" :key="i" class="skeleton-item">
        <div class="skeleton skeleton-icon" />
        <div class="skeleton-content">
          <div class="skeleton skeleton-title" />
          <div class="skeleton skeleton-subtitle" />
        </div>
        <div class="skeleton skeleton-price" />
      </div>
    </div>
    
    <div v-else class="vehicle-list">
      <button
        v-for="vehicle in vehicles"
        :key="vehicle.id"
        type="button"
        class="vehicle-item"
        :class="{ selected: modelValue === vehicle.id }"
        @click="selectVehicle(vehicle)"
      >
        <div class="vehicle-icon">
          <!-- Car icon -->
          <svg v-if="vehicle.icon === 'car'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
          </svg>
          <!-- SUV icon -->
          <svg v-else-if="vehicle.icon === 'suv'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M5 17h14v-6H5v6zM19 11l-1-5H6L5 11"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
          </svg>
          <!-- Van icon -->
          <svg v-else-if="vehicle.icon === 'van'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="6" width="15" height="12" rx="2"/><path d="M16 8h4l3 4v6h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <!-- Motorcycle icon -->
          <svg v-else-if="vehicle.icon === 'motorcycle'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M9 17h6l3-6h-4l-2-4H8l2 4H6l3 6z"/>
          </svg>
          <!-- Premium icon -->
          <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        
        <div class="vehicle-info">
          <div class="vehicle-header">
            <span class="vehicle-name">{{ vehicle.name }}</span>
            <span v-if="vehicle.surge && vehicle.surge > 1" class="surge-badge">
              {{ vehicle.surge }}x
            </span>
          </div>
          <p class="vehicle-description">{{ vehicle.description }}</p>
          <div class="vehicle-meta">
            <span class="vehicle-eta">{{ vehicle.eta }} นาที</span>
            <span class="vehicle-capacity">{{ vehicle.capacity }} ที่นั่ง</span>
          </div>
        </div>
        
        <div class="vehicle-price">
          <span class="price" :class="{ surge: vehicle.surge && vehicle.surge > 1 }">
            {{ formatPrice(vehicle.price, vehicle.surge) }}
          </span>
        </div>
        
        <div class="selected-indicator" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.vehicle-selector {
  display: flex;
  flex-direction: column;
}

.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vehicle-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  position: relative;
}

.vehicle-item:hover {
  background: #f6f6f6;
}

.vehicle-item.selected {
  border-color: #000;
  background: #f9f9f9;
}

.vehicle-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #000;
  flex-shrink: 0;
}

.vehicle-item.selected .vehicle-icon {
  background: #000;
  color: #fff;
}

.vehicle-info {
  flex: 1;
  min-width: 0;
}

.vehicle-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.vehicle-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.surge-badge {
  background: #e11900;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.vehicle-description {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0 0 6px;
}

.vehicle-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.vehicle-price {
  text-align: right;
}

.price {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

.price.surge {
  color: #e11900;
}

.selected-indicator {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: 2px solid #e5e5e5;
  border-radius: 50%;
  opacity: 0;
}

.vehicle-item.selected .selected-indicator {
  opacity: 1;
  border-color: #000;
  background: #000;
}

.vehicle-item.selected .selected-indicator::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
}

/* Loading state */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

.skeleton-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-title {
  width: 60%;
  height: 18px;
}

.skeleton-subtitle {
  width: 80%;
  height: 14px;
}

.skeleton-price {
  width: 60px;
  height: 24px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
