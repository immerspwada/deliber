<script setup lang="ts">
/**
 * Feature: F347 - Provider Order History
 * Order history list for providers
 */
import { computed } from 'vue'

interface Order {
  id: string
  type: 'ride' | 'delivery' | 'shopping'
  status: 'completed' | 'cancelled'
  customerName: string
  pickup: string
  dropoff: string
  fare: number
  tip?: number
  date: string
  rating?: number
}

const props = withDefaults(defineProps<{
  orders: Order[]
  loading?: boolean
}>(), {
  loading: false
})

const emit = defineEmits<{
  (e: 'select', order: Order): void
}>()

const typeIcons = {
  ride: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3v-6l2-4h9l4 4h3v6h-2"/><path d="M10 17V7"/></svg>`,
  delivery: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V4"/><path d="M8 4h8"/></svg>`,
  shopping: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const totalEarnings = computed(() => {
  return props.orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.fare + (o.tip || 0), 0)
})
</script>

<template>
  <div class="provider-order-history">
    <div class="history-header">
      <h3 class="header-title">ประวัติงาน</h3>
      <div class="total-earnings">
        <span class="label">รายได้รวม</span>
        <span class="amount">฿{{ totalEarnings.toLocaleString() }}</span>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="i in 3" :key="i" class="skeleton-item">
        <div class="skeleton-icon"></div>
        <div class="skeleton-content">
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-80"></div>
        </div>
      </div>
    </div>

    <div v-else-if="orders.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
      <p>ยังไม่มีประวัติงาน</p>
    </div>

    <div v-else class="orders-list">
      <div
        v-for="order in orders"
        :key="order.id"
        class="order-item"
        :class="{ cancelled: order.status === 'cancelled' }"
        @click="emit('select', order)"
      >
        <div class="order-icon" v-html="typeIcons[order.type]"></div>
        
        <div class="order-content">
          <div class="order-header">
            <span class="customer-name">{{ order.customerName }}</span>
            <span class="order-date">{{ formatDate(order.date) }}</span>
          </div>
          
          <div class="order-route">
            <span class="pickup">{{ order.pickup }}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            <span class="dropoff">{{ order.dropoff }}</span>
          </div>
          
          <div class="order-footer">
            <div class="fare-info">
              <span class="fare">฿{{ order.fare.toLocaleString() }}</span>
              <span v-if="order.tip" class="tip">+฿{{ order.tip }} ทิป</span>
            </div>
            
            <div v-if="order.rating" class="rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFB800" stroke="#FFB800" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{{ order.rating.toFixed(1) }}</span>
            </div>
            
            <span v-if="order.status === 'cancelled'" class="cancelled-badge">ยกเลิก</span>
          </div>
        </div>
        
        <svg class="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.provider-order-history {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.total-earnings {
  text-align: right;
}

.total-earnings .label {
  display: block;
  font-size: 11px;
  color: #6b6b6b;
}

.total-earnings .amount {
  font-size: 16px;
  font-weight: 700;
  color: #000;
}

.loading-state {
  padding: 16px;
}

.skeleton-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
}

.skeleton-icon {
  width: 40px;
  height: 40px;
  background: #f0f0f0;
  border-radius: 8px;
  animation: pulse 1.5s infinite;
}

.skeleton-content {
  flex: 1;
}

.skeleton-line {
  height: 12px;
  background: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 8px;
  animation: pulse 1.5s infinite;
}

.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-80 { width: 80%; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.empty-state {
  padding: 48px 24px;
  text-align: center;
}

.empty-state svg {
  margin-bottom: 12px;
}

.empty-state p {
  color: #6b6b6b;
  margin: 0;
}

.orders-list {
  padding: 8px 0;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.order-item:hover {
  background: #f6f6f6;
}

.order-item.cancelled {
  opacity: 0.6;
}

.order-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 8px;
  color: #000;
}

.order-content {
  flex: 1;
  min-width: 0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.customer-name {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.order-date {
  font-size: 12px;
  color: #6b6b6b;
}

.order-route {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b6b6b;
  margin-bottom: 6px;
}

.order-route .pickup,
.order-route .dropoff {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.order-footer {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fare-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fare {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.tip {
  font-size: 12px;
  color: #22c55e;
}

.rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #000;
}

.cancelled-badge {
  font-size: 11px;
  color: #e11900;
  background: #fee2e2;
  padding: 2px 8px;
  border-radius: 4px;
}

.chevron {
  flex-shrink: 0;
}
</style>
