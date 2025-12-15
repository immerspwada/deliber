import { ref } from 'vue'
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

export function useWallet() {
  const authStore = useAuthStore()
  const balance = ref<WalletBalance>({ balance: 0, total_earned: 0, total_spent: 0 })
  const transactions = ref<WalletTransaction[]>([])
  const loading = ref(false)

  // Fetch wallet balance
  const fetchBalance = async () => {
    if (!authStore.user?.id) {
      balance.value = { balance: 0, total_earned: 0, total_spent: 0 }
      return balance.value
    }

    try {
      const { data, error } = await (supabase
        .from('user_wallets') as any)
        .select('balance, total_earned, total_spent')
        .eq('user_id', authStore.user.id)
        .single()

      if (!error && data) {
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

  return {
    balance,
    transactions,
    loading,
    fetchBalance,
    fetchTransactions,
    topUp,
    pay,
    subscribeToWallet,
    getTransactionIcon,
    formatTransactionType
  }
}
