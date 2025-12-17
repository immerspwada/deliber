/**
 * Feature: F56 - Tip System
 * Tables: ride_requests, delivery_requests, shopping_requests
 * 
 * ระบบให้ทิปคนขับ
 * - เลือกจำนวนทิป
 * - ทิปหลังจบการเดินทาง
 * - ประวัติการให้ทิป
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface TipOption {
  amount: number
  label: string
  isPercentage?: boolean
}

export interface TipResult {
  success: boolean
  amount: number
  message: string
}

// Predefined tip options
export const TIP_OPTIONS: TipOption[] = [
  { amount: 0, label: 'ไม่ให้ทิป' },
  { amount: 10, label: '฿10' },
  { amount: 20, label: '฿20' },
  { amount: 50, label: '฿50' },
  { amount: 100, label: '฿100' }
]

// Percentage-based tip options
export const TIP_PERCENTAGE_OPTIONS: TipOption[] = [
  { amount: 0, label: 'ไม่ให้ทิป', isPercentage: true },
  { amount: 5, label: '5%', isPercentage: true },
  { amount: 10, label: '10%', isPercentage: true },
  { amount: 15, label: '15%', isPercentage: true },
  { amount: 20, label: '20%', isPercentage: true }
]

export function useTip() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

  // Calculate tip from percentage
  const calculateTipFromPercentage = (fare: number, percentage: number): number => {
    return Math.round(fare * percentage / 100)
  }

  // Add tip to ride
  const addTipToRide = async (
    rideId: string,
    amount: number
  ): Promise<TipResult> => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        return {
          success: true,
          amount,
          message: amount > 0 ? `ให้ทิป ฿${amount} เรียบร้อยแล้ว` : 'ไม่ให้ทิป'
        }
      }

      const { error: updateError } = await (supabase
        .from('ride_requests') as any)
        .update({
          tip_amount: amount,
          tip_given_at: amount > 0 ? new Date().toISOString() : null
        })
        .eq('id', rideId)

      if (updateError) throw updateError

      return {
        success: true,
        amount,
        message: amount > 0 ? `ให้ทิป ฿${amount} เรียบร้อยแล้ว` : 'ไม่ให้ทิป'
      }
    } catch (e: any) {
      error.value = e.message
      return {
        success: false,
        amount: 0,
        message: e.message
      }
    } finally {
      loading.value = false
    }
  }

  // Add tip to delivery
  const addTipToDelivery = async (
    deliveryId: string,
    amount: number
  ): Promise<TipResult> => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        return {
          success: true,
          amount,
          message: amount > 0 ? `ให้ทิป ฿${amount} เรียบร้อยแล้ว` : 'ไม่ให้ทิป'
        }
      }

      const { error: updateError } = await (supabase
        .from('delivery_requests') as any)
        .update({
          tip_amount: amount,
          tip_given_at: amount > 0 ? new Date().toISOString() : null
        })
        .eq('id', deliveryId)

      if (updateError) throw updateError

      return {
        success: true,
        amount,
        message: amount > 0 ? `ให้ทิป ฿${amount} เรียบร้อยแล้ว` : 'ไม่ให้ทิป'
      }
    } catch (e: any) {
      error.value = e.message
      return {
        success: false,
        amount: 0,
        message: e.message
      }
    } finally {
      loading.value = false
    }
  }

  // Add tip to shopping
  const addTipToShopping = async (
    shoppingId: string,
    amount: number
  ): Promise<TipResult> => {
    loading.value = true
    error.value = null

    try {
      if (isDemoMode()) {
        return {
          success: true,
          amount,
          message: amount > 0 ? `ให้ทิป ฿${amount} เรียบร้อยแล้ว` : 'ไม่ให้ทิป'
        }
      }

      const { error: updateError } = await (supabase
        .from('shopping_requests') as any)
        .update({
          tip_amount: amount,
          tip_given_at: amount > 0 ? new Date().toISOString() : null
        })
        .eq('id', shoppingId)

      if (updateError) throw updateError

      return {
        success: true,
        amount,
        message: amount > 0 ? `ให้ทิป ฿${amount} เรียบร้อยแล้ว` : 'ไม่ให้ทิป'
      }
    } catch (e: any) {
      error.value = e.message
      return {
        success: false,
        amount: 0,
        message: e.message
      }
    } finally {
      loading.value = false
    }
  }

  // Get provider's total tips
  const getProviderTotalTips = async (providerId: string): Promise<number> => {
    try {
      if (isDemoMode()) {
        return Math.floor(Math.random() * 5000) + 500
      }

      const { data, error: fetchError } = await supabase
        .from('ride_requests')
        .select('tip_amount')
        .eq('provider_id', providerId)
        .not('tip_amount', 'is', null)

      if (fetchError) throw fetchError

      return (data || []).reduce((sum: number, r: any) => sum + (r.tip_amount || 0), 0)
    } catch {
      return 0
    }
  }

  // Get user's tip history
  const getUserTipHistory = async (userId: string): Promise<{ total: number; count: number }> => {
    try {
      if (isDemoMode()) {
        return {
          total: Math.floor(Math.random() * 1000) + 100,
          count: Math.floor(Math.random() * 20) + 5
        }
      }

      const { data, error: fetchError } = await supabase
        .from('ride_requests')
        .select('tip_amount')
        .eq('user_id', userId)
        .not('tip_amount', 'is', null)
        .gt('tip_amount', 0)

      if (fetchError) throw fetchError

      const tips = data || []
      return {
        total: tips.reduce((sum: number, r: any) => sum + (r.tip_amount || 0), 0),
        count: tips.length
      }
    } catch {
      return { total: 0, count: 0 }
    }
  }

  // Format tip amount
  const formatTip = (amount: number): string => {
    return `฿${amount.toLocaleString('th-TH')}`
  }

  // Get suggested tip based on fare
  const getSuggestedTip = (fare: number): number => {
    if (fare < 50) return 10
    if (fare < 100) return 20
    if (fare < 200) return 30
    if (fare < 500) return 50
    return Math.round(fare * 0.1) // 10% for high fares
  }

  return {
    loading,
    error,
    calculateTipFromPercentage,
    addTipToRide,
    addTipToDelivery,
    addTipToShopping,
    getProviderTotalTips,
    getUserTipHistory,
    formatTip,
    getSuggestedTip,
    TIP_OPTIONS,
    TIP_PERCENTAGE_OPTIONS
  }
}
