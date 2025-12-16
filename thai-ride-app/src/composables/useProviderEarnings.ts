/**
 * Feature: F27 - Provider Earnings Withdrawal
 * Feature: F28 - Provider Online Hours Tracking
 * Tables: provider_bank_accounts, provider_withdrawals, provider_online_sessions, provider_daily_stats
 * Migration: 017_provider_earnings_withdrawal.sql
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useToast } from './useToast'

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
  provider_id: string
  bank_account_id: string
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  transaction_ref: string | null
  processed_at: string | null
  failed_reason: string | null
  created_at: string
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

export function useProviderEarnings() {
  const toast = useToast()
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const bankAccounts = ref<BankAccount[]>([])
  const withdrawals = ref<Withdrawal[]>([])
  const earningsSummary = ref<EarningsSummary | null>(null)
  const weeklyStats = ref<DailyStat[]>([])
  const currentSessionId = ref<string | null>(null)

  // Check if demo mode
  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

  // Fetch bank accounts
  const fetchBankAccounts = async (providerId: string) => {
    loading.value = true
    try {
      if (isDemoMode()) {
        bankAccounts.value = [
          {
            id: 'demo-bank-1',
            provider_id: providerId,
            bank_code: 'KBANK',
            bank_name: 'ธนาคารกสิกรไทย',
            account_number: '***-*-**123-4',
            account_name: 'นาย ทดสอบ ระบบ',
            is_default: true,
            is_verified: true,
            created_at: new Date().toISOString()
          }
        ]
        return bankAccounts.value
      }

      const { data, error: fetchError } = await (supabase
        .from('provider_bank_accounts') as any)
        .select('*')
        .eq('provider_id', providerId)
        .order('is_default', { ascending: false })

      if (fetchError) throw fetchError
      bankAccounts.value = data || []
      return bankAccounts.value
    } catch (e: any) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Add bank account
  const addBankAccount = async (
    providerId: string,
    bankCode: string,
    accountNumber: string,
    accountName: string,
    isDefault: boolean = false
  ) => {
    loading.value = true
    try {
      const bank = THAI_BANKS.find(b => b.code === bankCode)
      if (!bank) throw new Error('ไม่พบธนาคารที่เลือก')

      if (isDemoMode()) {
        const newAccount: BankAccount = {
          id: `demo-bank-${Date.now()}`,
          provider_id: providerId,
          bank_code: bankCode,
          bank_name: bank.name,
          account_number: accountNumber,
          account_name: accountName,
          is_default: isDefault,
          is_verified: false,
          created_at: new Date().toISOString()
        }
        bankAccounts.value.push(newAccount)
        toast.success('เพิ่มบัญชีธนาคารสำเร็จ')
        return newAccount
      }

      // If setting as default, unset other defaults first
      if (isDefault) {
        await (supabase
          .from('provider_bank_accounts') as any)
          .update({ is_default: false })
          .eq('provider_id', providerId)
      }

      const { data, error: insertError } = await (supabase
        .from('provider_bank_accounts') as any)
        .insert({
          provider_id: providerId,
          bank_code: bankCode,
          bank_name: bank.name,
          account_number: accountNumber,
          account_name: accountName,
          is_default: isDefault
        })
        .select()
        .single()

      if (insertError) throw insertError
      bankAccounts.value.push(data)
      toast.success('เพิ่มบัญชีธนาคารสำเร็จ')
      return data
    } catch (e: any) {
      error.value = e.message
      toast.error(e.message)
      return null
    } finally {
      loading.value = false
    }
  }

  // Delete bank account
  const deleteBankAccount = async (accountId: string) => {
    loading.value = true
    try {
      if (isDemoMode()) {
        bankAccounts.value = bankAccounts.value.filter(a => a.id !== accountId)
        toast.success('ลบบัญชีธนาคารสำเร็จ')
        return true
      }

      const { error: deleteError } = await (supabase
        .from('provider_bank_accounts') as any)
        .delete()
        .eq('id', accountId)

      if (deleteError) throw deleteError
      bankAccounts.value = bankAccounts.value.filter(a => a.id !== accountId)
      toast.success('ลบบัญชีธนาคารสำเร็จ')
      return true
    } catch (e: any) {
      error.value = e.message
      toast.error(e.message)
      return false
    } finally {
      loading.value = false
    }
  }

  // Fetch withdrawals
  const fetchWithdrawals = async (providerId: string) => {
    loading.value = true
    try {
      if (isDemoMode()) {
        withdrawals.value = [
          {
            id: 'demo-wd-1',
            provider_id: providerId,
            bank_account_id: 'demo-bank-1',
            amount: 1500,
            fee: 0,
            net_amount: 1500,
            status: 'completed',
            transaction_ref: 'TXN123456',
            processed_at: new Date(Date.now() - 86400000).toISOString(),
            failed_reason: null,
            created_at: new Date(Date.now() - 86400000 * 2).toISOString()
          },
          {
            id: 'demo-wd-2',
            provider_id: providerId,
            bank_account_id: 'demo-bank-1',
            amount: 800,
            fee: 0,
            net_amount: 800,
            status: 'pending',
            transaction_ref: null,
            processed_at: null,
            failed_reason: null,
            created_at: new Date().toISOString()
          }
        ]
        return withdrawals.value
      }

      const { data, error: fetchError } = await (supabase
        .from('provider_withdrawals') as any)
        .select('*, bank_account:provider_bank_accounts(*)')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError
      withdrawals.value = data || []
      return withdrawals.value
    } catch (e: any) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Request withdrawal
  const requestWithdrawal = async (providerId: string, bankAccountId: string, amount: number) => {
    loading.value = true
    try {
      if (amount < 100) {
        throw new Error('จำนวนเงินขั้นต่ำ 100 บาท')
      }

      if (isDemoMode()) {
        const newWithdrawal: Withdrawal = {
          id: `demo-wd-${Date.now()}`,
          provider_id: providerId,
          bank_account_id: bankAccountId,
          amount,
          fee: 0,
          net_amount: amount,
          status: 'pending',
          transaction_ref: null,
          processed_at: null,
          failed_reason: null,
          created_at: new Date().toISOString()
        }
        withdrawals.value.unshift(newWithdrawal)
        if (earningsSummary.value) {
          earningsSummary.value.available_balance -= amount
          earningsSummary.value.pending_withdrawals += amount
        }
        toast.success('ส่งคำขอถอนเงินสำเร็จ')
        return newWithdrawal
      }

      const { data, error: rpcError } = await (supabase.rpc as any)('request_withdrawal', {
        p_provider_id: providerId,
        p_bank_account_id: bankAccountId,
        p_amount: amount
      })

      if (rpcError) throw rpcError
      if (!data?.[0]?.success) {
        throw new Error(data?.[0]?.message || 'ไม่สามารถถอนเงินได้')
      }

      toast.success('ส่งคำขอถอนเงินสำเร็จ')
      await fetchWithdrawals(providerId)
      await fetchEarningsSummary(providerId)
      return data[0]
    } catch (e: any) {
      error.value = e.message
      toast.error(e.message)
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch earnings summary
  const fetchEarningsSummary = async (providerId: string) => {
    loading.value = true
    try {
      if (isDemoMode()) {
        earningsSummary.value = {
          available_balance: 2450,
          pending_withdrawals: 800,
          total_earnings: 18500,
          total_withdrawn: 15250,
          today_earnings: 850,
          today_trips: 8,
          today_online_minutes: 320,
          week_earnings: 4250,
          week_trips: 42,
          month_earnings: 18500,
          month_trips: 156
        }
        return earningsSummary.value
      }

      const { data, error: rpcError } = await (supabase.rpc as any)('get_provider_earnings_summary', {
        p_provider_id: providerId
      })

      if (rpcError) throw rpcError
      earningsSummary.value = data?.[0] || null
      return earningsSummary.value
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch weekly stats
  const fetchWeeklyStats = async (providerId: string) => {
    try {
      if (isDemoMode()) {
        const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
        const today = new Date()
        weeklyStats.value = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today)
          date.setDate(date.getDate() - 6 + i)
          return {
            stat_date: date.toISOString().slice(0, 10),
            day_name: days[date.getDay()] || 'อา',
            online_minutes: Math.floor(Math.random() * 360) + 60,
            trips: Math.floor(Math.random() * 8) + 2,
            earnings: Math.floor(Math.random() * 800) + 200
          }
        })
        return weeklyStats.value
      }

      const { data, error: rpcError } = await (supabase.rpc as any)('get_provider_weekly_hours', {
        p_provider_id: providerId
      })

      if (rpcError) throw rpcError
      weeklyStats.value = data || []
      return weeklyStats.value
    } catch (e: any) {
      error.value = e.message
      return []
    }
  }

  // Start online session
  const startOnlineSession = async (providerId: string) => {
    try {
      if (isDemoMode()) {
        currentSessionId.value = `demo-session-${Date.now()}`
        return currentSessionId.value
      }

      const { data, error: rpcError } = await (supabase.rpc as any)('start_provider_session', {
        p_provider_id: providerId
      })

      if (rpcError) throw rpcError
      currentSessionId.value = data
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  // End online session
  const endOnlineSession = async (providerId: string) => {
    try {
      if (isDemoMode()) {
        currentSessionId.value = null
        return 0
      }

      const { data, error: rpcError } = await (supabase.rpc as any)('end_provider_session', {
        p_provider_id: providerId
      })

      if (rpcError) throw rpcError
      currentSessionId.value = null
      return data || 0
    } catch (e: any) {
      error.value = e.message
      return 0
    }
  }

  // Format minutes to hours string
  const formatMinutesToHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins} นาที`
    if (mins === 0) return `${hours} ชม.`
    return `${hours} ชม. ${mins} นาที`
  }

  return {
    loading,
    error,
    bankAccounts,
    withdrawals,
    earningsSummary,
    weeklyStats,
    currentSessionId,
    // Bank accounts
    fetchBankAccounts,
    addBankAccount,
    deleteBankAccount,
    // Withdrawals
    fetchWithdrawals,
    requestWithdrawal,
    // Earnings
    fetchEarningsSummary,
    fetchWeeklyStats,
    // Sessions
    startOnlineSession,
    endOnlineSession,
    // Utils
    formatMinutesToHours,
    THAI_BANKS
  }
}
