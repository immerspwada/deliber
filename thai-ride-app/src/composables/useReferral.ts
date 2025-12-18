import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface ReferralCode {
  id: string
  code: string
  reward_amount: number
  referee_reward: number
  usage_count: number
  max_usage: number | null
  is_active: boolean
  created_at: string
}

export interface Referral {
  id: string
  referrer_id: string
  referee_id: string
  referral_code: string
  referrer_reward: number
  referee_reward: number
  status: 'pending' | 'completed' | 'expired'
  completed_at: string | null
  created_at: string
  referee?: {
    name: string
    email: string
  }
}

export interface ReferralStats {
  total_invited: number
  total_completed: number
  total_earned: number
}

export function useReferral() {
  const authStore = useAuthStore()
  const referralCode = ref<ReferralCode | null>(null)
  const referrals = ref<Referral[]>([])
  const stats = ref<ReferralStats>({ total_invited: 0, total_completed: 0, total_earned: 0 })
  const loading = ref(false)

  // Fetch or generate referral code
  const fetchReferralCode = async () => {
    if (!authStore.user?.id) return null

    try {
      // First try to get existing code
      const { data: existing } = await (supabase
        .from('referral_codes') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .single()

      if (existing) {
        referralCode.value = existing as ReferralCode
        return referralCode.value
      }

      // Generate new code using database function
      const { data: newCode } = await (supabase.rpc as any)('generate_referral_code', {
        p_user_id: authStore.user.id
      })

      if (newCode) {
        // Fetch the created code
        const { data } = await (supabase
          .from('referral_codes') as any)
          .select('*')
          .eq('user_id', authStore.user.id)
          .single()

        if (data) {
          referralCode.value = data as ReferralCode
        }
      }

      return referralCode.value
    } catch (err) {
      console.error('Error fetching referral code:', err)
      return null
    }
  }

  // Fetch referral history
  const fetchReferrals = async () => {
    if (!authStore.user?.id) {
      referrals.value = []
      return []
    }

    loading.value = true
    try {
      const { data, error } = await (supabase
        .from('referrals') as any)
        .select(`
          *,
          referee:users!referrals_referee_id_fkey (name, email)
        `)
        .eq('referrer_id', authStore.user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        referrals.value = data as Referral[]
        
        // Calculate stats
        stats.value = {
          total_invited: data.length,
          total_completed: data.filter((r: any) => r.status === 'completed').length,
          total_earned: data
            .filter((r: any) => r.status === 'completed')
            .reduce((sum: number, r: any) => sum + (r.referrer_reward || 0), 0)
        }
      }

      return referrals.value
    } catch (err) {
      console.error('Error fetching referrals:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Apply referral code (for new users)
  const applyReferralCode = async (code: string) => {
    if (!authStore.user?.id) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    }

    try {
      const { data, error } = await (supabase.rpc as any)('apply_referral_code', {
        p_referee_id: authStore.user.id,
        p_code: code.toUpperCase()
      })

      if (error) {
        return { success: false, message: error.message }
      }

      if (data && Array.isArray(data) && data.length > 0) {
        return {
          success: data[0].success,
          message: data[0].message,
          reward: data[0].reward_amount
        }
      }

      return { success: false, message: 'เกิดข้อผิดพลาด' }
    } catch (err) {
      console.error('Error applying referral code:', err)
      return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }
    }
  }

  // Get referral link
  const getReferralLink = computed(() => {
    if (!referralCode.value?.code) return ''
    return `https://gobear.app/invite/${referralCode.value.code}`
  })

  // Copy referral code
  const copyCode = async () => {
    if (!referralCode.value?.code) return false
    try {
      await navigator.clipboard.writeText(referralCode.value.code)
      return true
    } catch {
      return false
    }
  }

  // Copy referral link
  const copyLink = async () => {
    if (!getReferralLink.value) return false
    try {
      await navigator.clipboard.writeText(getReferralLink.value)
      return true
    } catch {
      return false
    }
  }

  // Share referral
  const shareReferral = async () => {
    if (!referralCode.value?.code) return false

    const shareData = {
      title: 'ชวนใช้ GOBEAR',
      text: `ใช้โค้ด ${referralCode.value.code} รับส่วนลด ${referralCode.value.referee_reward} บาท!`,
      url: getReferralLink.value
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return true
      } catch {
        return copyLink()
      }
    } else {
      return copyLink()
    }
  }

  // Format referral status
  const formatStatus = (status: string): string => {
    const statuses: Record<string, string> = {
      pending: 'รอดำเนินการ',
      completed: 'สำเร็จ',
      expired: 'หมดอายุ'
    }
    return statuses[status] || status
  }

  // Mask name for privacy
  const maskName = (name: string): string => {
    if (!name || name.length < 2) return '***'
    const parts = name.split(' ')
    return parts.map(part => {
      if (part.length <= 2) return part[0] + '***'
      return part[0] + '***' + part[part.length - 1]
    }).join(' ')
  }

  return {
    referralCode,
    referrals,
    stats,
    loading,
    getReferralLink,
    fetchReferralCode,
    fetchReferrals,
    applyReferralCode,
    copyCode,
    copyLink,
    shareReferral,
    formatStatus,
    maskName
  }
}
