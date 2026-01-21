/**
 * useCustomerWithdrawals - Admin Customer Withdrawals Management
 * Feature: F05 - Customer Withdrawal System (Admin Side)
 * 
 * Admin functions:
 * 1. ดูรายการคำขอถอนเงินลูกค้า
 * 2. อนุมัติ/ปฏิเสธคำขอ
 * 3. ดูสถิติการถอนเงิน
 * 4. ติดตามสถานะ
 */
import { ref, computed } from 'vue'
import { supabase } from '../../lib/supabase'

export interface CustomerWithdrawal {
  id: string
  withdrawal_uid: string
  user_id: string
  user_name: string
  user_email: string
  user_phone: string
  amount: number
  bank_name: string
  bank_account_number: string
  bank_account_name: string
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled'
  reason: string | null
  admin_notes: string | null
  processed_by: string | null
  processed_by_name: string | null
  processed_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface WithdrawalStats {
  total_count: number
  total_amount: number
  pending_count: number
  pending_amount: number
  approved_count: number
  approved_amount: number
  completed_count: number
  completed_amount: number
  rejected_count: number
  rejected_amount: number
  today_count: number
  today_amount: number
}

export default function useCustomerWithdrawals() {
  const withdrawals = ref<CustomerWithdrawal[]>([])
  const stats = ref<WithdrawalStats>({
    total_count: 0,
    total_amount: 0,
    pending_count: 0,
    pending_amount: 0,
    approved_count: 0,
    approved_amount: 0,
    completed_count: 0,
    completed_amount: 0,
    rejected_count: 0,
    rejected_amount: 0,
    today_count: 0,
    today_amount: 0
  })
  const loading = ref(false)
  const totalCount = ref(0)

  // Computed
  const pendingWithdrawals = computed(() => 
    withdrawals.value.filter(w => w.status === 'pending')
  )

  const approvedWithdrawals = computed(() => 
    withdrawals.value.filter(w => w.status === 'approved')
  )

  /**
   * Fetch customer withdrawals with filters
   */
  const fetchWithdrawals = async (
    status?: string,
    limit: number = 20,
    offset: number = 0
  ) => {
    loading.value = true
    try {
      const { data, error } = await (supabase.rpc as any)('admin_get_customer_withdrawals', {
        p_status: status || null,
        p_limit: limit,
        p_offset: offset
      })

      if (error) {
        console.error('[CustomerWithdrawals] Error fetching withdrawals:', error)
        throw error
      }

      withdrawals.value = data || []
      return withdrawals.value
    } catch (err) {
      console.error('[CustomerWithdrawals] fetchWithdrawals error:', err)
      withdrawals.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get total count of withdrawals
   */
  const fetchWithdrawalsCount = async (status?: string) => {
    try {
      const { data, error } = await (supabase.rpc as any)('admin_count_customer_withdrawals', {
        p_status: status || null
      })

      if (error) throw error
      totalCount.value = data || 0
      return totalCount.value
    } catch (err) {
      console.error('[CustomerWithdrawals] fetchWithdrawalsCount error:', err)
      totalCount.value = 0
      return 0
    }
  }

  /**
   * Get withdrawal statistics
   */
  const fetchStats = async () => {
    try {
      // Get counts and amounts for each status
      const statuses = ['pending', 'approved', 'completed', 'rejected']
      const promises = statuses.map(async (status) => {
        const { data: countData } = await (supabase.rpc as any)('admin_count_customer_withdrawals', {
          p_status: status
        })
        
        // Get sum of amounts for this status
        const { data: sumData } = await supabase
          .from('customer_withdrawals')
          .select('amount')
          .eq('status', status)
        
        const amount = sumData?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0
        
        return { status, count: countData || 0, amount }
      })

      const results = await Promise.all(promises)
      
      // Get today's stats
      const today = new Date().toISOString().split('T')[0]
      const { data: todayData } = await supabase
        .from('customer_withdrawals')
        .select('amount')
        .gte('created_at', today + 'T00:00:00.000Z')
        .lt('created_at', today + 'T23:59:59.999Z')

      const todayCount = todayData?.length || 0
      const todayAmount = todayData?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0

      // Get total stats
      const { data: totalData } = await (supabase.rpc as any)('admin_count_customer_withdrawals')
      const { data: totalAmountData } = await supabase
        .from('customer_withdrawals')
        .select('amount')

      const totalCount = totalData || 0
      const totalAmount = totalAmountData?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0

      // Build stats object
      const newStats: WithdrawalStats = {
        total_count: totalCount,
        total_amount: totalAmount,
        pending_count: 0,
        pending_amount: 0,
        approved_count: 0,
        approved_amount: 0,
        completed_count: 0,
        completed_amount: 0,
        rejected_count: 0,
        rejected_amount: 0,
        today_count: todayCount,
        today_amount: todayAmount
      }

      // Fill in status-specific stats
      results.forEach(({ status, count, amount }) => {
        switch (status) {
          case 'pending':
            newStats.pending_count = count
            newStats.pending_amount = amount
            break
          case 'approved':
            newStats.approved_count = count
            newStats.approved_amount = amount
            break
          case 'completed':
            newStats.completed_count = count
            newStats.completed_amount = amount
            break
          case 'rejected':
            newStats.rejected_count = count
            newStats.rejected_amount = amount
            break
        }
      })

      stats.value = newStats
      return stats.value
    } catch (err) {
      console.error('[CustomerWithdrawals] fetchStats error:', err)
      return stats.value
    }
  }

  /**
   * Process withdrawal (approve, reject, complete)
   */
  const processWithdrawal = async (
    withdrawalId: string,
    action: 'approve' | 'reject' | 'complete',
    reason?: string,
    adminNotes?: string
  ) => {
    try {
      console.log('[CustomerWithdrawals] Processing withdrawal:', { withdrawalId, action, reason, adminNotes })

      const { data, error } = await (supabase.rpc as any)('admin_process_withdrawal', {
        p_withdrawal_id: withdrawalId,
        p_action: action,
        p_reason: reason || null,
        p_admin_notes: adminNotes || null
      })

      if (error) {
        console.error('[CustomerWithdrawals] Process withdrawal error:', error)
        throw error
      }

      console.log('[CustomerWithdrawals] Process withdrawal result:', data)

      if (data && data.length > 0) {
        const result = data[0]
        if (!result.success) {
          throw new Error(result.message || 'การดำเนินการไม่สำเร็จ')
        }
        return { success: true, message: result.message }
      }

      return { success: true, message: 'ดำเนินการสำเร็จ' }
    } catch (err: any) {
      console.error('[CustomerWithdrawals] processWithdrawal error:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  /**
   * Approve withdrawal
   */
  const approveWithdrawal = async (
    withdrawalId: string,
    adminNotes?: string
  ) => {
    return processWithdrawal(withdrawalId, 'approve', undefined, adminNotes)
  }

  /**
   * Reject withdrawal
   */
  const rejectWithdrawal = async (
    withdrawalId: string,
    reason: string,
    adminNotes?: string
  ) => {
    return processWithdrawal(withdrawalId, 'reject', reason, adminNotes)
  }

  /**
   * Complete withdrawal (mark as transferred)
   */
  const completeWithdrawal = async (
    withdrawalId: string,
    adminNotes?: string
  ) => {
    return processWithdrawal(withdrawalId, 'complete', undefined, adminNotes)
  }

  /**
   * Get withdrawal by ID
   */
  const getWithdrawal = async (withdrawalId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_withdrawals')
        .select(`
          *,
          users!customer_withdrawals_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone_number,
            member_uid
          ),
          processed_by_user:users!customer_withdrawals_processed_by_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', withdrawalId)
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('[CustomerWithdrawals] getWithdrawal error:', err)
      return null
    }
  }

  /**
   * Subscribe to withdrawal changes
   */
  const subscribeToWithdrawals = () => {
    const channel = supabase
      .channel('admin_customer_withdrawals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_withdrawals'
        },
        (payload) => {
          console.log('[CustomerWithdrawals] Realtime update:', payload)
          // Refresh data when changes occur
          fetchWithdrawals()
          fetchStats()
        }
      )
      .subscribe()

    return {
      unsubscribe: () => channel.unsubscribe()
    }
  }

  /**
   * Format currency
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  /**
   * Format date
   */
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Get status color
   */
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      approved: '#3B82F6',
      completed: '#10B981',
      rejected: '#EF4444',
      cancelled: '#6B7280'
    }
    return colors[status] || '#6B7280'
  }

  /**
   * Get status label
   */
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'รอดำเนินการ',
      approved: 'อนุมัติแล้ว',
      completed: 'โอนแล้ว',
      rejected: 'ปฏิเสธ',
      cancelled: 'ยกเลิกแล้ว'
    }
    return labels[status] || status
  }

  return {
    // State
    withdrawals,
    stats,
    loading,
    totalCount,
    // Computed
    pendingWithdrawals,
    approvedWithdrawals,
    // Methods
    fetchWithdrawals,
    fetchWithdrawalsCount,
    fetchStats,
    processWithdrawal,
    approveWithdrawal,
    rejectWithdrawal,
    completeWithdrawal,
    getWithdrawal,
    subscribeToWithdrawals,
    // Helpers
    formatCurrency,
    formatDate,
    getStatusColor,
    getStatusLabel
  }
}