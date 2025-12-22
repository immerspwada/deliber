/**
 * useDriverPerformance - Driver Performance Dashboard
 * Feature: F203 - Driver Performance
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface PerformanceMetrics {
  provider_id: string
  total_trips: number
  completed_trips: number
  cancelled_trips: number
  completion_rate: number
  avg_rating: number
  total_earnings: number
  online_hours: number
  avg_trip_duration: number
  acceptance_rate: number
}

export interface PerformanceGoal {
  id: string
  provider_id: string
  goal_type: 'trips' | 'earnings' | 'rating' | 'hours'
  target_value: number
  current_value: number
  period: 'daily' | 'weekly' | 'monthly'
  achieved: boolean
}

export function useDriverPerformance() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const metrics = ref<PerformanceMetrics | null>(null)
  const goals = ref<PerformanceGoal[]>([])
  const history = ref<any[]>([])

  const completionRate = computed(() => metrics.value?.completion_rate || 0)
  const achievedGoals = computed(() => goals.value.filter(g => g.achieved).length)

  const fetchMetrics = async (providerId: string, period: 'daily' | 'weekly' | 'monthly' = 'weekly') => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('get_provider_performance', { p_provider_id: providerId, p_period: period })
      if (err) throw err
      metrics.value = data?.[0] || null
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchGoals = async (providerId: string) => {
    try {
      const { data, error: err } = await supabase.from('provider_goals').select('*').eq('provider_id', providerId).order('created_at', { ascending: false })
      if (err) throw err
      goals.value = data || []
    } catch (e: any) { error.value = e.message }
  }

  const setGoal = async (goal: Partial<PerformanceGoal>): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('provider_goals').insert(goal as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getGoalTypeText = (t: string) => ({ trips: 'จำนวนเที่ยว', earnings: 'รายได้', rating: 'คะแนน', hours: 'ชั่วโมง' }[t] || t)
  const getPerformanceLevel = (rate: number) => rate >= 90 ? 'excellent' : rate >= 70 ? 'good' : rate >= 50 ? 'average' : 'poor'

  return { loading, error, metrics, goals, history, completionRate, achievedGoals, fetchMetrics, fetchGoals, setGoal, getGoalTypeText, getPerformanceLevel }
}
