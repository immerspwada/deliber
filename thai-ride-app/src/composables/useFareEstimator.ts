/**
 * Feature: F47 - Fare Estimator
 * 
 * ระบบคำนวณค่าโดยสารโดยประมาณ
 * - คำนวณจากระยะทางและเวลา
 * - รองรับ surge pricing
 * - แสดง breakdown ค่าใช้จ่าย
 */

import { ref } from 'vue'
import { useETA } from './useETA'
import { useSurgePricing } from './useSurgePricing'
import { useAppSettings } from './useAppSettings'

export type RideType = 'standard' | 'premium' | 'shared'

export interface FareBreakdown {
  baseFare: number
  distanceFare: number
  timeFare: number
  surgeFare: number
  discount: number
  total: number
  currency: string
}

export interface FareEstimate {
  rideType: RideType
  breakdown: FareBreakdown
  surgeMultiplier: number
  isSurge: boolean
  estimatedTime: number
  distance: number
  priceRange: { min: number; max: number }
}



export function useFareEstimator() {
  const { calculateDistance } = useETA()
  const { calculateSurge, currentMultiplier } = useSurgePricing()
  const { settings } = useAppSettings()

  const isCalculating = ref(false)
  const lastEstimate = ref<FareEstimate | null>(null)

  // Get pricing for ride type
  const getPricing = (rideType: RideType) => {
    // Use app settings for base pricing
    const s = settings.value
    if (rideType === 'standard') {
      return {
        baseFare: s.baseFare,
        perKm: s.perKmRate,
        perMinute: s.perMinuteRate,
        minFare: s.minimumFare
      }
    } else if (rideType === 'premium') {
      return {
        baseFare: s.baseFare * 1.5,
        perKm: s.perKmRate * 1.5,
        perMinute: s.perMinuteRate * 1.5,
        minFare: s.minimumFare * 1.5
      }
    } else {
      // shared
      return {
        baseFare: s.baseFare * 0.7,
        perKm: s.perKmRate * 0.7,
        perMinute: s.perMinuteRate * 0.7,
        minFare: s.minimumFare * 0.7
      }
    }
  }

  // Calculate fare estimate
  const estimateFare = async (
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number,
    rideType: RideType = 'standard',
    promoDiscount: number = 0
  ): Promise<FareEstimate> => {
    isCalculating.value = true

    try {
      // Calculate distance
      const straightDistance = calculateDistance(pickupLat, pickupLng, destLat, destLng)
      const roadDistance = straightDistance * 1.3 // Add 30% for road routing

      // Estimate time (average 25 km/h in Bangkok)
      const estimatedMinutes = Math.ceil((roadDistance / 25) * 60)

      // Get pricing
      const pricing = getPricing(rideType)

      // Calculate base fare components
      const baseFare = pricing.baseFare
      const distanceFare = roadDistance * pricing.perKm
      const timeFare = estimatedMinutes * pricing.perMinute

      // Get surge multiplier
      await calculateSurge(pickupLat, pickupLng)
      const surgeMultiplier = currentMultiplier.value || 1

      // Calculate subtotal
      const subtotal = baseFare + distanceFare + timeFare

      // Apply surge
      const surgeFare = surgeMultiplier > 1 ? subtotal * (surgeMultiplier - 1) : 0

      // Apply discount
      const discount = Math.min(promoDiscount, subtotal + surgeFare)

      // Calculate total
      const total = Math.max(pricing.minFare, Math.round(subtotal + surgeFare - discount))

      // Calculate price range (±15%)
      const variance = 0.15
      const priceRange = {
        min: Math.round(total * (1 - variance)),
        max: Math.round(total * (1 + variance))
      }

      const estimate: FareEstimate = {
        rideType,
        breakdown: {
          baseFare: Math.round(baseFare),
          distanceFare: Math.round(distanceFare),
          timeFare: Math.round(timeFare),
          surgeFare: Math.round(surgeFare),
          discount: Math.round(discount),
          total,
          currency: '฿'
        },
        surgeMultiplier,
        isSurge: surgeMultiplier > 1,
        estimatedTime: estimatedMinutes,
        distance: Math.round(roadDistance * 10) / 10,
        priceRange
      }

      lastEstimate.value = estimate
      return estimate
    } finally {
      isCalculating.value = false
    }
  }

  // Compare all ride types
  const compareRideTypes = async (
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number,
    promoDiscount: number = 0
  ): Promise<FareEstimate[]> => {
    const types: RideType[] = ['standard', 'premium', 'shared']
    const estimates = await Promise.all(
      types.map(type => estimateFare(pickupLat, pickupLng, destLat, destLng, type, promoDiscount))
    )
    return estimates
  }

  // Format price for display
  const formatPrice = (amount: number): string => {
    return `฿${amount.toLocaleString('th-TH')}`
  }

  // Format price range
  const formatPriceRange = (range: { min: number; max: number }): string => {
    return `฿${range.min} - ฿${range.max}`
  }

  // Get ride type label
  const getRideTypeLabel = (type: RideType): string => {
    switch (type) {
      case 'standard': return 'มาตรฐาน'
      case 'premium': return 'พรีเมียม'
      case 'shared': return 'แชร์'
    }
  }

  // Get ride type description
  const getRideTypeDescription = (type: RideType): string => {
    switch (type) {
      case 'standard': return 'รถยนต์ทั่วไป สะดวกสบาย'
      case 'premium': return 'รถหรู บริการพิเศษ'
      case 'shared': return 'แชร์กับผู้โดยสารอื่น ประหยัดกว่า'
    }
  }

  return {
    isCalculating,
    lastEstimate,
    estimateFare,
    compareRideTypes,
    formatPrice,
    formatPriceRange,
    getRideTypeLabel,
    getRideTypeDescription,
    getPricing
  }
}
