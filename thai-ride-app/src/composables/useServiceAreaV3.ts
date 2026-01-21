/**
 * useServiceAreaV3 - Service Area Management
 * Feature: F214 - Service Area
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface ServiceArea {
  id: string
  name: string
  name_th: string
  type: 'city' | 'district' | 'zone' | 'custom'
  polygon: { lat: number; lng: number }[]
  center_lat: number
  center_lng: number
  radius_km?: number
  base_fare: number
  per_km_rate: number
  per_minute_rate: number
  surge_multiplier: number
  is_active: boolean
}

export interface AreaStats {
  area_id: string
  total_rides: number
  total_revenue: number
  avg_wait_time: number
  active_drivers: number
}

export function useServiceAreaV3() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const areas = ref<ServiceArea[]>([])
  const stats = ref<AreaStats[]>([])

  const activeAreas = computed(() => areas.value.filter(a => a.is_active))

  const fetchAreas = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('service_areas').select('*').order('name')
      if (err) throw err
      areas.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchStats = async () => {
    try {
      const { data, error: err } = await supabase.rpc('get_area_stats')
      if (err) throw err
      stats.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const createArea = async (area: Partial<ServiceArea>): Promise<ServiceArea | null> => {
    try {
      const { data, error: err } = await supabase.from('service_areas').insert({ ...area, is_active: true } as never).select().single()
      if (err) throw err
      areas.value.push(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const updateArea = async (id: string, updates: Partial<ServiceArea>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('service_areas').update(updates as never).eq('id', id)
      if (err) throw err
      const idx = areas.value.findIndex(a => a.id === id)
      if (idx !== -1) Object.assign(areas.value[idx], updates)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const isPointInArea = (lat: number, lng: number, area: ServiceArea): boolean => {
    if (area.radius_km) {
      const dist = haversineDistance(lat, lng, area.center_lat, area.center_lng)
      return dist <= area.radius_km
    }
    return isPointInPolygon(lat, lng, area.polygon)
  }

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const isPointInPolygon = (lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat
      const xj = polygon[j].lng, yj = polygon[j].lat
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside
    }
    return inside
  }

  const getAreaTypeText = (t: string) => ({ city: 'เมือง', district: 'อำเภอ', zone: 'โซน', custom: 'กำหนดเอง' }[t] || t)

  return { loading, error, areas, stats, activeAreas, fetchAreas, fetchStats, createArea, updateArea, isPointInArea, getAreaTypeText }
}
