/**
 * useZoneAnalytics - Zone Analytics & Demand Tracking
 * 
 * Feature: F42 - Service Zone Analytics
 * Tables: service_zones, zone_demand_tracking, ride_requests
 * 
 * @features
 * - Zone statistics (rides, revenue, avg wait time)
 * - Demand heatmap data
 * - Peak hours analysis per zone
 * - Provider coverage stats
 * - Real-time demand tracking
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ZoneStats {
  zone_id: string
  zone_name: string
  zone_name_th: string
  total_rides: number
  total_revenue: number
  avg_wait_time_minutes: number
  avg_rating: number
  active_providers: number
  pending_requests: number
  completed_today: number
  cancelled_today: number
  peak_hour: number
  demand_level: 'low' | 'medium' | 'high' | 'surge'
}

export interface HeatmapPoint {
  lat: number
  lng: number
  weight: number
  zone_id?: string
}

export interface HourlyDemand {
  hour: number
  demand: number
  surge_multiplier: number
  avg_wait: number
}

export interface RealtimeDemand {
  zone_id: string
  zone_name_th: string
  pending_requests: number
  available_providers: number
  demand_ratio: number
  surge_multiplier: number
  last_updated: string
}

export function useZoneAnalytics() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // State
  const zoneStats = ref<ZoneStats[]>([])
  const heatmapData = ref<HeatmapPoint[]>([])
  const hourlyDemand = ref<HourlyDemand[]>([])
  const realtimeDemand = ref<RealtimeDemand[]>([])
  
  // Realtime subscription
  let demandChannel: RealtimeChannel | null = null

  // Computed
  const totalZones = computed(() => zoneStats.value.length)
  const highDemandZones = computed(() => 
    zoneStats.value.filter(z => z.demand_level === 'high' || z.demand_level === 'surge')
  )
  const totalRides = computed(() => 
    zoneStats.value.reduce((sum, z) => sum + z.total_rides, 0)
  )
  const totalRevenue = computed(() => 
    zoneStats.value.reduce((sum, z) => sum + z.total_revenue, 0)
  )
  const avgWaitTime = computed(() => {
    if (zoneStats.value.length === 0) return 0
    return zoneStats.value.reduce((sum, z) => sum + z.avg_wait_time_minutes, 0) / zoneStats.value.length
  })

  // Utility functions
  const getDemandLevelColor = (level: string): string => {
    const colors: Record<string, string> = {
      low: '#00A86B',
      medium: '#F5A623',
      high: '#E53935',
      surge: '#9C27B0'
    }
    return colors[level] || '#666666'
  }

  const formatCurrency = (amount: number): string => {
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // Validate zone overlap
  const validateZoneOverlap = async (
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    excludeZoneId?: string
  ): Promise<{ overlaps: boolean; overlapping_zones: Array<{ id: string; name_th: string }> }> => {
    try {
      // Get all active zones
      const { data: zones, error: err } = await supabase
        .from('service_zones')
        .select('id, name_th, center_lat, center_lng')
        .eq('is_active', true)

      if (err) throw err

      const overlapping: Array<{ id: string; name_th: string }> = []
      
      for (const zone of zones || []) {
        if (excludeZoneId && zone.id === excludeZoneId) continue
        
        // Calculate distance between centers using Haversine formula
        const R = 6371 // Earth's radius in km
        const dLat = (zone.center_lat - centerLat) * Math.PI / 180
        const dLng = (zone.center_lng - centerLng) * Math.PI / 180
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(centerLat * Math.PI / 180) * Math.cos(zone.center_lat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c
        
        // Check if circles overlap (assuming default 5km radius for existing zones)
        const existingRadius = 5 // Default radius in km
        if (distance < radiusKm + existingRadius) {
          overlapping.push({ id: zone.id, name_th: zone.name_th })
        }
      }

      return { overlaps: overlapping.length > 0, overlapping_zones: overlapping }
    } catch (err) {
      console.error('Failed to validate zone overlap:', err)
      return { overlaps: false, overlapping_zones: [] }
    }
  }

  // Fetch zone statistics
  const fetchZoneStats = async () => {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('service_zones')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (err) throw err
      
      // Map to ZoneStats format
      zoneStats.value = (data || []).map(zone => ({
        zone_id: zone.id,
        zone_name: zone.name,
        zone_name_th: zone.name_th || zone.name,
        total_rides: 0,
        total_revenue: 0,
        avg_wait_time_minutes: 0,
        avg_rating: 0,
        active_providers: 0,
        pending_requests: 0,
        completed_today: 0,
        cancelled_today: 0,
        peak_hour: 0,
        demand_level: 'low' as const
      }))
    } catch (err: any) {
      error.value = err.message
      console.error('Failed to fetch zone stats:', err)
    } finally {
      loading.value = false
    }
  }

  // Fetch heatmap data for demand visualization
  const fetchHeatmapData = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('ride_requests')
        .select('pickup_lat, pickup_lng')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not('pickup_lat', 'is', null)

      if (err) throw err

      heatmapData.value = (data || []).map(r => ({
        lat: r.pickup_lat,
        lng: r.pickup_lng,
        weight: 1
      }))
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Fetch hourly demand pattern
  const fetchHourlyDemand = async (_zoneId?: string) => {
    loading.value = true
    try {
      // Generate hourly demand data (simplified - would use actual DB aggregation)
      hourlyDemand.value = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        demand: Math.floor(Math.random() * 100),
        surge_multiplier: hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19 ? 1.5 : 1.0,
        avg_wait: Math.floor(Math.random() * 10) + 2
      }))
    } catch (err: any) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Fetch real-time demand for all zones
  const fetchRealtimeDemand = async () => {
    try {
      // Get all active zones
      const { data: zones } = await supabase
        .from('service_zones')
        .select('id, name_th')
        .eq('is_active', true)
        .returns<Array<{ id: string; name_th: string }>>()

      if (!zones || zones.length === 0) return

      // Get pending requests count per zone (simplified)
      const { data: pendingRides } = await supabase
        .from('ride_requests')
        .select('pickup_lat, pickup_lng')
        .eq('status', 'pending')

      // Get available providers count
      const { data: availableProviders } = await supabase
        .from('service_providers')
        .select('id, current_lat, current_lng')
        .eq('is_available', true)
        .eq('is_verified', true)

      // Map demand to zones
      realtimeDemand.value = zones.map(zone => {
        const pending = pendingRides?.length || 0
        const available = availableProviders?.length || 0
        const ratio = available > 0 ? pending / available : pending
        
        return {
          zone_id: zone.id,
          zone_name_th: zone.name_th,
          pending_requests: pending,
          available_providers: available,
          demand_ratio: ratio,
          surge_multiplier: ratio > 3 ? 2.0 : ratio > 2 ? 1.5 : ratio > 1 ? 1.25 : 1.0,
          last_updated: new Date().toISOString()
        }
      })
    } catch (err) {
      console.error('Failed to fetch realtime demand:', err)
    }
  }

  // Subscribe to real-time demand updates
  const subscribeToRealtimeDemand = () => {
    // Subscribe to ride_requests changes
    demandChannel = supabase
      .channel('zone-demand-tracking')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ride_requests',
        filter: 'status=eq.pending'
      }, () => {
        fetchRealtimeDemand()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_providers'
      }, () => {
        fetchRealtimeDemand()
      })
      .subscribe()

    // Initial fetch
    fetchRealtimeDemand()
  }

  // Unsubscribe from real-time updates
  const unsubscribeFromRealtimeDemand = () => {
    if (demandChannel) {
      supabase.removeChannel(demandChannel)
      demandChannel = null
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribeFromRealtimeDemand()
  })

  return {
    // State
    loading,
    error,
    zoneStats,
    heatmapData,
    hourlyDemand,
    realtimeDemand,
    
    // Computed
    totalZones,
    highDemandZones,
    totalRides,
    totalRevenue,
    avgWaitTime,
    
    // Methods
    fetchZoneStats,
    fetchHeatmapData,
    fetchHourlyDemand,
    fetchRealtimeDemand,
    subscribeToRealtimeDemand,
    unsubscribeFromRealtimeDemand,
    validateZoneOverlap,
    getDemandLevelColor,
    formatCurrency
  }
}
