/**
 * Admin Error Utility Unit Tests
 * Task: 3.1 - Create unified error utility for admin composables
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * 
 * Tests the admin error handling system:
 * - AdminErrorCode enum values
 * - AdminError class functionality
 * - createAdminError helper
 * - Thai error messages
 * - Error context validation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  AdminErrorCode,
  AdminError,
  createAdminError,
  isAdminError,
  mapSupabaseErrorToAdminCode,
  handleSupabaseError,
  validateAdminErrorContext,
  createErrorContext,
  ADMIN_ERROR_MESSAGES,
  type AdminErrorContext,
} from '@/admin/utils/errors'

describe('AdminErrorCode Enum', () => {
  it('should have all required error codes', () => {
    // Order Reassignment codes
    expect(AdminErrorCode.ORDER_REASSIGNMENT_FAILED).toBe('ORDER_REASSIGNMENT_FAILED')
    expect(AdminErrorCode.NO_AVAILABLE_PROVIDERS).toBe('NO_AVAILABLE_PROVIDERS')
    expect(AdminErrorCode.PROVIDER_ALREADY_ASSIGNED).toBe('PROVIDER_ALREADY_ASSIGNED')
    
    // Customer Suspension codes
    expect(AdminErrorCode.CUSTOMER_SUSPENSION_FAILED).toBe('CUSTOMER_SUSPENSION_FAILED')
    expect(AdminErrorCode.CUSTOMER_ALREADY_SUSPENDED).toBe('CUSTOMER_ALREADY_SUSPENDED')
    expect(AdminErrorCode.CUSTOMER_NOT_SUSPENDED).toBe('CUSTOMER_NOT_SUSPENDED')
    
    // Validation codes
    expect(AdminErrorCode.INVALID_PROVIDER_ID).toBe('INVALID_PROVIDER_ID')
    expect(AdminErrorCode.INVALID_ORDER_ID).toBe('INVALID_ORDER_ID')
    expect(AdminErrorCode.INVALID_CUSTOMER_ID).toBe('INVALID_CUSTOMER_ID')
    
    // Network codes
    expect(AdminErrorCode.NETWORK_TIMEOUT).toBe('NETWORK_TIMEOUT')
    expect(AdminErrorCode.NETWORK_UNAVAILABLE).toBe('NETWORK_UNAVAILABLE')
  })
})

describe('ADMIN_ERROR_MESSAGES', () => {
  it('should have Thai messages for all error codes', () => {
    const errorCodes = Object.values(AdminErrorCode)
    
    errorCodes.forEach(code => {
      const message = ADMIN_ERROR_MESSAGES[code]
      expect(message).toBeDefined()
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
    })
  })

  it('should have Thai language messages', () => {
    // Check a few messages contain Thai characters
    expect(ADMIN_ERROR_MESSAGES[AdminErrorCode.ORDER_REASSIGNMENT_FAILED]).toContain('ไม่สามารถ')
    expect(ADMIN_ERROR_MESSAGES[AdminErrorCode.NO_AVAILABLE_PROVIDERS]).toContain('ไม่มี')
    expect(ADMIN_ERROR_MESSAGES[AdminErrorCode.CUSTOMER_SUSPENSION_FAILED]).toContain('ระงับ')
  })

  it('should have user-friendly messages', () => {
    // Messages should be clear and actionable
    expect(ADMIN_ERROR_MESSAGES[AdminErrorCode.NETWORK_TIMEOUT]).toContain('กรุณาลองใหม่')
    expect(ADMIN_ERROR_MESSAGES[AdminErrorCode.NETWORK_UNAVAILABLE]).toContain('ตรวจสอบอินเทอร์เน็ต')
  })
})

describe('AdminError Class', () => {
  let context: AdminErrorContext

  beforeEach(() => {
    context = {
      action: 'test_action',
      timestamp: Date.now(),
      userId: 'admin-123',
      orderId: 'order-456',
    }
  })

  it('should create AdminError with code and context', () => {
    const error = new AdminError(
      AdminErrorCode.ORDER_REASSIGNMENT_FAILED,
      context
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AdminError)
    expect(error.name).toBe('AdminError')
    expect(error.code).toBe(AdminErrorCode.ORDER_REASSIGNMENT_FAILED)
    expect(error.context).toEqual(context)
    expect(error.message).toBe(ADMIN_ERROR_MESSAGES[AdminErrorCode.ORDER_REASSIGNMENT_FAILED])
  })

  it('should store original error', () => {
    const originalError = new Error('Original error message')
    const error = new AdminError(
      AdminErrorCode.ORDER_REASSIGNMENT_FAILED,
      context,
      originalError
    )

    expect(error.originalError).toBe(originalError)
  })

  it('should return Thai user message', () => {
    const error = new AdminError(
      AdminErrorCode.NO_AVAILABLE_PROVIDERS,
      context
    )

    const userMessage = error.getUserMessage()
    expect(userMessage).toBe(ADMIN_ERROR_MESSAGES[AdminErrorCode.NO_AVAILABLE_PROVIDERS])
    expect(userMessage).toContain('ไม่มี')
  })

  it('should convert to JSON with all properties', () => {
    const originalError = new Error('Test error')
    const error = new AdminError(
      AdminErrorCode.PROVIDER_ALREADY_ASSIGNED,
      context,
      originalError
    )

    const json = error.toJSON()

    expect(json.name).toBe('AdminError')
    expect(json.code).toBe(AdminErrorCode.PROVIDER_ALREADY_ASSIGNED)
    expect(json.message).toBe(ADMIN_ERROR_MESSAGES[AdminErrorCode.PROVIDER_ALREADY_ASSIGNED])
    expect(json.context).toEqual(context)
    expect(json.originalError).toBeDefined()
    expect(json.originalError.message).toBe('Test error')
    expect(json.stack).toBeDefined()
  })

  it('should handle non-Error original errors', () => {
    const originalError = { code: 'CUSTOM_ERROR', details: 'Some details' }
    const error = new AdminError(
      AdminErrorCode.ADMIN_UNKNOWN_ERROR,
      context,
      originalError
    )

    const json = error.toJSON()
    expect(json.originalError).toEqual(originalError)
  })
})

describe('createAdminError', () => {
  it('should create AdminError with required parameters', () => {
    const context: AdminErrorContext = {
      action: 'reassign_order',
      timestamp: Date.now(),
      orderId: 'order-123',
      providerId: 'provider-456',
    }

    const error = createAdminError(
      AdminErrorCode.ORDER_REASSIGNMENT_FAILED,
      context
    )

    expect(error).toBeInstanceOf(AdminError)
    expect(error.code).toBe(AdminErrorCode.ORDER_REASSIGNMENT_FAILED)
    expect(error.context).toEqual(context)
  })

  it('should create AdminError with original error', () => {
    const originalError = new Error('Supabase error')
    const context: AdminErrorContext = {
      action: 'fetch_providers',
      timestamp: Date.now(),
    }

    const error = createAdminError(
      AdminErrorCode.NO_AVAILABLE_PROVIDERS,
      context,
      originalError
    )

    expect(error.originalError).toBe(originalError)
  })

  it('should include all context fields', () => {
    const context: AdminErrorContext = {
      action: 'suspend_customer',
      timestamp: Date.now(),
      userId: 'admin-789',
      customerId: 'customer-101',
      metadata: {
        reason: 'fraud',
        notes: 'Suspicious activity',
      },
    }

    const error = createAdminError(
      AdminErrorCode.CUSTOMER_SUSPENSION_FAILED,
      context
    )

    expect(error.context.userId).toBe('admin-789')
    expect(error.context.customerId).toBe('customer-101')
    expect(error.context.metadata).toEqual({
      reason: 'fraud',
      notes: 'Suspicious activity',
    })
  })
})

describe('isAdminError', () => {
  it('should return true for AdminError instances', () => {
    const error = createAdminError(
      AdminErrorCode.ORDER_REASSIGNMENT_FAILED,
      {
        action: 'test',
        timestamp: Date.now(),
      }
    )

    expect(isAdminError(error)).toBe(true)
  })

  it('should return false for regular Error', () => {
    const error = new Error('Regular error')
    expect(isAdminError(error)).toBe(false)
  })

  it('should return false for non-error values', () => {
    expect(isAdminError(null)).toBe(false)
    expect(isAdminError(undefined)).toBe(false)
    expect(isAdminError('string')).toBe(false)
    expect(isAdminError(123)).toBe(false)
    expect(isAdminError({})).toBe(false)
  })
})

describe('mapSupabaseErrorToAdminCode', () => {
  it('should map network errors', () => {
    const error = { message: 'fetch failed' }
    expect(mapSupabaseErrorToAdminCode(error)).toBe(AdminErrorCode.NETWORK_UNAVAILABLE)
  })

  it('should map timeout errors', () => {
    const error = { message: 'Request timeout' }
    expect(mapSupabaseErrorToAdminCode(error)).toBe(AdminErrorCode.NETWORK_TIMEOUT)
  })

  it('should map permission errors', () => {
    const error = { message: 'permission denied', code: 'PGRST301' }
    expect(mapSupabaseErrorToAdminCode(error)).toBe(AdminErrorCode.INSUFFICIENT_ADMIN_PERMISSIONS)
  })

  it('should map not found errors', () => {
    const error = { message: 'not found', code: 'PGRST116' }
    expect(mapSupabaseErrorToAdminCode(error)).toBe(AdminErrorCode.ADMIN_DATA_FETCH_FAILED)
  })

  it('should default to unknown error', () => {
    const error = { message: 'Some unknown error' }
    expect(mapSupabaseErrorToAdminCode(error)).toBe(AdminErrorCode.ADMIN_UNKNOWN_ERROR)
  })

  it('should handle errors without message', () => {
    const error = {}
    expect(mapSupabaseErrorToAdminCode(error)).toBe(AdminErrorCode.ADMIN_UNKNOWN_ERROR)
  })
})

describe('handleSupabaseError', () => {
  it('should convert Supabase error to AdminError', () => {
    const supabaseError = {
      message: 'fetch failed',
      code: 'NETWORK_ERROR',
    }

    const adminError = handleSupabaseError(
      supabaseError,
      'fetch_providers'
    )

    expect(adminError).toBeInstanceOf(AdminError)
    expect(adminError.code).toBe(AdminErrorCode.NETWORK_UNAVAILABLE)
    expect(adminError.context.action).toBe('fetch_providers')
    expect(adminError.originalError).toBe(supabaseError)
  })

  it('should include additional context', () => {
    const supabaseError = { message: 'not found' }
    const adminError = handleSupabaseError(
      supabaseError,
      'reassign_order',
      {
        orderId: 'order-123',
        providerId: 'provider-456',
        userId: 'admin-789',
      }
    )

    expect(adminError.context.orderId).toBe('order-123')
    expect(adminError.context.providerId).toBe('provider-456')
    expect(adminError.context.userId).toBe('admin-789')
  })

  it('should set timestamp automatically', () => {
    const before = Date.now()
    const adminError = handleSupabaseError(
      { message: 'error' },
      'test_action'
    )
    const after = Date.now()

    expect(adminError.context.timestamp).toBeGreaterThanOrEqual(before)
    expect(adminError.context.timestamp).toBeLessThanOrEqual(after)
  })
})

describe('validateAdminErrorContext', () => {
  it('should validate valid context', () => {
    const context: AdminErrorContext = {
      action: 'test_action',
      timestamp: Date.now(),
    }

    expect(validateAdminErrorContext(context)).toBe(true)
  })

  it('should validate context with optional fields', () => {
    const context: AdminErrorContext = {
      action: 'test_action',
      timestamp: Date.now(),
      userId: 'admin-123',
      orderId: 'order-456',
      metadata: { key: 'value' },
    }

    expect(validateAdminErrorContext(context)).toBe(true)
  })

  it('should reject context with empty action', () => {
    const context: AdminErrorContext = {
      action: '',
      timestamp: Date.now(),
    }

    expect(validateAdminErrorContext(context)).toBe(false)
  })

  it('should reject context with invalid timestamp', () => {
    const context: AdminErrorContext = {
      action: 'test_action',
      timestamp: 0,
    }

    expect(validateAdminErrorContext(context)).toBe(false)
  })

  it('should reject context with negative timestamp', () => {
    const context: AdminErrorContext = {
      action: 'test_action',
      timestamp: -1,
    }

    expect(validateAdminErrorContext(context)).toBe(false)
  })
})

describe('createErrorContext', () => {
  it('should create context with action and timestamp', () => {
    const before = Date.now()
    const context = createErrorContext('test_action')
    const after = Date.now()

    expect(context.action).toBe('test_action')
    expect(context.timestamp).toBeGreaterThanOrEqual(before)
    expect(context.timestamp).toBeLessThanOrEqual(after)
  })

  it('should include optional fields', () => {
    const context = createErrorContext('test_action', {
      userId: 'admin-123',
      orderId: 'order-456',
      providerId: 'provider-789',
    })

    expect(context.action).toBe('test_action')
    expect(context.userId).toBe('admin-123')
    expect(context.orderId).toBe('order-456')
    expect(context.providerId).toBe('provider-789')
  })

  it('should include metadata', () => {
    const context = createErrorContext('test_action', {
      metadata: {
        reason: 'test',
        details: 'some details',
      },
    })

    expect(context.metadata).toEqual({
      reason: 'test',
      details: 'some details',
    })
  })
})

describe('Error Context Requirements', () => {
  it('should include userId in context (Requirement 2.4)', () => {
    const context = createErrorContext('test_action', {
      userId: 'admin-123',
    })

    expect(context.userId).toBe('admin-123')
  })

  it('should include action in context (Requirement 2.4)', () => {
    const context = createErrorContext('reassign_order')

    expect(context.action).toBe('reassign_order')
    expect(typeof context.action).toBe('string')
  })

  it('should include timestamp in context (Requirement 2.4)', () => {
    const context = createErrorContext('test_action')

    expect(context.timestamp).toBeDefined()
    expect(typeof context.timestamp).toBe('number')
    expect(context.timestamp).toBeGreaterThan(0)
  })

  it('should include orderId and providerId when applicable (Requirement 2.4)', () => {
    const context = createErrorContext('reassign_order', {
      orderId: 'order-123',
      providerId: 'provider-456',
    })

    expect(context.orderId).toBe('order-123')
    expect(context.providerId).toBe('provider-456')
  })
})

describe('Integration with Requirements', () => {
  it('should throw AppError instance (Requirement 2.1)', () => {
    const error = createAdminError(
      AdminErrorCode.ORDER_REASSIGNMENT_FAILED,
      {
        action: 'test',
        timestamp: Date.now(),
      }
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AdminError)
  })

  it('should include valid ErrorCode (Requirement 2.2)', () => {
    const error = createAdminError(
      AdminErrorCode.NO_AVAILABLE_PROVIDERS,
      {
        action: 'test',
        timestamp: Date.now(),
      }
    )

    expect(Object.values(AdminErrorCode)).toContain(error.code)
  })

  it('should display Thai language messages (Requirement 2.3)', () => {
    const error = createAdminError(
      AdminErrorCode.CUSTOMER_SUSPENSION_FAILED,
      {
        action: 'test',
        timestamp: Date.now(),
      }
    )

    const message = error.getUserMessage()
    expect(message).toBe('ไม่สามารถระงับบัญชีลูกค้าได้')
    // Check for Thai characters
    expect(/[\u0E00-\u0E7F]/.test(message)).toBe(true)
  })

  it('should include complete error context (Requirement 2.4)', () => {
    const context: AdminErrorContext = {
      userId: 'admin-123',
      action: 'reassign_order',
      timestamp: Date.now(),
      orderId: 'order-456',
      providerId: 'provider-789',
    }

    const error = createAdminError(
      AdminErrorCode.ORDER_REASSIGNMENT_FAILED,
      context
    )

    expect(error.context.userId).toBe('admin-123')
    expect(error.context.action).toBe('reassign_order')
    expect(error.context.timestamp).toBeGreaterThan(0)
    expect(error.context.orderId).toBe('order-456')
    expect(error.context.providerId).toBe('provider-789')
  })
})
