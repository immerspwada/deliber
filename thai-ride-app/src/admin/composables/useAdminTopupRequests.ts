/**
 * useAdminTopupRequests - Admin composable for Customer Topup Request Management
 * 
 * Role: Admin only
 * Functions: get_topup_requests_admin, count_topup_requests_admin
 * 
 * Features:
 * - Fetch customer topup requests with filters
 * - Approve/reject topup requests
 * - Pagination support
 * - Error handling with useErrorHandler
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabase'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'

export interface TopupRequest {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_phone: string
  amount: number
  payment_method: string
  payment_reference: string
  payment_proof_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  processed_at: string | null
  processed_by: string | null
  rejection_reason: string | null
  wallet_balance: number
}

export interface TopupFilters {
  status?: 'pending' | 'approved' | 'rejected' | null
  limit?: number
  offset?: number
}

export function useAdminTopupRequests() {
  const { handle: handleError } = useErrorHandler()
  const { showSuccess, showError } = useToast()

  const loading = ref(false)
  const topupRequests = ref<TopupRequest[]>([])
  const totalCount = ref(0)
  const error = ref<string | null>(null)

  // Computed
  const pendingRequests = computed(() =>
    topupRequests.value.filter(t => t.status === 'pending')
  )

  const approvedRequests = computed(() =>
    topupRequests.value.filter(t => t.status === 'approved')
  )

  const rejectedRequests = computed(() =>
    topupRequests.value.filter(t => t.status === 'rejected')
  )

  const totalPendingAmount = computed(() =>
    pendingRequests.value.reduce((sum, t) => sum + t.amount, 0)
  )

  /**
   * Fetch topup requests with filters and pagination
   */
  async function fetchTopupRequests(filters: TopupFilters = {}): Promise<TopupRequest[]> {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('get_topup_requests_admin', {
        p_status: filters.status || null,
        p_limit: filters.limit || 20,
        p_offset: filters.offset || 0
      })

      if (rpcError) throw rpcError

      topupRequests.value = data || []
      return topupRequests.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch topup requests'
      error.value = message
      handleError(err, 'useAdminTopupRequests.fetchTopupRequests')
      showError('ไม่สามารถโหลดข้อมูลคำขอเติมเงินได้')
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch total count of topup requests for pagination
   */
  async function fetchCount(filters: Omit<TopupFilters, 'limit' | 'offset'> = {}): Promise<number> {
    try {
      const { data, error: rpcError } = await supabase.rpc('count_topup_requests_admin', {
        p_status: filters.status || null
      })

      if (rpcError) throw rpcError

      totalCount.value = data || 0
      return totalCount.value
    } catch (err) {
      handleError(err, 'useAdminTopupRequests.fetchCount')
      return 0
    }
  }

  /**
   * Approve a topup request
   */
  async function approveTopup(
    topupId: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    error.value = null

    try {
      const currentUser = await supabase.auth.getUser()
      const adminId = currentUser.data.user?.id

      if (!adminId) {
        throw new Error('Admin user not found')
      }

      // Use the approve_topup_request RPC function
      const { data, error: rpcError } = await supabase.rpc('approve_topup_request', {
        p_request_id: topupId,
        p_admin_id: adminId,
        p_admin_note: null
      })

      if (rpcError) throw rpcError

      if (!data || data.length === 0 || !data[0].success) {
        throw new Error(data?.[0]?.message || 'Failed to approve topup')
      }

      showSuccess('อนุมัติคำขอเติมเงินสำเร็จ')

      // Update local state
      const index = topupRequests.value.findIndex(t => t.id === topupId)
      if (index !== -1) {
        topupRequests.value[index] = {
          ...topupRequests.value[index],
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: adminId
        }
      }

      return { success: true, message: 'อนุมัติคำขอเติมเงินสำเร็จ' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve topup'
      error.value = message
      handleError(err, 'useAdminTopupRequests.approveTopup')
      showError('ไม่สามารถอนุมัติคำขอเติมเงินได้')
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Reject a topup request
   */
  async function rejectTopup(
    topupId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    error.value = null

    try {
      const currentUser = await supabase.auth.getUser()
      const adminId = currentUser.data.user?.id

      if (!adminId) {
        throw new Error('Admin user not found')
      }

      // Use the reject_topup_request RPC function
      const { data, error: rpcError } = await supabase.rpc('reject_topup_request', {
        p_request_id: topupId,
        p_admin_id: adminId,
        p_admin_note: reason
      })

      if (rpcError) throw rpcError

      if (!data || data.length === 0 || !data[0].success) {
        throw new Error(data?.[0]?.message || 'Failed to reject topup')
      }

      showSuccess('ปฏิเสธคำขอเติมเงินสำเร็จ')

      // Update local state
      const index = topupRequests.value.findIndex(t => t.id === topupId)
      if (index !== -1) {
        topupRequests.value[index] = {
          ...topupRequests.value[index],
          status: 'rejected',
          rejection_reason: reason,
          processed_at: new Date().toISOString(),
          processed_by: adminId
        }
      }

      return { success: true, message: 'ปฏิเสธคำขอเติมเงินสำเร็จ' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject topup'
      error.value = message
      handleError(err, 'useAdminTopupRequests.rejectTopup')
      showError('ไม่สามารถปฏิเสธคำขอเติมเงินได้')
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
      pending: 'รอดำเนินการ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ'
    }
    return labels[status] || status
  }

  /**
   * Get status color class
   */
  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  /**
   * Get payment method label in Thai
   */
  function getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      bank_transfer: 'โอนเงินผ่านธนาคาร',
      promptpay: 'พร้อมเพย์',
      mobile_banking: 'แอปธนาคาร',
      cash: 'เงินสด',
      other: 'อื่นๆ'
    }
    return labels[method] || method
  }

  return {
    // State
    loading: readonly(loading),
    topupRequests: readonly(topupRequests),
    totalCount: readonly(totalCount),
    error: readonly(error),

    // Computed
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    totalPendingAmount,

    // Methods
    fetchTopupRequests,
    fetchCount,
    approveTopup,
    rejectTopup,

    // Helpers
    formatCurrency,
    formatDate,
    getStatusLabel,
    getStatusColor,
    getPaymentMethodLabel
  }
}
