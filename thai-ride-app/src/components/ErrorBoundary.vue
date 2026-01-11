<script setup lang="ts">
/**
 * ErrorBoundary - จัดการ errors ใน component tree
 * แสดง fallback UI เมื่อเกิด error
 */
import { onErrorCaptured, ref } from 'vue'
import { useToast } from '../composables/useToast'

interface Props {
  /** Custom error message */
  fallbackMessage?: string
  /** Show retry button */
  showRetry?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fallbackMessage: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
  showRetry: true
})

const emit = defineEmits<{
  'retry': []
  'error': [error: Error]
}>()

const { showError } = useToast()
const error = ref<Error | null>(null)
const errorCount = ref(0)

onErrorCaptured((err: Error) => {
  console.error('[ErrorBoundary] Caught error:', err)
  
  error.value = err
  errorCount.value++
  
  // Show toast notification
  try {
    showError(props.fallbackMessage)
  } catch (toastErr) {
    console.warn('[ErrorBoundary] Toast failed:', toastErr)
  }
  
  // Emit error event for logging
  emit('error', err)
  
  // Log to external service (e.g., Sentry) in production
  if (import.meta.env.PROD) {
    // TODO: Send to error tracking service
    console.error('[Production Error]', {
      message: err.message,
      stack: err.stack,
      count: errorCount.value
    })
  }
  
  // Prevent error from propagating
  return false
})

const handleRetry = (): void => {
  error.value = null
  emit('retry')
}
</script>

<template>
  <div v-if="error" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      
      <h3 class="error-title">เกิดข้อผิดพลาด</h3>
      <p class="error-message">{{ fallbackMessage }}</p>
      
      <button
        v-if="showRetry"
        class="retry-btn"
        @click="handleRetry"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
        ลองใหม่อีกครั้ง
      </button>
      
      <p v-if="errorCount > 3" class="error-hint">
        หากปัญหายังคงอยู่ กรุณาติดต่อฝ่ายสนับสนุน
      </p>
    </div>
  </div>
  
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 40px 20px;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 400px;
  text-align: center;
}

.error-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffebee;
  border-radius: 50%;
  color: #e53935;
}

.error-icon svg {
  width: 32px;
  height: 32px;
}

.error-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.error-message {
  font-size: 14px;
  color: #666666;
  line-height: 1.5;
  margin: 0;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #00a86b;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.retry-btn svg {
  width: 18px;
  height: 18px;
}

.retry-btn:hover {
  background: #008f5b;
  transform: translateY(-1px);
}

.retry-btn:active {
  transform: scale(0.98);
}

.error-hint {
  font-size: 12px;
  color: #999999;
  margin: 8px 0 0;
}
</style>
