/**
 * useWalletBalance - Real-time Wallet Balance Composable
 * 
 * Features:
 * - Real-time wallet balance updates
 * - Automatic refresh on transactions
 * - Balance validation
 * - Formatted display
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useWalletBalance() {
  const authStore = useAuthStore()
  const balance = ref<number>(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let channel: RealtimeChannel | null = null
  
  // 🔥 CRITICAL DEBUG: Log initial state
  console.log('🚀 [useWalletBalance] Composable initialized')
  console.log('   Initial balance:', balance.value)
  console.log('   Auth store exists:', !!authStore)
  console.log('   Auth user:', authStore.user?.email || 'null')
  console.log('   Auth user ID:', authStore.user?.id || 'null')

  // Formatted balance
  const formattedBalance = computed(() => {
    const formatted = new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(balance.value)
    
    console.log('💰 [useWalletBalance] formattedBalance computed:', {
      rawBalance: balance.value,
      formatted: formatted
    })
    
    return formatted
  })

  // Check if balance is sufficient
  const hasSufficientBalance = (amount: number): boolean => {
    return balance.value >= amount
  }

  // Get balance difference
  const getBalanceDifference = (amount: number): number => {
    return amount - balance.value
  }

  // Fetch current balance with retry logic
  // ✅ FIXED: Use RPC function to match walletStore (single source of truth)
  const fetchBalance = async (retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 2
    
    if (!authStore.user?.id) {
      console.log('⚠️ [useWalletBalance] No user ID, setting balance to 0')
      console.log('   Auth store user:', authStore.user)
      console.log('   Auth store authenticated:', authStore.isAuthenticated)
      balance.value = 0
      return
    }

    loading.value = true
    error.value = null

    try {
      console.log(`🔍 [useWalletBalance] Fetching wallet balance (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`)
      console.log('   User ID:', authStore.user.id)
      console.log('   Email:', authStore.user.email)
      console.log('   Method: RPC get_customer_wallet (matches walletStore)')
      
      // ✅ Use RPC function to ensure consistency with walletStore
      const { data, error: rpcError } = await (supabase
        .rpc('get_customer_wallet', {
          p_user_id: authStore.user.id
        }) as any)
        .single()

      if (rpcError) {
        console.error('❌ [useWalletBalance] RPC error:', rpcError)
        
        // Retry on timeout or network errors
        if (retryCount < MAX_RETRIES && 
            (rpcError.message.includes('timeout') || rpcError.message.includes('network'))) {
          console.log(`🔄 [useWalletBalance] Retrying... (${retryCount + 1}/${MAX_RETRIES})`)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
          return fetchBalance(retryCount + 1)
        }
        
        throw rpcError
      }

      if (!data) {
        console.error('❌ [useWalletBalance] No data returned from RPC')
        throw new Error('No wallet data found')
      }

      console.log('📦 [useWalletBalance] Raw wallet data from RPC:', data)
      console.log('   Balance:', data?.balance)
      console.log('   Type:', typeof data?.balance)

      // Parse balance from RPC response
      const walletBalance = data?.balance
      if (walletBalance === null || walletBalance === undefined) {
        balance.value = 0
        console.log('⚠️ [useWalletBalance] balance is null/undefined, setting to 0')
      } else if (typeof walletBalance === 'string') {
        const parsed = parseFloat(walletBalance)
        if (isNaN(parsed)) {
          console.error('❌ [useWalletBalance] Failed to parse string to number:', walletBalance)
          balance.value = 0
        } else {
          balance.value = parsed
          console.log('✅ [useWalletBalance] Parsed string to number:', balance.value)
        }
      } else if (typeof walletBalance === 'number') {
        balance.value = walletBalance
        console.log('✅ [useWalletBalance] Using number directly:', balance.value)
      } else {
        console.error('❌ [useWalletBalance] Unexpected type:', typeof walletBalance)
        balance.value = 0
      }

      console.log('💰 [useWalletBalance] Final balance value:', balance.value)
      console.log('💰 [useWalletBalance] Formatted balance:', formattedBalance.value)
      console.log('✅ [useWalletBalance] Using same data source as WalletView')
      
      if (balance.value === 0 && retryCount === 0) {
        console.warn('⚠️ [useWalletBalance] WARNING: Balance is 0!')
        console.warn('   This might be correct - check user_wallets table')
        console.warn('   User ID:', authStore.user.id)
        console.warn('   Email:', authStore.user.email)
      }
    } catch (err: any) {
      console.error('❌ [useWalletBalance] Error fetching wallet balance:', err)
      console.error('   Error message:', err.message)
      console.error('   Error code:', err.code)
      console.error('   Error details:', err.details)
      console.error('   Error hint:', err.hint)
      
      error.value = err.message
      balance.value = 0
      
      // Retry on error if not already retried
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 [useWalletBalance] Retrying after error... (${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return fetchBalance(retryCount + 1)
      }
    } finally {
      loading.value = false
    }
  }

  // Subscribe to real-time updates
  const subscribeToBalance = () => {
    if (!authStore.user?.id) return

    channel = supabase
      .channel(`wallet:${authStore.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${authStore.user.id}`
        },
        (payload) => {
          const newBalance = payload.new as any
          if (newBalance.wallet_balance !== undefined && newBalance.wallet_balance !== null) {
            const walletBalance = newBalance.wallet_balance
            if (typeof walletBalance === 'string') {
              balance.value = parseFloat(walletBalance)
            } else {
              balance.value = walletBalance
            }
            console.log('💰 Wallet balance updated (realtime):', balance.value)
          }
        }
      )
      .subscribe()
  }

  // Unsubscribe from updates
  const unsubscribe = () => {
    if (channel) {
      channel.unsubscribe()
      channel = null
    }
  }

  // Auto-fetch on mount with auth check
  onMounted(async () => {
    console.log('🚀 [useWalletBalance] Component mounted')
    console.log('   Auth user:', authStore.user?.email)
    console.log('   Auth authenticated:', authStore.isAuthenticated)
    
    // Wait for auth to be ready if not authenticated yet
    if (!authStore.user?.id && authStore.isAuthenticated) {
      console.log('⏳ [useWalletBalance] Waiting for user data...')
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    await fetchBalance()
    subscribeToBalance()
    
    // Retry mechanism: If balance is still 0 after initial fetch, retry
    setTimeout(async () => {
      if (balance.value === 0 && authStore.user?.id) {
        console.log('🔄 [useWalletBalance] Balance is 0, retrying fetch...')
        await fetchBalance()
      }
    }, 1500)
    
    // Final retry after 3 seconds if still 0
    setTimeout(async () => {
      if (balance.value === 0 && authStore.user?.id) {
        console.log('🔄 [useWalletBalance] Final retry for zero balance...')
        await fetchBalance()
      }
    }, 3000)
  })

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    balance,
    formattedBalance,
    loading,
    error,
    hasSufficientBalance,
    getBalanceDifference,
    fetchBalance,
    subscribeToBalance,
    unsubscribe
  }
}
