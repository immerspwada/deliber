/**
 * useProviderWallet - Provider Wallet Composable V2
 * 
 * Feature: Provider Earnings & Withdrawal System
 * Tables: provider_bank_accounts_v2, provider_withdrawals_v2, provider_daily_stats_v2
 * 
 * Role Impact (3 บริบท):
 * - 👤 Customer: ไม่เกี่ยวข้อง (แยกจาก customer wallet)
 * - 🚗 Provider: ดูยอดเงิน, ถอนเงิน, จัดการบัญชีธนาคาร
 * - 👑 Admin: อนุมัติ/ปฏิเสธการถอนเงิน (ใช้ admin functions)
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '../lib/supabase'
import { useToast } from './useToast'

// Types
export interface BankAccount {
  id: string
  provider_id: string
  bank_code: string
  bank_name: string
  account_number: string
  account_name: string
  is_default: boolean
  is_verified: boolean
  created_at: string
}

export interface Withdrawal {
  id: string
  withdrawal_uid: string
  provider_id: string
  bank_account_id: string
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  transaction_ref: string | null
  admin_notes: string | null
  failed_reason: string | null
  created_at: string
  processed_at: string | null
  bank_account?: BankAccount
}

export interface EarningsSummary {
  available_balance: number
  pending_withdrawals: number
  total_earnings: number
  total_withdrawn: number
  today_earnings: number
  today_trips: number
  today_online_minutes: number
  week_earnings: number
  week_trips: number
  month_earnings: number
  month_trips: number
}

export interface DailyStat {
  stat_date: string
  day_name: string
  online_minutes: number
  trips: number
  earnings: number
}

// Thai banks list
export const THAI_BANKS = [
  { code: 'BBL', name: 'ธนาคารกรุงเทพ', color: '#1e3a8a' },
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย', color: '#00a651' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย', color: '#1e90ff' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์', color: '#4e2a84' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา', color: '#ffc72c' },
  { code: 'TMB', name: 'ธนาคารทหารไทยธนชาต', color: '#1a1f71' },
  { code: 'GSB', name: 'ธนาคารออมสิน', color: '#e91e8c' },
  { code: 'BAAC', name: 'ธนาคาร ธ.ก.ส.', color: '#00703c' },
  { code: 'CIMB', name: 'ธนาคารซีไอเอ็มบี', color: '#ec1c24' },
  { code: 'UOB', name: 'ธนาคารยูโอบี', color: '#0033a0' },
  { code: 'LH', name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์', color: '#00a3e0' },
  { code: 'KK', name: 'ธนาคารเกียรตินาคินภัทร', color: '#003366' }
] as const

// Error messages
const ERROR_MESSAGES: Record<string, string> = {
  'PGRST116': 'ไม่พบข้อมูลที่ต้องการ',
  'PGRST301': 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
  '23505': 'ข้อมูลนี้มีอยู่แล้วในระบบ',
  '23503': 'ไม่สามารถลบได้ เนื่องจากมีข้อมูลที่เกี่ยวข้อง',
  'insufficient_balance': 'ยอดเงินไม่เพียงพอ',
  'min_withdrawal': 'จำนวนเงินขั้นต่ำ 100 บาท',
  'network_error': 'ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต',
  'default': 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

const getThaiErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || error
  }
  const e = error as { code?: string; message?: string }
  const code = e?.code || e?.message || 'default'
  return ERROR_MESSAGES[code] || e?.message || ERROR_MESSAGES.default
}

export function useProviderWallet() {
  const { showSuccess, showError } = useToast()
  
  // State
  const loading = ref(false)
  const error = ref<string | null>(null)
  const bankAccounts = ref<BankAccount[]>([])
  const withdrawals = ref<Withdrawal[]>([])
  const earningsSummary = ref<EarningsSummary | null>(null)
  const weeklyStats = ref<DailyStat[]>([])

  // Computed
  const defaultBankAccount = computed(() => 
    bankAccounts.value.find(a => a.is_default) || bankAccounts.value[0]
  )
  
  const hasBankAccount = computed(() => bankAccounts.value.length > 0)
  
  const pendingWithdrawals = computed(() => 
    withdrawals.value.filter(w => w.status === 'pending' || w.status === 'processing')
  )
  
  const availableBalance = computed(() => earningsSummary.value?.available_balance || 0)

  // Fetch earnings summary
  async function fetchEarningsSummary(providerId: string): Promise<EarningsSummary | null> {
    loading.value = true
    error.value = null
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('get_provider_earnings_summary_v2', {
        p_provider_id: providerId
      })

      if (rpcError) throw rpcError
      
      if (data && data.length > 0) {
        earningsSummary.value = {
          available_balance: Number(data[0].available_balance) || 0,
          pending_withdrawals: Number(data[0].pending_withdrawals) || 0,
          total_earnings: Number(data[0].total_earnings) || 0,
          total_withdrawn: Number(data[0].total_withdrawn) || 0,
          today_earnings: Number(data[0].today_earnings) || 0,
          today_trips: Number(data[0].today_trips) || 0,
          today_online_minutes: Number(data[0].today_online_minutes) || 0,
          week_earnings: Number(data[0].week_earnings) || 0,
          week_trips: Number(data[0].week_trips) || 0,
          month_earnings: Number(data[0].month_earnings) || 0,
          month_trips: Number(data[0].month_trips) || 0
        }
        return earningsSummary.value
      }
      return null
    } catch (e) {
      error.value = getThaiErrorMessage(e)
      console.error('[ProviderWallet] fetchEarningsSummary error:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch bank accounts
  async function fetchBankAccounts(providerId: string): Promise<BankAccount[]> {
    loading.value = true
    try {
      const { data, error: fetchError } = await (supabase
        .from('provider_bank_accounts_v2') as any)
        .select('*')
        .eq('provider_id', providerId)
        .order('is_default', { ascending: false })

      if (fetchError) throw fetchError
      bankAccounts.value = data || []
      return bankAccounts.value
    } catch (e) {
      error.value = getThaiErrorMessage(e)
      console.error('[ProviderWallet] fetchBankAccounts error:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  // Add bank account
  async function addBankAccount(
    providerId: string,
    bankCode: string,
    accountNumber: string,
    accountName: string,
    isDefault: boolean = false
  ): Promise<BankAccount | null> {
    loading.value = true
    try {
      const bank = THAI_BANKS.find(b => b.code === bankCode)
      if (!bank) throw new Error('ไม่พบธนาคารที่เลือก')

      // If setting as default, unset other defaults first
      if (isDefault && bankAccounts.value.length > 0) {
        await (supabase
          .from('provider_bank_accounts_v2') as any)
          .update({ is_default: false })
          .eq('provider_id', providerId)
      }

      const { data, error: insertError } = await (supabase
        .from('provider_bank_accounts_v2') as any)
        .insert({
          provider_id: providerId,
          bank_code: bankCode,
          bank_name: bank.name,
          account_number: accountNumber,
          account_name: accountName,
          is_default: isDefault || bankAccounts.value.length === 0
        })
        .select()
        .single()

      if (insertError) throw insertError
      
      bankAccounts.value.push(data)
      showSuccess('เพิ่มบัญชีธนาคารสำเร็จ')
      return data
    } catch (e) {
      error.value = getThaiErrorMessage(e)
      showError(getThaiErrorMessage(e))
      return null
    } finally {
      loading.value = false
    }
  }

  // Update bank account
  async function updateBankAccount(
    accountId: string,
    updates: Partial<Pick<BankAccount, 'account_number' | 'account_name' | 'is_default'>>
  ): Promise<boolean> {
    loading.value = true
    try {
      const { error: updateError } = await (supabase
        .from('provider_bank_accounts_v2') as any)
        .update(updates)
        .eq('id', accountId)

      if (updateError) throw updateError
      
      // Update local state
      const index = bankAccounts.value.findIndex(a => a.id === accountId)
      if (index !== -1) {
        bankAccounts.value[index] = { ...bankAccounts.value[index], ...updates }
      }
      
      showSuccess('อัพเดทบัญชีธนาคารสำเร็จ')
      return true
    } catch (e) {
      error.value = getThaiErrorMessage(e)
      showError(getThaiErrorMessage(e))
      return false
    } finally {
      loading.value = false
    }
  }

  // Delete bank account
  async function deleteBankAccount(accountId: string): Promise<boolean> {
    loading.value = true
    try {
      const { error: deleteError } = await (supabase
        .from('provider_bank_accounts_v2') as any)
        .delete()
        .eq('id', accountId)

      if (deleteError) throw deleteError
      
      bankAccounts.value = bankAccounts.value.filter(a => a.id !== accountId)
      showSuccess('ลบบัญชีธนาคารสำเร็จ')
      return true
    } catch (e) {
      error.value = getThaiErrorMessage(e)
      showError(getThaiErrorMessage(e))
      return false
    } finally {
      loading.value = false
    }
  }

  // Set default bank account
  async function setDefaultBankAccount(providerId: string, accountId: string): Promise<boolean> {
    loading.value = true
    try {
      // Unset all defaults
      await (supabase
        .from('provider_bank_accounts_v2') as any)
        .update({ is_default: false })
        .eq('provider_id', providerId)

      // Set new default
      const { error: updateError } = await (supabase
        .from('provider_bank_accounts_v2') as any)
        .update({ is_default: true })
        .eq('id', accountId)

      if (updateError) throw updateError
      
      // Update local state
      bankAccounts.value = bankAccounts.value.map(a => ({
        ...a,
        is_default: a.id === accountId
      }))
      
      showSuccess('ตั้งเป็นบัญชีหลักสำเร็จ')
      return true
    } catch (e) {
      error.value = getThaiErrorMessage(e)
      showError(getThaiErrorMessage(e))
      return false
    } finally {
      loading.value = false
    }
  }

  // Fetch withdrawals
  async function fetchWithdrawals(providerId: string): Promise<Withdrawal[]> {
    loading.value = true
    try {
      const { data, error: fetchError } = await (supabase
        .from('provider_withdrawals_v2') as any)
        .select('*, bank_account:provider_bank_accounts_v2(*)')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError
      withdrawals.value = data || []
      return withdrawals.value
    } catch (e) {
      error.value = getThaiErrorMessage(e)
      console.error('[ProviderWallet] fetchWithdrawals error:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  // Request withdrawal
  async function requestWithdrawal(
    providerId: string,
    bankAccountId: string,
    amount: number
  ): Promise<{ success: boolean; message: string; withdrawalId?: string }> {
    loading.value = true
    try {
      if (amount < 100) {
        return { success: false, message: 'จำนวนเงินขั้นต่ำ 100 บาท' }
      }

      const { data, error: rpcError } = await (supabase.rpc as any)('request_withdrawal_v2', {
        p_provider_id: providerId,
        p_bank_account_id: bankAccountId,
        p_amount: amount
      })

      if (rpcError) throw rpcError
      
      if (data && data.length > 0) {
        const result = data[0]
        if (result.success) {
          showSuccess(result.message)
          // Refresh data
          await fetchWithdrawals(providerId)
          await fetchEarningsSummary(providerId)
          return { success: true, message: result.message, withdrawalId: result.withdrawal_id }
        } else {
          showError(result.message)
          return { success: false, message: result.message }
        }
      }
      
      return { success: false, message: 'ไม่สามารถส่งคำขอได้' }
    } catch (e) {
      const msg = getThaiErrorMessage(e)
      error.value = msg
      showError(msg)
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  // Cancel withdrawal (only pending)
  async function cancelWithdrawal(withdrawalId: string, providerId: string): Promise<boolean> {
    loading.value = true
    try {
      const { error: updateError } = await (supabase
        .from('provider_withdrawals_v2') as any)
        .update({ status: 'cancelled' })
        .eq('id', withdrawalId)
        .eq('status', 'pending')

      if (updateError) throw updateError
      
      showSuccess('ยกเลิกคำขอถอนเงินสำเร็จ')
      await fetchWithdrawals(providerId)
      await fetchEarningsSummary(providerId)
      return true
    } catch (e) {
      error.value = getThaiErrorMessage(e)
      showError(getThaiErrorMessage(e))
      return false
    } finally {
      loading.value = false
    }
  }

  // Fetch weekly stats
  async function fetchWeeklyStats(providerId: string): Promise<DailyStat[]> {
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('get_provider_weekly_hours_v2', {
        p_provider_id: providerId
      })

      if (rpcError) throw rpcError
      weeklyStats.value = data || []
      return weeklyStats.value
    } catch (e) {
      console.error('[ProviderWallet] fetchWeeklyStats error:', e)
      return []
    }
  }

  // Format helpers
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  }

  function formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins} นาที`
    if (mins === 0) return `${hours} ชม.`
    return `${hours} ชม. ${mins} นาที`
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'รอดำเนินการ',
      processing: 'กำลังดำเนินการ',
      completed: 'สำเร็จ',
      failed: 'ไม่สำเร็จ',
      cancelled: 'ยกเลิก'
    }
    return labels[status] || status
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      processing: '#3B82F6',
      completed: '#10B981',
      failed: '#EF4444',
      cancelled: '#6B7280'
    }
    return colors[status] || '#6B7280'
  }

  function getBankColor(bankCode: string): string {
    const bank = THAI_BANKS.find(b => b.code === bankCode)
    return bank?.color || '#6B7280'
  }

  return {
    // State (readonly)
    loading: readonly(loading),
    error: readonly(error),
    bankAccounts: readonly(bankAccounts),
    withdrawals: readonly(withdrawals),
    earningsSummary: readonly(earningsSummary),
    weeklyStats: readonly(weeklyStats),
    // Computed
    defaultBankAccount,
    hasBankAccount,
    pendingWithdrawals,
    availableBalance,
    // Methods
    fetchEarningsSummary,
    fetchBankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefaultBankAccount,
    fetchWithdrawals,
    requestWithdrawal,
    cancelWithdrawal,
    fetchWeeklyStats,
    // Helpers
    formatCurrency,
    formatMinutes,
    getStatusLabel,
    getStatusColor,
    getBankColor,
    THAI_BANKS
  }
}
