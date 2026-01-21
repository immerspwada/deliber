/**
 * Composable: useLocationHistory
 * จัดการ location history trail ของ provider
 * 
 * Role Impact:
 * - Customer: เห็นเส้นทางที่คนขับเคลื่อนที่มา
 * - Provider: ไม่มีผลกระทบ (ระบบบันทึกอัตโนมัติ)
 * - Admin: ดู trail history ใน monitoring dashboard
 */
import { ref, computed, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { supabase } from '../lib/supabase'

interface LocationPoint {
  lat: number
  lng: number
  timestamp: number
  heading?: number
  speed?: number
}

interface LocationHistoryOptions {
  maxPoints?: number
  minDistance?: number // Minimum distance (km) between points to record
  maxAge?: number // Maximum age (ms) of points to keep
}

const DEFAULT_OPTIONS: Required<LocationHistoryOptions> = {
  maxPoints: 50,
  minDistance: 0.05, // 50 meters
  maxAge: 30 * 60 * 1000 // 30 minutes
}

export function useLocationHistory(
  providerId: Ref<string | null>,
  options: LocationHistoryOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  const history = ref<LocationPoint[]>([])
  const isLoading = ref(false)
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

  // Calculate distance between two points (Haversine)
  function calculateDistance(from: LocationPoint, to: LocationPoint): number {
    const R = 6371 // Earth radius in km
    const dLat = toRad(to.lat - from.lat)
    const dLng = toRad(to.lng - from.lng)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  function toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Add new location point
  function addPoint(point: LocationPoint): void {
    const now = Date.now()
    
    // Check if point is too close to last point
    if (history.value.length > 0) {
      const lastPoint = history.value[history.value.length - 1]
      const distance = calculateDistance(lastPoint, point)
      
      if (distance < config.minDistance) {
        console.log('[LocationHistory] Point too close, skipping')
        return
      }
    }

    // Add point
    history.value.push(point)
    console.log('[LocationHistory] Point added:', point, 'Total:', history.value.length)

    // Remove old points
    history.value = history.value.filter(p => now - p.timestamp < config.maxAge)

    // Limit number of points
    if (history.value.length > config.maxPoints) {
      history.value = history.value.slice(-config.maxPoints)
    }
  }

  // Load historical locations from database
  async function loadHistory(): Promise<void> {
    if (!providerId.value) return

    isLoading.value = true
    try {
      const cutoffTime = new Date(Date.now() - config.maxAge).toISOString()
      
      // Type for location history record
      interface LocationRecord {
        latitude: number
        longitude: number
        heading: number | null
        speed: number | null
        recorded_at: string
      }
      
      const { data, error } = await supabase
        .from('provider_location_history')
        .select('latitude, longitude, heading, speed, recorded_at')
        .eq('provider_id', providerId.value)
        .gte('recorded_at', cutoffTime)
        .order('recorded_at', { ascending: true })
        .limit(config.maxPoints)

      if (error) throw error

      if (data && data.length > 0) {
        const records = data as unknown as LocationRecord[]
        history.value = records.map(loc => ({
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
          heading: loc.heading ? Number(loc.heading) : undefined,
          speed: loc.speed ? Number(loc.speed) : undefined,
          timestamp: new Date(loc.recorded_at).getTime()
        }))
        
        console.log('[LocationHistory] Loaded', history.value.length, 'points')
      }
    } catch (error) {
      console.error('[LocationHistory] Load error:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Subscribe to realtime location updates
  function subscribeToUpdates(): void {
    if (!providerId.value) return

    realtimeChannel = supabase
      .channel(`location-history-${providerId.value}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'provider_location_history',
        filter: `provider_id=eq.${providerId.value}`
      }, (payload) => {
        const loc = payload.new as Record<string, unknown>
        addPoint({
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
          heading: loc.heading ? Number(loc.heading) : undefined,
          speed: loc.speed ? Number(loc.speed) : undefined,
          timestamp: new Date(String(loc.recorded_at)).getTime()
        })
      })
      .subscribe()

    console.log('[LocationHistory] Subscribed to updates')
  }

  // Unsubscribe from updates
  function unsubscribe(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
      console.log('[LocationHistory] Unsubscribed')
    }
  }

  // Clear history
  function clearHistory(): void {
    history.value = []
  }

  // Watch provider ID changes
  watch(providerId, (newId, oldId) => {
    if (newId !== oldId) {
      clearHistory()
      unsubscribe()
      
      if (newId) {
        loadHistory()
        subscribeToUpdates()
      }
    }
  }, { immediate: true })

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe()
  })

  // Computed values
  const hasHistory = computed(() => history.value.length > 0)
  
  const totalDistance = computed(() => {
    if (history.value.length < 2) return 0
    
    let total = 0
    for (let i = 1; i < history.value.length; i++) {
      total += calculateDistance(history.value[i - 1], history.value[i])
    }
    return total
  })

  const averageSpeed = computed(() => {
    const speeds = history.value
      .map(p => p.speed)
      .filter((s): s is number => s !== undefined && s > 0)
    
    if (speeds.length === 0) return null
    return speeds.reduce((sum, s) => sum + s, 0) / speeds.length
  })

  // Get coordinates for drawing polyline
  const coordinates = computed(() => 
    history.value.map(p => ({ lat: p.lat, lng: p.lng }))
  )

  return {
    history,
    coordinates,
    isLoading,
    hasHistory,
    totalDistance,
    averageSpeed,
    addPoint,
    loadHistory,
    clearHistory
  }
}
