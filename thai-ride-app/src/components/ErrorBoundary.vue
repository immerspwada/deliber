<script setup lang="ts">
/**
 * ErrorBoundary Component
 * 
 * Catches and handles errors gracefully, especially:
 * - 406 "Not Acceptable" errors from Supabase .single() queries
 * - Network errors
 * - Unexpected runtime errors
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import { ref, onErrorCaptured, provide } from 'vue'

interface Props {
  fallbackMessage?: string
  showRetry?: boolean
  onError?: (error: Error) => void
}

const props = withDefaults(defineProps<Props>(), {
  fallbackMessage: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
  showRetry: true
})

const emit = defineEmits<{
  (e: 'error', error: Error): void
  (e: 'retry'): void
}>()

const hasError = ref(false)
const errorMessage = ref('')
const errorCode = ref<string | null>(null)
const retryCount = ref(0)

// Error type detection
const is406Error = (error: any): boolean => {
  return error?.code === 'PGRST116' || 
         error?.message?.includes('406') ||
         error?.message?.includes('Not Acceptable') ||
         error?.status === 406
}

const isNetworkError = (error: any): boolean => {
  return error?.message?.includes('network') ||
         error?.message?.includes('fetch') ||
         error?.name === 'TypeError'
}

const getErrorInfo = (error: any): { message: string; code: string | null } => {
  if (is406Error(error)) {
    return {
      message: 'ไม่พบข้อมูล กรุณาลองใหม่',
      code: '406'
    }
  }
  
  if (isNetworkError(error)) {
    return {
      message: 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต',
      code: 'NETWORK'
    }
  }
  
  return {
    message: error?.message || props.fallbackMessage,
    code: error?.code || null
  }
}

// Capture errors from child components
onErrorCaptured((error: Error, instance, info) => {
  console.error('[ErrorBoundary] Caught error:', error, info)
  
  const errorInfo = getErrorInfo(error)
  hasError.value = true
  errorMessage.value = errorInfo.message
  errorCode.value = errorInfo.code
  
  // Emit error event
  emit('error', error)
  props.onError?.(error)
  
  // Return false to stop error propagation
  return false
})

// Retry handler
const handleRetry = () => {
  retryCount.value++
  hasError.value = false
  errorMessage.value = ''
  errorCode.value = null
  emit('retry')
}

// Reset error state
const resetError = () => {
  hasError.value = false
  errorMessage.value = ''
  errorCode.value = null
}

// Provide reset function to children
provide('resetErrorBoundary', resetError)

defineExpose({
  hasError,
  resetError,
  retryCount
})
</script>

<template>
  <div class="error-boundary">
    <!-- Error State -->
    <div v-if="hasError" class="error-fallback">
      <div class="error-content">
        <!-- Error Icon -->
        <div class="error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        
        <!-- Error Message -->
        <p class="error-message">{{ errorMessage }}</p>
        
        <!-- Error Code (for debugging) -->
        <p v-if="errorCode" class="error-code">รหัส: {{ errorCode }}</p>
        
        <!-- Retry Button -->
        <button 
          v-if="showRetry" 
          @click="handleRetry"
          class="retry-button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          ลองใหม่
        </button>
        
        <!-- Retry count indicator -->
        <p v-if="retryCount > 0" class="retry-count">
          ลองแล้ว {{ retryCount }} ครั้ง
        </p>
      </div>
    </div>
    
    <!-- Normal Content -->
    <slot v-else />
  </div>
</template>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 24px;
}

.error-content {
  text-align: center;
  max-width: 300px;
}

.error-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  color: #F5A623;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.error-message {
  font-size: 16px;
  color: #1A1A1A;
  margin-bottom: 8px;
  font-weight: 500;
}

.error-code {
  font-size: 12px;
  color: #999999;
  margin-bottom: 16px;
  font-family: monospace;
}

.retry-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background-color: #00A86B;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #008F5B;
}

.retry-button:active {
  transform: scale(0.98);
}

.retry-button svg {
  width: 20px;
  height: 20px;
}

.retry-count {
  font-size: 12px;
  color: #999999;
  margin-top: 12px;
}
</style>
