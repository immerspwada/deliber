<script setup lang="ts">
/**
 * Feature: F127 - Driver Card
 * Display driver info with rating and vehicle
 */

interface Props {
  name: string
  photo?: string
  rating: number
  totalRides: number
  vehicleModel: string
  vehiclePlate: string
  vehicleColor?: string
  phone?: string
  isFavorite?: boolean
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFavorite: false,
  showActions: true
})

const emit = defineEmits<{
  call: []
  message: []
  favorite: []
}>()

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const formatRating = (rating: number) => {
  return rating.toFixed(1)
}
</script>

<template>
  <div class="driver-card">
    <div class="driver-main">
      <div class="driver-avatar">
        <img v-if="photo" :src="photo" :alt="name" />
        <span v-else class="avatar-initials">{{ getInitials(name) }}</span>
      </div>
      
      <div class="driver-info">
        <div class="driver-header">
          <span class="driver-name">{{ name }}</span>
          <button 
            v-if="showActions"
            type="button" 
            class="favorite-btn"
            :class="{ active: isFavorite }"
            @click="emit('favorite')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </button>
        </div>
        
        <div class="driver-stats">
          <span class="rating">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            {{ formatRating(rating) }}
          </span>
          <span class="divider">•</span>
          <span class="rides">{{ totalRides.toLocaleString() }} เที่ยว</span>
        </div>
      </div>
    </div>
    
    <div class="vehicle-info">
      <div class="vehicle-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
        </svg>
      </div>
      <div class="vehicle-details">
        <span class="vehicle-model">{{ vehicleModel }}</span>
        <span class="vehicle-plate">{{ vehiclePlate }}</span>
        <span v-if="vehicleColor" class="vehicle-color">{{ vehicleColor }}</span>
      </div>
    </div>
    
    <div v-if="showActions && phone" class="driver-actions">
      <button type="button" class="action-btn" @click="emit('call')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>
        <span>โทร</span>
      </button>
      <button type="button" class="action-btn" @click="emit('message')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span>แชท</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.driver-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.driver-main {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.driver-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.driver-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 18px;
  font-weight: 600;
  color: #6b6b6b;
}

.driver-info {
  flex: 1;
}

.driver-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.driver-name {
  font-size: 18px;
  font-weight: 600;
  color: #000;
}

.favorite-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #ccc;
  transition: color 0.2s;
}

.favorite-btn.active {
  color: #e11900;
}

.driver-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b6b6b;
}

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #000;
  font-weight: 500;
}

.rating svg {
  color: #ffc107;
}

.divider {
  color: #ccc;
}

.vehicle-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.vehicle-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 10px;
  color: #000;
}

.vehicle-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vehicle-model {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.vehicle-plate {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #000;
  padding: 2px 8px;
  border-radius: 4px;
}

.vehicle-color {
  font-size: 13px;
  color: #6b6b6b;
}

.driver-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #f6f6f6;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #e5e5e5;
}
</style>
