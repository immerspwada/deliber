/**
 * useLoyaltyV2 - Enhanced Customer Loyalty Program
 * 
 * Feature: F156 - Enhanced Customer Loyalty Program (V2)
 * Tables: loyalty_challenges, user_challenge_progress, user_streaks, 
 *         loyalty_badges, user_badges, tier_benefits
 * Migration: 065_loyalty_v2.sql
 * 
 * @syncs-with
 * - Customer: ดู challenges, badges, streaks
 * - Admin: จัดการ challenges, ดู analytics
 * - Database: loyalty_challenges, user_challenge_progress, user_streaks, loyalty_badges, user_badges
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Types
export interface LoyaltyChallenge {
  id: string
  name: string
  name_th: string
  description?: string
  description_th?: string
  challenge_type: 'daily' | 'weekly' | 'monthly' | 'special' | 'streak'
  target_action: string
  target_count: number
  target_amount?: number
  points_reward: number
  bonus_multiplier: number
  badge_id?: string
  start_date?: string
  end_date?: string
  is_active: boolean
  sort_order: number
}

export interface ChallengeProgress {
  challenge_id: string
  name: string
  name_th: string
  description_th?: string
  challenge_type: string
  target_action: string
  target_count: number
  points_reward: number
  current_count: number
  is_completed: boolean
  progress_pct: number
  expires_at?: string
}

export interface UserStreak {
  id: string
  user_id: string
  streak_type: 'daily_ride' | 'weekly_active' | 'rating_given' | 'referral'
  current_streak: number
  longest_streak: number
  last_activity_date?: string
  streak_bonus_points: number
  next_milestone?: number
}

export interface LoyaltyBadge {
  id: string
  name: string
  name_th: string
  description?: string
  description_th?: string
  icon_url?: string
  badge_type: 'achievement' | 'tier' | 'special' | 'seasonal'
  requirement_type?: string
  requirement_value?: number
  points_bonus: number
  is_active: boolean
}

export interface UserBadge {
  badge_id: string
  name: string
  name_th: string
  description_th?: string
  icon_url?: string
  badge_type: string
  earned_at: string
  is_displayed: boolean
}

export interface TierBenefit {
  id: string
  tier_id: string
  benefit_type: 'discount' | 'points_multiplier' | 'priority_support' | 'free_cancellation' | 'exclusive_promo' | 'cashback'
  benefit_name: string
  benefit_name_th: string
  benefit_value?: number
  description?: string
  is_active: boolean
}

export function useLoyaltyV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // State
  const challenges = ref<ChallengeProgress[]>([])
  const streaks = ref<UserStreak[]>([])
  const badges = ref<UserBadge[]>([])
  const allBadges = ref<LoyaltyBadge[]>([])
  const tierBenefits = ref<TierBenefit[]>([])

  // Computed
  const activeChallenges = computed(() => 
    challenges.value.filter(c => !c.is_completed)
  )

  const completedChallenges = computed(() => 
    challenges.value.filter(c => c.is_completed)
  )

  const dailyChallenges = computed(() => 
    challenges.value.filter(c => c.challenge_type === 'daily')
  )

  const weeklyChallenges = computed(() => 
    challenges.value.filter(c => c.challenge_type === 'weekly')
  )

  const totalBadges = computed(() => badges.value.length)

  const displayedBadges = computed(() => 
    badges.value.filter(b => b.is_displayed).slice(0, 3)
  )

  const currentStreak = computed(() => 
    streaks.value.find(s => s.streak_type === 'daily_ride')?.current_streak || 0
  )

  const longestStreak = computed(() => 
    Math.max(...streaks.value.map(s => s.longest_streak), 0)
  )

  // =====================================================
  // CUSTOMER FUNCTIONS
  // =====================================================

  /**
   * Fetch available challenges for current user
   */
  const fetchChallenges = async () => {
    if (!authStore.user?.id) return

    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .rpc('get_available_challenges', { p_user_id: authStore.user.id })

      if (err) throw err
      challenges.value = data || []
    } catch (e: any) {
      error.value = e.message
      console.error('Fetch challenges error:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch user streaks
   */
  const fetchStreaks = async () => {
    if (!authStore.user?.id) return

    try {
      const { data, error: err } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', authStore.user.id)

      if (err) throw err
      streaks.value = data || []
    } catch (e: any) {
      console.error('Fetch streaks error:', e)
    }
  }

  /**
   * Fetch user badges
   */
  const fetchUserBadges = async () => {
    if (!authStore.user?.id) return

    try {
      const { data, error: err } = await supabase
        .rpc('get_user_badges', { p_user_id: authStore.user.id })

      if (err) throw err
      badges.value = data || []
    } catch (e: any) {
      console.error('Fetch badges error:', e)
    }
  }

  /**
   * Fetch all available badges
   */
  const fetchAllBadges = async () => {
    try {
      const { data, error: err } = await supabase
        .from('loyalty_badges')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (err) throw err
      allBadges.value = data || []
    } catch (e: any) {
      console.error('Fetch all badges error:', e)
    }
  }

  /**
   * Fetch tier benefits for user's current tier
   */
  const fetchTierBenefits = async (tierId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('tier_benefits')
        .select('*')
        .eq('tier_id', tierId)
        .eq('is_active', true)
        .order('sort_order')

      if (err) throw err
      tierBenefits.value = data || []
    } catch (e: any) {
      console.error('Fetch tier benefits error:', e)
    }
  }

  /**
   * Update challenge progress (called after completing actions)
   */
  const updateProgress = async (action: string, count = 1, amount = 0) => {
    if (!authStore.user?.id) return 0

    try {
      const { data, error: err } = await supabase
        .rpc('update_challenge_progress', {
          p_user_id: authStore.user.id,
          p_action: action,
          p_count: count,
          p_amount: amount
        })

      if (err) throw err
      
      // Refresh challenges
      await fetchChallenges()
      
      return data || 0
    } catch (e: any) {
      console.error('Update progress error:', e)
      return 0
    }
  }

  /**
   * Update user streak
   */
  const updateStreak = async (streakType: string) => {
    if (!authStore.user?.id) return null

    try {
      const { data, error: err } = await supabase
        .rpc('update_user_streak', {
          p_user_id: authStore.user.id,
          p_streak_type: streakType
        })

      if (err) throw err
      
      // Refresh streaks
      await fetchStreaks()
      
      return data?.[0] || null
    } catch (e: any) {
      console.error('Update streak error:', e)
      return null
    }
  }

  /**
   * Check and award badges
   */
  const checkBadges = async () => {
    if (!authStore.user?.id) return 0

    try {
      const { data, error: err } = await supabase
        .rpc('check_and_award_badges', { p_user_id: authStore.user.id })

      if (err) throw err
      
      // Refresh badges
      await fetchUserBadges()
      
      return data || 0
    } catch (e: any) {
      console.error('Check badges error:', e)
      return 0
    }
  }

  /**
   * Toggle badge display
   */
  const toggleBadgeDisplay = async (badgeId: string, isDisplayed: boolean) => {
    if (!authStore.user?.id) return false

    try {
      const { error: err } = await supabase
        .from('user_badges')
        .update({ is_displayed: isDisplayed })
        .eq('user_id', authStore.user.id)
        .eq('badge_id', badgeId)

      if (err) throw err
      
      // Update local state
      const badge = badges.value.find(b => b.badge_id === badgeId)
      if (badge) badge.is_displayed = isDisplayed
      
      return true
    } catch (e: any) {
      console.error('Toggle badge display error:', e)
      return false
    }
  }

  /**
   * Initialize loyalty data
   */
  const initLoyalty = async () => {
    await Promise.all([
      fetchChallenges(),
      fetchStreaks(),
      fetchUserBadges(),
      fetchAllBadges()
    ])
  }

  // =====================================================
  // ADMIN FUNCTIONS
  // =====================================================

  /**
   * Fetch all challenges (admin)
   */
  const fetchAllChallenges = async (filter?: { type?: string; active?: boolean }) => {
    try {
      let query = supabase
        .from('loyalty_challenges')
        .select('*')
        .order('sort_order')

      if (filter?.type) query = query.eq('challenge_type', filter.type)
      if (filter?.active !== undefined) query = query.eq('is_active', filter.active)

      const { data, error: err } = await query
      if (err) throw err
      return data || []
    } catch (e: any) {
      console.error('Fetch all challenges error:', e)
      return []
    }
  }

  /**
   * Create challenge (admin)
   */
  const createChallenge = async (challenge: Partial<LoyaltyChallenge>) => {
    try {
      const { data, error: err } = await supabase
        .from('loyalty_challenges')
        .insert(challenge)
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Create challenge error:', e)
      return null
    }
  }

  /**
   * Update challenge (admin)
   */
  const updateChallenge = async (id: string, updates: Partial<LoyaltyChallenge>) => {
    try {
      const { data, error: err } = await supabase
        .from('loyalty_challenges')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Update challenge error:', e)
      return null
    }
  }

  /**
   * Delete challenge (admin)
   */
  const deleteChallenge = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('loyalty_challenges')
        .delete()
        .eq('id', id)

      if (err) throw err
      return true
    } catch (e: any) {
      console.error('Delete challenge error:', e)
      return false
    }
  }

  /**
   * Create badge (admin)
   */
  const createBadge = async (badge: Partial<LoyaltyBadge>) => {
    try {
      const { data, error: err } = await supabase
        .from('loyalty_badges')
        .insert(badge)
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Create badge error:', e)
      return null
    }
  }

  /**
   * Update badge (admin)
   */
  const updateBadge = async (id: string, updates: Partial<LoyaltyBadge>) => {
    try {
      const { data, error: err } = await supabase
        .from('loyalty_badges')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Update badge error:', e)
      return null
    }
  }

  /**
   * Create tier benefit (admin)
   */
  const createTierBenefit = async (benefit: Partial<TierBenefit>) => {
    try {
      const { data, error: err } = await supabase
        .from('tier_benefits')
        .insert(benefit)
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Create tier benefit error:', e)
      return null
    }
  }

  /**
   * Fetch challenge analytics (admin)
   */
  const fetchChallengeAnalytics = async (challengeId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('challenge_id', challengeId)

      if (err) throw err

      const total = data?.length || 0
      const completed = data?.filter(p => p.is_completed).length || 0
      const avgProgress = total > 0 
        ? data!.reduce((sum, p) => sum + (p.current_count || 0), 0) / total 
        : 0

      return {
        total_participants: total,
        completed_count: completed,
        completion_rate: total > 0 ? (completed / total * 100).toFixed(1) : 0,
        avg_progress: avgProgress.toFixed(1)
      }
    } catch (e: any) {
      console.error('Fetch challenge analytics error:', e)
      return null
    }
  }

  /**
   * Fetch badge analytics (admin)
   */
  const fetchBadgeAnalytics = async () => {
    try {
      const { data, error: err } = await supabase
        .from('user_badges')
        .select('badge_id, loyalty_badges(name, name_th)')

      if (err) throw err

      // Count badges
      const badgeCounts: Record<string, { name: string; name_th: string; count: number }> = {}
      data?.forEach(ub => {
        const badge = ub.badge_id
        if (!badgeCounts[badge]) {
          badgeCounts[badge] = {
            name: (ub as any).loyalty_badges?.name || '',
            name_th: (ub as any).loyalty_badges?.name_th || '',
            count: 0
          }
        }
        badgeCounts[badge].count++
      })

      return Object.entries(badgeCounts).map(([id, data]) => ({
        badge_id: id,
        ...data
      })).sort((a, b) => b.count - a.count)
    } catch (e: any) {
      console.error('Fetch badge analytics error:', e)
      return []
    }
  }

  /**
   * Fetch streak leaderboard (admin)
   */
  const fetchStreakLeaderboard = async (streakType: string, limit = 10) => {
    try {
      const { data, error: err } = await supabase
        .from('user_streaks')
        .select('*, users(name, email)')
        .eq('streak_type', streakType)
        .order('current_streak', { ascending: false })
        .limit(limit)

      if (err) throw err
      return data || []
    } catch (e: any) {
      console.error('Fetch streak leaderboard error:', e)
      return []
    }
  }

  return {
    // State
    loading,
    error,
    challenges,
    streaks,
    badges,
    allBadges,
    tierBenefits,

    // Computed
    activeChallenges,
    completedChallenges,
    dailyChallenges,
    weeklyChallenges,
    totalBadges,
    displayedBadges,
    currentStreak,
    longestStreak,

    // Customer functions
    fetchChallenges,
    fetchStreaks,
    fetchUserBadges,
    fetchAllBadges,
    fetchTierBenefits,
    updateProgress,
    updateStreak,
    checkBadges,
    toggleBadgeDisplay,
    initLoyalty,

    // Admin functions
    fetchAllChallenges,
    createChallenge,
    updateChallenge,
    deleteChallenge,
    createBadge,
    updateBadge,
    createTierBenefit,
    fetchChallengeAnalytics,
    fetchBadgeAnalytics,
    fetchStreakLeaderboard
  }
}
