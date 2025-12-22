/**
 * usePeakHoursAnalysis - Peak Hours Analysis
 * Feature: F215 - Peak Hours
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface HourlyStats {
  hour: number
  day_of_week: number
  total_rides: number
  avg_wait_time: number
  avg_fare: number
  demand_level: 'low' | 'medium' | 'high' | 'peak'
}

export interface PeakPeriod {
  start_hour: number
  end_hour: number
  day_of_week: number
  avg_demand: number
}

export function usePeakHoursAnalysis() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hourlyStats = ref<HourlyStats[]>([])
  const peakPeriods = ref<PeakPeriod[]>([])

  const currentHourStats = computed(() => {
    const now = new Date()
    return hourlyStats.value.find(s => s.hour === now.getHours() && s.day_of_week === now.getDay())
  })

  const fetchHourlyStats = async (weeks = 4) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('get_hourly_stats', { p_weeks: weeks })
      if (err) throw err
      hourlyStats.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchPeakPeriods = async () => {
    try {
      const { data, error: err } = await supabase.rpc('get_peak_periods')
      if (err) throw err
      peakPeriods.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const getDemandColor = (level: string) => ({ low: '#00A86B', medium: '#F5A623', high: '#E53935', peak: '#B71C1C' }[level] || '#666')
  const getDemandText = (level: string) => ({ low: 'ต่ำ', medium: 'ปานกลาง', high: 'สูง', peak: 'พีค' }[level] || level)
  const getDayText = (day: number) => ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][day] || ''

  return { loading, error, hourlyStats, peakPeriods, currentHourStats, fetchHourlyStats, fetchPeakPeriods, getDemandColor, getDemandText, getDayText }
}
