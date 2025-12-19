/**
 * useWalletV2 - Complete Wallet System with Top-up Approval
 *
 * Feature: F05 - Wallet/Balance (Enhanced)
 * Tables: user_wallets, wallet_transactions, topup_requests
 *
 * Flow:
 * 1. Customer creates topup request (pending)
 * 2. Admin approves/rejects
 * 3. Money added to wallet on approval
 * 4. Auto-deduct when using services
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// =====================================================
// TYPES
// =====================================================

export interface WalletBalance {
  balance: number
  total_earned: number
  total_spent: number
}

export interface WalletTransaction {
  id: string
  type: 'topup' | 'payment' | 'refund' | 'cashback' | 'referral' | 'promo' | 'withdrawal'
  amount: number
  balance_before: number
  balance_after: number
  description: string | null
  reference_type: string | null
  reference_id: string | null
  status: string
  created_at: string
}

export interface TopupRequest {
  id: string
  tracking_id: string
  user_id: string
  amount: number
  payment_method: string
  payment_reference: string | null
  slip_image_url: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'
  admin_note: string | null
  created_at: string
  approved_at: string | null
  rejected_at: string | null
  expires_at: string
  // Joined fields
  user?: { name: string; email: string; phone: string }
}

export type PaymentMethod = 'promptpay' | 'bank_transfer' | 'credit_card' | 'truemoney'

// =====================================================
// COMPOSABLE
// =====================================================

export function useWalletV2() {
  const authStore = useAuthStore()
  
  // State
  const balance = ref<WalletBalance>({ balance: 0, total_earned: 0, total_spent: 0 })
  const transactions = ref<WalletTransaction[]>([])
  const topupRequests = ref<TopupRequest[]>([])
  const pendingTopups = ref<TopupRequest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const hasPendingTopup = computed(() => 
    topupRequests.value.some(r => r.status === 'pending')
  )
  
  const pendingTopupCount = computed(() => 
    topupRequests.value.filter(r => r.status === 'pending').length
  )

  const pendingTopupAmount = computed(() =>
    topupRequests.value
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0)
  )

  // =====================================================
  // CUSTOMER FUNCTIONS
  // =====================================================

  /**
   * Fetch wallet balance
   */
  const fetchBalance = async () => {
    if (!authStore.user?.id) {
      balance.value = { balance: 0, total_earned: 0, total_spent: 0 }
      return balance.value
    }

    try {
      const { data, error: err } = await (supabase
        .from('user_wallets') as any)
        .select('balance, total_earned, total_spent')
        .eq('user_id', authStore.user.id)
        .single()

      if (!err && data) {
        balance.value = {
          balance: data.balance || 0,
          total_earned: data.total_earned || 0,
          total_spent: data.total_spent || 0
        }
      }
      return balance.value
    } catch (err) {
      console.error('Error fetching wallet balance:', err)
      return balance.value
    }
  }

  /**
   * Fetch transaction history
   */
  const fetchTransactions = async (limit = 50) => {
    if (!authStore.user?.id) {
      transactions.value = []
      return []
    }

    loading.value = true
    try {
      const { data, error: err } = await (supabase
        .from('wallet_transactions') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!err && data) {
        transactions.value = data as WalletTransaction[]
      }
      return transactions.value
    } catch (err) {
      console.error('Error fetching transactions:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch user's topup requests
   */
  const fetchTopupRequests = async (limit = 20) => {
    if (!authStore.user?.id) {
      topupRequests.value = []
      return []
    }

    try {
      const { data, error: err } = await (supabase
        .from('topup_requests') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!err && data) {
        topupRequests.value = data as TopupRequest[]
      }
      return topupRequests.value
    } catch (err) {
      console.error('Error fetching topup requests:', err)
      return []
    }
  }

  /**
   * Create a new topup request
   */
  const createTopupRequest = async (
    amount: number,
    paymentMethod: PaymentMethod = 'promptpay',
    paymentReference?: string,
    slipImageUrl?: string
  ): Promise<{ success: boolean; message: string; trackingId?: string }> => {
    if (!authStore.user?.id) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    if (amount < 20) {
      return { success: false, message: 'จำนวนเงินขั้นต่ำ 20 บาท' }
    }

    if (amount > 50000) {
      return { success: false, message: 'จำนวนเงินสูงสุด 50,000 บาท' }
    }

    try {
      const { data, error: err } = await (supabase.rpc as any)('create_topup_request', {
        p_user_id: authStore.user.id,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference || null,
        p_slip_image_url: slipImageUrl || null
      })

      if (err) throw err

      if (data && data[0]) {
        const result = data[0]
        if (result.success) {
          await fetchTopupRequests()
          return { 
            success: true, 
            message: result.message,
            trackingId: result.tracking_id
          }
        }
        return { success: false, message: result.message }
      }

      return { success: false, message: 'เกิดข้อผิดพลาด' }
    } catch (err: any) {
      console.error('Error creating topup request:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  /**
   * Cancel a pending topup request
   */
  const cancelTopupRequest = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    if (!authStore.user?.id) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    try {
      const { data, error: err } = await (supabase.rpc as any)('cancel_topup_request', {
        p_request_id: requestId,
        p_user_id: authStore.user.id
      })

      if (err) throw err

      if (data && data[0]) {
        const result = data[0]
        if (result.success) {
          await fetchTopupRequests()
        }
        return { success: result.success, message: result.message }
      }

      return { success: false, message: 'เกิดข้อผิดพลาด' }
    } catch (err: any) {
      console.error('Error cancelling topup request:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  /**
   * Pay from wallet (for services)
   */
  const payFromWallet = async (
    amount: number,
    description: string,
    referenceType?: string,
    referenceId?: string
  ): Promise<{ success: boolean; message: string; newBalance?: number }> => {
    if (!authStore.user?.id) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    try {
      const { data, error: err } = await (supabase.rpc as any)('pay_from_wallet', {
        p_user_id: authStore.user.id,
        p_amount: amount,
        p_description: description,
        p_reference_type: referenceType || null,
        p_reference_id: referenceId || null
      })

      if (err) throw err

      if (data && data[0]) {
        const result = data[0]
        if (result.success) {
          await fetchBalance()
          await fetchTransactions()
        }
        return { 
          success: result.success, 
          message: result.message,
          newBalance: result.new_balance
        }
      }

      return { success: false, message: 'เกิดข้อผิดพลาด' }
    } catch (err: any) {
      console.error('Error paying from wallet:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  /**
   * Check if user has enough balance
   */
  const hasEnoughBalance = (amount: number): boolean => {
    return balance.value.balance >= amount
  }

  // =====================================================
  // ADMIN FUNCTIONS
  // =====================================================

  /**
   * Fetch all pending topup requests (Admin)
   */
  const fetchPendingTopups = async () => {
    try {
      const { data, error: err } = await (supabase
        .from('topup_requests') as any)
        .select('*, user:users(name, email, phone)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (!err && data) {
        pendingTopups.value = data as TopupRequest[]
      }
      return pendingTopups.value
    } catch (err) {
      console.error('Error fetching pending topups:', err)
      return []
    }
  }

  /**
   * Fetch all topup requests with filters (Admin)
   */
  const fetchAllTopupRequests = async (filters?: {
    status?: string
    startDate?: string
    endDate?: string
    limit?: number
  }) => {
    try {
      let query = (supabase
        .from('topup_requests') as any)
        .select('*, user:users(name, email, phone)')
        .order('created_at', { ascending: false })

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      query = query.limit(filters?.limit || 100)

      const { data, error: err } = await query

      if (err) throw err
      return data as TopupRequest[]
    } catch (err) {
      console.error('Error fetching all topup requests:', err)
      return []
    }
  }

  /**
   * Approve a topup request (Admin)
   */
  const approveTopup = async (
    requestId: string,
    adminNote?: string
  ): Promise<{ success: boolean; message: string; newBalance?: number }> => {
    if (!authStore.user?.id) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    try {
      const { data, error: err } = await (supabase.rpc as any)('approve_topup_request', {
        p_request_id: requestId,
        p_admin_id: authStore.user.id,
        p_admin_note: adminNote || null
      })

      if (err) throw err

      if (data && data[0]) {
        const result = data[0]
        if (result.success) {
          await fetchPendingTopups()
        }
        return { 
          success: result.success, 
          message: result.message,
          newBalance: result.new_balance
        }
      }

      return { success: false, message: 'เกิดข้อผิดพลาด' }
    } catch (err: any) {
      console.error('Error approving topup:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  /**
   * Reject a topup request (Admin)
   */
  const rejectTopup = async (
    requestId: string,
    adminNote: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!authStore.user?.id) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    if (!adminNote) {
      return { success: false, message: 'กรุณาระบุเหตุผล' }
    }

    try {
      const { data, error: err } = await (supabase.rpc as any)('reject_topup_request', {
        p_request_id: requestId,
        p_admin_id: authStore.user.id,
        p_admin_note: adminNote
      })

      if (err) throw err

      if (data && data[0]) {
        const result = data[0]
        if (result.success) {
          await fetchPendingTopups()
        }
        return { success: result.success, message: result.message }
      }

      return { success: false, message: 'เกิดข้อผิดพลาด' }
    } catch (err: any) {
      console.error('Error rejecting topup:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  /**
   * Get wallet admin stats
   */
  const getAdminStats = async () => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_wallet_admin_stats')

      if (err) throw err
      return data?.[0] || null
    } catch (err) {
      console.error('Error fetching admin stats:', err)
      return null
    }
  }

  // =====================================================
  // REALTIME SUBSCRIPTIONS
  // =====================================================

  /**
   * Subscribe to wallet changes
   */
  const subscribeToWallet = () => {
    if (!authStore.user?.id) return { unsubscribe: () => {} }

    const channel = supabase
      .channel(`wallet-v2:${authStore.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${authStore.user.id}`
        },
        () => {
          fetchBalance()
          fetchTransactions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topup_requests',
          filter: `user_id=eq.${authStore.user.id}`
        },
        () => {
          fetchTopupRequests()
          fetchBalance()
        }
      )
      .subscribe()

    return {
      unsubscribe: () => channel.unsubscribe()
    }
  }

  /**
   * Subscribe to pending topups (Admin)
   */
  const subscribeToPendingTopups = () => {
    const channel = supabase
      .channel('admin-pending-topups')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topup_requests'
        },
        () => {
          fetchPendingTopups()
        }
      )
      .subscribe()

    return {
      unsubscribe: () => channel.unsubscribe()
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  const getTransactionIcon = (type: string): string => {
    const icons: Record<string, string> = {
      topup: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
      payment: 'M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14',
      promo: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
      cashback: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
      refund: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
      referral: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      withdrawal: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
    }
    return icons[type] || 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }

  const formatTransactionType = (type: string): string => {
    const types: Record<string, string> = {
      topup: 'เติมเงิน',
      payment: 'ชำระเงิน',
      refund: 'คืนเงิน',
      cashback: 'เงินคืน',
      referral: 'โบนัสแนะนำ',
      promo: 'โปรโมชั่น',
      withdrawal: 'ถอนเงิน'
    }
    return types[type] || type
  }

  const formatTopupStatus = (status: string): { label: string; color: string } => {
    const statuses: Record<string, { label: string; color: string }> = {
      pending: { label: 'รอดำเนินการ', color: 'warning' },
      approved: { label: 'อนุมัติแล้ว', color: 'success' },
      rejected: { label: 'ปฏิเสธ', color: 'error' },
      cancelled: { label: 'ยกเลิก', color: 'gray' },
      expired: { label: 'หมดอายุ', color: 'gray' }
    }
    return statuses[status] || { label: status, color: 'gray' }
  }

  const formatPaymentMethod = (method: string): string => {
    const methods: Record<string, string> = {
      promptpay: 'พร้อมเพย์',
      bank_transfer: 'โอนเงิน',
      credit_card: 'บัตรเครดิต',
      truemoney: 'TrueMoney'
    }
    return methods[method] || method
  }

  const isPositiveTransaction = (type: string): boolean => {
    return ['topup', 'refund', 'cashback', 'referral', 'promo'].includes(type)
  }

  return {
    // State
    balance,
    transactions,
    topupRequests,
    pendingTopups,
    loading,
    error,
    
    // Computed
    hasPendingTopup,
    pendingTopupCount,
    pendingTopupAmount,
    
    // Customer functions
    fetchBalance,
    fetchTransactions,
    fetchTopupRequests,
    createTopupRequest,
    cancelTopupRequest,
    payFromWallet,
    hasEnoughBalance,
    
    // Admin functions
    fetchPendingTopups,
    fetchAllTopupRequests,
    approveTopup,
    rejectTopup,
    getAdminStats,
    
    // Subscriptions
    subscribeToWallet,
    subscribeToPendingTopups,
    
    // Helpers
    getTransactionIcon,
    formatTransactionType,
    formatTopupStatus,
    formatPaymentMethod,
    isPositiveTransaction
  }
}
