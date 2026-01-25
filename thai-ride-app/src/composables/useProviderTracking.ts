/**
 * Provider Location Tracking Composable
 * ติดตามตำแหน่ง Provider แบบ Realtime
 */
import { ref, shallowRef, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'

export interface ProviderLocation {
  provider_id: string
  latitude: number
  longitude: number
  heading?: number
  speed?: number
  accuracy?: number
  updated_at: string
}

export function useProviderTracking(rideId: string) {
  const providerLocation = shallowRef<ProviderLocation | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isTracking = ref(false)

  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

  // Load initial provider location
  async function loadProviderLocation(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      // Query provider_location_history for the most recent location
       
      const { data, error: dbError } = await (supabase as any)
        .from('provider_location_history')
        .select('provider_id, latitude, longitude, heading, speed, accuracy, recorded_at')
        .eq('provider_id', rideId) // Note: This should actually query by provider_id from the ride
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (dbError) {
        console.error('[Tracking] Load error:', dbError)
        error.value = 'ไม่สามารถโหลดตำแหน่งได้'
        return
      }

      if (data) {
        providerLocation.value = {
          provider_id: data.provider_id,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading,
          speed: data.speed,
          accuracy: data.accuracy,
          updated_at: data.recorded_at
        }
      }

      // Setup realtime subscription
      setupRealtimeSubscription()

    } catch (err) {
      console.error('[Tracking] Exception:', err)
      error.value = 'เกิดข้อผิดพลาด'
    } finally {
      loading.value = false
    }
  }

  // Setup realtime subscription for location updates
  function setupRealtimeSubscription(): void {
    cleanupRealtimeSubscription()

    realtimeChannel = supabase
      .channel(`ride:${rideId}:tracking`)
      .on('broadcast', { event: 'location_updated' }, (payload) => {
        const location = payload.payload as ProviderLocation
        providerLocation.value = location
        isTracking.value = true
      })
      .subscribe((status) => {
        console.log('[Tracking] Realtime status:', status)
        if (status === 'SUBSCRIBED') {
          isTracking.value = true
        }
      })
  }

  // Cleanup subscription
  function cleanupRealtimeSubscription(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
    isTracking.value = false
  }

  // Calculate distance between two points
  function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Get distance to pickup point
  function getDistanceToPickup(pickupLat: number, pickupLng: number): number | null {
    if (!providerLocation.value) return null
    return calculateDistance(
      providerLocation.value.latitude,
      providerLocation.value.longitude,
      pickupLat,
      pickupLng
    )
  }

  // Estimate arrival time (rough estimate based on distance and speed)
  function getEstimatedArrival(pickupLat: number, pickupLng: number): number | null {
    const distance = getDistanceToPickup(pickupLat, pickupLng)
    if (distance === null) return null

    // Use provider's speed if available, otherwise assume 30 km/h average
    const speed = providerLocation.value?.speed || 30
    const timeInHours = distance / speed
    return Math.ceil(timeInHours * 60) // Return minutes
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cleanupRealtimeSubscription()
  })

  return {
    providerLocation,
    loading,
    error,
    isTracking,
    loadProviderLocation,
    cleanupRealtimeSubscription,
    calculateDistance,
    getDistanceToPickup,
    getEstimatedArrival
  }
}

// Composable for Provider to update their location
export function useLocationUpdater() {
  const updating = ref(false)
  const error = ref<string | null>(null)
  const providerId = ref<string | null>(null)

  let watchId: number | null = null

  // Initialize provider ID
  async function initProvider(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data, error: dbError } = await supabase
        .from('providers_v2')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (dbError || !data) {
        console.error('[LocationUpdater] Provider not found')
        return false
      }

      providerId.value = data.id
      return true
    } catch (err) {
      console.error('[LocationUpdater] Init error:', err)
      return false
    }
  }

  // Update location once
  async function updateLocation(
    rideId: string | null,
    latitude: number,
    longitude: number,
    heading?: number,
    speed?: number,
    accuracy?: number
  ): Promise<boolean> {
    if (!providerId.value) {
      const initialized = await initProvider()
      if (!initialized) return false
    }

    updating.value = true
    error.value = null

    try {
       
      const { error: dbError } = await (supabase as any).rpc('upsert_provider_location', {
        p_provider_id: providerId.value,
        p_ride_id: rideId,
        p_latitude: latitude,
        p_longitude: longitude,
        p_heading: heading || null,
        p_speed: speed || null,
        p_accuracy: accuracy || null
      })

      if (dbError) {
        console.error('[LocationUpdater] Update error:', dbError)
        error.value = 'ไม่สามารถอัพเดทตำแหน่งได้'
        return false
      }

      return true
    } catch (err) {
      console.error('[LocationUpdater] Exception:', err)
      error.value = 'เกิดข้อผิดพลาด'
      return false
    } finally {
      updating.value = false
    }
  }

  // Start continuous location tracking
  function startTracking(rideId: string | null): void {
    if (!navigator.geolocation) {
      error.value = 'ไม่รองรับ GPS'
      return
    }

    stopTracking()

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        updateLocation(
          rideId,
          position.coords.latitude,
          position.coords.longitude,
          position.coords.heading || undefined,
          position.coords.speed ? position.coords.speed * 3.6 : undefined, // Convert m/s to km/h
          position.coords.accuracy
        )
      },
      (err) => {
        console.error('[LocationUpdater] GPS error:', err.message)
        error.value = 'ไม่สามารถรับตำแหน่ง GPS ได้'
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    )
  }

  // Stop tracking
  function stopTracking(): void {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking()
  })

  return {
    updating,
    error,
    providerId,
    initProvider,
    updateLocation,
    startTracking,
    stopTracking
  }
}
