/**
 * useLaundryV2 - Enhanced Laundry Service
 * Feature: F160 - Laundry Service Features V2
 * Tables: laundry_service_types, laundry_items, laundry_subscriptions, laundry_pickup_schedule
 * Migration: 076_laundry_v2.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface LaundryServiceType {
  id: string
  name: string
  name_th: string
  description?: string
  price_per_kg?: number
  price_per_piece?: number
  processing_hours: number
  is_express_available: boolean
  express_surcharge_pct: number
}

export interface LaundryItem {
  id: string
  laundry_id: string
  service_type_id?: string
  item_type?: string
  quantity: number
  weight_kg?: number
  status: string
  unit_price?: number
  total_price?: number
}

export interface LaundrySubscription {
  id: string
  user_id: string
  plan_name: string
  plan_name_th: string
  kg_per_month: number
  monthly_price: number
  kg_used_this_month: number
  status: string
  start_date: string
  next_billing_date?: string
  preferred_pickup_day?: string
  preferred_pickup_time?: string
}

export interface LaundryPriceResult {
  subtotal: number
  express_fee: number
  total: number
  item_breakdown: any[]
}

export function useLaundryV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const serviceTypes = ref<LaundryServiceType[]>([])
  const items = ref<LaundryItem[]>([])
  const subscription = ref<LaundrySubscription | null>(null)
  const pickupSchedule = ref<any[]>([])

  const hasActiveSubscription = computed(() => subscription.value?.status === 'active')
  const remainingKg = computed(() => {
    if (!subscription.value) return 0
    return subscription.value.kg_per_month - subscription.value.kg_used_this_month
  })

  const fetchServiceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('laundry_service_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      serviceTypes.value = data || []
    } catch (e) {
      console.error('Fetch service types error:', e)
    }
  }

  const calculatePrice = async (items: any[], isExpress = false): Promise<LaundryPriceResult | null> => {
    try {
      const { data, error } = await supabase.rpc('calculate_laundry_price', {
        p_items: items,
        p_is_express: isExpress
      })
      if (error) throw error
      return data?.[0] || null
    } catch (e) {
      console.error('Calculate price error:', e)
      return null
    }
  }

  const fetchItems = async (laundryId: string) => {
    try {
      const { data, error } = await supabase
        .from('laundry_items')
        .select('*, service_type:laundry_service_types(*)')
        .eq('laundry_id', laundryId)
      if (error) throw error
      items.value = data || []
    } catch (e) {
      console.error('Fetch items error:', e)
    }
  }

  const updateItemStatus = async (itemId: string, status: string, afterPhoto?: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('update_laundry_item_status', {
        p_item_id: itemId,
        p_status: status,
        p_after_photo: afterPhoto
      })
      if (error) throw error
      return data || false
    } catch (e) {
      console.error('Update item status error:', e)
      return false
    }
  }

  const fetchSubscription = async () => {
    if (!authStore.user?.id) return
    try {
      const { data, error } = await supabase
        .from('laundry_subscriptions')
        .select('*')
        .eq('user_id', authStore.user.id)
        .eq('status', 'active')
        .single()
      if (error && error.code !== 'PGRST116') throw error
      subscription.value = data
    } catch (e) {
      console.error('Fetch subscription error:', e)
    }
  }

  const createSubscription = async (
    planName: string,
    kgPerMonth: number,
    monthlyPrice: number,
    pickupDay?: string,
    pickupTime?: string
  ): Promise<string | null> => {
    if (!authStore.user?.id) return null
    try {
      const { data, error } = await supabase.rpc('create_laundry_subscription', {
        p_user_id: authStore.user.id,
        p_plan_name: planName,
        p_kg_per_month: kgPerMonth,
        p_monthly_price: monthlyPrice,
        p_pickup_day: pickupDay,
        p_pickup_time: pickupTime
      })
      if (error) throw error
      await fetchSubscription()
      return data
    } catch (e) {
      console.error('Create subscription error:', e)
      return null
    }
  }

  const cancelSubscription = async (): Promise<boolean> => {
    if (!subscription.value) return false
    try {
      const { error } = await supabase
        .from('laundry_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.value.id)
      if (error) throw error
      subscription.value = null
      return true
    } catch (e) {
      console.error('Cancel subscription error:', e)
      return false
    }
  }

  const fetchPickupSchedule = async () => {
    if (!authStore.user?.id) return
    try {
      const { data, error } = await supabase
        .from('laundry_pickup_schedule')
        .select('*')
        .eq('user_id', authStore.user.id)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date')
      if (error) throw error
      pickupSchedule.value = data || []
    } catch (e) {
      console.error('Fetch pickup schedule error:', e)
    }
  }

  const init = async () => {
    loading.value = true
    try {
      await Promise.all([fetchServiceTypes(), fetchSubscription()])
    } finally {
      loading.value = false
    }
  }

  return {
    loading, serviceTypes, items, subscription, pickupSchedule,
    hasActiveSubscription, remainingKg,
    fetchServiceTypes, calculatePrice, fetchItems, updateItemStatus,
    fetchSubscription, createSubscription, cancelSubscription, fetchPickupSchedule, init
  }
}
