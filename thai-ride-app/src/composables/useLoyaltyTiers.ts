/**
 * useLoyaltyTiers - Customer Loyalty Tiers
 * Feature: F216 - Loyalty Tiers
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface LoyaltyTier {
  id: string
  name: string
  name_th: string
  min_points: number
  max_points?: number
  benefits: string[]
  discount_percent: number
  priority_support: boolean
  free_cancellations: number
  color: string
  icon: string
}

export interface UserLoyalty {
  user_id: string
  current_tier_id: string
  total_points: number
  available_points: number
  lifetime_points: number
  tier_progress: number
  next_tier?: LoyaltyTier
}

export function useLoyaltyTiers() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const tiers = ref<LoyaltyTier[]>([])
  const userLoyalty = ref<UserLoyalty | null>(null)

  const currentTier = computed(() => tiers.value.find(t => t.id === userLoyalty.value?.current_tier_id))
  const pointsToNextTier = computed(() => {
    if (!userLoyalty.value?.next_tier) return 0
    return userLoyalty.value.next_tier.min_points - userLoyalty.value.total_points
  })

  const fetchTiers = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('loyalty_tiers').select('*').order('min_points')
      if (err) throw err
      tiers.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const fetchUserLoyalty = async (userId: string) => {
    try {
      const { data, error: err } = await supabase.from('user_loyalty').select('*').eq('user_id', userId).single()
      if (err && err.code !== 'PGRST116') throw err
      userLoyalty.value = data || null
      if (userLoyalty.value) {
        const nextTier = tiers.value.find(t => t.min_points > userLoyalty.value!.total_points)
        if (nextTier) userLoyalty.value.next_tier = nextTier
      }
    } catch (e: any) { error.value = e.message }
  }

  const calculateTierProgress = (points: number): { tier: LoyaltyTier; progress: number } | null => {
    const currentTier = tiers.value.find(t => points >= t.min_points && (!t.max_points || points < t.max_points))
    if (!currentTier) return null
    const nextTier = tiers.value.find(t => t.min_points > points)
    if (!nextTier) return { tier: currentTier, progress: 100 }
    const progress = ((points - currentTier.min_points) / (nextTier.min_points - currentTier.min_points)) * 100
    return { tier: currentTier, progress: Math.min(progress, 100) }
  }

  const getTierColor = (tierId: string): string => {
    const tier = tiers.value.find(t => t.id === tierId)
    return tier?.color || '#666666'
  }

  return { loading, error, tiers, userLoyalty, currentTier, pointsToNextTier, fetchTiers, fetchUserLoyalty, calculateTierProgress, getTierColor }
}
