/**
 * Feature: F156 - Customer Loyalty Program
 * Tables: user_loyalty, points_transactions, loyalty_rewards, user_rewards, loyalty_tiers
 * Migration: 023_loyalty_program.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface LoyaltyTier {
  id: string
  name: string
  name_th: string
  min_points: number
  multiplier: number
  benefits: string[]
  badge_color: string
  icon_name?: string
}

export interface UserLoyalty {
  id: string
  user_id: string
  current_points: number
  lifetime_points: number
  current_tier_id: string
  tier?: LoyaltyTier
}

export interface PointsTransaction {
  id: string
  user_id: string
  points: number
  type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjust'
  source?: string
  reference_id?: string
  description?: string
  expires_at?: string
  created_at: string
}

export interface LoyaltyReward {
  id: string
  name: string
  name_th: string
  description?: string
  description_th?: string
  type: 'discount' | 'free_ride' | 'voucher' | 'gift'
  points_required: number
  value: number
  value_type: 'fixed' | 'percentage'
  max_discount?: number
  min_order_value: number
  valid_days: number
  quantity_limit?: number
  quantity_redeemed: number
  tier_required?: string
  image_url?: string
  is_active: boolean
}

export interface UserReward {
  id: string
  user_id: string
  reward_id: string
  points_spent: number
  code: string
  status: 'active' | 'used' | 'expired'
  used_at?: string
  expires_at: string
  created_at: string
  reward?: LoyaltyReward
}

export interface LoyaltySummary {
  current_points: number
  lifetime_points: number
  tier: LoyaltyTier
  next_tier?: {
    id: string
    name: string
    name_th: string
    min_points: number
    points_needed: number
  }
}

export function useLoyalty() {
  const authStore = useAuthStore()
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  const summary = ref<LoyaltySummary | null>(null)
  const transactions = ref<PointsTransaction[]>([])
  const rewards = ref<LoyaltyReward[]>([])
  const userRewards = ref<UserReward[]>([])
  const tiers = ref<LoyaltyTier[]>([])

  // Computed
  const currentPoints = computed(() => summary.value?.current_points || 0)
  const lifetimePoints = computed(() => summary.value?.lifetime_points || 0)
  const currentTier = computed(() => summary.value?.tier)
  const nextTier = computed(() => summary.value?.next_tier)
  const progressToNextTier = computed(() => {
    if (!nextTier.value || !currentTier.value) return 100
    const current = lifetimePoints.value - (currentTier.value.min_points || 0)
    const needed = nextTier.value.min_points - (currentTier.value.min_points || 0)
    return Math.min(100, Math.round((current / needed) * 100))
  })

  // Fetch loyalty summary
  const fetchSummary = async () => {
    if (!authStore.user?.id) return null
    
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await supabase
        .rpc('get_loyalty_summary', { p_user_id: authStore.user.id } as any)
      
      if (err) throw err
      
      // Handle array response from RPC (returns TABLE)
      const result = Array.isArray(data) ? data[0] : data
      if (result) {
        const r = result as any
        summary.value = {
          current_points: r.current_points,
          lifetime_points: r.lifetime_points,
          tier: r.tier as LoyaltyTier,
          next_tier: r.next_tier ? {
            id: r.next_tier.id,
            name: r.next_tier.name,
            name_th: r.next_tier.name_th,
            min_points: r.next_tier.min_points,
            points_needed: r.next_tier.points_needed
          } : undefined
        }
      }
      return summary.value
    } catch (e: any) {
      error.value = e.message
      // Demo fallback
      summary.value = {
        current_points: 1250,
        lifetime_points: 3500,
        tier: {
          id: 'demo-silver',
          name: 'Silver',
          name_th: 'ซิลเวอร์',
          min_points: 1000,
          multiplier: 1.2,
          benefits: ['สะสมแต้ม 1.2 แต้ม/บาท', 'ส่วนลด 5% ทุกเดือน'],
          badge_color: '#C0C0C0'
        },
        next_tier: {
          id: 'demo-gold',
          name: 'Gold',
          name_th: 'โกลด์',
          min_points: 5000,
          points_needed: 1500
        }
      }
      return summary.value
    } finally {
      loading.value = false
    }
  }

  // Fetch tiers
  const fetchTiers = async () => {
    try {
      const { data, error: err } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      
      if (err) throw err
      tiers.value = data || []
      return data
    } catch (e) {
      // Demo fallback
      tiers.value = [
        { id: '1', name: 'Bronze', name_th: 'บรอนซ์', min_points: 0, multiplier: 1.0, benefits: ['สะสมแต้ม 1 แต้ม/บาท'], badge_color: '#CD7F32' },
        { id: '2', name: 'Silver', name_th: 'ซิลเวอร์', min_points: 1000, multiplier: 1.2, benefits: ['สะสมแต้ม 1.2 แต้ม/บาท', 'ส่วนลด 5% ทุกเดือน'], badge_color: '#C0C0C0' },
        { id: '3', name: 'Gold', name_th: 'โกลด์', min_points: 5000, multiplier: 1.5, benefits: ['สะสมแต้ม 1.5 แต้ม/บาท', 'ส่วนลด 10% ทุกเดือน', 'Priority Support'], badge_color: '#FFD700' },
        { id: '4', name: 'Platinum', name_th: 'แพลทินัม', min_points: 15000, multiplier: 2.0, benefits: ['สะสมแต้ม 2 แต้ม/บาท', 'ส่วนลด 15% ทุกเดือน', 'Priority Support', 'Free Cancellation'], badge_color: '#E5E4E2' }
      ]
      return tiers.value
    }
  }

  // Fetch transactions
  const fetchTransactions = async (limit = 20) => {
    if (!authStore.user?.id) return []
    
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (err) throw err
      transactions.value = data || []
      return data
    } catch (e) {
      // Demo fallback
      transactions.value = [
        { id: '1', user_id: '', points: 85, type: 'earn', source: 'ride', description: 'แต้มจากการเดินทาง', created_at: new Date().toISOString() },
        { id: '2', user_id: '', points: 45, type: 'earn', source: 'delivery', description: 'แต้มจากการส่งของ', created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', user_id: '', points: -200, type: 'redeem', source: 'reward', description: 'แลกส่วนลด 20 บาท', created_at: new Date(Date.now() - 172800000).toISOString() },
        { id: '4', user_id: '', points: 100, type: 'bonus', source: 'referral', description: 'โบนัสชวนเพื่อน', created_at: new Date(Date.now() - 259200000).toISOString() }
      ]
      return transactions.value
    } finally {
      loading.value = false
    }
  }

  // Fetch available rewards
  const fetchRewards = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_required')
      
      if (err) throw err
      rewards.value = data || []
      return data
    } catch (e) {
      // Demo fallback
      rewards.value = [
        { id: '1', name: 'ส่วนลด 20 บาท', name_th: 'ส่วนลด 20 บาท', description_th: 'ส่วนลด 20 บาทสำหรับการเดินทางครั้งถัดไป', type: 'discount', points_required: 200, value: 20, value_type: 'fixed', min_order_value: 0, valid_days: 30, quantity_redeemed: 0, is_active: true },
        { id: '2', name: 'ส่วนลด 50 บาท', name_th: 'ส่วนลด 50 บาท', description_th: 'ส่วนลด 50 บาทสำหรับการเดินทางครั้งถัดไป', type: 'discount', points_required: 450, value: 50, value_type: 'fixed', min_order_value: 0, valid_days: 30, quantity_redeemed: 0, is_active: true },
        { id: '3', name: 'ส่วนลด 10%', name_th: 'ส่วนลด 10%', description_th: 'ส่วนลด 10% สูงสุด 100 บาท', type: 'discount', points_required: 800, value: 10, value_type: 'percentage', max_discount: 100, min_order_value: 0, valid_days: 30, quantity_redeemed: 0, is_active: true },
        { id: '4', name: 'เดินทางฟรี', name_th: 'เดินทางฟรี', description_th: 'เดินทางฟรี 1 ครั้ง (สูงสุด 100 บาท)', type: 'free_ride', points_required: 1500, value: 100, value_type: 'fixed', min_order_value: 0, valid_days: 60, quantity_redeemed: 0, is_active: true }
      ]
      return rewards.value
    } finally {
      loading.value = false
    }
  }

  // Fetch user's redeemed rewards
  const fetchUserRewards = async () => {
    if (!authStore.user?.id) return []
    
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('user_rewards')
        .select('*, reward:loyalty_rewards(*)')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
      
      if (err) throw err
      userRewards.value = data || []
      return data
    } catch (e) {
      // Demo fallback
      userRewards.value = [
        { id: '1', user_id: '', reward_id: '1', points_spent: 200, code: 'RWD12345678', status: 'active', expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), created_at: new Date().toISOString() }
      ]
      return userRewards.value
    } finally {
      loading.value = false
    }
  }

  // Redeem a reward
  const redeemReward = async (rewardId: string) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return null
    }
    
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await supabase
        .rpc('redeem_reward', {
          p_user_id: authStore.user.id,
          p_reward_id: rewardId
        } as any)
      
      if (err) throw err
      
      // Handle array response from RPC (returns TABLE)
      const result = Array.isArray(data) ? data[0] : data
      const r = result as any
      
      if (r && !r.success) {
        error.value = r.message || 'ไม่สามารถแลกรางวัลได้'
        return null
      }
      
      // Refresh data
      await Promise.all([fetchSummary(), fetchUserRewards()])
      
      return result
    } catch (e: any) {
      error.value = e.message || 'ไม่สามารถแลกรางวัลได้'
      return null
    } finally {
      loading.value = false
    }
  }

  // Check if user can redeem a reward
  const canRedeem = (reward: LoyaltyReward) => {
    return currentPoints.value >= reward.points_required
  }

  // Format points with + or -
  const formatPoints = (points: number) => {
    if (points > 0) return `+${points.toLocaleString()}`
    return points.toLocaleString()
  }

  // Get transaction icon
  const getTransactionIcon = (type: string, source?: string) => {
    if (type === 'redeem') return 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
    if (source === 'ride') return 'M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14'
    if (source === 'delivery') return 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    if (source === 'shopping') return 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'
    if (source === 'referral') return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'
    return 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
  }

  return {
    // State
    loading,
    error,
    summary,
    transactions,
    rewards,
    userRewards,
    tiers,
    
    // Computed
    currentPoints,
    lifetimePoints,
    currentTier,
    nextTier,
    progressToNextTier,
    
    // Methods
    fetchSummary,
    fetchTiers,
    fetchTransactions,
    fetchRewards,
    fetchUserRewards,
    redeemReward,
    canRedeem,
    formatPoints,
    getTransactionIcon
  }
}
