<script setup lang="ts">
/**
 * Feature: F185 - Trip History Card
 * Display trip history item for provider
 */

interface Props {
  id: string
  type: 'ride' | 'delivery' | 'shopping'
  pickup: string
  dropoff: string
  fare: number
  tip?: number
  distance: string
  duration: string
  date: string
  time: string
  status: 'completed' | 'cancelled'
  rating?: number
}

defineProps<Props>()

const emit = defineEmits<{
  view: [id: string]
}>()

const typeLabels = {
  ride: 'เรียกรถ',
  delivery: 'ส่งพัสดุ',
  shopping: 'ซื้อของ'
}

const typeIcons = {
  ride: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2M7 17a2 2 0 100-4 2 2 0 000 4zM17 17a2 2 0 100-4 2 2 0 000 4z',
  delivery: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  shopping: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0'
}
</script>

<template>
  <button type="button" class="trip-history-card" :class="status" @click="emit('view', id)">
    <div class="trip-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path :d="typeIcons[type]"/>
      </svg>
    </div>
    
    <div class="trip-content">
      <div class="trip-header">
        <span class="trip-type">{{ typeLabels[type] }}</span>
        <span class="trip-date">{{ date }} {{ time }}</span>
      </div>
      
      <div class="trip-route">
        <div class="route-point">
          <span class="point-dot pickup"></span>
          <span class="point-text">{{ pickup }}</span>
        </div>
        <div class="route-point">
          <span class="point-dot dropoff"></span>
          <span class="point-text">{{ dropoff }}</span>
        </div>
      </div>
      
      <div class="trip-footer">
        <div class="trip-stats">
          <span>{{ distance }}</span>
          <span class="dot">•</span>
          <span>{{ duration }}</span>
          <template v-if="rating">
            <span class="dot">•</span>
            <span class="rating">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {{ rating.toFixed(1) }}
            </span>
          </template>
        </div>
        <div class="trip-earnings">
          <span class="fare">฿{{ fare }}</span>
          <span v-if="tip" class="tip">+฿{{ tip }} ทิป</span>
        </div>
      </div>
    </div>
    
    <div v-if="status === 'cancelled'" class="cancelled-badge">ยกเลิก</div>
  </button>
</template>

<style scoped>
.trip-history-card {
  display: flex;
  gap: 12px;
  width: 100%;
  padding: 14px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: all 0.2s;
}

.trip-history-card:hover {
  border-color: #000;
}

.trip-history-card.cancelled {
  opacity: 0.7;
}

.trip-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 12px;
  color: #000;
  flex-shrink: 0;
}

.trip-content {
  flex: 1;
  min-width: 0;
}

.trip-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.trip-type {
  font-size: 13px;
  font-weight: 600;
  color: #000;
}

.trip-date {
  font-size: 11px;
  color: #999;
}

.trip-route {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 8px;
}

.point-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.point-dot.pickup {
  background: #276ef1;
}

.point-dot.dropoff {
  background: #e11900;
}

.point-text {
  font-size: 13px;
  color: #6b6b6b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trip-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trip-stats {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #999;
}

.dot {
  color: #ccc;
}

.rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #6b6b6b;
}

.rating svg {
  color: #ffc107;
}

.trip-earnings {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fare {
  font-size: 15px;
  font-weight: 700;
  color: #000;
}

.tip {
  font-size: 11px;
  color: #2e7d32;
  font-weight: 500;
}

.cancelled-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  background: #ffebee;
  color: #e11900;
  border-radius: 4px;
}
</style>