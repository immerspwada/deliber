/**
 * Promo Impact Calculator
 * คำนวณผลกระทบทางการเงินจากโปรโมชั่น
 * 
 * ROUNDING STANDARD:
 * - All monetary amounts rounded to integers using Math.round()
 * - < 0.5 rounds down, ≥ 0.5 rounds up
 */

import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { roundToInt, calculateDiscount, formatCurrency as formatCurrencyUtil } from '@/utils/mathRounding'

interface PromoImpact {
  // Customer Impact
  potential_customers: number
  eligible_customers: number
  avg_order_value: number
  estimated_usage: number
  
  // Financial Impact
  estimated_discount_cost: number
  estimated_revenue_loss: number
  estimated_new_revenue: number
  net_impact: number
  roi_percentage: number
  
  // Usage Patterns
  similar_promo_usage: number
  peak_usage_time: string
  conversion_rate: number
  
  // Risk Assessment
  risk_level: 'low' | 'medium' | 'high'
  risk_factors: string[]
  recommendations: string[]
}

interface PromoData {
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  max_discount?: number
  min_order_amount?: number
  usage_limit?: number
  service_types?: string[]
  user_type?: string
  per_user_limit?: number
  min_rides?: number
}

export function usePromoImpact() {
  const impact = ref<PromoImpact | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function calculateImpact(promoData: PromoData): Promise<PromoImpact> {
    loading.value = true
    error.value = null

    try {
      // 1. Get customer base
      const { data: customers, error: customerError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'customer')

      if (customerError) throw customerError

      const total_customers = customers?.length || 0

      // 2. Get transaction data (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: transactions, error: txError } = await supabase
        .from('ride_requests')
        .select('total_fare, customer_id, service_type, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'completed')

      if (txError) throw txError

      const total_transactions = transactions?.length || 0
      const avg_order_value = total_transactions > 0
        ? roundToInt(transactions.reduce((sum, t) => sum + Number(t.total_fare || 0), 0) / total_transactions)
        : 0

      // 3. Filter eligible customers based on criteria
      let eligible_customers = total_customers

      if (promoData.min_rides && promoData.min_rides > 0) {
        // Count customers with minimum rides
        const customerRideCounts = new Map<string, number>()
        transactions?.forEach(t => {
          const count = customerRideCounts.get(t.customer_id || '') || 0
          customerRideCounts.set(t.customer_id || '', count + 1)
        })
        eligible_customers = Array.from(customerRideCounts.values())
          .filter(count => count >= (promoData.min_rides || 0)).length
      }

      // 4. Estimate usage based on similar promos
      const { data: similarPromos, error: promoError } = await supabase
        .from('promo_codes')
        .select('used_count, usage_limit, discount_type, discount_value')
        .eq('discount_type', promoData.discount_type)
        .gte('discount_value', Number(promoData.discount_value) * 0.8)
        .lte('discount_value', Number(promoData.discount_value) * 1.2)

      if (promoError) throw promoError

      const similar_promo_usage = similarPromos?.reduce((sum, p) => sum + (p.used_count || 0), 0) || 0
      const similar_promo_count = similarPromos?.length || 1
      const avg_similar_usage = similar_promo_usage / similar_promo_count

      // Estimate usage: min of (usage_limit, eligible_customers * conversion_rate)
      const conversion_rate = 0.15 // 15% conversion rate (industry average)
      const estimated_organic_usage = Math.floor(eligible_customers * conversion_rate)
      const estimated_usage = promoData.usage_limit
        ? Math.min(promoData.usage_limit, estimated_organic_usage)
        : estimated_organic_usage

      // 5. Calculate financial impact (all amounts rounded to integers)
      let discount_per_use = 0
      if (promoData.discount_type === 'fixed') {
        discount_per_use = roundToInt(Number(promoData.discount_value))
      } else {
        // Percentage discount
        discount_per_use = calculateDiscount(
          avg_order_value,
          'percentage',
          Number(promoData.discount_value),
          promoData.max_discount ? Number(promoData.max_discount) : undefined
        )
      }

      const estimated_discount_cost = roundToInt(estimated_usage * discount_per_use)
      
      // Revenue loss from existing customers using promo
      const existing_customer_usage = Math.floor(estimated_usage * 0.6) // 60% would have ordered anyway
      const estimated_revenue_loss = roundToInt(existing_customer_usage * discount_per_use)
      
      // New revenue from customers attracted by promo
      const new_customer_usage = estimated_usage - existing_customer_usage
      const estimated_new_revenue = roundToInt(new_customer_usage * (avg_order_value - discount_per_use))
      
      const net_impact = estimated_new_revenue - estimated_revenue_loss
      const roi_percentage = estimated_discount_cost > 0
        ? (net_impact / estimated_discount_cost) * 100
        : 0

      // 6. Risk assessment
      const risk_factors: string[] = []
      let risk_level: 'low' | 'medium' | 'high' = 'low'

      if (estimated_discount_cost > 50000) {
        risk_factors.push('High discount cost (>50,000 THB)')
        risk_level = 'high'
      } else if (estimated_discount_cost > 20000) {
        risk_factors.push('Medium discount cost (>20,000 THB)')
        risk_level = 'medium'
      }

      if (roi_percentage < 0) {
        risk_factors.push('Negative ROI - will lose money')
        risk_level = 'high'
      } else if (roi_percentage < 50) {
        risk_factors.push('Low ROI (<50%)')
        if (risk_level === 'low') risk_level = 'medium'
      }

      if (!promoData.usage_limit || promoData.usage_limit > 1000) {
        risk_factors.push('No usage limit or very high limit')
        if (risk_level === 'low') risk_level = 'medium'
      }

      if (promoData.discount_type === 'percentage' && Number(promoData.discount_value) > 30) {
        risk_factors.push('High percentage discount (>30%)')
        if (risk_level === 'low') risk_level = 'medium'
      }

      if (promoData.discount_type === 'fixed' && Number(promoData.discount_value) > 100) {
        risk_factors.push('High fixed discount (>100 THB)')
        if (risk_level === 'low') risk_level = 'medium'
      }

      // 7. Recommendations
      const recommendations: string[] = []

      if (!promoData.usage_limit) {
        recommendations.push('Set a usage limit to control costs')
      }

      if (!promoData.per_user_limit || promoData.per_user_limit > 5) {
        recommendations.push('Limit uses per user to prevent abuse')
      }

      if (!promoData.min_order_amount) {
        recommendations.push('Set minimum order amount to ensure profitability')
      }

      if (roi_percentage < 0) {
        recommendations.push('Reduce discount value or increase minimum order amount')
      }

      if (estimated_usage < 50) {
        recommendations.push('Consider increasing discount or extending validity period')
      }

      if (risk_level === 'high') {
        recommendations.push('Review promo parameters before activation')
      }

      impact.value = {
        potential_customers: total_customers,
        eligible_customers,
        avg_order_value,
        estimated_usage,
        estimated_discount_cost,
        estimated_revenue_loss,
        estimated_new_revenue,
        net_impact,
        roi_percentage,
        similar_promo_usage,
        peak_usage_time: 'Evening (18:00-21:00)', // Simplified
        conversion_rate,
        risk_level,
        risk_factors,
        recommendations
      }

      return impact.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to calculate impact'
      console.error('Error calculating promo impact:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    impact,
    loading,
    error,
    calculateImpact
  }
}
