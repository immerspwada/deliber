<script setup lang="ts">
/**
 * Feature: F316 - Delivery Confirm Sheet
 * Bottom sheet for confirming delivery order
 */
import { computed } from 'vue'

interface DeliveryDetails {
  pickup: { address: string; name: string }
  dropoff: { address: string; name: string; phone: string }
  packageType: string
  weight: string
  fee: number
  distance: string
  eta: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  delivery: DeliveryDetails | null
  paymentMethod?: string
  loading?: boolean
}>(), {
  paymentMethod: 'เงินสด',
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'edit': [field: string]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="isOpen" class="sheet-overlay" @click.self="isOpen = false">
        <div class="sheet-content">
          <div class="sheet-handle" />
          
          <div class="sheet-header">
            <h2 class="sheet-title">ยืนยันการจัดส่ง</h2>
            <button type="button" class="close-btn" @click="isOpen = false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div v-if="delivery" class="sheet-body">
            <div class="route-section">
              <div class="route-point">
                <div class="point-icon pickup">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                </div>
                <div class="point-info">
                  <span class="point-label">รับพัสดุ</span>
                  <p class="point-address">{{ delivery.pickup.address }}</p>
                  <span class="point-name">{{ delivery.pickup.name }}</span>
                </div>
                <button type="button" class="edit-btn" @click="emit('edit', 'pickup')">แก้ไข</button>
              </div>
              
              <div class="route-line" />
              
              <div class="route-point">
                <div class="point-icon dropoff">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                </div>
                <div class="point-info">
                  <span class="point-label">ส่งพัสดุ</span>
                  <p class="point-address">{{ delivery.dropoff.address }}</p>
                  <span class="point-name">{{ delivery.dropoff.name }} • {{ delivery.dropoff.phone }}</span>
                </div>
                <button type="button" class="edit-btn" @click="emit('edit', 'dropoff')">แก้ไข</button>
              </div>
            </div>

            <div class="package-info">
              <div class="info-row">
                <span class="info-label">ประเภทพัสดุ</span>
                <span class="info-value">{{ delivery.packageType }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">น้ำหนัก</span>
                <span class="info-value">{{ delivery.weight }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">ระยะทาง</span>
                <span class="info-value">{{ delivery.distance }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">เวลาโดยประมาณ</span>
                <span class="info-value">{{ delivery.eta }}</span>
              </div>
            </div>

            <div class="payment-section">
              <div class="payment-row">
                <span class="payment-label">ชำระเงิน</span>
                <button type="button" class="payment-method" @click="emit('edit', 'payment')">
                  {{ paymentMethod }}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
              <div class="total-row">
                <span class="total-label">ค่าจัดส่ง</span>
                <span class="total-value">฿{{ delivery.fee.toFixed(0) }}</span>
              </div>
            </div>
          </div>

          <div class="sheet-footer">
            <button 
              type="button" 
              class="confirm-btn"
              :disabled="loading"
              @click="emit('confirm')"
            >
              <span v-if="loading" class="spinner" />
              <span v-else>ยืนยันการจัดส่ง</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.sheet-content {
  width: 100%;
  max-height: 90vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 8px auto;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 16px;
}

.sheet-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b6b6b;
}

.sheet-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.route-section {
  background: #f6f6f6;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.route-point {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.point-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.point-icon.pickup {
  background: #e8f5e9;
  color: #2e7d32;
}

.point-icon.dropoff {
  background: #000;
  color: #fff;
}

.point-info {
  flex: 1;
  min-width: 0;
}

.point-label {
  font-size: 12px;
  color: #6b6b6b;
}

.point-address {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  margin: 2px 0;
}

.point-name {
  font-size: 12px;
  color: #6b6b6b;
}

.edit-btn {
  font-size: 13px;
  color: #000;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.route-line {
  width: 2px;
  height: 24px;
  background: #e5e5e5;
  margin: 8px 0 8px 15px;
}

.package-info {
  background: #f6f6f6;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid #e5e5e5;
}

.info-label {
  font-size: 14px;
  color: #6b6b6b;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.payment-section {
  border-top: 1px solid #e5e5e5;
  padding-top: 16px;
}

.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.payment-label {
  font-size: 14px;
  color: #6b6b6b;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  background: none;
  border: none;
  cursor: pointer;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-size: 16px;
  font-weight: 500;
  color: #000;
}

.total-value {
  font-size: 24px;
  font-weight: 700;
  color: #000;
}

.sheet-footer {
  padding: 16px;
  border-top: 1px solid #e5e5e5;
}

.confirm-btn {
  width: 100%;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.confirm-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s;
}

.sheet-enter-active .sheet-content,
.sheet-leave-active .sheet-content {
  transition: transform 0.3s;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-content,
.sheet-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
