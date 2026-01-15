/**
 * Composable: useGeofencing
 * ตรวจจับและแจ้งเตือนเมื่อ provider เข้าใกล้จุดหมาย
 * 
 * Role Impact:
 * - Customer: รับ notification เมื่อคนขับใกล้ถึง
 * - Provider: ไม่มีผลกระทบ
 * - Admin: ดู geofence events ใน logs
 */
import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'

interface Location {
  lat: number
  lng: number
}

interface GeofenceZone {
  center: Location
  radius: number // meters
  name: string
}

interface GeofenceEvent {
  zone: string
  type: 'enter' | 'exit'
  timestamp: number
  distance: number
}

interface GeofenceOptions {
  checkInterval?: number // ms
  enableNotifications?: boolean
  enableHaptic?: boolean
}

const DEFAULT_OPTIONS: Required<GeofenceOptions> = {
  checkInterval: 3000, // Check every 3 seconds
  enableNotifications: true,
  enableHaptic: true
}

// Predefined zones
const ZONE_PRESETS = {
  VERY_CLOSE: 100, // 100m
  NEARBY: 300, // 300m
  APPROACHING: 500, // 500m
  AREA: 1000 // 1km
}

export function useGeofencing(
  currentLocation: Ref<Location | null>,
  zones: Ref<GeofenceZone[]>,
  options: GeofenceOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  const events = ref<GeofenceEvent[]>([])
  const activeZones = ref<Set<string>>(new Set())
  const lastCheck = ref<number>(0)
  let checkIntervalId: ReturnType<typeof setInterval> | null = null

  // Calculate distance between two points (Haversine)
  function calculateDistance(from: Location, to: Location): number {
    const R = 6371000 // Earth radius in meters
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

  // Check if location is inside zone
  function isInsideZone(location: Location, zone: GeofenceZone): boolean {
    const distance = calculateDistance(location, zone.center)
    return distance <= zone.radius
  }

  // Trigger notification
  function triggerNotification(event: GeofenceEvent): void {
    if (!config.enableNotifications) return

    const messages: Record<string, string> = {
      'very-close': '🚗 คนขับมาถึงแล้ว! (ใกล้มากๆ)',
      'nearby': '🚗 คนขับใกล้ถึงแล้ว (300 ม.)',
      'approaching': '🚗 คนขับกำลังมา (500 ม.)',
      'area': '📍 คนขับเข้าพื้นที่แล้ว (1 กม.)'
    }

    const message = messages[event.zone] || `คนขับ${event.type === 'enter' ? 'เข้า' : 'ออก'}จาก ${event.zone}`

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Thai Ride', {
        body: message,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `geofence-${event.zone}`,
        requireInteraction: event.zone === 'very-close'
      })
    }

    // Haptic feedback
    if (config.enableHaptic && 'vibrate' in navigator) {
      if (event.zone === 'very-close') {
        navigator.vibrate([100, 50, 100, 50, 100]) // Strong pattern
      } else if (event.zone === 'nearby') {
        navigator.vibrate([100, 50, 100]) // Medium pattern
      } else {
        navigator.vibrate(100) // Single vibration
      }
    }

    console.log('[Geofencing] Notification:', message)
  }

  // Add event
  function addEvent(zone: string, type: 'enter' | 'exit', distance: number): void {
    const event: GeofenceEvent = {
      zone,
      type,
      timestamp: Date.now(),
      distance
    }

    events.value.push(event)
    
    // Keep only last 20 events
    if (events.value.length > 20) {
      events.value = events.value.slice(-20)
    }

    // Trigger notification for enter events
    if (type === 'enter') {
      triggerNotification(event)
    }

    console.log('[Geofencing] Event:', event)
  }

  // Check zones
  function checkZones(): void {
    if (!currentLocation.value || zones.value.length === 0) return

    const now = Date.now()
    if (now - lastCheck.value < config.checkInterval) return

    lastCheck.value = now

    for (const zone of zones.value) {
      const isInside = isInsideZone(currentLocation.value, zone)
      const wasInside = activeZones.value.has(zone.name)
      const distance = calculateDistance(currentLocation.value, zone.center)

      if (isInside && !wasInside) {
        // Entered zone
        activeZones.value.add(zone.name)
        addEvent(zone.name, 'enter', distance)
      } else if (!isInside && wasInside) {
        // Exited zone
        activeZones.value.delete(zone.name)
        addEvent(zone.name, 'exit', distance)
      }
    }
  }

  // Start monitoring
  function startMonitoring(): void {
    if (checkIntervalId) return

    checkIntervalId = setInterval(() => {
      checkZones()
    }, config.checkInterval)

    console.log('[Geofencing] Monitoring started')
  }

  // Stop monitoring
  function stopMonitoring(): void {
    if (checkIntervalId) {
      clearInterval(checkIntervalId)
      checkIntervalId = null
      console.log('[Geofencing] Monitoring stopped')
    }
  }

  // Request notification permission
  async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false

    if (Notification.permission === 'granted') return true

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  // Watch for location changes
  watch(currentLocation, () => {
    checkZones()
  }, { deep: true })

  // Auto-start monitoring when zones are available
  watch(zones, (newZones) => {
    if (newZones.length > 0) {
      startMonitoring()
    } else {
      stopMonitoring()
    }
  }, { immediate: true })

  // Computed values
  const isInAnyZone = computed(() => activeZones.value.size > 0)
  
  const closestZone = computed(() => {
    if (!currentLocation.value || zones.value.length === 0) return null

    let closest: { zone: GeofenceZone; distance: number } | null = null

    for (const zone of zones.value) {
      const distance = calculateDistance(currentLocation.value, zone.center)
      if (!closest || distance < closest.distance) {
        closest = { zone, distance }
      }
    }

    return closest
  })

  const recentEvents = computed(() => 
    events.value.slice(-5).reverse()
  )

  return {
    events,
    recentEvents,
    activeZones: computed(() => Array.from(activeZones.value)),
    isInAnyZone,
    closestZone,
    startMonitoring,
    stopMonitoring,
    requestNotificationPermission,
    ZONE_PRESETS
  }
}
