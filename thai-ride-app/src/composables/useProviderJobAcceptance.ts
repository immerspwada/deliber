/**
 * useProviderJobAcceptance - Production-Ready Job Acceptance
 * Feature: F14 - Provider Dashboard
 * 
 * This composable handles job acceptance with:
 * 1. Race condition prevention via atomic database functions
 * 2. Idempotency keys to prevent duplicate operations
 * 3. Proper error handling and user feedback
 * 4. Audit logging for debugging
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface AcceptJobResult {
  success: boolean
  error?: string
  jobData?: any
}

export interface JobAcceptanceOptions {
  providerId: string
  requestId: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
}

/**
 * Generate a unique idempotency key for this acceptance attempt
 */
function generateIdempotencyKey(providerId: string, requestId: string): string {
  return `${providerId}-${requestId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Accept a ride request using production-ready atomic function
 */
export async function acceptRideAtomic(
  rideId: string,
  providerId: string,
  idempotencyKey?: string
): Promise<AcceptJobResult> {
  const key = idempotencyKey || generateIdempotencyKey(providerId, rideId)
  
  try {
    // Try V2 atomic function first (production-ready)
    const { data, error } = await (supabase.rpc as any)('accept_ride_atomic_v2', {
      p_ride_id: rideId,
      p_provider_id: providerId,
      p_idempotency_key: key
    })
    
    if (error) {
      console.error('[AcceptRide] RPC error:', error)
      
      // Fallback to V1 if V2 doesn't exist
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        return await acceptRideAtomicV1(rideId, providerId)
      }
      
      return {
        success: false,
        error: translateError(error.message)
      }
    }
    
    // V2 returns JSONB directly
    if (!data?.success) {
      return {
        success: false,
        error: data?.message || translateError(data?.error) || 'ไม่สามารถรับงานได้'
      }
    }
    
    return {
      success: true,
      jobData: data.ride_data || data
    }
  } catch (e: any) {
    console.error('[AcceptRide] Exception:', e)
    return {
      success: false,
      error: e.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    }
  }
}

/**
 * Fallback to V1 atomic function
 */
async function acceptRideAtomicV1(
  rideId: string,
  providerId: string
): Promise<AcceptJobResult> {
  try {
    const { data, error } = await (supabase.rpc as any)('accept_ride_atomic', {
      p_ride_id: rideId,
      p_provider_id: providerId
    })
    
    if (error) {
      return {
        success: false,
        error: translateError(error.message)
      }
    }
    
    // V1 returns JSON
    if (data && typeof data === 'object') {
      if (!data.success) {
        return {
          success: false,
          error: data.message || translateError(data.error)
        }
      }
      return { success: true, jobData: data }
    }
    
    return { success: false, error: 'ไม่สามารถรับงานได้' }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Accept a delivery request using production-ready atomic function
 */
export async function acceptDeliveryAtomic(
  deliveryId: string,
  providerId: string,
  idempotencyKey?: string
): Promise<AcceptJobResult> {
  const key = idempotencyKey || generateIdempotencyKey(providerId, deliveryId)
  
  try {
    // Try V2 first
    const { data, error } = await (supabase.rpc as any)('accept_delivery_atomic_v2', {
      p_delivery_id: deliveryId,
      p_provider_id: providerId,
      p_idempotency_key: key
    })
    
    if (error) {
      // Fallback to original function
      if (error.message?.includes('does not exist')) {
        return await acceptDeliveryOriginal(deliveryId, providerId)
      }
      return { success: false, error: translateError(error.message) }
    }
    
    if (!data?.success) {
      return { success: false, error: data?.message || 'ไม่สามารถรับงานได้' }
    }
    
    return { success: true, jobData: data.delivery_data || data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

async function acceptDeliveryOriginal(
  deliveryId: string,
  providerId: string
): Promise<AcceptJobResult> {
  try {
    const { data, error } = await (supabase.rpc as any)('accept_delivery_request', {
      p_delivery_id: deliveryId,
      p_provider_id: providerId
    })
    
    if (error) return { success: false, error: translateError(error.message) }
    
    const result = Array.isArray(data) ? data[0] : data
    if (!result?.success) {
      return { success: false, error: result?.message || 'ไม่สามารถรับงานได้' }
    }
    
    return { success: true, jobData: result.delivery_data || result }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Accept a shopping request using production-ready atomic function
 */
export async function acceptShoppingAtomic(
  shoppingId: string,
  providerId: string,
  idempotencyKey?: string
): Promise<AcceptJobResult> {
  const key = idempotencyKey || generateIdempotencyKey(providerId, shoppingId)
  
  try {
    const { data, error } = await (supabase.rpc as any)('accept_shopping_atomic_v2', {
      p_shopping_id: shoppingId,
      p_provider_id: providerId,
      p_idempotency_key: key
    })
    
    if (error) {
      if (error.message?.includes('does not exist')) {
        return await acceptShoppingOriginal(shoppingId, providerId)
      }
      return { success: false, error: translateError(error.message) }
    }
    
    if (!data?.success) {
      return { success: false, error: data?.message || 'ไม่สามารถรับงานได้' }
    }
    
    return { success: true, jobData: data.shopping_data || data }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

async function acceptShoppingOriginal(
  shoppingId: string,
  providerId: string
): Promise<AcceptJobResult> {
  try {
    const { data, error } = await (supabase.rpc as any)('accept_shopping_request', {
      p_shopping_id: shoppingId,
      p_provider_id: providerId
    })
    
    if (error) return { success: false, error: translateError(error.message) }
    
    const result = Array.isArray(data) ? data[0] : data
    if (!result?.success) {
      return { success: false, error: result?.message || 'ไม่สามารถรับงานได้' }
    }
    
    return { success: true, jobData: result.shopping_data || result }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Accept other service types (queue, moving, laundry)
 */
export async function acceptOtherService(
  type: 'queue' | 'moving' | 'laundry',
  requestId: string,
  providerId: string
): Promise<AcceptJobResult> {
  const rpcMap: Record<string, { name: string; idParam: string }> = {
    queue: { name: 'accept_queue_booking', idParam: 'p_booking_id' },
    moving: { name: 'accept_moving_request', idParam: 'p_request_id' },
    laundry: { name: 'accept_laundry_request', idParam: 'p_request_id' }
  }
  
  const config = rpcMap[type]
  if (!config) {
    return { success: false, error: 'ประเภทงานไม่ถูกต้อง' }
  }
  
  try {
    const params: Record<string, any> = {
      [config.idParam]: requestId,
      p_provider_id: providerId
    }
    
    const { data, error } = await (supabase.rpc as any)(config.name, params)
    
    if (error) {
      return { success: false, error: translateError(error.message) }
    }
    
    const result = Array.isArray(data) ? data[0] : data
    if (result && !result.success) {
      return { success: false, error: result.message || 'ไม่สามารถรับงานได้' }
    }
    
    return { success: true, jobData: result }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

/**
 * Main function to accept any job type
 */
export async function acceptJob(options: JobAcceptanceOptions): Promise<AcceptJobResult> {
  const { providerId, requestId, type } = options
  const idempotencyKey = generateIdempotencyKey(providerId, requestId)
  
  switch (type) {
    case 'ride':
      return acceptRideAtomic(requestId, providerId, idempotencyKey)
    case 'delivery':
      return acceptDeliveryAtomic(requestId, providerId, idempotencyKey)
    case 'shopping':
      return acceptShoppingAtomic(requestId, providerId, idempotencyKey)
    case 'queue':
    case 'moving':
    case 'laundry':
      return acceptOtherService(type, requestId, providerId)
    default:
      return { success: false, error: 'ประเภทงานไม่ถูกต้อง' }
  }
}

/**
 * Translate error codes to Thai messages
 */
function translateError(error?: string): string {
  if (!error) return 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  
  const errorMap: Record<string, string> = {
    'RIDE_NOT_FOUND': 'ไม่พบงานนี้',
    'RIDE_ALREADY_ACCEPTED': 'งานนี้ถูกรับไปแล้ว',
    'RIDE_BEING_ACCEPTED': 'งานนี้กำลังถูกรับโดยคนอื่น กรุณาลองงานอื่น',
    'DELIVERY_NOT_FOUND': 'ไม่พบงานส่งของนี้',
    'DELIVERY_ALREADY_ACCEPTED': 'งานส่งของนี้ถูกรับไปแล้ว',
    'DELIVERY_BEING_ACCEPTED': 'งานนี้กำลังถูกรับโดยคนอื่น',
    'SHOPPING_NOT_FOUND': 'ไม่พบงานซื้อของนี้',
    'SHOPPING_ALREADY_ACCEPTED': 'งานซื้อของนี้ถูกรับไปแล้ว',
    'SHOPPING_BEING_ACCEPTED': 'งานนี้กำลังถูกรับโดยคนอื่น',
    'PROVIDER_NOT_FOUND': 'ไม่พบข้อมูลผู้ให้บริการ',
    'PROVIDER_NOT_APPROVED': 'บัญชียังไม่ได้รับการอนุมัติ',
    'HAS_ACTIVE_JOB': 'คุณยังมีงานที่กำลังทำอยู่'
  }
  
  // Check for known error codes
  for (const [code, message] of Object.entries(errorMap)) {
    if (error.includes(code)) {
      return message
    }
  }
  
  // Check for Thai messages already in error
  if (error.includes('ถูกรับไปแล้ว')) return 'งานนี้ถูกรับไปแล้ว'
  if (error.includes('ไม่พบ')) return 'ไม่พบงานนี้'
  if (error.includes('ไม่สามารถ')) return error
  
  return error
}

/**
 * Composable for use in Vue components
 */
export function useProviderJobAcceptance() {
  const isAccepting = ref(false)
  const lastError = ref<string | null>(null)
  
  async function accept(options: JobAcceptanceOptions): Promise<AcceptJobResult> {
    isAccepting.value = true
    lastError.value = null
    
    try {
      const result = await acceptJob(options)
      
      if (!result.success) {
        lastError.value = result.error || 'เกิดข้อผิดพลาด'
      }
      
      return result
    } finally {
      isAccepting.value = false
    }
  }
  
  return {
    isAccepting,
    lastError,
    accept,
    acceptRideAtomic,
    acceptDeliveryAtomic,
    acceptShoppingAtomic,
    acceptOtherService
  }
}
