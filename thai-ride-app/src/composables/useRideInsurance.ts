/**
 * useRideInsurance - Ride Insurance System
 * Feature: F200 - Ride Insurance
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface InsurancePlan {
  id: string
  name: string
  name_th: string
  coverage_type: 'basic' | 'standard' | 'premium'
  coverage_amount: number
  premium_per_ride: number
  is_active: boolean
}

export interface InsuranceClaim {
  id: string
  ride_id: string
  user_id: string
  plan_id: string
  claim_type: string
  amount: number
  description: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'paid'
  created_at: string
}

export function useRideInsurance() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const plans = ref<InsurancePlan[]>([])
  const claims = ref<InsuranceClaim[]>([])

  const activePlans = computed(() => plans.value.filter(p => p.is_active))
  const pendingClaims = computed(() => claims.value.filter(c => c.status === 'pending'))

  const fetchPlans = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('insurance_plans').select('*').eq('is_active', true)
      if (err) throw err
      plans.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchClaims = async (userId?: string) => {
    try {
      let query = supabase.from('insurance_claims').select('*').order('created_at', { ascending: false })
      if (userId) query = query.eq('user_id', userId)
      const { data, error: err } = await query
      if (err) throw err
      claims.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const submitClaim = async (claim: Partial<InsuranceClaim>): Promise<InsuranceClaim | null> => {
    try {
      const { data, error: err } = await supabase.from('insurance_claims').insert({ ...claim, status: 'pending' } as never).select().single()
      if (err) throw err
      claims.value.unshift(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const getCoverageTypeText = (t: string) => ({ basic: 'พื้นฐาน', standard: 'มาตรฐาน', premium: 'พรีเมียม' }[t] || t)
  const getStatusText = (s: string) => ({ pending: 'รอดำเนินการ', reviewing: 'กำลังตรวจสอบ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ', paid: 'จ่ายแล้ว' }[s] || s)

  return { loading, error, plans, claims, activePlans, pendingClaims, fetchPlans, fetchClaims, submitClaim, getCoverageTypeText, getStatusText }
}
