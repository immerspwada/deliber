/**
 * ETA (Estimated Time of Arrival) Composable
 * คำนวณเวลาโดยประมาณถึงจุดหมาย
 */
import { ref, computed, onUnmounted } from 'vue'

interface ETAResult {
  minutes: number
  distance: number // km
  formattedTime: string
  formattedDistance: string
}

export function useETA() {
  const eta = ref<ETAResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  let watchId: number | null = null
  let updateInterval: ReturnType<typeof setInterval> | null = null

  // Average speed assumptions (km/h)
  const SPEED_CITY = 25 // Bangkok traffic
  const SPEED_HIGHWAY = 60
  const SPEED_WALKING = 5

  /**
   * Calculate distance between two points using Haversine formula
   */
  function calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371 // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  /**
   * Estimate travel time based on distance
   * Uses simple heuristic: shorter distances = slower (city), longer = faster (highway)
   */
  function estimateTravelTime(distanceKm: number): number {
    if (distanceKm < 2) {
      // Very short distance - city traffic
      return (distanceKm / SPEED_CITY) * 60
    } else if (distanceKm < 10) {
      // Medium distance - mixed traffic
      const avgSpeed = (SPEED_CITY + SPEED_HIGHWAY) / 2
      return (distanceKm / avgSpeed) * 60
    } else {
      // Long distance - assume some highway
      return (distanceKm / SPEED_HIGHWAY) * 60
    }
  }

  /**
   * Format minutes to readable string
   */
  function formatMinutes(minutes: number): string {
    if (minutes < 1) return 'น้อยกว่า 1 นาที'
    if (minutes < 60) return `${Math.round(minutes)} นาที`
    
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    
    if (mins === 0) return `${hours} ชั่วโมง`
    return `${hours} ชม. ${mins} นาที`
  }

  /**
   * Format distance to readable string
   */
  function formatDistance(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} ม.`
    return `${km.toFixed(1)} กม.`
  }

  /**
   * Calculate ETA from current position to destination
   */
  function calculateETA(
    currentLat: number, currentLng: number,
    destLat: number, destLng: number
  ): ETAResult {
    const distance = calculateDistance(currentLat, currentLng, destLat, destLng)
    const minutes = estimateTravelTime(distance)
    
    return {
      minutes,
      distance,
      formattedTime: formatMinutes(minutes),
      formattedDistance: formatDistance(distance)
    }
  }

  /**
   * Start tracking ETA with live location updates
   */
  function startTracking(destLat: number, destLng: number): void {
    if (!navigator.geolocation) {
      error.value = 'ไม่รองรับ GPS'
      return
    }

    loading.value = true
    error.value = null

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        eta.value = calculateETA(
          pos.coords.latitude, pos.coords.longitude,
          destLat, destLng
        )
        loading.value = false
      },
      (err) => {
        console.warn('[ETA] Initial position error:', err.message)
        error.value = 'ไม่สามารถระบุตำแหน่งได้'
        loading.value = false
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )

    // Watch position for updates
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        eta.value = calculateETA(
          pos.coords.latitude, pos.coords.longitude,
          destLat, destLng
        )
      },
      (err) => {
        console.warn('[ETA] Watch position error:', err.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }

  /**
   * Update ETA with specific coordinates (manual update)
   */
  function updateETA(
    currentLat: number, currentLng: number,
    destLat: number, destLng: number
  ): void {
    eta.value = calculateETA(currentLat, currentLng, destLat, destLng)
  }

  /**
   * Stop tracking
   */
  function stopTracking(): void {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
    if (updateInterval !== null) {
      clearInterval(updateInterval)
      updateInterval = null
    }
  }

  /**
   * Get arrival time (current time + ETA)
   */
  const arrivalTime = computed(() => {
    if (!eta.value) return null
    const arrival = new Date()
    arrival.setMinutes(arrival.getMinutes() + eta.value.minutes)
    return arrival.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  })

  // Cleanup on unmount
  onUnmounted(() => {
    stopTracking()
  })

  return {
    eta,
    loading,
    error,
    arrivalTime,
    calculateETA,
    startTracking,
    updateETA,
    stopTracking,
    formatMinutes,
    formatDistance
  }
}
