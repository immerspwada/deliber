/**
 * useAdminWithdrawals - Admin composable for Provider Withdrawal Management
 * 
 * Role: Admin only
 * Functions: get_provider_withdrawals_admin, count_provider_withdrawals_admin
 * 
 * Features:
 * - Fetch provider withdrawal requests with filters
 * - Approve/reject withdrawal requests
 * - Pagination support
 * - Error handling with useErrorHandler
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabase'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'

export interface ProviderWithdrawal {
  id: string
  provider_id: string
  provider_name: string
  provider_phone: string
  provider_email: string
  amount: number
  bank_account: string
  bank_name: string
  account_holder: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requested_at: string
  processed_at: string | null
  processed_by: string | null
  rejection_reason: string | null
  transaction_id: string | null
  wallet_balance: number
  total_earnings: number
}

export interface WithdrawalFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'completed' | null
  limit?: number
  offset?: number
}

export function useAdminWithdrawals() {
  const { handle: handleError } = useErrorHandler()
  const { showSuccess, showError } = useToast()

  const loading = ref(false)
  const withdrawals = ref<ProviderWithdrawal[]>([])
  const totalCount = ref(0)
  const error = ref<string | null>(null)

  // Computed
  const pendingWithdrawals = computed(() =>
    withdrawals.value.filter(w => w.status === 'pending')
  )

  const approvedWithdrawals = computed(() =>
    withdrawals.value.filter(w => w.status === 'approved')
  )

  const rejectedWithdrawals = computed(() =>
    withdrawals.value.filter(w => w.status === 'rejected')
  )

  const completedWithdrawals = computed(() =>
    withdrawals.value.filter(w => w.status === 'completed')
  )

  const totalPendingAmount = computed(() =>
    pendingWithdrawals.value.reduce((sum, w) => sum + w.amount, 0)
  )

  /**
   * Fetch withdrawal requests with filters and pagination
   */
  async function fetchWithdrawals(filters: WithdrawalFilters = {}): Promise<ProviderWithdrawal[]> {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('get_provider_withdrawals_admin', {
        p_status: filters.status || null,
        p_limit: filters.limit || 20,
        p_offset: filters.offset || 0
      })

      if (rpcError) throw rpcError

      withdrawals.value = data || []
      return withdrawals.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch withdrawals'
      error.value = message
      handleError(err, 'useAdminWithdrawals.fetchWithdrawals')
      showError('ไม่สามารถโหลดข้อมูลคำขอถอนเงินได้')
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch total count of withdrawal requests for pagination
   */
  async function fetchCount(filters: Omit<WithdrawalFilters, 'limit' | 'offset'> = {}): Promise<number> {
    try {
      const { data, error: rpcError } = await supabase.rpc('count_provider_withdrawals_admin', {
        p_status: filters.status || null
      })

      if (rpcError) throw rpcError

      totalCount.value = data || 0
      return totalCount.value
    } catch (err) {
      handleError(err, 'useAdminWithdrawals.fetchCount')
      return 0
    }
  }

  /**
   * Approve a withdrawal request
   */
  async function approveWithdrawal(
    withdrawalId: string,
    transactionId: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    error.value = null

    try {
      const currentUser = await supabase.auth.getUser()
      const adminId = currentUser.data.user?.id

      // Update withdrawal status
      const { error: updateError } = await supabase
        .from('provider_withdrawals')
        .update({
          status: 'approved',
          transaction_id: transactionId,
          processed_at: new Date().toISOString(),
          processed_by: adminId
        })
        .eq('id', withdrawalId)

      if (updateError) throw updateError

      showSuccess('อนุมัติคำขอถอนเงินสำเร็จ')

      // Update local state
      const index = withdrawals.value.findIndex(w => w.id === withdrawalId)
      if (index !== -1) {
        withdrawals.value[index] = {
          ...withdrawals.value[index],
          status: 'approved',
          transaction_id: transactionId,
          processed_at: new Date().toISOString(),
          processed_by: adminId || null
        }
      }

      return { success: true, message: 'อนุมัติคำขอถอนเงินสำเร็จ' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve withdrawal'
      error.value = message
      handleError(err, 'useAdminWithdrawals.approveWithdrawal')
      showError('ไม่สามารถอนุมัติคำขอถอนเงินได้')
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Reject a withdrawal request
   */
  async function rejectWithdrawal(
    withdrawalId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    error.value = null

    try {
      const currentUser = await supabase.auth.getUser()
      const adminId = currentUser.data.user?.id

      // Update withdrawal status
      const { error: updateError } = await supabase
        .from('provider_withdrawals')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          processed_at: new Date().toISOString(),
          processed_by: adminId
        })
        .eq('id', withdrawalId)

      if (updateError) throw updateError

      showSuccess('ปฏิเสธคำขอถอนเงินสำเร็จ')

      // Update local state
      const index = withdrawals.value.findIndex(w => w.id === withdrawalId)
      if (index !== -1) {
        withdrawals.value[index] = {
          ...withdrawals.value[index],
          status: 'rejected',
          rejection_reason: reason,
          processed_at: new Date().toISOString(),
          processed_by: adminId || null
        }
      }

      return { success: true, message: 'ปฏิเสธคำขอถอนเงินสำเร็จ' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject withdrawal'
      error.value = message
      handleError(err, 'useAdminWithdrawals.rejectWithdrawal')
      showError('ไม่สามารถปฏิเสธคำขอถอนเงินได้')
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
      rejected: 'ปฏิเสธ',
      completed: 'เสร็จสิ้น'
    }
    return labels[status] || status
  }

  /**
   * Get status color class
   */
  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  /**
   * Mask bank account number for display
   */
  function maskBankAccount(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber
    const lastFour = accountNumber.slice(-4)
    const masked = 'X'.repeat(accountNumber.length - 4)
    return masked + lastFour
  }

  return {
    // State
    loading: readonly(loading),
    withdrawals: readonly(withdrawals),
    totalCount: readonly(totalCount),
    error: readonly(error),

    // Computed
    pendingWithdrawals,
    approvedWithdrawals,
    rejectedWithdrawals,
    completedWithdrawals,
    totalPendingAmount,

    // Methods
    fetchWithdrawals,
    fetchCount,
    approveWithdrawal,
    rejectWithdrawal,

    // Helpers
    formatCurrency,
    formatDate,
    getStatusLabel,
    getStatusColor,
    maskBankAccount
  }
}
