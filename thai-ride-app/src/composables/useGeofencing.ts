/**
 * useGeoFencing - Geo-Fencing System
 * Feature: F193 - Geo-Fencing
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface GeoFence {
  id: string
  name: string
  name_th: string
  fence_type: 'polygon' | 'circle' | 'rectangle'
  coordinates: number[][] | { center: [number, number]; radius: number }
  zone_type: 'service_area' | 'surge_zone' | 'restricted' | 'airport' | 'event'
  properties?: { surge_multiplier?: number; min_fare?: number; special_instructions?: string }
  is_active: boolean
  valid_from?: string
  valid_until?: string
  created_at: string
}

export interface GeoFenceAlert {
  id: string
  fence_id: string
  provider_id: string
  alert_type: 'enter' | 'exit' | 'dwell'
  triggered_at: string
  location: { lat: number; lng: number }
}

export function useGeoFencing() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fences = ref<GeoFence[]>([])
  const alerts = ref<GeoFenceAlert[]>([])

  const activeFences = computed(() => fences.value.filter(f => f.is_active))
  const surgeZones = computed(() => fences.value.filter(f => f.zone_type === 'surge_zone' && f.is_active))
  const restrictedZones = computed(() => fences.value.filter(f => f.zone_type === 'restricted' && f.is_active))

  const fetchFences = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('geo_fences').select('*').order('name')
      if (err) throw err
      fences.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const createFence = async (fence: Partial<GeoFence>): Promise<GeoFence | null> => {
    try {
      const { data, error: err } = await supabase.from('geo_fences').insert(fence as never).select().single()
      if (err) throw err
      fences.value.push(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const updateFence = async (id: string, updates: Partial<GeoFence>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('geo_fences').update(updates as never).eq('id', id)
      if (err) throw err
      const idx = fences.value.findIndex(f => f.id === id)
      if (idx !== -1) fences.value[idx] = { ...fences.value[idx], ...updates }
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const deleteFence = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('geo_fences').delete().eq('id', id)
      if (err) throw err
      fences.value = fences.value.filter(f => f.id !== id)
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const checkPointInFence = (lat: number, lng: number, fence: GeoFence): boolean => {
    if (fence.fence_type === 'circle') {
      const coords = fence.coordinates as { center: [number, number]; radius: number }
      const distance = getDistanceKm(lat, lng, coords.center[0], coords.center[1])
      return distance <= coords.radius
    }
    // For polygon, use ray casting algorithm
    const polygon = fence.coordinates as number[][]
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1]
      const xj = polygon[j][0], yj = polygon[j][1]
      if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    return inside
  }

  const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const getZoneTypeText = (type: string) => ({ service_area: 'พื้นที่บริการ', surge_zone: 'โซน Surge', restricted: 'พื้นที่ห้าม', airport: 'สนามบิน', event: 'งานอีเวนต์' }[type] || type)

  // ========================================
  // Provider Tracking Integration
  // ========================================
  
  // Service area center (Bangkok)
  const SERVICE_AREA = {
    center: { lat: 13.7563, lng: 100.5018 },
    radius: 50 // 50 km radius
  }
  
  const isInsideServiceArea = ref(true)
  const distanceFromCenter = ref(0)
  
  /**
   * Check if location is inside service area
   * Used by useProviderTracking
   */
  const checkLocation = (lat: number, lng: number): boolean => {
    const distance = getDistanceKm(lat, lng, SERVICE_AREA.center.lat, SERVICE_AREA.center.lng)
    distanceFromCenter.value = distance
    isInsideServiceArea.value = distance <= SERVICE_AREA.radius
    return isInsideServiceArea.value
  }

  return { 
    loading, 
    error, 
    fences, 
    alerts, 
    activeFences, 
    surgeZones, 
    restrictedZones, 
    fetchFences, 
    createFence, 
    updateFence, 
    deleteFence, 
    checkPointInFence, 
    getDistanceKm, 
    getZoneTypeText,
    // Provider tracking integration
    SERVICE_AREA,
    isInsideServiceArea,
    distanceFromCenter,
    checkLocation
  }
}
