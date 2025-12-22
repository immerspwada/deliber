/**
 * useDriverBonus - Driver Bonus & Rewards System
 * Feature: F201 - Driver Bonus
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface BonusProgram {
  id: string
  name: string
  name_th: string
  bonus_type: 'signup' | 'referral' | 'milestone' | 'streak' | 'peak_hours' | 'zone'
  amount: number
  requirements: { min_trips?: number; min_hours?: number; min_rating?: number; consecutive_days?: number }
  valid_from: string
  valid_until?: string
  is_active: boolean
}

export interface BonusEarning {
  id: string
  provider_id: string
  program_id: string
  amount: number
  status: 'pending' | 'approved' | 'paid'
  earned_at: string
  paid_at?: string
  program?: BonusProgram
}

export function useDriverBonus() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const programs = ref<BonusProgram[]>([])
  const earnings = ref<BonusEarning[]>([])

  const activePrograms = computed(() => programs.value.filter(p => p.is_active))
  const totalEarned = computed(() => earnings.value.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0))
  const pendingAmount = computed(() => earnings.value.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0))

  const fetchPrograms = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('bonus_programs').select('*').eq('is_active', true).order('name')
      if (err) throw err
      programs.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchEarnings = async (providerId: string) => {
    try {
      const { data, error: err } = await supabase.from('bonus_earnings').select('*, program:bonus_programs(*)').eq('provider_id', providerId).order('earned_at', { ascending: false })
      if (err) throw err
      earnings.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const createProgram = async (program: Partial<BonusProgram>): Promise<BonusProgram | null> => {
    try {
      const { data, error: err } = await supabase.from('bonus_programs').insert(program as never).select().single()
      if (err) throw err
      programs.value.push(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const awardBonus = async (providerId: string, programId: string, amount: number): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('bonus_earnings').insert({ provider_id: providerId, program_id: programId, amount, status: 'pending', earned_at: new Date().toISOString() } as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getBonusTypeText = (t: string) => ({ signup: 'สมัครใหม่', referral: 'แนะนำเพื่อน', milestone: 'เป้าหมาย', streak: 'ต่อเนื่อง', peak_hours: 'ชั่วโมงเร่งด่วน', zone: 'โซนพิเศษ' }[t] || t)

  return { loading, error, programs, earnings, activePrograms, totalEarned, pendingAmount, fetchPrograms, fetchEarnings, createProgram, awardBonus, getBonusTypeText }
}
