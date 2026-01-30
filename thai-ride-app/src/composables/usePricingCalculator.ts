/**
 * usePricingCalculator - Distance-based Pricing Calculator
 * 
 * Calculates service fare based on distance using configured pricing rates
 * 
 * CRITICAL: 
 * - Commission calculated from FULL FARE (before discount)
 * - All amounts rounded to integers using Math.round()
 * - < 0.5 rounds down, ≥ 0.5 rounds up
 * 
 * @see src/utils/fareCalculation.ts
 * @see src/utils/mathRounding.ts
 */

import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { FareCalculation } from '@/types/financial-settings'
import { calculateFareWithPromo, type FareInput } from '@/utils/fareCalculation'
import { roundToInt, formatCurrency as formatCurrencyUtil } from '@/utils/mathRounding'
import type { Database } from '@/types/database'

type PromoCode = Database['public']['Tables']['promo_codes']['Row']

export function usePricingCalculator() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const promoCode = ref<PromoCode | null>(null)
  
  /**
   * Calculate fare based on distance
   */
  async function calculateFare(
    serviceType: string,
    distanceKm: number
  ): Promise<FareCalculation | null> {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)(
        'calculate_distance_fare',
        {
          p_service_type: serviceType,
          p_distance_km: distanceKm
        }
      )
      
      if (rpcError) throw rpcError
      
      if (data && Array.isArray(data) && data.length > 0) {
        return {
          base_fare: Number(data[0].base_fare),
          distance_fare: Number(data[0].distance_fare),
          total_fare: Number(data[0].total_fare),
          per_km_rate: Number(data[0].per_km_rate),
          distance_km: Number(data[0].distance_km),
          min_fare: Number(data[0].min_fare),
          max_fare: Number(data[0].max_fare),
          final_fare: Number(data[0].final_fare)
        }
      }
      
      return null
    } catch (e) {
      console.error('Fare calculation failed:', e)
      error.value = e instanceof Error ? e.message : 'Failed to calculate fare'
      return null
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Calculate fare breakdown for display (all amounts rounded to integers)
   */
  function calculateFareBreakdown(
    baseFare: number,
    perKm: number,
    distanceKm: number,
    minFare: number,
    maxFare: number
  ): FareCalculation {
    const distanceFare = roundToInt(distanceKm * perKm)
    const totalFare = roundToInt(baseFare + distanceFare)
    const finalFare = Math.max(minFare, Math.min(maxFare, totalFare))
    
    return {
      base_fare: roundToInt(baseFare),
      distance_fare: distanceFare,
      total_fare: totalFare,
      per_km_rate: perKm,
      distance_km: distanceKm,
      min_fare: roundToInt(minFare),
      max_fare: roundToInt(maxFare),
      final_fare: roundToInt(finalFare)
    }
  }
  
  /**
   * Format currency for display (integer only, no decimals)
   */
  function formatCurrency(amount: number): string {
    return formatCurrencyUtil(amount, true)
  }
  
  /**
   * Format distance for display
   */
  function formatDistance(km: number): string {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)} ม.`
    }
    return `${km.toFixed(1)} กม.`
  }
  
  /**
   * Calculate fare with promo code support
   * Uses correct financial logic: commission from full fare, platform bears discount
   */
  function calculateFareWithPromoCode(
    baseFare: number,
    distanceFare: number,
    timeFare: number,
    surgeMultiplier: number = 1.0,
    commissionRate: number = 0.20,
    promo?: PromoCode | null
  ) {
    const input: FareInput = {
      baseFare,
      distanceFare,
      timeFare,
      surgeMultiplier,
      commissionRate,
      promoCode: promo || null
    }
    
    return calculateFareWithPromo(input)
  }
  
  /**
   * Apply promo code
   */
  async function applyPromoCode(code: string): Promise<PromoCode | null> {
    try {
      const { data, error: fetchError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single()
      
      if (fetchError || !data) {
        error.value = 'ไม่พบโค้ดส่วนลด'
        return null
      }
      
      promoCode.value = data
      return data
    } catch (err) {
      error.value = 'เกิดข้อผิดพลาดในการตรวจสอบโค้ด'
      return null
    }
  }
  
  /**
   * Clear promo code
   */
  function clearPromoCode() {
    promoCode.value = null
  }
  
  return {
    // State
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    promoCode: computed(() => promoCode.value),
    
    // Methods
    calculateFare,
    calculateFareBreakdown,
    calculateFareWithPromoCode,
    applyPromoCode,
    clearPromoCode,
    
    // Helpers
    formatCurrency,
    formatDistance
  }
}
