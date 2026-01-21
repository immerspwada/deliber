/**
 * useFeedbackAnalytics - Customer Feedback Analytics
 * Feature: F202 - Feedback Analytics
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface FeedbackSummary {
  total_feedback: number
  avg_rating: number
  nps_score: number
  promoters: number
  passives: number
  detractors: number
  response_rate: number
}

export interface FeedbackTrend {
  date: string
  avg_rating: number
  count: number
  nps: number
}

export interface FeedbackCategory {
  category: string
  count: number
  avg_rating: number
  sentiment: 'positive' | 'neutral' | 'negative'
}

export function useFeedbackAnalytics() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const summary = ref<FeedbackSummary | null>(null)
  const trends = ref<FeedbackTrend[]>([])
  const categories = ref<FeedbackCategory[]>([])

  const fetchSummary = async (days = 30) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('get_feedback_summary', { p_days: days })
      if (err) throw err
      summary.value = data?.[0] || null
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchTrends = async (days = 30) => {
    try {
      const { data, error: err } = await supabase.rpc('get_feedback_trends', { p_days: days })
      if (err) throw err
      trends.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const fetchCategories = async () => {
    try {
      const { data, error: err } = await supabase.rpc('get_feedback_by_category')
      if (err) throw err
      categories.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const getNPSColor = (nps: number) => nps >= 50 ? '#00A86B' : nps >= 0 ? '#F5A623' : '#E53935'
  const getNPSLabel = (nps: number) => nps >= 50 ? 'ยอดเยี่ยม' : nps >= 0 ? 'ปานกลาง' : 'ต้องปรับปรุง'

  return { loading, error, summary, trends, categories, fetchSummary, fetchTrends, fetchCategories, getNPSColor, getNPSLabel }
}
