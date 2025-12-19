// @ts-nocheck
/**
 * useRealtimeTracking - Enhanced Real-time Location Tracking
 * 
 * Feature: F33 - Real-time Driver Location for Customer
 * Tables: provider_location_history, eta_updates, geofence_events
 * Migration: 059_realtime_tracking_v2.sql
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface LocationPoint {
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  timestamp: string
}

export interface ETAUpdate {
  eta_minutes: number
  distance_km: number
  traffic_condition: 'light' | 'moderate' | 'heavy' | 'severe'
  calculated_at: string
}

export interface GeofenceEvent {
  event_type: 'enter' | 'exit' | 'dwell'
  geofence_type: 'pickup' | 'destination' | 'service_area'
  geofence_name?: string
  created_at: string
}

export function useRealtimeTracking() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Current tracking state
  const currentLocation = ref<LocationPoint | null>(null)
  const locationHistory = ref<LocationPoint[]>([])
  const currentETA = ref<ETAUpdate | null>(null)
  const geofenceEvents = ref<GeofenceEvent[]>([])
  
  // Subscription management
  let locationChannel: RealtimeChannel | null = null
  let etaChannel: RealtimeChannel | null = null
  
  // Tracking state
  const isTracking = ref(false)
  const trackingRequestId = ref<string | null>(null)
  const trackingProviderId = ref<string | null>(null)

  // Computed
  const formattedETA = computed(() => {
    if (!currentETA.value) return null
    const mins = currentETA.value.eta_minutes
    if (mins < 1) return 'ถึงแล้ว'
    if (mins === 1) return '1 นาที'
    return `${mins} นาที`
  })

  const trafficStatus = computed(() => {
    const conditions: Record<string, { label: string; color: string }> = {
      light: { label: 'รถน้อย', color: '#00A86B' },
      moderate: { label: 'ปานกลาง', color: '#ffc043' },
      heavy: { label: 'รถติด', color: '#ff6b35' },
      severe: { label: 'รถติดมาก', color: '#E53935' }
    }
    return conditions[currentETA.value?.traffic_condition || 'moderate']
  })

  // Start tracking a request
  const startTracking = async (requestId: string, providerId: string) => {
    if (isTracking.value) {
      await stopTracking()
    }
    
    loading.value = true
    error.value = null
    trackingRequestId.value = requestId
    trackingProviderId.value = providerId
    
    try {
      // Subscribe to provider location updates
      locationChannel = supabase
        .channel(`location:${providerId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'service_providers',
            filter: `id=eq.${providerId}`
          },
          (payload) => {
            const { current_lat, current_lng, last_location_update } = payload.new as any
            if (current_lat && current_lng) {
              currentLocation.value = {
                latitude: current_lat,
                longitude: current_lng,
                timestamp: last_location_update || new Date().toISOString()
              }
              
              // Add to history
              locationHistory.value.push(currentLocation.value)
              if (locationHistory.value.length > 100) {
                locationHistory.value.shift()
              }
            }
          }
        )
        .subscribe()
      
      // Subscribe to ETA updates
      etaChannel = supabase
        .channel(`eta:${requestId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'eta_updates',
            filter: `request_id=eq.${requestId}`
          },
          (payload) => {
            currentETA.value = {
              eta_minutes: payload.new.eta_minutes,
              distance_km: payload.new.distance_km,
              traffic_condition: payload.new.traffic_condition,
              calculated_at: payload.new.calculated_at
            }
          }
        )
        .subscribe()
      
      // Fetch initial location
      await fetchCurrentLocation(providerId)
      await fetchLatestETA(requestId)
      
      isTracking.value = true
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // Stop tracking
  const stopTracking = async () => {
    if (locationChannel) {
      await supabase.removeChannel(locationChannel)
      locationChannel = null
    }
    if (etaChannel) {
      await supabase.removeChannel(etaChannel)
      etaChannel = null
    }
    
    isTracking.value = false
    trackingRequestId.value = null
    trackingProviderId.value = null
    currentLocation.value = null
    locationHistory.value = []
    currentETA.value = null
  }

  // Fetch current provider location
  const fetchCurrentLocation = async (providerId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('service_providers')
        .select('current_lat, current_lng, last_location_update')
        .eq('id', providerId)
        .single()
      
      if (err) throw err
      
      if (data?.current_lat && data?.current_lng) {
        currentLocation.value = {
          latitude: data.current_lat,
          longitude: data.current_lng,
          timestamp: data.last_location_update || new Date().toISOString()
        }
      }
    } catch (e: any) {
      error.value = e.message
    }
  }

  // Fetch latest ETA
  const fetchLatestETA = async (requestId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('eta_updates')
        .select('*')
        .eq('request_id', requestId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single()
      
      if (err && err.code !== 'PGRST116') throw err
      
      if (data) {
        currentETA.value = {
          eta_minutes: data.eta_minutes,
          distance_km: data.distance_km,
          traffic_condition: data.traffic_condition,
          calculated_at: data.calculated_at
        }
      }
    } catch (e: any) {
      // ETA might not exist yet
    }
  }

  // Fetch location history for a request
  const fetchLocationHistory = async (requestId: string, limit: number = 100) => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_location_trail', {
        p_request_id: requestId,
        p_limit: limit
      })
      
      if (err) throw err
      
      locationHistory.value = (data || []).map((point: any) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        speed: point.speed,
        timestamp: point.recorded_at
      })).reverse()
    } catch (e: any) {
      error.value = e.message
    }
  }

  // Record location (for provider)
  const recordLocation = async (
    providerId: string,
    location: LocationPoint,
    requestId?: string,
    requestType?: string
  ) => {
    try {
      await (supabase.rpc as any)('record_provider_location', {
        p_provider_id: providerId,
        p_lat: location.latitude,
        p_lng: location.longitude,
        p_accuracy: location.accuracy,
        p_speed: location.speed,
        p_heading: location.heading,
        p_request_id: requestId,
        p_request_type: requestType
      })
    } catch (e: any) {
      console.error('Failed to record location:', e)
    }
  }

  // Update ETA
  const updateETA = async (
    requestId: string,
    requestType: string,
    providerId: string,
    etaMinutes: number,
    distanceKm: number,
    traffic: ETAUpdate['traffic_condition'] = 'moderate'
  ) => {
    try {
      await (supabase.rpc as any)('update_eta', {
        p_request_id: requestId,
        p_request_type: requestType,
        p_provider_id: providerId,
        p_eta_minutes: etaMinutes,
        p_distance_km: distanceKm,
        p_traffic: traffic
      })
    } catch (e: any) {
      console.error('Failed to update ETA:', e)
    }
  }

  // Log geofence event
  const logGeofenceEvent = async (
    providerId: string,
    eventType: GeofenceEvent['event_type'],
    geofenceType: GeofenceEvent['geofence_type'],
    lat: number,
    lng: number,
    requestId?: string
  ) => {
    try {
      await (supabase.rpc as any)('log_geofence_event', {
        p_provider_id: providerId,
        p_event_type: eventType,
        p_geofence_type: geofenceType,
        p_lat: lat,
        p_lng: lng,
        p_request_id: requestId
      })
    } catch (e: any) {
      console.error('Failed to log geofence event:', e)
    }
  }

  // Get cached route
  const getCachedRoute = async (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ) => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_cached_route', {
        p_origin_lat: originLat,
        p_origin_lng: originLng,
        p_dest_lat: destLat,
        p_dest_lng: destLng
      })
      
      if (err) throw err
      return data?.[0] || null
    } catch {
      return null
    }
  }

  // Cache route
  const cacheRoute = async (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    polyline: string,
    distance: number,
    duration: number
  ) => {
    try {
      await (supabase.rpc as any)('cache_route', {
        p_origin_lat: originLat,
        p_origin_lng: originLng,
        p_dest_lat: destLat,
        p_dest_lng: destLng,
        p_polyline: polyline,
        p_distance: distance,
        p_duration: duration
      })
    } catch {
      // Silent fail for caching
    }
  }

  // Calculate distance between two points (Haversine)
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371 // Earth's radius in km
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const toRad = (deg: number) => deg * (Math.PI / 180)

  // Check if point is within geofence
  const isWithinGeofence = (
    lat: number,
    lng: number,
    centerLat: number,
    centerLng: number,
    radiusKm: number
  ): boolean => {
    const distance = calculateDistance(lat, lng, centerLat, centerLng)
    return distance <= radiusKm
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking()
  })

  return {
    // State
    loading,
    error,
    currentLocation,
    locationHistory,
    currentETA,
    geofenceEvents,
    isTracking,
    trackingRequestId,
    
    // Computed
    formattedETA,
    trafficStatus,
    
    // Methods
    startTracking,
    stopTracking,
    fetchCurrentLocation,
    fetchLatestETA,
    fetchLocationHistory,
    recordLocation,
    updateETA,
    logGeofenceEvent,
    getCachedRoute,
    cacheRoute,
    calculateDistance,
    isWithinGeofence
  }
}
