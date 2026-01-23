/**
 * useProviderDelivery - Provider Delivery Composable
 * 
 * Feature: F03 - Delivery Service (Provider Side)
 * Tables: delivery_requests, providers_v2
 * 
 * @syncs-with
 * - Customer: useDelivery.ts (สร้างคำขอ)
 * - Admin: Admin DeliveryView (ดูทั้งหมด)
 * - Database: Realtime subscription on delivery_requests
 * 
 * @status-flow
 * Provider: viewAvailableJobs → acceptJob → [matched] → updateStatus('pickup') → 
 *           updateStatus('in_transit') → updateStatus('delivered')
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface AvailableDeliveryJob {
  id: string
  tracking_id: string
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
  package_type: string
  package_description: string | null
  package_weight: number | null
  estimated_fee: number
  distance_km: number
  distance_from_provider_km: number | null
  created_at: string
}

export interface ActiveDelivery {
  id: string
  tracking_id: string
  status: string
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
  package_type: string
  package_description: string | null
  estimated_fee: number
  distance_km: number
  created_at: string
  matched_at: string
}

export function useProviderDelivery() {
  const authStore = useAuthStore()
  const availableJobs = ref<AvailableDeliveryJob[]>([])
  const activeDeliveries = ref<ActiveDelivery[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get available delivery jobs
  const fetchAvailableJobs = async (
    providerLat?: number,
    providerLng?: number,
    maxDistanceKm = 10,
    limit = 20
  ) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return []
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('get_available_delivery_jobs', {
        p_provider_lat: providerLat || null,
        p_provider_lng: providerLng || null,
        p_max_distance_km: maxDistanceKm,
        p_limit: limit
      })

      if (rpcError) {
        console.error('Error fetching available jobs:', rpcError)
        if (rpcError.message?.includes('not approved')) {
          error.value = 'บัญชีของคุณยังไม่ได้รับการอนุมัติ'
        } else {
          error.value = 'ไม่สามารถโหลดงานได้ กรุณาลองใหม่'
        }
        return []
      }

      availableJobs.value = (data || []) as AvailableDeliveryJob[]
      return availableJobs.value
    } catch (err: any) {
      console.error('Exception fetching available jobs:', err)
      error.value = err.message || 'เกิดข้อผิดพลาด'
      return []
    } finally {
      loading.value = false
    }
  }

  // Accept delivery job
  const acceptJob = async (deliveryId: string) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('accept_delivery_job', {
        p_delivery_id: deliveryId
      })

      if (rpcError) {
        console.error('Error accepting job:', rpcError)
        if (rpcError.message?.includes('PROVIDER_NOT_APPROVED')) {
          error.value = 'บัญชีของคุณยังไม่ได้รับการอนุมัติ'
        } else if (rpcError.message?.includes('DELIVERY_NOT_FOUND')) {
          error.value = 'ไม่พบงานนี้'
        } else if (rpcError.message?.includes('DELIVERY_ALREADY_ACCEPTED')) {
          error.value = 'งานนี้ถูกรับไปแล้ว'
        } else {
          error.value = 'ไม่สามารถรับงานได้ กรุณาลองใหม่'
        }
        return null
      }

      // Remove from available jobs
      availableJobs.value = availableJobs.value.filter(j => j.id !== deliveryId)
      
      // Refresh active deliveries
      await fetchActiveDeliveries()

      return data
    } catch (err: any) {
      console.error('Exception accepting job:', err)
      error.value = err.message || 'เกิดข้อผิดพลาด'
      return null
    } finally {
      loading.value = false
    }
  }

  // Update delivery status
  const updateStatus = async (
    deliveryId: string,
    newStatus: 'pickup' | 'in_transit' | 'delivered' | 'failed',
    notes?: string
  ) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('update_delivery_status', {
        p_delivery_id: deliveryId,
        p_new_status: newStatus,
        p_notes: notes || null
      })

      if (rpcError) {
        console.error('Error updating status:', rpcError)
        if (rpcError.message?.includes('PROVIDER_NOT_APPROVED')) {
          error.value = 'บัญชีของคุณยังไม่ได้รับการอนุมัติ'
        } else if (rpcError.message?.includes('DELIVERY_NOT_FOUND_OR_NOT_ASSIGNED')) {
          error.value = 'ไม่พบงานนี้หรือไม่ได้รับมอบหมายให้คุณ'
        } else if (rpcError.message?.includes('DELIVERY_ALREADY_FINALIZED')) {
          error.value = 'งานนี้เสร็จสิ้นแล้ว'
        } else if (rpcError.message?.includes('INVALID_STATUS')) {
          error.value = 'สถานะไม่ถูกต้อง'
        } else {
          error.value = 'ไม่สามารถอัพเดทสถานะได้ กรุณาลองใหม่'
        }
        return null
      }

      // Refresh active deliveries
      await fetchActiveDeliveries()

      return data
    } catch (err: any) {
      console.error('Exception updating status:', err)
      error.value = err.message || 'เกิดข้อผิดพลาด'
      return null
    } finally {
      loading.value = false
    }
  }

  // Get active deliveries
  const fetchActiveDeliveries = async () => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return []
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('get_provider_active_deliveries')

      if (rpcError) {
        console.error('Error fetching active deliveries:', rpcError)
        if (rpcError.message?.includes('not approved')) {
          error.value = 'บัญชีของคุณยังไม่ได้รับการอนุมัติ'
        } else {
          error.value = 'ไม่สามารถโหลดงานได้ กรุณาลองใหม่'
        }
        return []
      }

      activeDeliveries.value = (data || []) as ActiveDelivery[]
      return activeDeliveries.value
    } catch (err: any) {
      console.error('Exception fetching active deliveries:', err)
      error.value = err.message || 'เกิดข้อผิดพลาด'
      return []
    } finally {
      loading.value = false
    }
  }

  // Subscribe to delivery updates
  const subscribeToDelivery = (deliveryId: string, callback: (delivery: any) => void) => {
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
        (payload) => {
          callback(payload.new)
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
      pending: 'รอรับงาน',
      matched: 'รับงานแล้ว',
      pickup: 'กำลังไปรับพัสดุ',
      in_transit: 'กำลังจัดส่ง',
      delivered: 'ส่งสำเร็จ',
      failed: 'ส่งไม่สำเร็จ',
      cancelled: 'ยกเลิก'
    }
    return statuses[status] || status
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  return {
    availableJobs,
    activeDeliveries,
    loading,
    error,
    clearError,
    fetchAvailableJobs,
    acceptJob,
    updateStatus,
    fetchActiveDeliveries,
    subscribeToDelivery,
    formatStatus
  }
}
