/**
 * usePromoCampaign - Promo Campaign Management
 * Feature: F232 - Promo Campaign
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface PromoCampaign {
  id: string
  name: string
  name_th: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order: number
  max_discount?: number
  start_date: string
  end_date: string
  usage_limit?: number
  current_usage: number
  target_segment?: string
  is_active: boolean
}

export function usePromoCampaign() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const campaigns = ref<PromoCampaign[]>([])

  const activeCampaigns = computed(() => campaigns.value.filter(c => c.is_active && new Date(c.end_date) > new Date()))

  const fetchCampaigns = async () => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.from('promo_campaigns').select('*').order('start_date', { ascending: false })
      if (err) throw err
      campaigns.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const createCampaign = async (campaign: Partial<PromoCampaign>): Promise<PromoCampaign | null> => {
    try {
      const { data, error: err } = await supabase.from('promo_campaigns').insert({ ...campaign, current_usage: 0, is_active: true } as never).select().single()
      if (err) throw err
      campaigns.value.unshift(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const toggleCampaign = async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('promo_campaigns').update({ is_active: isActive } as never).eq('id', id)
      if (err) throw err
      const idx = campaigns.value.findIndex(c => c.id === id)
      if (idx !== -1) campaigns.value[idx].is_active = isActive
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getDiscountText = (c: PromoCampaign) => c.discount_type === 'percentage' ? `${c.discount_value}%` : `฿${c.discount_value}`

  return { loading, error, campaigns, activeCampaigns, fetchCampaigns, createCampaign, toggleCampaign, getDiscountText }
}
