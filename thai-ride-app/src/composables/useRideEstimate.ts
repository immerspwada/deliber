/**
 * useRideEstimate - Ride Fare Estimation
 * Feature: F195 - Ride Estimation System
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface FareEstimate {
  vehicle_type: string
  vehicle_type_th: string
  base_fare: number
  distance_fare: number
  time_fare: number
  surge_multiplier: number
  surge_amount: number
  toll_fee: number
  promo_discount: number
  total_fare: number
  estimated_duration_minutes: number
  estimated_distance_km: number
}

export interface EstimateRequest {
  pickup_lat: number
  pickup_lng: number
  dropoff_lat: number
  dropoff_lng: number
  vehicle_type?: string
  promo_code?: string
  scheduled_time?: string
}

export function useRideEstimate() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const estimates = ref<FareEstimate[]>([])
  const selectedEstimate = ref<FareEstimate | null>(null)

  const cheapestOption = computed(() => estimates.value.length ? estimates.value.reduce((min, e) => e.total_fare < min.total_fare ? e : min) : null)
  const fastestOption = computed(() => estimates.value.length ? estimates.value.reduce((min, e) => e.estimated_duration_minutes < min.estimated_duration_minutes ? e : min) : null)

  const getEstimates = async (request: EstimateRequest): Promise<FareEstimate[]> => {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase.rpc('get_ride_estimates', {
        p_pickup_lat: request.pickup_lat,
        p_pickup_lng: request.pickup_lng,
        p_dropoff_lat: request.dropoff_lat,
        p_dropoff_lng: request.dropoff_lng,
        p_promo_code: request.promo_code || null
      })
      if (err) throw err
      estimates.value = data || []
      return estimates.value
    } catch (e: any) {
      error.value = e.message
      // Fallback calculation
      estimates.value = calculateFallbackEstimates(request)
      return estimates.value
    } finally { loading.value = false }
  }

  const calculateFallbackEstimates = (request: EstimateRequest): FareEstimate[] => {
    const distance = getDistanceKm(request.pickup_lat, request.pickup_lng, request.dropoff_lat, request.dropoff_lng)
    const duration = Math.round(distance * 3) // Rough estimate: 3 min per km

    const vehicleTypes = [
      { type: 'standard', type_th: 'มาตรฐาน', base: 25, perKm: 7, perMin: 1 },
      { type: 'premium', type_th: 'พรีเมียม', base: 40, perKm: 12, perMin: 2 },
      { type: 'suv', type_th: 'SUV', base: 50, perKm: 15, perMin: 2.5 }
    ]

    return vehicleTypes.map(v => {
      const distanceFare = distance * v.perKm
      const timeFare = duration * v.perMin
      const total = v.base + distanceFare + timeFare
      return {
        vehicle_type: v.type,
        vehicle_type_th: v.type_th,
        base_fare: v.base,
        distance_fare: Math.round(distanceFare),
        time_fare: Math.round(timeFare),
        surge_multiplier: 1,
        surge_amount: 0,
        toll_fee: 0,
        promo_discount: 0,
        total_fare: Math.round(total),
        estimated_duration_minutes: duration,
        estimated_distance_km: Math.round(distance * 10) / 10
      }
    })
  }

  const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const selectEstimate = (estimate: FareEstimate) => { selectedEstimate.value = estimate }
  const clearEstimates = () => { estimates.value = []; selectedEstimate.value = null }

  const formatFare = (amount: number) => `฿${amount.toLocaleString()}`
  const formatDuration = (minutes: number) => minutes < 60 ? `${minutes} นาที` : `${Math.floor(minutes/60)} ชม. ${minutes%60} นาที`
  const formatDistance = (km: number) => `${km.toFixed(1)} กม.`

  return { loading, error, estimates, selectedEstimate, cheapestOption, fastestOption, getEstimates, selectEstimate, clearEstimates, formatFare, formatDuration, formatDistance, getDistanceKm }
}
