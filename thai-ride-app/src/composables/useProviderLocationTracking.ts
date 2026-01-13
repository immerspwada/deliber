/**
 * Provider Location Tracking Composable
 * - Updates providers_v2.current_lat/current_lng in real-time
 * - Records location history to provider_location_history (throttled)
 */

import { ref, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number | null
  speed: number | null
  heading: number | null
  timestamp: number
}

interface UseProviderLocationTrackingOptions {
  /** Interval for recording to history table (ms) - default 60s */
  historyInterval?: number
  /** High accuracy mode - default true */
  enableHighAccuracy?: boolean
  /** Max age of cached position (ms) - default 30s */
  maximumAge?: number
  /** Timeout for position request (ms) - default 10s */
  timeout?: number
}

const DEFAULT_OPTIONS: Required<UseProviderLocationTrackingOptions> = {
  historyInterval: 60_000, // Record history every 60 seconds
  enableHighAccuracy: true,
  maximumAge: 30_000,
  timeout: 10_000,
}

export function useProviderLocationTracking(options: UseProviderLocationTrackingOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  const isTracking = ref(false)
  const currentLocation = ref<LocationData | null>(null)
  const error = ref<string | null>(null)
  const lastHistoryRecord = ref<number>(0)
  
  let watchId: number | null = null
  let providerId: string | null = null

  /**
   * Start location tracking for a provider
   */
  async function startTracking(providerIdParam: string): Promise<boolean> {
    if (isTracking.value) {
      console.warn('[LocationTracking] Already tracking')
      return true
    }

    if (!navigator.geolocation) {
      error.value = 'Geolocation ไม่รองรับบนอุปกรณ์นี้'
      return false
    }

    providerId = providerIdParam
    error.value = null

    try {
      // Request permission first
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      if (permission.state === 'denied') {
        error.value = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง'
        return false
      }

      watchId = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        handlePositionError,
        {
          enableHighAccuracy: config.enableHighAccuracy,
          maximumAge: config.maximumAge,
          timeout: config.timeout,
        }
      )

      isTracking.value = true
      console.log('[LocationTracking] Started for provider:', providerId)
      return true
    } catch (err) {
      console.error('[LocationTracking] Start failed:', err)
      error.value = 'ไม่สามารถเริ่มติดตามตำแหน่งได้'
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
    isTracking.value = false
    providerId = null
    console.log('[LocationTracking] Stopped')
  }

  /**
   * Handle position update from Geolocation API
   */
  async function handlePositionUpdate(position: GeolocationPosition): Promise<void> {
    if (!providerId) return

    const { latitude, longitude, accuracy, speed, heading } = position.coords
    const timestamp = position.timestamp

    currentLocation.value = {
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      timestamp,
    }

    // Update providers_v2 current location (every update)
    await updateProviderLocation(latitude, longitude)

    // Record to history (throttled)
    const now = Date.now()
    if (now - lastHistoryRecord.value >= config.historyInterval) {
      await recordLocationHistory(latitude, longitude, accuracy, speed, heading)
      lastHistoryRecord.value = now
    }
  }

  /**
   * Handle geolocation error
   */
  function handlePositionError(err: GeolocationPositionError): void {
    console.warn('[LocationTracking] Error:', err.message)
    
    switch (err.code) {
      case err.PERMISSION_DENIED:
        error.value = 'การเข้าถึงตำแหน่งถูกปฏิเสธ'
        stopTracking()
        break
      case err.POSITION_UNAVAILABLE:
        error.value = 'ไม่สามารถระบุตำแหน่งได้'
        break
      case err.TIMEOUT:
        error.value = 'หมดเวลาในการระบุตำแหน่ง'
        break
    }
  }

  /**
   * Update provider's current location in providers_v2
   */
  async function updateProviderLocation(lat: number, lng: number): Promise<void> {
    if (!providerId) return

    try {
      const { error: updateError } = await supabase
        .from('providers_v2')
        .update({
          current_lat: lat,
          current_lng: lng,
          updated_at: new Date().toISOString(),
        })
        .eq('id', providerId)

      if (updateError) {
        console.warn('[LocationTracking] Update failed:', updateError.message)
      }
    } catch (err) {
      console.warn('[LocationTracking] Update error:', err)
    }
  }

  /**
   * Record location to history table
   */
  async function recordLocationHistory(
    lat: number,
    lng: number,
    accuracy: number | null,
    speed: number | null,
    heading: number | null
  ): Promise<void> {
    if (!providerId) return

    try {
      // Use type assertion since provider_location_history may not be in generated types yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('provider_location_history')
        .insert({
          provider_id: providerId,
          latitude: lat,
          longitude: lng,
          accuracy,
          speed,
          heading,
          recorded_at: new Date().toISOString(),
        })

      if (insertError) {
        console.warn('[LocationTracking] History insert failed:', insertError.message)
      } else {
        console.log('[LocationTracking] History recorded')
      }
    } catch (err) {
      console.warn('[LocationTracking] History error:', err)
    }
  }

  /**
   * Force record current location to history (manual trigger)
   */
  async function forceRecordHistory(): Promise<boolean> {
    if (!currentLocation.value || !providerId) return false

    const { latitude, longitude, accuracy, speed, heading } = currentLocation.value
    await recordLocationHistory(latitude, longitude, accuracy, speed, heading)
    lastHistoryRecord.value = Date.now()
    return true
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking()
  })

  return {
    // State
    isTracking,
    currentLocation,
    error,
    // Actions
    startTracking,
    stopTracking,
    forceRecordHistory,
  }
}
