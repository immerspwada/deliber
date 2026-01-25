<!--
  Feature: F54 - Cancellation Modal Component
  
  Modal สำหรับยกเลิกการเดินทาง
  - เลือกเหตุผล
  - แสดงค่าธรรมเนียม
  - ยืนยันการยกเลิก
-->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header">
            <h2>ยกเลิกการเดินทาง</h2>
            <button class="close-btn" @click="$emit('close')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Fee Warning -->
          <div v-if="cancellationFee > 0" class="fee-warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div class="fee-text">
              <span>ค่าธรรมเนียมยกเลิก</span>
              <strong>฿{{ cancellationFee }}</strong>
            </div>
          </div>

          <div v-else class="free-cancellation">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <span>ยกเลิกฟรี ไม่มีค่าธรรมเนียม</span>
          </div>

          <!-- Reason Selection -->
          <div class="reasons-section">
            <div class="section-title">เลือกเหตุผลการยกเลิก</div>
            <div class="reasons-list">
              <button
                v-for="option in reasons"
                :key="option.reason"
                class="reason-option"
                :class="{ selected: selectedReason === option.reason }"
                @click="selectReason(option.reason)"
              >
                <div class="reason-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle v-if="option.icon === 'refresh'" cx="12" cy="12" r="10"/>
                    <path v-if="option.icon === 'map-pin'" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle v-if="option.icon === 'map-pin'" cx="12" cy="10" r="3"/>
                    <circle v-if="option.icon === 'pause'" cx="12" cy="12" r="10"/>
                    <line v-if="option.icon === 'pause'" x1="10" y1="15" x2="10" y2="9"/>
                    <line v-if="option.icon === 'pause'" x1="14" y1="15" x2="14" y2="9"/>
                    <circle v-if="option.icon === 'x-circle'" cx="12" cy="12" r="10"/>
                    <line v-if="option.icon === 'x-circle'" x1="15" y1="9" x2="9" y2="15"/>
                    <line v-if="option.icon === 'x-circle'" x1="9" y1="9" x2="15" y2="15"/>
                    <path v-if="option.icon === 'car'" d="M5 17h14v-5l-2-4H7l-2 4v5z"/>
                    <circle v-if="option.icon === 'car'" cx="7.5" cy="17" r="1.5"/>
                    <circle v-if="option.icon === 'car'" cx="16.5" cy="17" r="1.5"/>
                    <line v-if="option.icon === 'dollar-sign'" x1="12" y1="1" x2="12" y2="23"/>
                    <path v-if="option.icon === 'dollar-sign'" d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    <circle v-if="option.icon === 'clock'" cx="12" cy="12" r="10"/>
                    <polyline v-if="option.icon === 'clock'" points="12,6 12,12 16,14"/>
                    <path v-if="option.icon === 'alert-triangle'" d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line v-if="option.icon === 'alert-triangle'" x1="12" y1="9" x2="12" y2="13"/>
                    <line v-if="option.icon === 'alert-triangle'" x1="12" y1="17" x2="12.01" y2="17"/>
                    <circle v-if="option.icon === 'more-horizontal'" cx="12" cy="12" r="1"/>
                    <circle v-if="option.icon === 'more-horizontal'" cx="19" cy="12" r="1"/>
                    <circle v-if="option.icon === 'more-horizontal'" cx="5" cy="12" r="1"/>
                  </svg>
                </div>
                <span class="reason-label">{{ option.label }}</span>
                <div v-if="selectedReason === option.reason" class="check-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <!-- Note Input -->
          <div v-if="requiresNote" class="note-section">
            <label>รายละเอียดเพิ่มเติม</label>
            <textarea
              v-model="note"
              placeholder="กรุณาระบุเหตุผล..."
              rows="3"
            ></textarea>
          </div>

          <!-- Policy -->
          <div class="policy-section">
            <button class="policy-toggle" @click="showPolicy = !showPolicy">
              <span>นโยบายการยกเลิก</span>
              <svg 
                width="16" height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2"
                :class="{ rotated: showPolicy }"
              >
                <polyline points="6,9 12,15 18,9"/>
              </svg>
            </button>
            <Transition name="slide">
              <ul v-if="showPolicy" class="policy-list">
                <li v-for="(policy, index) in policies" :key="index">{{ policy }}</li>
              </ul>
            </Transition>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button class="btn-secondary" @click="$emit('close')">
              ไม่ยกเลิก
            </button>
            <button 
              class="btn-danger" 
              :disabled="!selectedReason || loading || (requiresNote && !note.trim())"
              @click="confirmCancel"
            >
              <span v-if="loading">กำลังยกเลิก...</span>
              <span v-else>ยืนยันยกเลิก</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  useCancellation, 
  CUSTOMER_CANCELLATION_REASONS,
  type CancellationReason 
} from '../composables/useCancellation'

interface Props {
  isOpen: boolean
  rideId: string
  status: string
  createdAt: Date
  estimatedFare?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'cancelled', result: { fee: number; refundAmount: number }): void
}>()

const { 
  loading, 
  calculateCancellationFee, 
  cancelRide, 
  getCancellationPolicy 
} = useCancellation()

const selectedReason = ref<CancellationReason | null>(null)
const note = ref('')
const showPolicy = ref(false)

const reasons = CUSTOMER_CANCELLATION_REASONS

const cancellationFee = computed(() => {
  return calculateCancellationFee(props.status, props.createdAt, props.estimatedFare)
})

const requiresNote = computed(() => {
  const option = reasons.find(r => r.reason === selectedReason.value)
  return option?.requiresNote || false
})

const policies = getCancellationPolicy()

const selectReason = (reason: CancellationReason) => {
  selectedReason.value = reason
}

const confirmCancel = async () => {
  if (!selectedReason.value) return

  const result = await cancelRide(
    props.rideId,
    selectedReason.value,
    note.value || undefined
  )

  if (result.success) {
    emit('cancelled', { fee: result.fee, refundAmount: result.refundAmount })
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
  max-height: 90vh;
  overflow-y: auto;
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

/* Fee Warning */
.fee-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 20px;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 8px;
  color: #92400e;
}

.fee-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fee-text span {
  font-size: 13px;
}

.fee-text strong {
  font-size: 16px;
}

.free-cancellation {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 20px;
  padding: 12px 16px;
  background: #dcfce7;
  border-radius: 8px;
  color: #22c55e;
  font-size: 14px;
}

/* Reasons */
.reasons-section {
  padding: 0 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 12px;
}

.reasons-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reason-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.reason-option:hover {
  background: #e5e5e5;
}

.reason-option.selected {
  background: #ffffff;
  border-color: #000000;
}

.reason-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 8px;
  color: #6b6b6b;
}

.reason-option.selected .reason-icon {
  background: #000000;
  color: #ffffff;
}

.reason-label {
  flex: 1;
  font-size: 14px;
  color: #000000;
}

.check-icon {
  color: #000000;
}

/* Note */
.note-section {
  padding: 16px 20px;
}

.note-section label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  margin-bottom: 8px;
}

.note-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
}

.note-section textarea:focus {
  outline: none;
  border-color: #000000;
}

/* Policy */
.policy-section {
  padding: 16px 20px;
  border-top: 1px solid #e5e5e5;
}

.policy-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
}

.policy-toggle svg {
  transition: transform 0.2s ease;
}

.policy-toggle svg.rotated {
  transform: rotate(180deg);
}

.policy-list {
  margin: 12px 0 0;
  padding-left: 20px;
  font-size: 13px;
  color: #6b6b6b;
}

.policy-list li {
  margin-bottom: 4px;
}

/* Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e5e5;
}

.btn-secondary,
.btn-danger {
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

.btn-danger {
  background: #e11900;
  border: none;
  color: #ffffff;
}

.btn-danger:hover {
  background: #c41600;
}

.btn-danger:disabled {
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

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
