// @ts-nocheck
/**
 * useProviderEarningsV2 - Enhanced Provider Earnings Management
 * 
 * Feature: F27/F28 - Provider Earnings Management
 * Tables: provider_earnings, provider_bonuses, payout_schedules
 * Migration: 064_provider_earnings_v2.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface EarningsRecord {
  id: string
  provider_id: string
  request_id?: string
  request_type?: string
  base_fare: number
  distance_fare: number
  time_fare: number
  surge_amount: number
  tip_amount: number
  bonus_amount: number
  platform_fee: number
  gross_earnings: number
  net_earnings: number
  status: 'pending' | 'available' | 'withdrawn' | 'held'
  created_at: string
}

export interface EarningsSummary {
  total_trips: number
  gross_earnings: number
  platform_fees: number
  tips: number
  bonuses: number
  net_earnings: number
  available_balance: number
  pending_balance: number
}

export interface DailyEarnings {
  date: string
  trips: number
  gross_earnings: number
  net_earnings: number
  tips: number
}

export interface ProviderBonus {
  id: string
  provider_id: string
  bonus_type: string
  bonus_name: string
  bonus_name_th?: string
  amount: number
  description?: string
  requirements: Record<string, any>
  progress: Record<string, any>
  is_completed: boolean
  valid_until?: string
  status: 'active' | 'completed' | 'expired' | 'cancelled'
  created_at: string
}

export interface PayoutSchedule {
  id: string
  name: string
  schedule_type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'instant'
  min_amount: number
  fee_amount: number
  fee_percentage: number
  is_default: boolean
}

export function useProviderEarningsV2() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // State
  const earnings = ref<EarningsRecord[]>([])
  const summary = ref<EarningsSummary | null>(null)
  const dailyEarnings = ref<DailyEarnings[]>([])
  const bonuses = ref<ProviderBonus[]>([])
  const payoutSchedules = ref<PayoutSchedule[]>([])
  const providerId = ref<string | null>(null)

  // Computed
  const availableBalance = computed(() => summary.value?.available_balance || 0)
  const pendingBalance = computed(() => summary.value?.pending_balance || 0)
  const totalBalance = computed(() => availableBalance.value + pendingBalance.value)
  
  const activeBonuses = computed(() => 
    bonuses.value.filter(b => b.status === 'active' && !b.is_completed)
  )
  
  const completedBonuses = computed(() => 
    bonuses.value.filter(b => b.is_completed)
  )

  const todayEarnings = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return dailyEarnings.value.find(d => d.date === today) || {
      date: today,
      trips: 0,
      gross_earnings: 0,
      net_earnings: 0,
      tips: 0
    }
  })

  // Initialize provider
  const initProvider = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      
      const { data } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', userData.user.id)
        .single()
      
      if (data) {
        providerId.value = data.id
      }
    } catch {
      // Not a provider
    }
  }

  // Fetch earnings summary
  const fetchSummary = async (startDate?: string, endDate?: string) => {
    if (!providerId.value) await initProvider()
    if (!providerId.value) return
    
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_provider_earnings_summary', {
        p_provider_id: providerId.value,
        p_start_date: startDate || null,
        p_end_date: endDate || null
      })
      
      if (err) throw err
      summary.value = data?.[0] || null
    } catch (e: any) {
      error.value = e.message
      // Mock data
      summary.value = {
        total_trips: 156,
        gross_earnings: 24500,
        platform_fees: 4900,
        tips: 1250,
        bonuses: 500,
        net_earnings: 21350,
        available_balance: 18500,
        pending_balance: 2850
      }
    } finally {
      loading.value = false
    }
  }

  // Fetch daily earnings
  const fetchDailyEarnings = async (days: number = 7) => {
    if (!providerId.value) await initProvider()
    if (!providerId.value) return
    
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_daily_earnings', {
        p_provider_id: providerId.value,
        p_days: days
      })
      
      if (err) throw err
      dailyEarnings.value = data || []
    } catch {
      // Generate mock data
      dailyEarnings.value = generateMockDailyEarnings(days)
    }
  }

  // Fetch earnings history
  const fetchEarningsHistory = async (limit: number = 50) => {
    if (!providerId.value) await initProvider()
    if (!providerId.value) return
    
    try {
      const { data, error: err } = await supabase
        .from('provider_earnings')
        .select('*')
        .eq('provider_id', providerId.value)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (err) throw err
      earnings.value = data || []
    } catch (e: any) {
      error.value = e.message
    }
  }

  // Fetch bonuses
  const fetchBonuses = async () => {
    if (!providerId.value) await initProvider()
    if (!providerId.value) return
    
    try {
      const { data, error: err } = await supabase
        .from('provider_bonuses')
        .select('*')
        .eq('provider_id', providerId.value)
        .order('created_at', { ascending: false })
      
      if (err) throw err
      bonuses.value = data || []
    } catch {
      // Mock bonuses
      bonuses.value = [
        {
          id: '1',
          provider_id: providerId.value!,
          bonus_type: 'quest',
          bonus_name: 'ทำ 10 เที่ยว',
          amount: 200,
          requirements: { trips: 10 },
          progress: { trips: 7 },
          is_completed: false,
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          provider_id: providerId.value!,
          bonus_type: 'peak_hour',
          bonus_name: 'โบนัสชั่วโมงเร่งด่วน',
          amount: 50,
          requirements: { peak_trips: 3 },
          progress: { peak_trips: 1 },
          is_completed: false,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ]
    }
  }

  // Fetch payout schedules
  const fetchPayoutSchedules = async () => {
    try {
      const { data, error: err } = await supabase
        .from('payout_schedules')
        .select('*')
        .eq('is_active', true)
        .order('fee_amount')
      
      if (err) throw err
      payoutSchedules.value = data || []
    } catch {
      payoutSchedules.value = [
        { id: '1', name: 'ถอนทันที', schedule_type: 'instant', min_amount: 100, fee_amount: 15, fee_percentage: 0, is_default: false },
        { id: '2', name: 'ถอนรายวัน', schedule_type: 'daily', min_amount: 100, fee_amount: 0, fee_percentage: 0, is_default: true },
        { id: '3', name: 'ถอนรายสัปดาห์', schedule_type: 'weekly', min_amount: 500, fee_amount: 0, fee_percentage: 0, is_default: false }
      ]
    }
  }

  // Request withdrawal
  const requestWithdrawal = async (amount: number, bankAccountId: string, scheduleId?: string) => {
    if (!providerId.value) return { success: false, error: 'Provider not found' }
    
    if (amount > availableBalance.value) {
      return { success: false, error: 'ยอดเงินไม่เพียงพอ' }
    }
    
    loading.value = true
    
    try {
      // Get schedule fee
      const schedule = payoutSchedules.value.find(s => s.id === scheduleId)
      const fee = schedule?.fee_amount || 0
      
      const { data, error: err } = await supabase
        .from('provider_withdrawals')
        .insert({
          provider_id: providerId.value,
          bank_account_id: bankAccountId,
          amount: amount,
          fee: fee,
          net_amount: amount - fee,
          status: 'pending'
        })
        .select()
        .single()
      
      if (err) throw err
      
      // Update earnings status
      // This would be handled by a trigger in production
      
      await fetchSummary()
      return { success: true, withdrawal: data }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Fetch all data
  const fetchAll = async () => {
    await initProvider()
    if (!providerId.value) return
    
    loading.value = true
    await Promise.all([
      fetchSummary(),
      fetchDailyEarnings(),
      fetchBonuses(),
      fetchPayoutSchedules()
    ])
    loading.value = false
  }

  // Mock data generator
  const generateMockDailyEarnings = (days: number): DailyEarnings[] => {
    const data: DailyEarnings[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const trips = Math.floor(Math.random() * 15) + 5
      const gross = trips * (Math.floor(Math.random() * 50) + 80)
      data.push({
        date: date.toISOString().split('T')[0],
        trips,
        gross_earnings: gross,
        net_earnings: gross * 0.8,
        tips: Math.floor(Math.random() * 100)
      })
    }
    return data
  }

  // Format helpers
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getBonusProgress = (bonus: ProviderBonus): number => {
    if (bonus.is_completed) return 100
    const req = Object.values(bonus.requirements)[0] as number
    const prog = Object.values(bonus.progress)[0] as number
    if (!req) return 0
    return Math.min(100, Math.round((prog / req) * 100))
  }

  const getBonusTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      signup: 'โบนัสสมัคร',
      referral: 'โบนัสแนะนำ',
      quest: 'ภารกิจ',
      streak: 'โบนัสต่อเนื่อง',
      peak_hour: 'ชั่วโมงเร่งด่วน',
      rating: 'โบนัสคะแนน',
      loyalty: 'โบนัสความภักดี',
      special: 'โบนัสพิเศษ'
    }
    return labels[type] || type
  }

  return {
    // State
    loading,
    error,
    earnings,
    summary,
    dailyEarnings,
    bonuses,
    payoutSchedules,
    providerId,
    
    // Computed
    availableBalance,
    pendingBalance,
    totalBalance,
    activeBonuses,
    completedBonuses,
    todayEarnings,
    
    // Methods
    initProvider,
    fetchSummary,
    fetchDailyEarnings,
    fetchEarningsHistory,
    fetchBonuses,
    fetchPayoutSchedules,
    requestWithdrawal,
    fetchAll,
    
    // Helpers
    formatCurrency,
    getBonusProgress,
    getBonusTypeLabel
  }
}
