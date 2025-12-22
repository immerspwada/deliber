/**
 * useServiceQuality - Service Quality Monitoring
 * Feature: F189 - Service Quality System
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface QualityMetric {
  id: string
  provider_id: string
  metric_type: 'acceptance_rate' | 'completion_rate' | 'on_time_rate' | 'rating_avg' | 'cancellation_rate'
  value: number
  period: string
  calculated_at: string
}

export interface QualityScore {
  provider_id: string
  overall_score: number
  acceptance_rate: number
  completion_rate: number
  on_time_rate: number
  rating_avg: number
  cancellation_rate: number
  tier: 'gold' | 'silver' | 'bronze' | 'standard'
}

export function useServiceQuality() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const metrics = ref<QualityMetric[]>([])
  const scores = ref<QualityScore[]>([])

  const topPerformers = computed(() => scores.value.filter(s => s.tier === 'gold').slice(0, 10))
  const needsImprovement = computed(() => scores.value.filter(s => s.overall_score < 70))

  const fetchProviderMetrics = async (providerId: string) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('service_quality_metrics').select('*').eq('provider_id', providerId).order('calculated_at', { ascending: false })
      if (err) throw err
      metrics.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchAllScores = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('get_all_provider_quality_scores')
      if (err) throw err
      scores.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const calculateScore = (metrics: Partial<QualityScore>): number => {
    const weights = { acceptance_rate: 0.2, completion_rate: 0.25, on_time_rate: 0.2, rating_avg: 0.25, cancellation_rate: 0.1 }
    let score = 0
    if (metrics.acceptance_rate) score += metrics.acceptance_rate * weights.acceptance_rate
    if (metrics.completion_rate) score += metrics.completion_rate * weights.completion_rate
    if (metrics.on_time_rate) score += metrics.on_time_rate * weights.on_time_rate
    if (metrics.rating_avg) score += (metrics.rating_avg / 5 * 100) * weights.rating_avg
    if (metrics.cancellation_rate) score += (100 - metrics.cancellation_rate) * weights.cancellation_rate
    return Math.round(score)
  }

  const getTier = (score: number): 'gold' | 'silver' | 'bronze' | 'standard' => {
    if (score >= 90) return 'gold'
    if (score >= 80) return 'silver'
    if (score >= 70) return 'bronze'
    return 'standard'
  }

  const getTierText = (tier: string) => ({ gold: 'ทอง', silver: 'เงิน', bronze: 'ทองแดง', standard: 'มาตรฐาน' }[tier] || tier)
  const getTierColor = (tier: string) => ({ gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32', standard: '#666666' }[tier] || '#666666')

  return { loading, error, metrics, scores, topPerformers, needsImprovement, fetchProviderMetrics, fetchAllScores, calculateScore, getTier, getTierText, getTierColor }
}
