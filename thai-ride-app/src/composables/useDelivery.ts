import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import type { GeoLocation } from './useLocation'

export interface DeliveryRequest {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  sender_name: string
  sender_phone: string
  sender_address: string
  sender_lat: number
  sender_lng: number
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  recipient_lat: number
  recipient_lng: number
  package_type: 'document' | 'small' | 'medium' | 'large' | 'fragile'
  package_size: string | null
  package_weight: number | null
  package_description: string | null
  special_instructions: string | null
  estimated_fee: number
  final_fee: number | null
  distance_km: number
  status: 'pending' | 'matched' | 'pickup' | 'in_transit' | 'delivered' | 'failed' | 'cancelled'
  scheduled_pickup: string | null
  picked_up_at: string | null
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

export function useDelivery() {
  const authStore = useAuthStore()
  const currentDelivery = ref<DeliveryRequest | null>(null)
  const deliveryHistory = ref<DeliveryRequest[]>([])
  const loading = ref(false)

  // Calculate delivery fee
  const calculateFee = (distanceKm: number, packageType: string): number => {
    const baseFee = 35
    const perKm = 8
    const multipliers: Record<string, number> = {
      document: 0.8,
      small: 1.0,
      medium: 1.3,
      large: 1.6,
      fragile: 1.5
    }
    const multiplier = multipliers[packageType] || 1.0
    return Math.ceil((baseFee + (distanceKm * perKm)) * multiplier)
  }

  // Create delivery request
  const createDeliveryRequest = async (data: {
    senderName: string
    senderPhone: string
    senderAddress: string
    senderLocation: GeoLocation
    recipientName: string
    recipientPhone: string
    recipientAddress: string
    recipientLocation: GeoLocation
    packageType: string
    packageWeight: number
    packageDescription?: string
    specialInstructions?: string
    distanceKm: number
  }) => {
    if (!authStore.user?.id) return null

    loading.value = true
    try {
      const estimatedFee = calculateFee(data.distanceKm, data.packageType)

      const { data: delivery, error } = await (supabase
        .from('delivery_requests') as any)
        .insert({
          user_id: authStore.user.id,
          sender_name: data.senderName,
          sender_phone: data.senderPhone,
          sender_address: data.senderAddress,
          sender_lat: data.senderLocation.lat,
          sender_lng: data.senderLocation.lng,
          recipient_name: data.recipientName,
          recipient_phone: data.recipientPhone,
          recipient_address: data.recipientAddress,
          recipient_lat: data.recipientLocation.lat,
          recipient_lng: data.recipientLocation.lng,
          package_type: data.packageType,
          package_weight: data.packageWeight,
          package_description: data.packageDescription || null,
          special_instructions: data.specialInstructions || null,
          estimated_fee: estimatedFee,
          distance_km: data.distanceKm,
          status: 'pending'
        })
        .select()
        .single()

      if (!error && delivery) {
        currentDelivery.value = delivery as DeliveryRequest
        return delivery
      }
      return null
    } catch (err) {
      console.error('Error creating delivery request:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch current active delivery
  const fetchActiveDelivery = async () => {
    if (!authStore.user?.id) return null

    try {
      const { data, error } = await (supabase
        .from('delivery_requests') as any)
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
        .in('status', ['pending', 'matched', 'pickup', 'in_transit'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        currentDelivery.value = data as DeliveryRequest
      }
      return currentDelivery.value
    } catch {
      return null
    }
  }

  // Fetch delivery history
  const fetchDeliveryHistory = async (limit = 20) => {
    if (!authStore.user?.id) {
      deliveryHistory.value = []
      return []
    }

    loading.value = true
    try {
      const { data, error } = await (supabase
        .from('delivery_requests') as any)
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
        deliveryHistory.value = data as DeliveryRequest[]
      }
      return deliveryHistory.value
    } catch (err) {
      console.error('Error fetching delivery history:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Get delivery by tracking ID
  const getDeliveryByTrackingId = async (trackingId: string) => {
    try {
      const { data, error } = await (supabase
        .from('delivery_requests') as any)
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
        return data as DeliveryRequest
      }
      return null
    } catch {
      return null
    }
  }

  // Cancel delivery
  const cancelDelivery = async (deliveryId: string) => {
    try {
      const { error } = await (supabase
        .from('delivery_requests') as any)
        .update({ status: 'cancelled' })
        .eq('id', deliveryId)
        .eq('user_id', authStore.user?.id || '')
        .in('status', ['pending', 'matched'])

      if (!error) {
        if (currentDelivery.value?.id === deliveryId) {
          currentDelivery.value = null
        }
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // Subscribe to delivery updates
  const subscribeToDelivery = (deliveryId: string, callback: (delivery: DeliveryRequest) => void) => {
    const channel = supabase
      .channel(`delivery:${deliveryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests',
          filter: `id=eq.${deliveryId}`
        },
        async (payload) => {
          const updated = payload.new as DeliveryRequest
          currentDelivery.value = updated
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
      pickup: 'กำลังไปรับพัสดุ',
      in_transit: 'กำลังจัดส่ง',
      delivered: 'ส่งสำเร็จ',
      failed: 'ส่งไม่สำเร็จ',
      cancelled: 'ยกเลิก'
    }
    return statuses[status] || status
  }

  return {
    currentDelivery,
    deliveryHistory,
    loading,
    calculateFee,
    createDeliveryRequest,
    fetchActiveDelivery,
    fetchDeliveryHistory,
    getDeliveryByTrackingId,
    cancelDelivery,
    subscribeToDelivery,
    formatStatus
  }
}
