<!--
  Feature: F68 - Confirmation Dialog Component
  
  Dialog ยืนยันการกระทำ
  - ยืนยัน/ยกเลิก
  - รองรับหลายประเภท
  - Custom content
-->
<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="isOpen" class="dialog-overlay" @click.self="handleCancel">
        <div class="dialog-content" :class="variant">
          <!-- Icon -->
          <div class="dialog-icon" v-if="showIcon">
            <svg v-if="variant === 'danger'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <svg v-else-if="variant === 'warning'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <svg v-else-if="variant === 'success'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
            <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>

          <!-- Title -->
          <h3 class="dialog-title">{{ title }}</h3>

          <!-- Message -->
          <p class="dialog-message" v-if="message">{{ message }}</p>

          <!-- Custom Content -->
          <div class="dialog-body" v-if="$slots.default">
            <slot></slot>
          </div>

          <!-- Actions -->
          <div class="dialog-actions">
            <button 
              v-if="showCancel"
              class="btn-cancel" 
              @click="handleCancel"
              :disabled="loading"
            >
              {{ cancelText }}
            </button>
            <button 
              class="btn-confirm" 
              :class="variant"
              @click="handleConfirm"
              :disabled="loading"
            >
              <span v-if="loading" class="loading-spinner"></span>
              <span>{{ confirmText }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning' | 'success'
  showIcon?: boolean
  showCancel?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  confirmText: 'ยืนยัน',
  cancelText: 'ยกเลิก',
  variant: 'default',
  showIcon: true,
  showCancel: true,
  loading: false
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'close'): void
}>()

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  emit('close')
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 10000;
}

.dialog-content {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 340px;
  text-align: center;
}

.dialog-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 50%;
  color: #6b6b6b;
}

.dialog-content.danger .dialog-icon {
  background: #fee2e2;
  color: #e11900;
}

.dialog-content.warning .dialog-icon {
  background: #fef3c7;
  color: #f59e0b;
}

.dialog-content.success .dialog-icon {
  background: #dcfce7;
  color: #22c55e;
}

.dialog-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #000000;
}

.dialog-message {
  margin: 0 0 24px;
  font-size: 14px;
  color: #6b6b6b;
  line-height: 1.5;
}

.dialog-body {
  margin-bottom: 24px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-cancel {
  background: #f6f6f6;
  border: none;
  color: #000000;
}

.btn-cancel:hover {
  background: #e5e5e5;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-confirm {
  background: #000000;
  border: none;
  color: #ffffff;
}

.btn-confirm:hover {
  background: #333333;
}

.btn-confirm.danger {
  background: #e11900;
}

.btn-confirm.danger:hover {
  background: #c41600;
}

.btn-confirm.warning {
  background: #f59e0b;
}

.btn-confirm.success {
  background: #22c55e;
}

.btn-confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .dialog-content,
.dialog-leave-active .dialog-content {
  transition: transform 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-content,
.dialog-leave-to .dialog-content {
  transform: scale(0.95);
}
</style>
