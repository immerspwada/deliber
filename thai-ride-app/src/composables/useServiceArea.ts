/**
 * Feature: F42 - Service Area Management
 * Tables: service_areas (new)
 * 
 * ระบบจัดการพื้นที่ให้บริการ
 * - กำหนดพื้นที่ให้บริการ (polygon)
 * - ตั้งค่า surge pricing ตามพื้นที่
 * - ดูสถิติตามพื้นที่
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface ServiceArea {
  id: string
  name: string
  polygon: { lat: number; lng: number }[]
  is_active: boolean
  surge_multiplier: number
  min_fare: number
  base_fare: number
  per_km_rate: number
  color: string
  created_at: string
}

export interface AreaStats {
  area_id: string
  area_name: string
  total_rides: number
  total_revenue: number
  avg_wait_time: number
  active_providers: number
  demand_level: 'low' | 'medium' | 'high'
}

export function useServiceArea() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const areas = ref<ServiceArea[]>([])
  const areaStats = ref<AreaStats[]>([])

  // PRODUCTION ONLY - No demo mode

  // Default Bangkok service areas (fallback)
  const defaultAreas: ServiceArea[] = [
    {
      id: 'area-1',
      name: 'กรุงเทพฯ ชั้นใน',
      polygon: [
        { lat: 13.78, lng: 100.48 },
        { lat: 13.78, lng: 100.58 },
        { lat: 13.70, lng: 100.58 },
        { lat: 13.70, lng: 100.48 }
      ],
      is_active: true,
      surge_multiplier: 1.0,
      min_fare: 35,
      base_fare: 35,
      per_km_rate: 6.5,
      color: '#22c55e',
      created_at: new Date().toISOString()
    },
    {
      id: 'area-2',
      name: 'กรุงเทพฯ รอบนอก',
      polygon: [
        { lat: 13.85, lng: 100.40 },
        { lat: 13.85, lng: 100.65 },
        { lat: 13.65, lng: 100.65 },
        { lat: 13.65, lng: 100.40 }
      ],
      is_active: true,
      surge_multiplier: 1.0,
      min_fare: 40,
      base_fare: 40,
      per_km_rate: 7.0,
      color: '#3b82f6',
      created_at: new Date().toISOString()
    },
    {
      id: 'area-3',
      name: 'ปริมณฑล',
      polygon: [
        { lat: 13.95, lng: 100.30 },
        { lat: 13.95, lng: 100.75 },
        { lat: 13.55, lng: 100.75 },
        { lat: 13.55, lng: 100.30 }
      ],
      is_active: true,
      surge_multiplier: 1.2,
      min_fare: 50,
      base_fare: 50,
      per_km_rate: 8.0,
      color: '#f59e0b',
      created_at: new Date().toISOString()
    }
  ]

  // Fetch all service areas - PRODUCTION ONLY
  const fetchAreas = async () => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await (supabase
        .from('service_areas') as any)
        .select('*')
        .order('name')

      if (fetchError) throw fetchError

      areas.value = (data as ServiceArea[]) || defaultAreas
      return areas.value
    } catch (e: any) {
      error.value = e.message
      areas.value = defaultAreas
      return areas.value
    } finally {
      loading.value = false
    }
  }

  // Create new service area - PRODUCTION ONLY
  const createArea = async (area: Omit<ServiceArea, 'id' | 'created_at'>) => {
    loading.value = true

    try {
      const { data, error: insertError } = await (supabase
        .from('service_areas') as any)
        .insert(area)
        .select()
        .single()

      if (insertError) throw insertError

      areas.value.push(data as ServiceArea)
      return { success: true, data }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Update service area - PRODUCTION ONLY
  const updateArea = async (id: string, updates: Partial<ServiceArea>) => {
    loading.value = true

    try {
      const { error: updateError } = await (supabase
        .from('service_areas') as any)
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError

      const idx = areas.value.findIndex(a => a.id === id)
      if (idx !== -1 && areas.value[idx]) {
        areas.value[idx] = { ...areas.value[idx]!, ...updates }
      }

      return { success: true }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Delete service area
  const deleteArea = async (id: string) => {
    loading.value = true

    try {
      if (isDemoMode()) {
        areas.value = areas.value.filter(a => a.id !== id)
        return { success: true }
      }

      const { error: deleteError } = await (supabase
        .from('service_areas') as any)
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      areas.value = areas.value.filter(a => a.id !== id)
      return { success: true }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Check if point is inside polygon
  const isPointInArea = (lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const pi = polygon[i]
      const pj = polygon[j]
      if (!pi || !pj) continue
      
      const xi = pi.lng, yi = pi.lat
      const xj = pj.lng, yj = pj.lat

      if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    return inside
  }

  // Find area for a location
  const findAreaForLocation = (lat: number, lng: number): ServiceArea | null => {
    for (const area of areas.value) {
      if (area.is_active && isPointInArea(lat, lng, area.polygon)) {
        return area
      }
    }
    return null
  }

  // Get area statistics - PRODUCTION ONLY
  const fetchAreaStats = async () => {
    loading.value = true

    try {
      // In real implementation, aggregate from ride_requests
      const { data, error: fetchError } = await (supabase
        .rpc('get_area_stats') as any)

      if (fetchError) throw fetchError

      areaStats.value = data || []
      return areaStats.value
    } catch (e: any) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Calculate fare for a trip
  const calculateFare = (
    pickupLat: number,
    pickupLng: number,
    distanceKm: number
  ): { fare: number; area: ServiceArea | null; surgeApplied: boolean } => {
    const area = findAreaForLocation(pickupLat, pickupLng)
    
    if (!area) {
      // Default pricing if outside service area
      return {
        fare: Math.max(35, Math.round(35 + distanceKm * 6.5)),
        area: null,
        surgeApplied: false
      }
    }

    const baseFare = area.base_fare + (distanceKm * area.per_km_rate)
    const fareWithSurge = baseFare * area.surge_multiplier
    const finalFare = Math.max(area.min_fare, Math.round(fareWithSurge))

    return {
      fare: finalFare,
      area,
      surgeApplied: area.surge_multiplier > 1
    }
  }

  return {
    loading,
    error,
    areas,
    areaStats,
    fetchAreas,
    createArea,
    updateArea,
    deleteArea,
    findAreaForLocation,
    fetchAreaStats,
    calculateFare,
    isPointInArea
  }
}
