/**
 * useCancellationAnalyticsV2 - Ride Cancellation Analytics
 * Feature: F224 - Cancellation Analytics
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface CancellationStats {
  total_cancellations: number
  customer_cancellations: number
  provider_cancellations: number
  system_cancellations: number
  cancellation_rate: number
}

export interface CancellationReason {
  reason: string
  count: number
  percentage: number
  by_role: 'customer' | 'provider' | 'system'
}

export interface CancellationTrend {
  date: string
  total: number
  customer: number
  provider: number
}

export function useCancellationAnalyticsV2() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const stats = ref<CancellationStats | null>(null)
  const reasons = ref<CancellationReason[]>([])
  const trends = ref<CancellationTrend[]>([])

  const topReasons = computed(() => reasons.value.slice(0, 5))
  const customerCancellationRate = computed(() => stats.value ? (stats.value.customer_cancellations / stats.value.total_cancellations) * 100 : 0)

  const fetchStats = async (days = 30) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('get_cancellation_stats', { p_days: days })
      if (err) throw err
      stats.value = data?.[0] || null
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchReasons = async (days = 30) => {
    try {
      const { data, error: err } = await supabase.rpc('get_cancellation_reasons', { p_days: days })
      if (err) throw err
      reasons.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const fetchTrends = async (days = 30) => {
    try {
      const { data, error: err } = await supabase.rpc('get_cancellation_trends', { p_days: days })
      if (err) throw err
      trends.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const getRoleColor = (role: string) => ({ customer: '#F5A623', provider: '#E53935', system: '#666666' }[role] || '#666')
  const getRoleText = (role: string) => ({ customer: 'ลูกค้า', provider: 'คนขับ', system: 'ระบบ' }[role] || role)

  return { loading, error, stats, reasons, trends, topReasons, customerCancellationRate, fetchStats, fetchReasons, fetchTrends, getRoleColor, getRoleText }
}
