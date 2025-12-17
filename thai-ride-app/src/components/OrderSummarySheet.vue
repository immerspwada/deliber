<script setup lang="ts">
/**
 * Feature: F340 - Order Summary Sheet
 * Bottom sheet showing order summary details
 */
import { computed } from 'vue'

interface OrderSummary {
  id: string
  trackingId: string
  type: 'delivery' | 'shopping'
  status: string
  statusLabel: string
  from: string
  to: string
  date: string
  time: string
  items?: Array<{ name: string; qty: number }>
  fees: Array<{ label: string; amount: number }>
  total: number
  paymentMethod: string
  providerName?: string
  providerPhone?: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  order: OrderSummary | null
}>(), {})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'contact': []
  'track': []
  'cancel': []
  'help': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="isOpen && order" class="sheet-overlay" @click.self="isOpen = false">
        <div class="sheet-content">
          <div class="sheet-handle" />
          
          <div class="sheet-header">
            <div class="order-info">
              <h2 class="order-title">{{ order.type === 'delivery' ? 'ส่งของ' : 'ซื้อของ' }}</h2>
              <span class="order-id">#{{ order.trackingId }}</span>
            </div>
            <span class="order-status">{{ order.statusLabel }}</span>
          </div>

          <div class="sheet-body">
            <div class="route-section">
              <div class="route-point">
                <div class="point-dot from" />
                <div class="point-info">
                  <span class="point-label">จาก</span>
                  <span class="point-address">{{ order.from }}</span>
                </div>
              </div>
              <div class="route-point">
                <div class="point-dot to" />
                <div class="point-info">
                  <span class="point-label">ถึง</span>
                  <span class="point-address">{{ order.to }}</span>
                </div>
              </div>
            </div>

            <div v-if="order.items && order.items.length > 0" class="items-section">
              <h3 class="section-title">รายการ ({{ order.items.length }})</h3>
              <div class="items-list">
                <div v-for="(item, i) in order.items" :key="i" class="item-row">
                  <span class="item-qty">{{ item.qty }}x</span>
                  <span class="item-name">{{ item.name }}</span>
                </div>
              </div>
            </div>

            <div class="fees-section">
              <div v-for="(fee, i) in order.fees" :key="i" class="fee-row">
                <span class="fee-label">{{ fee.label }}</span>
                <span class="fee-amount">฿{{ fee.amount.toFixed(0) }}</span>
              </div>
              <div class="total-row">
                <span class="total-label">รวมทั้งหมด</span>
                <span class="total-amount">฿{{ order.total.toLocaleString() }}</span>
              </div>
            </div>

            <div class="payment-section">
              <span class="payment-label">ชำระด้วย</span>
              <span class="payment-method">{{ order.paymentMethod }}</span>
            </div>

            <div class="datetime-section">
              <span class="datetime">{{ order.date }} {{ order.time }}</span>
            </div>
          </div>

          <div class="sheet-footer">
            <button type="button" class="action-btn" @click="emit('help')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
              </svg>
              ช่วยเหลือ
            </button>
            <button v-if="order.providerPhone" type="button" class="action-btn primary" @click="emit('contact')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
              ติดต่อ
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
  max-height: 85vh;
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
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px 16px;
  border-bottom: 1px solid #e5e5e5;
}

.order-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.order-id {
  font-size: 13px;
  color: #6b6b6b;
}

.order-status {
  font-size: 13px;
  font-weight: 500;
  padding: 4px 10px;
  background: #f6f6f6;
  border-radius: 4px;
}

.sheet-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
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

.route-point:first-child {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #e5e5e5;
}

.point-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
}

.point-dot.from { background: #2e7d32; }
.point-dot.to { background: #000; }

.point-info { flex: 1; }

.point-label {
  font-size: 12px;
  color: #6b6b6b;
  display: block;
}

.point-address {
  font-size: 14px;
  font-weight: 500;
  color: #000;
}

.items-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  margin: 0 0 8px;
}

.items-list {
  background: #f6f6f6;
  border-radius: 8px;
  padding: 8px 12px;
}

.item-row {
  display: flex;
  gap: 8px;
  padding: 4px 0;
}

.item-qty {
  font-size: 13px;
  font-weight: 600;
  color: #000;
}

.item-name {
  font-size: 13px;
  color: #000;
}

.fees-section {
  border-top: 1px solid #e5e5e5;
  padding-top: 16px;
  margin-bottom: 16px;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.fee-label {
  font-size: 14px;
  color: #6b6b6b;
}

.fee-amount {
  font-size: 14px;
  color: #000;
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 1px solid #e5e5e5;
}

.total-label {
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.total-amount {
  font-size: 20px;
  font-weight: 700;
  color: #000;
}

.payment-section {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
  margin-bottom: 12px;
}

.payment-label {
  font-size: 13px;
  color: #6b6b6b;
}

.payment-method {
  font-size: 13px;
  font-weight: 500;
  color: #000;
}

.datetime-section {
  text-align: center;
}

.datetime {
  font-size: 13px;
  color: #6b6b6b;
}

.sheet-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #e5e5e5;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #000;
  cursor: pointer;
}

.action-btn.primary {
  background: #000;
  color: #fff;
}

.sheet-enter-active, .sheet-leave-active {
  transition: opacity 0.3s;
}

.sheet-enter-active .sheet-content, .sheet-leave-active .sheet-content {
  transition: transform 0.3s;
}

.sheet-enter-from, .sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-content, .sheet-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
