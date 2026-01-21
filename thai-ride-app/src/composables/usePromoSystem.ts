/**
 * usePromoSystem - Complete Promo System Composable
 * 
 * Feature: F10 - Promo Codes (Enhanced)
 * Tables: promo_codes, promo_campaigns, promo_usage_analytics, user_promo_usage, favorite_promos
 * 
 * @syncs-with
 * - Admin: useAdminPromos.ts (CRUD, analytics, campaigns)
 * - Customer: PromotionsView.vue (view, use, favorite)
 * - Provider: See promo used in job details
 * - Database: Realtime subscription on promo_codes
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Types
export interface PromoCode {
  id: string
  code: string
  description: string | null
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  max_discount: number | null
  min_order_amount: number | null
  category: string | null
  service_types: string[] | null
  user_type: string | null
  usage_limit: number | null
  used_count: number | null
  per_user_limit: number | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  campaign_id: string | null
  created_at: string
}

export interface PromoValidationResult {
  is_valid: boolean
  discount_amount: number
  message: string
  promo_id: string | null
  discount_type: string | null
  discount_value: number | null
  max_discount: number | null
}

export interface UserPromo extends PromoCode {
  remaining_uses: number | null
  is_favorite: boolean
  estimated_discount: number
}

export interface UsedPromo {
  id: string
  promo_id: string
  promo_code: string
  discount_type: string
  discount_value: number
  discount_amount: number
  order_amount: number
  service_type: string
  request_id: string
  used_at: string
  promo_description: string | null
}

export function usePromoSystem() {
  const authStore = useAuthStore()
  
  // State
  const promos = ref<UserPromo[]>([])
  const usedPromos = ref<UsedPromo[]>([])
  const favoriteIds = ref<Set<string>>(new Set())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const validationResult = ref<PromoValidationResult | null>(null)

  // Computed
  const availablePromos = computed(() => 
    promos.value.filter(p => {
      const now = new Date()
      const validUntil = p.valid_until ? new Date(p.valid_until) : null
      return p.is_active && (!validUntil || validUntil > now)
    })
  )

  const favoritePromos = computed(() => 
    promos.value.filter(p => p.is_favorite)
  )

  const expiringSoonPromos = computed(() => {
    const threeDays = new Date()
    threeDays.setDate(threeDays.getDate() + 3)
    return availablePromos.value.filter(p => {
      if (!p.valid_until) return false
      const validUntil = new Date(p.valid_until)
      return validUntil <= threeDays
    })
  })

  const promosByCategory = computed(() => {
    const grouped: Record<string, UserPromo[]> = {
      all: [],
      ride: [],
      delivery: [],
      shopping: [],
      queue: [],
      moving: [],
      laundry: []
    }
    availablePromos.value.forEach(p => {
      const cat = p.category || 'all'
      if (grouped[cat]) grouped[cat].push(p)
      if (cat !== 'all') grouped.all.push(p)
    })
    return grouped
  })

  // Methods
  async function fetchPromos(serviceType?: string, orderAmount?: number) {
    if (!authStore.user?.id) return

    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await (supabase.rpc as any)('get_user_available_promos', {
        p_user_id: authStore.user.id,
        p_service_type: serviceType || null,
        p_order_amount: orderAmount || 0
      })

      if (err) throw err

      promos.value = (data || []).map((p: any) => ({
        ...p,
        is_favorite: p.is_favorite || false
      }))

      // Update favorite IDs
      favoriteIds.value = new Set(
        promos.value.filter(p => p.is_favorite).map(p => p.id)
      )
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'ไม่สามารถโหลดโปรโมชั่นได้'
      console.error('[usePromoSystem] fetchPromos error:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchUsedPromos(limit: number = 50) {
    if (!authStore.user?.id) return

    try {
      const { data, error: err } = await (supabase.rpc as any)('get_user_used_promos', {
        p_user_id: authStore.user.id,
        p_limit: limit
      })

      if (err) throw err
      usedPromos.value = data || []
    } catch (err) {
      console.error('[usePromoSystem] fetchUsedPromos error:', err)
    }
  }

  async function validatePromoCode(
    code: string, 
    orderAmount: number, 
    serviceType: string = 'ride'
  ): Promise<PromoValidationResult> {
    if (!authStore.user?.id) {
      return {
        is_valid: false,
        discount_amount: 0,
        message: 'กรุณาเข้าสู่ระบบก่อน',
        promo_id: null,
        discount_type: null,
        discount_value: null,
        max_discount: null
      }
    }

    try {
      const { data, error: err } = await (supabase.rpc as any)('validate_promo_code_v2', {
        p_code: code,
        p_user_id: authStore.user.id,
        p_order_amount: orderAmount,
        p_service_type: serviceType
      })

      if (err) throw err

      const result = (data as any[])?.[0] || {
        is_valid: false,
        discount_amount: 0,
        message: 'ไม่พบโค้ดส่วนลด',
        promo_id: null,
        discount_type: null,
        discount_value: null,
        max_discount: null
      }

      validationResult.value = result
      return result
    } catch (err) {
      console.error('[usePromoSystem] validatePromoCode error:', err)
      return {
        is_valid: false,
        discount_amount: 0,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบโค้ด',
        promo_id: null,
        discount_type: null,
        discount_value: null,
        max_discount: null
      }
    }
  }

  async function applyPromoCode(
    code: string,
    serviceType: string,
    requestId: string,
    orderAmount: number,
    discountAmount: number
  ): Promise<boolean> {
    if (!authStore.user?.id) return false

    try {
      const { data, error: err } = await (supabase.rpc as any)('apply_promo_code', {
        p_code: code,
        p_user_id: authStore.user.id,
        p_service_type: serviceType,
        p_request_id: requestId,
        p_order_amount: orderAmount,
        p_discount_amount: discountAmount
      })

      if (err) throw err
      return data === true
    } catch (err) {
      console.error('[usePromoSystem] applyPromoCode error:', err)
      return false
    }
  }

  // Apply promo to service request (update request with promo info)
  async function applyPromoToRequest(
    serviceType: string,
    requestId: string,
    promoCode: string,
    promoCodeId: string,
    discountAmount: number
  ): Promise<boolean> {
    try {
      const tableMap: Record<string, string> = {
        ride: 'ride_requests',
        delivery: 'delivery_requests',
        shopping: 'shopping_requests',
        queue: 'queue_bookings',
        moving: 'moving_requests',
        laundry: 'laundry_requests'
      }
      
      const tableName = tableMap[serviceType]
      if (!tableName) return false

      const { error: err } = await (supabase.from as any)(tableName)
        .update({
          promo_code_id: promoCodeId,
          promo_code: promoCode,
          promo_discount_amount: discountAmount
        })
        .eq('id', requestId)

      if (err) throw err
      return true
    } catch (err) {
      console.error('[usePromoSystem] applyPromoToRequest error:', err)
      return false
    }
  }

  // Get promo info for a job (for Provider)
  async function getJobPromoInfo(serviceType: string, requestId: string) {
    try {
      const { data, error: err } = await (supabase.rpc as any)('get_job_promo_info', {
        p_service_type: serviceType,
        p_request_id: requestId
      })

      if (err) throw err
      return (data as any[])?.[0] || null
    } catch (err) {
      console.error('[usePromoSystem] getJobPromoInfo error:', err)
      return null
    }
  }

  async function toggleFavorite(promoId: string): Promise<boolean> {
    if (!authStore.user?.id) return false

    const isFav = favoriteIds.value.has(promoId)

    try {
      if (isFav) {
        const { error: err } = await (supabase.from as any)('favorite_promos')
          .delete()
          .eq('user_id', authStore.user.id)
          .eq('promo_id', promoId)

        if (err) throw err
        favoriteIds.value.delete(promoId)
      } else {
        const { error: err } = await (supabase.from as any)('favorite_promos')
          .insert({ user_id: authStore.user.id, promo_id: promoId })

        if (err) throw err
        favoriteIds.value.add(promoId)
      }

      // Update local state
      const promo = promos.value.find(p => p.id === promoId)
      if (promo) promo.is_favorite = !isFav

      return true
    } catch (err) {
      console.error('[usePromoSystem] toggleFavorite error:', err)
      return false
    }
  }

  function isFavorite(promoId: string): boolean {
    return favoriteIds.value.has(promoId)
  }

  function calculateDiscount(promo: PromoCode, orderAmount: number): number {
    if (promo.discount_type === 'fixed') {
      return Math.min(promo.discount_value, orderAmount)
    } else {
      let discount = orderAmount * (promo.discount_value / 100)
      if (promo.max_discount && discount > promo.max_discount) {
        discount = promo.max_discount
      }
      return Math.min(discount, orderAmount)
    }
  }

  function formatDiscount(promo: PromoCode): string {
    if (promo.discount_type === 'fixed') {
      return `฿${promo.discount_value}`
    } else {
      return `${promo.discount_value}%`
    }
  }

  function getDaysRemaining(validUntil: string | null): number | null {
    if (!validUntil) return null
    const diff = new Date(validUntil).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  function isExpiringSoon(validUntil: string | null): boolean {
    const days = getDaysRemaining(validUntil)
    return days !== null && days <= 3 && days > 0
  }

  // Realtime subscription
  function subscribeToPromos(callback?: (promo: PromoCode) => void) {
    const channel = supabase
      .channel('promo-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'promo_codes' },
        (payload) => {
          const newPromo = payload.new as PromoCode
          if (newPromo.is_active) {
            promos.value.unshift({
              ...newPromo,
              remaining_uses: newPromo.per_user_limit,
              is_favorite: false,
              estimated_discount: 0
            })
            callback?.(newPromo)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'promo_codes' },
        (payload) => {
          const updated = payload.new as PromoCode
          const idx = promos.value.findIndex(p => p.id === updated.id)
          if (idx !== -1) {
            promos.value[idx] = {
              ...promos.value[idx],
              ...updated
            }
          }
        }
      )
      .subscribe()

    return () => channel.unsubscribe()
  }

  return {
    // State
    promos: readonly(promos),
    usedPromos: readonly(usedPromos),
    favoriteIds: readonly(favoriteIds),
    loading: readonly(loading),
    error: readonly(error),
    validationResult: readonly(validationResult),
    
    // Computed
    availablePromos,
    favoritePromos,
    expiringSoonPromos,
    promosByCategory,
    
    // Methods
    fetchPromos,
    fetchUsedPromos,
    validatePromoCode,
    applyPromoCode,
    applyPromoToRequest,
    getJobPromoInfo,
    toggleFavorite,
    isFavorite,
    calculateDiscount,
    formatDiscount,
    getDaysRemaining,
    isExpiringSoon,
    subscribeToPromos
  }
}
