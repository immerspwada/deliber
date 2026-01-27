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

  // Calculate service fee from database
  const calculateServiceFee = async (budgetLimit: number, distanceKm: number): Promise<number> => {
    try {
      // Get base fare from database
      const { data, error: rpcError } = await (supabase.rpc as any)('calculate_distance_fare', {
        p_service_type: 'shopping',
        p_distance_km: distanceKm
      })

      if (rpcError) {
        console.error('[useShopping.calculateServiceFee] RPC error:', rpcError)
        // Fallback to default if RPC fails
        const baseFee = 40
        const perKm = 12
        const percentageFee = Math.max(20, Math.min(100, budgetLimit * 0.05))
        return Math.ceil(baseFee + (distanceKm * perKm) + percentageFee)
      }

      if (data && typeof data === 'number') {
        // Add percentage fee based on budget (5% of budget, min 20, max 100)
        const percentageFee = Math.max(20, Math.min(100, budgetLimit * 0.05))
        return Math.ceil(data + percentageFee)
      }

      // Fallback
      return 60
    } catch (err) {
      console.error('[useShopping.calculateServiceFee] Error:', err)
      return 60
    }
  }

  // Create shopping request using atomic function
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
    if (!authStore.user?.id) {
      console.error('❌ No user ID found')
      throw new Error('กรุณาเข้าสู่ระบบก่อนสั่งบริการ')
    }

    loading.value = true
    console.log('🛒 Creating shopping request...', {
      userId: authStore.user.id,
      storeName: data.storeName,
      storeAddress: data.storeAddress,
      storeLocation: data.storeLocation,
      deliveryAddress: data.deliveryAddress,
      deliveryLocation: data.deliveryLocation,
      itemList: data.itemList,
      budgetLimit: data.budgetLimit,
      distanceKm: data.distanceKm,
      hasImages: !!data.referenceImages?.length
    })

    try {
      const serviceFee = await calculateServiceFee(data.budgetLimit, data.distanceKm)
      console.log('💰 Service fee calculated:', serviceFee)

      // Parse item list into structured items
      const items: ShoppingItem[] = data.itemList
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({ name: line.trim(), quantity: 1 }))
      console.log('📝 Items parsed:', items.length, 'items')

      // Prepare RPC parameters
      const rpcParams = {
        p_user_id: authStore.user.id,
        p_store_name: data.storeName || null,
        p_store_address: data.storeAddress || 'ร้านค้า',
        p_store_lat: data.storeLocation?.lat || 0,
        p_store_lng: data.storeLocation?.lng || 0,
        p_delivery_address: data.deliveryAddress,
        p_delivery_lat: data.deliveryLocation.lat,
        p_delivery_lng: data.deliveryLocation.lng,
        p_item_list: data.itemList,
        p_budget_limit: data.budgetLimit,
        p_special_instructions: data.specialInstructions || null,
        p_reference_images: data.referenceImages || null
      }
      console.log('📤 RPC parameters:', rpcParams)

      // Use atomic function for wallet check and order creation
      console.log('🔌 Calling create_shopping_atomic...')
      const { data: result, error: rpcError } = await supabase.rpc('create_shopping_atomic', rpcParams)

      console.log('📥 RPC response:', { result, error: rpcError })

      if (rpcError) {
        console.error('❌ Atomic create error:', rpcError)
        // Handle specific error types
        if (rpcError.message?.includes('INSUFFICIENT_BALANCE')) {
          throw new Error('ยอดเงินใน Wallet ไม่เพียงพอ กรุณาเติมเงินก่อนสั่งบริการ')
        }
        if (rpcError.message?.includes('WALLET_NOT_FOUND')) {
          throw new Error('ไม่พบ Wallet กรุณาติดต่อฝ่ายสนับสนุน')
        }
        throw new Error(rpcError.message || 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ')
      }

      if (result?.success) {
        console.log('✅ Shopping request created:', result.shopping_id)
        // Fetch the created shopping request
        const { data: shopping, error: fetchError } = await (supabase
          .from('shopping_requests') as any)
          .select('*')
          .eq('id', result.shopping_id)
          .single()

        if (fetchError) {
          console.error('❌ Error fetching shopping request:', fetchError)
        }

        if (!fetchError && shopping) {
          console.log('✅ Shopping request fetched:', shopping)
          currentShopping.value = shopping as ShoppingRequest
          return shopping
        }
      } else {
        // RPC returned success=false, check for error message
        console.error('❌ RPC returned success=false:', result)
        const errorMsg = result?.message || result?.error || 'ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่'
        
        // Check if it's an insufficient balance error
        if (errorMsg.includes('ยอดเงิน') || errorMsg.includes('INSUFFICIENT_BALANCE')) {
          throw new Error(errorMsg)
        }
        
        throw new Error(errorMsg)
      }
      return null
    } catch (err: any) {
      console.error('❌ Error creating shopping request:', err)
      throw err
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
            first_name,
            last_name,
            phone_number,
            rating
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
            first_name,
            last_name,
            phone_number,
            rating
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
            first_name,
            last_name,
            phone_number,
            rating
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

  // Cancel shopping with pending refund (requires Admin approval)
  const cancelShopping = async (shoppingId: string, reason?: string) => {
    if (!authStore.user?.id) return null

    loading.value = true
    try {
      // Use atomic cancel function with pending refund
      const { data: result, error: rpcError } = await supabase.rpc('cancel_request_with_pending_refund', {
        p_request_id: shoppingId,
        p_request_type: 'shopping',
        p_cancelled_by: authStore.user.id,
        p_cancelled_by_role: 'customer',
        p_cancel_reason: reason || 'ลูกค้ายกเลิก'
      })

      if (rpcError) {
        console.error('Cancel error:', rpcError)
        return null
      }

      if (result?.success) {
        if (currentShopping.value?.id === shoppingId) {
          currentShopping.value = null
        }
        return {
          success: true,
          refundAmount: result.refund_amount,
          message: result.message || 'ยกเลิกสำเร็จ คำขอคืนเงินรอการอนุมัติจาก Admin'
        }
      }
      return null
    } catch {
      return null
    } finally {
      loading.value = false
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
