/**
 * useAdminCustomers - Admin composable for Customer Management
 * 
 * Role: Admin only
 * Functions: get_admin_customers, count_admin_customers
 * 
 * Features:
 * - Fetch customers with search and filters
 * - Suspend/unsuspend customers
 * - Pagination support
 * - Error handling with useErrorHandler
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabase'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'
import { 
  CustomerSuspensionSchema, 
  CustomerUnsuspensionSchema,
  validateInput 
} from '@/admin/schemas/validation'
import { useAuditLog } from '@/admin/composables/useAuditLog'

export interface AdminCustomer {
  id: string
  email: string
  phone: string
  phone_number: string // Alias for phone
  full_name: string
  status: 'active' | 'suspended' | 'banned'
  suspension_reason: string | null // Match database column name
  suspended_reason: string | null // Alias for backward compatibility
  suspended_at: string | null
  suspended_by: string | null
  created_at: string
  wallet_balance: number
  total_rides: number
  total_orders: number // Alias for total_rides
  total_spent: number
  total_topup: number
  average_rating: number | null
}

export interface CustomerFilters {
  searchTerm?: string | null
  status?: 'active' | 'suspended' | 'banned' | null
  limit?: number
  offset?: number
}

export function useAdminCustomers() {
  const { handle: handleError } = useErrorHandler()
  const { success: showSuccess, error: showError } = useToast()
  const { logCustomerSuspension, logCustomerUnsuspension } = useAuditLog()

  const loading = ref(false)
  const customers = ref<AdminCustomer[]>([])
  const totalCount = ref(0)
  const error = ref<string | null>(null)

  // Computed
  const activeCustomers = computed(() =>
    customers.value.filter(c => c.status === 'active')
  )

  const suspendedCustomers = computed(() =>
    customers.value.filter(c => c.status === 'suspended')
  )

  const bannedCustomers = computed(() =>
    customers.value.filter(c => c.status === 'banned')
  )

  /**
   * Fetch customers with filters and pagination
   */
  async function fetchCustomers(filters: CustomerFilters = {}): Promise<AdminCustomer[]> {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_customers', {
        p_search: filters.searchTerm || null,
        p_status: filters.status || null,
        p_limit: filters.limit || 20,
        p_offset: filters.offset || 0
      })

      if (rpcError) throw rpcError

      customers.value = data || []
      return customers.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch customers'
      error.value = message
      handleError(err, 'useAdminCustomers.fetchCustomers')
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch total count of customers for pagination
   */
  async function fetchCount(filters: Omit<CustomerFilters, 'limit' | 'offset'> = {}): Promise<number> {
    try {
      const { data, error: rpcError } = await supabase.rpc('count_admin_customers', {
        p_search: filters.searchTerm || null,
        p_status: filters.status || null
      })

      if (rpcError) throw rpcError

      totalCount.value = data || 0
      return totalCount.value
    } catch (err) {
      handleError(err, 'useAdminCustomers.fetchCount')
      return 0
    }
  }

  /**
   * Get status color (hex color)
   */
  function getStatusColorHex(status: string): string {
    const colors: Record<string, string> = {
      active: '#059669',
      suspended: '#EF4444',
      banned: '#DC2626'
    }
    return colors[status] || '#6B7280'
  }

  /**
   * Suspend a customer
   */
  async function suspendCustomer(
    customerId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    error.value = null

    try {
      // Trim reason first
      const trimmedReason = reason.trim()
      
      // Log input for debugging
      console.log('[suspendCustomer] Input:', { 
        customerId, 
        reason, 
        reasonLength: reason.length,
        trimmedReason,
        trimmedReasonLength: trimmedReason.length 
      })

      // Validate input with trimmed reason
      const validation = validateInput(CustomerSuspensionSchema, { 
        customerId: customerId, 
        reason: trimmedReason 
      })
      
      if (!validation.success) {
        const errorMessage = Object.values(validation.errors).join(', ')
        console.error('[suspendCustomer] Validation failed:', validation.errors)
        showError(errorMessage)
        return { success: false, message: errorMessage }
      }

      console.log('[suspendCustomer] Validation passed, calling RPC...')

      // Call RPC function with trimmed reason
      const { data, error: rpcError } = await supabase.rpc('suspend_customer_account', {
        p_customer_id: customerId,
        p_reason: trimmedReason
      })

      if (rpcError) {
        console.error('[suspendCustomer] RPC error:', rpcError)
        throw rpcError
      }

      console.log('[suspendCustomer] RPC success, logging audit...')

      // Log audit trail
      await logCustomerSuspension(customerId, trimmedReason)

      showSuccess('ระงับบัญชีลูกค้าสำเร็จ')

      // Update local state
      const index = customers.value.findIndex(c => c.id === customerId)
      if (index !== -1) {
        customers.value[index] = {
          ...customers.value[index],
          status: 'suspended',
          suspended_reason: trimmedReason,
          suspension_reason: trimmedReason
        }
      }

      return { success: true, message: 'ระงับบัญชีลูกค้าสำเร็จ' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to suspend customer'
      error.value = message
      console.error('[suspendCustomer] Error:', err)
      handleError(err, 'useAdminCustomers.suspendCustomer')
      
      // Show more specific error message
      if (message.includes('Unauthorized')) {
        showError('คุณไม่มีสิทธิ์ระงับบัญชีลูกค้า')
      } else if (message.includes('not found')) {
        showError('ไม่พบข้อมูลลูกค้า')
      } else {
        showError(`ไม่สามารถระงับบัญชีลูกค้าได้: ${message}`)
      }
      
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Unsuspend a customer (reactivate)
   */
  async function unsuspendCustomer(
    customerId: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    error.value = null

    try {
      // Validate input
      const validation = validateInput(CustomerUnsuspensionSchema, { customerId })
      if (!validation.success) {
        const errorMessage = Object.values(validation.errors).join(', ')
        showError(errorMessage)
        return { success: false, message: errorMessage }
      }

      // Call RPC function
      const { data, error: rpcError } = await supabase.rpc('unsuspend_customer_account', {
        p_customer_id: customerId
      })

      if (rpcError) throw rpcError

      // Log audit trail
      await logCustomerUnsuspension(customerId)

      showSuccess('ยกเลิกการระงับบัญชีสำเร็จ')

      // Update local state
      const index = customers.value.findIndex(c => c.id === customerId)
      if (index !== -1) {
        customers.value[index] = {
          ...customers.value[index],
          status: 'active',
          suspended_reason: null
        }
      }

      return { success: true, message: 'ยกเลิกการระงับบัญชีสำเร็จ' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unsuspend customer'
      error.value = message
      handleError(err, 'useAdminCustomers.unsuspendCustomer')
      showError('ไม่สามารถยกเลิกการระงับบัญชีได้')
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Format currency for display
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date for display
   */
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Get status label in Thai
   */
  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'ใช้งานปกติ',
      suspended: 'ระงับการใช้งาน',
      banned: 'แบนถาวร'
    }
    return labels[status] || status
  }

  /**
   * Get status color class (Tailwind)
   */
  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      banned: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return {
    // State
    loading: readonly(loading),
    customers: readonly(customers),
    totalCount: readonly(totalCount),
    error: readonly(error),

    // Computed
    activeCustomers,
    suspendedCustomers,
    bannedCustomers,

    // Methods
    fetchCustomers,
    fetchCount,
    suspendCustomer,
    unsuspendCustomer,

    // Helpers
    formatCurrency,
    formatDate,
    getStatusLabel,
    getStatusColor,
    getStatusColorHex
  }
}
