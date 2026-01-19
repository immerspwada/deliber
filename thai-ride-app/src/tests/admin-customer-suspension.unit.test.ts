/**
 * Admin Customer Suspension System - Unit Tests
 * ==============================================
 * Tests for customer suspension/unsuspension functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase first (before imports)
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'admin-123' } }
      }))
    }
  }
}))

vi.mock('@/composables/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handle: vi.fn()
  })
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn()
  })
}))

vi.mock('@/admin/composables/useAuditLog', () => ({
  useAuditLog: () => ({
    logCustomerSuspension: vi.fn(),
    logCustomerUnsuspension: vi.fn()
  })
}))

vi.mock('@/admin/schemas/validation', () => ({
  CustomerSuspensionSchema: {},
  CustomerUnsuspensionSchema: {},
  validateInput: vi.fn(() => ({ success: true, errors: {} }))
}))

import { useAdminCustomers } from '@/admin/composables/useAdminCustomers'
import { supabase } from '@/lib/supabase'

describe('useAdminCustomers - Suspension System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('suspendCustomer', () => {
    it('should suspend customer successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: true,
          customer_id: 'customer-123',
          customer_name: 'John Doe'
        },
        error: null
      })

      const { suspendCustomer } = useAdminCustomers()
      const result = await suspendCustomer('customer-123', 'Violation of terms')

      expect(result.success).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('suspend_customer_account', {
        p_customer_id: 'customer-123',
        p_reason: 'Violation of terms'
      })
    })

    it('should handle suspension errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Customer not found')
      })

      const { suspendCustomer } = useAdminCustomers()
      const result = await suspendCustomer('invalid-id', 'Test reason')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Customer not found')
    })

    it('should validate suspension reason', async () => {
      const { validateInput } = await import('@/admin/schemas/validation')
      vi.mocked(validateInput).mockReturnValueOnce({
        success: false,
        errors: { reason: 'Reason is required' }
      })

      const { suspendCustomer } = useAdminCustomers()
      const result = await suspendCustomer('customer-123', '')

      expect(result.success).toBe(false)
    })
  })

  describe('unsuspendCustomer', () => {
    it('should unsuspend customer successfully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: {
          success: true,
          customer_id: 'customer-123',
          customer_name: 'John Doe'
        },
        error: null
      })

      const { unsuspendCustomer } = useAdminCustomers()
      const result = await unsuspendCustomer('customer-123')

      expect(result.success).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('unsuspend_customer_account', {
        p_customer_id: 'customer-123'
      })
    })

    it('should handle unsuspension errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Customer not found')
      })

      const { unsuspendCustomer } = useAdminCustomers()
      const result = await unsuspendCustomer('invalid-id')

      expect(result.success).toBe(false)
    })
  })

  describe('Status Helpers', () => {
    it('should return correct status labels', () => {
      const { getStatusLabel } = useAdminCustomers()

      expect(getStatusLabel('active')).toBe('ใช้งานปกติ')
      expect(getStatusLabel('suspended')).toBe('ระงับการใช้งาน')
      expect(getStatusLabel('banned')).toBe('แบนถาวร')
    })

    it('should return correct status colors', () => {
      const { getStatusColorHex } = useAdminCustomers()

      expect(getStatusColorHex('active')).toBe('#059669')
      expect(getStatusColorHex('suspended')).toBe('#EF4444')
      expect(getStatusColorHex('banned')).toBe('#DC2626')
    })
  })

  describe('Computed Properties', () => {
    it('should filter active customers', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [
          { id: '1', status: 'active', full_name: 'User 1' },
          { id: '2', status: 'suspended', full_name: 'User 2' },
          { id: '3', status: 'active', full_name: 'User 3' }
        ],
        error: null
      })

      const { fetchCustomers, activeCustomers } = useAdminCustomers()
      await fetchCustomers()

      expect(activeCustomers.value).toHaveLength(2)
      expect(activeCustomers.value.every(c => c.status === 'active')).toBe(true)
    })

    it('should filter suspended customers', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [
          { id: '1', status: 'active', full_name: 'User 1' },
          { id: '2', status: 'suspended', full_name: 'User 2' },
          { id: '3', status: 'suspended', full_name: 'User 3' }
        ],
        error: null
      })

      const { fetchCustomers, suspendedCustomers } = useAdminCustomers()
      await fetchCustomers()

      expect(suspendedCustomers.value).toHaveLength(2)
      expect(suspendedCustomers.value.every(c => c.status === 'suspended')).toBe(true)
    })
  })

  describe('Format Helpers', () => {
    it('should format currency correctly', () => {
      const { formatCurrency } = useAdminCustomers()

      expect(formatCurrency(1000)).toContain('1,000')
      expect(formatCurrency(0)).toContain('0')
    })

    it('should format date correctly', () => {
      const { formatDate } = useAdminCustomers()

      const date = '2024-01-15T10:30:00Z'
      const formatted = formatDate(date)

      expect(formatted).toBeTruthy()
      expect(formatted).not.toBe('-')
    })

    it('should handle null dates', () => {
      const { formatDate } = useAdminCustomers()

      expect(formatDate(null)).toBe('-')
    })
  })
})
