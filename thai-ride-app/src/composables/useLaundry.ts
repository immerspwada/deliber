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

  // Create Laundry Request
  async function createLaundryRequest(input: CreateLaundryInput): Promise<LaundryRequest | null> {
    loading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return null
      }

      const estimatedPrice = input.estimated_weight 
        ? calculatePrice(input.services, input.estimated_weight)
        : null

      const { data, error: insertError } = await supabase
        .from('laundry_requests')
        .insert({
          user_id: user.id,
          services: input.services,
          pickup_address: input.pickup_address,
          pickup_lat: input.pickup_lat || null,
          pickup_lng: input.pickup_lng || null,
          scheduled_pickup: input.scheduled_pickup,
          estimated_weight: input.estimated_weight || null,
          estimated_price: estimatedPrice,
          notes: input.notes || null,
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

      const { error: insertError } = await supabase
        .from('laundry_ratings')
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

  // Cancel Request
  async function cancelRequest(requestId: string, reason?: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('laundry_requests')
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

  // Update Request (for editing before pickup)
  async function updateRequest(
    requestId: string,
    updates: Partial<Pick<LaundryRequest, 'pickup_address' | 'scheduled_pickup' | 'estimated_weight' | 'notes'>>
  ): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      // Recalculate price if weight changed
      let updateData: any = { ...updates, updated_at: new Date().toISOString() }
      
      if (updates.estimated_weight !== undefined) {
        const request = requests.value.find(r => r.id === requestId)
        if (request) {
          updateData.estimated_price = calculatePrice(request.services, updates.estimated_weight)
        }
      }

      const { error: updateError } = await supabase
        .from('laundry_requests')
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
