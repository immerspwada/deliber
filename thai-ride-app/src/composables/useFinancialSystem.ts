/**
 * Financial System Composable
 * 
 * Handles all financial operations including:
 * - Commission calculation
 * - Order completion with automatic commission
 * - Wallet operations
 * - Transaction tracking
 */

import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/composables/useToast'

export interface CommissionBreakdown {
  service_type: string
  total_fare: number
  commission_rate: number
  commission_percentage: number
  commission_amount: number
  provider_earnings: number
  tip_amount: number
  total_provider_credit: number
  surge_multiplier: number
  breakdown: {
    customer_pays: number
    platform_receives: number
    provider_receives: number
  }
}

export interface OrderCompletionResult {
  success: boolean
  order_id: string
  service_type: string
  financial_breakdown: {
    total_fare: number
    commission_rate: number
    commission_amount: number
    provider_earnings: number
    tip_amount: number
    total_provider_credit: number
    surge_multiplier: number
  }
  transactions: {
    platform_revenue_id: string
    provider_earning_tx_id: string
    customer_tip_tx_id: string | null
    provider_tip_tx_id: string | null
  }
  balances: {
    customer_balance: number
    provider_balance: number
  }
}

export function useFinancialSystem() {
  const toast = useToast()
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Calculate commission preview without executing transaction
   */
  const calculateCommissionPreview = async (
    serviceType: string,
    totalFare: number,
    tipAmount: number = 0,
    surgeMultiplier: number = 1.0
  ): Promise<CommissionBreakdown | null> => {
    try {
      loading.value = true
      error.value = null

      const { data, error: rpcError } = await supabase.rpc(
        'calculate_commission_preview',
        {
          p_service_type: serviceType,
          p_total_fare: totalFare,
          p_tip_amount: tipAmount,
          p_surge_multiplier: surgeMultiplier
        }
      )

      if (rpcError) throw rpcError

      return data as CommissionBreakdown
    } catch (err) {
      console.error('Commission preview failed:', err)
      error.value = err instanceof Error ? err.message : 'Failed to calculate commission'
      toast.error('ไม่สามารถคำนวณค่าคอมมิชชั่นได้')
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Complete order with automatic commission calculation
   */
  const completeOrderWithCommission = async (
    orderId: string,
    serviceType: string,
    totalFare: number,
    tipAmount: number = 0,
    surgeMultiplier: number = 1.0
  ): Promise<OrderCompletionResult | null> => {
    try {
      loading.value = true
      error.value = null

      const { data, error: rpcError } = await supabase.rpc(
        'complete_order_with_commission',
        {
          p_order_id: orderId,
          p_service_type: serviceType,
          p_total_fare: totalFare,
          p_tip_amount: tipAmount,
          p_surge_multiplier: surgeMultiplier
        }
      )

      if (rpcError) throw rpcError

      const result = data as OrderCompletionResult

      // Show success message
      toast.success(
        `งานเสร็จสิ้น! รับเงิน ${result.financial_breakdown.total_provider_credit.toFixed(2)} บาท`
      )

      return result
    } catch (err) {
      console.error('Order completion failed:', err)
      error.value = err instanceof Error ? err.message : 'Failed to complete order'
      
      // Handle specific errors
      if (error.value?.includes('INSUFFICIENT_BALANCE')) {
        toast.error('ยอดเงินในกระเป๋าไม่เพียงพอ')
      } else if (error.value?.includes('Commission rate not found')) {
        toast.error('ไม่พบอัตราค่าคอมมิชชั่น')
      } else {
        toast.error('ไม่สามารถทำรายการได้')
      }
      
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Deduct money from customer wallet (at booking)
   */
  const deductCustomerWallet = async (
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string
  ): Promise<boolean> => {
    try {
      loading.value = true
      error.value = null

      const { data, error: rpcError } = await supabase.rpc(
        'customer_deduct_wallet',
        {
          p_amount: amount,
          p_reference_type: referenceType,
          p_reference_id: referenceId,
          p_description: description
        }
      )

      if (rpcError) throw rpcError

      if (data?.success) {
        toast.success(`หักเงิน ${amount.toFixed(2)} บาท สำเร็จ`)
        return true
      }

      return false
    } catch (err) {
      console.error('Wallet deduction failed:', err)
      error.value = err instanceof Error ? err.message : 'Failed to deduct wallet'
      
      if (error.value?.includes('INSUFFICIENT_BALANCE')) {
        toast.error('ยอดเงินในกระเป๋าไม่เพียงพอ กรุณาเติมเงิน')
      } else {
        toast.error('ไม่สามารถหักเงินได้')
      }
      
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Credit earnings to provider wallet
   */
  const creditProviderEarnings = async (
    providerId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description?: string
  ): Promise<boolean> => {
    try {
      loading.value = true
      error.value = null

      const { data, error: rpcError } = await supabase.rpc(
        'provider_credit_earnings',
        {
          p_provider_id: providerId,
          p_amount: amount,
          p_reference_type: referenceType,
          p_reference_id: referenceId,
          p_description: description
        }
      )

      if (rpcError) throw rpcError

      if (data?.success) {
        return true
      }

      return false
    } catch (err) {
      console.error('Provider credit failed:', err)
      error.value = err instanceof Error ? err.message : 'Failed to credit provider'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Get commission rate for service type
   */
  const getCommissionRate = async (serviceType: string): Promise<number | null> => {
    try {
      const { data, error: queryError } = await supabase
        .from('financial_settings')
        .select('value')
        .eq('category', 'commission')
        .eq('key', 'service_rates')
        .eq('is_active', true)
        .single()

      if (queryError) throw queryError

      const rate = data?.value?.[serviceType]
      return rate ? parseFloat(rate) : null
    } catch (err) {
      console.error('Failed to get commission rate:', err)
      return null
    }
  }

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  /**
   * Calculate percentage
   */
  const calculatePercentage = (amount: number, total: number): number => {
    if (total === 0) return 0
    return (amount / total) * 100
  }

  return {
    // State
    loading: computed(() => loading.value),
    error: computed(() => error.value),

    // Methods
    calculateCommissionPreview,
    completeOrderWithCommission,
    deductCustomerWallet,
    creditProviderEarnings,
    getCommissionRate,

    // Utilities
    formatCurrency,
    calculatePercentage
  }
}
