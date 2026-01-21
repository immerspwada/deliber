/**
 * useSmartPromo - Smart Promo Recommendation System
 * แนะนำโปรโมชั่นที่เหมาะสมอัตโนมัติตามบริบท
 */
import { ref, computed, watch } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

interface PromoCode {
  id: string
  code: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_fare?: number
  max_discount?: number
  service_types?: string[]
  valid_from: string
  valid_until: string
  usage_limit?: number
  user_usage_limit?: number
  is_active: boolean
}

interface SmartPromoOptions {
  serviceType: string
  fare: number
  location?: { lat: number; lng: number }
  time?: Date
}

export function useSmartPromo(options: SmartPromoOptions) {
  const authStore = useAuthStore()
  const availablePromos = ref<PromoCode[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // คำนวณส่วนลดที่ได้จริง
  const calculateDiscount = (promo: PromoCode, fare: number): number => {
    let discount = 0

    if (promo.discount_type === 'percentage') {
      discount = (fare * promo.discount_value) / 100
      if (promo.max_discount && discount > promo.max_discount) {
        discount = promo.max_discount
      }
    } else {
      discount = promo.discount_value
    }

    return Math.min(discount, fare)
  }

  // คำนวณคะแนนความเหมาะสม
  const calculatePromoScore = (promo: PromoCode): number => {
    let score = 0

    // ส่วนลดที่ได้ (40%)
    const discount = calculateDiscount(promo, options.fare)
    const discountPercent = (discount / options.fare) * 100
    score += Math.min(discountPercent * 4, 40)

    // ความเหมาะสมกับ service type (20%)
    if (!promo.service_types || promo.service_types.includes(options.serviceType)) {
      score += 20
    }

    // ระยะเวลาคงเหลือ (15%)
    const daysLeft = Math.ceil(
      (new Date(promo.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    if (daysLeft <= 3) {
      score += 15 // ใกล้หมดอายุ = แนะนำเร็ว
    } else if (daysLeft <= 7) {
      score += 10
    } else {
      score += 5
    }

    // ความนิยม (15%)
    // TODO: เพิ่มข้อมูลการใช้งานจริง
    score += 10

    // เงื่อนไขขั้นต่ำ (10%)
    if (!promo.min_fare || options.fare >= promo.min_fare) {
      score += 10
    } else {
      const shortfall = promo.min_fare - options.fare
      score += Math.max(0, 10 - (shortfall / promo.min_fare) * 10)
    }

    return Math.round(score)
  }

  // โหลดโปรโมชั่นที่ใช้ได้
  const loadAvailablePromos = async () => {
    if (!authStore.user?.id) return

    loading.value = true
    error.value = null

    try {
      // ดึงโปรโมชั่นที่ active และยังไม่หมดอายุ
      const { data: promos, error: promosError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .lte('valid_from', new Date().toISOString())

      if (promosError) throw promosError

      // ตรวจสอบการใช้งานของ user
      const { data: userUsage, error: usageError } = await supabase
        .from('user_promo_usage')
        .select('promo_id')
        .eq('user_id', authStore.user.id)

      if (usageError) throw usageError

      // สร้าง Set ของ promo_id ที่ใช้แล้ว (schema ปัจจุบันเป็น UNIQUE per user/promo)
      const usedPromoIds = new Set(
        userUsage?.map((u: { promo_id: string }) => u.promo_id) || []
      )

      // กรองโปรโมชั่นที่ใช้ได้
      availablePromos.value = (promos || []).filter((promo: PromoCode) => {
        // ตรวจสอบ service type
        if (promo.service_types && !promo.service_types.includes(options.serviceType)) {
          return false
        }

        // ตรวจสอบ min fare
        if (promo.min_fare && options.fare < promo.min_fare) {
          return false
        }

        // ตรวจสอบ user usage limit (schema ปัจจุบันเป็น 1 ครั้งต่อ promo)
        if (usedPromoIds.has(promo.id)) {
          return false
        }

        return true
      })
    } catch (err) {
      console.error('[useSmartPromo] Error loading promos:', err)
      error.value = 'ไม่สามารถโหลดโปรโมชั่นได้'
    } finally {
      loading.value = false
    }
  }

  // โปรโมชั่นที่ดีที่สุด
  const bestPromo = computed(() => {
    if (availablePromos.value.length === 0) return null

    const scored = availablePromos.value.map((promo) => ({
      ...promo,
      score: calculatePromoScore(promo),
      discount: calculateDiscount(promo, options.fare),
    }))

    return scored.sort((a, b) => b.score - a.score)[0]
  })

  // โปรโมชั่นทั้งหมดเรียงตามคะแนน
  const rankedPromos = computed(() => {
    return availablePromos.value
      .map((promo) => ({
        ...promo,
        score: calculatePromoScore(promo),
        discount: calculateDiscount(promo, options.fare),
      }))
      .sort((a, b) => b.score - a.score)
  })

  // ใช้โปรโมชั่น
  const applyPromo = async (promoCode: string) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return null
    }

    try {
      // ตรวจสอบโปรโมชั่น
      const { data: promo, error: promoError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode)
        .eq('is_active', true)
        .single()

      if (promoError || !promo) {
        error.value = 'โค้ดโปรโมชั่นไม่ถูกต้อง'
        return null
      }

      // ตรวจสอบวันหมดอายุ
      if (new Date(promo.valid_until) < new Date()) {
        error.value = 'โค้ดโปรโมชั่นหมดอายุแล้ว'
        return null
      }

      // ตรวจสอบการใช้งาน
      const { data: usage } = await supabase
        .from('user_promo_usage')
        .select('id')
        .eq('user_id', authStore.user.id)
        .eq('promo_id', promo.id)
        .maybeSingle()

      if (usage) {
        error.value = 'คุณใช้โค้ดนี้แล้ว'
        return null
      }

      const discount = calculateDiscount(promo, options.fare)

      return {
        promo,
        discount,
        finalFare: options.fare - discount,
      }
    } catch (err) {
      console.error('[useSmartPromo] Error applying promo:', err)
      error.value = 'เกิดข้อผิดพลาดในการใช้โปรโมชั่น'
      return null
    }
  }

  // Auto-load เมื่อ options เปลี่ยน
  watch(
    () => [options.serviceType, options.fare],
    () => {
      loadAvailablePromos()
    },
    { immediate: true }
  )

  return {
    availablePromos,
    bestPromo,
    rankedPromos,
    loading,
    error,
    applyPromo,
    calculateDiscount,
    reload: loadAvailablePromos,
  }
}
