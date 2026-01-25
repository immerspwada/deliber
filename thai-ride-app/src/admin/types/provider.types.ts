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
  provider_uid: string
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  provider_type: 'ride' | 'delivery' | 'shopping' | 'all'
  status: ProviderStatus
  service_types: ProviderServiceType[]
  commission_type: CommissionType | null
  commission_value: number | null
  commission_notes: string | null
  commission_updated_at: string | null
  commission_updated_by: string | null
  rating: number | null
  total_trips: number
  total_earnings: number
  wallet_balance: number
  is_online: boolean
  is_available: boolean
  current_lat: number | null
  current_lng: number | null
  documents_verified: boolean
  verification_notes: string | null
  created_at: string
  updated_at: string | null
  approved_at: string | null
  approved_by: string | null
  last_active_at: string | null
}

export interface ProviderFilters {
  status?: ProviderStatus | ''
  provider_type?: ProviderServiceType | 'all' | ''
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
