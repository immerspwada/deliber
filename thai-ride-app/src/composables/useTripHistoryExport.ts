/**
 * useTripHistoryExport - Trip History Export
 * Feature: F219 - Trip History Export
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface TripRecord {
  id: string
  tracking_id: string
  pickup_address: string
  dropoff_address: string
  distance_km: number
  duration_minutes: number
  fare: number
  tip?: number
  payment_method: string
  status: string
  created_at: string
}

export function useTripHistoryExport() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const trips = ref<TripRecord[]>([])

  const fetchTrips = async (userId: string, startDate: string, endDate: string) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('ride_requests').select('*').eq('user_id', userId).gte('created_at', startDate).lte('created_at', endDate).order('created_at', { ascending: false })
      if (err) throw err
      trips.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const exportToCSV = (records: TripRecord[]): string => {
    const headers = ['ID', 'Tracking ID', 'Pickup', 'Dropoff', 'Distance', 'Duration', 'Fare', 'Tip', 'Payment', 'Status', 'Date']
    const rows = records.map(r => [r.id, r.tracking_id, r.pickup_address, r.dropoff_address, r.distance_km, r.duration_minutes, r.fare, r.tip || 0, r.payment_method, r.status, r.created_at])
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  const downloadCSV = (filename: string) => {
    const csv = exportToCSV(trips.value)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
  }

  const calculateSummary = (records: TripRecord[]) => ({
    totalTrips: records.length,
    totalDistance: records.reduce((sum, r) => sum + r.distance_km, 0),
    totalFare: records.reduce((sum, r) => sum + r.fare, 0),
    totalTips: records.reduce((sum, r) => sum + (r.tip || 0), 0)
  })

  return { loading, error, trips, fetchTrips, exportToCSV, downloadCSV, calculateSummary }
}
