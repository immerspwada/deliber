/**
 * Feature: F26 - Delivery/Shopping Ratings
 * Tables: delivery_ratings, shopping_ratings
 * Migration: 008_service_ratings.sql
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface DeliveryRating {
  id: string
  delivery_id: string
  user_id: string
  provider_id: string
  rating: number
  speed_rating: number | null
  care_rating: number | null
  communication_rating: number | null
  comment: string | null
  tip_amount: number
  tags: string[]
  photos: string[]
  created_at: string
}

export interface ShoppingRating {
  id: string
  shopping_id: string
  user_id: string
  provider_id: string
  rating: number
  item_selection_rating: number | null
  freshness_rating: number | null
  communication_rating: number | null
  delivery_rating: number | null
  comment: string | null
  tip_amount: number
  tags: string[]
  created_at: string
}

export interface ProviderRatingsSummary {
  total_ratings: number
  average_rating: number
  ride_ratings: number
  ride_avg: number
  delivery_ratings: number
  delivery_avg: number
  shopping_ratings: number
  shopping_avg: number
  five_star: number
  four_star: number
  three_star: number
  two_star: number
  one_star: number
}

// Quick feedback tags
export const DELIVERY_TAGS = [
  'ส่งเร็วมาก',
  'ดูแลพัสดุดี',
  'สุภาพ',
  'ติดต่อง่าย',
  'ตรงเวลา',
  'พัสดุปลอดภัย'
]

export const SHOPPING_TAGS = [
  'เลือกของดี',
  'ของสด',
  'ครบตามสั่ง',
  'สื่อสารดี',
  'ส่งเร็ว',
  'ใส่ใจรายละเอียด'
]

export function useServiceRatings() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Submit delivery rating
  const submitDeliveryRating = async (params: {
    deliveryId: string
    rating: number
    speedRating?: number
    careRating?: number
    communicationRating?: number
    comment?: string
    tipAmount?: number
    tags?: string[]
  }) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('submit_delivery_rating', {
        p_delivery_id: params.deliveryId,
        p_user_id: authStore.user.id,
        p_rating: params.rating,
        p_speed_rating: params.speedRating || null,
        p_care_rating: params.careRating || null,
        p_communication_rating: params.communicationRating || null,
        p_comment: params.comment || null,
        p_tip_amount: params.tipAmount || 0,
        p_tags: params.tags || []
      })

      if (rpcError) throw rpcError
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Submit shopping rating
  const submitShoppingRating = async (params: {
    shoppingId: string
    rating: number
    itemSelectionRating?: number
    freshnessRating?: number
    communicationRating?: number
    deliveryRating?: number
    comment?: string
    tipAmount?: number
    tags?: string[]
  }) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('submit_shopping_rating', {
        p_shopping_id: params.shoppingId,
        p_user_id: authStore.user.id,
        p_rating: params.rating,
        p_item_selection_rating: params.itemSelectionRating || null,
        p_freshness_rating: params.freshnessRating || null,
        p_communication_rating: params.communicationRating || null,
        p_delivery_rating: params.deliveryRating || null,
        p_comment: params.comment || null,
        p_tip_amount: params.tipAmount || 0,
        p_tags: params.tags || []
      })

      if (rpcError) throw rpcError
      return data
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Get delivery rating for a specific delivery
  const getDeliveryRating = async (deliveryId: string): Promise<DeliveryRating | null> => {
    try {
      const { data, error: fetchError } = await (supabase
        .from('delivery_ratings') as any)
        .select('*')
        .eq('delivery_id', deliveryId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError
      return data
    } catch {
      return null
    }
  }

  // Get shopping rating for a specific shopping request
  const getShoppingRating = async (shoppingId: string): Promise<ShoppingRating | null> => {
    try {
      const { data, error: fetchError } = await (supabase
        .from('shopping_ratings') as any)
        .select('*')
        .eq('shopping_id', shoppingId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError
      return data
    } catch {
      return null
    }
  }

  // Get provider ratings summary
  const getProviderRatingsSummary = async (providerId: string): Promise<ProviderRatingsSummary | null> => {
    try {
      const { data, error: rpcError } = await (supabase.rpc as any)('get_provider_ratings_summary', {
        p_provider_id: providerId
      })

      if (rpcError) throw rpcError
      return data?.[0] || null
    } catch {
      return null
    }
  }

  // Get all delivery ratings for a provider
  const getProviderDeliveryRatings = async (providerId: string, limit = 20) => {
    try {
      const { data, error: fetchError } = await (supabase
        .from('delivery_ratings') as any)
        .select(`
          *,
          delivery:delivery_id (
            tracking_id,
            sender_address,
            recipient_address
          ),
          user:user_id (name)
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError
      return data || []
    } catch {
      return []
    }
  }

  // Get all shopping ratings for a provider
  const getProviderShoppingRatings = async (providerId: string, limit = 20) => {
    try {
      const { data, error: fetchError } = await (supabase
        .from('shopping_ratings') as any)
        .select(`
          *,
          shopping:shopping_id (
            tracking_id,
            store_name,
            delivery_address
          ),
          user:user_id (name)
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError
      return data || []
    } catch {
      return []
    }
  }

  // Format rating display
  const formatRating = (rating: number): string => {
    return rating.toFixed(1)
  }

  // Get star icons for rating
  const getStarIcons = (rating: number): ('full' | 'half' | 'empty')[] => {
    const stars: ('full' | 'half' | 'empty')[] = []
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push('full')
      } else if (rating >= i - 0.5) {
        stars.push('half')
      } else {
        stars.push('empty')
      }
    }
    return stars
  }

  return {
    loading,
    error,
    submitDeliveryRating,
    submitShoppingRating,
    getDeliveryRating,
    getShoppingRating,
    getProviderRatingsSummary,
    getProviderDeliveryRatings,
    getProviderShoppingRatings,
    formatRating,
    getStarIcons,
    DELIVERY_TAGS,
    SHOPPING_TAGS
  }
}
