/**
 * useDriverEarningsCalculator - Driver Earnings Calculator
 * Feature: F222 - Driver Earnings Calculator
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface EarningsBreakdown {
  base_fare: number
  distance_fare: number
  time_fare: number
  surge_bonus: number
  tips: number
  incentives: number
  gross_earnings: number
  platform_fee: number
  net_earnings: number
}

export interface EarningsPeriod {
  period: string
  total_trips: number
  total_distance: number
  total_hours: number
  gross_earnings: number
  net_earnings: number
  avg_per_trip: number
  avg_per_hour: number
}

export function useDriverEarningsCalculator() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const breakdown = ref<EarningsBreakdown | null>(null)
  const periods = ref<EarningsPeriod[]>([])

  const platformFeeRate = ref(0.20) // 20% platform fee

  const calculateEarnings = (baseFare: number, distance: number, duration: number, surgeMultiplier = 1, tips = 0, incentives = 0): EarningsBreakdown => {
    const distanceFare = distance * 10 // 10 THB per km
    const timeFare = duration * 2 // 2 THB per minute
    const surgeBonus = (baseFare + distanceFare + timeFare) * (surgeMultiplier - 1)
    const grossEarnings = baseFare + distanceFare + timeFare + surgeBonus + tips + incentives
    const platformFee = Math.round(grossEarnings * platformFeeRate.value)
    const netEarnings = grossEarnings - platformFee

    breakdown.value = { base_fare: baseFare, distance_fare: distanceFare, time_fare: timeFare, surge_bonus: surgeBonus, tips, incentives, gross_earnings: grossEarnings, platform_fee: platformFee, net_earnings: netEarnings }
    return breakdown.value
  }

  const fetchPeriodEarnings = async (providerId: string, periodType: 'daily' | 'weekly' | 'monthly' = 'weekly') => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('get_provider_earnings_by_period', { p_provider_id: providerId, p_period_type: periodType })
      if (err) throw err
      periods.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const estimateWeeklyEarnings = (tripsPerDay: number, avgFarePerTrip: number, daysPerWeek: number): number => {
    const grossWeekly = tripsPerDay * avgFarePerTrip * daysPerWeek
    return Math.round(grossWeekly * (1 - platformFeeRate.value))
  }

  const formatCurrency = (amount: number): string => `฿${amount.toLocaleString()}`

  return { loading, error, breakdown, periods, platformFeeRate, calculateEarnings, fetchPeriodEarnings, estimateWeeklyEarnings, formatCurrency }
}
