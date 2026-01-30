/**
 * Math Rounding Utilities
 * 
 * Standard mathematical rounding for the entire system:
 * - < 0.5 rounds down
 * - ≥ 0.5 rounds up
 * 
 * Used for all financial calculations to ensure consistency.
 */

/**
 * Round to nearest integer using standard mathematical rounding
 * 
 * @param value - Number to round
 * @returns Rounded integer
 * 
 * @example
 * roundToInt(10.4) // 10
 * roundToInt(10.5) // 11
 * roundToInt(10.6) // 11
 * roundToInt(-10.4) // -10
 * roundToInt(-10.5) // -10 (rounds towards zero for negative)
 */
export function roundToInt(value: number): number {
  return Math.round(value)
}

/**
 * Round currency amount to integer (THB has no decimal places in practice)
 * 
 * @param amount - Amount to round
 * @returns Rounded amount as integer
 * 
 * @example
 * roundCurrency(159.4) // 159
 * roundCurrency(159.5) // 160
 * roundCurrency(159.9) // 160
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount)
}

/**
 * Calculate percentage and round to integer
 * 
 * @param value - Base value
 * @param percentage - Percentage (e.g., 0.2 for 20%)
 * @returns Rounded result
 * 
 * @example
 * roundPercentage(200, 0.2) // 40 (20% of 200)
 * roundPercentage(199, 0.2) // 40 (39.8 rounds to 40)
 * roundPercentage(201, 0.2) // 40 (40.2 rounds to 40)
 */
export function roundPercentage(value: number, percentage: number): number {
  return Math.round(value * percentage)
}

/**
 * Calculate fare with rounding
 * 
 * @param baseFare - Base fare
 * @param distanceFare - Distance-based fare
 * @param timeFare - Time-based fare (optional)
 * @param multiplier - Surge multiplier (optional, default 1.0)
 * @returns Rounded total fare
 * 
 * @example
 * calculateFare(35, 45.5, 10.2) // 91 (35 + 45.5 + 10.2 = 90.7 rounds to 91)
 * calculateFare(35, 45.5, 10.2, 1.5) // 136 (90.7 * 1.5 = 136.05 rounds to 136)
 */
export function calculateFare(
  baseFare: number,
  distanceFare: number,
  timeFare: number = 0,
  multiplier: number = 1.0
): number {
  const subtotal = baseFare + distanceFare + timeFare
  return Math.round(subtotal * multiplier)
}

/**
 * Calculate commission and round
 * 
 * @param totalFare - Total fare amount
 * @param commissionRate - Commission rate (e.g., 0.2 for 20%)
 * @returns Rounded commission amount
 * 
 * @example
 * calculateCommission(200, 0.2) // 40
 * calculateCommission(199, 0.2) // 40 (39.8 rounds to 40)
 * calculateCommission(201, 0.2) // 40 (40.2 rounds to 40)
 */
export function calculateCommission(totalFare: number, commissionRate: number): number {
  return Math.round(totalFare * commissionRate)
}

/**
 * Calculate provider earnings (total fare - commission)
 * 
 * @param totalFare - Total fare amount
 * @param commission - Commission amount (already rounded)
 * @returns Provider earnings
 * 
 * @example
 * calculateProviderEarnings(200, 40) // 160
 */
export function calculateProviderEarnings(totalFare: number, commission: number): number {
  return totalFare - commission
}

/**
 * Calculate discount amount and round
 * 
 * @param totalFare - Total fare amount
 * @param discountType - 'fixed' or 'percentage'
 * @param discountValue - Discount value (amount for fixed, percentage for percentage)
 * @param maxDiscount - Maximum discount cap (optional)
 * @returns Rounded discount amount
 * 
 * @example
 * calculateDiscount(200, 'fixed', 50) // 50
 * calculateDiscount(200, 'percentage', 20) // 40 (20% of 200)
 * calculateDiscount(200, 'percentage', 20, 30) // 30 (capped at 30)
 */
export function calculateDiscount(
  totalFare: number,
  discountType: 'fixed' | 'percentage',
  discountValue: number,
  maxDiscount?: number
): number {
  let discount = 0
  
  if (discountType === 'fixed') {
    discount = discountValue
  } else if (discountType === 'percentage') {
    discount = Math.round(totalFare * (discountValue / 100))
    
    // Apply max discount cap
    if (maxDiscount !== undefined) {
      discount = Math.min(discount, maxDiscount)
    }
  }
  
  // Discount cannot exceed total fare
  return Math.min(discount, totalFare)
}

/**
 * Calculate platform revenue (commission - discount)
 * 
 * @param commission - Commission amount
 * @param discount - Discount amount
 * @returns Platform net revenue (can be negative)
 * 
 * @example
 * calculatePlatformRevenue(40, 50) // -10 (platform bears the cost)
 * calculatePlatformRevenue(40, 20) // 20
 */
export function calculatePlatformRevenue(commission: number, discount: number): number {
  return commission - discount
}

/**
 * Format currency for display (integer only, no decimals)
 * 
 * @param amount - Amount to format
 * @param showCurrency - Whether to show currency symbol (default true)
 * @returns Formatted string
 * 
 * @example
 * formatCurrency(160) // '฿160'
 * formatCurrency(1234) // '฿1,234'
 * formatCurrency(160, false) // '160'
 */
export function formatCurrency(amount: number, showCurrency: boolean = true): string {
  const rounded = Math.round(amount)
  const formatted = rounded.toLocaleString('th-TH')
  return showCurrency ? `฿${formatted}` : formatted
}

/**
 * Ensure amount is non-negative integer
 * 
 * @param amount - Amount to validate
 * @returns Non-negative rounded integer
 * 
 * @example
 * ensureNonNegative(-10) // 0
 * ensureNonNegative(10.5) // 11
 */
export function ensureNonNegative(amount: number): number {
  return Math.max(0, Math.round(amount))
}
