/**
 * useDriverRating - Driver Rating & Review System
 * Feature: F186 - Enhanced Driver Rating
 * Tables: ride_ratings, provider_rating_summary
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface DriverRating {
  id: string
  ride_id: string
  provider_id: string
  user_id: string
  overall_rating: number
  punctuality_rating?: number
  driving_rating?: number
  cleanliness_rating?: number
  communication_rating?: number
  comment?: string
  tags?: string[]
  is_public: boolean
  created_at: string
}

export interface RatingSummary {
  provider_id: string
  total_ratings: number
  average_rating: number
  punctuality_avg: number
  driving_avg: number
  cleanliness_avg: number
  communication_avg: number
  five_star_count: number
  four_star_count: number
  three_star_count: number
  two_star_count: number
  one_star_count: number
}

export function useDriverRating() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const ratings = ref<DriverRating[]>([])
  const summary = ref<RatingSummary | null>(null)

  const averageRating = computed(() => {
    if (!ratings.value.length) return 0
    return Math.round(ratings.value.reduce((sum, r) => sum + r.overall_rating, 0) / ratings.value.length * 10) / 10
  })

  const ratingDistribution = computed(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    ratings.value.forEach(r => { if (dist[r.overall_rating as keyof typeof dist] !== undefined) dist[r.overall_rating as keyof typeof dist]++ })
    return dist
  })

  const fetchRatings = async (providerId: string, limit = 50) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('ride_ratings')
        .select('*, user:users(first_name, last_name)')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (err) throw err
      ratings.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchSummary = async (providerId: string) => {
    try {
      const { data, error: err } = await supabase.rpc('get_provider_rating_summary', { p_provider_id: providerId })
      if (err) throw err
      summary.value = data?.[0] || null
    } catch (e: any) { error.value = e.message }
  }

  const submitRating = async (rating: Partial<DriverRating>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('ride_ratings').insert(rating as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const reportRating = async (ratingId: string, reason: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('rating_reports').insert({ rating_id: ratingId, reason } as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getRatingTags = () => ['สุภาพ', 'ตรงเวลา', 'รถสะอาด', 'ขับปลอดภัย', 'ช่วยเหลือดี', 'รู้เส้นทาง']

  return { loading, error, ratings, summary, averageRating, ratingDistribution, fetchRatings, fetchSummary, submitRating, reportRating, getRatingTags }
}
