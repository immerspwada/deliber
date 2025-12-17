/**
 * Feature: F39 - Customer Feedback System
 * Tables: customer_feedback (new)
 * 
 * ระบบรับ feedback จากลูกค้าหลังใช้บริการ
 * - Quick feedback หลังจบ ride/delivery/shopping
 * - NPS (Net Promoter Score) survey
 * - Issue reporting
 * - Feedback analytics for admin
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export type FeedbackType = 'ride' | 'delivery' | 'shopping' | 'app' | 'support'
export type FeedbackCategory = 'driver' | 'vehicle' | 'app' | 'pricing' | 'timing' | 'safety' | 'other'

export interface CustomerFeedback {
  id: string
  user_id: string
  type: FeedbackType
  reference_id?: string // ride_id, delivery_id, etc.
  rating: number // 1-5
  nps_score?: number // 0-10
  categories: FeedbackCategory[]
  comment?: string
  is_resolved: boolean
  admin_response?: string
  created_at: string
  resolved_at?: string
}

export interface FeedbackStats {
  totalFeedback: number
  avgRating: number
  npsScore: number
  promoters: number
  passives: number
  detractors: number
  byCategory: Record<FeedbackCategory, number>
  byType: Record<FeedbackType, number>
  recentTrend: 'up' | 'down' | 'stable'
}

export function useCustomerFeedback() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const feedbackList = ref<CustomerFeedback[]>([])
  const stats = ref<FeedbackStats | null>(null)

  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

  // Submit feedback
  const submitFeedback = async (feedback: {
    type: FeedbackType
    reference_id?: string
    rating: number
    nps_score?: number
    categories?: FeedbackCategory[]
    comment?: string
  }) => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        // Demo mode - just simulate success
        return { success: true, id: `demo-${Date.now()}` }
      }

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('กรุณาเข้าสู่ระบบ')

      const { data, error: insertError } = await (supabase
        .from('customer_feedback') as any)
        .insert({
          user_id: userData.user.id,
          type: feedback.type,
          reference_id: feedback.reference_id,
          rating: feedback.rating,
          nps_score: feedback.nps_score,
          categories: feedback.categories || [],
          comment: feedback.comment,
          is_resolved: false
        })
        .select()
        .single()

      if (insertError) throw insertError

      return { success: true, id: (data as any)?.id }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Get user's feedback history
  const getUserFeedback = async () => {
    loading.value = true

    try {
      if (isDemoMode()) {
        feedbackList.value = generateDemoFeedback()
        return feedbackList.value
      }

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return []

      const { data, error: fetchError } = await (supabase
        .from('customer_feedback') as any)
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (fetchError) throw fetchError

      feedbackList.value = (data as CustomerFeedback[]) || []
      return feedbackList.value
    } catch (e: any) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Admin: Get all feedback
  const getAllFeedback = async (filters?: {
    type?: FeedbackType
    isResolved?: boolean
    minRating?: number
    maxRating?: number
    limit?: number
  }) => {
    loading.value = true

    try {
      if (isDemoMode()) {
        feedbackList.value = generateDemoFeedback(filters?.limit || 50)
        return feedbackList.value
      }

      let query = (supabase
        .from('customer_feedback') as any)
        .select(`
          *,
          users(name, email, phone)
        `)
        .order('created_at', { ascending: false })

      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.isResolved !== undefined) {
        query = query.eq('is_resolved', filters.isResolved)
      }
      if (filters?.minRating) {
        query = query.gte('rating', filters.minRating)
      }
      if (filters?.maxRating) {
        query = query.lte('rating', filters.maxRating)
      }
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      feedbackList.value = (data as CustomerFeedback[]) || []
      return feedbackList.value
    } catch (e: any) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Admin: Respond to feedback
  const respondToFeedback = async (feedbackId: string, response: string) => {
    loading.value = true

    try {
      if (isDemoMode()) {
        const idx = feedbackList.value.findIndex(f => f.id === feedbackId)
        if (idx !== -1 && feedbackList.value[idx]) {
          feedbackList.value[idx]!.admin_response = response
          feedbackList.value[idx]!.is_resolved = true
          feedbackList.value[idx]!.resolved_at = new Date().toISOString()
        }
        return { success: true }
      }

      const { error: updateError } = await (supabase
        .from('customer_feedback') as any)
        .update({
          admin_response: response,
          is_resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', feedbackId)

      if (updateError) throw updateError

      return { success: true }
    } catch (e: any) {
      error.value = e.message
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  // Get feedback statistics
  const getFeedbackStats = async (days: number = 30): Promise<FeedbackStats> => {
    loading.value = true

    try {
      if (isDemoMode()) {
        stats.value = generateDemoStats()
        return stats.value
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error: fetchError } = await (supabase
        .from('customer_feedback') as any)
        .select('*')
        .gte('created_at', startDate.toISOString())

      if (fetchError) throw fetchError

      const feedbacks = (data as CustomerFeedback[]) || []
      
      // Calculate stats
      const totalFeedback = feedbacks.length
      const avgRating = totalFeedback > 0 
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedback 
        : 0

      // NPS calculation
      const npsResponses = feedbacks.filter(f => f.nps_score !== undefined && f.nps_score !== null)
      const promoters = npsResponses.filter(f => (f.nps_score ?? 0) >= 9).length
      const detractors = npsResponses.filter(f => (f.nps_score ?? 0) <= 6).length
      const passives = npsResponses.length - promoters - detractors
      const npsScore = npsResponses.length > 0 
        ? Math.round(((promoters - detractors) / npsResponses.length) * 100)
        : 0

      // By category
      const byCategory: Record<FeedbackCategory, number> = {
        driver: 0, vehicle: 0, app: 0, pricing: 0, timing: 0, safety: 0, other: 0
      }
      feedbacks.forEach(f => {
        f.categories?.forEach(cat => {
          if (byCategory[cat] !== undefined) byCategory[cat]++
        })
      })

      // By type
      const byType: Record<FeedbackType, number> = {
        ride: 0, delivery: 0, shopping: 0, app: 0, support: 0
      }
      feedbacks.forEach(f => {
        if (byType[f.type] !== undefined) byType[f.type]++
      })

      // Trend (compare last 7 days vs previous 7 days)
      const last7Days = feedbacks.filter(f => {
        const d = new Date(f.created_at)
        const now = new Date()
        return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000
      })
      const prev7Days = feedbacks.filter(f => {
        const d = new Date(f.created_at)
        const now = new Date()
        const diff = now.getTime() - d.getTime()
        return diff > 7 * 24 * 60 * 60 * 1000 && diff <= 14 * 24 * 60 * 60 * 1000
      })

      const last7Avg = last7Days.length > 0 
        ? last7Days.reduce((sum, f) => sum + f.rating, 0) / last7Days.length 
        : 0
      const prev7Avg = prev7Days.length > 0 
        ? prev7Days.reduce((sum, f) => sum + f.rating, 0) / prev7Days.length 
        : 0

      let recentTrend: 'up' | 'down' | 'stable' = 'stable'
      if (last7Avg > prev7Avg + 0.2) recentTrend = 'up'
      else if (last7Avg < prev7Avg - 0.2) recentTrend = 'down'

      stats.value = {
        totalFeedback,
        avgRating: Math.round(avgRating * 10) / 10,
        npsScore,
        promoters,
        passives,
        detractors,
        byCategory,
        byType,
        recentTrend
      }

      return stats.value
    } catch (e: any) {
      error.value = e.message
      stats.value = generateDemoStats()
      return stats.value
    } finally {
      loading.value = false
    }
  }

  // Generate demo feedback
  const generateDemoFeedback = (count: number = 10): CustomerFeedback[] => {
    const types: FeedbackType[] = ['ride', 'delivery', 'shopping', 'app', 'support']
    const categories: FeedbackCategory[] = ['driver', 'vehicle', 'app', 'pricing', 'timing', 'safety', 'other']
    const comments = [
      'บริการดีมาก คนขับสุภาพ',
      'รอนานไปหน่อย แต่โดยรวมโอเค',
      'แอพใช้งานง่าย สะดวกมาก',
      'ราคาแพงกว่าที่คิด',
      'คนขับขับรถเร็วไป',
      'ส่งของตรงเวลา ประทับใจ',
      'ควรปรับปรุงเรื่องการติดตามสถานะ',
      'ดีมากครับ จะใช้บริการอีก'
    ]

    return Array.from({ length: count }, (_, i) => ({
      id: `demo-feedback-${i}`,
      user_id: `demo-user-${i}`,
      type: types[Math.floor(Math.random() * types.length)] as FeedbackType,
      rating: Math.floor(Math.random() * 3) + 3, // 3-5
      nps_score: Math.floor(Math.random() * 11), // 0-10
      categories: [categories[Math.floor(Math.random() * categories.length)] as FeedbackCategory],
      comment: comments[Math.floor(Math.random() * comments.length)],
      is_resolved: Math.random() > 0.3,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }))
  }

  // Generate demo stats
  const generateDemoStats = (): FeedbackStats => ({
    totalFeedback: 156,
    avgRating: 4.3,
    npsScore: 42,
    promoters: 68,
    passives: 45,
    detractors: 23,
    byCategory: {
      driver: 45,
      vehicle: 23,
      app: 34,
      pricing: 28,
      timing: 19,
      safety: 8,
      other: 12
    },
    byType: {
      ride: 78,
      delivery: 42,
      shopping: 21,
      app: 10,
      support: 5
    },
    recentTrend: 'up'
  })

  return {
    loading,
    error,
    feedbackList,
    stats,
    submitFeedback,
    getUserFeedback,
    getAllFeedback,
    respondToFeedback,
    getFeedbackStats
  }
}
