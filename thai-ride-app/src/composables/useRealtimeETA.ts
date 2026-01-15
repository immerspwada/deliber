/**
 * Composable: useRealtimeETA
 * คำนวณ ETA แบบ realtime จากตำแหน่งคนขับ
 * 
 * Role Impact:
 * - Customer: เห็น ETA ที่แม่นยำขึ้นตามตำแหน่งจริง
 * - Provider: ไม่มีผลกระทบ (ใช้ข้อมูลเดิม)
 * - Admin: ดู ETA ใน tracking dashboard
 */
import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'

interface Location {
  lat: number
  lng: number
}

interface ETAResult {
  minutes: number
  distance: number // km
  formattedETA: string
  formattedDistance: string
}

// Average speeds (km/h) based on traffic conditions
const SPEED_CONFIG = {
  highway: 80,
  urban: 40,
  congested: 20,
  default: 35
}

export function useRealtimeETA(
  driverLocation: Ref<Location | null>,
  targetLocation: Ref<Location | null>
) {
  const eta = ref<ETAResult | null>(null)
  const isCalculating = ref(false)
  const lastCalculation = ref<number>(0)
  const calculationInterval = 5000 // Recalculate every 5 seconds

  // Haversine formula for distance calculation
  function calculateDistance(from: Location, to: Location): number {
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

  // Estimate speed based on distance (simple heuristic)
  function estimateSpeed(distance: number): number {
    if (distance > 10) return SPEED_CONFIG.highway
    if (distance > 3) return SPEED_CONFIG.urban
    if (distance > 0.5) return SPEED_CONFIG.congested
    return SPEED_CONFIG.default
  }

  // Calculate ETA using OSRM routing service
  async function calculateETAWithRouting(from: Location, to: Location): Promise<ETAResult | null> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (!response.ok) throw new Error('Routing failed')
      
      const data = await response.json()
      
      if (data.code === 'Ok' && data.routes[0]) {
        const route = data.routes[0]
        const distance = route.distance / 1000 // meters to km
        const duration = route.duration / 60 // seconds to minutes
        
        return {
          minutes: Math.ceil(duration),
          distance,
          formattedETA: formatMinutes(Math.ceil(duration)),
          formattedDistance: formatDistance(distance)
        }
      }
      
      return null
    } catch {
      // Fallback to straight-line calculation
      return null
    }
  }

  // Fallback: Calculate ETA using straight-line distance
  function calculateETAStraightLine(from: Location, to: Location): ETAResult {
    const distance = calculateDistance(from, to)
    const speed = estimateSpeed(distance)
    const minutes = Math.ceil((distance / speed) * 60)
    
    return {
      minutes,
      distance,
      formattedETA: formatMinutes(minutes),
      formattedDistance: formatDistance(distance)
    }
  }

  function formatMinutes(minutes: number): string {
    if (minutes < 1) return 'น้อยกว่า 1 นาที'
    if (minutes === 1) return '1 นาที'
    if (minutes < 60) return `${minutes} นาที`
    
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} ชั่วโมง`
    return `${hours} ชม. ${mins} นาที`
  }

  function formatDistance(km: number): string {
    if (km < 0.1) return `${Math.round(km * 1000)} ม.`
    if (km < 1) return `${Math.round(km * 100) / 100} กม.`
    return `${Math.round(km * 10) / 10} กม.`
  }

  // Main calculation function
  async function calculateETA(): Promise<void> {
    if (!driverLocation.value || !targetLocation.value) {
      eta.value = null
      return
    }

    // Throttle calculations
    const now = Date.now()
    if (now - lastCalculation.value < calculationInterval) {
      return
    }

    isCalculating.value = true
    lastCalculation.value = now

    try {
      // Try routing service first
      const routingETA = await calculateETAWithRouting(
        driverLocation.value,
        targetLocation.value
      )

      if (routingETA) {
        eta.value = routingETA
        console.log('[RealtimeETA] Calculated with routing:', routingETA)
      } else {
        // Fallback to straight-line
        eta.value = calculateETAStraightLine(
          driverLocation.value,
          targetLocation.value
        )
        console.log('[RealtimeETA] Calculated straight-line:', eta.value)
      }
    } catch (error) {
      console.warn('[RealtimeETA] Calculation error:', error)
      // Use straight-line as final fallback
      eta.value = calculateETAStraightLine(
        driverLocation.value,
        targetLocation.value
      )
    } finally {
      isCalculating.value = false
    }
  }

  // Watch for location changes
  watch([driverLocation, targetLocation], () => {
    calculateETA()
  }, { deep: true })

  // Computed values for easy access
  const etaMinutes = computed(() => eta.value?.minutes ?? null)
  const etaDistance = computed(() => eta.value?.distance ?? null)
  const etaText = computed(() => eta.value?.formattedETA ?? null)
  const distanceText = computed(() => eta.value?.formattedDistance ?? null)

  // Check if driver is very close (< 100m)
  const isDriverNearby = computed(() => {
    if (!eta.value) return false
    return eta.value.distance < 0.1
  })

  // Check if driver is approaching (< 500m)
  const isDriverApproaching = computed(() => {
    if (!eta.value) return false
    return eta.value.distance < 0.5
  })

  return {
    eta,
    etaMinutes,
    etaDistance,
    etaText,
    distanceText,
    isCalculating,
    isDriverNearby,
    isDriverApproaching,
    calculateETA
  }
}
