/**
 * Wallet Store - Centralized State Management
 * High-Performance Implementation with Caching & Optimization
 * SECURITY & PERFORMANCE FIXES APPLIED
 */
import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { withErrorHandling, ErrorCode, createAppError } from '@/utils/errorHandler'

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
  amount: number
  payment_method: 'promptpay' | 'bank_transfer' | 'credit_card'
  payment_reference: string | null
  slip_url: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'
  admin_note: string | null
  created_at: string
  updated_at: string
}

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
  reserved_at: string | null
  released_at: string | null
  created_at: string
  processed_at: string | null
}

export interface PaymentReceivingAccount {
  id: string
  account_type: 'promptpay' | 'bank_transfer'
  account_name: string
  account_number: string
  bank_code: string | null
  bank_name: string | null
  qr_code_url: string | null
  display_name: string | null
  description: string | null
}

// =====================================================
// MEMOIZED FORMATTERS (Created once)
// =====================================================
const moneyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const dateFormatter = new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'short',
  timeStyle: 'short'
})

// =====================================================
// STORE DEFINITION
// =====================================================
export const useWalletStore = defineStore('wallet', () => {
  // =====================================================
  // STATE
  // =====================================================
  const balance = ref<WalletBalance>({ balance: 0, total_earned: 0, total_spent: 0 })
  const transactions = shallowRef<WalletTransaction[]>([]) // Use shallowRef for arrays
  const topupRequests = shallowRef<TopupRequest[]>([])
  const bankAccounts = shallowRef<CustomerBankAccount[]>([])
  const withdrawals = shallowRef<CustomerWithdrawal[]>([])
  const paymentAccounts = shallowRef<PaymentReceivingAccount[]>([])
  
  const loading = ref(false)
  const isInitialized = ref(false)
  
  // Realtime subscriptions
  let walletChannel: RealtimeChannel | null = null
  let withdrawalChannel: RealtimeChannel | null = null
  
  // Request deduplication
  let fetchBalancePromise: Promise<WalletBalance> | null = null
  let fetchTransactionsPromise: Promise<WalletTransaction[]> | null = null

  // =====================================================
  // GETTERS (Memoized)
  // =====================================================
  const formattedBalance = computed(() => moneyFormatter.format(balance.value.balance))
  const formattedEarned = computed(() => moneyFormatter.format(balance.value.total_earned))
  const formattedSpent = computed(() => moneyFormatter.format(balance.value.total_spent))

  const pendingTopupCount = computed(() => 
    topupRequests.value.filter(r => r.status === 'pending').length
  )

  const pendingTopupAmount = computed(() =>
    topupRequests.value
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0)
  )

  const pendingWithdrawalAmount = computed(() =>
    withdrawals.value
      .filter(w => w.status === 'pending' || w.status === 'processing')
      .reduce((sum, w) => sum + w.amount, 0)
  )

  const availableForWithdrawal = computed(() =>
    Math.max(0, balance.value.balance - pendingWithdrawalAmount.value)
  )

  const hasPendingTopup = computed(() => pendingTopupCount.value > 0)

  // =====================================================
  // ACTIONS - Balance (PERFORMANCE & SECURITY FIXES)
  // =====================================================
  const fetchBalance = async (): Promise<WalletBalance> => {
    // PERFORMANCE FIX: Request deduplication with proper error handling
    if (fetchBalancePromise) {
      try {
        return await fetchBalancePromise
      } catch (error) {
        // If shared promise fails, clear it and retry
        fetchBalancePromise = null
        return await fetchBalance()
      }
    }

    fetchBalancePromise = _fetchBalance()
    try {
      return await fetchBalancePromise
    } catch (error) {
      console.error('[WalletStore] fetchBalance failed:', error)
      throw error
    } finally {
      fetchBalancePromise = null
    }
  }

  const _fetchBalance = async (): Promise<WalletBalance> => {
    try {
      console.log('[WalletStore] fetchBalance: Getting user...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('[WalletStore] fetchBalance: Auth error:', authError)
        const emptyBalance = { balance: 0, total_earned: 0, total_spent: 0 }
        balance.value = emptyBalance
        // Clear all data on auth error
        transactions.value = []
        topupRequests.value = []
        return emptyBalance
      }
      
      if (!user) {
        console.warn('[WalletStore] fetchBalance: No user authenticated')
        const emptyBalance = { balance: 0, total_earned: 0, total_spent: 0 }
        balance.value = emptyBalance
        // Clear all data when no user
        transactions.value = []
        topupRequests.value = []
        return emptyBalance
      }

      console.log('[WalletStore] fetchBalance: User ID:', user.id)
      
      // SECURITY FIX: Ensure wallet exists before fetching balance
      const { error: ensureError } = await supabase.rpc('ensure_user_wallet', {
        p_user_id: user.id
      })
      
      if (ensureError) {
        console.error('[WalletStore] fetchBalance: Failed to ensure wallet:', ensureError)
      }
      
      console.log('[WalletStore] fetchBalance: Calling get_customer_wallet RPC...')
      
      const { data, error } = await supabase.rpc('get_customer_wallet', {
        p_user_id: user.id
      })

      console.log('[WalletStore] fetchBalance: RPC response:', { data, error })

      if (error) {
        console.error('[WalletStore] fetchBalance: RPC error:', error)
        const emptyBalance = { balance: 0, total_earned: 0, total_spent: 0 }
        balance.value = emptyBalance
        return emptyBalance
      }

      // CRITICAL FIX: RPC returns array, get first element
      const walletData = Array.isArray(data) ? data[0] : data
      
      if (!walletData) {
        console.warn('[WalletStore] fetchBalance: No wallet data returned')
        const emptyBalance = { balance: 0, total_earned: 0, total_spent: 0 }
        balance.value = emptyBalance
        return emptyBalance
      }

      console.log('[WalletStore] fetchBalance: Wallet data:', walletData)

      // PERFORMANCE FIX: Validate and normalize data
      const walletBalance: WalletBalance = {
        balance: Number(walletData.balance || 0),
        total_earned: Number(walletData.total_earned || 0),
        total_spent: Number(walletData.total_spent || 0)
      }

      console.log('[WalletStore] fetchBalance: Parsed wallet balance:', walletBalance)

      balance.value = walletBalance
      isInitialized.value = true
      
      console.log('[WalletStore] fetchBalance: Updated balance.value:', balance.value)
      
      return walletBalance

    } catch (error) {
      console.error('[WalletStore] fetchBalance: Unexpected error:', error)
      const emptyBalance = { balance: 0, total_earned: 0, total_spent: 0 }
      balance.value = emptyBalance
      return emptyBalance
    }
  }

  // =====================================================
  // ACTIONS - Transactions
  // =====================================================
  const fetchTransactions = async (limit = 50): Promise<WalletTransaction[]> => {
    // Request deduplication
    if (fetchTransactionsPromise) return fetchTransactionsPromise

    fetchTransactionsPromise = _fetchTransactions(limit)
    try {
      return await fetchTransactionsPromise
    } finally {
      fetchTransactionsPromise = null
    }
  }

  const _fetchTransactions = async (limit: number): Promise<WalletTransaction[]> => {
    loading.value = true
    try {
      console.log('[WalletStore] fetchTransactions: Getting user...')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('[WalletStore] fetchTransactions: Auth error:', authError)
        transactions.value = []
        return []
      }
      
      if (!user) {
        console.warn('[WalletStore] fetchTransactions: No user authenticated')
        transactions.value = []
        return []
      }

      console.log('[WalletStore] fetchTransactions: User ID:', user.id)
      console.log('[WalletStore] fetchTransactions: Querying wallet_transactions...')

      const { data, error, count } = await supabase
        .from('wallet_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      console.log('[WalletStore] fetchTransactions: Query response:', { 
        dataLength: data?.length, 
        count,
        error,
        sampleData: data?.[0],
        userId: user.id // Log user ID to verify
      })

      if (error) {
        console.error('[WalletStore] fetchTransactions: Query error:', error)
        transactions.value = []
        return []
      }

      if (!data) {
        console.warn('[WalletStore] fetchTransactions: No data returned')
        transactions.value = []
        return []
      }

      // CRITICAL: Verify all transactions belong to current user
      const invalidTransactions = data.filter(txn => txn.user_id !== user.id)
      if (invalidTransactions.length > 0) {
        console.error('[WalletStore] fetchTransactions: SECURITY ISSUE - Found transactions for different user!', {
          currentUserId: user.id,
          invalidTransactions
        })
        transactions.value = []
        return []
      }

      transactions.value = data as WalletTransaction[]
      console.log('[WalletStore] fetchTransactions: Updated transactions state:', {
        count: transactions.value.length,
        sample: transactions.value[0]
      })

      return transactions.value
    } catch (err) {
      console.error('[WalletStore] fetchTransactions: Exception:', err)
      console.error('[WalletStore] fetchTransactions: Exception details:', {
        message: err instanceof Error ? err.message : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      })
      transactions.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  // =====================================================
  // ACTIONS - Topup
  // =====================================================
  const fetchTopupRequests = async (): Promise<TopupRequest[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        topupRequests.value = []
        return []
      }

      const { data, error } = await supabase.rpc('get_topup_requests_by_user', {
        p_user_id: user.id,
        p_limit: 20
      })

      if (!error && data) {
        topupRequests.value = data as TopupRequest[]
      } else {
        topupRequests.value = []
      }

      return topupRequests.value
    } catch (err) {
      console.error('[WalletStore] Error fetching topup requests:', err)
      topupRequests.value = []
      return []
    }
  }

  const createTopupRequest = async (
    amount: number,
    paymentMethod: 'promptpay' | 'bank_transfer' | 'credit_card',
    paymentReference?: string,
    slipUrl?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || amount <= 0) {
        return { success: false, message: !user ? 'กรุณาเข้าสู่ระบบใหม่' : 'จำนวนเงินไม่ถูกต้อง' }
      }

      const { data, error } = await supabase.rpc('create_simple_topup_request', {
        p_user_id: user.id,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference || null,
        p_slip_url: slipUrl || null
      })

      if (!error && data && data.length > 0) {
        const result = data[0]
        if (result.success) {
          await fetchTopupRequests()
          return {
            success: true,
            message: result.message,
            trackingId: result.tracking_id,
            data: { id: result.request_id }
          }
        }
        return { success: false, message: result.message }
      }

      return { success: false, message: 'ไม่สามารถสร้างคำขอได้' }
    } catch (err: any) {
      console.error('[WalletStore] Error creating topup request:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  // =====================================================
  // ACTIONS - Bank Accounts
  // =====================================================
  const fetchBankAccounts = async (): Promise<CustomerBankAccount[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        bankAccounts.value = []
        return []
      }

      const { data, error } = await supabase.rpc('get_customer_bank_accounts', {
        p_user_id: user.id
      })

      if (!error && data) {
        bankAccounts.value = data as CustomerBankAccount[]
      } else {
        bankAccounts.value = []
      }

      return bankAccounts.value
    } catch (err) {
      console.error('[WalletStore] Error fetching bank accounts:', err)
      bankAccounts.value = []
      return []
    }
  }

  const addBankAccount = async (
    bankCode: string,
    accountNumber: string,
    accountName: string,
    isDefault = false
  ) => {
    try {
      console.log('[WalletStore] addBankAccount: Starting...')
      console.log('[WalletStore] addBankAccount: Input:', { bankCode, accountNumber, accountName, isDefault })
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('[WalletStore] addBankAccount: Auth error:', authError)
        return { success: false, message: 'ไม่สามารถตรวจสอบสิทธิ์ได้' }
      }
      
      if (!user) {
        console.warn('[WalletStore] addBankAccount: No user')
        return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
      }

      console.log('[WalletStore] addBankAccount: User ID:', user.id)
      
      const bankName = getBankName(bankCode)
      console.log('[WalletStore] addBankAccount: Bank name:', bankName)
      
      const rpcParams = {
        p_user_id: user.id,
        p_bank_code: bankCode,
        p_bank_name: bankName,
        p_account_number: accountNumber,
        p_account_name: accountName,
        p_is_default: isDefault
      }
      console.log('[WalletStore] addBankAccount: RPC params:', rpcParams)

      const { data, error } = await supabase.rpc('add_customer_bank_account', rpcParams)

      console.log('[WalletStore] addBankAccount: RPC response:', { data, error })

      if (error) {
        console.error('[WalletStore] addBankAccount: RPC error:', error)
        console.error('[WalletStore] addBankAccount: Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return { success: false, message: `เกิดข้อผิดพลาด: ${error.message}` }
      }

      if (!data || data.length === 0) {
        console.error('[WalletStore] addBankAccount: No data returned')
        return { success: false, message: 'ไม่ได้รับข้อมูลจากเซิร์ฟเวอร์' }
      }

      const result = data[0]
      console.log('[WalletStore] addBankAccount: Result:', result)

      if (result.success) {
        console.log('[WalletStore] addBankAccount: Success! Fetching updated bank accounts...')
        await fetchBankAccounts()
        return { success: true, message: result.message, accountId: result.account_id }
      }

      console.warn('[WalletStore] addBankAccount: Function returned success=false:', result.message)
      return { success: false, message: result.message || 'ไม่สามารถเพิ่มบัญชีได้' }
    } catch (err: any) {
      console.error('[WalletStore] addBankAccount: Exception:', err)
      console.error('[WalletStore] addBankAccount: Exception details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  // =====================================================
  // ACTIONS - Withdrawals
  // =====================================================
  const fetchWithdrawals = async (limit = 50): Promise<CustomerWithdrawal[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        withdrawals.value = []
        return []
      }

      const { data, error } = await supabase.rpc('get_customer_withdrawals', {
        p_user_id: user.id,
        p_limit: limit
      })

      if (!error && data) {
        withdrawals.value = data as CustomerWithdrawal[]
      } else {
        withdrawals.value = []
      }

      return withdrawals.value
    } catch (err) {
      console.error('[WalletStore] Error fetching withdrawals:', err)
      withdrawals.value = []
      return []
    }
  }

  const requestWithdrawal = async (bankAccountId: string | null, amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
      }

      // Validate bank account ID
      if (!bankAccountId) {
        return { success: false, message: 'กรุณาเลือกบัญชีธนาคารที่ต้องการถอนเงิน' }
      }

      if (amount < 100) {
        return { success: false, message: 'จำนวนเงินขั้นต่ำ 100 บาท' }
      }

      const { data, error } = await supabase.rpc('request_customer_withdrawal', {
        p_user_id: user.id,
        p_bank_account_id: bankAccountId,
        p_amount: amount
      })

      if (error) {
        console.error('[WalletStore] RPC error:', error)
        return { success: false, message: error.message || 'ไม่สามารถถอนเงินได้' }
      }

      if (!error && data && data.length > 0 && data[0].success) {
        await Promise.all([fetchWithdrawals(), fetchBalance()])
        return { success: true, message: data[0].message, withdrawalId: data[0].withdrawal_id }
      }

      return { success: false, message: data?.[0]?.message || 'ไม่สามารถถอนเงินได้' }
    } catch (err: any) {
      console.error('[WalletStore] Error requesting withdrawal:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  const cancelWithdrawal = async (withdrawalId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, message: 'กรุณาเข้าสู่ระบบ' }
      }

      const { data, error } = await supabase.rpc('cancel_customer_withdrawal', {
        p_user_id: user.id,
        p_withdrawal_id: withdrawalId
      })

      if (!error && data && data.length > 0 && data[0].success) {
        await Promise.all([fetchWithdrawals(), fetchBalance()])
        return { success: true, message: data[0].message }
      }

      return { success: false, message: data?.[0]?.message || 'ไม่สามารถยกเลิกได้' }
    } catch (err: any) {
      console.error('[WalletStore] Error cancelling withdrawal:', err)
      return { success: false, message: err.message || 'เกิดข้อผิดพลาด' }
    }
  }

  // =====================================================
  // ACTIONS - Payment Accounts
  // =====================================================
  const fetchPaymentAccounts = async (accountType?: 'promptpay' | 'bank_transfer'): Promise<PaymentReceivingAccount[]> => {
    try {
      const { data, error } = await supabase.rpc('get_payment_receiving_accounts', {
        p_account_type: accountType || null
      })

      if (!error && data) {
        paymentAccounts.value = data as PaymentReceivingAccount[]
      } else {
        paymentAccounts.value = []
      }

      return paymentAccounts.value
    } catch (err) {
      console.error('[WalletStore] Error fetching payment accounts:', err)
      paymentAccounts.value = []
      return []
    }
  }

  // =====================================================
  // REALTIME SUBSCRIPTIONS
  // =====================================================
  const subscribeToWallet = () => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      walletChannel = supabase
        .channel(`wallet:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallet_transactions',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchBalance()
            fetchTransactions()
          }
        )
        .subscribe()
    })
  }

  const subscribeToWithdrawals = () => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      withdrawalChannel = supabase
        .channel(`customer_withdrawals:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'customer_withdrawals',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchWithdrawals()
            fetchBalance()
          }
        )
        .subscribe()
    })
  }

  const unsubscribeAll = () => {
    if (walletChannel) {
      walletChannel.unsubscribe()
      walletChannel = null
    }
    if (withdrawalChannel) {
      withdrawalChannel.unsubscribe()
      withdrawalChannel = null
    }
  }

  // =====================================================
  // UTILITIES
  // =====================================================
  const formatMoney = (amount: number): string => moneyFormatter.format(amount)
  const formatDate = (dateStr: string): string => dateFormatter.format(new Date(dateStr))

  const getBankName = (code: string): string => {
    const banks: Record<string, string> = {
      BBL: 'ธนาคารกรุงเทพ',
      KBANK: 'ธนาคารกสิกรไทย',
      KTB: 'ธนาคารกรุงไทย',
      SCB: 'ธนาคารไทยพาณิชย์',
      BAY: 'ธนาคารกรุงศรีอยุธยา',
      TMB: 'ธนาคารทหารไทยธนชาต'
    }
    return banks[code] || code
  }

  // =====================================================
  // RESET
  // =====================================================
  const $reset = () => {
    balance.value = { balance: 0, total_earned: 0, total_spent: 0 }
    transactions.value = []
    topupRequests.value = []
    bankAccounts.value = []
    withdrawals.value = []
    paymentAccounts.value = []
    loading.value = false
    isInitialized.value = false
    unsubscribeAll()
  }

  return {
    // State
    balance,
    transactions,
    topupRequests,
    bankAccounts,
    withdrawals,
    paymentAccounts,
    loading,
    isInitialized,

    // Getters
    formattedBalance,
    formattedEarned,
    formattedSpent,
    pendingTopupCount,
    pendingTopupAmount,
    pendingWithdrawalAmount,
    availableForWithdrawal,
    hasPendingTopup,

    // Actions
    fetchBalance,
    fetchTransactions,
    fetchTopupRequests,
    createTopupRequest,
    fetchBankAccounts,
    addBankAccount,
    fetchWithdrawals,
    requestWithdrawal,
    cancelWithdrawal,
    fetchPaymentAccounts,
    subscribeToWallet,
    subscribeToWithdrawals,
    unsubscribeAll,

    // Utilities
    formatMoney,
    formatDate,

    // Reset
    $reset
  }
})
