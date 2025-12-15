import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { ShoppingRequest, ShoppingRequestInsert, ServiceProvider } from '../types/database'

export interface Location {
  lat: number
  lng: number
  address: string
}

export const useShoppingStore = defineStore('shopping', () => {
  const currentShopping = ref<ShoppingRequest | null>(null)
  const shoppingHistory = ref<ShoppingRequest[]>([])
  const nearbyShoppers = ref<ServiceProvider[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasActiveShopping = computed(() => 
    currentShopping.value && 
    ['pending', 'matched', 'shopping', 'delivering'].includes(currentShopping.value.status || '')
  )

  // Calculate service fee based on budget and distance
  const calculateServiceFee = (budgetLimit: number, distanceKm: number): number => {
    const baseFee = 50 // Thai Baht
    const percentageFee = Math.min(budgetLimit * 0.1, 200) // 10% capped at 200
    const deliveryFee = Math.max(30, distanceKm * 6) // 6 baht per km, min 30
    
    return Math.ceil(baseFee + percentageFee + deliveryFee)
  }

  // Create shopping request
  const createShoppingRequest = async (
    userId: string,
    store: {
      name: string
      location: Location
    },
    delivery: {
      location: Location
    },
    shoppingInfo: {
      itemList: string
      budgetLimit: number
      specialInstructions?: string
    },
    serviceFee: number
  ) => {
    loading.value = true
    error.value = null
    
    try {
      const shoppingData: ShoppingRequestInsert = {
        user_id: userId,
        store_name: store.name,
        store_address: store.location.address,
        store_lat: store.location.lat,
        store_lng: store.location.lng,
        delivery_address: delivery.location.address,
        delivery_lat: delivery.location.lat,
        delivery_lng: delivery.location.lng,
        items: shoppingInfo.itemList,
        estimated_total: shoppingInfo.budgetLimit,
        service_fee: serviceFee,
        status: 'pending'
      } as any
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from('shopping_requests')
        .insert(shoppingData)
        .select()
        .single()
      
      if (insertError) {
        error.value = insertError.message
        return null
      }
      
      currentShopping.value = data
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  // Cancel shopping request
  const cancelShopping = async (shoppingId: string) => {
    loading.value = true
    error.value = null
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: updateError } = await (supabase as any)
        .from('shopping_requests')
        .update({ status: 'cancelled' })
        .eq('id', shoppingId)
        .select()
        .single()
      
      if (updateError) {
        error.value = updateError.message
        return false
      }
      
      currentShopping.value = data
      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  // Get shopping history
  const fetchShoppingHistory = async (userId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('shopping_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (fetchError) {
        error.value = fetchError.message
        return []
      }
      
      shoppingHistory.value = data || []
      return data || []
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return []
    } finally {
      loading.value = false
    }
  }

  // Subscribe to shopping updates
  const subscribeToShoppingUpdates = (shoppingId: string) => {
    return supabase
      .channel(`shopping:${shoppingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopping_requests',
          filter: `id=eq.${shoppingId}`
        },
        (payload) => {
          currentShopping.value = payload.new as ShoppingRequest
        }
      )
      .subscribe()
  }

  return {
    currentShopping,
    shoppingHistory,
    nearbyShoppers,
    loading,
    error,
    hasActiveShopping,
    calculateServiceFee,
    createShoppingRequest,
    cancelShopping,
    fetchShoppingHistory,
    subscribeToShoppingUpdates
  }
})
