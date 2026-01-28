/**
 * Shopping Error Handler Composable
 * Centralized error handling for shopping operations
 */
import { ref } from 'vue'

export enum ShoppingErrorCode {
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  INVALID_LOCATION = 'INVALID_LOCATION',
  INVALID_ITEMS = 'INVALID_ITEMS',
  INVALID_BUDGET = 'INVALID_BUDGET',
  IMAGE_UPLOAD_FAILED = 'IMAGE_UPLOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export interface ShoppingError {
  code: ShoppingErrorCode
  message: string
  userMessage: string
  context?: Record<string, unknown>
}

const ERROR_MESSAGES: Record<ShoppingErrorCode, string> = {
  [ShoppingErrorCode.INSUFFICIENT_BALANCE]: '💰 ยอดเงินในกระเป๋าไม่เพียงพอ\n\nกรุณาเติมเงินก่อนสั่งบริการ',
  [ShoppingErrorCode.WALLET_NOT_FOUND]: '❌ ไม่พบกระเป๋าเงิน\n\nกรุณาติดต่อฝ่ายสนับสนุน',
  [ShoppingErrorCode.INVALID_LOCATION]: '📍 ตำแหน่งไม่ถูกต้อง\n\nกรุณาเลือกตำแหน่งใหม่',
  [ShoppingErrorCode.INVALID_ITEMS]: '📝 รายการสินค้าไม่ถูกต้อง\n\nกรุณากรอกรายการสินค้า',
  [ShoppingErrorCode.INVALID_BUDGET]: '💵 งบประมาณไม่ถูกต้อง\n\nกรุณาระบุงบประมาณ',
  [ShoppingErrorCode.IMAGE_UPLOAD_FAILED]: '📷 อัพโหลดรูปภาพไม่สำเร็จ\n\nกรุณาลองใหม่',
  [ShoppingErrorCode.NETWORK_ERROR]: '🌐 ไม่สามารถเชื่อมต่อได้\n\nกรุณาตรวจสอบอินเทอร์เน็ต',
  [ShoppingErrorCode.UNKNOWN]: '❌ เกิดข้อผิดพลาด\n\nกรุณาลองใหม่อีกครั้ง'
}

export function useShoppingErrorHandler() {
  const currentError = ref<ShoppingError | null>(null)
  const showError = ref(false)

  const parseError = (error: unknown): ShoppingError => {
    // Handle string errors
    if (typeof error === 'string') {
      if (error.includes('INSUFFICIENT_BALANCE') || error.includes('ยอดเงิน')) {
        return {
          code: ShoppingErrorCode.INSUFFICIENT_BALANCE,
          message: error,
          userMessage: ERROR_MESSAGES[ShoppingErrorCode.INSUFFICIENT_BALANCE]
        }
      }
      if (error.includes('WALLET_NOT_FOUND') || error.includes('ไม่พบ Wallet')) {
        return {
          code: ShoppingErrorCode.WALLET_NOT_FOUND,
          message: error,
          userMessage: ERROR_MESSAGES[ShoppingErrorCode.WALLET_NOT_FOUND]
        }
      }
    }

    // Handle Error objects
    if (error instanceof Error) {
      const message = error.message

      if (message.includes('INSUFFICIENT_BALANCE') || message.includes('ยอดเงิน')) {
        return {
          code: ShoppingErrorCode.INSUFFICIENT_BALANCE,
          message,
          userMessage: ERROR_MESSAGES[ShoppingErrorCode.INSUFFICIENT_BALANCE]
        }
      }
      if (message.includes('WALLET_NOT_FOUND') || message.includes('ไม่พบ Wallet')) {
        return {
          code: ShoppingErrorCode.WALLET_NOT_FOUND,
          message,
          userMessage: ERROR_MESSAGES[ShoppingErrorCode.WALLET_NOT_FOUND]
        }
      }
      if (message.includes('network') || message.includes('fetch')) {
        return {
          code: ShoppingErrorCode.NETWORK_ERROR,
          message,
          userMessage: ERROR_MESSAGES[ShoppingErrorCode.NETWORK_ERROR]
        }
      }

      return {
        code: ShoppingErrorCode.UNKNOWN,
        message,
        userMessage: ERROR_MESSAGES[ShoppingErrorCode.UNKNOWN]
      }
    }

    // Unknown error type
    return {
      code: ShoppingErrorCode.UNKNOWN,
      message: String(error),
      userMessage: ERROR_MESSAGES[ShoppingErrorCode.UNKNOWN]
    }
  }

  const handleError = (error: unknown, context?: Record<string, unknown>) => {
    const parsedError = parseError(error)
    
    if (context) {
      parsedError.context = context
    }

    currentError.value = parsedError
    showError.value = true

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[ShoppingError]', {
        code: parsedError.code,
        message: parsedError.message,
        context: parsedError.context
      })
    }

    // TODO: Send to error tracking service (Sentry) in production
    if (import.meta.env.PROD) {
      // Sentry.captureException(error, { extra: parsedError.context })
    }

    return parsedError
  }

  const clearError = () => {
    currentError.value = null
    showError.value = false
  }

  const getActionableMessage = (error: ShoppingError): string => {
    switch (error.code) {
      case ShoppingErrorCode.INSUFFICIENT_BALANCE:
        return 'เติมเงิน'
      case ShoppingErrorCode.INVALID_LOCATION:
        return 'เลือกตำแหน่งใหม่'
      case ShoppingErrorCode.INVALID_ITEMS:
        return 'กรอกรายการ'
      case ShoppingErrorCode.INVALID_BUDGET:
        return 'ระบุงบประมาณ'
      case ShoppingErrorCode.IMAGE_UPLOAD_FAILED:
        return 'ลองอัพโหลดใหม่'
      case ShoppingErrorCode.NETWORK_ERROR:
        return 'ลองใหม่'
      default:
        return 'ลองใหม่'
    }
  }

  return {
    currentError,
    showError,
    handleError,
    clearError,
    getActionableMessage,
    ERROR_MESSAGES
  }
}
