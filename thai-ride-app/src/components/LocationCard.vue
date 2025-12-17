<script setup lang="ts">
/**
 * Feature: F120 - Location Card
 * Location display card with address
 */
interface Props {
  type: 'pickup' | 'dropoff' | 'stop'
  title: string
  address: string
  time?: string
  distance?: string
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  time: '',
  distance: '',
  editable: false
})

const emit = defineEmits<{
  edit: []
}>()
</script>

<template>
  <div class="location-card" :class="type">
    <div class="location-marker">
      <div class="marker-dot" />
      <div v-if="type !== 'dropoff'" class="marker-line" />
    </div>
    
    <div class="location-content">
      <div class="location-header">
        <span class="location-type">
          {{ type === 'pickup' ? 'จุดรับ' : type === 'dropoff' ? 'จุดส่ง' : 'จุดแวะ' }}
        </span>
        <span v-if="time" class="location-time">{{ time }}</span>
      </div>
      
      <p class="location-title">{{ title }}</p>
      <p class="location-address">{{ address }}</p>
      
      <span v-if="distance" class="location-distance">{{ distance }}</span>
    </div>
    
    <button v-if="editable" type="button" class="edit-btn" @click="emit('edit')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.location-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.location-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 4px;
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pickup .marker-dot {
  background: #00c853;
}

.dropoff .marker-dot {
  background: #e11900;
}

.stop .marker-dot {
  background: #276ef1;
}

.marker-line {
  width: 2px;
  flex: 1;
  min-height: 40px;
  background: #e5e5e5;
  margin-top: 8px;
}

.location-content {
  flex: 1;
  min-width: 0;
}

.location-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.location-type {
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pickup .location-type {
  color: #00c853;
}

.dropoff .location-type {
  color: #e11900;
}

.stop .location-type {
  color: #276ef1;
}

.location-time {
  font-size: 12px;
  color: #6b6b6b;
}

.location-title {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-address {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.location-distance {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  color: #6b6b6b;
  background: #f6f6f6;
  padding: 4px 8px;
  border-radius: 4px;
}

.edit-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  color: #6b6b6b;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: #e5e5e5;
  color: #000;
}
</style>
