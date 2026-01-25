/**
 * usePricingCalculator - Distance-based Pricing Calculator
 * 
 * Calculates service fare based on distance using configured pricing rates
 */

import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { FareCalculation } from '@/types/financial-settings'

export function usePricingCalculator() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
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
   * Calculate fare breakdown for display
   */
  function calculateFareBreakdown(
    baseFare: number,
    perKm: number,
    distanceKm: number,
    minFare: number,
    maxFare: number
  ): FareCalculation {
    const distanceFare = distanceKm * perKm
    const totalFare = baseFare + distanceFare
    const finalFare = Math.max(minFare, Math.min(maxFare, totalFare))
    
    return {
      base_fare: baseFare,
      distance_fare: distanceFare,
      total_fare: totalFare,
      per_km_rate: perKm,
      distance_km: distanceKm,
      min_fare: minFare,
      max_fare: maxFare,
      final_fare: finalFare
    }
  }
  
  /**
   * Format currency for display
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
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
  
  return {
    // State
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    
    // Methods
    calculateFare,
    calculateFareBreakdown,
    
    // Helpers
    formatCurrency,
    formatDistance
  }
}
