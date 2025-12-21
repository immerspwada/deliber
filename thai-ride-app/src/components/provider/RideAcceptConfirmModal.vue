<script setup lang="ts">
/**
 * RideAcceptConfirmModal - Confirmation Modal before accepting a ride
 * Feature: F14 - Provider Dashboard Enhancement
 * 
 * Shows ride details for Provider to review before accepting:
 * - Customer info (name, rating)
 * - Pickup & destination addresses
 * - Distance & estimated fare
 * - Estimated time
 */
import { computed } from 'vue'

interface RideRequest {
  id: string
  tracking_id?: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  pickup_address: string
  destination_address: string
  estimated_fare: number
  distance?: number
  customer_name?: string
  customer_rating?: number
  created_at: string
}

const props = defineProps<{
  show: boolean
  request: RideRequest | null
  isAccepting: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const typeLabels: Record<string, string> = {
  ride: 'เรียกรถ',
  delivery: 'ส่งของ',
  shopping: 'ซื้อของ',
  queue: 'จองคิว',
  moving: 'ขนย้าย',
  laundry: 'ซักผ้า'
}

const typeIcons: Record<string, string> = {
  ride: 'M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM3 4h1l1.68 8.39a2 2 0 002 1.61h7.72a2 2 0 002-1.61L19 6H6',
  delivery: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  shopping: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  queue: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  moving: 'M8 7h12l2 5h-2v6a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H6v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-6H1l2-5h5V4a1 1 0 011-1h4a1 1 0 011 1v3z',
  laundry: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z'
}

const estimatedTime = computed(() => {
  if (!props.request?.distance) return '~15 นาที'
  // Rough estimate: 2 min per km in city traffic
  const minutes = Math.round(props.request.distance * 2)
  return `~${minutes} นาที`
})

const handleConfirm = () => {
  if (!props.isAccepting) {
    emit('confirm')
  }
}

const handleCancel = () => {
  if (!props.isAccepting) {
    emit('cancel')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show && request" class="modal-overlay" @click.self="handleCancel">
        <div class="modal-container">
          <!-- Header -->
          <div class="modal-header">
            <div class="type-badge" :class="request.type">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="typeIcons[request.type] || typeIcons.ride"/>
              </svg>
              <span>{{ typeLabels[request.type] || request.type }}</span>
            </div>
            <button class="close-btn" @click="handleCancel" :disabled="isAccepting">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Customer Info -->
          <div class="customer-section">
            <div class="customer-avatar">
              {{ (request.customer_name || 'ล')[0] }}
            </div>
            <div class="customer-info">
              <span class="customer-name">{{ request.customer_name || 'ลูกค้า' }}</span>
              <div v-if="request.customer_rating" class="customer-rating">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>{{ request.customer_rating.toFixed(1) }}</span>
              </div>
            </div>
          </div>

          <!-- Route Info -->
          <div class="route-section">
            <div class="route-point pickup">
              <div class="point-marker">
                <div class="marker-dot pickup"></div>
              </div>
              <div class="point-content">
                <span class="point-label">จุดรับ</span>
                <span class="point-address">{{ request.pickup_address }}</span>
              </div>
            </div>
            <div class="route-line"></div>
            <div class="route-point destination">
              <div class="point-marker">
                <div class="marker-dot destination"></div>
              </div>
              <div class="point-content">
                <span class="point-label">จุดส่ง</span>
                <span class="point-address">{{ request.destination_address }}</span>
              </div>
            </div>
          </div>

          <!-- Stats Row -->
          <div class="stats-row">
            <div class="stat-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              <span class="stat-value">{{ request.distance ? request.distance.toFixed(1) + ' กม.' : '-' }}</span>
              <span class="stat-label">ระยะทาง</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="stat-value">{{ estimatedTime }}</span>
              <span class="stat-label">เวลาโดยประมาณ</span>
            </div>
          </div>

          <!-- Fare Display -->
          <div class="fare-section">
            <span class="fare-label">ค่าบริการ</span>
            <span class="fare-value">฿{{ request.estimated_fare.toLocaleString() }}</span>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button class="btn-cancel" @click="handleCancel" :disabled="isAccepting">
              ยกเลิก
            </button>
            <button class="btn-confirm" @click="handleConfirm" :disabled="isAccepting">
              <span v-if="isAccepting" class="btn-spinner"></span>
              <span v-else>ยืนยันรับงาน</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

/* Modal Container */
.modal-container {
  width: 100%;
  max-width: 420px;
  background: #FFFFFF;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  max-height: 90vh;
  overflow-y: auto;
}

@media (min-width: 640px) {
  .modal-overlay {
    align-items: center;
  }
  .modal-container {
    border-radius: 20px;
  }
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.type-badge.ride {
  background: #E8F5EF;
  color: #00A86B;
}

.type-badge.delivery {
  background: #FEF3C7;
  color: #D97706;
}

.type-badge.shopping {
  background: #EDE9FE;
  color: #7C3AED;
}

.type-badge.queue,
.type-badge.moving,
.type-badge.laundry {
  background: #F0F0F0;
  color: #1A1A1A;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #666666;
  transition: background 0.2s;
}

.close-btn:hover:not(:disabled) {
  background: #E8E8E8;
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Customer Section */
.customer-section {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #F9F9F9;
  border-radius: 14px;
  margin-bottom: 20px;
}

.customer-avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #00A86B;
  color: white;
  font-size: 20px;
  font-weight: 600;
  border-radius: 50%;
}

.customer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.customer-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #F59E0B;
  font-size: 14px;
  font-weight: 500;
}

/* Route Section */
.route-section {
  position: relative;
  padding: 0 0 0 24px;
  margin-bottom: 20px;
}

.route-point {
  display: flex;
  gap: 12px;
  padding: 12px 0;
}

.point-marker {
  position: absolute;
  left: 0;
  width: 24px;
  display: flex;
  justify-content: center;
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.marker-dot.pickup {
  background: #00A86B;
}

.marker-dot.destination {
  background: #E53935;
}

.route-line {
  position: absolute;
  left: 11px;
  top: 36px;
  bottom: 36px;
  width: 2px;
  background: linear-gradient(to bottom, #00A86B, #E53935);
}

.point-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.point-label {
  font-size: 12px;
  color: #999999;
  font-weight: 500;
}

.point-address {
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.4;
}

/* Stats Row */
.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 16px;
  background: #F9F9F9;
  border-radius: 14px;
  margin-bottom: 20px;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #666666;
}

.stat-item svg {
  color: #00A86B;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.stat-label {
  font-size: 11px;
  color: #999999;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #E8E8E8;
}

/* Fare Section */
.fare-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  border-radius: 14px;
  margin-bottom: 20px;
}

.fare-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

.fare-value {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
}

/* Actions */
.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 16px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: #F5F5F5;
  color: #666666;
}

.btn-cancel:hover:not(:disabled) {
  background: #E8E8E8;
}

.btn-confirm {
  background: #00A86B;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-confirm:hover:not(:disabled) {
  background: #008F5B;
}

.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container {
  transform: translateY(100%);
}

.modal-leave-to .modal-container {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .modal-enter-from .modal-container,
  .modal-leave-to .modal-container {
    transform: scale(0.95);
  }
}
</style>
