<script setup lang="ts">
/**
 * ErrorBoundary - Component สำหรับจัดการ error ที่เกิดขึ้นใน child components
 * 
 * Features:
 * - Catch errors from child components
 * - Display user-friendly error message
 * - Report to Sentry (production)
 * - Allow retry
 */
import { onErrorCaptured, ref } from 'vue'

interface Props {
  fallbackMessage?: string
  showRetry?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fallbackMessage: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
  showRetry: true
})

const emit = defineEmits<{
  error: [error: Error]
  retry: []
}>()

const error = ref<Error | null>(null)
const errorCount = ref(0)

// Move import.meta.env checks to script section
const isDev = import.meta.env.DEV
const isProd = import.meta.env.PROD

onErrorCaptured((err: Error) => {
  error.value = err
  errorCount.value++
  
  // Log to console in development
  if (isDev) {
    console.error('[ErrorBoundary] Caught error:', err)
  }
  
  // Report to Sentry in production
  if (isProd && window.Sentry) {
    window.Sentry.captureException(err, {
      tags: {
        component: 'ErrorBoundary',
        errorCount: errorCount.value
      }
    })
  }
  
  emit('error', err)
  
  // Prevent error from propagating
  return false
})

const handleRetry = () => {
  error.value = null
  emit('retry')
}
</script>

<template>
  <!-- Single root element for Transition compatibility -->
  <div class="error-boundary-wrapper">
    <div v-if="error" class="error-boundary">
      <div class="error-content">
        <!-- Error Icon -->
        <div class="error-icon">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        
        <!-- Error Message -->
        <h3 class="error-title">{{ fallbackMessage }}</h3>
        
        <!-- Error Details (dev only) -->
        <details v-if="isDev" class="error-details">
          <summary>รายละเอียดข้อผิดพลาด</summary>
          <pre>{{ error.message }}</pre>
          <pre v-if="error.stack">{{ error.stack }}</pre>
        </details>
        
        <!-- Retry Button -->
        <button
          v-if="showRetry"
          type="button"
          class="retry-button"
          @click="handleRetry"
        >
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <span>ลองใหม่อีกครั้ง</span>
        </button>
      </div>
    </div>
    
    <!-- Render children when no error -->
    <slot v-else />
  </div>
</template>

<style scoped>
.error-boundary-wrapper {
  /* Wrapper for single root element */
}

.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 24px;
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  color: #ef4444;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.error-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.error-details {
  margin: 16px 0;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: left;
}

.error-details summary {
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin-bottom: 8px;
}

.error-details pre {
  font-size: 12px;
  color: #ef4444;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 8px 0;
}

.retry-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #00a86b;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  min-width: 44px;
}

.retry-button:hover {
  background: #008f5b;
  transform: translateY(-1px);
}

.retry-button:active {
  transform: scale(0.98);
}

.retry-button svg {
  width: 20px;
  height: 20px;
}

@media (prefers-color-scheme: dark) {
  .error-title {
    color: #ffffff;
  }
  
  .error-details {
    background: #2a2a2a;
  }
  
  .error-details summary {
    color: #cccccc;
  }
}
</style>
