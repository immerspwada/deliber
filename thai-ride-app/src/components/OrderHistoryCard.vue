<script setup lang="ts">
/**
 * Feature: F337 - Order History Card
 * Card for displaying order in history list
 */
interface Order {
  id: string
  trackingId: string
  type: 'delivery' | 'shopping'
  status: 'completed' | 'cancelled'
  date: string
  time: string
  from: string
  to: string
  total: number
  itemCount?: number
}

const props = defineProps<{
  order: Order
}>()

const emit = defineEmits<{
  'click': []
  'reorder': []
}>()

const statusLabels: Record<string, { text: string; class: string }> = {
  completed: { text: 'สำเร็จ', class: 'completed' },
  cancelled: { text: 'ยกเลิก', class: 'cancelled' }
}
</script>

<template>
  <div class="order-card" @click="emit('click')">
    <div class="card-header">
      <div class="order-type">
        <div class="type-icon">
          <svg v-if="order.type === 'delivery'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 16h6v-6h-6zM2 16h6v-6H2zM9 10h6V4H9z"/>
            <path d="M12 22v-6"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
          </svg>
        </div>
        <span class="type-label">{{ order.type === 'delivery' ? 'ส่งของ' : 'ซื้อของ' }}</span>
      </div>
      <span class="order-status" :class="statusLabels[order.status]?.class">
        {{ statusLabels[order.status]?.text }}
      </span>
    </div>
    
    <div class="card-body">
      <div class="order-route">
        <div class="route-point">
          <div class="point-dot from" />
          <span class="point-text">{{ order.from }}</span>
        </div>
        <div class="route-point">
          <div class="point-dot to" />
          <span class="point-text">{{ order.to }}</span>
        </div>
      </div>
      
      <div class="order-meta">
        <span class="order-date">{{ order.date }} {{ order.time }}</span>
        <span v-if="order.itemCount" class="order-items">{{ order.itemCount }} รายการ</span>
      </div>
    </div>
    
    <div class="card-footer">
      <span class="order-total">฿{{ order.total.toLocaleString() }}</span>
      <button 
        v-if="order.status === 'completed'"
        type="button" 
        class="reorder-btn"
        @click.stop="emit('reorder')"
      >
        สั่งอีกครั้ง
      </button>
    </div>
  </div>
</template>

<style scoped>
.order-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.order-card:hover {
  border-color: #000;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.order-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon {
  width: 36px;
  height: 36px;
  background: #f6f6f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
}

.type-label {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.order-status {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
}

.order-status.completed {
  background: #e8f5e9;
  color: #2e7d32;
}

.order-status.cancelled {
  background: #ffeae6;
  color: #e11900;
}

.card-body {
  margin-bottom: 12px;
}

.order-route {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
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
}

.point-dot.from {
  background: #2e7d32;
}

.point-dot.to {
  background: #000;
}

.point-text {
  font-size: 14px;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #6b6b6b;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
}

.order-total {
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

.reorder-btn {
  padding: 8px 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.reorder-btn:hover {
  background: #333;
}
</style>
