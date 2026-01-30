/**
 * useErrorHandler - Composable สำหรับจัดการ errors แบบ centralized
 * 
 * Features:
 * - Standardized error handling
 * - User-friendly Thai messages
 * - Sentry integration (production)
 * - Toast notifications
 */
import { useToast } from './useToast'

export enum ErrorCode {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION = 'PERMISSION',
  RATE_LIMITED = 'RATE_LIMITED',
  BUSINESS = 'BUSINESS',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  UNKNOWN = 'UNKNOWN'
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public userMessage?: string,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Thai user messages
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  NETWORK: 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต',
  AUTH: 'กรุณาเข้าสู่ระบบใหม่',
  VALIDATION: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
  NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
  PERMISSION: 'คุณไม่มีสิทธิ์เข้าถึง',
  RATE_LIMITED: 'คำขอมากเกินไป กรุณารอสักครู่',
  BUSINESS: 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่',
  INSUFFICIENT_BALANCE: 'ยอดเงินไม่เพียงพอ กรุณาเติมเงิน',
  UNKNOWN: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

export function useErrorHandler() {
  const { error: showError, warning: showWarning } = useToast()

  /**
   * Handle error with user-friendly message
   */
  function handle(error: unknown, context?: string): void {
    // Log for debugging
    if (import.meta.env.DEV) {
      console.error(`[ErrorHandler${context ? ` - ${context}` : ''}]`, error)
    }

    // Handle AppError
    if (error instanceof AppError) {
      const message = error.userMessage ?? ERROR_MESSAGES[error.code]
      
      if (error.code === ErrorCode.RATE_LIMITED) {
        showWarning(message)
      } else {
        showError(message)
      }

      // Report to Sentry (production)
      if (import.meta.env.PROD && window.Sentry) {
        window.Sentry.captureException(error, {
          tags: {
            errorCode: error.code,
            context: context || 'unknown'
          },
          extra: error.context
        })
      }
      return
    }

    // Handle Supabase errors
    if (error && typeof error === 'object' && 'code' in error) {
      const supabaseError = error as { code: string; message: string }
      
      // Map Supabase error codes to AppError codes
      let errorCode = ErrorCode.UNKNOWN
      let userMessage = ERROR_MESSAGES.UNKNOWN
      
      if (supabaseError.code === 'PGRST116') {
        errorCode = ErrorCode.NOT_FOUND
        userMessage = ERROR_MESSAGES.NOT_FOUND
      } else if (supabaseError.code === '42501') {
        errorCode = ErrorCode.PERMISSION
        userMessage = ERROR_MESSAGES.PERMISSION
      } else if (supabaseError.message?.includes('JWT')) {
        errorCode = ErrorCode.AUTH
        userMessage = ERROR_MESSAGES.AUTH
      }
      
      showError(userMessage)
      
      if (import.meta.env.PROD && window.Sentry) {
        window.Sentry.captureException(error, {
          tags: {
            errorCode,
            supabaseCode: supabaseError.code,
            context: context || 'unknown'
          }
        })
      }
      return
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showError(ERROR_MESSAGES.NETWORK)
      return
    }

    // Handle unknown errors
    showError(ERROR_MESSAGES.UNKNOWN)
    
    if (import.meta.env.PROD && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          errorCode: ErrorCode.UNKNOWN,
          context: context || 'unknown'
        }
      })
    }
  }

  /**
   * Create AppError with code
   */
  function createError(
    code: ErrorCode,
    message?: string,
    context?: Record<string, unknown>
  ): AppError {
    return new AppError(
      message || ERROR_MESSAGES[code],
      code,
      ERROR_MESSAGES[code],
      context
    )
  }

  return {
    handle,
    createError,
    AppError,
    ErrorCode,
    ERROR_MESSAGES
  }
}

// Type augmentation for Sentry
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: unknown, context?: any) => void
    }
  }
}
