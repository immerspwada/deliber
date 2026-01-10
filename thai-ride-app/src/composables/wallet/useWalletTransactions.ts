/**
 * useWalletTransactions - Focused composable for transaction history
 */
import { storeToRefs } from 'pinia'
import { useWalletStore } from '@/stores/wallet'

export function useWalletTransactions() {
  const walletStore = useWalletStore()
  
  const {
    transactions,
    loading
  } = storeToRefs(walletStore)

  const {
    fetchTransactions,
    formatDate,
    subscribeToWallet,
    unsubscribeAll
  } = walletStore

  // Helper functions
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

  const isPositiveTransaction = (type: string): boolean => {
    return ['topup', 'refund', 'cashback', 'referral', 'promo'].includes(type)
  }

  return {
    // State
    transactions,
    loading,
    
    // Actions
    fetchTransactions,
    subscribeToWallet,
    unsubscribeAll,
    
    // Helpers
    formatDate,
    formatTransactionType,
    isPositiveTransaction
  }
}
