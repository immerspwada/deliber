/**
 * Error Handling Utilities
 * 
 * Standardized error handling patterns and utilities
 */

import { logger } from './logger'
import { captureError } from '../lib/sentry'

/**
 * Standard error types
 */
export const ErrorType = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
} as const

export type ErrorType = typeof ErrorType[keyof typeof ErrorType]

/**
 * Standard error class
 */
export class AppError extends Error {
  type: ErrorType
  code?: string
  statusCode?: number
  details?: unknown

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    code?: string,
    statusCode?: number,
    details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * Network error
 */
export class NetworkError extends AppError {
  constructor(message: string = 'เกิดข้อผิดพลาดในการเชื่อมต่อ', details?: unknown) {
    super(message, ErrorType.NETWORK, 'NETWORK_ERROR', undefined, details)
    this.name = 'NetworkError'
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  fields?: Record<string, string>

  constructor(
    message: string = 'ข้อมูลไม่ถูกต้อง',
    fields?: Record<string, string>
  ) {
    super(message, ErrorType.VALIDATION, 'VALIDATION_ERROR', 400, fields)
    this.name = 'ValidationError'
    this.fields = fields
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'กรุณาเข้าสู่ระบบ') {
    super(message, ErrorType.AUTHENTICATION, 'AUTH_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'คุณไม่มีสิทธิ์เข้าถึง') {
    super(message, ErrorType.AUTHORIZATION, 'AUTHZ_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'ไม่พบข้อมูลที่ต้องการ') {
    super(message, ErrorType.NOT_FOUND, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Server error
 */
export class ServerError extends AppError {
  constructor(message: string = 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์', statusCode: number = 500) {
    super(message, ErrorType.SERVER, 'SERVER_ERROR', statusCode)
    this.name = 'ServerError'
  }
}

/**
 * Check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Check if error is NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new NetworkError(error.message, error)
    }

    return new AppError(error.message, ErrorType.UNKNOWN, undefined, undefined, error)
  }

  return new AppError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ', ErrorType.UNKNOWN, undefined, undefined, error)
}

/**
 * Convert Supabase error to AppError
 */
export function fromSupabaseError(error: any): AppError {
  if (!error) {
    return new AppError('เกิดข้อผิดพลาด', ErrorType.UNKNOWN)
  }

  const message = error.message || 'เกิดข้อผิดพลาด'
  const code = error.code
  const statusCode = error.statusCode || error.status

  // Map Supabase error codes to error types
  if (code === 'PGRST116' || statusCode === 404) {
    return new NotFoundError(message)
  }

  if (code === 'PGRST301' || statusCode === 401) {
    return new AuthenticationError(message)
  }

  if (statusCode === 403) {
    return new AuthorizationError(message)
  }

  if (statusCode === 400) {
    return new ValidationError(message, error.details)
  }

  if (statusCode >= 500) {
    return new ServerError(message, statusCode)
  }

  return new AppError(message, ErrorType.UNKNOWN, code, statusCode, error)
}

/**
 * Handle error with logging and user notification
 */
export function handleError(
  error: unknown,
  options: {
    showToast?: boolean
    logToSentry?: boolean
    context?: Record<string, any>
  } = {}
): AppError {
  const {
    showToast = false,
    logToSentry = true,
    context = {}
  } = options

  const appError = toAppError(error)

  // Log error
  logger.error(`[Error] ${appError.type}:`, appError.message, {
    code: appError.code,
    statusCode: appError.statusCode,
    details: appError.details,
    ...context
  })

  // Send to Sentry
  if (logToSentry) {
    captureError(appError, {
      type: appError.type,
      code: appError.code,
      statusCode: appError.statusCode,
      ...context
    })
  }

  // Show toast notification
  if (showToast) {
    // Import toast dynamically to avoid circular dependency
    import('../composables/useToast').then(({ useToast }) => {
      const toast = useToast()
      toast.error(appError.message)
    }).catch(() => {
      // Toast not available, ignore
    })
  }

  return appError
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  const appError = toAppError(error)

  // Return predefined user-friendly messages
  switch (appError.type) {
    case ErrorType.NETWORK:
      return 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
    case ErrorType.VALIDATION:
      return appError.message || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
    case ErrorType.AUTHENTICATION:
      return 'กรุณาเข้าสู่ระบบอีกครั้ง'
    case ErrorType.AUTHORIZATION:
      return 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'
    case ErrorType.NOT_FOUND:
      return 'ไม่พบข้อมูลที่ต้องการ'
    case ErrorType.SERVER:
      return 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง'
    default:
      return appError.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
  }
}

/**
 * Safe async wrapper that converts errors to Result
 */
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: toAppError(error) }
  }
}

