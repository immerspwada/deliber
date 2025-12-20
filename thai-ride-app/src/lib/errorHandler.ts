/**
 * Error Handler - Unified Error Handling System
 * Task: 11 - Implement error handling system
 * Requirements: 3.5, 11.5
 * 
 * Provides consistent error handling with bilingual messages (Thai/English)
 */

export enum ErrorType {
  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  
  // Validation errors
  VALIDATION = 'VALIDATION',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  
  // Business logic errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  REQUEST_NOT_FOUND = 'REQUEST_NOT_FOUND',
  ALREADY_ACCEPTED = 'ALREADY_ACCEPTED',
  INVALID_STATUS = 'INVALID_STATUS',
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  
  // Provider errors
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_BUSY = 'PROVIDER_BUSY',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  
  // Database errors
  DB_ERROR = 'DB_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Unknown
  UNKNOWN = 'UNKNOWN'
}

interface ErrorMessages {
  th: string
  en: string
}

const ERROR_MESSAGES: Record<ErrorType, ErrorMessages> = {
  [ErrorType.AUTH_REQUIRED]: {
    th: 'กรุณาเข้าสู่ระบบก่อน',
    en: 'Please login first'
  },
  [ErrorType.AUTH_INVALID]: {
    th: 'ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง',
    en: 'Invalid credentials'
  },
  [ErrorType.AUTH_EXPIRED]: {
    th: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    en: 'Session expired, please login again'
  },
  [ErrorType.VALIDATION]: {
    th: 'ข้อมูลไม่ถูกต้อง',
    en: 'Invalid data'
  },
  [ErrorType.INVALID_INPUT]: {
    th: 'ข้อมูลที่กรอกไม่ถูกต้อง',
    en: 'Invalid input'
  },
  [ErrorType.MISSING_REQUIRED]: {
    th: 'กรุณากรอกข้อมูลให้ครบถ้วน',
    en: 'Please fill in all required fields'
  },
  [ErrorType.INSUFFICIENT_BALANCE]: {
    th: 'ยอดเงินในกระเป๋าไม่เพียงพอ',
    en: 'Insufficient wallet balance'
  },
  [ErrorType.REQUEST_NOT_FOUND]: {
    th: 'ไม่พบคำสั่งที่ต้องการ',
    en: 'Request not found'
  },
  [ErrorType.ALREADY_ACCEPTED]: {
    th: 'งานนี้ถูกรับไปแล้ว',
    en: 'This job has already been accepted'
  },
  [ErrorType.INVALID_STATUS]: {
    th: 'สถานะไม่ถูกต้อง',
    en: 'Invalid status'
  },
  [ErrorType.INVALID_TRANSITION]: {
    th: 'ไม่สามารถเปลี่ยนสถานะได้',
    en: 'Invalid status transition'
  },
  [ErrorType.PROVIDER_NOT_FOUND]: {
    th: 'ไม่พบผู้ให้บริการ',
    en: 'Provider not found'
  },
  [ErrorType.PROVIDER_UNAVAILABLE]: {
    th: 'ผู้ให้บริการไม่ว่าง',
    en: 'Provider unavailable'
  },
  [ErrorType.PROVIDER_BUSY]: {
    th: 'ผู้ให้บริการกำลังให้บริการอยู่',
    en: 'Provider is busy'
  },
  [ErrorType.NETWORK_ERROR]: {
    th: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
    en: 'Network error'
  },
  [ErrorType.TIMEOUT]: {
    th: 'การเชื่อมต่อหมดเวลา',
    en: 'Connection timeout'
  },
  [ErrorType.SERVER_ERROR]: {
    th: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์',
    en: 'Server error'
  },
  [ErrorType.DB_ERROR]: {
    th: 'เกิดข้อผิดพลาดในฐานข้อมูล',
    en: 'Database error'
  },
  [ErrorType.CONSTRAINT_VIOLATION]: {
    th: 'ข้อมูลซ้ำหรือไม่ถูกต้อง',
    en: 'Data constraint violation'
  },
  [ErrorType.UNKNOWN]: {
    th: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
    en: 'Unknown error occurred'
  }
}

export class AppError extends Error {
  type: ErrorType
  messageTh: string
  messageEn: string
  originalError?: any
  context?: Record<string, any>

  constructor(
    type: ErrorType, 
    customMessage?: string, 
    originalError?: any,
    context?: Record<string, any>
  ) {
    const messages = ERROR_MESSAGES[type] || ERROR_MESSAGES[ErrorType.UNKNOWN]
    const message = customMessage || messages.th
    
    super(message)
    
    this.name = 'AppError'
    this.type = type
    this.messageTh = customMessage || messages.th
    this.messageEn = customMessage || messages.en
    this.originalError = originalError
    this.context = context
    
    // Log error for monitoring
    logError(this)
  }

  getMessage(locale: 'th' | 'en' = 'th'): string {
    return locale === 'th' ? this.messageTh : this.messageEn
  }
}

// Map RPC error messages to ErrorType
const RPC_ERROR_MAP: Record<string, ErrorType> = {
  'WALLET_NOT_FOUND': ErrorType.INSUFFICIENT_BALANCE,
  'INSUFFICIENT_BALANCE': ErrorType.INSUFFICIENT_BALANCE,
  'RIDE_NOT_FOUND': ErrorType.REQUEST_NOT_FOUND,
  'DELIVERY_NOT_FOUND': ErrorType.REQUEST_NOT_FOUND,
  'SHOPPING_NOT_FOUND': ErrorType.REQUEST_NOT_FOUND,
  'QUEUE_NOT_FOUND': ErrorType.REQUEST_NOT_FOUND,
  'MOVING_NOT_FOUND': ErrorType.REQUEST_NOT_FOUND,
  'LAUNDRY_NOT_FOUND': ErrorType.REQUEST_NOT_FOUND,
  'REQUEST_NOT_FOUND': ErrorType.REQUEST_NOT_FOUND,
  'RIDE_ALREADY_ACCEPTED': ErrorType.ALREADY_ACCEPTED,
  'DELIVERY_ALREADY_ACCEPTED': ErrorType.ALREADY_ACCEPTED,
  'SHOPPING_ALREADY_ACCEPTED': ErrorType.ALREADY_ACCEPTED,
  'QUEUE_ALREADY_ACCEPTED': ErrorType.ALREADY_ACCEPTED,
  'MOVING_ALREADY_ACCEPTED': ErrorType.ALREADY_ACCEPTED,
  'LAUNDRY_ALREADY_ACCEPTED': ErrorType.ALREADY_ACCEPTED,
  'PROVIDER_NOT_FOUND': ErrorType.PROVIDER_NOT_FOUND,
  'INVALID_STATUS_FOR_COMPLETION': ErrorType.INVALID_STATUS,
  'INVALID_REQUEST_TYPE': ErrorType.VALIDATION,
  'INVALID_CANCELLATION_ROLE': ErrorType.VALIDATION,
  'REQUEST_ALREADY_FINALIZED': ErrorType.INVALID_STATUS
}

export function handleRpcError(error: any): AppError {
  const message = error?.message || error?.toString() || ''
  
  // Check for known error codes
  for (const [code, type] of Object.entries(RPC_ERROR_MAP)) {
    if (message.includes(code)) {
      return new AppError(type, undefined, error)
    }
  }
  
  // Check for network errors
  if (message.includes('network') || message.includes('fetch')) {
    return new AppError(ErrorType.NETWORK_ERROR, undefined, error)
  }
  
  // Check for auth errors
  if (message.includes('JWT') || message.includes('auth') || message.includes('unauthorized')) {
    return new AppError(ErrorType.AUTH_EXPIRED, undefined, error)
  }
  
  // Default to unknown
  return new AppError(ErrorType.UNKNOWN, message, error)
}

// Error logging function
function logError(error: AppError): void {
  const logData = {
    type: error.type,
    message: error.message,
    context: error.context,
    timestamp: new Date().toISOString(),
    originalError: error.originalError?.message || error.originalError
  }
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('[AppError]', logData)
  }
  
  // TODO: Send to monitoring service (Sentry, etc.)
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error)
  // }
}

// Utility function to check if error is retryable
export function isRetryableError(error: AppError): boolean {
  const retryableTypes = [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT,
    ErrorType.SERVER_ERROR
  ]
  return retryableTypes.includes(error.type)
}

// Utility function to get user-friendly message
export function getUserMessage(error: any, locale: 'th' | 'en' = 'th'): string {
  if (error instanceof AppError) {
    return error.getMessage(locale)
  }
  
  const messages = ERROR_MESSAGES[ErrorType.UNKNOWN]
  return locale === 'th' ? messages.th : messages.en
}
