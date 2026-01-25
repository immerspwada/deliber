<!--
  DoubleConfirmModal - Critical Action Confirmation
  
  Implements "Double Confirmation" for destructive actions.
  Features:
  - Countdown timer for critical actions
  - Type-to-confirm for highest severity
  - Audit logging integration
  - Prevents accidental clicks
-->

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleCancel">
        <div class="modal-container" :class="severityClass">
          <!-- Header -->
          <div class="modal-header">
            <div class="severity-icon" :class="severityClass">
              <svg v-if="severity === 'critical'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <svg v-else-if="severity === 'high'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
            </div>
            <h2 class="modal-title">{{ title }}</h2>
          </div>

          <!-- Content -->
          <div class="modal-content">
            <p class="modal-message">{{ message }}</p>
            
            <!-- Warning for critical actions -->
            <div v-if="severity === 'critical'" class="critical-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <span>การดำเนินการนี้ไม่สามารถย้อนกลับได้</span>
            </div>

            <!-- Type to confirm for critical actions -->
            <div v-if="requiresTypeConfirm" class="type-confirm">
              <label>พิมพ์ <code>{{ confirmText }}</code> เพื่อยืนยัน:</label>
              <input
                v-model="typedConfirmation"
                type="text"
                :placeholder="confirmText"
                class="confirm-input"
                @keyup.enter="handleConfirm"
              />
            </div>

            <!-- Double confirm checkbox -->
            <div v-if="requiresDoubleConfirm && !requiresTypeConfirm" class="double-confirm">
              <label class="checkbox-label">
                <input
                  v-model="isDoubleConfirmed"
                  type="checkbox"
                  class="confirm-checkbox"
                />
                <span class="checkbox-text">ฉันเข้าใจและยืนยันการดำเนินการนี้</span>
              </label>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button 
              class="btn-cancel" 
              :disabled="isProcessing"
              @click="handleCancel"
            >
              ยกเลิก
            </button>
            
            <button
              class="btn-confirm"
              :class="severityClass"
              :disabled="!canConfirm || isProcessing"
              @click="handleConfirm"
            >
              <span v-if="isProcessing" class="spinner"></span>
              <span v-else-if="countdown > 0">รอ {{ countdown }} วินาที</span>
              <span v-else>{{ confirmButtonText }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

interface Props {
  visible: boolean
  title: string
  message: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  confirmButtonText?: string
  confirmText?: string // Text user must type for critical actions
  countdownSeconds?: number
  requiresDoubleConfirm?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'medium',
  confirmButtonText: 'ยืนยัน',
  confirmText: 'CONFIRM',
  countdownSeconds: 0,
  requiresDoubleConfirm: false
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'update:visible', value: boolean): void
}>()

// State
const isDoubleConfirmed = ref(false)
const typedConfirmation = ref('')
const countdown = ref(0)
const isProcessing = ref(false)
let countdownInterval: number | null = null

// Computed
const severityClass = computed(() => `severity-${props.severity}`)

const requiresTypeConfirm = computed(() => props.severity === 'critical')

const canConfirm = computed(() => {
  // Must wait for countdown
  if (countdown.value > 0) return false
  
  // Critical actions require typing confirmation
  if (requiresTypeConfirm.value) {
    return typedConfirmation.value.toUpperCase() === props.confirmText.toUpperCase()
  }
  
  // Double confirm required
  if (props.requiresDoubleConfirm) {
    return isDoubleConfirmed.value
  }
  
  return true
})

// Methods
const startCountdown = () => {
  if (props.countdownSeconds > 0) {
    countdown.value = props.countdownSeconds
    countdownInterval = window.setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
    }, 1000)
  }
}

const resetState = () => {
  isDoubleConfirmed.value = false
  typedConfirmation.value = ''
  countdown.value = 0
  isProcessing.value = false
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

const handleConfirm = async () => {
  if (!canConfirm.value || isProcessing.value) return
  
  isProcessing.value = true
  
  try {
    emit('confirm')
  } finally {
    // Reset after a short delay to show processing state
    setTimeout(() => {
      isProcessing.value = false
      emit('update:visible', false)
    }, 300)
  }
}

const handleCancel = () => {
  if (isProcessing.value) return
  emit('cancel')
  emit('update:visible', false)
}

// Watchers
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetState()
    startCountdown()
  } else {
    resetState()
  }
})

// Cleanup
onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: #FFFFFF;
  border-radius: 16px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.modal-header {
  padding: 24px 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.severity-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.severity-icon svg {
  width: 28px;
  height: 28px;
}

.severity-icon.severity-low {
  background: #E8F5EF;
  color: #00A86B;
}

.severity-icon.severity-medium {
  background: #FFF8E1;
  color: #F5A623;
}

.severity-icon.severity-high {
  background: #FFF5F5;
  color: #E53935;
}

.severity-icon.severity-critical {
  background: #E53935;
  color: #FFFFFF;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.modal-content {
  padding: 0 24px 24px;
}

.modal-message {
  font-size: 15px;
  color: #666666;
  line-height: 1.6;
  text-align: center;
  margin: 0 0 20px;
}

.critical-warning {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #FFF5F5;
  border: 1px solid #FED7D7;
  border-radius: 10px;
  margin-bottom: 20px;
}

.critical-warning svg {
  width: 20px;
  height: 20px;
  color: #E53935;
  flex-shrink: 0;
}

.critical-warning span {
  font-size: 14px;
  color: #C53030;
  font-weight: 500;
}

.type-confirm {
  margin-bottom: 16px;
}

.type-confirm label {
  display: block;
  font-size: 14px;
  color: #666666;
  margin-bottom: 8px;
}

.type-confirm code {
  background: #F5F5F5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  color: #E53935;
  font-weight: 600;
}

.confirm-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 10px;
  font-size: 15px;
  font-family: monospace;
  transition: border-color 0.2s;
}

.confirm-input:focus {
  outline: none;
  border-color: #E53935;
}

.double-confirm {
  margin-bottom: 16px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.confirm-checkbox {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  accent-color: #00A86B;
  cursor: pointer;
}

.checkbox-text {
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  background: #F9F9F9;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-cancel {
  background: #FFFFFF;
  color: #666666;
  border: 1px solid #E8E8E8;
}

.btn-cancel:hover:not(:disabled) {
  background: #F5F5F5;
}

.btn-confirm {
  background: #00A86B;
  color: #FFFFFF;
  border: none;
}

.btn-confirm:hover:not(:disabled) {
  background: #008F5B;
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-confirm.severity-high,
.btn-confirm.severity-critical {
  background: #E53935;
}

.btn-confirm.severity-high:hover:not(:disabled),
.btn-confirm.severity-critical:hover:not(:disabled) {
  background: #C62828;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
  opacity: 0;
}
</style>
