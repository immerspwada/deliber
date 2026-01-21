/**
 * Tip System Types
 * 
 * Role Impact:
 * - Customer: Give tips after ride completion
 * - Provider: View received tips
 * - Admin: View tip analytics
 */

export interface Tip {
  id: string
  ride_id: string
  customer_id: string
  provider_id: string
  amount: number
  message?: string | null
  payment_method: 'wallet' | 'cash'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
  processed_at?: string | null
}

export interface TipWithDetails extends Tip {
  customer?: {
    name: string
    avatar_url?: string | null
  }
  pickup_address?: string
  destination_address?: string
}

export interface GiveTipRequest {
  ride_id: string
  amount: number
  message?: string
}

export interface GiveTipResponse {
  success: boolean
  tip_id?: string
  amount?: number
  message?: string
  error?: string
}

export interface CanGiveTipResponse {
  can_tip: boolean
  reason?: string
  ride_id?: string
  provider_id?: string
  wallet_balance?: number
  completed_at?: string
  expires_at?: string
  tip_amount?: number
}

export interface ProviderTipsResponse {
  success: boolean
  tips: TipWithDetails[]
  total_tips: number
  tip_count: number
  error?: string
}

export interface TipAnalyticsSummary {
  total_tips: number
  tip_count: number
  avg_tip: number
  max_tip: number
  min_tip: number
  unique_customers: number
  unique_providers: number
}

export interface DailyTipStats {
  day: string
  count: number
  total: number
  avg: number
}

export interface TopProviderTips {
  provider_id: string
  provider_name: string
  tip_count: number
  total_tips: number
  avg_tip: number
}

export interface TipAnalyticsResponse {
  success: boolean
  period: {
    start: string
    end: string
  }
  summary: TipAnalyticsSummary
  daily_stats: DailyTipStats[]
  top_providers: TopProviderTips[]
  error?: string
}

// Preset tip amounts (THB)
export const TIP_PRESETS = [20, 50, 100, 200] as const
export type TipPreset = typeof TIP_PRESETS[number]

// Max tip amount
export const MAX_TIP_AMOUNT = 10000

// Tip window (hours after completion)
export const TIP_WINDOW_HOURS = 24
