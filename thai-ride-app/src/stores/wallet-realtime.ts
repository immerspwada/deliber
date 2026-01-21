/**
 * Wallet Realtime Subscription Manager
 * MEMORY LEAK FIXES: Proper subscription cleanup and management
 */
import { ref, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface SubscriptionManager {
  channels: Map<string, RealtimeChannel>
  cleanup: () => void
  isActive: boolean
}

// Global subscription manager to prevent memory leaks
const subscriptionManager: SubscriptionManager = {
  channels: new Map(),
  isActive: false,
  cleanup() {
    console.log('[WalletRealtime] Cleaning up subscriptions...')
    
    for (const [key, channel] of this.channels.entries()) {
      try {
        channel.unsubscribe()
        console.log(`[WalletRealtime] Unsubscribed from ${key}`)
      } catch (error) {
        console.error(`[WalletRealtime] Error unsubscribing from ${key}:`, error)
      }
    }
    
    this.channels.clear()
    this.isActive = false
  }
}

/**
 * Setup wallet realtime subscriptions with proper cleanup
 */
export function useWalletRealtime(userId: string, callbacks: {
  onBalanceUpdate?: (data: any) => void
  onTransactionUpdate?: (data: any) => void
  onTopupUpdate?: (data: any) => void
  onWithdrawalUpdate?: (data: any) => void
}) {
  const isConnected = ref(false)
  const error = ref<string | null>(null)

  const setupSubscriptions = async (): Promise<void> => {
    if (!userId) {
      console.warn('[WalletRealtime] No user ID provided')
      return
    }

    // MEMORY LEAK FIX: Clean up existing subscriptions first
    cleanup()

    try {
      console.log('[WalletRealtime] Setting up subscriptions for user:', userId)

      // 1. Wallet balance subscription
      const walletChannel = supabase
        .channel(`wallet:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_wallets',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('[WalletRealtime] Wallet balance update:', payload)
            callbacks.onBalanceUpdate?.(payload)
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallet_transactions',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('[WalletRealtime] Transaction update:', payload)
            callbacks.onTransactionUpdate?.(payload)
          }
        )
        .subscribe((status) => {
          console.log('[WalletRealtime] Wallet channel status:', status)
          isConnected.value = status === 'SUBSCRIBED'
          if (status === 'CHANNEL_ERROR') {
            error.value = 'Failed to connect to wallet updates'
          }
        })

      subscriptionManager.channels.set('wallet', walletChannel)

      // 2. Topup requests subscription
      const topupChannel = supabase
        .channel(`topup:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'topup_requests',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('[WalletRealtime] Topup update:', payload)
            callbacks.onTopupUpdate?.(payload)
          }
        )
        .subscribe((status) => {
          console.log('[WalletRealtime] Topup channel status:', status)
          if (status === 'CHANNEL_ERROR') {
            error.value = 'Failed to connect to topup updates'
          }
        })

      subscriptionManager.channels.set('topup', topupChannel)

      // 3. Withdrawal requests subscription
      const withdrawalChannel = supabase
        .channel(`withdrawal:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'customer_withdrawals',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('[WalletRealtime] Withdrawal update:', payload)
            callbacks.onWithdrawalUpdate?.(payload)
          }
        )
        .subscribe((status) => {
          console.log('[WalletRealtime] Withdrawal channel status:', status)
          if (status === 'CHANNEL_ERROR') {
            error.value = 'Failed to connect to withdrawal updates'
          }
        })

      subscriptionManager.channels.set('withdrawal', withdrawalChannel)

      subscriptionManager.isActive = true
      console.log('[WalletRealtime] All subscriptions set up successfully')

    } catch (err) {
      console.error('[WalletRealtime] Error setting up subscriptions:', err)
      error.value = 'Failed to setup realtime updates'
    }
  }

  const cleanup = (): void => {
    subscriptionManager.cleanup()
    isConnected.value = false
    error.value = null
  }

  // MEMORY LEAK FIX: Auto cleanup on component unmount
  onUnmounted(() => {
    console.log('[WalletRealtime] Component unmounted, cleaning up subscriptions')
    cleanup()
  })

  return {
    isConnected,
    error,
    setupSubscriptions,
    cleanup
  }
}

/**
 * Global cleanup function for app shutdown
 */
export function cleanupAllWalletSubscriptions(): void {
  subscriptionManager.cleanup()
}

// MEMORY LEAK FIX: Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAllWalletSubscriptions)
  window.addEventListener('pagehide', cleanupAllWalletSubscriptions)
}