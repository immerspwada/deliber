/**
 * usePromoCodeGenerator - Promo Code Generator
 * Feature: F221 - Promo Code Generator
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface GeneratedPromo {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  max_uses: number
  current_uses: number
  valid_from: string
  valid_until: string
  is_active: boolean
}

export interface PromoTemplate {
  id: string
  name: string
  prefix: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  validity_days: number
}

export function usePromoCodeGenerator() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const promos = ref<GeneratedPromo[]>([])
  const templates = ref<PromoTemplate[]>([])

  const activePromos = computed(() => promos.value.filter(p => p.is_active && new Date(p.valid_until) > new Date()))

  const generateCode = (prefix: string, length = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = prefix
    for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    return code
  }

  const fetchPromos = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false }).limit(200)
      if (err) throw err
      promos.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const createPromo = async (promo: Partial<GeneratedPromo>): Promise<GeneratedPromo | null> => {
    try {
      const code = promo.code || generateCode('PROMO')
      const { data, error: err } = await supabase.from('promo_codes').insert({ ...promo, code, current_uses: 0, is_active: true } as never).select().single()
      if (err) throw err
      promos.value.unshift(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const deactivatePromo = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('promo_codes').update({ is_active: false } as never).eq('id', id)
      if (err) throw err
      const idx = promos.value.findIndex(p => p.id === id)
      if (idx !== -1) promos.value[idx].is_active = false
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getDiscountTypeText = (t: string) => ({ percentage: 'เปอร์เซ็นต์', fixed: 'จำนวนเงิน' }[t] || t)

  return { loading, error, promos, templates, activePromos, generateCode, fetchPromos, createPromo, deactivatePromo, getDiscountTypeText }
}
