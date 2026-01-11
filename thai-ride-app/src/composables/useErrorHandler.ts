/**
 * Centralized Error Handler Composable
 * ใช้สำหรับจัดการ error ทั่วทั้งแอป
 */
import { ref, readonly } from 'vue'
import { 
  type AppError, 
  ErrorCode, 
  handleSupabaseError, 
  parseEdgeFunctionError,
  handleNetworkError,
  createUserErrorMessage,
  createAppError
} from '../utils/errorHandler'

interface ErrorState {
  hasError: boolean
  error: AppError | null
  retryCount: number
}

// Simple toast notification function (can be replaced with a proper toast library)
function useToast() {
  const showError = (message: string): void => {
    console.error('[Toast Error]', message)
    // In a real app, this would show a toast notification
    // For now, we'll use console.error and could show an alert in development
    if (import.meta.env.DEV) {
      // Could show browser notification or use a toast library
    }
  }

  const showWarning = (message: string): void => {
    console.warn('[Toast Warning]', message)
  }

  return { showError, showWarning }
}

export function useErrorHandler() {
  const { showError, showWarning } = useToast()
  const errorState = ref<ErrorState>({
    hasError: false,
    error: null,
    retryCount: 0
  })

  /**
   * Handle any error and show appropriate user message
   */
  function handleError(error: unknown, context?: string): AppError {
    console.error(`[ErrorHandler${context ? ` - ${context}` : ''}]`, error)
    
    let appError: AppError

    // Convert different error types to AppError
    if (error && typeof error === 'object' && 'code' in error && 'userMessage' in error) {
      // Already an AppError
      appError = error as AppError
    } else if (error && typeof error === 'object' && 'error' in error) {
      // Edge Function error response
      appError = parseEdgeFunctionError(error)
    } else if (error && typeof error === 'object' && ('message' in error || 'code' in error)) {
      // Supabase error
      appError = handleSupabaseError(error, context)
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error
      appError = handleNetworkError(error)
    } else if (error instanceof Error) {
      // Generic JavaScript error
      appError = createAppError(ErrorCode.UNKNOWN, error.message)
    } else {
      // Unknown error type
      appError = createAppError(ErrorCode.UNKNOWN, String(error))
    }

    // Update error state
    errorState.value = {
      hasError: true,
      error: appError,
      retryCount: errorState.value.retryCount + 1
    }

    // Log to external service in production
    if (import.meta.env.PROD) {
      logErrorToService(appError, context)
    }

    return appError
  }

  /**
   * Handle async operations with error handling
   */
  async function handleAsync<T>(
    operation: () => Promise<T>,
    context?: string,
    options?: {
      showLoading?: boolean
      retryOnError?: boolean
      maxRetries?: number
    }
  ): Promise<T | null> {
    const { showLoading = false, retryOnError = false, maxRetries = 3 } = options || {}
    
    let attempts = 0
    
    while (attempts < (retryOnError ? maxRetries : 1)) {
      try {
        attempts++
        
        if (showLoading) {
          // Show loading state
        }
        
        const result = await operation()
        
        // Clear error state on success
        clearError()
        
        return result
      } catch (error) {
        const appError = handleError(error, context)
        
        // Retry logic for certain error types
        if (retryOnError && attempts < maxRetries) {
          const shouldRetry = [
            ErrorCode.NETWORK_ERROR,
            ErrorCode.TIMEOUT_ERROR,
            ErrorCode.SERVICE_UNAVAILABLE
          ].includes(appError.code)
          
          if (shouldRetry) {
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }
        
        // Don't retry, return null
        return null
      }
    }
    
    return null
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    errorState.value = {
      hasError: false,
      error: null,
      retryCount: 0
    }
  }

  /**
   * Check if error is recoverable
   */
  function isRecoverableError(error: AppError): boolean {
    const recoverableErrors = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.SERVICE_UNAVAILABLE,
      ErrorCode.RATE_LIMITED
    ]
    
    return recoverableErrors.includes(error.code)
  }

  /**
   * Get retry suggestion for user
   */
  function getRetrySuggestion(error: AppError): string | null {
    switch (error.code) {
      case ErrorCode.NETWORK_ERROR:
        return 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่'
      case ErrorCode.TIMEOUT_ERROR:
        return 'ลองใหม่ในอีกสักครู่'
      case ErrorCode.RATE_LIMITED:
        return 'รอ 1-2 นาทีแล้วลองใหม่'
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 'บริการไม่พร้อมใช้งาน กรุณาลองใหม่ในภายหลัง'
      case ErrorCode.AUTH_ERROR:
        return 'เข้าสู่ระบบใหม่'
      case ErrorCode.SESSION_EXPIRED:
        return 'เข้าสู่ระบบใหม่'
      default:
        return null
    }
  }

  /**
   * Log error to external service (Sentry, LogRocket, etc.)
   */
  function logErrorToService(error: AppError, context?: string): void {
    // TODO: Implement external error logging
    console.error('[Production Error]', {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      context,
      timestamp: error.timestamp,
      details: error.details
    })
  }

  return {
    errorState: readonly(errorState),
    handleError,
    handleAsync,
    clearError,
    isRecoverableError,
    getRetrySuggestion
  }
}

/**
 * Global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandler(): void {
  const { handleError } = useErrorHandler()
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, 'UnhandledPromiseRejection')
    event.preventDefault()
  })
  
  // Handle global errors
  window.addEventListener('error', (event) => {
    handleError(event.error, 'GlobalError')
  })
}