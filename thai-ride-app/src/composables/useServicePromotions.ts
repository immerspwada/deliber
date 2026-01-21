/**
 * useServicePromotions - จัดการโปรโมชั่นบริการ
 */
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface ServicePromotion {
  id: string
  service_id: string
  title: string
  description: string | null
  discount_type: 'percentage' | 'fixed' | 'free_delivery'
  discount_value: number
  min_order_amount: number
  max_discount: number | null
  promo_code: string | null
  image_url: string | null
  end_date: string
}

const promotions = ref<ServicePromotion[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useServicePromotions() {
  const getPromotionsByService = (serviceId: string) =>
    computed(() => promotions.value.filter(p => p.service_id === serviceId))

  const hasPromotion = (serviceId: string) =>
    promotions.value.some(p => p.service_id === serviceId)

  const getPromotionBadge = (serviceId: string): string | null => {
    const promo = promotions.value.find(p => p.service_id === serviceId)
    if (!promo) return null

    switch (promo.discount_type) {
      case 'percentage':
        return `ลด ${promo.discount_value}%`
      case 'fixed':
        return `ลด ฿${promo.discount_value}`
      case 'free_delivery':
        return 'ส่งฟรี'
      default:
        return 'โปรโมชั่น'
    }
  }

  async function fetchPromotions(serviceId?: string) {
    loading.value = true
    error.value = null

    try {
      // Try using RPC function first (production)
      const { data, error: fetchError } = await supabase
        .rpc('get_service_promotions', { p_service_id: serviceId || null })

      if (fetchError) {
        // If RPC function doesn't exist, use direct table query
        if (fetchError.code === 'PGRST202') {
          let query = supabase
            .from('service_promotions')
            .select(`
              id,
              service_id,
              title,
              description,
              discount_type,
              discount_value,
              min_order_amount,
              max_discount,
              promo_code,
              image_url,
              end_date
            `)
            .eq('is_active', true)
            .lte('start_date', new Date().toISOString())
            .gte('end_date', new Date().toISOString())
            .order('end_date', { ascending: true })

          if (serviceId) {
            query = query.eq('service_id', serviceId)
          }

          const { data: fallbackData, error: fallbackError } = await query

          if (fallbackError) {
            console.error('[ServicePromotions] Database error:', fallbackError)
            throw new Error('Database schema not ready. Please apply migration 241.')
          }
          promotions.value = (fallbackData || []) as ServicePromotion[]
          return
        }
        throw fetchError
      }
      
      promotions.value = (data || []) as ServicePromotion[]
    } catch (err) {
      console.error('Error fetching promotions:', err)
      error.value = 'ไม่สามารถโหลดโปรโมชั่นได้'
      promotions.value = []
    } finally {
      loading.value = false
    }
  }

  function formatDiscount(promo: ServicePromotion): string {
    switch (promo.discount_type) {
      case 'percentage':
        return `ลด ${promo.discount_value}%${promo.max_discount ? ` (สูงสุด ฿${promo.max_discount})` : ''}`
      case 'fixed':
        return `ลด ฿${promo.discount_value}`
      case 'free_delivery':
        return 'ส่งฟรี'
      default:
        return ''
    }
  }

  function getTimeRemaining(endDate: string): string {
    const end = new Date(endDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return 'หมดอายุแล้ว'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `เหลือ ${days} วัน`
    if (hours > 0) return `เหลือ ${hours} ชม.`
    return 'ใกล้หมดอายุ'
  }

  return {
    promotions,
    loading,
    error,
    getPromotionsByService,
    hasPromotion,
    getPromotionBadge,
    fetchPromotions,
    formatDiscount,
    getTimeRemaining
  }
}
