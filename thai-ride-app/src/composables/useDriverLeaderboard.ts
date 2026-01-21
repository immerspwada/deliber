/**
 * useDriverLeaderboard - Driver Leaderboard System
 * Feature: F199 - Driver Leaderboard
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface LeaderboardEntry {
  rank: number
  provider_id: string
  provider_name: string
  total_trips: number
  total_earnings: number
  avg_rating: number
  completion_rate: number
  score: number
}

export function useDriverLeaderboard() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const leaderboard = ref<LeaderboardEntry[]>([])
  const period = ref<'daily' | 'weekly' | 'monthly'>('weekly')

  const top3 = computed(() => leaderboard.value.slice(0, 3))
  const myRank = ref<LeaderboardEntry | null>(null)

  const fetchLeaderboard = async (periodType: 'daily' | 'weekly' | 'monthly' = 'weekly', limit = 50) => {
    loading.value = true
    period.value = periodType
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_driver_leaderboard', { p_period: periodType, p_limit: limit })
      if (err) throw err
      leaderboard.value = (data || []).map((d: any, i: number) => ({ ...d, rank: i + 1 }))
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchMyRank = async (providerId: string) => {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_my_leaderboard_rank', { p_provider_id: providerId, p_period: period.value })
      if (err) throw err
      myRank.value = (data as any[])?.[0] || null
    } catch (e: any) { error.value = e.message }
  }

  const getPeriodText = (p: string) => ({ daily: 'วันนี้', weekly: 'สัปดาห์นี้', monthly: 'เดือนนี้' }[p] || p)
  const getRankBadge = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

  return { loading, error, leaderboard, period, top3, myRank, fetchLeaderboard, fetchMyRank, getPeriodText, getRankBadge }
}
