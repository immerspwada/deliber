<script setup lang="ts">
/**
 * Feature: F198 - Order Card
 * Display order info card for admin
 */

interface Props {
  id: string
  trackingId: string
  type: 'ride' | 'delivery' | 'shopping'
  customerName: string
  providerName?: string
  pickup: string
  dropoff: string
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled'
  fare: number
  createdAt: string
}

defineProps<Props>()

const emit = defineEmits<{
  view: [id: string]
  cancel: [id: string]
}>()

const typeLabels = { ride: 'เรียกรถ', delivery: 'ส่งพัสดุ', shopping: 'ซื้อของ' }
const statusConfig = {
  pending: { label: 'รอรับงาน', color: '#ef6c00', bg: '#fff3e0' },
  matched: { label: 'จับคู่แล้ว', color: '#276ef1', bg: '#e3f2fd' },
  in_progress: { label: 'กำลังดำเนินการ', color: '#276ef1', bg: '#e3f2fd' },
  completed: { label: 'สำเร็จ', color: '#2e7d32', bg: '#e8f5e9' },
  cancelled: { label: 'ยกเลิก', color: '#e11900', bg: '#ffebee' }
}
</script>

<template>
  <div class="order-card" :class="status">
    <div class="order-header">
      <div class="order-type">
        <span class="type-badge">{{ typeLabels[type] }}</span>
        <span class="tracking-id">{{ trackingId }}</span>
      </div>
      <span class="order-status" :style="{ color: statusConfig[status].color, background: statusConfig[status].bg }">
        {{ statusConfig[status].label }}
      </span>
    </div>
    
    <div class="order-route">
      <div class="route-point">
        <span class="point-dot pickup"></span>
        <span class="point-text">{{ pickup }}</span>
      </div>
      <div class="route-point">
        <span class="point-dot dropoff"></span>
        <span class="point-text">{{ dropoff }}</span>
      </div>
    </div>
    
    <div class="order-parties">
      <div class="party-item">
        <span class="party-label">ลูกค้า</span>
        <span class="party-name">{{ customerName }}</span>
      </div>
      <div v-if="providerName" class="party-item">
        <span class="party-label">ผู้ให้บริการ</span>
        <span class="party-name">{{ providerName }}</span>
      </div>
    </div>
    
    <div class="order-footer">
      <div class="order-info">
        <span class="order-fare">฿{{ fare.toLocaleString() }}</span>
        <span class="order-time">{{ createdAt }}</span>
      </div>
      <div class="order-actions">
        <button type="button" class="action-btn" @click="emit('view', id)">ดูรายละเอียด</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 16px;
  transition: border-color 0.2s;
}

.order-card:hover {
  border-color: #000;
}

.order-card.pending {
  border-left: 3px solid #ef6c00;
}

.order-card.in_progress {
  border-left: 3px solid #276ef1;
}

.order-header {
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

.type-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  background: #f6f6f6;
  border-radius: 6px;
  color: #000;
}

.tracking-id {
  font-size: 11px;
  color: #999;
  font-family: monospace;
}

.order-status {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
}

.order-route {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 10px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 10px;
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
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-parties {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.party-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.party-label {
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
}

.party-name {
  font-size: 13px;
  font-weight: 500;
  color: #000;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-fare {
  font-size: 16px;
  font-weight: 700;
  color: #000;
}

.order-time {
  font-size: 11px;
  color: #999;
}

.action-btn {
  padding: 8px 14px;
  background: #00A86B;
  color: #fff;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.action-btn:hover {
  background: #333;
}
</style>