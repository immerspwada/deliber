<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  isOpen: boolean
  serviceType: 'ride' | 'delivery' | 'shopping'
  from: string
  to: string
  estimatedPrice: number
  estimatedTime: string
  paymentMethod: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const serviceNames = {
  ride: 'เรียกรถ',
  delivery: 'ส่งของ',
  shopping: 'ซื้อของ'
}

const serviceName = computed(() => serviceNames[props.serviceType])

const confirmService = () => {
  emit('confirm')
}

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>ยืนยันการ{{ serviceName }}</h2>
          <button @click="closeModal" class="close-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Route Info -->
          <div class="route-section">
            <div class="route-point">
              <div class="route-dot from"></div>
              <span>{{ from }}</span>
            </div>
            <div class="route-line"></div>
            <div class="route-point">
              <div class="route-dot to"></div>
              <span>{{ to }}</span>
            </div>
          </div>

          <!-- Details -->
          <div class="details-section">
            <div class="detail-row">
              <span class="detail-label">ราคาโดยประมาณ</span>
              <span class="detail-value price">฿{{ estimatedPrice }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">เวลาโดยประมาณ</span>
              <span class="detail-value">{{ estimatedTime }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">ชำระเงินด้วย</span>
              <span class="detail-value">{{ paymentMethod }}</span>
            </div>
          </div>

          <!-- Note -->
          <div class="note-section">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>ราคาอาจเปลี่ยนแปลงตามสภาพการจราจร</span>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeModal" class="btn-secondary">ยกเลิก</button>
          <button @click="confirmService" class="btn-primary">ยืนยัน</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 200;
}

.modal {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.close-btn svg {
  width: 24px;
  height: 24px;
}

.modal-body {
  padding: 20px;
}

.route-section {
  margin-bottom: 20px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
}

.route-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.route-dot.from { background-color: var(--color-success); }
.route-dot.to { background-color: var(--color-error); }

.route-line {
  width: 2px;
  height: 16px;
  background-color: var(--color-border);
  margin-left: 5px;
}

.details-section {
  padding: 16px;
  background-color: var(--color-secondary);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.detail-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.detail-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
}

.detail-value.price {
  font-size: 18px;
  font-weight: 700;
}

.note-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: rgba(39, 110, 241, 0.1);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.note-section svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--color-border);
}

.btn-secondary, .btn-primary {
  flex: 1;
  padding: 14px;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  background-color: var(--color-secondary);
  border: none;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
  border: none;
}
</style>
