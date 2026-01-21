/**
 * User Management Types
 */

export interface Customer {
  id: string
  member_uid: string
  email?: string
  phone_number?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  verification_status: 'pending' | 'verified' | 'rejected'
  created_at: string
  last_active?: string
  total_rides: number
  total_spent: number
  wallet_balance: number
  loyalty_points: number
  tags?: CustomerTag[]
  // Suspension fields
  is_active?: boolean
  suspended_at?: string
  suspended_reason?: string
  suspended_by?: string
}

export interface CustomerTag {
  id: string
  name: string
  name_th: string
  color: string
  bg_color: string
  icon?: string
}

export interface CustomerNote {
  id: string
  user_id: string
  admin_id: string
  admin_name?: string
  note: string
  is_pinned: boolean
  is_important: boolean
  created_at: string
}

export type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'active'
export type ProviderType = 'driver' | 'rider' | 'shopper' | 'mover' | 'laundry'

export interface Provider {
  id: string
  user_id: string
  provider_uid: string
  provider_type: ProviderType
  status: ProviderStatus
  first_name?: string
  last_name?: string
  phone_number?: string
  email?: string
  avatar_url?: string
  vehicle_type?: string
  vehicle_plate?: string
  is_online: boolean
  is_verified: boolean
  rating: number
  total_trips: number
  total_earnings: number
  created_at: string
  approved_at?: string
  documents?: ProviderDocument[]
}

export interface ProviderDocument {
  id: string
  provider_id: string
  document_type: 'id_card' | 'driving_license' | 'vehicle_registration' | 'insurance' | 'profile_photo'
  document_url: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string
  uploaded_at: string
  reviewed_at?: string
}

export interface UserFilters {
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
