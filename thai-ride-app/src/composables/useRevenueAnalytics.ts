/**
 * useRevenueAnalytics - Revenue Analytics Composable
 * Feature: F35 - Analytics Dashboard
 * Tables: ride_requests, delivery_requests, shopping_requests
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface RevenueSummary {
  service_type: string
  total_orders: number
  completed_orders: number
  total_revenue: number
  avg_order_value: number
  completion_rate: number
}

export interface DailyRevenue {
  date: string
  ride_revenue: number
  delivery_revenue: number
  shopping_revenue: number
  total_revenue: number
}

export function useRevenueAnalytics() {
  const loading = ref(false)
  const revenueSummary = ref<RevenueSummary[]>([])
  const dailyTrend = ref<DailyRevenue[]>([])

  const fetchRevenueSummary = async (startDate: string, endDate: string) => {
    loading.value = true
    try {
      const { data, error } = await (supabase.rpc as any)('get_revenue_summary', {
        p_start_date: startDate,
        p_end_date: endDate
      })
      if (!error && data) revenueSummary.value = data
      return data
    } catch (err) {
      console.error('Error fetching revenue summary:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  const fetchDailyTrend = async (days: number = 30) => {
    loading.value = true
    try {
      const { data, error } = await (supabase.rpc as any)('get_daily_revenue_trend', { p_days: days })
      if (!error && data) dailyTrend.value = data
      return data
    } catch (err) {
      console.error('Error fetching daily trend:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  const getTotalRevenue = () => revenueSummary.value.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0)
  const getTotalOrders = () => revenueSummary.value.reduce((sum, s) => sum + Number(s.completed_orders || 0), 0)

  return { loading, revenueSummary, dailyTrend, fetchRevenueSummary, fetchDailyTrend, getTotalRevenue, getTotalOrders }
}
