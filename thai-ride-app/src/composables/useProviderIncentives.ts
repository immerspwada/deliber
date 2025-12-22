/**
 * useProviderIncentives - Provider Incentive/Bonus System
 * Feature: F181 - Provider Incentives Management
 * Tables: provider_incentives, provider_incentive_progress
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface Incentive {
  id: string
  name: string
  name_th: string
  description: string
  incentive_type: 'trips' | 'hours' | 'rating' | 'streak' | 'referral'
  target_value: number
  reward_amount: number
  reward_type: 'cash' | 'bonus' | 'points'
  valid_from: string
  valid_until: string
  is_active: boolean
  provider_types: string[]
  zones: string[]
  created_at: string
}

export interface IncentiveProgress {
  id: string
  provider_id: string
  incentive_id: string
  current_value: number
  target_value: number
  is_completed: boolean
  completed_at?: string
  reward_claimed: boolean
  incentive?: Incentive
}

export function useProviderIncentives() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const incentives = ref<Incentive[]>([])
  const myProgress = ref<IncentiveProgress[]>([])

  const activeIncentives = computed(() => incentives.value.filter(i => i.is_active))
  const completedCount = computed(() => myProgress.value.filter(p => p.is_completed).length)
  const pendingRewards = computed(() => myProgress.value.filter(p => p.is_completed && !p.reward_claimed))

  const fetchIncentives = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('provider_incentives').select('*').eq('is_active', true).order('created_at', { ascending: false })
      if (err) throw err
      incentives.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchMyProgress = async (providerId: string) => {
    try {
      const { data, error: err } = await supabase.from('provider_incentive_progress').select('*, incentive:provider_incentives(*)').eq('provider_id', providerId)
      if (err) throw err
      myProgress.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const createIncentive = async (incentive: Partial<Incentive>): Promise<Incentive | null> => {
    try {
      const { data, error: err } = await supabase.from('provider_incentives').insert(incentive).select().single()
      if (err) throw err
      incentives.value.push(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const updateIncentive = async (id: string, updates: Partial<Incentive>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_incentives').update(updates).eq('id', id)
      if (err) throw err
      const idx = incentives.value.findIndex(i => i.id === id)
      if (idx !== -1) incentives.value[idx] = { ...incentives.value[idx], ...updates }
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const deleteIncentive = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_incentives').delete().eq('id', id)
      if (err) throw err
      incentives.value = incentives.value.filter(i => i.id !== id)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const claimReward = async (progressId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_incentive_progress').update({ reward_claimed: true, claimed_at: new Date().toISOString() }).eq('id', progressId)
      if (err) throw err
      const idx = myProgress.value.findIndex(p => p.id === progressId)
      if (idx !== -1) myProgress.value[idx].reward_claimed = true
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getProgressPercentage = (progress: IncentiveProgress): number => Math.min(100, Math.round((progress.current_value / progress.target_value) * 100))
  const getIncentiveTypeText = (type: string) => ({ trips: 'จำนวนเที่ยว', hours: 'ชั่วโมงออนไลน์', rating: 'คะแนน', streak: 'ต่อเนื่อง', referral: 'แนะนำเพื่อน' }[type] || type)
  const getRewardTypeText = (type: string) => ({ cash: 'เงินสด', bonus: 'โบนัส', points: 'แต้ม' }[type] || type)

  return { loading, error, incentives, myProgress, activeIncentives, completedCount, pendingRewards, fetchIncentives, fetchMyProgress, createIncentive, updateIncentive, deleteIncentive, claimReward, getProgressPercentage, getIncentiveTypeText, getRewardTypeText }
}
