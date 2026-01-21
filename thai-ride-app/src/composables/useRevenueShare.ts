/**
 * useRevenueShare - Revenue Share & Commission
 * Feature: F236 - Revenue Share
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface RevenueConfig {
  id: string
  service_type: string
  platform_fee_percent: number
  provider_share_percent: number
  min_platform_fee: number
  max_platform_fee?: number
  is_active: boolean
}

export interface RevenueReport {
  period: string
  total_revenue: number
  platform_revenue: number
  provider_payouts: number
  total_trips: number
}

export function useRevenueShare() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const configs = ref<RevenueConfig[]>([])
  const reports = ref<RevenueReport[]>([])

  const activeConfigs = computed(() => configs.value.filter(c => c.is_active))

  const fetchConfigs = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('revenue_configs').select('*').order('service_type')
      if (err) throw err
      configs.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchReports = async (months = 6) => {
    try {
      const { data, error: err } = await supabase.rpc('get_revenue_reports', { p_months: months })
      if (err) throw err
      reports.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const calculateSplit = (fare: number, serviceType: string): { platform: number; provider: number } => {
    const config = activeConfigs.value.find(c => c.service_type === serviceType)
    if (!config) return { platform: fare * 0.2, provider: fare * 0.8 }
    let platformFee = fare * (config.platform_fee_percent / 100)
    platformFee = Math.max(platformFee, config.min_platform_fee)
    if (config.max_platform_fee) platformFee = Math.min(platformFee, config.max_platform_fee)
    return { platform: Math.round(platformFee), provider: Math.round(fare - platformFee) }
  }

  const updateConfig = async (id: string, updates: Partial<RevenueConfig>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('revenue_configs').update(updates as never).eq('id', id)
      if (err) throw err
      const idx = configs.value.findIndex(c => c.id === id)
      if (idx !== -1) Object.assign(configs.value[idx], updates)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  return { loading, error, configs, reports, activeConfigs, fetchConfigs, fetchReports, calculateSplit, updateConfig }
}
