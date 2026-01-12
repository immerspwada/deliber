/**
 * Rating System Composable
 * ให้คะแนนระหว่างลูกค้าและ Provider
 */
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface Rating {
  id: string
  ride_id: string
  rater_id: string
  ratee_id: string
  rater_role: 'customer' | 'provider'
  rating: number
  comment?: string
  tags?: string[]
  created_at: string
}

export interface RatingStats {
  avg_rating: number
  total_ratings: number
}

// Rating tags
export const CUSTOMER_TAGS = [
  { key: 'polite', label: 'สุภาพ', icon: '😊' },
  { key: 'on_time', label: 'ตรงเวลา', icon: '⏰' },
  { key: 'good_location', label: 'บอกจุดรับชัดเจน', icon: '📍' },
  { key: 'friendly', label: 'เป็นมิตร', icon: '👋' }
]

export const PROVIDER_TAGS = [
  { key: 'safe_driving', label: 'ขับปลอดภัย', icon: '🛡️' },
  { key: 'clean_car', label: 'รถสะอาด', icon: '✨' },
  { key: 'friendly', label: 'เป็นมิตร', icon: '😊' },
  { key: 'professional', label: 'มืออาชีพ', icon: '👔' },
  { key: 'good_route', label: 'เลือกเส้นทางดี', icon: '🗺️' }
]

export function useRating() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Submit rating
  async function submitRating(params: {
    rideId: string
    rateeId: string
    raterRole: 'customer' | 'provider'
    rating: number
    comment?: string
    tags?: string[]
  }): Promise<Rating | null> {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return null
      }

      const { data, error: dbError } = await supabase
        .from('ratings')
        .insert({
          ride_id: params.rideId,
          rater_id: user.id,
          ratee_id: params.rateeId,
          rater_role: params.raterRole,
          rating: params.rating,
          comment: params.comment || null,
          tags: params.tags || null
        })
        .select()
        .single()

      if (dbError) {
        if (dbError.code === '23505') {
          error.value = 'คุณได้ให้คะแนนไปแล้ว'
        } else {
          error.value = 'ไม่สามารถบันทึกคะแนนได้'
        }
        console.error('[Rating] Submit error:', dbError)
        return null
      }

      return data as Rating
    } catch (err) {
      console.error('[Rating] Exception:', err)
      error.value = 'เกิดข้อผิดพลาด'
      return null
    } finally {
      loading.value = false
    }
  }

  // Get user's rating stats
  async function getUserRating(userId: string): Promise<RatingStats | null> {
    try {
      const { data, error: dbError } = await supabase
        .rpc('get_user_rating', { p_user_id: userId })
        .single()

      if (dbError) {
        console.error('[Rating] Get stats error:', dbError)
        return null
      }

      return data as RatingStats
    } catch (err) {
      console.error('[Rating] Exception:', err)
      return null
    }
  }

  // Check if user has rated a ride
  async function hasRated(rideId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data, error: dbError } = await supabase
        .from('ratings')
        .select('id')
        .eq('ride_id', rideId)
        .eq('rater_id', user.id)
        .maybeSingle()

      if (dbError) {
        console.error('[Rating] Check error:', dbError)
        return false
      }

      return !!data
    } catch (err) {
      console.error('[Rating] Exception:', err)
      return false
    }
  }

  // Get ratings for a user
  async function getUserRatings(userId: string, limit = 10): Promise<Rating[]> {
    try {
      const { data, error: dbError } = await supabase
        .from('ratings')
        .select('*')
        .eq('ratee_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (dbError) {
        console.error('[Rating] Get ratings error:', dbError)
        return []
      }

      return data as Rating[]
    } catch (err) {
      console.error('[Rating] Exception:', err)
      return []
    }
  }

  return {
    loading,
    error,
    submitRating,
    getUserRating,
    hasRated,
    getUserRatings,
    CUSTOMER_TAGS,
    PROVIDER_TAGS
  }
}
