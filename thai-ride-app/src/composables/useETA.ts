/**
 * Feature: F45 - ETA Calculator
 * 
 * ระบบคำนวณเวลาถึงโดยประมาณ
 * - คำนวณ ETA จากระยะทางและสภาพจราจร
 * - ปรับตาม time of day
 * - รองรับ realtime updates
 */

import { ref } from 'vue'

export interface ETAResult {
  minutes: number
  distance: number // km
  trafficLevel: 'light' | 'moderate' | 'heavy'
  confidence: number // 0-100
}

export interface TrafficCondition {
  hour: number
  multiplier: number
  level: 'light' | 'moderate' | 'heavy'
}

// Bangkok traffic patterns by hour
const TRAFFIC_PATTERNS: TrafficCondition[] = [
  { hour: 0, multiplier: 1.0, level: 'light' },
  { hour: 1, multiplier: 1.0, level: 'light' },
  { hour: 2, multiplier: 1.0, level: 'light' },
  { hour: 3, multiplier: 1.0, level: 'light' },
  { hour: 4, multiplier: 1.0, level: 'light' },
  { hour: 5, multiplier: 1.1, level: 'light' },
  { hour: 6, multiplier: 1.3, level: 'moderate' },
  { hour: 7, multiplier: 1.8, level: 'heavy' },
  { hour: 8, multiplier: 2.0, level: 'heavy' },
  { hour: 9, multiplier: 1.6, level: 'heavy' },
  { hour: 10, multiplier: 1.3, level: 'moderate' },
  { hour: 11, multiplier: 1.2, level: 'moderate' },
  { hour: 12, multiplier: 1.4, level: 'moderate' },
  { hour: 13, multiplier: 1.3, level: 'moderate' },
  { hour: 14, multiplier: 1.2, level: 'moderate' },
  { hour: 15, multiplier: 1.3, level: 'moderate' },
  { hour: 16, multiplier: 1.5, level: 'heavy' },
  { hour: 17, multiplier: 1.9, level: 'heavy' },
  { hour: 18, multiplier: 2.0, level: 'heavy' },
  { hour: 19, multiplier: 1.7, level: 'heavy' },
  { hour: 20, multiplier: 1.4, level: 'moderate' },
  { hour: 21, multiplier: 1.2, level: 'moderate' },
  { hour: 22, multiplier: 1.1, level: 'light' },
  { hour: 23, multiplier: 1.0, level: 'light' }
]

// Average speed in Bangkok (km/h) without traffic
const BASE_SPEED = 35

export function useETA() {
  const currentETA = ref<ETAResult | null>(null)
  const isCalculating = ref(false)

  // Calculate distance between two points (Haversine)
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

  // Get current traffic condition
  const getCurrentTraffic = (): TrafficCondition => {
    const hour = new Date().getHours()
    return TRAFFIC_PATTERNS[hour] || TRAFFIC_PATTERNS[0]!
  }

  // Calculate ETA
  const calculateETA = (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    customTime?: Date
  ): ETAResult => {
    isCalculating.value = true

    try {
      // Calculate straight-line distance
      const straightDistance = calculateDistance(fromLat, fromLng, toLat, toLng)
      
      // Add 30% for road routing (roads aren't straight)
      const roadDistance = straightDistance * 1.3

      // Get traffic condition
      const hour = customTime ? customTime.getHours() : new Date().getHours()
      const traffic = TRAFFIC_PATTERNS[hour] || TRAFFIC_PATTERNS[0]!

      // Calculate time with traffic
      const effectiveSpeed = BASE_SPEED / traffic.multiplier
      const timeHours = roadDistance / effectiveSpeed
      const timeMinutes = Math.ceil(timeHours * 60)

      // Calculate confidence based on distance and traffic
      let confidence = 85
      if (roadDistance > 20) confidence -= 10
      if (traffic.level === 'heavy') confidence -= 10
      if (roadDistance < 5) confidence += 5

      const result: ETAResult = {
        minutes: Math.max(3, timeMinutes), // Minimum 3 minutes
        distance: Math.round(roadDistance * 10) / 10,
        trafficLevel: traffic.level,
        confidence: Math.min(95, Math.max(50, confidence))
      }

      currentETA.value = result
      return result
    } finally {
      isCalculating.value = false
    }
  }

  // Calculate ETA for driver to pickup
  const calculateDriverETA = (
    driverLat: number,
    driverLng: number,
    pickupLat: number,
    pickupLng: number
  ): ETAResult => {
    return calculateETA(driverLat, driverLng, pickupLat, pickupLng)
  }

  // Calculate trip duration
  const calculateTripDuration = (
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number
  ): ETAResult => {
    return calculateETA(pickupLat, pickupLng, destLat, destLng)
  }

  // Format ETA for display
  const formatETA = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} นาที`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `${hours} ชม.`
    }
    return `${hours} ชม. ${mins} นาที`
  }

  // Get arrival time
  const getArrivalTime = (minutes: number): string => {
    const arrival = new Date()
    arrival.setMinutes(arrival.getMinutes() + minutes)
    return arrival.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Get traffic status text
  const getTrafficText = (level: 'light' | 'moderate' | 'heavy'): string => {
    switch (level) {
      case 'light': return 'การจราจรคล่องตัว'
      case 'moderate': return 'การจราจรปานกลาง'
      case 'heavy': return 'การจราจรหนาแน่น'
    }
  }

  // Get traffic color
  const getTrafficColor = (level: 'light' | 'moderate' | 'heavy'): string => {
    switch (level) {
      case 'light': return '#22c55e'
      case 'moderate': return '#f59e0b'
      case 'heavy': return '#ef4444'
    }
  }

  // Predict ETA for future time
  const predictFutureETA = (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    futureTime: Date
  ): ETAResult => {
    return calculateETA(fromLat, fromLng, toLat, toLng, futureTime)
  }

  // Get best departure time (lowest ETA in next 2 hours)
  const getBestDepartureTime = (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): { time: Date; eta: ETAResult } => {
    let bestTime = new Date()
    let bestETA = calculateETA(fromLat, fromLng, toLat, toLng)

    // Check every 15 minutes for next 2 hours
    for (let i = 15; i <= 120; i += 15) {
      const futureTime = new Date()
      futureTime.setMinutes(futureTime.getMinutes() + i)
      
      const futureETA = predictFutureETA(fromLat, fromLng, toLat, toLng, futureTime)
      
      if (futureETA.minutes < bestETA.minutes) {
        bestTime = futureTime
        bestETA = futureETA
      }
    }

    return { time: bestTime, eta: bestETA }
  }

  return {
    currentETA,
    isCalculating,
    calculateETA,
    calculateDriverETA,
    calculateTripDuration,
    formatETA,
    getArrivalTime,
    getTrafficText,
    getTrafficColor,
    getCurrentTraffic,
    predictFutureETA,
    getBestDepartureTime,
    calculateDistance
  }
}
