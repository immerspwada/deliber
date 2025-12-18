/**
 * Feature: F158 - Queue Booking Service
 * Tables: queue_bookings, queue_ratings
 * Migration: 029_new_services.sql
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
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

  // Create Queue Booking
  async function createQueueBooking(input: CreateQueueBookingInput): Promise<QueueBooking | null> {
    loading.value = true
    error.value = null

    try {
      // Validate future date (Requirements 1.3)
      if (!isFutureDateTime(input.scheduled_date, input.scheduled_time)) {
        error.value = 'กรุณาเลือกวันและเวลาในอนาคต'
        return null
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return null
      }

      // Generate tracking_id via trigger (auto-generated)
      const { data, error: insertError } = await supabase
        .from('queue_bookings')
        .insert({
          user_id: user.id,
          category: input.category,
          place_name: input.place_name || null,
          place_address: input.place_address || null,
          details: input.details || null,
          scheduled_date: input.scheduled_date,
          scheduled_time: input.scheduled_time,
          status: 'pending'
        })
        .select()
        .single()

      if (insertError) throw insertError

      currentBooking.value = data
      bookings.value.unshift(data)
      return data
    } catch (err: any) {
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return
      }

      const { data, error: fetchError } = await supabase
        .from('queue_bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      bookings.value = data || []
    } catch (err: any) {
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

  // Cancel Booking (Requirements 1.6)
  async function cancelBooking(bookingId: string, reason?: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('queue_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason || null
        })
        .eq('id', bookingId)

      if (updateError) throw updateError

      // Update local state
      const index = bookings.value.findIndex(b => b.id === bookingId)
      if (index !== -1) {
        bookings.value[index].status = 'cancelled'
        bookings.value[index].cancelled_at = new Date().toISOString()
        bookings.value[index].cancel_reason = reason || null
      }

      if (currentBooking.value && currentBooking.value.id === bookingId) {
        currentBooking.value.status = 'cancelled'
        currentBooking.value.cancelled_at = new Date().toISOString()
        currentBooking.value.cancel_reason = reason || null
      }

      return true
    } catch (err: any) {
      error.value = err.message || 'เกิดข้อผิดพลาดในการยกเลิก'
      return false
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        error.value = 'กรุณาเข้าสู่ระบบ'
        return false
      }

      const { error: insertError } = await supabase
        .from('queue_ratings')
        .insert({
          booking_id: bookingId,
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

      const { error: updateError } = await supabase
        .from('queue_bookings')
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
        bookings.value[index] = { ...bookings.value[index], ...updates }
      }

      if (currentBooking.value && currentBooking.value.id === bookingId) {
        currentBooking.value = { ...currentBooking.value, ...updates }
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
