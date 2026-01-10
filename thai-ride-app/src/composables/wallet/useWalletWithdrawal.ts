/**
 * useWalletWithdrawal - Focused composable for withdrawal operations
 */
import { storeToRefs } from 'pinia'
import { useWalletStore } from '@/stores/wallet'

export function useWalletWithdrawal() {
  const walletStore = useWalletStore()
  
  const {
    withdrawals,
    bankAccounts,
    loading,
    availableForWithdrawal,
    pendingWithdrawalAmount
  } = storeToRefs(walletStore)

  const {
    fetchWithdrawals,
    requestWithdrawal,
    cancelWithdrawal,
    fetchBankAccounts,
    addBankAccount,
    formatDate,
    subscribeToWithdrawals,
    unsubscribeAll
  } = walletStore

  // Thai banks list
  const THAI_BANKS = [
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

  // Helper functions
  const formatWithdrawalStatus = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      pending: { label: 'รอดำเนินการ', color: 'warning' },
      processing: { label: 'กำลังดำเนินการ', color: 'info' },
      completed: { label: 'สำเร็จ', color: 'success' },
      failed: { label: 'ล้มเหลว', color: 'error' },
      cancelled: { label: 'ยกเลิกแล้ว', color: 'gray' }
    }
    return statuses[status] || { label: status, color: 'gray' }
  }

  return {
    // State
    withdrawals,
    bankAccounts,
    loading,
    
    // Getters
    availableForWithdrawal,
    pendingWithdrawalAmount,
    
    // Actions
    fetchWithdrawals,
    requestWithdrawal,
    cancelWithdrawal,
    fetchBankAccounts,
    addBankAccount,
    subscribeToWithdrawals,
    unsubscribeAll,
    
    // Helpers
    formatDate,
    formatWithdrawalStatus,
    THAI_BANKS
  }
}
