<!--
  Feature: F57 - Tip Modal Component
  
  Modal สำหรับให้ทิปคนขับ
  - เลือกจำนวนทิป
  - กรอกจำนวนเอง
  - ยืนยันการให้ทิป
-->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header">
            <h2>ให้ทิปคนขับ</h2>
            <button class="close-btn" @click="$emit('close')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Driver Info -->
          <div v-if="driverName" class="driver-section">
            <div class="driver-avatar">
              {{ driverName.charAt(0) }}
            </div>
            <div class="driver-info">
              <div class="driver-name">{{ driverName }}</div>
              <div v-if="driverRating" class="driver-rating">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffc043">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>{{ driverRating.toFixed(1) }}</span>
              </div>
            </div>
          </div>

          <!-- Tip Message -->
          <div class="tip-message">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <p>ทิปของคุณจะส่งตรงถึงคนขับ 100%</p>
          </div>

          <!-- Tip Options -->
          <div class="tip-options">
            <button
              v-for="option in tipOptions"
              :key="option.amount"
              class="tip-option"
              :class="{ selected: selectedAmount === option.amount && !isCustom }"
              @click="selectTip(option.amount)"
            >
              {{ option.label }}
            </button>
            <button
              class="tip-option custom"
              :class="{ selected: isCustom }"
              @click="enableCustom"
            >
              อื่นๆ
            </button>
          </div>

          <!-- Custom Amount -->
          <div v-if="isCustom" class="custom-amount">
            <div class="input-wrapper">
              <span class="currency">฿</span>
              <input
                ref="customInput"
                v-model.number="customAmount"
                type="number"
                placeholder="0"
                min="0"
                max="10000"
              />
            </div>
          </div>

          <!-- Selected Amount Display -->
          <div v-if="finalAmount > 0" class="selected-display">
            <span class="label">ทิปที่จะให้</span>
            <span class="amount">฿{{ finalAmount }}</span>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button class="btn-secondary" @click="skipTip">
              ข้ามไปก่อน
            </button>
            <button 
              class="btn-primary" 
              :disabled="loading"
              @click="confirmTip"
            >
              <span v-if="loading">กำลังดำเนินการ...</span>
              <span v-else-if="finalAmount > 0">ให้ทิป ฿{{ finalAmount }}</span>
              <span v-else>ไม่ให้ทิป</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useTip, TIP_OPTIONS } from '../composables/useTip'

interface Props {
  isOpen: boolean
  serviceType: 'ride' | 'delivery' | 'shopping'
  serviceId: string
  driverName?: string
  driverRating?: number
  fare?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'tipped', amount: number): void
  (e: 'skipped'): void
}>()

const { loading, addTipToRide, addTipToDelivery, addTipToShopping } = useTip()

const selectedAmount = ref(20) // Default to ฿20
const customAmount = ref(0)
const isCustom = ref(false)
const customInput = ref<HTMLInputElement | null>(null)

const tipOptions = TIP_OPTIONS.filter(o => o.amount > 0)

const finalAmount = computed(() => {
  if (isCustom.value) {
    return customAmount.value || 0
  }
  return selectedAmount.value
})

const selectTip = (amount: number) => {
  isCustom.value = false
  selectedAmount.value = amount
}

const enableCustom = async () => {
  isCustom.value = true
  customAmount.value = 0
  await nextTick()
  customInput.value?.focus()
}

const skipTip = () => {
  emit('skipped')
  emit('close')
}

const confirmTip = async () => {
  const amount = finalAmount.value

  let result
  switch (props.serviceType) {
    case 'ride':
      result = await addTipToRide(props.serviceId, amount)
      break
    case 'delivery':
      result = await addTipToDelivery(props.serviceId, amount)
      break
    case 'shopping':
      result = await addTipToShopping(props.serviceId, amount)
      break
  }

  if (result?.success) {
    emit('tipped', amount)
    emit('close')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 480px;
  padding-bottom: env(safe-area-inset-bottom);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

.close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #6b6b6b;
}

/* Driver Section */
.driver-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #f6f6f6;
}

.driver-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #000000;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
}

.driver-name {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
}

.driver-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  font-size: 14px;
  color: #6b6b6b;
}

/* Tip Message */
.tip-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  color: #6b6b6b;
}

.tip-message svg {
  color: #e11900;
  flex-shrink: 0;
}

.tip-message p {
  margin: 0;
  font-size: 14px;
}

/* Tip Options */
.tip-options {
  display: flex;
  gap: 8px;
  padding: 0 20px;
  flex-wrap: wrap;
}

.tip-option {
  flex: 1;
  min-width: 60px;
  padding: 14px 12px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tip-option:hover {
  background: #e5e5e5;
}

.tip-option.selected {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.tip-option.custom {
  flex: 0.8;
}

/* Custom Amount */
.custom-amount {
  padding: 16px 20px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f6f6f6;
  border: 2px solid #000000;
  border-radius: 8px;
}

.currency {
  font-size: 20px;
  font-weight: 600;
  color: #000000;
}

.input-wrapper input {
  flex: 1;
  border: none;
  background: none;
  font-size: 24px;
  font-weight: 600;
  color: #000000;
  text-align: right;
}

.input-wrapper input:focus {
  outline: none;
}

.input-wrapper input::placeholder {
  color: #cccccc;
}

/* Selected Display */
.selected-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f6f6f6;
  margin: 16px 20px;
  border-radius: 8px;
}

.selected-display .label {
  font-size: 14px;
  color: #6b6b6b;
}

.selected-display .amount {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
}

/* Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 14px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-secondary {
  background: #f6f6f6;
  border: none;
  color: #000000;
}

.btn-secondary:hover {
  background: #e5e5e5;
}

.btn-primary {
  background: #000000;
  border: none;
  color: #ffffff;
}

.btn-primary:hover {
  background: #333333;
}

.btn-primary:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: translateY(100%);
}
</style>
