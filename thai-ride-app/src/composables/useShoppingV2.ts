/**
 * useShoppingV2 - Enhanced Shopping Service
 * 
 * Feature: F04 - Shopping Service Optimization V2
 * Tables: store_catalog, shopping_list_templates, shopping_request_items, price_comparison
 * Migration: 073_shopping_v2.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface Store {
  id: string
  name: string
  name_th: string
  category: string
  lat?: number
  lng?: number
  address?: string
  logo_url?: string
  rating: number
  delivery_fee?: number
  min_order_amount?: number
  is_featured: boolean
}

export interface ShoppingTemplate {
  id: string
  user_id: string
  name: string
  description?: string
  items: Array<{ name: string; quantity: number; unit: string; estimated_price?: number }>
  preferred_store_id?: string
  estimated_total?: number
  is_public: boolean
  use_count: number
}

export interface ShoppingItem {
  id: string
  shopping_id: string
  item_name: string
  quantity: number
  unit: string
  notes?: string
  estimated_price?: number
  actual_price?: number
  status: 'pending' | 'found' | 'not_found' | 'substituted' | 'purchased'
  substitution_name?: string
  substitution_price?: number
  photo_url?: string
}

export function useShoppingV2() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const stores = ref<Store[]>([])
  const templates = ref<ShoppingTemplate[]>([])
  const items = ref<ShoppingItem[]>([])

  const featuredStores = computed(() => stores.value.filter(s => s.is_featured))

  const fetchNearbyStores = async (lat: number, lng: number, radiusKm = 5, category?: string) => {
    try {
      const { data, error: err } = await supabase
        .rpc('find_nearby_stores', {
          p_lat: lat,
          p_lng: lng,
          p_radius_km: radiusKm,
          p_category: category
        })
      if (err) throw err
      stores.value = data || []
    } catch (e: any) {
      console.error('Fetch stores error:', e)
    }
  }

  const fetchTemplates = async () => {
    if (!authStore.user?.id) return
    try {
      const { data, error: err } = await supabase
        .from('shopping_list_templates')
        .select('*')
        .or(`user_id.eq.${authStore.user.id},is_public.eq.true`)
        .order('use_count', { ascending: false })
      if (err) throw err
      templates.value = data || []
    } catch (e: any) {
      console.error('Fetch templates error:', e)
    }
  }

  const createTemplate = async (template: Partial<ShoppingTemplate>): Promise<ShoppingTemplate | null> => {
    if (!authStore.user?.id) return null
    try {
      const { data, error: err } = await supabase
        .from('shopping_list_templates')
        .insert({ ...template, user_id: authStore.user.id })
        .select()
        .single()
      if (err) throw err
      templates.value.unshift(data)
      return data
    } catch (e: any) {
      console.error('Create template error:', e)
      return null
    }
  }

  const createShoppingFromTemplate = async (
    templateId: string,
    deliveryAddress: string,
    deliveryLat: number,
    deliveryLng: number
  ): Promise<string | null> => {
    if (!authStore.user?.id) return null
    try {
      const { data, error: err } = await supabase
        .rpc('create_shopping_from_template', {
          p_user_id: authStore.user.id,
          p_template_id: templateId,
          p_delivery_address: deliveryAddress,
          p_delivery_lat: deliveryLat,
          p_delivery_lng: deliveryLng
        })
      if (err) throw err
      return data
    } catch (e: any) {
      console.error('Create shopping error:', e)
      return null
    }
  }

  const fetchItems = async (shoppingId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('shopping_request_items')
        .select('*')
        .eq('shopping_id', shoppingId)
      if (err) throw err
      items.value = data || []
    } catch (e: any) {
      console.error('Fetch items error:', e)
    }
  }

  const updateItemStatus = async (
    itemId: string,
    status: string,
    actualPrice?: number,
    substitutionName?: string,
    substitutionPrice?: number,
    photoUrl?: string
  ): Promise<boolean> => {
    try {
      const { data, error: err } = await supabase
        .rpc('update_shopping_item_status', {
          p_item_id: itemId,
          p_status: status,
          p_actual_price: actualPrice,
          p_substitution_name: substitutionName,
          p_substitution_price: substitutionPrice,
          p_photo_url: photoUrl
        })
      if (err) throw err
      return data || false
    } catch (e: any) {
      console.error('Update item status error:', e)
      return false
    }
  }

  const init = async () => {
    await fetchTemplates()
  }

  return {
    loading, error, stores, templates, items, featuredStores,
    fetchNearbyStores, fetchTemplates, createTemplate,
    createShoppingFromTemplate, fetchItems, updateItemStatus, init
  }
}
