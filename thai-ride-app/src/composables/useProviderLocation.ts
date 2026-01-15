/**
 * Provider Location Tracking Composable - Production Ready
 * Handles GPS tracking with battery optimization and error handling
 * 
 * Role Impact:
 * - Provider: Automatic location tracking when online
 * - Customer: Can see provider location during ride (via RLS)
 * - Admin: Can monitor all provider locations
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useErrorHandler } from './useErrorHandler'

interface LocationUpdate {
  latitude: number
  longitude: number
  accuracy: number
  speed: number | null
  heading: number | null
  timestamp: number
}

interface LocationOptions {
  enableHighAccuracy?: boolean
  updateInterval?: number // milliseconds
  historyInterval?: number // milliseconds
  maxAge?: number
  timeout?: number
}

const DEFAULT_OPTIONS: Required<LocationOptions> = {
  enableHighAccuracy: true,
  updateInterval: 5000, // Update every 5 seconds
  historyInterval: 60000, // Record history every 60 seconds
  maxAge: 30000,
  timeout: 10000
}

export function useProviderLocation(options: LocationOptions = {}) {
  const { handle: handleError } = useErrorHandler()
  
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // State
  const currentLocation = ref<LocationUpdate | null>(null)
  const isTracking = ref(false)
  const error = ref<string | null>(null)
  const lastUpdate = ref<number>(0)
  const lastHistoryRecord = ref<number>(0)
  
  // Tracking state
  let watchId: number | null = null
  let updateThrottle: ReturnType<typeof setTimeout> | null = null
  let providerId: string | null = null
  
  // Computed
  const hasLocation = computed(() => currentLocation.value !== null)
  const accuracy = computed(() => currentLocation.value?.accuracy ?? 0)
  const isAccurate = computed(() => accuracy.value > 0 && accuracy.value < 50) // < 50m
  
  /**
   * Start location tracking
   * Automatically updates provider_locations table
   */
  async function startTracking(): Promise<boolean> {
    if (isTracking.value) {
      console.warn('[ProviderLocation] Already tracking')
      return true
    }
    
    if (!navigator.geolocation) {
      error.value = 'Geolocation not supported'
      return false
    }
    
    try {
      // Get provider ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'Not authenticated'
        return false
      }
      
      const { data: provider } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (!provider) {
        error.value = 'Provider not found'
        return false
      }
      
      providerId = provider.id
      
      // Request permission and start watching
      watchId = navigator.geolocation.watchPosition(
        handleLocationUpdate,
        handleLocationError,
        {
          enableHighAccuracy: config.enableHighAccuracy,
          timeout: config.timeout,
          maximumAge: config.maxAge
        }
      )
      
      isTracking.value = true
      error.value = null
      
      console.log('[ProviderLocation] Tracking started')
      return true
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start tracking'
      error.value = message
      handleError(err, 'useProviderLocation.startTracking')
      return false
    }
  }
  
  /**
   * Stop location tracking
   */
  function stopTracking(): void {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
    
    if (updateThrottle) {
      clearTimeout(updateThrottle)
      updateThrottle = null
    }
    
    isTracking.value = false
    providerId = null
    
    console.log('[ProviderLocation] Tracking stopped')
  }
  
  /**
   * Handle location update from GPS
   */
  function handleLocationUpdate(position: GeolocationPosition): void {
    const now = Date.now()
    
    // Update current location
    currentLocation.value = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
      timestamp: position.timestamp
    }
    
    // Throttle database updates
    if (now - lastUpdate.value >= config.updateInterval) {
      updateProviderLocation(currentLocation.value)
      lastUpdate.value = now
    }
    
    // Record to history (less frequent)
    if (now - lastHistoryRecord.value >= config.historyInterval) {
      recordLocationHistory(currentLocation.value)
      lastHistoryRecord.value = now
    }
  }
  
  /**
   * Handle location error
   */
  function handleLocationError(err: GeolocationPositionError): void {
    const errorMessages: Record<number, string> = {
      1: 'Location permission denied',
      2: 'Location unavailable',
      3: 'Location timeout'
    }
    
    error.value = errorMessages[err.code] || 'Location error'
    console.warn('[ProviderLocation] Error:', error.value, err.message)
    
    // Don't stop tracking on temporary errors
    if (err.code === 2 || err.code === 3) {
      // Retry after delay
      if (updateThrottle) clearTimeout(updateThrottle)
      updateThrottle = setTimeout(() => {
        if (isTracking.value && watchId === null) {
          startTracking()
        }
      }, 5000)
    }
  }
  
  /**
   * Update provider location in database
   * Updates both providers_v2 and provider_locations tables
   */
  async function updateProviderLocation(location: LocationUpdate): Promise<void> {
    if (!providerId) return
    
    try {
      // Update current location in providers_v2
      const { error: updateError } = await supabase
        .from('providers_v2')
        .update({
          current_lat: location.latitude,
          current_lng: location.longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', providerId)
      
      if (updateError) {
        console.warn('[ProviderLocation] Update error:', updateError)
        return
      }
      
      // Upsert to provider_locations for realtime tracking
      const { error: locationError } = await supabase
        .from('provider_locations')
        .upsert({
          provider_id: providerId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'provider_id'
        })
      
      if (locationError) {
        console.warn('[ProviderLocation] Location table error:', locationError)
      }
      
    } catch (err) {
      console.warn('[ProviderLocation] Update failed:', err)
    }
  }
  
  /**
   * Record location to history
   * For analytics and route replay
   */
  async function recordLocationHistory(location: LocationUpdate): Promise<void> {
    if (!providerId) return
    
    try {
      const { error: historyError } = await supabase
        .from('provider_location_history')
        .insert({
          provider_id: providerId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: location.speed,
          heading: location.heading,
          recorded_at: new Date().toISOString()
        })
      
      if (historyError) {
        console.warn('[ProviderLocation] History error:', historyError)
      }
      
    } catch (err) {
      console.warn('[ProviderLocation] History failed:', err)
    }
  }
  
  /**
   * Get current position once (no tracking)
   */
  async function getCurrentPosition(): Promise<LocationUpdate | null> {
    if (!navigator.geolocation) {
      error.value = 'Geolocation not supported'
      return null
    }
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: config.enableHighAccuracy,
          timeout: config.timeout,
          maximumAge: config.maxAge
        })
      })
      
      const location: LocationUpdate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: position.timestamp
      }
      
      currentLocation.value = location
      return location
      
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        handleLocationError(err)
      }
      return null
    }
  }
  
  /**
   * Calculate distance to a point
   */
  function distanceTo(lat: number, lng: number): number | null {
    if (!currentLocation.value) return null
    
    return calculateDistance(
      currentLocation.value.latitude,
      currentLocation.value.longitude,
      lat,
      lng
    )
  }
  
  /**
   * Cleanup
   */
  function cleanup(): void {
    stopTracking()
    currentLocation.value = null
    error.value = null
  }
  
  // Cleanup on unmount
  onUnmounted(cleanup)
  
  return {
    // State
    currentLocation,
    isTracking,
    error,
    
    // Computed
    hasLocation,
    accuracy,
    isAccurate,
    
    // Methods
    startTracking,
    stopTracking,
    getCurrentPosition,
    distanceTo,
    cleanup
  }
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}
