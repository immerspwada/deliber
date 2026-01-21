/**
 * useWalletTopup - Focused composable for topup operations
 */
import { storeToRefs } from 'pinia'
import { useWalletStore } from '@/stores/wallet'

export function useWalletTopup() {
  const walletStore = useWalletStore()
  
  const {
    topupRequests,
    paymentAccounts,
    loading,
    pendingTopupCount,
    pendingTopupAmount,
    hasPendingTopup
  } = storeToRefs(walletStore)

  const {
    fetchTopupRequests,
    createTopupRequest,
    fetchPaymentAccounts,
    formatDate
  } = walletStore

  // Helper functions
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

  const formatPaymentMethod = (method: string): string => {
    const methods: Record<string, string> = {
      promptpay: 'พร้อมเพย์',
      bank_transfer: 'โอนเงินผ่านธนาคาร',
      credit_card: 'บัตรเครดิต'
    }
    return methods[method] || method
  }

  return {
    // State
    topupRequests,
    paymentAccounts,
    loading,
    
    // Getters
    pendingTopupCount,
    pendingTopupAmount,
    hasPendingTopup,
    
    // Actions
    fetchTopupRequests,
    createTopupRequest,
    fetchPaymentAccounts,
    
    // Helpers
    formatDate,
    formatTopupStatus,
    formatPaymentMethod
  }
}
