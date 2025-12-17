<script setup lang="ts">
/**
 * Feature: F317 - Shopping Confirm Sheet
 * Bottom sheet for confirming shopping order
 */
import { computed } from 'vue'

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  note?: string
}

interface ShoppingDetails {
  store: { name: string; address: string }
  items: ShoppingItem[]
  deliveryAddress: string
  serviceFee: number
  deliveryFee: number
  estimatedTotal: number
  eta: string
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  shopping: ShoppingDetails | null
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
  'addItem': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const totalFee = computed(() => {
  if (!props.shopping) return 0
  return props.shopping.serviceFee + props.shopping.deliveryFee
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="isOpen" class="sheet-overlay" @click.self="isOpen = false">
        <div class="sheet-content">
          <div class="sheet-handle" />
          
          <div class="sheet-header">
            <h2 class="sheet-title">ยืนยันคำสั่งซื้อ</h2>
            <button type="button" class="close-btn" @click="isOpen = false">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div v-if="shopping" class="sheet-body">
            <div class="store-section">
              <div class="store-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <div class="store-info">
                <h3 class="store-name">{{ shopping.store.name }}</h3>
                <p class="store-address">{{ shopping.store.address }}</p>
              </div>
              <button type="button" class="edit-btn" @click="emit('edit', 'store')">เปลี่ยน</button>
            </div>

            <div class="items-section">
              <div class="section-header">
                <h4 class="section-title">รายการสินค้า ({{ shopping.items.length }})</h4>
                <button type="button" class="add-btn" @click="emit('addItem')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  เพิ่ม
                </button>
              </div>
              
              <div class="items-list">
                <div v-for="item in shopping.items" :key="item.id" class="item-row">
                  <span class="item-qty">{{ item.quantity }}x</span>
                  <div class="item-info">
                    <span class="item-name">{{ item.name }}</span>
                    <span v-if="item.note" class="item-note">{{ item.note }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="delivery-section">
              <div class="delivery-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
                <span class="delivery-label">ส่งไปที่</span>
              </div>
              <p class="delivery-address">{{ shopping.deliveryAddress }}</p>
              <button type="button" class="edit-btn" @click="emit('edit', 'address')">แก้ไข</button>
            </div>

            <div class="fee-section">
              <div class="fee-row">
                <span class="fee-label">ค่าบริการ</span>
                <span class="fee-value">฿{{ shopping.serviceFee.toFixed(0) }}</span>
              </div>
              <div class="fee-row">
                <span class="fee-label">ค่าจัดส่ง</span>
                <span class="fee-value">฿{{ shopping.deliveryFee.toFixed(0) }}</span>
              </div>
              <div class="fee-row estimate">
                <span class="fee-label">ค่าสินค้าโดยประมาณ</span>
                <span class="fee-value">฿{{ shopping.estimatedTotal.toFixed(0) }}</span>
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
                <span class="total-label">รวมค่าบริการ</span>
                <span class="total-value">฿{{ totalFee.toFixed(0) }}</span>
              </div>
              <p class="total-note">*ยอดชำระจริงจะคำนวณจากราคาสินค้าที่ซื้อได้</p>
            </div>

            <div class="eta-section">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span class="eta-text">ถึงภายใน {{ shopping.eta }}</span>
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
              <span v-else>ยืนยันคำสั่งซื้อ</span>
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

.store-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
  margin-bottom: 16px;
}

.store-icon {
  width: 48px;
  height: 48px;
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
}

.store-info {
  flex: 1;
}

.store-name {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0 0 2px;
}

.store-address {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.edit-btn {
  font-size: 13px;
  color: #000;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.items-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #000;
  background: none;
  border: none;
  cursor: pointer;
}

.items-list {
  background: #f6f6f6;
  border-radius: 12px;
  padding: 8px 16px;
}

.item-row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
}

.item-row:not(:last-child) {
  border-bottom: 1px solid #e5e5e5;
}

.item-qty {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  min-width: 32px;
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 14px;
  color: #000;
  display: block;
}

.item-note {
  font-size: 12px;
  color: #6b6b6b;
}

.delivery-section {
  background: #f6f6f6;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  position: relative;
}

.delivery-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: #6b6b6b;
}

.delivery-label {
  font-size: 12px;
}

.delivery-address {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  margin: 0;
  padding-right: 48px;
}

.delivery-section .edit-btn {
  position: absolute;
  top: 16px;
  right: 16px;
}

.fee-section {
  border-top: 1px solid #e5e5e5;
  padding: 16px 0;
}

.fee-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
}

.fee-row.estimate {
  border-top: 1px dashed #e5e5e5;
  margin-top: 8px;
  padding-top: 12px;
}

.fee-label {
  font-size: 14px;
  color: #6b6b6b;
}

.fee-value {
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

.total-note {
  font-size: 12px;
  color: #6b6b6b;
  margin: 8px 0 0;
}

.eta-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
  margin-top: 16px;
  color: #6b6b6b;
}

.eta-text {
  font-size: 14px;
  font-weight: 500;
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
