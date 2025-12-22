/**
 * useDispatchOptimization - Dispatch Optimization
 * Feature: F234 - Dispatch Optimization
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface DispatchCandidate {
  provider_id: string
  provider_name: string
  distance_km: number
  eta_minutes: number
  rating: number
  acceptance_rate: number
  score: number
}

export function useDispatchOptimization() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const candidates = ref<DispatchCandidate[]>([])

  const bestCandidate = computed(() => candidates.value[0] || null)

  const findCandidates = async (pickupLat: number, pickupLng: number, serviceType: string, radius = 5) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('find_dispatch_candidates', { p_lat: pickupLat, p_lng: pickupLng, p_service_type: serviceType, p_radius: radius })
      if (err) throw err
      candidates.value = (data || []).sort((a: DispatchCandidate, b: DispatchCandidate) => b.score - a.score)
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const calculateScore = (distance: number, rating: number, acceptanceRate: number): number => {
    const distanceScore = Math.max(0, 100 - distance * 10)
    const ratingScore = rating * 20
    const acceptanceScore = acceptanceRate
    return Math.round(distanceScore * 0.4 + ratingScore * 0.3 + acceptanceScore * 0.3)
  }

  const dispatchToProvider = async (rideId: string, providerId: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('ride_requests').update({ provider_id: providerId, status: 'dispatched' } as never).eq('id', rideId)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  return { loading, error, candidates, bestCandidate, findCandidates, calculateScore, dispatchToProvider }
}
