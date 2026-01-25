import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { DeliveryRequest, DeliveryRequestInsert, ServiceProvider } from '../types/database'

export interface Location {
  lat: number
  lng: number
  address: string
}

export const useDeliveryStore = defineStore('delivery', () => {
  const currentDelivery = ref<DeliveryRequest | null>(null)
  const deliveryHistory = ref<DeliveryRequest[]>([])
  const nearbyProviders = ref<ServiceProvider[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasActiveDelivery = computed(() => 
    currentDelivery.value && 
    ['pending', 'matched', 'pickup', 'in_transit'].includes(currentDelivery.value.status || '')
  )

  // Calculate delivery fee based on distance and weight
  const calculateFee = (distanceKm: number, weightKg: number, packageType: string): number => {
    const baseFee = 40 // Thai Baht
    const perKmRate = 8
    const minimumFee = 50
    
    // Weight surcharge (free up to 5kg)
    const weightSurcharge = weightKg > 5 ? (weightKg - 5) * 5 : 0
    
    // Package type multiplier
    const typeMultiplier: Record<string, number> = {
      document: 0.8,
      small: 1.0,
      medium: 1.3,
      large: 1.6
    }
    
    const multiplier = typeMultiplier[packageType] || 1.0
    const calculatedFee = (baseFee + (distanceKm * perKmRate) + weightSurcharge) * multiplier
    
    return Math.max(Math.ceil(calculatedFee), minimumFee)
  }

  // Create delivery request
  const createDeliveryRequest = async (
    userId: string,
    sender: {
      name: string
      phone: string
      location: Location
    },
    recipient: {
      name: string
      phone: string
      location: Location
    },
    packageInfo: {
      description: string
      weight: number
      type: 'document' | 'small' | 'medium' | 'large'
    },
    estimatedFee: number
  ) => {
    loading.value = true
    error.value = null
    
    try {
      const deliveryData: DeliveryRequestInsert = {
        user_id: userId,
        sender_name: sender.name,
        sender_phone: sender.phone,
        sender_address: sender.location.address,
        sender_lat: sender.location.lat,
        sender_lng: sender.location.lng,
        recipient_name: recipient.name,
        recipient_phone: recipient.phone,
        recipient_address: recipient.location.address,
        recipient_lat: recipient.location.lat,
        recipient_lng: recipient.location.lng,
        package_description: packageInfo.description,
        package_weight: packageInfo.weight,
        package_type: packageInfo.type,
        estimated_fee: estimatedFee,
        status: 'pending'
      }
      
       
      const { data, error: insertError } = await (supabase as any)
        .from('delivery_requests')
        .insert(deliveryData)
        .select()
        .single()
      
      if (insertError) {
        error.value = insertError.message
        return null
      }
      
      currentDelivery.value = data
      return data
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  // Cancel delivery request
  const cancelDelivery = async (deliveryId: string) => {
    loading.value = true
    error.value = null
    
    try {
       
      const { data, error: updateError } = await (supabase as any)
        .from('delivery_requests')
        .update({ status: 'cancelled' })
        .eq('id', deliveryId)
        .select()
        .single()
      
      if (updateError) {
        error.value = updateError.message
        return false
      }
      
      currentDelivery.value = data
      return true
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  // Get delivery history
  const fetchDeliveryHistory = async (userId: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('delivery_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (fetchError) {
        error.value = fetchError.message
        return []
      }
      
      deliveryHistory.value = data || []
      return data || []
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return []
    } finally {
      loading.value = false
    }
  }

  // Subscribe to delivery updates
  const subscribeToDeliveryUpdates = (deliveryId: string) => {
    return supabase
      .channel(`delivery:${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests',
          filter: `id=eq.${deliveryId}`
        },
        (payload) => {
          currentDelivery.value = payload.new as DeliveryRequest
        }
      )
      .subscribe()
  }

  return {
    currentDelivery,
    deliveryHistory,
    nearbyProviders,
    loading,
    error,
    hasActiveDelivery,
    calculateFee,
    createDeliveryRequest,
    cancelDelivery,
    fetchDeliveryHistory,
    subscribeToDeliveryUpdates
  }
})
