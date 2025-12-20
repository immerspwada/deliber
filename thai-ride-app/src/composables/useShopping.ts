/**
 * useShopping - Customer Shopping Composable
 * 
 * Feature: F04 - Shopping Service
 * Tables: shopping_requests, service_providers
 * 
 * @syncs-with
 * - Admin: useAdmin.ts (ดู/จัดการออเดอร์, refund)
 * - Provider: useProvider.ts (รับงาน/อัพเดทสถานะ)
 * - Database: Realtime subscription on shopping_requests
 * - Notifications: Push notification เมื่อสถานะเปลี่ยน
 * 
 * @status-flow
 * Customer: createShopping → [pending]
 * Provider: accept → [accepted] → [shopping] → [purchased] → [delivering] → [delivered]
 * Customer: trackShopping, rateShopping
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import type { GeoLocation } from './useLocation'

export interface ShoppingItem {
  name: string
  quantity: number
  note?: string
}

export interface ShoppingRequest {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  store_name: string | null
  store_address: string | null
  store_lat: number | null
  store_lng: number | null
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  items: ShoppingItem[]
  item_list: string | null
  budget_limit: number
  special_instructions: string | null
  service_fee: number
  items_cost: number | null
  total_cost: number | null
  receipt_photo: string | null
  status: 'pending' | 'matched' | 'shopping' | 'delivering' | 'completed' | 'cancelled'
  shopped_at: string | null
  delivered_at: string | null
  created_at: string
  provider?: {
    id: string
    vehicle_type: string
    vehicle_plate: string
    rating: number
    user: {
      name: string
      phone: string
    }
  }
}

export function useShopping() {
  const authStore = useAuthStore()
  const currentShopping = ref<ShoppingRequest | null>(null)
  const shoppingHistory = ref<ShoppingRequest[]>([])
  const loading = ref(false)

  // Calculate service fee
  const calculateServiceFee = (budgetLimit: number, distanceKm: number): number => {
    const baseFee = 29
    const perKm = 5
    // 5% of budget, min 20, max 100
    const percentageFee = Math.max(20, Math.min(100, budgetLimit * 0.05))
    return Math.ceil(baseFee + (distanceKm * perKm) + percentageFee)
  }

  // Create shopping request
  const createShoppingRequest = async (data: {
    storeName?: string
    storeAddress?: string
    storeLocation?: GeoLocation
    deliveryAddress: string
    deliveryLocation: GeoLocation
    itemList: string
    budgetLimit: number
    specialInstructions?: string
    distanceKm: number
    referenceImages?: string[]
  }) => {
    if (!authStore.user?.id) return null

    loading.value = true
    try {
      const serviceFee = calculateServiceFee(data.budgetLimit, data.distanceKm)

      // Parse item list into structured items
      const items: ShoppingItem[] = data.itemList
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({ name: line.trim(), quantity: 1 }))

      const { data: shopping, error } = await (supabase
        .from('shopping_requests') as any)
        .insert({
          user_id: authStore.user.id,
          store_name: data.storeName || null,
          store_address: data.storeAddress || null,
          store_lat: data.storeLocation?.lat || null,
          store_lng: data.storeLocation?.lng || null,
          delivery_address: data.deliveryAddress,
          delivery_lat: data.deliveryLocation.lat,
          delivery_lng: data.deliveryLocation.lng,
          items: items,
          item_list: data.itemList,
          budget_limit: data.budgetLimit,
          special_instructions: data.specialInstructions || null,
          service_fee: serviceFee,
          status: 'pending',
          reference_images: data.referenceImages || null
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error creating shopping:', error)
        return null
      }
      
      if (shopping) {
        currentShopping.value = shopping as ShoppingRequest
        return shopping
      }
      return null
    } catch (err) {
      console.error('Error creating shopping request:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch current active shopping
  const fetchActiveShopping = async () => {
    if (!authStore.user?.id) return null

    try {
      const { data, error } = await (supabase
        .from('shopping_requests') as any)
        .select(`
          *,
          provider:provider_id (
            id,
            vehicle_type,
            vehicle_plate,
            rating,
            user:user_id (name, phone)
          )
        `)
        .eq('user_id', authStore.user.id)
        .in('status', ['pending', 'matched', 'shopping', 'delivering'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        currentShopping.value = data as ShoppingRequest
      }
      return currentShopping.value
    } catch {
      return null
    }
  }

  // Fetch shopping history
  const fetchShoppingHistory = async (limit = 20) => {
    if (!authStore.user?.id) {
      shoppingHistory.value = []
      return []
    }

    loading.value = true
    try {
      const { data, error } = await (supabase
        .from('shopping_requests') as any)
        .select(`
          *,
          provider:provider_id (
            id,
            vehicle_type,
            vehicle_plate,
            rating,
            user:user_id (name, phone)
          )
        `)
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && data) {
        shoppingHistory.value = data as ShoppingRequest[]
      }
      return shoppingHistory.value
    } catch (err) {
      console.error('Error fetching shopping history:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Get shopping by tracking ID
  const getShoppingByTrackingId = async (trackingId: string) => {
    try {
      const { data, error } = await (supabase
        .from('shopping_requests') as any)
        .select(`
          *,
          provider:provider_id (
            id,
            vehicle_type,
            vehicle_plate,
            rating,
            current_lat,
            current_lng,
            user:user_id (name, phone)
          ),
          user:user_id (name, phone)
        `)
        .eq('tracking_id', trackingId)
        .single()

      if (!error && data) {
        return data as ShoppingRequest
      }
      return null
    } catch {
      return null
    }
  }

  // Cancel shopping
  const cancelShopping = async (shoppingId: string) => {
    try {
      const { error } = await (supabase
        .from('shopping_requests') as any)
        .update({ status: 'cancelled' })
        .eq('id', shoppingId)
        .eq('user_id', authStore.user?.id || '')
        .in('status', ['pending', 'matched'])

      if (!error) {
        if (currentShopping.value?.id === shoppingId) {
          currentShopping.value = null
        }
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // Subscribe to shopping updates
  const subscribeToShopping = (shoppingId: string, callback: (shopping: ShoppingRequest) => void) => {
    const channel = supabase
      .channel(`shopping:${shoppingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopping_requests',
          filter: `id=eq.${shoppingId}`
        },
        async (payload) => {
          const updated = payload.new as ShoppingRequest
          currentShopping.value = updated
          callback(updated)
        }
      )
      .subscribe()

    return {
      unsubscribe: () => channel.unsubscribe()
    }
  }

  // Format status
  const formatStatus = (status: string): string => {
    const statuses: Record<string, string> = {
      pending: 'รอคนขับรับงาน',
      matched: 'คนขับรับงานแล้ว',
      shopping: 'กำลังซื้อของ',
      delivering: 'กำลังจัดส่ง',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    }
    return statuses[status] || status
  }

  return {
    currentShopping,
    shoppingHistory,
    loading,
    calculateServiceFee,
    createShoppingRequest,
    fetchActiveShopping,
    fetchShoppingHistory,
    getShoppingByTrackingId,
    cancelShopping,
    subscribeToShopping,
    formatStatus
  }
}
