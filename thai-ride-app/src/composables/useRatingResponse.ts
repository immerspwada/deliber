/**
 * useRatingResponse - Rating Response System
 * Feature: F220 - Rating Response
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface RatingWithResponse {
  id: string
  ride_id: string
  user_id: string
  provider_id: string
  rating: number
  comment?: string
  response?: string
  response_at?: string
  created_at: string
}

export interface ResponseTemplate {
  id: string
  name: string
  template: string
  rating_range: { min: number; max: number }
  is_active: boolean
}

export function useRatingResponse() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const ratings = ref<RatingWithResponse[]>([])
  const templates = ref<ResponseTemplate[]>([])

  const pendingResponses = computed(() => ratings.value.filter(r => !r.response && r.comment))
  const lowRatings = computed(() => ratings.value.filter(r => r.rating <= 3))

  const fetchRatings = async (providerId: string) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('ride_ratings').select('*').eq('provider_id', providerId).order('created_at', { ascending: false }).limit(100)
      if (err) throw err
      ratings.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchTemplates = async () => {
    try {
      const { data, error: err } = await supabase.from('response_templates').select('*').eq('is_active', true)
      if (err) throw err
      templates.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const submitResponse = async (ratingId: string, response: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('ride_ratings').update({ response, response_at: new Date().toISOString() } as never).eq('id', ratingId)
      if (err) throw err
      const idx = ratings.value.findIndex(r => r.id === ratingId)
      if (idx !== -1) { ratings.value[idx].response = response; ratings.value[idx].response_at = new Date().toISOString() }
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getSuggestedTemplate = (rating: number): ResponseTemplate | undefined => {
    return templates.value.find(t => rating >= t.rating_range.min && rating <= t.rating_range.max)
  }

  const getRatingColor = (rating: number) => rating >= 4 ? '#00A86B' : rating >= 3 ? '#F5A623' : '#E53935'

  return { loading, error, ratings, templates, pendingResponses, lowRatings, fetchRatings, fetchTemplates, submitResponse, getSuggestedTemplate, getRatingColor }
}
