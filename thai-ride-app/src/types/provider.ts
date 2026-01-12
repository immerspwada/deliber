/**
 * Provider System V2 - Type Definitions
 * Aligned with providers_v2 database schema
 */

export interface Provider {
  id: string
  user_id: string
  provider_uid?: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  profile_image_url?: string
  
  // Service Configuration
  service_types: ServiceType[]
  primary_service?: ServiceType // Optional - may not exist in DB
  
  // Status
  status: ProviderStatus
  verification_status?: VerificationStatus // Optional
  is_online: boolean
  is_available?: boolean // Optional - may not exist in DB
  
  // Performance Metrics (from DB)
  rating: number
  total_trips?: number // DB column name
  total_jobs?: number  // Alias for total_trips
  total_earnings: number
  completion_rate?: number
  acceptance_rate?: number
  cancellation_rate?: number
  
  // Location
  current_location?: unknown // GEOGRAPHY type from PostGIS
  
  // Timestamps
  created_at: string
  updated_at: string
  approved_at?: string
  suspended_at?: string
  suspension_reason?: string
  last_active_at?: string
  
  // Registration fields (from migration 239)
  vehicle_type?: string
  vehicle_plate?: string
  vehicle_color?: string
  vehicle_info?: Record<string, unknown>
  license_number?: string
  license_expiry?: string
  national_id?: string
  documents?: Record<string, unknown>
  provider_type?: string
  allowed_services?: string[]
}

export type ServiceType = 
  | 'ride' 
  | 'delivery' 
  | 'shopping' 
  | 'moving' 
  | 'laundry'

export type ProviderStatus = 
  | 'pending'
  | 'pending_verification'
  | 'approved'
  | 'active'
  | 'suspended'
  | 'rejected'
  | 'inactive'

export type VerificationStatus = 
  | 'pending'
  | 'documents_required'
  | 'under_review'
  | 'verified'
  | 'rejected'

export interface Job {
  id: string
  service_type: ServiceType
  status: JobStatus
  customer_id?: string
  customer_name?: string
  customer_phone?: string
  customer_rating?: number
  pickup_location?: Location
  pickup_address?: string
  pickup_instructions?: string
  dropoff_location?: Location
  dropoff_address?: string
  dropoff_instructions?: string
  estimated_earnings?: number
  estimated_duration?: number
  estimated_distance?: number
  service_data?: Record<string, unknown>
  created_at: string
  scheduled_at?: string
  accepted_at?: string
  started_at?: string
  completed_at?: string
  cancelled_at?: string
  provider_id?: string
}

export type JobStatus = 
  | 'pending'
  | 'accepted'
  | 'arriving'
  | 'arrived'
  | 'picked_up'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface Location {
  lat: number
  lng: number
}

export interface Earnings {
  today: number
  this_week: number
  this_month: number
  total: number
  today_jobs: number
  week_jobs: number
  month_jobs: number
  total_jobs: number
  average_per_job: number
  peak_hours_earnings: number
  off_peak_earnings: number
}

export interface PerformanceMetrics {
  rating: number
  total_ratings: number
  acceptance_rate: number
  completion_rate: number
  cancellation_rate: number
  on_time_rate: number
  average_response_time: number
  average_job_duration: number
  online_hours_today: number
  online_hours_week: number
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
  is_read: boolean
  created_at: string
  expires_at?: string
  provider_id?: string
}

export type NotificationType = 
  | 'job_available'
  | 'job_accepted'
  | 'job_cancelled'
  | 'earnings_update'
  | 'rating_received'
  | 'system_announcement'
  | 'document_required'
  | 'verification_update'

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  timestamp: string
}
