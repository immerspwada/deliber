/**
 * Admin Error Handling Utilities
 * Task: 3.1 - Create unified error utility for admin composables
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * 
 * Provides standardized error handling for admin composables with:
 * - AdminErrorCode enum for admin-specific errors
 * - AdminErrorContext interface for error context tracking
 * - createAdminError helper function
 * - Thai error messages for user-facing errors
 */

/**
 * Admin-specific error codes
 * Extends the base error system with admin panel specific errors
 */
export enum AdminErrorCode {
  // Order Reassignment Errors
  ORDER_REASSIGNMENT_FAILED = 'ORDER_REASSIGNMENT_FAILED',
  NO_AVAILABLE_PROVIDERS = 'NO_AVAILABLE_PROVIDERS',
  PROVIDER_ALREADY_ASSIGNED = 'PROVIDER_ALREADY_ASSIGNED',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  
  // Customer Suspension Errors
  CUSTOMER_SUSPENSION_FAILED = 'CUSTOMER_SUSPENSION_FAILED',
  CUSTOMER_ALREADY_SUSPENDED = 'CUSTOMER_ALREADY_SUSPENDED',
  CUSTOMER_NOT_SUSPENDED = 'CUSTOMER_NOT_SUSPENDED',
  CUSTOMER_HAS_ACTIVE_ORDERS = 'CUSTOMER_HAS_ACTIVE_ORDERS',
  
  // Provider Management Errors
  PROVIDER_APPROVAL_FAILED = 'PROVIDER_APPROVAL_FAILED',
  PROVIDER_REJECTION_FAILED = 'PROVIDER_REJECTION_FAILED',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_ALREADY_APPROVED = 'PROVIDER_ALREADY_APPROVED',
  
  // Payment & Wallet Errors
  TOPUP_APPROVAL_FAILED = 'TOPUP_APPROVAL_FAILED',
  TOPUP_REJECTION_FAILED = 'TOPUP_REJECTION_FAILED',
  WITHDRAWAL_APPROVAL_FAILED = 'WITHDRAWAL_APPROVAL_FAILED',
  WITHDRAWAL_REJECTION_FAILED = 'WITHDRAWAL_REJECTION_FAILED',
  INSUFFICIENT_ADMIN_PERMISSIONS = 'INSUFFICIENT_ADMIN_PERMISSIONS',
  
  // Data Fetching Errors
  ADMIN_DATA_FETCH_FAILED = 'ADMIN_DATA_FETCH_FAILED',
  ADMIN_STATS_FETCH_FAILED = 'ADMIN_STATS_FETCH_FAILED',
  
  // Validation Errors
  INVALID_PROVIDER_ID = 'INVALID_PROVIDER_ID',
  INVALID_ORDER_ID = 'INVALID_ORDER_ID',
  INVALID_CUSTOMER_ID = 'INVALID_CUSTOMER_ID',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  
  // Network Errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  
  // Unknown
  ADMIN_UNKNOWN_ERROR = 'ADMIN_UNKNOWN_ERROR',
}

/**
 * Context information for admin errors
 * Provides traceability and debugging information
 */
export interface AdminErrorContext {
  /** User ID of the admin performing the action */
  userId?: string
  
  /** Action being performed when error occurred */
  action: string
  
  /** Timestamp when error occurred */
  timestamp: number
  
  /** Order ID if applicable */
  orderId?: string
  
  /** Provider ID if applicable */
  providerId?: string
  
  /** Customer ID if applicable */
  customerId?: string
  
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Thai error messages for user-facing display
 * Maps AdminErrorCode to Thai language error messages
 */
export const ADMIN_ERROR_MESSAGES: Record<AdminErrorCode, string> = {
  // Order Reassignment
  [AdminErrorCode.ORDER_REASSIGNMENT_FAILED]: 'ไม่สามารถมอบหมายงานใหม่ได้',
  [AdminErrorCode.NO_AVAILABLE_PROVIDERS]: 'ไม่มีผู้ให้บริการที่พร้อมรับงาน',
  [AdminErrorCode.PROVIDER_ALREADY_ASSIGNED]: 'ผู้ให้บริการนี้ได้รับงานแล้ว',
  [AdminErrorCode.INVALID_ORDER_STATUS]: 'สถานะคำสั่งซื้อไม่ถูกต้อง',
  
  // Customer Suspension
  [AdminErrorCode.CUSTOMER_SUSPENSION_FAILED]: 'ไม่สามารถระงับบัญชีลูกค้าได้',
  [AdminErrorCode.CUSTOMER_ALREADY_SUSPENDED]: 'บัญชีลูกค้านี้ถูกระงับแล้ว',
  [AdminErrorCode.CUSTOMER_NOT_SUSPENDED]: 'บัญชีลูกค้านี้ไม่ได้ถูกระงับ',
  [AdminErrorCode.CUSTOMER_HAS_ACTIVE_ORDERS]: 'ลูกค้ามีคำสั่งซื้อที่กำลังดำเนินการอยู่',
  
  // Provider Management
  [AdminErrorCode.PROVIDER_APPROVAL_FAILED]: 'ไม่สามารถอนุมัติผู้ให้บริการได้',
  [AdminErrorCode.PROVIDER_REJECTION_FAILED]: 'ไม่สามารถปฏิเสธผู้ให้บริการได้',
  [AdminErrorCode.PROVIDER_NOT_FOUND]: 'ไม่พบผู้ให้บริการ',
  [AdminErrorCode.PROVIDER_ALREADY_APPROVED]: 'ผู้ให้บริการนี้ได้รับการอนุมัติแล้ว',
  
  // Payment & Wallet
  [AdminErrorCode.TOPUP_APPROVAL_FAILED]: 'ไม่สามารถอนุมัติการเติมเงินได้',
  [AdminErrorCode.TOPUP_REJECTION_FAILED]: 'ไม่สามารถปฏิเสธการเติมเงินได้',
  [AdminErrorCode.WITHDRAWAL_APPROVAL_FAILED]: 'ไม่สามารถอนุมัติการถอนเงินได้',
  [AdminErrorCode.WITHDRAWAL_REJECTION_FAILED]: 'ไม่สามารถปฏิเสธการถอนเงินได้',
  [AdminErrorCode.INSUFFICIENT_ADMIN_PERMISSIONS]: 'คุณไม่มีสิทธิ์ดำเนินการนี้',
  
  // Data Fetching
  [AdminErrorCode.ADMIN_DATA_FETCH_FAILED]: 'ไม่สามารถโหลดข้อมูลได้',
  [AdminErrorCode.ADMIN_STATS_FETCH_FAILED]: 'ไม่สามารถโหลดสถิติได้',
  
  // Validation
  [AdminErrorCode.INVALID_PROVIDER_ID]: 'รหัสผู้ให้บริการไม่ถูกต้อง',
  [AdminErrorCode.INVALID_ORDER_ID]: 'รหัสคำสั่งซื้อไม่ถูกต้อง',
  [AdminErrorCode.INVALID_CUSTOMER_ID]: 'รหัสลูกค้าไม่ถูกต้อง',
  [AdminErrorCode.INVALID_DATE_RANGE]: 'ช่วงวันที่ไม่ถูกต้อง',
  
  // Network
  [AdminErrorCode.NETWORK_TIMEOUT]: 'หมดเวลาการเชื่อมต่อ กรุณาลองใหม่',
  [AdminErrorCode.NETWORK_UNAVAILABLE]: 'ไม่สามารถเชื่อมต่อได้ ตรวจสอบอินเทอร์เน็ต',
  
  // Unknown
  [AdminErrorCode.ADMIN_UNKNOWN_ERROR]: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
}

/**
 * Admin Error class
 * Extends Error with admin-specific context and metadata
 */
export class AdminError extends Error {
  public code: AdminErrorCode;
  public context: AdminErrorContext;
  public originalError?: Error | unknown;

  constructor(
    code: AdminErrorCode,
    context: AdminErrorContext,
    originalError?: Error | unknown,
  ) {
    super(ADMIN_ERROR_MESSAGES[code]);
    this.name = 'AdminError';
    this.code = code;
    this.context = context;
    this.originalError = originalError;
    
    // Maintain proper stack trace for debugging
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, AdminError);
    }
  }

  // Get Thai error message for display
  getUserMessage(): string {
    return ADMIN_ERROR_MESSAGES[this.code];
  }

  // Convert error to JSON for logging
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      originalError: this.originalError instanceof Error 
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : this.originalError,
      stack: this.stack,
    };
  }

  // Log error to console with context
  log(): void {
    console.error('[AdminError]', this.toJSON());
  }
}

/**
 * Create an AdminError instance
 * Helper function for consistent error creation
 * 
 * @param code - Admin error code
 * @param context - Error context with action, timestamp, and optional IDs
 * @param originalError - Original error that caused this error (optional)
 * @returns AdminError instance
 * 
 * @example
 * ```typescript
 * throw createAdminError(
 *   AdminErrorCode.ORDER_REASSIGNMENT_FAILED,
 *   {
 *     action: 'reassign_order',
 *     timestamp: Date.now(),
 *     orderId: '123',
 *     providerId: '456',
 *     userId: 'admin-789'
 *   },
 *   originalError
 * )
 * ```
 */
export function createAdminError(
  code: AdminErrorCode,
  context: AdminErrorContext,
  originalError?: Error | unknown,
): AdminError {
  const error = new AdminError(code, context, originalError)
  
  // Log error in development
  if (import.meta.env.DEV) {
    error.log()
  }
  
  return error
}

/**
 * Check if error is an AdminError
 */
export function isAdminError(error: unknown): error is AdminError {
  return error instanceof AdminError
}

/**
 * Map Supabase error to AdminErrorCode
 * Converts common Supabase errors to appropriate admin error codes
 */
export function mapSupabaseErrorToAdminCode(error: any): AdminErrorCode {
  const message = error?.message?.toLowerCase() || ''
  const code = error?.code || ''
  
  // Network errors
  if (message.includes('fetch') || message.includes('network')) {
    return AdminErrorCode.NETWORK_UNAVAILABLE
  }
  
  if (message.includes('timeout')) {
    return AdminErrorCode.NETWORK_TIMEOUT
  }
  
  // Server errors (503, 500, etc.)
  if (message.includes('unavailable') || code === '503' || code === '500') {
    return AdminErrorCode.NETWORK_UNAVAILABLE
  }
  
  // Permission errors
  if (message.includes('permission') || message.includes('policy') || code === 'PGRST301') {
    return AdminErrorCode.INSUFFICIENT_ADMIN_PERMISSIONS
  }
  
  // Not found errors
  if (message.includes('not found') || code === 'PGRST116') {
    return AdminErrorCode.ADMIN_DATA_FETCH_FAILED
  }
  
  // Default to unknown
  return AdminErrorCode.ADMIN_UNKNOWN_ERROR
}

/**
 * Handle Supabase error and convert to AdminError
 * 
 * @param error - Supabase error
 * @param action - Action being performed
 * @param additionalContext - Additional context (orderId, providerId, etc.)
 * @returns AdminError instance
 */
export function handleSupabaseError(
  error: any,
  action: string,
  additionalContext?: Partial<Omit<AdminErrorContext, 'action' | 'timestamp'>>,
): AdminError {
  const code = mapSupabaseErrorToAdminCode(error)
  
  return createAdminError(
    code,
    {
      action,
      timestamp: Date.now(),
      ...additionalContext,
    },
    error,
  )
}

/**
 * Validate admin error context
 * Ensures required fields are present
 */
export function validateAdminErrorContext(context: AdminErrorContext): boolean {
  return (
    typeof context.action === 'string' &&
    context.action.length > 0 &&
    typeof context.timestamp === 'number' &&
    context.timestamp > 0
  )
}

/**
 * Create error context helper
 * Simplifies creating error context with current timestamp
 */
export function createErrorContext(
  action: string,
  options?: Partial<Omit<AdminErrorContext, 'action' | 'timestamp'>>,
): AdminErrorContext {
  return {
    action,
    timestamp: Date.now(),
    ...options,
  }
}
