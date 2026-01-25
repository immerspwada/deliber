/**
 * Feature: F160 - Laundry Service
 * Tables: laundry_requests, laundry_ratings
 * Migration: 029_new_services.sql
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type LaundryService = 'wash-fold' | 'wash-iron' | 'dry-clean' | 'express'

export interface LaundryRequest {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  services: LaundryService[]
  pickup_address: string
  pickup_lat: number | null
  pickup_lng: number | null
  scheduled_pickup: string
  estimated_weight: number | null
  actual_weight: number | null
  price_per_kg: number
  estimated_price: number | null
  final_price: number | null
  status: 'pending' | 'matched' | 'picked_up' | 'washing' | 'ready' | 'delivered' | 'cancelled'
  notes: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  picked_up_at: string | null
  ready_at: string | null
  delivered_at: string | null
}

export interface CreateLaundryInput {
  services: LaundryService[]
  pickup_address: string
  pickup_lat?: number
  pickup_lng?: number
  scheduled_pickup: string
  estimated_weight?: number
  notes?: string
}

export function useLaundry() {
  const requests = ref<LaundryRequest[]>([])
  const currentRequest = ref<LaundryRequest | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  let realtimeChannel: RealtimeChannel | null = null


  // Price calculation (Requirements 3.6)
  function calculatePrice(services: LaundryService[], weight: number): number {
    let total = 0
    
    if (services.includes('dry-clean')) {
      total = weight * 5 * 150 // estimate 5 pieces per kg
    } else if (services.includes('wash-iron')) {
      total = weight * 60
    } else {
      total = weight * 40 // wash-fold default
    }
    
    if (services.includes('express')) {
      total += 100
    }
    
    return total
  }

  // Create Laundry Request using atomic function
  async function createLaundryRequest(input: CreateLaundryInput): Promise<LaundryRequest | null> {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return null
      }

      const estimatedWeight = input.estimated_weight || 5 // Default 5kg
      const estimatedPrice = calculatePrice(input.services, estimatedWeight)

      // Map service type for atomic function
      const serviceTypeMap: Record<string, string> = {
        'wash-fold': 'wash',
        'wash-iron': 'wash_iron',
        'dry-clean': 'dry_clean',
        'express': 'wash' // Express is an add-on
      }
      const primaryService = input.services.find(s => s !== 'express') || 'wash-fold'

      // Use atomic function for wallet check and order creation
      const { data: result, error: rpcError } = await supabase.rpc('create_laundry_atomic', {
        p_user_id: user.id,
        p_pickup_lat: input.pickup_lat || 0,
        p_pickup_lng: input.pickup_lng || 0,
        p_pickup_address: input.pickup_address,
        p_service_type: serviceTypeMap[primaryService] || 'wash',
        p_weight_kg: estimatedWeight,
        p_special_instructions: input.notes || null,
        p_estimated_fare: estimatedPrice,
        p_promo_code: null
      })

      if (rpcError) {
        console.error('Atomic create error:', rpcError)
        // Handle specific error types
        if (rpcError.message?.includes('INSUFFICIENT_BALANCE')) {
          error.value = 'ยอดเงินใน Wallet ไม่เพียงพอ กรุณาเติมเงินก่อนสั่งบริการ'
          return null
        }
        if (rpcError.message?.includes('WALLET_NOT_FOUND')) {
          error.value = 'ไม่พบ Wallet กรุณาติดต่อฝ่ายสนับสนุน'
          return null
        }
        throw rpcError
      }

      if (result?.success) {
        // Fetch the created laundry request
        const { data, error: fetchError } = await supabase
          .from('laundry_requests')
          .select('*')
          .eq('id', result.laundry_id)
          .single()

        if (!fetchError && data) {
          currentRequest.value = data
          requests.value.unshift(data)
          return data
        }
      }
      return null
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
        .from('laundry_requests')
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

  // Subscribe to Realtime Updates (Requirements 6.3)
  function subscribeToRequest(requestId: string): void {
    unsubscribe()

    realtimeChannel = supabase
      .channel(`laundry_request_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'laundry_requests',
          filter: `id=eq.${requestId}`
        },
        (payload: RealtimePostgresChangesPayload<LaundryRequest>) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as LaundryRequest
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

  // Submit Rating (Requirements 3.8)
  async function submitRating(requestId: string, providerId: string, rating: number, comment?: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return false
      }

      const { error: insertError } = await (supabase
        .from('laundry_ratings') as any)
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
  async function fetchRequest(requestId: string): Promise<LaundryRequest | null> {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('laundry_requests')
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
  async function fetchByTrackingId(trackingId: string): Promise<LaundryRequest | null> {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('laundry_requests')
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

  // Cancel Request with pending refund (requires Admin approval)
  async function cancelRequest(requestId: string, reason?: string): Promise<{ success: boolean; refundAmount?: number; message?: string } | null> {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return null
      }

      // Use atomic cancel function with pending refund
      const { data: result, error: rpcError } = await supabase.rpc('cancel_request_with_pending_refund', {
        p_request_id: requestId,
        p_request_type: 'laundry',
        p_cancelled_by: user.id,
        p_cancelled_by_role: 'customer',
        p_cancel_reason: reason || 'ลูกค้ายกเลิก'
      })

      if (rpcError) {
        console.error('Cancel error:', rpcError)
        if (rpcError.message?.includes('REQUEST_NOT_FOUND')) {
          error.value = 'ไม่พบคำขอนี้'
        } else if (rpcError.message?.includes('REQUEST_ALREADY_FINALIZED')) {
          error.value = 'ไม่สามารถยกเลิกได้ คำขอนี้ดำเนินการเสร็จสิ้นแล้ว'
        } else {
          error.value = rpcError.message || 'เกิดข้อผิดพลาดในการยกเลิก'
        }
        return null
      }

      if (result?.success) {
        // Update local state
        const index = requests.value.findIndex(r => r.id === requestId)
        if (index !== -1) {
          requests.value[index]!.status = 'cancelled'
          requests.value[index]!.cancelled_at = new Date().toISOString()
          requests.value[index]!.cancel_reason = reason || null
        }

        if (currentRequest.value && currentRequest.value.id === requestId) {
          currentRequest.value.status = 'cancelled'
          currentRequest.value.cancelled_at = new Date().toISOString()
          currentRequest.value.cancel_reason = reason || null
        }

        return {
          success: true,
          refundAmount: result.refund_amount,
          message: result.message || 'ยกเลิกสำเร็จ คำขอคืนเงินรอการอนุมัติจาก Admin'
        }
      }

      return null
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการยกเลิก'
      return null
    } finally {
      loading.value = false
    }
  }

  // Update Request (for editing before pickup)
  async function updateRequest(
    requestId: string,
    updates: Partial<Pick<LaundryRequest, 'pickup_address' | 'scheduled_pickup' | 'estimated_weight' | 'notes'>>
  ): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      // Recalculate price if weight changed
      const updateData: any = { ...updates, updated_at: new Date().toISOString() }
      
      if (updates.estimated_weight !== undefined && updates.estimated_weight !== null) {
        const request = requests.value.find(r => r.id === requestId)
        if (request) {
          updateData.estimated_price = calculatePrice(request.services, updates.estimated_weight)
        }
      }

      const { error: updateError } = await (supabase
        .from('laundry_requests') as any)
        .update(updateData)
        .eq('id', requestId)
        .in('status', ['pending', 'matched']) // Only allow updates before pickup

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
  const canCancel = (request: LaundryRequest): boolean => {
    return ['pending', 'matched'].includes(request.status)
  }

  // Check if request can be edited
  const canEdit = (request: LaundryRequest): boolean => {
    return ['pending', 'matched'].includes(request.status)
  }

  // Check if request can be rated
  const canRate = (request: LaundryRequest): boolean => {
    return request.status === 'delivered' && request.provider_id !== null
  }

  // Get status color for UI
  const getStatusColor = (status: LaundryRequest['status']): string => {
    const colors: Record<LaundryRequest['status'], string> = {
      pending: '#F5A623',
      matched: '#2196F3',
      picked_up: '#9C27B0',
      washing: '#00BCD4',
      ready: '#4CAF50',
      delivered: '#00A86B',
      cancelled: '#E53935'
    }
    return colors[status]
  }

  // Get status step for timeline
  const getStatusStep = (status: LaundryRequest['status']): number => {
    const steps: Record<LaundryRequest['status'], number> = {
      pending: 0,
      matched: 1,
      picked_up: 2,
      washing: 3,
      ready: 4,
      delivered: 5,
      cancelled: -1
    }
    return steps[status]
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  // Labels
  const serviceLabels: Record<LaundryService, string> = {
    'wash-fold': 'ซัก-พับ (฿40/กก.)',
    'wash-iron': 'ซัก-รีด (฿60/กก.)',
    'dry-clean': 'ซักแห้ง (฿150/ชิ้น)',
    'express': 'ด่วน (+฿100)'
  }

  const statusLabels: Record<LaundryRequest['status'], string> = {
    pending: 'รอผู้ให้บริการ',
    matched: 'จับคู่แล้ว',
    picked_up: 'รับผ้าแล้ว',
    washing: 'กำลังซัก',
    ready: 'พร้อมส่ง',
    delivered: 'ส่งแล้ว',
    cancelled: 'ยกเลิก'
  }

  return {
    requests,
    currentRequest,
    loading,
    error,
    createLaundryRequest,
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
    getStatusStep,
    
    // Labels
    serviceLabels,
    statusLabels
  }
}
