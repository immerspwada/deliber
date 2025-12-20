/**
 * Production Analytics Composable
 * Business metrics, KPIs, and reporting
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface DashboardKPIs {
  total_rides: number
  total_revenue: number
  avg_rating: number
  completion_rate: number
  new_users: number
  active_providers: number
  rides_growth: number
  revenue_growth: number
}

export interface RevenueBreakdown {
  service_type: string
  total_revenue: number
  transaction_count: number
  avg_transaction: number
  percentage: number
}

export interface HourlyActivity {
  hour: number
  ride_count: number
  delivery_count: number
  total_revenue: number
}

export interface TopProvider {
  provider_id: string
  provider_name: string
  total_rides: number
  total_earnings: number
  avg_rating: number
  completion_rate: number
}

export interface DailyMetric {
  metric_date: string
  metric_type: string
  total_count: number
  completed_count: number
  cancelled_count: number
  total_revenue: number
  avg_rating?: number
  new_users?: number
  active_users?: number
}

export function useProductionAnalytics() {
  const kpis = ref<DashboardKPIs | null>(null)
  const revenueBreakdown = ref<RevenueBreakdown[]>([])
  const hourlyActivity = ref<HourlyActivity[]>([])
  const topProviders = ref<TopProvider[]>([])
  const dailyMetrics = ref<DailyMetric[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch dashboard KPIs
   */
  const fetchKPIs = async (days = 7): Promise<DashboardKPIs | null> => {
    loading.value = true
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_dashboard_kpis', { p_days: days })

      if (rpcError) throw rpcError

      if (data && data.length > 0) {
        kpis.value = data[0]
        return kpis.value
      }
      return null
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to fetch KPIs:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch revenue breakdown
   */
  const fetchRevenueBreakdown = async (
    startDate?: string,
    endDate?: string
  ): Promise<RevenueBreakdown[]> => {
    try {
      const params: any = {}
      if (startDate) params.p_start_date = startDate
      if (endDate) params.p_end_date = endDate

      const { data, error: rpcError } = await supabase
        .rpc('get_revenue_breakdown', params)

      if (rpcError) throw rpcError

      revenueBreakdown.value = data || []
      return revenueBreakdown.value
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to fetch revenue breakdown:', err)
      return []
    }
  }

  /**
   * Fetch hourly activity
   */
  const fetchHourlyActivity = async (date?: string): Promise<HourlyActivity[]> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_hourly_activity', { p_date: date || new Date().toISOString().split('T')[0] })

      if (rpcError) throw rpcError

      hourlyActivity.value = data || []
      return hourlyActivity.value
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to fetch hourly activity:', err)
      return []
    }
  }

  /**
   * Fetch top providers
   */
  const fetchTopProviders = async (limit = 10, days = 30): Promise<TopProvider[]> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_top_providers', { p_limit: limit, p_days: days })

      if (rpcError) throw rpcError

      topProviders.value = data || []
      return topProviders.value
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to fetch top providers:', err)
      return []
    }
  }

  /**
   * Fetch daily metrics
   */
  const fetchDailyMetrics = async (
    metricType?: string,
    days = 30
  ): Promise<DailyMetric[]> => {
    try {
      let query = supabase
        .from('daily_metrics')
        .select('*')
        .gte('metric_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('metric_date', { ascending: false })

      if (metricType) {
        query = query.eq('metric_type', metricType)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      dailyMetrics.value = data || []
      return dailyMetrics.value
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to fetch daily metrics:', err)
      return []
    }
  }

  /**
   * Generate daily metrics (admin only)
   */
  const generateDailyMetrics = async (date?: string): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase
        .rpc('generate_daily_metrics', { p_date: date })

      if (rpcError) throw rpcError
      return true
    } catch (err) {
      logger.error('Failed to generate daily metrics:', err)
      return false
    }
  }

  /**
   * Get user retention data
   */
  const fetchUserRetention = async (cohortMonth: string) => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_user_retention', { p_cohort_month: cohortMonth })

      if (rpcError) throw rpcError
      return data?.[0] || null
    } catch (err) {
      logger.error('Failed to fetch user retention:', err)
      return null
    }
  }

  /**
   * Export analytics data
   */
  const exportAnalytics = async (
    type: 'kpis' | 'revenue' | 'providers' | 'daily',
    format: 'json' | 'csv' = 'json'
  ): Promise<string> => {
    let data: any[] = []

    switch (type) {
      case 'kpis':
        data = kpis.value ? [kpis.value] : []
        break
      case 'revenue':
        data = revenueBreakdown.value
        break
      case 'providers':
        data = topProviders.value
        break
      case 'daily':
        data = dailyMetrics.value
        break
    }

    if (format === 'csv') {
      return convertToCSV(data)
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * Convert data to CSV
   */
  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return ''

    const headers = Object.keys(data[0])
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header]
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return value
      }).join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  // Computed values
  const totalRevenue = computed(() => kpis.value?.total_revenue || 0)
  const completionRate = computed(() => kpis.value?.completion_rate || 0)
  const avgRating = computed(() => kpis.value?.avg_rating || 0)

  return {
    // State
    kpis,
    revenueBreakdown,
    hourlyActivity,
    topProviders,
    dailyMetrics,
    loading,
    error,

    // Computed
    totalRevenue,
    completionRate,
    avgRating,

    // Methods
    fetchKPIs,
    fetchRevenueBreakdown,
    fetchHourlyActivity,
    fetchTopProviders,
    fetchDailyMetrics,
    generateDailyMetrics,
    fetchUserRetention,
    exportAnalytics
  }
}
