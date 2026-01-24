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

  // Formatted balance
  const formattedBalance = computed(() => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(balance.value)
  })

  // Check if balance is sufficient
  const hasSufficientBalance = (amount: number): boolean => {
    return balance.value >= amount
  }

  // Get balance difference
  const getBalanceDifference = (amount: number): number => {
    return amount - balance.value
  }

  // Fetch current balance
  const fetchBalance = async () => {
    if (!authStore.user?.id) {
      balance.value = 0
      return
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', authStore.user.id)
        .single()

      if (fetchError) throw fetchError

      balance.value = parseFloat(data.wallet_balance || '0')
    } catch (err: any) {
      console.error('Error fetching wallet balance:', err)
      error.value = err.message
      balance.value = 0
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
          if (newBalance.wallet_balance !== undefined) {
            balance.value = parseFloat(newBalance.wallet_balance)
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

  // Auto-fetch on mount
  onMounted(() => {
    fetchBalance()
    subscribeToBalance()
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
