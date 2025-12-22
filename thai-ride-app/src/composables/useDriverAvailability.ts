/**
 * useDriverAvailability - Driver Availability Forecasting
 * Feature: F208 - Driver Availability
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface AvailabilityForecast {
  hour: number
  day_of_week: number
  predicted_drivers: number
  predicted_demand: number
  supply_demand_ratio: number
  confidence: number
}

export interface ZoneAvailability {
  zone_id: string
  zone_name: string
  available_drivers: number
  busy_drivers: number
  offline_drivers: number
  avg_wait_time: number
}

export function useDriverAvailability() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const forecasts = ref<AvailabilityForecast[]>([])
  const zoneAvailability = ref<ZoneAvailability[]>([])
  const currentAvailable = ref(0)

  const lowSupplyHours = computed(() => forecasts.value.filter(f => f.supply_demand_ratio < 0.8))
  const highDemandZones = computed(() => zoneAvailability.value.filter(z => z.avg_wait_time > 10))

  const fetchForecast = async (days = 7) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('get_availability_forecast', { p_days: days })
      if (err) throw err
      forecasts.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchZoneAvailability = async () => {
    try {
      const { data, error: err } = await supabase.rpc('get_zone_availability')
      if (err) throw err
      zoneAvailability.value = data || []
      currentAvailable.value = (data || []).reduce((sum: number, z: ZoneAvailability) => sum + z.available_drivers, 0)
    } catch (e: any) { error.value = e.message }
  }

  const predictDemand = (hour: number, dayOfWeek: number): number => {
    const forecast = forecasts.value.find(f => f.hour === hour && f.day_of_week === dayOfWeek)
    return forecast?.predicted_demand || 0
  }

  const getSupplyStatus = (ratio: number) => ratio >= 1.2 ? 'surplus' : ratio >= 0.8 ? 'balanced' : 'shortage'
  const getSupplyStatusText = (ratio: number) => ({ surplus: 'เกินความต้องการ', balanced: 'สมดุล', shortage: 'ขาดแคลน' }[getSupplyStatus(ratio)] || '')
  const getSupplyColor = (ratio: number) => ratio >= 1.2 ? '#00A86B' : ratio >= 0.8 ? '#F5A623' : '#E53935'

  return { loading, error, forecasts, zoneAvailability, currentAvailable, lowSupplyHours, highDemandZones, fetchForecast, fetchZoneAvailability, predictDemand, getSupplyStatus, getSupplyStatusText, getSupplyColor }
}
