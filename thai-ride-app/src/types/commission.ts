/**
 * Commission Types
 * ================
 * Types สำหรับระบบคอมมิชชั่น Provider
 */

export type CommissionType = 'percentage' | 'fixed'

export interface ProviderCommission {
  commission_type: CommissionType
  commission_value: number
  commission_notes?: string | null
  commission_updated_at?: string | null
  commission_updated_by?: string | null
}

export interface CommissionCalculation {
  fareAmount: number
  commissionAmount: number
  providerEarnings: number
  commissionType: CommissionType
  commissionValue: number
}

export interface UpdateCommissionParams {
  p_provider_id: string
  p_commission_type: CommissionType
  p_commission_value: number
  p_commission_notes?: string | null
}

export interface UpdateCommissionResponse {
  success: boolean
  provider_id: string
  commission_type: CommissionType
  commission_value: number
  updated_at: string
}

/**
 * คำนวณค่าคอมมิชชั่น
 */
export function calculateCommission(
  fareAmount: number,
  commissionType: CommissionType,
  commissionValue: number
): CommissionCalculation {
  let commissionAmount = 0

  if (commissionType === 'percentage') {
    commissionAmount = fareAmount * (commissionValue / 100)
  } else {
    commissionAmount = commissionValue
  }

  const providerEarnings = fareAmount - commissionAmount

  return {
    fareAmount,
    commissionAmount,
    providerEarnings,
    commissionType,
    commissionValue
  }
}

/**
 * Format commission display
 */
export function formatCommissionDisplay(
  commissionType: CommissionType,
  commissionValue: number
): string {
  if (commissionType === 'percentage') {
    return `${commissionValue}%`
  }
  return `${commissionValue.toLocaleString()} บาท`
}

/**
 * Validate commission value
 */
export function validateCommissionValue(
  commissionType: CommissionType,
  commissionValue: number
): { valid: boolean; error?: string } {
  if (commissionValue < 0) {
    return { valid: false, error: 'ค่าคอมมิชชั่นต้องไม่ต่ำกว่า 0' }
  }

  if (commissionType === 'percentage' && commissionValue > 100) {
    return { valid: false, error: 'เปอร์เซ็นต์ต้องไม่เกิน 100%' }
  }

  if (commissionType === 'fixed' && commissionValue > 999999) {
    return { valid: false, error: 'จำนวนเงินสูงเกินไป' }
  }

  return { valid: true }
}

/**
 * Default commission rates by service type
 */
export const DEFAULT_COMMISSION_RATES = {
  ride: 20, // 20%
  delivery: 25, // 25%
  shopping: 15, // 15%
  moving: 18, // 18%
} as const
