/**
 * Fare Calculation Utilities with Promo Support
 * 
 * CRITICAL BUSINESS LOGIC:
 * - Commission is calculated from FULL FARE (before discount)
 * - Provider receives full earnings (total_fare - commission)
 * - Platform bears the full discount cost as Marketing Investment
 * - Customer pays discounted price (total_fare - discount)
 * - ALL amounts are rounded to integers using Math.round()
 * 
 * ROUNDING STANDARD:
 * - < 0.5 rounds down
 * - ≥ 0.5 rounds up
 * - Applied consistently across all calculations
 * 
 * @see PROMO_FINANCIAL_LOGIC_ANALYSIS_2026-01-29.md
 * @see src/utils/mathRounding.ts
 */

import type { Database } from '@/types/database'
import {
  roundToInt,
  calculateCommission,
  calculateDiscount,
  calculatePlatformRevenue,
  formatCurrency as formatCurrencyUtil
} from './mathRounding'

type PromoCode = Database['public']['Tables']['promo_codes']['Row']

export interface FareInput {
  baseFare: number
  distanceFare: number
  timeFare: number
  surgeMultiplier: number
  commissionRate: number
  promoCode?: PromoCode | null
}

export interface FareCalculation {
  // Full fare (before discount)
  totalFare: number
  
  // Commission (calculated from full fare)
  platformCommission: number
  commissionRate: number
  
  // Provider earnings (from full fare)
  providerEarnings: number
  
  // Promo discount (Platform bears this cost)
  promoDiscountAmount: number
  promoCode: string | null
  
  // Customer payment (after discount)
  customerPaidAmount: number
  
  // Platform P&L
  platformRevenue: number // commission - discount
  
  // Breakdown for display
  breakdown: {
    baseFare: number
    distanceFare: number
    timeFare: number
    subtotal: number
    surgeMultiplier: number
    totalFare: number
  }
}

/**
 * Calculate fare with promo discount
 * 
 * ✅ CORRECT LOGIC:
 * 1. Calculate total fare (base + distance + time) * surge
 * 2. Calculate commission from FULL FARE
 * 3. Calculate provider earnings from FULL FARE
 * 4. Calculate promo discount
 * 5. Customer pays: total_fare - discount
 * 6. Platform net: commission - discount
 * 
 * ✅ ROUNDING: All amounts rounded to integers using Math.round()
 */
export function calculateFareWithPromo(input: FareInput): FareCalculation {
  // 1. Calculate full fare (rounded to integer)
  const subtotal = input.baseFare + input.distanceFare + input.timeFare
  const totalFare = roundToInt(subtotal * input.surgeMultiplier)
  
  // 2. Calculate commission (from FULL FARE, rounded)
  const platformCommission = calculateCommission(totalFare, input.commissionRate)
  
  // 3. Calculate provider earnings (from FULL FARE)
  const providerEarnings = totalFare - platformCommission
  
  // 4. Calculate promo discount (rounded)
  let promoDiscountAmount = 0
  let promoCodeUsed: string | null = null
  
  if (input.promoCode && input.promoCode.is_active) {
    promoCodeUsed = input.promoCode.code
    
    promoDiscountAmount = calculateDiscount(
      totalFare,
      input.promoCode.discount_type as 'fixed' | 'percentage',
      input.promoCode.discount_value,
      input.promoCode.max_discount || undefined
    )
    
    // Check minimum order amount
    if (input.promoCode.min_order_amount && totalFare < input.promoCode.min_order_amount) {
      promoDiscountAmount = 0
      promoCodeUsed = null
    }
  }
  
  // 5. Calculate customer payment (after discount)
  const customerPaidAmount = totalFare - promoDiscountAmount
  
  // 6. Calculate platform net revenue
  const platformRevenue = calculatePlatformRevenue(platformCommission, promoDiscountAmount)
  
  return {
    totalFare,
    platformCommission,
    commissionRate: input.commissionRate,
    providerEarnings,
    promoDiscountAmount,
    promoCode: promoCodeUsed,
    customerPaidAmount,
    platformRevenue,
    breakdown: {
      baseFare: roundToInt(input.baseFare),
      distanceFare: roundToInt(input.distanceFare),
      timeFare: roundToInt(input.timeFare),
      subtotal: roundToInt(subtotal),
      surgeMultiplier: input.surgeMultiplier,
      totalFare
    }
  }
}

/**
 * Validate promo code for a service
 */
export function validatePromoCode(
  promoCode: PromoCode,
  serviceType: string,
  totalFare: number
): { valid: boolean; reason?: string } {
  // Check if active
  if (!promoCode.is_active) {
    return { valid: false, reason: 'โปรโมชั่นไม่พร้อมใช้งาน' }
  }
  
  // Check service type
  if (promoCode.service_types && promoCode.service_types.length > 0) {
    if (!promoCode.service_types.includes(serviceType)) {
      return { valid: false, reason: 'โปรโมชั่นไม่รองรับบริการนี้' }
    }
  }
  
  // Check minimum order amount
  if (promoCode.min_order_amount && totalFare < promoCode.min_order_amount) {
    return { 
      valid: false, 
      reason: `ยอดขั้นต่ำ ฿${promoCode.min_order_amount.toLocaleString()}` 
    }
  }
  
  // Check usage limit
  if (promoCode.usage_limit && promoCode.usage_count >= promoCode.usage_limit) {
    return { valid: false, reason: 'โปรโมชั่นถูกใช้หมดแล้ว' }
  }
  
  // Check date range
  const now = new Date()
  if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
    return { valid: false, reason: 'โปรโมชั่นยังไม่เริ่ม' }
  }
  if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
    return { valid: false, reason: 'โปรโมชั่นหมดอายุแล้ว' }
  }
  
  return { valid: true }
}

/**
 * Format currency for display (integer only, no decimals)
 */
export function formatCurrency(amount: number): string {
  return formatCurrencyUtil(amount, true)
}

/**
 * Calculate discount preview for UI (all amounts rounded to integers)
 */
export function calculateDiscountPreview(
  promoCode: PromoCode,
  totalFare: number
): { discountAmount: number; finalAmount: number; savings: number } {
  const discountAmount = calculateDiscount(
    totalFare,
    promoCode.discount_type as 'fixed' | 'percentage',
    promoCode.discount_value,
    promoCode.max_discount || undefined
  )
  
  const finalAmount = totalFare - discountAmount
  const savings = discountAmount
  
  return { discountAmount, finalAmount, savings }
}
