/**
 * useDriverLocationHistory - Driver Location History
 * Feature: F225 - Driver Location History
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface LocationPoint {
  id: string
  provider_id: string
  lat: number
  lng: number
  speed?: number
  heading?: number
  accuracy?: number
  recorded_at: string
}

export interface LocationSummary {
  provider_id: string
  date: string
  total_distance: number
  total_time: number
  avg_speed: number
  points_count: number
}

export function useDriverLocationHistory() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const locations = ref<LocationPoint[]>([])
  const summaries = ref<LocationSummary[]>([])

  const totalDistance = computed(() => {
    let dist = 0
    for (let i = 1; i < locations.value.length; i++) {
      dist += haversineDistance(locations.value[i-1].lat, locations.value[i-1].lng, locations.value[i].lat, locations.value[i].lng)
    }
    return dist
  })

  const fetchLocations = async (providerId: string, startDate: string, endDate: string) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('provider_location_history').select('*').eq('provider_id', providerId).gte('recorded_at', startDate).lte('recorded_at', endDate).order('recorded_at')
      if (err) throw err
      locations.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchSummaries = async (providerId: string, days = 7) => {
    try {
      const { data, error: err } = await supabase.rpc('get_location_summaries', { p_provider_id: providerId, p_days: days })
      if (err) throw err
      summaries.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const recordLocation = async (providerId: string, lat: number, lng: number, speed?: number, heading?: number, accuracy?: number): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_location_history').insert({ provider_id: providerId, lat, lng, speed, heading, accuracy, recorded_at: new Date().toISOString() } as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const getPathPolyline = (): { lat: number; lng: number }[] => locations.value.map(l => ({ lat: l.lat, lng: l.lng }))

  return { loading, error, locations, summaries, totalDistance, fetchLocations, fetchSummaries, recordLocation, getPathPolyline }
}
