<script setup lang="ts">
/**
 * Feature: F287 - Route Overview
 * Route summary with waypoints
 */
defineProps<{
  origin: { name: string; address?: string }
  destination: { name: string; address?: string }
  stops?: Array<{ name: string; address?: string }>
  distance?: number
  duration?: number
}>()

const formatDistance = (m: number) => {
  if (m >= 1000) return (m / 1000).toFixed(1) + ' กม.'
  return Math.round(m) + ' ม.'
}

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0) return `${h} ชม. ${m} นาที`
  return `${m} นาที`
}
</script>

<template>
  <div class="route-overview">
    <div class="route-line">
      <!-- Origin -->
      <div class="waypoint origin">
        <div class="marker">
          <div class="dot"></div>
        </div>
        <div class="info">
          <span class="name">{{ origin.name }}</span>
          <span v-if="origin.address" class="address">{{ origin.address }}</span>
        </div>
      </div>
      
      <!-- Stops -->
      <div v-for="(stop, index) in stops" :key="index" class="waypoint stop">
        <div class="marker">
          <div class="number">{{ index + 1 }}</div>
        </div>
        <div class="info">
          <span class="name">{{ stop.name }}</span>
          <span v-if="stop.address" class="address">{{ stop.address }}</span>
        </div>
      </div>
      
      <!-- Destination -->
      <div class="waypoint destination">
        <div class="marker">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
        <div class="info">
          <span class="name">{{ destination.name }}</span>
          <span v-if="destination.address" class="address">{{ destination.address }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="distance || duration" class="summary">
      <span v-if="distance" class="stat">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        {{ formatDistance(distance) }}
      </span>
      <span v-if="duration" class="stat">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        {{ formatDuration(duration) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.route-overview {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
}

.route-line {
  position: relative;
  padding-left: 32px;
}

.route-line::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 20px;
  bottom: 20px;
  width: 2px;
  background: #e5e5e5;
}

.waypoint {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  position: relative;
}

.marker {
  position: absolute;
  left: -32px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.dot {
  width: 10px;
  height: 10px;
  background: #276ef1;
  border-radius: 50%;
}

.number {
  width: 20px;
  height: 20px;
  background: #f6f6f6;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.address {
  font-size: 12px;
  color: #6b6b6b;
  margin-top: 2px;
}

.summary {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e5e5;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b6b6b;
}
</style>
