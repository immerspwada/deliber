/**
 * Feature: F53 - Cancellation System
 * Tables: ride_requests, delivery_requests, shopping_requests
 * 
 * ระบบยกเลิกการเดินทาง/บริการ
 * - ยกเลิกโดยลูกค้า
 * - ยกเลิกโดย Provider
 * - คำนวณค่าธรรมเนียมยกเลิก
 * - บันทึกเหตุผลการยกเลิก
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export type CancellationReason = 
  | 'changed_mind'
  | 'driver_too_far'
  | 'driver_not_moving'
  | 'wrong_pickup'
  | 'wrong_destination'
  | 'found_other_ride'
  | 'emergency'
  | 'price_too_high'
  | 'long_wait'
  | 'other'

export interface CancellationOption {
  reason: CancellationReason
  label: string
  icon: string
  requiresNote?: boolean
}

export interface CancellationResult {
  success: boolean
  fee: number
  refundAmount: number
  message: string
}

// Cancellation reasons for customers
export const CUSTOMER_CANCELLATION_REASONS: CancellationOption[] = [
  { reason: 'changed_mind', label: 'เปลี่ยนใจ', icon: 'refresh' },
  { reason: 'driver_too_far', label: 'คนขับอยู่ไกลเกินไป', icon: 'map-pin' },
  { reason: 'driver_not_moving', label: 'คนขับไม่เคลื่อนที่', icon: 'pause' },
  { reason: 'wrong_pickup', label: 'จุดรับผิด', icon: 'x-circle' },
  { reason: 'wrong_destination', label: 'จุดหมายผิด', icon: 'x-circle' },
  { reason: 'found_other_ride', label: 'หารถอื่นได้แล้ว', icon: 'car' },
  { reason: 'price_too_high', label: 'ราคาสูงเกินไป', icon: 'dollar-sign' },
  { reason: 'long_wait', label: 'รอนานเกินไป', icon: 'clock' },
  { reason: 'emergency', label: 'เหตุฉุกเฉิน', icon: 'alert-triangle' },
  { reason: 'other', label: 'อื่นๆ', icon: 'more-horizontal', requiresNote: true }
]

// Cancellation reasons for providers
export const PROVIDER_CANCELLATION_REASONS: CancellationOption[] = [
  { reason: 'customer_not_found', label: 'หาลูกค้าไม่เจอ', icon: 'user-x' } as any,
  { reason: 'customer_not_responding', label: 'ลูกค้าไม่ตอบ', icon: 'phone-off' } as any,
  { reason: 'wrong_address', label: 'ที่อยู่ไม่ถูกต้อง', icon: 'map-pin' } as any,
  { reason: 'vehicle_issue', label: 'ปัญหารถ', icon: 'tool' } as any,
  { reason: 'emergency', label: 'เหตุฉุกเฉิน', icon: 'alert-triangle' },
  { reason: 'other', label: 'อื่นๆ', icon: 'more-horizontal', requiresNote: true }
]

// Cancellation fee rules
const CANCELLATION_FEE_RULES = {
  // Free cancellation within X minutes of booking
  freeCancellationMinutes: 2,
  // Fee after driver is matched
  matchedFee: 20,
  // Fee after driver arrives
  arrivedFee: 50,
  // Fee after trip starts (percentage of fare)
  inProgressFeePercent: 50
}

export function useCancellation() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

  // Calculate cancellation fee
  const calculateCancellationFee = (
    status: string,
    createdAt: Date,
    estimatedFare: number = 0
  ): number => {
    const now = new Date()
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / 60000

    // Free cancellation within first 2 minutes
    if (minutesSinceCreation <= CANCELLATION_FEE_RULES.freeCancellationMinutes) {
      return 0
    }

    switch (status) {
      case 'pending':
        return 0 // No fee if no driver matched yet
      case 'matched':
        return CANCELLATION_FEE_RULES.matchedFee
      case 'arriving':
        return CANCELLATION_FEE_RULES.arrivedFee
      case 'in_progress':
        return Math.round(estimatedFare * CANCELLATION_FEE_RULES.inProgressFeePercent / 100)
      default:
        return 0
    }
  }

  // Cancel ride request
  const cancelRide = async (
    rideId: string,
    reason: CancellationReason,
    note?: string,
    cancelledBy: 'customer' | 'provider' = 'customer'
  ): Promise<CancellationResult> => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        // Demo mode
        return {
          success: true,
          fee: 0,
          refundAmount: 0,
          message: 'ยกเลิกการเดินทางเรียบร้อยแล้ว'
        }
      }

      // Get ride details
      const { data: ride, error: fetchError } = await supabase
        .from('ride_requests')
        .select('status, created_at, final_fare, payment_status')
        .eq('id', rideId)
        .single()

      if (fetchError) throw fetchError
      if (!ride) throw new Error('ไม่พบข้อมูลการเดินทาง')

      const rideData = ride as any

      // Check if can be cancelled
      if (['completed', 'cancelled'].includes(rideData.status)) {
        throw new Error('ไม่สามารถยกเลิกการเดินทางนี้ได้')
      }

      // Calculate fee
      const fee = calculateCancellationFee(
        rideData.status,
        new Date(rideData.created_at),
        rideData.final_fare || 0
      )

      // Update ride status
      const { error: updateError } = await (supabase
        .from('ride_requests') as any)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: cancelledBy,
          cancellation_reason: reason,
          cancellation_note: note,
          cancellation_fee: fee
        })
        .eq('id', rideId)

      if (updateError) throw updateError

      // Calculate refund if prepaid
      let refundAmount = 0
      if (rideData.payment_status === 'paid' && rideData.final_fare) {
        refundAmount = rideData.final_fare - fee
      }

      return {
        success: true,
        fee,
        refundAmount,
        message: fee > 0 
          ? `ยกเลิกเรียบร้อย มีค่าธรรมเนียม ฿${fee}`
          : 'ยกเลิกการเดินทางเรียบร้อยแล้ว'
      }
    } catch (e: any) {
      error.value = e.message
      return {
        success: false,
        fee: 0,
        refundAmount: 0,
        message: e.message
      }
    } finally {
      loading.value = false
    }
  }

  // Cancel delivery request
  const cancelDelivery = async (
    deliveryId: string,
    reason: CancellationReason,
    note?: string
  ): Promise<CancellationResult> => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        return {
          success: true,
          fee: 0,
          refundAmount: 0,
          message: 'ยกเลิกการส่งของเรียบร้อยแล้ว'
        }
      }

      const { error: updateError } = await (supabase
        .from('delivery_requests') as any)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
          cancellation_note: note
        })
        .eq('id', deliveryId)

      if (updateError) throw updateError

      return {
        success: true,
        fee: 0,
        refundAmount: 0,
        message: 'ยกเลิกการส่งของเรียบร้อยแล้ว'
      }
    } catch (e: any) {
      error.value = e.message
      return {
        success: false,
        fee: 0,
        refundAmount: 0,
        message: e.message
      }
    } finally {
      loading.value = false
    }
  }

  // Cancel shopping request
  const cancelShopping = async (
    shoppingId: string,
    reason: CancellationReason,
    note?: string
  ): Promise<CancellationResult> => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        return {
          success: true,
          fee: 0,
          refundAmount: 0,
          message: 'ยกเลิกการซื้อของเรียบร้อยแล้ว'
        }
      }

      const { error: updateError } = await (supabase
        .from('shopping_requests') as any)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
          cancellation_note: note
        })
        .eq('id', shoppingId)

      if (updateError) throw updateError

      return {
        success: true,
        fee: 0,
        refundAmount: 0,
        message: 'ยกเลิกการซื้อของเรียบร้อยแล้ว'
      }
    } catch (e: any) {
      error.value = e.message
      return {
        success: false,
        fee: 0,
        refundAmount: 0,
        message: e.message
      }
    } finally {
      loading.value = false
    }
  }

  // Get cancellation reason label
  const getReasonLabel = (reason: CancellationReason): string => {
    const option = [...CUSTOMER_CANCELLATION_REASONS, ...PROVIDER_CANCELLATION_REASONS]
      .find(r => r.reason === reason)
    return option?.label || reason
  }

  // Check if cancellation is free
  const isCancellationFree = (status: string, createdAt: Date): boolean => {
    const now = new Date()
    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / 60000
    
    if (minutesSinceCreation <= CANCELLATION_FEE_RULES.freeCancellationMinutes) {
      return true
    }
    
    return status === 'pending'
  }

  // Get cancellation policy text
  const getCancellationPolicy = (): string[] => {
    return [
      `ยกเลิกฟรีภายใน ${CANCELLATION_FEE_RULES.freeCancellationMinutes} นาทีแรก`,
      'ยกเลิกฟรีหากยังไม่มีคนขับรับงาน',
      `ค่าธรรมเนียม ฿${CANCELLATION_FEE_RULES.matchedFee} หลังคนขับรับงาน`,
      `ค่าธรรมเนียม ฿${CANCELLATION_FEE_RULES.arrivedFee} หลังคนขับถึงจุดรับ`,
      `ค่าธรรมเนียม ${CANCELLATION_FEE_RULES.inProgressFeePercent}% หลังเริ่มเดินทาง`
    ]
  }

  return {
    loading,
    error,
    calculateCancellationFee,
    cancelRide,
    cancelDelivery,
    cancelShopping,
    getReasonLabel,
    isCancellationFree,
    getCancellationPolicy,
    CUSTOMER_CANCELLATION_REASONS,
    PROVIDER_CANCELLATION_REASONS
  }
}
