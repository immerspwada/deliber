/**
 * useCustomerBooking - Generic Customer Booking Composable
 * Task: 7 - Implement useCustomerBooking composable
 * Requirements: 1.2, 3.5, 5.2
 * 
 * A unified composable for all service types that handles:
 * - Creating requests via atomic functions
 * - Real-time status updates
 * - Cancellation with reason
 * - Error handling
 */

import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { 
  type ServiceType, 
  type RequestStatus,
  getServiceDefinition, 
  getAtomicFunction,
  getTableName,
  getDisplayName
} from '@/lib/serviceRegistry'
import { AppError, handleRpcError, ErrorType } from '@/lib/errorHandler'

export interface ServiceRequest {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  status: RequestStatus
  estimated_fare: number
  actual_fare: number | null
  pickup_lat: number | null
  pickup_lng: number | null
  pickup_address: string | null
  destination_lat: number | null
  destination_lng: number | null
  destination_address: string | null
  created_at: string
  matched_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  provider?: ProviderInfo
  [key: string]: any
}

export interface ProviderInfo {
  id: string
  first_name: string
  last_name: string
  phone_number: string
  vehicle_plate_number: string | null
  current_lat: number | null
  current_lng: number | null
  rating: number | null
}

export interface CreateRequestParams {
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  destination_lat?: number
  destination_lng?: number
  destination_address?: string
  estimated_fare: number
  promo_code?: string
  [key: string]: any
}

export interface RequestResult {
  requestId: string
  trackingId: string
  status: RequestStatus
  estimatedFare: number
}

export function useCustomerBooking(serviceType: ServiceType) {
  const currentRequest = ref<ServiceRequest | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const realtimeChannel = ref<RealtimeChannel | null>(null)
  
  const serviceDef = getServiceDefinition(serviceType)
  const tableName = getTableName(serviceType)

  // Computed
  const hasActiveRequest = computed(() => 
    currentRequest.value !== null && 
    !['completed', 'cancelled'].includes(currentRequest.value.status)
  )

  const statusText = computed(() => {
    if (!currentRequest.value) return ''
    const statusMap: Record<RequestStatus, string> = {
      pending: 'กำลังหาผู้ให้บริการ...',
      matched: `${serviceDef.providerTypeTh}กำลังมา`,
      arriving: `${serviceDef.providerTypeTh}ใกล้ถึงแล้ว`,
      picked_up: 'รับแล้ว',
      in_progress: 'กำลังดำเนินการ',
      delivering: 'กำลังจัดส่ง',
      shopping: 'กำลังซื้อของ',
      loading: 'กำลังขนของขึ้นรถ',
      in_transit: 'กำลังเดินทาง',
      unloading: 'กำลังขนของลง',
      in_queue: 'กำลังต่อคิว',
      waiting: 'รอคิว',
      ready: 'พร้อมแล้ว',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิกแล้ว'
    }
    return statusMap[currentRequest.value.status] || currentRequest.value.status
  })

  // Create request
  async function createRequest(params: CreateRequestParams): Promise<RequestResult> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new AppError(ErrorType.AUTH_REQUIRED, 'กรุณาเข้าสู่ระบบก่อน')
      }

      const functionName = getAtomicFunction(serviceType, 'create')
      const { data, error: rpcError } = await supabase.rpc(functionName, {
        p_user_id: user.id,
        p_pickup_lat: params.pickup_lat,
        p_pickup_lng: params.pickup_lng,
        p_pickup_address: params.pickup_address,
        p_destination_lat: params.destination_lat || null,
        p_destination_lng: params.destination_lng || null,
        p_destination_address: params.destination_address || null,
        p_estimated_fare: params.estimated_fare,
        p_promo_code: params.promo_code || null,
        ...transformServiceSpecificParams(params)
      })

      if (rpcError) {
        throw handleRpcError(rpcError)
      }

      // Fetch full request details
      await fetchRequest(data.request_id || data.ride_id || data.delivery_id)
      
      // Subscribe to updates
      await subscribeToRequestUpdates(currentRequest.value!.id)

      return {
        requestId: currentRequest.value!.id,
        trackingId: currentRequest.value!.tracking_id,
        status: currentRequest.value!.status,
        estimatedFare: currentRequest.value!.estimated_fare
      }
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาด'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Fetch request details
  async function fetchRequest(requestId: string): Promise<void> {
    const { data, error: fetchError } = await supabase
      .from(tableName)
      .select(`
        *,
        provider:service_providers!provider_id(
          id, first_name, last_name, phone_number, 
          vehicle_plate_number, current_lat, current_lng, rating
        )
      `)
      .eq('id', requestId)
      .single()

    if (fetchError) throw fetchError
    currentRequest.value = data as ServiceRequest
  }

  // Subscribe to real-time updates
  async function subscribeToRequestUpdates(requestId: string): Promise<void> {
    // Unsubscribe from previous channel
    if (realtimeChannel.value) {
      await supabase.removeChannel(realtimeChannel.value)
    }

    const channel = supabase
      .channel(`${serviceType}:${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter: `id=eq.${requestId}`
        },
        async (payload) => {
          const updated = payload.new as ServiceRequest
          
          // Fetch provider info if matched
          if (updated.provider_id && updated.status === 'matched' && !currentRequest.value?.provider) {
            const { data: provider } = await supabase
              .from('service_providers')
              .select('id, first_name, last_name, phone_number, vehicle_plate_number, current_lat, current_lng, rating')
              .eq('id', updated.provider_id)
              .single()
            
            if (provider) {
              updated.provider = provider as ProviderInfo
            }
          } else if (currentRequest.value?.provider) {
            updated.provider = currentRequest.value.provider
          }
          
          currentRequest.value = updated
          handleStatusChange(updated.status)
        }
      )
      .subscribe()

    realtimeChannel.value = channel
  }

  // Handle status changes
  function handleStatusChange(status: RequestStatus): void {
    // Emit events or trigger notifications based on status
    if (status === 'matched') {
      // Play notification sound, show toast, etc.
      console.log(`${getDisplayName(serviceType)} matched!`)
    } else if (status === 'completed') {
      // Show rating modal, etc.
      console.log(`${getDisplayName(serviceType)} completed!`)
    }
  }

  // Cancel request
  async function cancelRequest(reason: string): Promise<void> {
    if (!currentRequest.value) {
      throw new AppError(ErrorType.VALIDATION, 'ไม่พบคำสั่งที่ต้องการยกเลิก')
    }

    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new AppError(ErrorType.AUTH_REQUIRED, 'กรุณาเข้าสู่ระบบก่อน')
      }

      const { data, error: rpcError } = await supabase.rpc('cancel_request_atomic', {
        p_request_id: currentRequest.value.id,
        p_request_type: serviceType,
        p_cancelled_by: user.id,
        p_cancelled_by_role: 'customer',
        p_cancel_reason: reason,
        p_issue_refund: true
      })

      if (rpcError) {
        throw handleRpcError(rpcError)
      }

      // Update local state
      if (currentRequest.value) {
        currentRequest.value.status = 'cancelled'
        currentRequest.value.cancelled_at = new Date().toISOString()
      }

      // Cleanup
      await cleanup()

      return data
    } catch (err: any) {
      error.value = err.message || 'ไม่สามารถยกเลิกได้'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Transform service-specific params
  function transformServiceSpecificParams(params: CreateRequestParams): Record<string, any> {
    const result: Record<string, any> = {}
    
    for (const field of serviceDef.specificFields) {
      if (params[field] !== undefined) {
        result[`p_${field}`] = params[field]
      }
    }
    
    return result
  }

  // Cleanup
  async function cleanup(): Promise<void> {
    if (realtimeChannel.value) {
      await supabase.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
    }
  }

  // Reset state
  function reset(): void {
    currentRequest.value = null
    error.value = null
    isLoading.value = false
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    currentRequest,
    isLoading,
    error,
    
    // Computed
    hasActiveRequest,
    statusText,
    serviceDef,
    
    // Methods
    createRequest,
    fetchRequest,
    cancelRequest,
    subscribeToRequestUpdates,
    reset,
    cleanup
  }
}
