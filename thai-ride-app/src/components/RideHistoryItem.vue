<script setup lang="ts">
/**
 * Feature: F132 - Ride History Item
 * Display ride history entry
 */

interface Props {
  id: string
  type: 'ride' | 'delivery' | 'shopping'
  status: 'completed' | 'cancelled' | 'in_progress'
  pickup: string
  destination: string
  date: string
  price: number
  driverName?: string
  rating?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: [id: string]
  rebook: [id: string]
}>()

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const statusText = {
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
  in_progress: 'กำลังดำเนินการ'
}
</script>

<template>
  <div class="history-item" @click="emit('click', id)">
    <div class="item-header">
      <div class="item-type">
        <svg v-if="type === 'ride'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/>
        </svg>

        <svg v-else-if="type === 'delivery'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/>
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/>
        </svg>
      </div>
      <span class="item-date">{{ formatDate(date) }}</span>
      <span class="item-status" :class="status">{{ statusText[status] }}</span>
    </div>
    
    <div class="item-route">
      <div class="route-point pickup">
        <div class="point-dot" />
        <span class="point-text">{{ pickup }}</span>
      </div>
      <div class="route-line" />
      <div class="route-point destination">
        <div class="point-dot" />
        <span class="point-text">{{ destination }}</span>
      </div>
    </div>
    
    <div class="item-footer">
      <div class="item-price">฿{{ price.toLocaleString() }}</div>
      <div v-if="driverName" class="item-driver">
        <span>{{ driverName }}</span>
        <span v-if="rating" class="driver-rating">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {{ rating }}
        </span>
      </div>
      <button v-if="status === 'completed'" type="button" class="rebook-btn" @click.stop="emit('rebook', id)">
        จองอีกครั้ง
      </button>
    </div>
  </div>
</template>

<style scoped>
.history-item {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.history-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.item-type {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 8px;
  color: #000;
}

.item-date {
  flex: 1;
  font-size: 13px;
  color: #6b6b6b;
}

.item-status {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
}

.item-status.completed { background: #e8f5e9; color: #2e7d32; }
.item-status.cancelled { background: #ffebee; color: #c62828; }
.item-status.in_progress { background: #e3f2fd; color: #1565c0; }

.item-route {
  position: relative;
  padding-left: 20px;
  margin-bottom: 12px;
}

.route-point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
}

.route-point.pickup { margin-bottom: 8px; }

.point-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  position: absolute;
  left: -20px;
  top: 4px;
}

.pickup .point-dot { background: #000; }
.destination .point-dot { background: #6b6b6b; border: 2px solid #6b6b6b; background: #fff; }

.route-line {
  position: absolute;
  left: -16px;
  top: 14px;
  bottom: 18px;
  width: 2px;
  background: #e5e5e5;
}

.point-text {
  font-size: 14px;
  color: #000;
  line-height: 1.4;
}

.item-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.item-price {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.item-driver {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b6b6b;
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #000;
}

.driver-rating svg { color: #ffc107; }

.rebook-btn {
  padding: 8px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
}

.rebook-btn:hover { background: #e5e5e5; }
</style>
