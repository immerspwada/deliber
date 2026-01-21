/**
 * useAdminRevenue - Admin composable for Revenue Analytics
 * 
 * Role: Admin only
 * Functions: get_admin_revenue_stats
 * 
 * Features:
 * - Fetch revenue statistics with date ranges
 * - Service type breakdown
 * - Daily revenue trends
 * - Payment method breakdown
 * - Error handling with useErrorHandler
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabase'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'

export interface DailyRevenue {
  date: string
  revenue: number
  orders: number
  ride_revenue: number
  delivery_revenue: number
  shopping_revenue: number
}

export interface PaymentMethodBreakdown {
  cash: number
  wallet: number
  card: number
  promptpay: number
  mobile_banking: number
  other: number
}

export interface RevenueStats {
  total_revenue: number
  ride_revenue: number
  delivery_revenue: number
  shopping_revenue: number
  platform_fee: number
  provider_earnings: number
  daily_breakdown: DailyRevenue[]
  payment_method_breakdown: PaymentMethodBreakdown
  date_from: string
  date_to: string
  service_type_filter: string | null
}

export interface RevenueFilters {
  dateFrom?: Date
  dateTo?: Date
  serviceType?: 'ride' | 'delivery' | 'shopping' | null
}

export function useAdminRevenue() {
  const { handle: handleError } = useErrorHandler()
  const { showError } = useToast()

  const loading = ref(false)
  const revenueStats = ref<RevenueStats | null>(null)
  const error = ref<string | null>(null)

  // Computed
  const totalRevenue = computed(() => revenueStats.value?.total_revenue || 0)

  const revenueByService = computed(() => ({
    ride: revenueStats.value?.ride_revenue || 0,
    delivery: revenueStats.value?.delivery_revenue || 0,
    shopping: revenueStats.value?.shopping_revenue || 0
  }))

  const platformFee = computed(() => revenueStats.value?.platform_fee || 0)

  const providerEarnings = computed(() => revenueStats.value?.provider_earnings || 0)

  const dailyBreakdown = computed(() => revenueStats.value?.daily_breakdown || [])

  const paymentMethodBreakdown = computed(() => 
    revenueStats.value?.payment_method_breakdown || {
      cash: 0,
      wallet: 0,
      card: 0,
      promptpay: 0,
      mobile_banking: 0,
      other: 0
    }
  )

  /**
   * Fetch revenue statistics with date range and service type filter
   */
  async function fetchRevenueStats(filters: RevenueFilters = {}): Promise<RevenueStats | null> {
    loading.value = true
    error.value = null

    try {
      // Default to last 30 days if no dates provided
      const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const dateTo = filters.dateTo || new Date()

      const { data, error: rpcError } = await supabase.rpc('get_admin_revenue_stats', {
        p_date_from: dateFrom.toISOString(),
        p_date_to: dateTo.toISOString(),
        p_service_type: filters.serviceType || null
      })

      if (rpcError) throw rpcError

      revenueStats.value = data as RevenueStats
      return revenueStats.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch revenue stats'
      error.value = message
      handleError(err, 'useAdminRevenue.fetchRevenueStats')
      showError('ไม่สามารถโหลดข้อมูลรายได้ได้')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Format currency for display
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date for display
   */
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  /**
   * Format percentage
   */
  function formatPercentage(value: number, total: number): string {
    if (total === 0) return '0%'
    const percentage = (value / total) * 100
    return `${percentage.toFixed(1)}%`
  }

  /**
   * Get service type label in Thai
   */
  function getServiceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ride: 'รถรับส่ง',
      delivery: 'ส่งของ',
      shopping: 'ช้อปปิ้ง'
    }
    return labels[type] || type
  }

  /**
   * Get payment method label in Thai
   */
  function getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'เงินสด',
      wallet: 'กระเป๋าเงิน',
      card: 'บัตรเครดิต/เดบิต',
      promptpay: 'พร้อมเพย์',
      mobile_banking: 'แอปธนาคาร',
      other: 'อื่นๆ'
    }
    return labels[method] || method
  }

  /**
   * Get chart data for revenue by service
   */
  function getServiceRevenueChartData() {
    if (!revenueStats.value) return []

    return [
      {
        name: 'รถรับส่ง',
        value: revenueStats.value.ride_revenue,
        color: '#3b82f6'
      },
      {
        name: 'ส่งของ',
        value: revenueStats.value.delivery_revenue,
        color: '#10b981'
      },
      {
        name: 'ช้อปปิ้ง',
        value: revenueStats.value.shopping_revenue,
        color: '#f59e0b'
      }
    ]
  }

  /**
   * Get chart data for payment methods
   */
  function getPaymentMethodChartData() {
    if (!revenueStats.value) return []

    const breakdown = revenueStats.value.payment_method_breakdown
    return [
      { name: 'เงินสด', value: breakdown.cash, color: '#22c55e' },
      { name: 'กระเป๋าเงิน', value: breakdown.wallet, color: '#3b82f6' },
      { name: 'บัตร', value: breakdown.card, color: '#a855f7' },
      { name: 'พร้อมเพย์', value: breakdown.promptpay, color: '#f59e0b' },
      { name: 'แอปธนาคาร', value: breakdown.mobile_banking, color: '#06b6d4' },
      { name: 'อื่นๆ', value: breakdown.other, color: '#6b7280' }
    ].filter(item => item.value > 0)
  }

  /**
   * Get chart data for daily revenue trend
   */
  function getDailyRevenueChartData() {
    if (!revenueStats.value) return []

    return revenueStats.value.daily_breakdown.map(day => ({
      date: formatDate(day.date),
      revenue: day.revenue,
      orders: day.orders,
      ride: day.ride_revenue,
      delivery: day.delivery_revenue,
      shopping: day.shopping_revenue
    }))
  }

  /**
   * Calculate average daily revenue
   */
  function getAverageDailyRevenue(): number {
    if (!revenueStats.value || revenueStats.value.daily_breakdown.length === 0) {
      return 0
    }

    const total = revenueStats.value.daily_breakdown.reduce(
      (sum, day) => sum + day.revenue,
      0
    )
    return total / revenueStats.value.daily_breakdown.length
  }

  /**
   * Get highest revenue day
   */
  function getHighestRevenueDay(): DailyRevenue | null {
    if (!revenueStats.value || revenueStats.value.daily_breakdown.length === 0) {
      return null
    }

    return revenueStats.value.daily_breakdown.reduce((max, day) =>
      day.revenue > max.revenue ? day : max
    )
  }

  /**
   * Get lowest revenue day
   */
  function getLowestRevenueDay(): DailyRevenue | null {
    if (!revenueStats.value || revenueStats.value.daily_breakdown.length === 0) {
      return null
    }

    return revenueStats.value.daily_breakdown.reduce((min, day) =>
      day.revenue < min.revenue ? day : min
    )
  }

  return {
    // State
    loading: readonly(loading),
    revenueStats: readonly(revenueStats),
    error: readonly(error),

    // Computed
    totalRevenue,
    revenueByService,
    platformFee,
    providerEarnings,
    dailyBreakdown,
    paymentMethodBreakdown,

    // Methods
    fetchRevenueStats,

    // Helpers
    formatCurrency,
    formatDate,
    formatPercentage,
    getServiceTypeLabel,
    getPaymentMethodLabel,
    getServiceRevenueChartData,
    getPaymentMethodChartData,
    getDailyRevenueChartData,
    getAverageDailyRevenue,
    getHighestRevenueDay,
    getLowestRevenueDay
  }
}
