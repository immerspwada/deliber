/**
 * Feature: F158 - Queue Booking Service
 * Tables: queue_bookings, queue_ratings
 * Migration: 029_new_services.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useWalletBalance } from './useWalletBalance'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Types
export interface QueueBooking {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  category: 'hospital' | 'bank' | 'government' | 'restaurant' | 'salon' | 'other'
  place_name: string | null
  place_address: string | null
  details: string | null
  scheduled_date: string
  scheduled_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  service_fee: number
  final_fee: number | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface CreateQueueBookingInput {
  category: QueueBooking['category']
  place_name?: string
  place_address?: string
  details?: string
  scheduled_date: string
  scheduled_time: string
}

export interface QueueRating {
  id: string
  booking_id: string
  user_id: string
  provider_id: string
  rating: number
  comment: string | null
  created_at: string
}

export function useQueueBooking() {
  // Auth Store
  const authStore = useAuthStore()
  
  // Wallet Balance - Don't destructure to maintain reactivity
  const walletBalance = useWalletBalance()
  
  // Check if demo mode
  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'
  
  // State
  const bookings = ref<QueueBooking[]>([])
  const currentBooking = ref<QueueBooking | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  let realtimeChannel: RealtimeChannel | null = null


  // Computed
  const pendingBookings = computed(() => 
    bookings.value.filter(b => b.status === 'pending')
  )
  
  const activeBookings = computed(() => 
    bookings.value.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status))
  )

  // Validate future date
  const isFutureDateTime = (date: string, time: string): boolean => {
    const scheduledDateTime = new Date(`${date}T${time}`)
    return scheduledDateTime > new Date()
  }

  // Create Queue Booking using atomic function
  async function createQueueBooking(input: CreateQueueBookingInput): Promise<QueueBooking | null> {
    loading.value = true
    error.value = null

    try {
      // Validate future date (Requirements 1.3)
      if (!isFutureDateTime(input.scheduled_date, input.scheduled_time)) {
        error.value = 'กรุณาเลือกวันและเวลาในอนาคต'
        return null
      }

      const userId = authStore.user?.id
      if (!userId) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return null
      }

      console.log('🎫 Creating queue booking...')
      console.log('👤 User ID:', userId)
      console.log('💰 Current balance (from composable):', walletBalance.balance.value)
      console.log('💰 Formatted balance:', walletBalance.formattedBalance.value)
      console.log('💵 Service fee:', 50)

      // Demo mode - create mock booking
      if (isDemoMode()) {
        const mockBooking: QueueBooking = {
          id: `demo-${Date.now()}`,
          tracking_id: `QUE-DEMO-${Date.now()}`,
          user_id: userId,
          provider_id: null,
          category: input.category,
          place_name: input.place_name || null,
          place_address: input.place_address || null,
          details: input.details || null,
          scheduled_date: input.scheduled_date,
          scheduled_time: input.scheduled_time,
          status: 'pending',
          service_fee: 50,
          final_fee: null,
          cancelled_at: null,
          cancel_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null
        }
        currentBooking.value = mockBooking
        bookings.value.unshift(mockBooking)
        return mockBooking
      }

      // Calculate service fee
      const serviceFee = 50 // Base fee for queue booking

      console.log('🔌 Calling create_queue_atomic RPC...')

      // Call atomic function for transaction safety
      const { data: result, error: rpcError } = await supabase.rpc('create_queue_atomic', {
        p_user_id: userId,
        p_category: input.category,
        p_place_name: input.place_name || null,
        p_place_address: input.place_address || null,
        p_details: input.details || null,
        p_scheduled_date: input.scheduled_date,
        p_scheduled_time: input.scheduled_time,
        p_service_fee: serviceFee
      })

      if (rpcError) {
        console.error('❌ RPC Error:', rpcError)
        
        // Check if it's insufficient balance error
        if (rpcError.message?.includes('INSUFFICIENT_BALANCE') || 
            rpcError.message?.includes('ยอดเงินไม่เพียงพอ')) {
          error.value = `ยอดเงินใน Wallet ไม่เพียงพอ (ปัจจุบัน: ${walletBalance.formattedBalance.value}) กรุณาเติมเงินก่อนจองคิว`
        } else {
          error.value = rpcError.message || 'เกิดข้อผิดพลาดในการจองคิว'
        }
        return null
      }

      console.log('✅ RPC Result:', result)

      // Check result
      if (!result || result.length === 0) {
        error.value = 'ไม่สามารถจองคิวได้'
        return null
      }

      const atomicResult = result[0]
      
      if (!atomicResult.success) {
        console.error('❌ Booking failed:', atomicResult.message)
        error.value = atomicResult.message || 'ไม่สามารถจองคิวได้'
        return null
      }

      console.log('✅ Booking created successfully:', atomicResult.booking_id)

      // Fetch the created booking
      const { data: queueData, error: fetchError } = await supabase
        .from('queue_bookings')
        .select('*')
        .eq('id', atomicResult.booking_id)
        .single()

      if (fetchError || !queueData) {
        error.value = 'จองคิวสำเร็จแต่ไม่สามารถโหลดข้อมูลได้'
        return null
      }

      currentBooking.value = queueData
      bookings.value.unshift(queueData)
      return queueData
    } catch (err: any) {
      console.error('❌ Create Queue Error:', err)
      error.value = err.message || 'เกิดข้อผิดพลาดในการจองคิว'
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch User Bookings (Requirements 1.7)
  async function fetchUserBookings(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const userId = authStore.user?.id
      if (!userId) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return
      }

      // Skip API call in demo mode
      if (isDemoMode()) {
        bookings.value = []
        return
      }

      const { data, error: fetchError } = await supabase
        .from('queue_bookings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      bookings.value = data || []
    } catch (err: any) {
      // Silently handle network errors in demo mode
      if (isDemoMode()) {
        bookings.value = []
        return
      }
      error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
    } finally {
      loading.value = false
    }
  }

  // Fetch Single Booking
  async function fetchBooking(bookingId: string): Promise<QueueBooking | null> {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('queue_bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (fetchError) throw fetchError

      currentBooking.value = data
      return data
    } catch (err: any) {
      error.value = err.message || 'ไม่พบข้อมูลการจอง'
      return null
    } finally {
      loading.value = false
    }
  }

  // Cancel Booking with pending refund (requires Admin approval)
  async function cancelBooking(bookingId: string, reason?: string): Promise<{ success: boolean; refundAmount?: number; message?: string } | null> {
    loading.value = true
    error.value = null

    try {
      const userId = authStore.user?.id
      if (!userId) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return null
      }

      // Use atomic cancel function with pending refund
      const { data: result, error: rpcError } = await supabase.rpc('cancel_request_with_pending_refund', {
        p_request_id: bookingId,
        p_request_type: 'queue',
        p_cancelled_by: userId,
        p_cancelled_by_role: 'customer',
        p_cancel_reason: reason || 'ลูกค้ายกเลิก'
      })

      if (rpcError) {
        console.error('Cancel error:', rpcError)
        if (rpcError.message?.includes('REQUEST_NOT_FOUND')) {
          error.value = 'ไม่พบการจองนี้'
        } else if (rpcError.message?.includes('REQUEST_ALREADY_FINALIZED')) {
          error.value = 'ไม่สามารถยกเลิกได้ การจองนี้ดำเนินการเสร็จสิ้นแล้ว'
        } else {
          error.value = rpcError.message || 'เกิดข้อผิดพลาดในการยกเลิก'
        }
        return null
      }

      if (result?.success) {
        // Update local state
        const index = bookings.value.findIndex(b => b.id === bookingId)
        if (index !== -1) {
          bookings.value[index]!.status = 'cancelled'
          bookings.value[index]!.cancelled_at = new Date().toISOString()
          bookings.value[index]!.cancel_reason = reason || null
        }

        if (currentBooking.value && currentBooking.value.id === bookingId) {
          currentBooking.value.status = 'cancelled'
          currentBooking.value.cancelled_at = new Date().toISOString()
          currentBooking.value.cancel_reason = reason || null
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


  // Subscribe to Realtime Updates (Requirements 6.1)
  function subscribeToBooking(bookingId: string): void {
    unsubscribe()

    realtimeChannel = supabase
      .channel(`queue_booking_${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_bookings',
          filter: `id=eq.${bookingId}`
        },
        (payload: RealtimePostgresChangesPayload<QueueBooking>) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as QueueBooking
            currentBooking.value = updated
            
            const index = bookings.value.findIndex(b => b.id === bookingId)
            if (index !== -1) {
              bookings.value[index] = updated
            }
          }
        }
      )
      .subscribe()
  }

  // Unsubscribe from Realtime
  function unsubscribe(): void {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  // Submit Rating
  async function submitRating(
    bookingId: string,
    providerId: string,
    rating: number,
    comment?: string
  ): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const userId = authStore.user?.id
      if (!userId) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return false
      }

      const { error: insertError } = await (supabase
        .from('queue_ratings') as any)
        .insert({
          booking_id: bookingId,
          user_id: userId,
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

  // Update booking details (for editing before confirmation)
  async function updateBooking(
    bookingId: string,
    updates: Partial<Pick<QueueBooking, 'place_name' | 'place_address' | 'details' | 'scheduled_date' | 'scheduled_time'>>
  ): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      // Validate future date if updating schedule
      if (updates.scheduled_date && updates.scheduled_time) {
        if (!isFutureDateTime(updates.scheduled_date, updates.scheduled_time)) {
          error.value = 'กรุณาเลือกวันและเวลาในอนาคต'
          return false
        }
      }

      const { error: updateError } = await (supabase
        .from('queue_bookings') as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .eq('status', 'pending') // Only allow updates for pending bookings

      if (updateError) throw updateError

      // Update local state
      const index = bookings.value.findIndex(b => b.id === bookingId)
      if (index !== -1) {
        bookings.value[index] = { ...bookings.value[index]!, ...updates } as QueueBooking
      }

      if (currentBooking.value && currentBooking.value.id === bookingId) {
        currentBooking.value = { ...currentBooking.value, ...updates } as QueueBooking
      }

      return true
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการอัพเดท'
      return false
    } finally {
      loading.value = false
    }
  }

  // Check if booking can be cancelled
  const canCancel = (booking: QueueBooking): boolean => {
    return ['pending', 'confirmed'].includes(booking.status)
  }

  // Check if booking can be edited
  const canEdit = (booking: QueueBooking): boolean => {
    return booking.status === 'pending'
  }

  // Check if booking can be rated
  const canRate = (booking: QueueBooking): boolean => {
    return booking.status === 'completed' && booking.provider_id !== null
  }

  // Get status color for UI
  const getStatusColor = (status: QueueBooking['status']): string => {
    const colors: Record<QueueBooking['status'], string> = {
      pending: '#F5A623',
      confirmed: '#2196F3',
      in_progress: '#9C27B0',
      completed: '#00A86B',
      cancelled: '#E53935'
    }
    return colors[status]
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  // Get Booking by Tracking ID
  async function fetchByTrackingId(trackingId: string): Promise<QueueBooking | null> {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('queue_bookings')
        .select('*')
        .eq('tracking_id', trackingId)
        .single()

      if (fetchError) throw fetchError

      currentBooking.value = data
      return data
    } catch (err: any) {
      error.value = err.message || 'ไม่พบข้อมูลการจอง'
      return null
    } finally {
      loading.value = false
    }
  }

  // Category Labels
  const categoryLabels: Record<QueueBooking['category'], string> = {
    hospital: 'โรงพยาบาล',
    bank: 'ธนาคาร',
    government: 'หน่วยงานราชการ',
    restaurant: 'ร้านอาหาร',
    salon: 'ร้านเสริมสวย',
    other: 'อื่นๆ'
  }

  // Status Labels
  const statusLabels: Record<QueueBooking['status'], string> = {
    pending: 'รอดำเนินการ',
    confirmed: 'ยืนยันแล้ว',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก'
  }

  return {
    // State
    bookings,
    currentBooking,
    loading,
    error,
    
    // Wallet - Return entire composable to maintain reactivity
    walletBalance,
    
    // Computed
    pendingBookings,
    activeBookings,
    
    // Methods
    createQueueBooking,
    fetchUserBookings,
    fetchBooking,
    fetchByTrackingId,
    cancelBooking,
    updateBooking,
    subscribeToBooking,
    unsubscribe,
    submitRating,
    isFutureDateTime,
    clearError,
    
    // Helpers
    canCancel,
    canEdit,
    canRate,
    getStatusColor,
    
    // Labels
    categoryLabels,
    statusLabels
  }
}
