// @ts-nocheck
/**
 * useAdminAnalytics - Admin Analytics Dashboard
 * 
 * Feature: F23 - Admin Analytics Dashboard
 * Tables: dashboard_metrics, revenue_analytics, user_analytics, service_analytics
 * Migration: 063_admin_analytics_dashboard.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface DashboardStats {
  total_users: number
  total_providers: number
  online_providers: number
  active_rides: number
  active_deliveries: number
  today_revenue: number
  today_orders: number
  pending_verifications: number
}

export interface RevenueTrend {
  date: string
  ride_revenue: number
  delivery_revenue: number
  shopping_revenue: number
  total_revenue: number
}

export interface HourlyOrders {
  hour: number
  ride_count: number
  delivery_count: number
  shopping_count: number
}

export interface TopProvider {
  provider_id: string
  provider_name: string
  provider_type: string
  total_trips: number
  total_earnings: number
  avg_rating: number
}

export interface ServiceDistribution {
  service_type: string
  total_orders: number
  percentage: number
}

export function useAdminAnalytics() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // State
  const dashboardStats = ref<DashboardStats | null>(null)
  const revenueTrend = ref<RevenueTrend[]>([])
  const hourlyOrders = ref<HourlyOrders[]>([])
  const topProviders = ref<TopProvider[]>([])
  const serviceDistribution = ref<ServiceDistribution[]>([])
  const userGrowth = ref<Array<{ date: string; new_users: number; cumulative_users: number }>>([])

  // Computed
  const totalTodayRevenue = computed(() => dashboardStats.value?.today_revenue || 0)
  
  const revenueChange = computed(() => {
    if (revenueTrend.value.length < 2) return 0
    const today = revenueTrend.value[revenueTrend.value.length - 1]?.total_revenue || 0
    const yesterday = revenueTrend.value[revenueTrend.value.length - 2]?.total_revenue || 0
    if (yesterday === 0) return 0
    return ((today - yesterday) / yesterday * 100)
  })

  const peakHour = computed(() => {
    if (hourlyOrders.value.length === 0) return null
    const peak = hourlyOrders.value.reduce((max, h) => {
      const total = h.ride_count + h.delivery_count + h.shopping_count
      const maxTotal = max.ride_count + max.delivery_count + max.shopping_count
      return total > maxTotal ? h : max
    })
    return peak.hour
  })

  // Fetch real-time dashboard stats
  const fetchDashboardStats = async () => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_realtime_dashboard_stats')
      
      if (err) throw err
      dashboardStats.value = data?.[0] || null
    } catch (e: any) {
      error.value = e.message
      // Return zeros on error - NO MOCK DATA
      dashboardStats.value = {
        total_users: 0,
        total_providers: 0,
        online_providers: 0,
        active_rides: 0,
        active_deliveries: 0,
        today_revenue: 0,
        today_orders: 0,
        pending_verifications: 0
      }
    } finally {
      loading.value = false
    }
  }

  // Fetch revenue trend
  const fetchRevenueTrend = async (days: number = 30) => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_revenue_trend', { p_days: days })
      
      if (err) throw err
      revenueTrend.value = data || []
    } catch {
      // Return empty array on error - NO MOCK DATA
      revenueTrend.value = []
    }
  }

  // Fetch hourly orders
  const fetchHourlyOrders = async (date?: string) => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_orders_by_hour', {
        p_date: date || new Date().toISOString().split('T')[0]
      })
      
      if (err) throw err
      hourlyOrders.value = data || []
    } catch {
      // Return empty array on error - NO MOCK DATA
      hourlyOrders.value = []
    }
  }

  // Fetch top providers
  const fetchTopProviders = async (limit: number = 10, days: number = 30) => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_top_providers', {
        p_limit: limit,
        p_days: days
      })
      
      if (err) throw err
      topProviders.value = data || []
    } catch {
      // Return empty array on error - NO MOCK DATA
      topProviders.value = []
    }
  }

  // Fetch service distribution
  const fetchServiceDistribution = async (days: number = 7) => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_service_distribution', { p_days: days })
      
      if (err) throw err
      serviceDistribution.value = data || []
    } catch {
      // Return empty array on error - NO MOCK DATA
      serviceDistribution.value = []
    }
  }

  // Fetch user growth
  const fetchUserGrowth = async (days: number = 30) => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_user_growth', { p_days: days })
      
      if (err) throw err
      userGrowth.value = data || []
    } catch {
      // Return empty array on error - NO MOCK DATA
      userGrowth.value = []
    }
  }

  // Fetch all analytics
  const fetchAllAnalytics = async () => {
    loading.value = true
    await Promise.all([
      fetchDashboardStats(),
      fetchRevenueTrend(),
      fetchHourlyOrders(),
      fetchTopProviders(),
      fetchServiceDistribution(),
      fetchUserGrowth()
    ])
    loading.value = false
  }

  // Format helpers
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('th-TH').format(num)
  }

  const formatPercentage = (num: number): string => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`
  }

  return {
    // State
    loading,
    error,
    dashboardStats,
    revenueTrend,
    hourlyOrders,
    topProviders,
    serviceDistribution,
    userGrowth,
    
    // Computed
    totalTodayRevenue,
    revenueChange,
    peakHour,
    
    // Methods
    fetchDashboardStats,
    fetchRevenueTrend,
    fetchHourlyOrders,
    fetchTopProviders,
    fetchServiceDistribution,
    fetchUserGrowth,
    fetchAllAnalytics,
    
    // Helpers
    formatCurrency,
    formatNumber,
    formatPercentage
  }
}
