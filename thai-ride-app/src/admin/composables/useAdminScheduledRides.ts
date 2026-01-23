/**
 * useAdminScheduledRides - Admin composable for Scheduled Rides Management
 * 
 * Role: Admin only
 * Functions: get_scheduled_rides, count_scheduled_rides
 * 
 * Features:
 * - Fetch scheduled rides with date filters
 * - Pagination support
 * - Error handling with useErrorHandler
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabase'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'

export interface ScheduledRide {
  id: string
  tracking_id: string
  user_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  destination_address: string
  destination_lat: number
  destination_lng: number
  scheduled_datetime: string
  ride_type: string
  estimated_fare: number
  notes: string | null
  reminder_sent: boolean
  status: string
  ride_request_id: string | null
  passenger_count: number
  special_requests: string | null
  provider_id: string | null
  provider_name: string | null
  provider_phone: string | null
  provider_rating: number | null
  created_at: string
  updated_at: string
}

export interface ScheduledRideFilters {
  dateFrom?: Date | null
  dateTo?: Date | null
  limit?: number
  offset?: number
}

export function useAdminScheduledRides() {
  const { handle: handleError } = useErrorHandler()
  const { showError } = useToast()

  const loading = ref(false)
  const scheduledRides = ref<ScheduledRide[]>([])
  const totalCount = ref(0)
  const error = ref<string | null>(null)

  // Computed
  const upcomingRides = computed(() => {
    const now = new Date()
    return scheduledRides.value.filter(ride => 
      new Date(ride.scheduled_datetime) > now
    )
  })

  const todayRides = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return scheduledRides.value.filter(ride => {
      const rideDate = new Date(ride.scheduled_datetime)
      return rideDate >= today && rideDate < tomorrow
    })
  })

  const assignedRides = computed(() =>
    scheduledRides.value.filter(ride => ride.provider_id !== null)
  )

  const unassignedRides = computed(() =>
    scheduledRides.value.filter(ride => ride.provider_id === null)
  )

  /**
   * Fetch scheduled rides with status filter and pagination
   */
  async function fetchScheduledRides(filters: ScheduledRideFilters = {}): Promise<ScheduledRide[]> {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('get_all_scheduled_rides_for_admin', {
        p_status: null, // null = all statuses
        p_limit: filters.limit || 20,
        p_offset: filters.offset || 0
      })

      if (rpcError) throw rpcError

      scheduledRides.value = data || []
      return scheduledRides.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch scheduled rides'
      error.value = message
      handleError(err, 'useAdminScheduledRides.fetchScheduledRides')
      showError('ไม่สามารถโหลดข้อมูลการจองล่วงหน้าได้')
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch total count of scheduled rides for pagination
   */
  async function fetchCount(filters: Omit<ScheduledRideFilters, 'limit' | 'offset'> = {}): Promise<number> {
    try {
      const { data, error: rpcError } = await supabase.rpc('count_scheduled_rides_for_admin', {
        p_status: null // null = all statuses
      })

      if (rpcError) throw rpcError

      totalCount.value = data || 0
      return totalCount.value
    } catch (err) {
      handleError(err, 'useAdminScheduledRides.fetchCount')
      return 0
    }
  }

  /**
   * Format currency for display
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date for display
   */
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Format date only (no time)
   */
  function formatDateOnly(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  /**
   * Format time only
   */
  function formatTimeOnly(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Get time until scheduled ride
   */
  function getTimeUntil(scheduledDatetime: string): string {
    const now = new Date()
    const scheduled = new Date(scheduledDatetime)
    const diffMs = scheduled.getTime() - now.getTime()

    if (diffMs < 0) return 'เลยเวลาแล้ว'

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `อีก ${diffDays} วัน`
    } else if (diffHours > 0) {
      return `อีก ${diffHours} ชั่วโมง`
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `อีก ${diffMinutes} นาที`
    }
  }

  /**
   * Check if ride is soon (within 1 hour)
   */
  function isRideSoon(scheduledDatetime: string): boolean {
    const now = new Date()
    const scheduled = new Date(scheduledDatetime)
    const diffMs = scheduled.getTime() - now.getTime()
    const oneHourMs = 60 * 60 * 1000

    return diffMs > 0 && diffMs <= oneHourMs
  }

  /**
   * Get status color class
   */
  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      assigned: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  /**
   * Get status label in Thai
   */
  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'รอยืนยัน',
      confirmed: 'ยืนยันแล้ว',
      assigned: 'มอบหมายแล้ว',
      cancelled: 'ยกเลิก',
      completed: 'เสร็จสิ้น',
      scheduled: 'กำหนดการแล้ว',
      expired: 'หมดอายุ'
    }
    return labels[status] || status
  }

  /**
   * Cancel scheduled ride
   */
  async function cancelScheduledRide(rideId: string, reason?: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_cancel_scheduled_ride', {
        p_ride_id: rideId,
        p_reason: reason || 'Cancelled by admin'
      })

      if (rpcError) throw rpcError

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to cancel ride')
      }

      // Refresh list
      await fetchScheduledRides()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel scheduled ride'
      error.value = message
      handleError(err, 'useAdminScheduledRides.cancelScheduledRide')
      showError('ไม่สามารถยกเลิกการจองได้')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Update scheduled ride status
   */
  async function updateScheduledRideStatus(rideId: string, newStatus: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_update_scheduled_ride_status', {
        p_ride_id: rideId,
        p_new_status: newStatus
      })

      if (rpcError) throw rpcError

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update status')
      }

      // Refresh list
      await fetchScheduledRides()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status'
      error.value = message
      handleError(err, 'useAdminScheduledRides.updateScheduledRideStatus')
      showError('ไม่สามารถอัพเดทสถานะได้')
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading: readonly(loading),
    scheduledRides: readonly(scheduledRides),
    totalCount: readonly(totalCount),
    error: readonly(error),

    // Computed
    upcomingRides,
    todayRides,
    assignedRides,
    unassignedRides,

    // Methods
    fetchScheduledRides,
    fetchCount,
    cancelScheduledRide,
    updateScheduledRideStatus,

    // Helpers
    formatCurrency,
    formatDate,
    formatDateOnly,
    formatTimeOnly,
    getTimeUntil,
    isRideSoon,
    getStatusColor,
    getStatusLabel
  }
}
