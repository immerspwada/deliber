/**
 * Provider Types
 * Centralized type definitions for provider management
 */

export type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ProviderServiceType = 'ride' | 'delivery' | 'shopping' | 'moving'
export type ProviderActionType = 'approve' | 'reject' | 'suspend'
export type CommissionType = 'percentage' | 'fixed'

export interface Provider {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  status: ProviderStatus
  service_types: ProviderServiceType[]
  commission_type: CommissionType
  commission_value: number
  rating: number | null
  total_trips: number
  total_earnings: number
  wallet_balance: number
  is_online: boolean
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface ProviderFilters {
  status?: ProviderStatus
  provider_type?: ProviderServiceType
  search?: string
  limit?: number
  offset?: number
}

export interface ProviderStats {
  pending: number
  approved: number
  rejected: number
  suspended: number
  online: number
  total: number
}

export interface ProviderAction {
  type: ProviderActionType
  providerId: string
  reason: string
  performedBy: string
  performedAt: string
}
