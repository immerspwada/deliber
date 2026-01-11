/**
 * Centralized Error Handling System
 * Provides consistent error handling across the application
 */

export enum ErrorCode {
  // Network & API Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Authentication & Authorization
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Business Logic Errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  DUPLICATE_REQUEST = 'DUPLICATE_REQUEST',
  
  // System Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Not Found
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Unknown
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  code: ErrorCode
  message: string
  userMessage: string
  details?: Record<string, unknown>
  timestamp: string
  requestId?: string
}

export const ERROR_MESSAGES: Record<ErrorCode, { message: string; userMessage: string }> = {
  // Network & API
  [ErrorCode.NETWORK_ERROR]: {
    message: 'Network connection failed',
    userMessage: 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต'
  },
  [ErrorCode.API_ERROR]: {
    message: 'API request failed',
    userMessage: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์'
  },
  [ErrorCode.TIMEOUT_ERROR]: {
    message: 'Request timeout',
    userMessage: 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่'
  },
  [ErrorCode.RATE_LIMITED]: {
    message: 'Too many requests',
    userMessage: 'คำขอมากเกินไป กรุณารอสักครู่'
  },
  
  // Auth
  [ErrorCode.AUTH_ERROR]: {
    message: 'Authentication failed',
    userMessage: 'กรุณาเข้าสู่ระบบใหม่'
  },
  [ErrorCode.PERMISSION_DENIED]: {
    message: 'Permission denied',
    userMessage: 'คุณไม่มีสิทธิ์เข้าถึง'
  },
  [ErrorCode.SESSION_EXPIRED]: {
    message: 'Session expired',
    userMessage: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
  },
  
  // Validation
  [ErrorCode.VALIDATION_ERROR]: {
    message: 'Validation failed',
    userMessage: 'ข้อมูลไม่ถูกต้อง'
  },
  [ErrorCode.INVALID_INPUT]: {
    message: 'Invalid input provided',
    userMessage: 'ข้อมูลที่กรอกไม่ถูกต้อง'
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    message: 'Required field missing',
    userMessage: 'กรุณากรอกข้อมูลให้ครบถ้วน'
  },
  
  // Business Logic
  [ErrorCode.INSUFFICIENT_BALANCE]: {
    message: 'Insufficient wallet balance',
    userMessage: 'ยอดเงินในกระเป๋าไม่เพียงพอ'
  },
  [ErrorCode.WALLET_NOT_FOUND]: {
    message: 'Wallet not found',
    userMessage: 'ไม่พบกระเป๋าเงิน กรุณาติดต่อฝ่ายสนับสนุน'
  },
  [ErrorCode.TRANSACTION_FAILED]: {
    message: 'Transaction processing failed',
    userMessage: 'การทำรายการไม่สำเร็จ กรุณาลองใหม่'
  },
  [ErrorCode.DUPLICATE_REQUEST]: {
    message: 'Duplicate request detected',
    userMessage: 'คำขอนี้ถูกส่งไปแล้ว'
  },
  
  // System
  [ErrorCode.DATABASE_ERROR]: {
    message: 'Database operation failed',
    userMessage: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่'
  },
  [ErrorCode.INTERNAL_ERROR]: {
    message: 'Internal server error',
    userMessage: 'เกิดข้อผิดพลาดจากระบบ กรุณาลองใหม่'
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    message: 'Service temporarily unavailable',
    userMessage: 'บริการไม่พร้อมใช้งานชั่วคราว'
  },
  
  // Not Found
  [ErrorCode.NOT_FOUND]: {
    message: 'Resource not found',
    userMessage: 'ไม่พบข้อมูลที่ต้องการ'
  },
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    message: 'Requested resource not found',
    userMessage: 'ไม่พบข้อมูลที่ต้องการ'
  },
  
  // Unknown
  [ErrorCode.UNKNOWN]: {
    message: 'Unknown error occurred',
    userMessage: 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  }
}

/**
 * Create standardized error object
 */
export function createAppError(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>,
  requestId?: string
): AppError {
  const errorConfig = ERROR_MESSAGES[code]
  
  return {
    code,
    message: message || errorConfig.message,
    userMessage: errorConfig.userMessage,
    details,
    timestamp: new Date().toISOString(),
    requestId
  }
}

/**
 * Handle Supabase errors and convert to AppError
 */
export function handleSupabaseError(error: any, context?: string): AppError {
  console.error(`[${context || 'Supabase'}] Error:`, error)
  
  // Network errors
  if (error.message?.includes('fetch')) {
    return createAppError(ErrorCode.NETWORK_ERROR, error.message)
  }
  
  // Auth errors
  if (error.message?.includes('JWT') || error.message?.includes('auth')) {
    return createAppError(ErrorCode.AUTH_ERROR, error.message)
  }
  
  // Permission errors
  if (error.message?.includes('permission') || error.message?.includes('policy')) {
    return createAppError(ErrorCode.PERMISSION_DENIED, error.message)
  }
  
  // Validation errors
  if (error.message?.includes('violates') || error.message?.includes('constraint')) {
    return createAppError(ErrorCode.VALIDATION_ERROR, error.message)
  }
  
  // Rate limiting
  if (error.message?.includes('rate') || error.message?.includes('limit')) {
    return createAppError(ErrorCode.RATE_LIMITED, error.message)
  }
  
  // Not found
  if (error.message?.includes('not found') || error.code === 'PGRST116') {
    return createAppError(ErrorCode.NOT_FOUND, error.message)
  }
  
  // Database errors
  if (error.code?.startsWith('PG') || error.message?.includes('database')) {
    return createAppError(ErrorCode.DATABASE_ERROR, error.message)
  }
  
  // Default to unknown error
  return createAppError(ErrorCode.UNKNOWN, error.message, { originalError: error })
}

/**
 * Log error for monitoring/debugging
 */
export function logError(error: AppError, context?: string): void {
  const logData = {
    ...error,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined
  }
  
  console.error('[ErrorHandler]', logData)
  
  // TODO: Send to monitoring service (Sentry, LogRocket, etc.)
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(new Error(error.message), {
  //     tags: { code: error.code, context },
  //     extra: error.details
  //   })
  // }
}

/**
 * Parse Edge Function error response
 */
export function parseEdgeFunctionError(error: any): AppError {
  console.error('[EdgeFunction] Error:', error)
  
  // Handle Edge Function error response format
  if (error && typeof error === 'object' && 'error' in error) {
    const edgeError = error.error
    
    if (typeof edgeError === 'object' && edgeError.code && edgeError.message) {
      // Structured error from Edge Function
      const errorCode = Object.values(ErrorCode).includes(edgeError.code) 
        ? edgeError.code as ErrorCode 
        : ErrorCode.API_ERROR
      
      return createAppError(errorCode, edgeError.message, edgeError.details)
    }
    
    if (typeof edgeError === 'string') {
      return createAppError(ErrorCode.API_ERROR, edgeError)
    }
  }
  
  // Fallback for unknown Edge Function error format
  return createAppError(ErrorCode.API_ERROR, 'Edge Function error', { originalError: error })
}

/**
 * Handle network-related errors
 */
export function handleNetworkError(error: Error): AppError {
  console.error('[Network] Error:', error)
  
  if (error.message.includes('fetch')) {
    return createAppError(ErrorCode.NETWORK_ERROR, error.message)
  }
  
  if (error.message.includes('timeout')) {
    return createAppError(ErrorCode.TIMEOUT_ERROR, error.message)
  }
  
  return createAppError(ErrorCode.NETWORK_ERROR, error.message)
}

/**
 * Create user-friendly error message
 */
export function createUserErrorMessage(error: AppError, context?: string): string {
  // Use the predefined user message
  let message = error.userMessage
  
  // Add context if provided
  if (context) {
    message = `${context}: ${message}`
  }
  
  return message
}

/**
 * Handle async operations with proper error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await operation()
    return { data, error: null }
  } catch (err) {
    const error = err instanceof Error 
      ? handleSupabaseError(err, context)
      : createAppError(ErrorCode.UNKNOWN, 'Unknown error occurred', { originalError: err })
    
    logError(error, context)
    return { data: null, error }
  }
}