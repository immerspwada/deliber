/**
 * useOperationalMetrics - Operational Metrics Dashboard
 * Feature: F188 - Operational Metrics
 * Tables: operational_metrics, metric_snapshots
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface OperationalMetric {
  id: string
  metric_name: string
  metric_value: number
  metric_unit: string
  category: 'rides' | 'providers' | 'customers' | 'revenue' | 'performance'
  period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  recorded_at: string
}

export interface MetricSnapshot {
  total_rides_today: number
  completed_rides_today: number
  cancelled_rides_today: number
  active_providers: number
  online_providers: number
  new_customers_today: number
  revenue_today: number
  avg_wait_time_minutes: number
  avg_trip_duration_minutes: number
  avg_rating: number
  completion_rate: number
}

export function useOperationalMetrics() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const metrics = ref<OperationalMetric[]>([])
  const snapshot = ref<MetricSnapshot | null>(null)

  const metricsByCategory = computed(() => {
    const grouped: Record<string, OperationalMetric[]> = {}
    metrics.value.forEach(m => {
      if (!grouped[m.category]) grouped[m.category] = []
      grouped[m.category].push(m)
    })
    return grouped
  })

  const fetchCurrentSnapshot = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('get_operational_snapshot')
      if (err) throw err
      snapshot.value = data?.[0] || null
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchMetrics = async (category?: string, period?: string, startDate?: string, endDate?: string) => {
    loading.value = true
    try {
      let query = supabase.from('operational_metrics').select('*').order('recorded_at', { ascending: false })
      if (category) query = query.eq('category', category)
      if (period) query = query.eq('period', period)
      if (startDate) query = query.gte('recorded_at', startDate)
      if (endDate) query = query.lte('recorded_at', endDate)
      const { data, error: err } = await query.limit(500)
      if (err) throw err
      metrics.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const recordMetric = async (metric: Partial<OperationalMetric>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('operational_metrics').insert(metric as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getMetricTrend = (metricName: string, days = 7) => {
    const filtered = metrics.value.filter(m => m.metric_name === metricName).slice(0, days)
    if (filtered.length < 2) return 0
    const latest = filtered[0].metric_value
    const oldest = filtered[filtered.length - 1].metric_value
    return oldest > 0 ? Math.round(((latest - oldest) / oldest) * 100) : 0
  }

  const getCategoryText = (cat: string) => ({ rides: 'เที่ยววิ่ง', providers: 'ผู้ให้บริการ', customers: 'ลูกค้า', revenue: 'รายได้', performance: 'ประสิทธิภาพ' }[cat] || cat)

  return { loading, error, metrics, snapshot, metricsByCategory, fetchCurrentSnapshot, fetchMetrics, recordMetric, getMetricTrend, getCategoryText }
}
