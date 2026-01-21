/**
 * useWalletBalance - Focused composable for wallet balance operations
 */
import { storeToRefs } from 'pinia'
import { useWalletStore } from '@/stores/wallet'

export function useWalletBalance() {
  const walletStore = useWalletStore()
  
  const {
    balance,
    loading,
    isInitialized,
    formattedBalance,
    formattedEarned,
    formattedSpent,
    availableForWithdrawal,
    pendingTopupAmount,
    pendingWithdrawalAmount
  } = storeToRefs(walletStore)

  const {
    fetchBalance,
    formatMoney
  } = walletStore

  return {
    // State
    balance,
    loading,
    isInitialized,
    
    // Getters
    formattedBalance,
    formattedEarned,
    formattedSpent,
    availableForWithdrawal,
    pendingTopupAmount,
    pendingWithdrawalAmount,
    
    // Actions
    fetchBalance,
    formatMoney
  }
}
