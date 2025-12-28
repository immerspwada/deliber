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
  user_id?: string
  tracking_id: string
  amount: number
  payment_method: 'promptpay' | 'bank_transfer' | 'credit_card'
  payment_reference: string | null
  slip_url: string | null
  slip_image_url?: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'
  admin_note: string | null
  created_at: string
  updated_at: string
  approved_at?: string | null
  rejected_at?: string | null
  expires_at?: string | null
}

// =====================================================
// CUSTOMER WITHDRAWAL TYPES
// =====================================================
export interface CustomerBankAccount {
  id: string
  bank_code: string
  bank_name: string
  account_number: string
  account_name: string
  is_default: boolean
  is_verified: boolean
  created_at: string
}

export interface CustomerWithdrawal {
  id: string
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  transaction_ref: string | null
  failed_reason: string | null
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  created_at: string
  processed_at: string | null
}

// Thai banks list
export const THAI_BANKS = [
  { code: 'BBL', name: 'ธนาคารกรุงเทพ' },
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา' },
  { code: 'TMB', name: 'ธนาคารทหารไทยธนชาต' },
  { code: 'GSB', name: 'ธนาคารออมสิน' },
  { code: 'BAAC', name: 'ธนาคาร ธ.ก.ส.' },
  { code: 'CIMB', name: 'ธนาคารซีไอเอ็มบี' },
  { code: 'UOB', name: 'ธนาคารยูโอบี' },
  { code: 'LH', name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์' },
  { code: 'KK', name: 'ธนาคารเกียรตินาคินภัทร' }
]

export function useWallet() {
  const authStore = useAuthStore()
  const balance = ref<WalletBalance>({ balance: 0, total_earned: 0, total_spent: 0 })
  const transactions = ref<WalletTransaction[]>([])
  const topupRequests = ref<TopupRequest[]>([])
  const loading = ref(false)

  // =====================================================
  // CUSTOMER WITHDRAWAL STATE
  // =====================================================
  const bankAccounts = ref<CustomerBankAccount[]>([])
  const withdrawals = ref<CustomerWithdrawal[]>([])
  const withdrawalLoading = ref(false)

  // Fetch wallet balance
  // ใช้ RPC function ที่จะ auto-create wallet ถ้ายังไม่มี
  const fetchBalance = async () => {
    if (!authStore.user?.id) {
      console.warn('[Wallet] No authenticated user')
      balance.value = { balance: 0, total_earned: 0, total_spent: 0 }
      return balance.value
    }

    try {
      // ลองใช้ RPC function ก่อน (จะ auto-create wallet)
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_customer_wallet', {
        p_user_id: authStore.user.id
      })

      if (!rpcError && rpcData && rpcData.length > 0) {
        const walletData = rpcData[0]
        balance.value = {
          balance: walletData.balance || 0,
          total_earned: walletData.total_earned || 0,
          total_spent: walletData.total_spent || 0
        }
        return balance.value
      }

      // Fallback 1: Try simple function
      const { data: simpleData, error: simpleError } = await (supabase.rpc as any)('get_wallet_balance', {
        p_user_id: authStore.user.id
      })

      if (!simpleError && simpleData && simpleData.length > 0) {
        const walletData = simpleData[0]
        balance.value = {
          balance: Number(walletData.balance) || 0,
          total_earned: Number(walletData.total_earned) || 0,
          total_spent: Number(walletData.total_spent) || 0
        }
        return balance.value
      }

      // Fallback 2: query directly with maybeSingle()
      const { data, error } = await (supabase
        .from('user_wallets') as any)
        .select('balance, total_earned, total_spent')
        .eq('user_id', authStore.user.id)
        .maybeSingle()

      if (!error && data) {
        balance.value = {
          balance: Number(data.balance) || 0,
          total_earned: Number(data.total_earned) || 0,
          total_spent: Number(data.total_spent) || 0
        }
      } else if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for new users
        console.error('Error fetching wallet balance:', error)
        // ไม่มี wallet - ใช้ค่า default (user ใหม่)
        balance.value = { balance: 0, total_earned: 0, total_spent: 0 }
      } else {
        // ไม่มี wallet - ใช้ค่า default (user ใหม่)
        balance.value = { balance: 0, total_earned: 0, total_spent: 0 }
      }
      return balance.value
    } catch (err) {
      console.error('Error fetching wallet balance:', err)
      balance.value = { balance: 0, total_earned: 0, total_spent: 0 }
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
    // Get user ID from multiple sources
    let userId = authStore.session?.user?.id || authStore.user?.id
    
    // If still no userId, try to get it directly from Supabase
    if (!userId) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) userId = user.id
      } catch (err) {
        console.error('[Wallet] Error getting user from Supabase:', err)
      }
    }

    if (!userId) {
      console.warn('[Wallet] fetchTopupRequests: No user ID available')
      topupRequests.value = []
      return []
    }

    console.log('[Wallet] fetchTopupRequests for user:', userId)

    try {
      // PRIMARY: Use new function that accepts user_id parameter
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('get_topup_requests_by_user', {
        p_user_id: userId,
        p_limit: 20
      })

      console.log('[Wallet] get_topup_requests_by_user result:', { rpcData, rpcError })

      if (!rpcError && rpcData) {
        topupRequests.value = rpcData as TopupRequest[]
        return topupRequests.value
      }

      // FALLBACK 1: Try old function (uses auth.uid())
      const { data: oldRpcData, error: oldRpcError } = await (supabase.rpc as any)('get_customer_topup_requests', {
        p_limit: 20
      })

      if (!oldRpcError && oldRpcData && oldRpcData.length > 0) {
        topupRequests.value = oldRpcData as TopupRequest[]
        return topupRequests.value
      }

      // FALLBACK 2: Query directly
      const { data, error } = await (supabase
        .from('topup_requests') as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      console.log('[Wallet] Direct query result:', { data, error })

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
  // Enhanced debugging function
  const debugAuthState = () => {
    const debugInfo = {
      'authStore.isAuthenticated': authStore.isAuthenticated,
      'authStore.loading': authStore.loading,
      'authStore.user?.id': authStore.user?.id,
      'authStore.user?.email': authStore.user?.email,
      'authStore.session exists': !!authStore.session,
      'authStore.session?.user?.id': authStore.session?.user?.id,
      'supabase.auth.getUser()': 'checking...'
    }
    
    console.log('[Wallet Debug] Auth State:', debugInfo)
    
    // Also check Supabase auth directly
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      console.log('[Wallet Debug] Supabase getUser():', { user: user?.id, error })
    })
    
    return debugInfo
  }

  const createTopupRequest = async (
    amount: number,
    paymentMethod: 'promptpay' | 'bank_transfer' | 'credit_card',
    paymentReference?: string,
    slipUrl?: string
  ) => {
    // Enhanced debugging and validation
    console.log('[Wallet] createTopupRequest called with:', { amount, paymentMethod, paymentReference })

    // Wait for auth to be fully loaded if needed
    if (authStore.loading) {
      console.log('[Wallet] Auth still loading, waiting...')
      await new Promise(resolve => {
        const unwatch = authStore.$subscribe(() => {
          if (!authStore.loading) {
            unwatch()
            resolve(true)
          }
        })
        // Timeout after 3 seconds
        setTimeout(() => {
          unwatch()
          resolve(true)
        }, 3000)
      })
    }

    // Get user ID from multiple sources (prioritize session)
    let userId = authStore.session?.user?.id || authStore.user?.id

    // If still no userId, try to get it directly from Supabase
    if (!userId) {
      console.log('[Wallet] No userId found, checking Supabase directly...')
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (user && !error) {
          userId = user.id
          console.log('[Wallet] Got user ID from Supabase:', userId)
        } else {
          console.error('[Wallet] Supabase getUser error:', error)
        }
      } catch (err) {
        console.error('[Wallet] Exception getting user from Supabase:', err)
      }
    }

    if (!userId || amount <= 0) {
      console.error('[Wallet] Validation failed:', { userId, amount })
      return { success: false, message: !userId ? 'กรุณาเข้าสู่ระบบใหม่' : 'จำนวนเงินไม่ถูกต้อง' }
    }

    console.log('[Wallet] Using userId:', userId)

    try {
      // PRIMARY: Use create_simple_topup_request which accepts user_id parameter
      // This bypasses the auth.uid() issue
      const { data: simpleData, error: simpleError } = await (supabase.rpc as any)('create_simple_topup_request', {
        p_user_id: userId,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference || null,
        p_slip_url: slipUrl || null
      })

      console.log('[Wallet] create_simple_topup_request result:', { simpleData, simpleError })

      if (!simpleError && simpleData && simpleData.length > 0) {
        const result = simpleData[0]
        if (result.success) {
          await fetchTopupRequests()
          return {
            success: true,
            message: result.message,
            trackingId: result.tracking_id,
            data: { id: result.request_id }
          }
        } else {
          return { success: false, message: result.message }
        }
      }

      // Log the error for debugging
      if (simpleError) {
        console.error('[Wallet] create_simple_topup_request error:', simpleError)
      }

      // FALLBACK 1: Try customer_create_topup_request (uses auth.uid())
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('customer_create_topup_request', {
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference || null,
        p_slip_url: slipUrl || null
      })

      console.log('[Wallet] customer_create_topup_request result:', { rpcData, rpcError })

      if (!rpcError && rpcData && rpcData.length > 0) {
        const result = rpcData[0]
        if (result.success) {
          await fetchTopupRequests()
          return {
            success: true,
            message: result.message,
            trackingId: result.tracking_id,
            data: { id: result.request_id }
          }
        } else {
          return { success: false, message: result.message }
        }
      }

      // FALLBACK 2: Direct insert
      console.log('[Wallet] Trying direct insert...')
      const trackingId = `TOP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

      const { data, error } = await (supabase
        .from('topup_requests') as any)
        .insert({
          user_id: userId,
          tracking_id: trackingId,
          amount,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
          slip_url: slipUrl || null,
          slip_image_url: slipUrl || null,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('[Wallet] Direct insert error:', error)
        
        // Handle specific errors
        if (error.code === '42P01') {
          return { success: false, message: 'ระบบเติมเงินยังไม่พร้อมใช้งาน' }
        } else if (error.code === '23503') {
          return { success: false, message: 'ไม่พบข้อมูลผู้ใช้' }
        } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
          return { success: false, message: 'ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่' }
        }
        
        return { success: false, message: 'ไม่สามารถสร้างคำขอได้: ' + error.message }
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
      console.error('[Wallet] Error creating topup request:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  // Cancel topup request
  const cancelTopupRequest = async (requestId: string) => {
    if (!authStore.user?.id) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    try {
      // ลองใช้ RPC function ก่อน
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('customer_cancel_topup_request', {
        p_request_id: requestId
      })

      if (!rpcError && rpcData && rpcData.length > 0) {
        const result = rpcData[0]
        if (result.success) {
          await fetchTopupRequests()
        }
        return { success: result.success, message: result.message }
      }

      // Fallback: update directly
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

  // =====================================================
  // NEW: Payment & Refund Functions using RPC
  // =====================================================

  /**
   * Check wallet balance - ตรวจสอบยอดเงินคงเหลือ
   * @param requiredAmount - จำนวนเงินที่ต้องการตรวจสอบ (optional)
   */
  const checkWalletBalance = async (requiredAmount?: number) => {
    if (!authStore.user?.id) {
      return { hasSufficientBalance: false, currentBalance: 0, shortfall: requiredAmount || 0 }
    }

    try {
      const { data, error } = await (supabase.rpc as any)('check_wallet_balance', {
        p_user_id: authStore.user.id,
        p_required_amount: requiredAmount || 0
      })

      if (error) throw error

      if (data && data.length > 0) {
        return {
          hasSufficientBalance: data[0].has_sufficient_balance,
          currentBalance: Number(data[0].current_balance) || 0,
          shortfall: Number(data[0].shortfall) || 0
        }
      }

      return { hasSufficientBalance: false, currentBalance: 0, shortfall: requiredAmount || 0 }
    } catch (err) {
      console.error('Error checking wallet balance:', err)
      return { hasSufficientBalance: false, currentBalance: 0, shortfall: requiredAmount || 0 }
    }
  }

  /**
   * Pay from wallet - หักเงินจาก wallet พร้อมตรวจสอบยอดเงิน
   * @param amount - จำนวนเงินที่ต้องการหัก
   * @param description - รายละเอียดการชำระเงิน
   * @param referenceType - ประเภทอ้างอิง (เช่น 'ride_request', 'delivery_request')
   * @param referenceId - ID อ้างอิง
   */
  const payFromWallet = async (
    amount: number,
    description: string,
    referenceType?: string,
    referenceId?: string
  ) => {
    if (!authStore.user?.id || amount <= 0) {
      return { success: false, message: 'ข้อมูลไม่ถูกต้อง', transactionId: null, newBalance: 0 }
    }

    try {
      const { data, error } = await (supabase.rpc as any)('pay_from_wallet', {
        p_user_id: authStore.user.id,
        p_amount: amount,
        p_description: description,
        p_reference_type: referenceType || null,
        p_reference_id: referenceId || null
      })

      if (error) throw error

      if (data && data.length > 0) {
        const result = data[0]
        if (result.success) {
          await fetchBalance()
          await fetchTransactions()
        }
        return {
          success: result.success,
          message: result.message,
          transactionId: result.transaction_id,
          newBalance: Number(result.new_balance) || 0
        }
      }

      return { success: false, message: 'ไม่สามารถชำระเงินได้', transactionId: null, newBalance: 0 }
    } catch (err: any) {
      console.error('Error paying from wallet:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด', transactionId: null, newBalance: 0 }
    }
  }

  /**
   * Refund to wallet - คืนเงินเข้า wallet
   * @param amount - จำนวนเงินที่ต้องการคืน
   * @param description - รายละเอียดการคืนเงิน
   * @param referenceType - ประเภทอ้างอิง
   * @param referenceId - ID อ้างอิง
   */
  const refundToWallet = async (
    amount: number,
    description: string,
    referenceType?: string,
    referenceId?: string
  ) => {
    if (!authStore.user?.id || amount <= 0) {
      return { success: false, message: 'ข้อมูลไม่ถูกต้อง', transactionId: null, newBalance: 0 }
    }

    try {
      const { data, error } = await (supabase.rpc as any)('refund_to_wallet', {
        p_user_id: authStore.user.id,
        p_amount: amount,
        p_description: description,
        p_reference_type: referenceType || null,
        p_reference_id: referenceId || null
      })

      if (error) throw error

      if (data && data.length > 0) {
        const result = data[0]
        if (result.success) {
          await fetchBalance()
          await fetchTransactions()
        }
        return {
          success: result.success,
          message: result.message,
          transactionId: result.transaction_id,
          newBalance: Number(result.new_balance) || 0
        }
      }

      return { success: false, message: 'ไม่สามารถคืนเงินได้', transactionId: null, newBalance: 0 }
    } catch (err: any) {
      console.error('Error refunding to wallet:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด', transactionId: null, newBalance: 0 }
    }
  }

  /**
   * Process service payment - ชำระค่าบริการ (ride, delivery, shopping, queue, moving, laundry)
   * @param serviceType - ประเภทบริการ
   * @param serviceId - ID ของบริการ
   * @param amount - จำนวนเงิน
   */
  const processServicePayment = async (
    serviceType: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry',
    serviceId: string,
    amount: number
  ) => {
    if (!authStore.user?.id || amount <= 0) {
      return { success: false, message: 'ข้อมูลไม่ถูกต้อง', transactionId: null, newBalance: 0 }
    }

    try {
      const { data, error } = await (supabase.rpc as any)('process_service_payment', {
        p_user_id: authStore.user.id,
        p_service_type: serviceType,
        p_service_id: serviceId,
        p_amount: amount
      })

      if (error) throw error

      if (data && data.length > 0) {
        const result = data[0]
        if (result.success) {
          await fetchBalance()
          await fetchTransactions()
        }
        return {
          success: result.success,
          message: result.message,
          transactionId: result.transaction_id,
          newBalance: Number(result.new_balance) || 0
        }
      }

      return { success: false, message: 'ไม่สามารถชำระค่าบริการได้', transactionId: null, newBalance: 0 }
    } catch (err: any) {
      console.error('Error processing service payment:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด', transactionId: null, newBalance: 0 }
    }
  }

  /**
   * Process service refund - คืนเงินค่าบริการ (เมื่อยกเลิก)
   * @param serviceType - ประเภทบริการ
   * @param serviceId - ID ของบริการ
   * @param amount - จำนวนเงิน
   * @param reason - เหตุผลการคืนเงิน (optional)
   */
  const processServiceRefund = async (
    serviceType: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry',
    serviceId: string,
    amount: number,
    reason?: string
  ) => {
    if (!authStore.user?.id || amount <= 0) {
      return { success: false, message: 'ข้อมูลไม่ถูกต้อง', transactionId: null, newBalance: 0 }
    }

    try {
      const { data, error } = await (supabase.rpc as any)('process_service_refund', {
        p_user_id: authStore.user.id,
        p_service_type: serviceType,
        p_service_id: serviceId,
        p_amount: amount,
        p_reason: reason || null
      })

      if (error) throw error

      if (data && data.length > 0) {
        const result = data[0]
        if (result.success) {
          await fetchBalance()
          await fetchTransactions()
        }
        return {
          success: result.success,
          message: result.message,
          transactionId: result.transaction_id,
          newBalance: Number(result.new_balance) || 0
        }
      }

      return { success: false, message: 'ไม่สามารถคืนเงินได้', transactionId: null, newBalance: 0 }
    } catch (err: any) {
      console.error('Error processing service refund:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด', transactionId: null, newBalance: 0 }
    }
  }

  // =====================================================
  // CUSTOMER WITHDRAWAL FUNCTIONS
  // =====================================================

  /**
   * Fetch customer bank accounts
   */
  const fetchBankAccounts = async () => {
    const userId = authStore.session?.user?.id || authStore.user?.id
    if (!userId) {
      bankAccounts.value = []
      return []
    }

    withdrawalLoading.value = true
    try {
      const { data, error } = await (supabase.rpc as any)('get_customer_bank_accounts', {
        p_user_id: userId
      })

      if (error) throw error
      bankAccounts.value = data || []
      return bankAccounts.value
    } catch (err) {
      console.error('Error fetching bank accounts:', err)
      bankAccounts.value = []
      return []
    } finally {
      withdrawalLoading.value = false
    }
  }

  /**
   * Add a new bank account
   */
  const addBankAccount = async (
    bankCode: string,
    accountNumber: string,
    accountName: string,
    isDefault: boolean = false
  ) => {
    const userId = authStore.session?.user?.id || authStore.user?.id
    if (!userId) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    const bank = THAI_BANKS.find(b => b.code === bankCode)
    if (!bank) {
      return { success: false, message: 'ไม่พบธนาคารที่เลือก' }
    }

    withdrawalLoading.value = true
    try {
      const { data, error } = await (supabase.rpc as any)('add_customer_bank_account', {
        p_user_id: userId,
        p_bank_code: bankCode,
        p_bank_name: bank.name,
        p_account_number: accountNumber,
        p_account_name: accountName,
        p_is_default: isDefault
      })

      if (error) throw error

      if (data && data.length > 0 && data[0].success) {
        await fetchBankAccounts()
        return { success: true, message: data[0].message, accountId: data[0].account_id }
      }

      return { success: false, message: data?.[0]?.message || 'ไม่สามารถเพิ่มบัญชีได้' }
    } catch (err: any) {
      console.error('Error adding bank account:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    } finally {
      withdrawalLoading.value = false
    }
  }

  /**
   * Delete a bank account
   */
  const deleteBankAccount = async (accountId: string) => {
    const userId = authStore.session?.user?.id || authStore.user?.id
    if (!userId) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    withdrawalLoading.value = true
    try {
      const { data, error } = await (supabase.rpc as any)('delete_customer_bank_account', {
        p_user_id: userId,
        p_account_id: accountId
      })

      if (error) throw error

      if (data && data.length > 0 && data[0].success) {
        await fetchBankAccounts()
        return { success: true, message: data[0].message }
      }

      return { success: false, message: data?.[0]?.message || 'ไม่สามารถลบบัญชีได้' }
    } catch (err: any) {
      console.error('Error deleting bank account:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    } finally {
      withdrawalLoading.value = false
    }
  }

  /**
   * Fetch customer withdrawals
   */
  const fetchWithdrawals = async (limit: number = 50) => {
    const userId = authStore.session?.user?.id || authStore.user?.id
    if (!userId) {
      withdrawals.value = []
      return []
    }

    withdrawalLoading.value = true
    try {
      const { data, error } = await (supabase.rpc as any)('get_customer_withdrawals', {
        p_user_id: userId,
        p_limit: limit
      })

      if (error) throw error
      withdrawals.value = data || []
      return withdrawals.value
    } catch (err) {
      console.error('Error fetching withdrawals:', err)
      withdrawals.value = []
      return []
    } finally {
      withdrawalLoading.value = false
    }
  }

  /**
   * Request a withdrawal
   */
  const requestWithdrawal = async (bankAccountId: string, amount: number) => {
    const userId = authStore.session?.user?.id || authStore.user?.id
    if (!userId) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    if (amount < 100) {
      return { success: false, message: 'จำนวนเงินขั้นต่ำ 100 บาท' }
    }

    withdrawalLoading.value = true
    try {
      const { data, error } = await (supabase.rpc as any)('request_customer_withdrawal', {
        p_user_id: userId,
        p_bank_account_id: bankAccountId,
        p_amount: amount
      })

      if (error) throw error

      if (data && data.length > 0 && data[0].success) {
        await fetchWithdrawals()
        await fetchBalance()
        return { success: true, message: data[0].message, withdrawalId: data[0].withdrawal_id }
      }

      return { success: false, message: data?.[0]?.message || 'ไม่สามารถถอนเงินได้' }
    } catch (err: any) {
      console.error('Error requesting withdrawal:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    } finally {
      withdrawalLoading.value = false
    }
  }

  /**
   * Cancel a withdrawal request
   */
  const cancelWithdrawal = async (withdrawalId: string) => {
    const userId = authStore.session?.user?.id || authStore.user?.id
    if (!userId) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
    }

    withdrawalLoading.value = true
    try {
      const { data, error } = await (supabase.rpc as any)('cancel_customer_withdrawal', {
        p_user_id: userId,
        p_withdrawal_id: withdrawalId
      })

      if (error) throw error

      if (data && data.length > 0 && data[0].success) {
        await fetchWithdrawals()
        return { success: true, message: data[0].message }
      }

      return { success: false, message: data?.[0]?.message || 'ไม่สามารถยกเลิกได้' }
    } catch (err: any) {
      console.error('Error cancelling withdrawal:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    } finally {
      withdrawalLoading.value = false
    }
  }

  /**
   * Get pending withdrawal amount
   */
  const pendingWithdrawalAmount = computed(() => {
    return withdrawals.value
      .filter(w => w.status === 'pending' || w.status === 'processing')
      .reduce((sum, w) => sum + w.amount, 0)
  })

  /**
   * Get available balance for withdrawal (balance - pending withdrawals)
   */
  const availableForWithdrawal = computed(() => {
    return Math.max(0, balance.value.balance - pendingWithdrawalAmount.value)
  })

  /**
   * Format withdrawal status
   */
  const formatWithdrawalStatus = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      pending: { label: 'รอดำเนินการ', color: 'warning' },
      processing: { label: 'กำลังดำเนินการ', color: 'info' },
      completed: { label: 'สำเร็จ', color: 'success' },
      failed: { label: 'ไม่สำเร็จ', color: 'error' },
      cancelled: { label: 'ยกเลิกแล้ว', color: 'gray' }
    }
    return statuses[status] || { label: status, color: 'gray' }
  }

  /**
   * Subscribe to withdrawal changes
   */
  const subscribeToWithdrawals = () => {
    const userId = authStore.session?.user?.id || authStore.user?.id
    if (!userId) return { unsubscribe: () => {} }

    const channel = supabase
      .channel(`customer_withdrawals:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_withdrawals',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchWithdrawals()
          fetchBalance()
        }
      )
      .subscribe()

    return {
      unsubscribe: () => channel.unsubscribe()
    }
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
    isPositiveTransaction,
    // New payment/refund functions
    checkWalletBalance,
    payFromWallet,
    refundToWallet,
    processServicePayment,
    processServiceRefund,
    // Customer withdrawal functions
    bankAccounts,
    withdrawals,
    withdrawalLoading,
    pendingWithdrawalAmount,
    availableForWithdrawal,
    fetchBankAccounts,
    addBankAccount,
    deleteBankAccount,
    fetchWithdrawals,
    requestWithdrawal,
    cancelWithdrawal,
    formatWithdrawalStatus,
    subscribeToWithdrawals,
    THAI_BANKS,
    // Debug function
    debugAuthState
  }
}
