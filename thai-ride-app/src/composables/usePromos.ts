import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface PromoCode {
  id: string
  code: string
  discount_type: 'fixed' | 'percentage'
  discount_value: number
  min_order_amount?: number
  max_discount?: number
  valid_until: string
  description?: string
  category?: 'all' | 'ride' | 'delivery' | 'shopping'
  is_active?: boolean
  used?: boolean
  is_favorite?: boolean
}

export function usePromos() {
  const authStore = useAuthStore()
  const promos = ref<PromoCode[]>([])
  const favoritePromoIds = ref<Set<string>>(new Set())
  const loading = ref(false)

  // Fetch all active promos with favorite status
  const fetchPromos = async () => {
    loading.value = true
    try {
      const { data: promosData } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (authStore.user?.id) {
        const { data: favData } = await supabase
          .from('favorite_promos')
          .select('promo_id')
          .eq('user_id', authStore.user.id)

        if (favData) {
          favoritePromoIds.value = new Set(favData.map((f: any) => f.promo_id))
        }
      }

      if (promosData) {
        promos.value = promosData.map((p: any) => ({
          ...p,
          used: false,
          is_favorite: favoritePromoIds.value.has(p.id)
        }))
      }
    } catch (err) {
      console.error('Error fetching promos:', err)
    } finally {
      loading.value = false
    }
  }

  // Toggle favorite status
  const toggleFavorite = async (promoId: string) => {
    if (!authStore.user?.id) return false

    const isFavorite = favoritePromoIds.value.has(promoId)

    try {
      if (isFavorite) {
        await (supabase
          .from('favorite_promos') as any)
          .delete()
          .eq('user_id', authStore.user.id)
          .eq('promo_id', promoId)
        favoritePromoIds.value.delete(promoId)
      } else {
        await (supabase
          .from('favorite_promos') as any)
          .insert({ user_id: authStore.user.id, promo_id: promoId })
        favoritePromoIds.value.add(promoId)
      }

      // Update local state
      const promo = promos.value.find((p) => p.id === promoId)
      if (promo) promo.is_favorite = !isFavorite

      return true
    } catch (err) {
      console.error('Error toggling favorite:', err)
      return false
    }
  }

  // Check if promo is favorite
  const isFavorite = (promoId: string) => favoritePromoIds.value.has(promoId)

  // Get favorite promos only
  const favoritePromos = computed(() => promos.value.filter((p) => p.is_favorite))

  // Validate promo code
  const validatePromoCode = async (code: string) => {
    try {
      const { data, error } = await (supabase.rpc as any)('validate_promo_code', {
        p_code: code,
        p_user_id: authStore.user?.id
      })
      return { valid: !error && data, data, error }
    } catch {
      return { valid: false, data: null, error: 'ไม่สามารถตรวจสอบโค้ดได้' }
    }
  }

  // Subscribe to new promo notifications
  const subscribeToNewPromos = (callback: (promo: PromoCode) => void) => {
    return supabase
      .channel('new-promos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'promo_codes' },
        (payload) => {
          const newPromo = payload.new as PromoCode
          if (newPromo.is_active) {
            promos.value.unshift({ ...newPromo, used: false, is_favorite: false })
            callback(newPromo)
          }
        }
      )
      .subscribe()
  }

  return {
    promos,
    loading,
    favoritePromoIds,
    favoritePromos,
    fetchPromos,
    toggleFavorite,
    isFavorite,
    validatePromoCode,
    subscribeToNewPromos
  }
}
