/**
 * Feature: F159 - Moving Service
 * Tables: moving_requests, moving_ratings
 * Migration: 029_new_services.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Types
export interface MovingRequest {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  service_type: 'small' | 'medium' | 'large'
  pickup_address: string
  pickup_lat: number | null
  pickup_lng: number | null
  destination_address: string
  destination_lat: number | null
  destination_lng: number | null
  item_description: string | null
  helper_count: number
  status: 'pending' | 'matched' | 'pickup' | 'in_progress' | 'completed' | 'cancelled'
  estimated_price: number
  final_price: number | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  pickup_at: string | null
  completed_at: string | null
}

export interface CreateMovingInput {
  service_type: MovingRequest['service_type']
  pickup_address: string
  pickup_lat?: number
  pickup_lng?: number
  destination_address: string
  destination_lat?: number
  destination_lng?: number
  item_description?: string
  helper_count?: number
}

export function useMoving() {
  const requests = ref<MovingRequest[]>([])
  const currentRequest = ref<MovingRequest | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  let realtimeChannel: RealtimeChannel | null = null


  // Price calculation (Requirements 2.2, 2.4)
  function calculatePrice(serviceType: MovingRequest['service_type'], helperCount: number = 1): number {
    const basePrices: Record<MovingRequest['service_type'], number> = {
      small: 150,
      medium: 350,
      large: 1500
    }
    const basePrice = basePrices[serviceType]
    const helperFee = Math.max(0, (helperCount - 1)) * 100
    return basePrice + helperFee
  }

  // Create Moving Request
  async function createMovingRequest(input: CreateMovingInput): Promise<MovingRequest | null> {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return null
      }

      const helperCount = input.helper_count || 1
      const estimatedPrice = calculatePrice(input.service_type, helperCount)

      const { data, error: insertError } = await supabase
        .from('moving_requests')
        .insert({
          user_id: user.id,
          service_type: input.service_type,
          pickup_address: input.pickup_address,
          pickup_lat: input.pickup_lat || null,
          pickup_lng: input.pickup_lng || null,
          destination_address: input.destination_address,
          destination_lat: input.destination_lat || null,
          destination_lng: input.destination_lng || null,
          item_description: input.item_description || null,
          helper_count: helperCount,
          estimated_price: estimatedPrice,
          status: 'pending'
        })
        .select()
        .single()

      if (insertError) throw insertError

      currentRequest.value = data
      requests.value.unshift(data)
      return data
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการสร้างคำขอ'
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch User Requests
  async function fetchUserRequests(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return
      }

      const { data, error: fetchError } = await supabase
        .from('moving_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      requests.value = data || []
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
    } finally {
      loading.value = false
    }
  }

  // Subscribe to Realtime Updates (Requirements 6.2)
  function subscribeToRequest(requestId: string): void {
    unsubscribe()

    realtimeChannel = supabase
      .channel(`moving_request_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'moving_requests',
          filter: `id=eq.${requestId}`
        },
        (payload: RealtimePostgresChangesPayload<MovingRequest>) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as MovingRequest
            currentRequest.value = updated
            
            const index = requests.value.findIndex(r => r.id === requestId)
            if (index !== -1) {
              requests.value[index] = updated
            }
          }
        }
      )
      .subscribe()
  }

  function unsubscribe(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  // Submit Rating (Requirements 2.9)
  async function submitRating(requestId: string, providerId: string, rating: number, comment?: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return false
      }

      const { error: insertError } = await supabase
        .from('moving_ratings')
        .insert({
          request_id: requestId,
          user_id: user.id,
          provider_id: providerId,
          rating,
          comment: comment || null
        })

      if (insertError) throw insertError
      return true
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการให้คะแนน'
      return false
    } finally {
      loading.value = false
    }
  }

  // Fetch Single Request
  async function fetchRequest(requestId: string): Promise<MovingRequest | null> {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('moving_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError

      currentRequest.value = data
      return data
    } catch (err: any) {
      error.value = err.message || 'ไม่พบข้อมูลคำขอ'
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch by Tracking ID
  async function fetchByTrackingId(trackingId: string): Promise<MovingRequest | null> {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('moving_requests')
        .select('*')
        .eq('tracking_id', trackingId)
        .single()

      if (fetchError) throw fetchError

      currentRequest.value = data
      return data
    } catch (err: any) {
      error.value = err.message || 'ไม่พบข้อมูลคำขอ'
      return null
    } finally {
      loading.value = false
    }
  }

  // Cancel Request
  async function cancelRequest(requestId: string, reason?: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('moving_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason || null
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      // Update local state
      const index = requests.value.findIndex(r => r.id === requestId)
      if (index !== -1) {
        requests.value[index].status = 'cancelled'
        requests.value[index].cancelled_at = new Date().toISOString()
        requests.value[index].cancel_reason = reason || null
      }

      if (currentRequest.value && currentRequest.value.id === requestId) {
        currentRequest.value.status = 'cancelled'
        currentRequest.value.cancelled_at = new Date().toISOString()
        currentRequest.value.cancel_reason = reason || null
      }

      return true
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการยกเลิก'
      return false
    } finally {
      loading.value = false
    }
  }

  // Update Request (for editing before matching)
  async function updateRequest(
    requestId: string,
    updates: Partial<Pick<MovingRequest, 'pickup_address' | 'destination_address' | 'item_description' | 'helper_count'>>
  ): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      // Recalculate price if helper_count changed
      let updateData: any = { ...updates, updated_at: new Date().toISOString() }
      
      if (updates.helper_count !== undefined) {
        const request = requests.value.find(r => r.id === requestId)
        if (request) {
          updateData.estimated_price = calculatePrice(request.service_type, updates.helper_count)
        }
      }

      const { error: updateError } = await supabase
        .from('moving_requests')
        .update(updateData)
        .eq('id', requestId)
        .eq('status', 'pending') // Only allow updates for pending requests

      if (updateError) throw updateError

      // Update local state
      const index = requests.value.findIndex(r => r.id === requestId)
      if (index !== -1) {
        requests.value[index] = { ...requests.value[index], ...updateData }
      }

      if (currentRequest.value && currentRequest.value.id === requestId) {
        currentRequest.value = { ...currentRequest.value, ...updateData }
      }

      return true
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการอัพเดท'
      return false
    } finally {
      loading.value = false
    }
  }

  // Check if request can be cancelled
  const canCancel = (request: MovingRequest): boolean => {
    return ['pending', 'matched'].includes(request.status)
  }

  // Check if request can be edited
  const canEdit = (request: MovingRequest): boolean => {
    return request.status === 'pending'
  }

  // Check if request can be rated
  const canRate = (request: MovingRequest): boolean => {
    return request.status === 'completed' && request.provider_id !== null
  }

  // Get status color for UI
  const getStatusColor = (status: MovingRequest['status']): string => {
    const colors: Record<MovingRequest['status'], string> = {
      pending: '#F5A623',
      matched: '#2196F3',
      pickup: '#9C27B0',
      in_progress: '#00BCD4',
      completed: '#00A86B',
      cancelled: '#E53935'
    }
    return colors[status]
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  // Labels
  const serviceTypeLabels: Record<MovingRequest['service_type'], string> = {
    small: 'ขนาดเล็ก (฿150)',
    medium: 'ขนาดกลาง (฿350)',
    large: 'ขนาดใหญ่ (฿1,500)'
  }

  const statusLabels: Record<MovingRequest['status'], string> = {
    pending: 'รอผู้ให้บริการ',
    matched: 'จับคู่แล้ว',
    pickup: 'กำลังไปรับของ',
    in_progress: 'กำลังขนย้าย',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก'
  }

  return {
    requests,
    currentRequest,
    loading,
    error,
    createMovingRequest,
    fetchUserRequests,
    fetchRequest,
    fetchByTrackingId,
    cancelRequest,
    updateRequest,
    subscribeToRequest,
    unsubscribe,
    submitRating,
    calculatePrice,
    clearError,
    
    // Helpers
    canCancel,
    canEdit,
    canRate,
    getStatusColor,
    
    // Labels
    serviceTypeLabels,
    statusLabels
  }
}
