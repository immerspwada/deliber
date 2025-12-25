/**
 * useWallet - User Wallet Composable
 *
 * Feature: F05 - Wallet/Balance
 * Tables: user_wallets, wallet_transactions
 *
 * @syncs-with
 * - Admin: useAdmin.ts (ดูยอดเงิน, จัดการ refund)
 * - Provider: useProviderEarnings.ts (รับเงินจากงาน)
 * - Customer: stores/ride.ts (ชำระค่าบริการ)
 * - Database: Realtime subscription on wallet_transactions
 *
 * @transaction-types
 * - topup: เติมเงิน
 * - payment: ชำระค่าบริการ
 * - refund: คืนเงิน
 * - cashback: เงินคืน
 * - referral: โบนัสแนะนำเพื่อน
 * - withdrawal: ถอนเงิน (Provider)
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

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
  user_id: string
  tracking_id: string
  amount: number
  payment_method: 'promptpay' | 'bank_transfer' | 'credit_card'
  payment_reference: string | null
  slip_url: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'
  admin_note: string | null
  created_at: string
  updated_at: string
  processed_at: string | null
  processed_by: string | null
}

export function useWallet() {
  const authStore = useAuthStore()
  const balance = ref<WalletBalance>({ balance: 0, total_earned: 0, total_spent: 0 })
  const transactions = ref<WalletTransaction[]>([])
  const topupRequests = ref<TopupRequest[]>([])
  const loading = ref(false)

  // Fetch wallet balance
  // ใช้ maybeSingle() แทน single() เพื่อหลีกเลี่ยง 406 error เมื่อไม่มี wallet
  const fetchBalance = async () => {
    if (!authStore.user?.id) {
      balance.value = { balance: 0, total_earned: 0, total_spent: 0 }
      return balance.value
    }

    try {
      // ใช้ maybeSingle() - returns null ถ้าไม่พบ row (ไม่ throw 406)
      const { data, error } = await (supabase
        .from('user_wallets') as any)
        .select('balance, total_earned, total_spent')
        .eq('user_id', authStore.user.id)
        .maybeSingle()

      if (!error && data) {
        balance.value = {
          balance: data.balance || 0,
          total_earned: data.total_earned || 0,
          total_spent: data.total_spent || 0
        }
      } else {
        // ไม่มี wallet - ใช้ค่า default (user ใหม่)
        balance.value = { balance: 0, total_earned: 0, total_spent: 0 }
      }
      return balance.value
    } catch (err) {
      console.error('Error fetching wallet balance:', err)
      return balance.value
    }
  }

  // Fetch transactions
  const fetchTransactions = async (limit = 50) => {
    if (!authStore.user?.id) {
      transactions.value = []
      return []
    }

    loading.value = true
    try {
      const { data, error } = await (supabase
        .from('wallet_transactions') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && data) {
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

  // Top up wallet
  const topUp = async (amount: number, paymentMethod: string = 'promptpay') => {
    if (!authStore.user?.id || amount <= 0) return null

    try {
      // Call the database function to add transaction
      const { data, error } = await (supabase.rpc as any)('add_wallet_transaction', {
        p_user_id: authStore.user.id,
        p_type: 'topup',
        p_amount: amount,
        p_description: `เติมเงินผ่าน${paymentMethod === 'promptpay' ? 'พร้อมเพย์' : 'บัตรเครดิต'}`
      })

      if (!error && data) {
        // Refresh balance and transactions
        await fetchBalance()
        await fetchTransactions()
        return data
      }
      return null
    } catch (err) {
      console.error('Error topping up:', err)
      return null
    }
  }

  // Pay from wallet
  const pay = async (amount: number, description: string, referenceType?: string, referenceId?: string) => {
    if (!authStore.user?.id || amount <= 0) return null

    try {
      const { data, error } = await (supabase.rpc as any)('add_wallet_transaction', {
        p_user_id: authStore.user.id,
        p_type: 'payment',
        p_amount: amount,
        p_description: description,
        p_reference_type: referenceType || null,
        p_reference_id: referenceId || null
      })

      if (!error && data) {
        await fetchBalance()
        return data
      }
      return null
    } catch (err) {
      console.error('Error paying:', err)
      return null
    }
  }

  // Subscribe to wallet changes
  const subscribeToWallet = () => {
    if (!authStore.user?.id) return { unsubscribe: () => {} }

    const channel = supabase
      .channel(`wallet:${authStore.user.id}`)
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
      .subscribe()

    return {
      unsubscribe: () => channel.unsubscribe()
    }
  }

  // Get transaction icon path
  const getTransactionIcon = (type: string): string => {
    switch (type) {
      case 'topup': return 'M12 6v6m0 0v6m0-6h6m-6 0H6'
      case 'payment': return 'M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14'
      case 'promo': 
      case 'cashback': return 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
      case 'refund': return 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'
      case 'referral': return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
      case 'withdrawal': return 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
      default: return 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  }

  // Format transaction type
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

  // Fetch topup requests
  const fetchTopupRequests = async () => {
    if (!authStore.user?.id) {
      topupRequests.value = []
      return []
    }

    try {
      const { data, error } = await (supabase
        .from('topup_requests') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === 'PGRST204' || error.code === '42P01') {
          console.warn('topup_requests table not found, returning empty array')
          topupRequests.value = []
          return []
        }
        throw error
      }

      if (data) {
        topupRequests.value = data as TopupRequest[]
      }
      return topupRequests.value
    } catch (err) {
      console.error('Error fetching topup requests:', err)
      topupRequests.value = []
      return []
    }
  }

  // Create topup request
  const createTopupRequest = async (
    amount: number,
    paymentMethod: 'promptpay' | 'bank_transfer' | 'credit_card',
    paymentReference?: string,
    slipUrl?: string
  ) => {
    if (!authStore.user?.id || amount <= 0) {
      return { success: false, message: 'ข้อมูลไม่ถูกต้อง' }
    }

    try {
      // Generate tracking ID
      const trackingId = `TOP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

      const { data, error } = await (supabase
        .from('topup_requests') as any)
        .insert({
          user_id: authStore.user.id,
          tracking_id: trackingId,
          amount,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
          slip_url: slipUrl || null,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating topup request:', error)
        return { success: false, message: 'ไม่สามารถสร้างคำขอได้' }
      }

      // Refresh topup requests
      await fetchTopupRequests()

      return {
        success: true,
        message: 'สร้างคำขอเติมเงินสำเร็จ',
        trackingId,
        data
      }
    } catch (err: any) {
      console.error('Error creating topup request:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  // Cancel topup request
  const cancelTopupRequest = async (requestId: string) => {
    if (!authStore.user?.id) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    try {
      const { error } = await (supabase
        .from('topup_requests') as any)
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('user_id', authStore.user.id)
        .eq('status', 'pending')

      if (error) {
        console.error('Error cancelling topup request:', error)
        return { success: false, message: 'ไม่สามารถยกเลิกได้' }
      }

      // Refresh topup requests
      await fetchTopupRequests()

      return { success: true, message: 'ยกเลิกคำขอสำเร็จ' }
    } catch (err: any) {
      console.error('Error cancelling topup request:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  // Computed: Has pending topup
  const hasPendingTopup = computed(() => {
    return topupRequests.value.some(r => r.status === 'pending')
  })

  // Computed: Pending topup amount
  const pendingTopupAmount = computed(() => {
    return topupRequests.value
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0)
  })

  // Format topup status
  const formatTopupStatus = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      pending: { label: 'รอดำเนินการ', color: 'warning' },
      approved: { label: 'อนุมัติแล้ว', color: 'success' },
      rejected: { label: 'ปฏิเสธ', color: 'error' },
      cancelled: { label: 'ยกเลิกแล้ว', color: 'gray' },
      expired: { label: 'หมดอายุ', color: 'gray' }
    }
    return statuses[status] || { label: status, color: 'gray' }
  }

  // Format payment method
  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      promptpay: 'พร้อมเพย์',
      bank_transfer: 'โอนเงินผ่านธนาคาร',
      credit_card: 'บัตรเครดิต'
    }
    return methods[method] || method
  }

  // Check if transaction is positive (adds money)
  const isPositiveTransaction = (type: string) => {
    return ['topup', 'refund', 'cashback', 'referral', 'promo'].includes(type)
  }

  return {
    balance,
    transactions,
    topupRequests,
    loading,
    hasPendingTopup,
    pendingTopupAmount,
    fetchBalance,
    fetchTransactions,
    fetchTopupRequests,
    createTopupRequest,
    cancelTopupRequest,
    topUp,
    pay,
    subscribeToWallet,
    getTransactionIcon,
    formatTransactionType,
    formatTopupStatus,
    formatPaymentMethod,
    isPositiveTransaction
  }
}
