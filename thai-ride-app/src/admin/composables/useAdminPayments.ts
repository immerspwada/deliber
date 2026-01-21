/**
 * useAdminPayments - Admin composable for Payment Analytics
 * 
 * Role: Admin only
 * Functions: get_admin_payment_stats
 * 
 * Features:
 * - Fetch payment statistics with date ranges
 * - Payment method breakdown
 * - Daily payment trends
 * - Service breakdown
 * - Error handling with useErrorHandler
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabase'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'

export interface PaymentMethod {
  payment_method: string
  transaction_count: number
  total_amount: number
  average_amount: number
  percentage: number
}

export interface DailyTrend {
  date: string
  transaction_count: number
  total_amount: number
  average_amount: number
}

export interface ServiceBreakdown {
  count: number
  amount: number
  average: number
}

export interface PaymentStats {
  total_transactions: number
  total_amount: number
  average_transaction: number
  payment_methods: PaymentMethod[]
  daily_trends: DailyTrend[]
  service_breakdown: {
    ride: ServiceBreakdown
    delivery: ServiceBreakdown
    shopping: ServiceBreakdown
  }
  date_from: string
  date_to: string
}

export interface PaymentFilters {
  dateFrom?: Date
  dateTo?: Date
}

export function useAdminPayments() {
  const { handle: handleError } = useErrorHandler()
  const { showError } = useToast()

  const loading = ref(false)
  const paymentStats = ref<PaymentStats | null>(null)
  const error = ref<string | null>(null)

  // Computed
  const totalTransactions = computed(() => paymentStats.value?.total_transactions || 0)

  const totalAmount = computed(() => paymentStats.value?.total_amount || 0)

  const averageTransaction = computed(() => paymentStats.value?.average_transaction || 0)

  const paymentMethods = computed(() => paymentStats.value?.payment_methods || [])

  const dailyTrends = computed(() => paymentStats.value?.daily_trends || [])

  const serviceBreakdown = computed(() => 
    paymentStats.value?.service_breakdown || {
      ride: { count: 0, amount: 0, average: 0 },
      delivery: { count: 0, amount: 0, average: 0 },
      shopping: { count: 0, amount: 0, average: 0 }
    }
  )

  const mostUsedPaymentMethod = computed(() => {
    if (!paymentStats.value || paymentStats.value.payment_methods.length === 0) {
      return null
    }

    return paymentStats.value.payment_methods.reduce((max, method) =>
      method.transaction_count > max.transaction_count ? method : max
    )
  })

  /**
   * Fetch payment statistics with date range
   */
  async function fetchPaymentStats(filters: PaymentFilters = {}): Promise<PaymentStats | null> {
    loading.value = true
    error.value = null

    try {
      // Default to last 30 days if no dates provided
      const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const dateTo = filters.dateTo || new Date()

      const { data, error: rpcError } = await supabase.rpc('get_admin_payment_stats', {
        p_date_from: dateFrom.toISOString(),
        p_date_to: dateTo.toISOString()
      })

      if (rpcError) throw rpcError

      paymentStats.value = data as PaymentStats
      return paymentStats.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch payment stats'
      error.value = message
      handleError(err, 'useAdminPayments.fetchPaymentStats')
      showError('ไม่สามารถโหลดข้อมูลการชำระเงินได้')
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
   * Format number with commas
   */
  function formatNumber(num: number): string {
    return new Intl.NumberFormat('th-TH').format(num)
  }

  /**
   * Format percentage
   */
  function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
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
   * Get chart data for payment methods
   */
  function getPaymentMethodChartData() {
    if (!paymentStats.value) return []

    return paymentStats.value.payment_methods.map(method => ({
      name: getPaymentMethodLabel(method.payment_method),
      count: method.transaction_count,
      amount: method.total_amount,
      percentage: method.percentage
    }))
  }

  /**
   * Get chart data for daily trends
   */
  function getDailyTrendsChartData() {
    if (!paymentStats.value) return []

    return paymentStats.value.daily_trends.map(trend => ({
      date: formatDate(trend.date),
      transactions: trend.transaction_count,
      amount: trend.total_amount,
      average: trend.average_amount
    }))
  }

  /**
   * Get chart data for service breakdown
   */
  function getServiceBreakdownChartData() {
    if (!paymentStats.value) return []

    const breakdown = paymentStats.value.service_breakdown
    return [
      {
        name: 'รถรับส่ง',
        count: breakdown.ride.count,
        amount: breakdown.ride.amount,
        average: breakdown.ride.average,
        color: '#3b82f6'
      },
      {
        name: 'ส่งของ',
        count: breakdown.delivery.count,
        amount: breakdown.delivery.amount,
        average: breakdown.delivery.average,
        color: '#10b981'
      },
      {
        name: 'ช้อปปิ้ง',
        count: breakdown.shopping.count,
        amount: breakdown.shopping.amount,
        average: breakdown.shopping.average,
        color: '#f59e0b'
      }
    ]
  }

  /**
   * Calculate average daily transactions
   */
  function getAverageDailyTransactions(): number {
    if (!paymentStats.value || paymentStats.value.daily_trends.length === 0) {
      return 0
    }

    const total = paymentStats.value.daily_trends.reduce(
      (sum, day) => sum + day.transaction_count,
      0
    )
    return total / paymentStats.value.daily_trends.length
  }

  /**
   * Calculate average daily amount
   */
  function getAverageDailyAmount(): number {
    if (!paymentStats.value || paymentStats.value.daily_trends.length === 0) {
      return 0
    }

    const total = paymentStats.value.daily_trends.reduce(
      (sum, day) => sum + day.total_amount,
      0
    )
    return total / paymentStats.value.daily_trends.length
  }

  /**
   * Get highest transaction day
   */
  function getHighestTransactionDay(): DailyTrend | null {
    if (!paymentStats.value || paymentStats.value.daily_trends.length === 0) {
      return null
    }

    return paymentStats.value.daily_trends.reduce((max, day) =>
      day.transaction_count > max.transaction_count ? day : max
    )
  }

  /**
   * Get highest amount day
   */
  function getHighestAmountDay(): DailyTrend | null {
    if (!paymentStats.value || paymentStats.value.daily_trends.length === 0) {
      return null
    }

    return paymentStats.value.daily_trends.reduce((max, day) =>
      day.total_amount > max.total_amount ? day : max
    )
  }

  return {
    // State
    loading: readonly(loading),
    paymentStats: readonly(paymentStats),
    error: readonly(error),

    // Computed
    totalTransactions,
    totalAmount,
    averageTransaction,
    paymentMethods,
    dailyTrends,
    serviceBreakdown,
    mostUsedPaymentMethod,

    // Methods
    fetchPaymentStats,

    // Helpers
    formatCurrency,
    formatDate,
    formatNumber,
    formatPercentage,
    getPaymentMethodLabel,
    getServiceTypeLabel,
    getPaymentMethodChartData,
    getDailyTrendsChartData,
    getServiceBreakdownChartData,
    getAverageDailyTransactions,
    getAverageDailyAmount,
    getHighestTransactionDay,
    getHighestAmountDay
  }
}
