/**
 * useEnhancedRatings - Enhanced Rating & Review System
 * 
 * Feature: F26 - Rating & Review System Enhancement
 * Tables: rating_criteria, detailed_ratings, review_tags, rating_tags, review_responses
 * Migration: 061_rating_system_v2.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface RatingCriteria {
  criteria_key: string
  criteria_name: string
  criteria_name_th: string
  is_required: boolean
  sort_order: number
}

export interface ReviewTag {
  tag_key: string
  tag_name: string
  tag_name_th: string
  is_positive: boolean
  icon?: string
}

export interface DetailedRating {
  overall: number
  criteria: Record<string, number>
  tags: string[]
  comment?: string
}

export interface ReviewResponse {
  id: string
  rating_id: string
  provider_id: string
  response_text: string
  is_approved: boolean
  created_at: string
}

export interface RatingSummary {
  total_ratings: number
  avg_rating: number
  five_star_pct: number
  distribution: {
    five: number
    four: number
    three: number
    two: number
    one: number
  }
  top_tags: Array<{ tag: string; count: number }>
}

export function useEnhancedRatings() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // State
  const criteria = ref<RatingCriteria[]>([])
  const tags = ref<ReviewTag[]>([])
  const currentRating = ref<DetailedRating>({
    overall: 0,
    criteria: {},
    tags: [],
    comment: ''
  })

  // Computed
  const positiveTags = computed(() => tags.value.filter(t => t.is_positive))
  const negativeTags = computed(() => tags.value.filter(t => !t.is_positive))
  
  const isRatingValid = computed(() => {
    const requiredCriteria = criteria.value.filter(c => c.is_required)
    return requiredCriteria.every(c => currentRating.value.criteria[c.criteria_key] > 0)
  })

  // Fetch rating criteria for service type
  const fetchCriteria = async (serviceType: string) => {
    loading.value = true
    
    try {
      const { data, error: err } = await supabase.rpc('get_rating_criteria', {
        p_service_type: serviceType
      })
      
      if (err) throw err
      criteria.value = data || []
      
      // Initialize current rating criteria
      criteria.value.forEach(c => {
        if (!(c.criteria_key in currentRating.value.criteria)) {
          currentRating.value.criteria[c.criteria_key] = 0
        }
      })
    } catch (e: any) {
      error.value = e.message
      // Default criteria
      criteria.value = [
        { criteria_key: 'overall', criteria_name: 'Overall', criteria_name_th: 'ภาพรวม', is_required: true, sort_order: 0 }
      ]
    } finally {
      loading.value = false
    }
  }

  // Fetch review tags for service type
  const fetchTags = async (serviceType: string) => {
    try {
      const { data, error: err } = await supabase.rpc('get_review_tags', {
        p_service_type: serviceType
      })
      
      if (err) throw err
      tags.value = data || []
    } catch (e: any) {
      error.value = e.message
      // Default tags
      tags.value = [
        { tag_key: 'friendly', tag_name: 'Friendly', tag_name_th: 'เป็นมิตร', is_positive: true },
        { tag_key: 'on_time', tag_name: 'On Time', tag_name_th: 'ตรงเวลา', is_positive: true },
        { tag_key: 'unfriendly', tag_name: 'Unfriendly', tag_name_th: 'ไม่เป็นมิตร', is_positive: false },
        { tag_key: 'late', tag_name: 'Late', tag_name_th: 'มาช้า', is_positive: false }
      ]
    }
  }

  // Set criteria score
  const setCriteriaScore = (criteriaKey: string, score: number) => {
    currentRating.value.criteria[criteriaKey] = score
    
    // Auto-set overall if it's the only required criteria
    if (criteriaKey === 'overall') {
      currentRating.value.overall = score
    }
  }

  // Toggle tag
  const toggleTag = (tagKey: string) => {
    const index = currentRating.value.tags.indexOf(tagKey)
    if (index > -1) {
      currentRating.value.tags.splice(index, 1)
    } else {
      currentRating.value.tags.push(tagKey)
    }
  }

  // Check if tag is selected
  const isTagSelected = (tagKey: string): boolean => {
    return currentRating.value.tags.includes(tagKey)
  }

  // Submit rating with details
  const submitRating = async (
    ratingId: string,
    ratingType: string
  ) => {
    loading.value = true
    error.value = null
    
    try {
      // Submit detailed ratings
      await supabase.rpc('submit_detailed_rating', {
        p_rating_id: ratingId,
        p_rating_type: ratingType,
        p_criteria_scores: currentRating.value.criteria,
        p_tags: currentRating.value.tags
      })
      
      // Reset current rating
      resetRating()
      
      return { success: true }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Reset current rating
  const resetRating = () => {
    currentRating.value = {
      overall: 0,
      criteria: {},
      tags: [],
      comment: ''
    }
    criteria.value.forEach(c => {
      currentRating.value.criteria[c.criteria_key] = 0
    })
  }

  // Submit provider response to review
  const submitResponse = async (
    ratingId: string,
    ratingType: string,
    providerId: string,
    responseText: string
  ) => {
    loading.value = true
    
    try {
      const { data, error: err } = await supabase.rpc('submit_review_response', {
        p_rating_id: ratingId,
        p_rating_type: ratingType,
        p_provider_id: providerId,
        p_response_text: responseText
      })
      
      if (err) throw err
      return { success: true, responseId: data }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Get provider rating summary
  const getProviderSummary = async (providerId: string): Promise<RatingSummary | null> => {
    try {
      const { data, error: err } = await supabase.rpc('get_provider_rating_summary', {
        p_provider_id: providerId
      })
      
      if (err) throw err
      
      if (data && data.length > 0) {
        const summary = data[0]
        return {
          total_ratings: summary.total_ratings || 0,
          avg_rating: summary.avg_rating || 0,
          five_star_pct: summary.five_star_pct || 0,
          distribution: {
            five: 0,
            four: 0,
            three: 0,
            two: 0,
            one: 0
          },
          top_tags: summary.top_tags || []
        }
      }
      return null
    } catch {
      return null
    }
  }

  // Get detailed ratings for a specific rating
  const getDetailedRatings = async (ratingId: string, ratingType: string) => {
    try {
      const { data: criteriaData } = await supabase
        .from('detailed_ratings')
        .select('criteria_key, score')
        .eq('rating_id', ratingId)
        .eq('rating_type', ratingType)
      
      const { data: tagsData } = await supabase
        .from('rating_tags')
        .select('tag_key')
        .eq('rating_id', ratingId)
        .eq('rating_type', ratingType)
      
      return {
        criteria: criteriaData?.reduce((acc, c) => ({ ...acc, [c.criteria_key]: c.score }), {}) || {},
        tags: tagsData?.map(t => t.tag_key) || []
      }
    } catch {
      return { criteria: {}, tags: [] }
    }
  }

  // Get review response for a rating
  const getReviewResponse = async (ratingId: string, ratingType: string): Promise<ReviewResponse | null> => {
    try {
      const { data, error: err } = await supabase
        .from('review_responses')
        .select('*')
        .eq('rating_id', ratingId)
        .eq('rating_type', ratingType)
        .eq('is_approved', true)
        .single()
      
      if (err) return null
      return data
    } catch {
      return null
    }
  }

  // Admin: Approve/reject response
  const approveResponse = async (responseId: string, approved: boolean) => {
    loading.value = true
    
    try {
      const { data: userData } = await supabase.auth.getUser()
      
      const { data, error: err } = await supabase.rpc('approve_review_response', {
        p_response_id: responseId,
        p_admin_id: userData.user?.id,
        p_approved: approved
      })
      
      if (err) throw err
      return { success: true }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Get star distribution text
  const getStarText = (rating: number): string => {
    const texts = ['', 'แย่มาก', 'ไม่ดี', 'พอใช้', 'ดี', 'ยอดเยี่ยม']
    return texts[Math.round(rating)] || ''
  }

  // Get tag display name
  const getTagDisplayName = (tagKey: string, useThai: boolean = true): string => {
    const tag = tags.value.find(t => t.tag_key === tagKey)
    if (!tag) return tagKey
    return useThai ? tag.tag_name_th : tag.tag_name
  }

  return {
    // State
    loading,
    error,
    criteria,
    tags,
    currentRating,
    
    // Computed
    positiveTags,
    negativeTags,
    isRatingValid,
    
    // Methods
    fetchCriteria,
    fetchTags,
    setCriteriaScore,
    toggleTag,
    isTagSelected,
    submitRating,
    resetRating,
    submitResponse,
    getProviderSummary,
    getDetailedRatings,
    getReviewResponse,
    approveResponse,
    getStarText,
    getTagDisplayName
  }
}
