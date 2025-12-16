<script setup lang="ts">
/**
 * Error Boundary Component
 * จัดการ errors ที่ไม่คาดคิดและแสดง fallback UI
 */
import { ref, onErrorCaptured, provide } from 'vue'

const props = withDefaults(defineProps<{
  fallbackMessage?: string
  showRetry?: boolean
  showDetails?: boolean
}>(), {
  fallbackMessage: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
  showRetry: true,
  showDetails: false
})

const emit = defineEmits<{
  error: [error: Error, info: string]
}>()

const hasError = ref(false)
const errorMessage = ref('')
const errorStack = ref('')

// Capture errors from child components
onErrorCaptured((error: Error, _instance, info: string) => {
  hasError.value = true
  errorMessage.value = error.message || 'Unknown error'
  errorStack.value = error.stack || ''
  
  // Emit error for logging
  emit('error', error, info)
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component info:', info)
  }
  
  // Prevent error from propagating
  return false
})

// Reset error state
const reset = () => {
  hasError.value = false
  errorMessage.value = ''
  errorStack.value = ''
}

// Provide reset function to children
provide('resetErrorBoundary', reset)

// Reload page
const reloadPage = () => {
  window.location.reload()
}

// Go back
const goBack = () => {
  window.history.back()
}
</script>

<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      </div>
      
      <h2 class="error-title">เกิดข้อผิดพลาด</h2>
      <p class="error-message">{{ fallbackMessage }}</p>
      
      <div v-if="showDetails && errorMessage" class="error-details">
        <p class="error-detail-text">{{ errorMessage }}</p>
        <pre v-if="errorStack" class="error-stack">{{ errorStack }}</pre>
      </div>
      
      <div v-if="showRetry" class="error-actions">
        <button @click="reset" class="btn-primary">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          ลองใหม่
        </button>
        <button @click="goBack" class="btn-secondary">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          ย้อนกลับ
        </button>
        <button @click="reloadPage" class="btn-text">
          รีโหลดหน้า
        </button>
      </div>
    </div>
  </div>
  
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #F6F6F6;
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: #FEE2E2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-icon svg {
  width: 40px;
  height: 40px;
  color: #E11900;
}

.error-title {
  font-size: 20px;
  font-weight: 700;
  color: #000;
  margin-bottom: 8px;
}

.error-message {
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 24px;
  line-height: 1.5;
}

.error-details {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 24px;
  text-align: left;
}

.error-detail-text {
  font-size: 13px;
  color: #E11900;
  margin-bottom: 8px;
}

.error-stack {
  font-size: 11px;
  color: #6B6B6B;
  background: #F6F6F6;
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 150px;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary svg {
  width: 20px;
  height: 20px;
}

.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  background: #F6F6F6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #EBEBEB;
}

.btn-secondary:active {
  transform: scale(0.98);
}

.btn-secondary svg {
  width: 20px;
  height: 20px;
}

.btn-text {
  background: none;
  border: none;
  color: #6B6B6B;
  font-size: 14px;
  cursor: pointer;
  padding: 8px;
}

.btn-text:hover {
  color: #000;
}
</style>
