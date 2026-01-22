/**
 * Financial Settings Types
 */

export interface FinancialSetting {
  id: string
  category: 'commission' | 'withdrawal' | 'topup' | 'surge' | 'subscription'
  key: string
  value: Record<string, any>
  description: string | null
  is_active: boolean
  updated_at: string
}

export interface CommissionRates {
  ride: number
  delivery: number
  shopping: number
  moving: number
  queue: number
  laundry: number
}

export interface WithdrawalSettings {
  min_amount: number
  max_amount: number
  daily_limit: number
  bank_transfer_fee: number
  promptpay_fee: number
  auto_approval_threshold: number
  max_pending: number
  processing_days: string
  min_account_age_days: number
  min_completed_trips: number
  min_rating: number
}

export interface TopupSettings {
  min_amount: number
  max_amount: number
  daily_limit: number
  credit_card_fee: number
  bank_transfer_fee: number
  promptpay_fee: number
  truemoney_fee: number
  auto_approval_threshold: number
  expiry_hours: number
  require_slip_threshold: number
}

export interface SettingsAuditLog {
  id: string
  category: string
  key: string
  old_value: Record<string, any> | null
  new_value: Record<string, any>
  change_reason: string | null
  changed_by_email: string
  changed_by_name: string
  created_at: string
}

export interface CommissionImpact {
  current_rate: number
  new_rate: number
  rate_change: number
  estimated_monthly_impact: number
  affected_providers: number
}
