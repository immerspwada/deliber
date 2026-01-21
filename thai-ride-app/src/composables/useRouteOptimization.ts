/**
 * useRouteOptimization - Route Optimization System
 * Feature: F204 - Route Optimization
 */

import { ref } from 'vue'

export interface RoutePoint {
  lat: number
  lng: number
  address?: string
  type: 'pickup' | 'dropoff' | 'waypoint'
}

export interface OptimizedRoute {
  points: RoutePoint[]
  total_distance: number
  total_duration: number
  savings_distance?: number
}

export function useRouteOptimization() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const optimizedRoute = ref<OptimizedRoute | null>(null)

  const optimizeRoute = async (points: RoutePoint[]): Promise<OptimizedRoute | null> => {
    if (points.length < 2) return null
    loading.value = true
    try {
      const pickup = points.find(p => p.type === 'pickup')!
      const dropoffs = points.filter(p => p.type !== 'pickup')
      const ordered: RoutePoint[] = [pickup]
      const remaining = [...dropoffs]
      
      while (remaining.length > 0) {
        const last = ordered[ordered.length - 1]
        let nearestIdx = 0
        let nearestDist = Infinity
        remaining.forEach((p, i) => {
          const dist = haversineDistance(last.lat, last.lng, p.lat, p.lng)
          if (dist < nearestDist) { nearestDist = dist; nearestIdx = i }
        })
        ordered.push(remaining.splice(nearestIdx, 1)[0])
      }

      const totalDist = calculateTotalDistance(ordered)
      const originalDist = calculateTotalDistance(points)
      optimizedRoute.value = { points: ordered, total_distance: totalDist, total_duration: Math.round(totalDist / 30 * 60), savings_distance: originalDist - totalDist }
      return optimizedRoute.value
    } catch (e: any) { error.value = e.message; return null }
    finally { loading.value = false }
  }

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const calculateTotalDistance = (points: RoutePoint[]): number => {
    let total = 0
    for (let i = 1; i < points.length; i++) total += haversineDistance(points[i-1].lat, points[i-1].lng, points[i].lat, points[i].lng)
    return total
  }

  return { loading, error, optimizedRoute, optimizeRoute, haversineDistance, calculateTotalDistance }
}
