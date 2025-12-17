/**
 * Feature: F34 - Geofencing Alert for Providers
 * 
 * ระบบแจ้งเตือนเมื่อ Provider ออกนอกพื้นที่ให้บริการ
 * - พื้นที่ให้บริการ: อำเภอสุไหงโกลก จังหวัดนราธิวาส
 * - แจ้งเตือนเมื่อออกนอกพื้นที่
 * - แจ้งเตือนเมื่อกลับเข้าพื้นที่
 */

import { ref, computed } from 'vue'
import { useToast } from './useToast'

// Su-ngai Kolok service area bounds
export const SERVICE_AREA = {
  name: 'อำเภอสุไหงโกลก',
  center: { lat: 6.0282, lng: 101.9654 },
  // Approximate bounds for Su-ngai Kolok district
  bounds: {
    north: 6.08,
    south: 5.97,
    east: 102.05,
    west: 101.88
  },
  // Radius in km from center (for circular check)
  radiusKm: 8
}

export interface GeofenceStatus {
  isInsideServiceArea: boolean
  distanceFromCenter: number
  lastCheck: Date
  warningShown: boolean
}

export function useGeofencing() {
  const status = ref<GeofenceStatus>({
    isInsideServiceArea: true,
    distanceFromCenter: 0,
    lastCheck: new Date(),
    warningShown: false
  })

  const toast = useToast()

  // Calculate distance using Haversine formula
  const calculateDistance = (
    lat1: number, lng1: number,
    lat2: number, lng2: number
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

  const toRad = (deg: number): number => deg * (Math.PI / 180)

  // Check if point is inside rectangular bounds
  const isInsideBounds = (lat: number, lng: number): boolean => {
    const { bounds } = SERVICE_AREA
    return (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    )
  }

  // Check if point is inside circular service area
  const isInsideRadius = (lat: number, lng: number): boolean => {
    const distance = calculateDistance(
      lat, lng,
      SERVICE_AREA.center.lat,
      SERVICE_AREA.center.lng
    )
    return distance <= SERVICE_AREA.radiusKm
  }

  // Check if location is inside service area (uses both bounds and radius)
  const checkLocation = (lat: number, lng: number): boolean => {
    const distance = calculateDistance(
      lat, lng,
      SERVICE_AREA.center.lat,
      SERVICE_AREA.center.lng
    )

    const wasInside = status.value.isInsideServiceArea
    const isInside = isInsideBounds(lat, lng) || isInsideRadius(lat, lng)

    status.value = {
      isInsideServiceArea: isInside,
      distanceFromCenter: distance,
      lastCheck: new Date(),
      warningShown: status.value.warningShown
    }

    // Show warning when leaving service area
    if (wasInside && !isInside && !status.value.warningShown) {
      showOutsideAreaWarning(distance)
      status.value.warningShown = true
    }

    // Reset warning when returning to service area
    if (!wasInside && isInside && status.value.warningShown) {
      showReturnedToAreaNotice()
      status.value.warningShown = false
    }

    return isInside
  }

  // Play alert sound
  const playAlertSound = (type: 'warning' | 'success') => {
    try {
      // Create audio context for generating tones
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) return

      const audioCtx = new AudioContext()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      if (type === 'warning') {
        // Warning: Two-tone alert (high-low-high)
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15) // A4
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3) // A5
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5)
        oscillator.start(audioCtx.currentTime)
        oscillator.stop(audioCtx.currentTime + 0.5)
      } else {
        // Success: Pleasant ascending tone
        oscillator.frequency.setValueAtTime(523, audioCtx.currentTime) // C5
        oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1) // E5
        oscillator.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2) // G5
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
        oscillator.start(audioCtx.currentTime)
        oscillator.stop(audioCtx.currentTime + 0.4)
      }
    } catch {
      // Audio not supported, ignore
    }
  }

  // Show warning toast when outside service area
  const showOutsideAreaWarning = (distance: number) => {
    toast.warning(
      `คุณออกนอกพื้นที่ให้บริการ (${SERVICE_AREA.name}) ห่างจากศูนย์กลาง ${distance.toFixed(1)} กม.`,
      5000
    )

    // Play warning sound
    playAlertSound('warning')

    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }
  }

  // Show notice when returned to service area
  const showReturnedToAreaNotice = () => {
    toast.success('คุณกลับเข้าสู่พื้นที่ให้บริการแล้ว', 3000)
    
    // Play success sound
    playAlertSound('success')
  }

  // Get distance to service area center
  const getDistanceToCenter = (lat: number, lng: number): number => {
    return calculateDistance(
      lat, lng,
      SERVICE_AREA.center.lat,
      SERVICE_AREA.center.lng
    )
  }

  // Get direction to service area center
  const getDirectionToCenter = (lat: number, lng: number): string => {
    const dLat = SERVICE_AREA.center.lat - lat
    const dLng = SERVICE_AREA.center.lng - lng

    if (Math.abs(dLat) > Math.abs(dLng)) {
      return dLat > 0 ? 'เหนือ' : 'ใต้'
    } else {
      return dLng > 0 ? 'ตะวันออก' : 'ตะวันตก'
    }
  }

  // Computed: is currently inside service area
  const isInsideServiceArea = computed(() => status.value.isInsideServiceArea)

  // Computed: distance from center
  const distanceFromCenter = computed(() => status.value.distanceFromCenter)

  return {
    status,
    isInsideServiceArea,
    distanceFromCenter,
    checkLocation,
    getDistanceToCenter,
    getDirectionToCenter,
    SERVICE_AREA
  }
}
