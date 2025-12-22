/**
 * useRetentionAnalytics - Customer Retention Analytics
 * Feature: F209 - Retention Analytics
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface RetentionMetrics {
  period: string
  new_users: number
  returning_users: number
  churned_users: number
  retention_rate: number
}

export interface ChurnRisk {
  user_id: string
  user_name: string
  last_ride_date: string
  days_inactive: number
  risk_level: 'low' | 'medium' | 'high'
}

export function useRetentionAnalytics() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const metrics = ref<RetentionMetrics[]>([])
  const churnRisks = ref<ChurnRisk[]>([])

  const avgRetention = computed(() => metrics.value.length ? metrics.value.reduce((sum, m) => sum + m.retention_rate, 0) / metrics.value.length : 0)
  const highRiskUsers = computed(() => churnRisks.value.filter(u => u.risk_level === 'high'))

  const fetchMetrics = async (months = 6) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('get_retention_metrics', { p_months: months })
      if (err) throw err
      metrics.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchChurnRisks = async (limit = 100) => {
    try {
      const { data, error: err } = await supabase.rpc('get_churn_risk_users', { p_limit: limit })
      if (err) throw err
      churnRisks.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const getRiskColor = (level: string) => ({ low: '#00A86B', medium: '#F5A623', high: '#E53935' }[level] || '#666')
  const getRiskText = (level: string) => ({ low: 'ต่ำ', medium: 'ปานกลาง', high: 'สูง' }[level] || level)

  return { loading, error, metrics, churnRisks, avgRetention, highRiskUsers, fetchMetrics, fetchChurnRisks, getRiskColor, getRiskText }
}
