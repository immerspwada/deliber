<script setup lang="ts">
/**
 * Feature: F341 - Provider Order Card
 * Card for provider to view incoming delivery/shopping orders
 */
interface Order {
  id: string
  trackingId: string
  type: 'delivery' | 'shopping'
  pickup: { address: string; lat: number; lng: number }
  dropoff: { address: string; lat: number; lng: number }
  distance: string
  estimatedFee: number
  itemCount?: number
  customerName: string
  createdAt: string
  packagePhoto?: string | null
}

const props = defineProps<{
  order: Order
  loading?: boolean
}>()

const emit = defineEmits<{
  'accept': []
  'reject': []
  'details': []
}>()
</script>

<template>
  <div class="order-card">
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
        <div class="type-info">
          <span class="type-label">{{ order.type === 'delivery' ? 'ส่งของ' : 'ซื้อของ' }}</span>
          <span class="order-id">#{{ order.trackingId }}</span>
        </div>
      </div>
      <span class="order-fee">฿{{ order.estimatedFee.toFixed(0) }}</span>
    </div>

    <div class="card-body">
      <div class="route-info">
        <div class="route-point">
          <div class="point-dot pickup" />
          <span class="point-address">{{ order.pickup.address }}</span>
        </div>
        <div class="route-point">
          <div class="point-dot dropoff" />
          <span class="point-address">{{ order.dropoff.address }}</span>
        </div>
      </div>
      
      <div class="order-meta">
        <span class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          {{ order.distance }}
        </span>
        <span v-if="order.itemCount" class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 16h6v-6h-6zM2 16h6v-6H2zM9 10h6V4H9z"/>
          </svg>
          {{ order.itemCount }} รายการ
        </span>
        <span class="meta-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          {{ order.customerName }}
        </span>
      </div>
      
      <!-- Package Photo Preview (for delivery) -->
      <div v-if="order.type === 'delivery' && order.packagePhoto" class="package-photo-preview">
        <img :src="order.packagePhoto" alt="Package" class="package-thumb" />
        <span class="photo-label">รูปพัสดุ</span>
      </div>
    </div>
    
    <div class="card-actions">
      <button type="button" class="action-btn reject" :disabled="loading" @click="emit('reject')">
        ปฏิเสธ
      </button>
      <button type="button" class="action-btn accept" :disabled="loading" @click="emit('accept')">
        <span v-if="loading" class="spinner" />
        <span v-else>รับงาน</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.order-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.order-type {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-icon {
  width: 40px;
  height: 40px;
  background: #f6f6f6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
}

.type-info {
  display: flex;
  flex-direction: column;
}

.type-label {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.order-id {
  font-size: 12px;
  color: #6b6b6b;
}

.order-fee {
  font-size: 20px;
  font-weight: 700;
  color: #000;
}

.card-body {
  padding: 16px;
}

.route-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 8px;
}

.point-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.point-dot.pickup { background: #2e7d32; }
.point-dot.dropoff { background: #000; }

.point-address {
  font-size: 14px;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b6b6b;
}

.card-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #e5e5e5;
}

.action-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-btn.reject {
  background: #f6f6f6;
  color: #000;
}

.action-btn.accept {
  background: #000;
  color: #fff;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Package Photo Preview */
.package-photo-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 10px;
  background: #f8f8f8;
  border-radius: 8px;
}

.package-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e5e5e5;
}

.package-photo-preview .photo-label {
  font-size: 13px;
  color: #00A86B;
  font-weight: 500;
}
</style>
