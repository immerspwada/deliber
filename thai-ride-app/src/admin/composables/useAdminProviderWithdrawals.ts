/**
 * useAdminProviderWithdrawals - Admin composable for Provider Withdrawals
 * 
 * Role: Admin only
 * Functions: admin_get_provider_withdrawals_v2, admin_approve_provider_withdrawal_v2, admin_reject_provider_withdrawal_v2
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../composables/useToast'

export interface ProviderWithdrawal {
  id: string
  withdrawal_uid: string
  provider_id: string
  provider_name: string
  provider_phone: string
  bank_name: string
  bank_account_number: string
  bank_account_name: string
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  admin_notes: string | null
  failed_reason: string | null
  transaction_ref: string | null
  created_at: string
  processed_at: string | null
}

export interface WithdrawalStats {
  total_pending: number
  total_pending_amount: number
  total_completed: number
  total_completed_amount: number
  total_failed: number
  today_completed: number
  today_completed_amount: number
}

export function useAdminProviderWithdrawals() {
  const { showSuccess, showError } = useToast()
  
  const loading = ref(false)
  const withdrawals = ref<ProviderWithdrawal[]>([])
  const stats = ref<WithdrawalStats | null>(null)
  const totalCount = ref(0)
  const error = ref<string | null>(null)

  // Computed
  const pendingWithdrawals = computed(() => 
    withdrawals.value.filter(w => w.status === 'pending' || w.status === 'processing')
  )

  // Fetch withdrawals
  async function fetchWithdrawals(
    status: string | null = null,
    limit = 50,
    offset = 0
  ): Promise<ProviderWithdrawal[]> {
    loading.value = true
    error.value = null
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('admin_get_provider_withdrawals_v2', {
        p_status: status,
        p_limit: limit,
        p_offset: offset
      })

      if (rpcError) throw rpcError
      withdrawals.value = data || []
      return withdrawals.value
    } catch (e) {
      error.value = (e as Error).message
      console.error('[AdminProviderWithdrawals] fetchWithdrawals error:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  // Fetch count
  async function fetchCount(status: string | null = null): Promise<number> {
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('admin_count_provider_withdrawals_v2', {
        p_status: status
      })

      if (rpcError) throw rpcError
      totalCount.value = data || 0
      return totalCount.value
    } catch (e) {
      console.error('[AdminProviderWithdrawals] fetchCount error:', e)
      return 0
    }
  }

  // Fetch stats
  async function fetchStats(): Promise<WithdrawalStats | null> {
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('admin_get_provider_withdrawal_stats_v2')

      if (rpcError) throw rpcError
      if (data && data.length > 0) {
        stats.value = data[0]
        return stats.value
      }
      return null
    } catch (e) {
      console.error('[AdminProviderWithdrawals] fetchStats error:', e)
      return null
    }
  }

  // Approve withdrawal
  async function approveWithdrawal(
    withdrawalId: string,
    transactionRef: string,
    adminNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('admin_approve_provider_withdrawal_v2', {
        p_withdrawal_id: withdrawalId,
        p_transaction_ref: transactionRef,
        p_admin_notes: adminNotes || null
      })

      if (rpcError) throw rpcError
      
      // Function returns JSON object directly
      if (data) {
        const result = typeof data === 'string' ? JSON.parse(data) : data
        if (result.success) {
          showSuccess(result.message || 'อนุมัติสำเร็จ')
          // Update local state
          const index = withdrawals.value.findIndex(w => w.id === withdrawalId)
          if (index !== -1) {
            withdrawals.value[index] = {
              ...withdrawals.value[index],
              status: 'completed',
              transaction_ref: transactionRef,
              admin_notes: adminNotes || null,
              processed_at: new Date().toISOString()
            }
          }
          return { success: true, message: result.message || 'อนุมัติสำเร็จ' }
        } else {
          showError(result.error || result.message || 'ไม่สามารถอนุมัติได้')
          return { success: false, message: result.error || result.message || 'ไม่สามารถอนุมัติได้' }
        }
      }
      
      return { success: false, message: 'ไม่สามารถอนุมัติได้' }
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
      showError(msg)
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  // Reject withdrawal
  async function rejectWithdrawal(
    withdrawalId: string,
    reason: string,
    adminNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('admin_reject_provider_withdrawal_v2', {
        p_withdrawal_id: withdrawalId,
        p_reason: reason,
        p_admin_notes: adminNotes || null
      })

      if (rpcError) throw rpcError
      
      // Function returns JSON object directly
      if (data) {
        const result = typeof data === 'string' ? JSON.parse(data) : data
        if (result.success) {
          showSuccess(result.message || 'ปฏิเสธสำเร็จ')
          // Update local state
          const index = withdrawals.value.findIndex(w => w.id === withdrawalId)
          if (index !== -1) {
            withdrawals.value[index] = {
              ...withdrawals.value[index],
              status: 'failed',
              failed_reason: reason,
              admin_notes: adminNotes || null,
              processed_at: new Date().toISOString()
            }
          }
          return { success: true, message: result.message || 'ปฏิเสธสำเร็จ' }
        } else {
          showError(result.error || result.message || 'ไม่สามารถปฏิเสธได้')
          return { success: false, message: result.error || result.message || 'ไม่สามารถปฏิเสธได้' }
        }
      }
      
      return { success: false, message: 'ไม่สามารถปฏิเสธได้' }
    } catch (e) {
      const msg = (e as Error).message
      error.value = msg
      showError(msg)
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  // Format helpers
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'รอดำเนินการ',
      processing: 'กำลังดำเนินการ',
      completed: 'อนุมัติแล้ว',
      failed: 'ปฏิเสธ',
      cancelled: 'ยกเลิก'
    }
    return labels[status] || status
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return {
    // State
    loading: readonly(loading),
    withdrawals: readonly(withdrawals),
    stats: readonly(stats),
    totalCount: readonly(totalCount),
    error: readonly(error),
    // Computed
    pendingWithdrawals,
    // Methods
    fetchWithdrawals,
    fetchCount,
    fetchStats,
    approveWithdrawal,
    rejectWithdrawal,
    // Helpers
    formatCurrency,
    formatDate,
    getStatusLabel,
    getStatusColor
  }
}
