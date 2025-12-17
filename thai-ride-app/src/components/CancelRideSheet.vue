<script setup lang="ts">
/**
 * Feature: F297 - Cancel Ride Sheet
 * Ride cancellation bottom sheet
 */
import { ref } from 'vue'

defineProps<{
  visible: boolean
  cancellationFee?: number
}>()

const emit = defineEmits<{
  'close': []
  'confirm': [reason: string]
}>()

const selectedReason = ref('')
const otherReason = ref('')

const reasons = [
  'เปลี่ยนใจไม่ต้องการเดินทาง',
  'คนขับใช้เวลานานเกินไป',
  'จองผิดสถานที่',
  'ราคาสูงเกินไป',
  'พบวิธีเดินทางอื่น',
  'อื่นๆ'
]

const confirm = () => {
  const reason = selectedReason.value === 'อื่นๆ' ? otherReason.value : selectedReason.value
  if (reason) {
    emit('confirm', reason)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="sheet-overlay" @click="emit('close')">
        <div class="sheet-content" @click.stop>
          <div class="sheet-handle"></div>
          
          <div class="sheet-header">
            <h3>ยกเลิกการเดินทาง</h3>
            <p v-if="cancellationFee" class="fee-warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              คุณจะถูกเรียกเก็บค่าธรรมเนียม ฿{{ cancellationFee }}
            </p>
          </div>
          
          <div class="reasons-list">
            <p class="label">เหตุผลในการยกเลิก</p>
            <button
              v-for="reason in reasons"
              :key="reason"
              type="button"
              class="reason-btn"
              :class="{ selected: selectedReason === reason }"
              @click="selectedReason = reason"
            >
              <span>{{ reason }}</span>
              <div class="radio" :class="{ checked: selectedReason === reason }"></div>
            </button>
          </div>
          
          <div v-if="selectedReason === 'อื่นๆ'" class="other-input">
            <textarea
              v-model="otherReason"
              placeholder="กรุณาระบุเหตุผล..."
              rows="3"
            ></textarea>
          </div>
          
          <div class="sheet-actions">
            <button type="button" class="btn-cancel" @click="emit('close')">
              ไม่ยกเลิก
            </button>
            <button
              type="button"
              class="btn-confirm"
              :disabled="!selectedReason || (selectedReason === 'อื่นๆ' && !otherReason)"
              @click="confirm"
            >
              ยืนยันยกเลิก
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
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.sheet-content {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 12px 20px 24px;
  max-height: 80vh;
  overflow-y: auto;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.sheet-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px;
}

.fee-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #e11900;
  margin: 0;
}

.reasons-list {
  margin-top: 20px;
}

.label {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0 0 12px;
}

.reason-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.reason-btn.selected {
  background: #fff;
  border: 2px solid #000;
}

.radio {
  width: 20px;
  height: 20px;
  border: 2px solid #ccc;
  border-radius: 50%;
}

.radio.checked {
  border-color: #000;
  background: radial-gradient(#000 40%, transparent 45%);
}

.other-input {
  margin-top: 12px;
}

.other-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  outline: none;
}

.sheet-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 14px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-cancel {
  background: #f6f6f6;
  color: #000;
  border: none;
}

.btn-confirm {
  background: #e11900;
  color: #fff;
  border: none;
}

.btn-confirm:disabled {
  background: #ccc;
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from .sheet-content,
.slide-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
