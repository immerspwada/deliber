/**
 * Advanced Error Recovery (F236)
 * 
 * ระบบ error boundary ที่ฉลาดขึ้น พร้อมกลไกการ retry อัตโนมัติและข้อความแจ้งเตือนที่เป็นมิตรกับผู้ใช้
 * 
 * Features:
 * - Smart error boundary with automatic recovery
 * - Exponential backoff retry mechanism
 * - Circuit breaker pattern
 * - User-friendly error messages
 * - Error categorization and handling
 * - Automatic fallback strategies
 * - Error reporting and analytics
 * 
 * @syncs-with
 * - Customer: Seamless error recovery experience
 * - Provider: Reliable service delivery
 * - Admin: Error monitoring and management
 */

import { ref, computed, onUnmounted } from 'vue'
import { logger } from '../utils/logger'
import { captureError } from '../lib/sentry'
import { toAppError, type AppError } from '../utils/errorHandling'

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
}

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'ignore' | 'redirect'
  config?: any
  condition?: (error: AppError) => boolean
}

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export interface RecoveryAttempt {
  attemptNumber: number
  timestamp: number
  error: AppError
  strategy: string
  success: boolean
  duration: number
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: AppError | null
  errorId: string | null
  recoveryAttempts: RecoveryAttempt[]
  isRecovering: boolean
  canRetry: boolean
  fallbackActive: boolean
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private config: CircuitBreakerConfig
  
  constructor(config: CircuitBreakerConfig) {
    this.config = config
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open'
    }
  }

  getState() {
    return this.state
  }

  getFailureCount() {
    return this.failures
  }
}

/**
 * Advanced Error Recovery Composable
 */
export function useAdvancedErrorRecovery(context: ErrorContext = {}) {
  const errorState = ref<ErrorBoundaryState>({
    hasError: false,
    error: null,
    errorId: null,
    recoveryAttempts: [],
    isRecovering: false,
    canRetry: true,
    fallbackActive: false
  })

  const retryTimers = ref<Set<number>>(new Set())
  const circuitBreakers = ref<Map<string, CircuitBreaker>>(new Map())

  // Default configurations
  const defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  }

  const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 300000 // 5 minutes
  }

  /**
   * Generate unique error ID
   */
  const generateErrorId = (): string => {
    return `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  const calculateRetryDelay = (attempt: number, config: RetryConfig): number => {
    let delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    )

    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5) // Add 0-50% jitter
    }

    return delay
  }

  /**
   * Get or create circuit breaker for a specific operation
   */
  const getCircuitBreaker = (operationKey: string) => {
    if (!circuitBreakers.value.has(operationKey)) {
      circuitBreakers.value.set(
        operationKey,
        new CircuitBreaker(defaultCircuitBreakerConfig)
      )
    }
    return circuitBreakers.value.get(operationKey)!
  }

  /**
   * Determine error recovery strategy based on error type
   */
  const determineRecoveryStrategy = (error: AppError): ErrorRecoveryStrategy => {
    // Network errors - retry with backoff
    if (error.type === 'NETWORK') {
      return {
        type: 'retry',
        config: { ...defaultRetryConfig, maxAttempts: 5 }
      }
    }

    // Authentication errors - redirect to login
    if (error.type === 'AUTHENTICATION') {
      return {
        type: 'redirect',
        config: { path: '/login' }
      }
    }

    // Validation errors - show user-friendly message
    if (error.type === 'VALIDATION') {
      return {
        type: 'fallback',
        config: { showUserMessage: true }
      }
    }

    // Server errors - retry with longer delays
    if (error.type === 'SERVER') {
      return {
        type: 'retry',
        config: { 
          ...defaultRetryConfig, 
          baseDelay: 2000,
          maxAttempts: 3
        }
      }
    }

    // Default strategy
    return {
      type: 'fallback',
      config: { showUserMessage: true }
    }
  }

  /**
   * Execute operation with retry logic
   */
  const executeWithRetry = async <T>(
    operation: () => Promise<T>,
    operationKey: string,
    retryConfig: RetryConfig = defaultRetryConfig
  ): Promise<T> => {
    const circuitBreaker = getCircuitBreaker(operationKey)
    let lastError: AppError | null = null

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const result = await circuitBreaker.execute(operation)
        
        // Record successful recovery if this wasn't the first attempt
        if (attempt > 1) {
          recordRecoveryAttempt(attempt, lastError!, 'retry', true, 0)
        }
        
        return result
      } catch (error) {
        lastError = toAppError(error)
        
        logger.warn(`Operation ${operationKey} failed (attempt ${attempt}/${retryConfig.maxAttempts}):`, lastError.message)

        // Record failed attempt
        recordRecoveryAttempt(attempt, lastError, 'retry', false, 0)

        // Don't retry on the last attempt
        if (attempt === retryConfig.maxAttempts) {
          break
        }

        // Don't retry certain error types
        if (lastError.type === 'AUTHENTICATION' || lastError.type === 'AUTHORIZATION') {
          break
        }

        // Calculate and wait for retry delay
        const delay = calculateRetryDelay(attempt, retryConfig)
        await new Promise(resolve => {
          const timer = window.setTimeout(resolve, delay)
          retryTimers.value.add(timer)
        })
      }
    }

    throw lastError!
  }

  /**
   * Record recovery attempt
   */
  const recordRecoveryAttempt = (
    attemptNumber: number,
    error: AppError,
    strategy: string,
    success: boolean,
    duration: number
  ) => {
    const attempt: RecoveryAttempt = {
      attemptNumber,
      timestamp: Date.now(),
      error,
      strategy,
      success,
      duration
    }

    errorState.value.recoveryAttempts.push(attempt)

    // Keep only last 10 attempts
    if (errorState.value.recoveryAttempts.length > 10) {
      errorState.value.recoveryAttempts = errorState.value.recoveryAttempts.slice(-10)
    }
  }

  /**
   * Handle error with automatic recovery
   */
  const handleErrorWithRecovery = async (
    error: unknown,
    operationKey?: string,
    customStrategy?: ErrorRecoveryStrategy
  ): Promise<boolean> => {
    const appError = toAppError(error)
    const errorId = generateErrorId()

    // Update error state
    errorState.value = {
      hasError: true,
      error: appError,
      errorId,
      recoveryAttempts: [],
      isRecovering: true,
      canRetry: true,
      fallbackActive: false
    }

    logger.error(`Error ${errorId} occurred:`, appError.message, { context, operationKey })

    // Determine recovery strategy
    const strategy = customStrategy || determineRecoveryStrategy(appError)

    try {
      const recovered = await executeRecoveryStrategy(strategy, appError, operationKey)
      
      if (recovered) {
        clearError()
        return true
      } else {
        errorState.value.isRecovering = false
        errorState.value.canRetry = false
        return false
      }
    } catch (recoveryError) {
      logger.error(`Recovery failed for error ${errorId}:`, recoveryError)
      errorState.value.isRecovering = false
      errorState.value.canRetry = false
      
      // Report recovery failure
      captureError(new Error(`Recovery failed: ${appError.message}`), {
        originalError: appError,
        recoveryError: toAppError(recoveryError),
        context,
        operationKey
      })
      
      return false
    }
  }

  /**
   * Execute recovery strategy
   */
  const executeRecoveryStrategy = async (
    strategy: ErrorRecoveryStrategy,
    error: AppError,
    operationKey?: string
  ): Promise<boolean> => {
    const startTime = Date.now()

    try {
      switch (strategy.type) {
        case 'retry':
          if (operationKey) {
            // This would need the original operation to retry
            // In practice, this should be handled by the calling code
            logger.info(`Retry strategy determined for ${operationKey}`)
            return false // Cannot auto-retry without original operation
          }
          return false

        case 'fallback':
          errorState.value.fallbackActive = true
          
          if (strategy.config?.showUserMessage) {
            // Show user-friendly error message
            showUserFriendlyError(error)
          }
          
          recordRecoveryAttempt(1, error, 'fallback', true, Date.now() - startTime)
          return true

        case 'ignore':
          logger.info(`Ignoring error: ${error.message}`)
          recordRecoveryAttempt(1, error, 'ignore', true, Date.now() - startTime)
          return true

        case 'redirect':
          if (strategy.config?.path) {
            logger.info(`Redirecting to ${strategy.config.path} due to error`)
            // In a real app, you'd use router here
            recordRecoveryAttempt(1, error, 'redirect', true, Date.now() - startTime)
            return true
          }
          return false

        default:
          return false
      }
    } catch (strategyError) {
      recordRecoveryAttempt(1, error, strategy.type, false, Date.now() - startTime)
      throw strategyError
    }
  }

  /**
   * Show user-friendly error message
   */
  const showUserFriendlyError = (error: AppError) => {
    const userMessages: Record<string, string> = {
      NETWORK: 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
      VALIDATION: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง',
      AUTHENTICATION: 'กรุณาเข้าสู่ระบบอีกครั้ง',
      AUTHORIZATION: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
      NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
      SERVER: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง',
      UNKNOWN: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    }

    const message = userMessages[error.type] || error.message

    // In a real app, you'd show this in a toast or modal
    logger.info(`User message: ${message}`)
  }

  /**
   * Retry last failed operation
   */
  const retryLastOperation = async (operation: () => Promise<any>): Promise<boolean> => {
    if (!errorState.value.canRetry || !errorState.value.error) {
      return false
    }

    errorState.value.isRecovering = true

    try {
      await operation()
      clearError()
      return true
    } catch (error) {
      const appError = toAppError(error)
      recordRecoveryAttempt(
        errorState.value.recoveryAttempts.length + 1,
        appError,
        'manual_retry',
        false,
        0
      )
      errorState.value.isRecovering = false
      return false
    }
  }

  /**
   * Clear error state
   */
  const clearError = () => {
    errorState.value = {
      hasError: false,
      error: null,
      errorId: null,
      recoveryAttempts: [],
      isRecovering: false,
      canRetry: true,
      fallbackActive: false
    }
  }

  /**
   * Get error recovery statistics
   */
  const getRecoveryStats = () => {
    const attempts = errorState.value.recoveryAttempts
    const successful = attempts.filter(a => a.success).length
    const failed = attempts.length - successful
    
    return {
      totalAttempts: attempts.length,
      successful,
      failed,
      successRate: attempts.length > 0 ? (successful / attempts.length) * 100 : 0,
      lastAttempt: attempts[attempts.length - 1] || null
    }
  }

  /**
   * Check if error is recoverable
   */
  const isRecoverable = computed(() => {
    if (!errorState.value.error) return false
    
    const nonRecoverableTypes = ['AUTHENTICATION', 'AUTHORIZATION']
    return !nonRecoverableTypes.includes(errorState.value.error.type)
  })

  /**
   * Get user-friendly error message
   */
  const getUserFriendlyMessage = computed(() => {
    if (!errorState.value.error) return ''
    
    const userMessages: Record<string, string> = {
      NETWORK: 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
      VALIDATION: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง',
      AUTHENTICATION: 'กรุณาเข้าสู่ระบบอีกครั้ง',
      AUTHORIZATION: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
      NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
      SERVER: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง',
      UNKNOWN: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    }

    return userMessages[errorState.value.error.type] || errorState.value.error.message
  })

  /**
   * Cleanup function
   */
  const cleanup = () => {
    // Clear all retry timers
    retryTimers.value.forEach(timer => window.clearTimeout(timer))
    retryTimers.value.clear()

    // Clear circuit breakers
    circuitBreakers.value.clear()

    // Clear error state
    clearError()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    errorState,
    isRecoverable,
    getUserFriendlyMessage,

    // Methods
    handleErrorWithRecovery,
    executeWithRetry,
    retryLastOperation,
    clearError,
    getRecoveryStats,
    cleanup,

    // Utilities
    generateErrorId,
    getCircuitBreaker
  }
}

/**
 * Global error recovery instance
 */
let globalErrorRecovery: ReturnType<typeof useAdvancedErrorRecovery> | null = null

/**
 * Get global error recovery instance
 */
export function useGlobalErrorRecovery() {
  if (!globalErrorRecovery) {
    globalErrorRecovery = useAdvancedErrorRecovery({
      component: 'global',
      sessionId: `session_${Date.now()}`
    })
  }
  return globalErrorRecovery
}

/**
 * Error boundary wrapper for async operations
 */
export async function withErrorRecovery<T>(
  operation: () => Promise<T>,
  operationKey: string,
  context?: ErrorContext
): Promise<T> {
  const errorRecovery = context ? useAdvancedErrorRecovery(context) : useGlobalErrorRecovery()
  
  try {
    return await errorRecovery.executeWithRetry(operation, operationKey)
  } catch (error) {
    const recovered = await errorRecovery.handleErrorWithRecovery(error, operationKey)
    
    if (!recovered) {
      throw error
    }
    
    // If recovered, retry the operation once more
    return await operation()
  }
}