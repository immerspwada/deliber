/**
 * Provider System V2 - Type Definitions
 * MUNEEF Design System Compliant
 * Thai Ride App - Provider Types
 */

export interface Provider {
  id: string
  user_id: string
  provider_uid: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  profile_image_url?: string
  
  // Service Configuration
  service_types: ServiceType[]
  primary_service: ServiceType
  
  // Status & Verification
  status: ProviderStatus
  verification_status: VerificationStatus
  is_online: boolean
  is_available: boolean
  
  // Performance Metrics
  rating: number
  total_jobs: number
  total_earnings: number
  completion_rate: number
  acceptance_rate: number
  cancellation_rate: number
  
  // Location
  current_location?: {
    lat: number
    lng: number
    address?: string
    updated_at: string
  }
  
  // Timestamps
  created_at: string
  updated_at: string
  last_active_at?: string
}

export type ServiceType = 
  | 'ride' 
  | 'delivery' 
  | 'shopping' 
  | 'moving' 
  | 'laundry'

export type ProviderStatus = 
  | 'pending'           // รอการอนุมัติ
  | 'approved'          // อนุมัติแล้ว
  | 'active'            // ใช้งานได้
  | 'suspended'         // ถูกระงับ
  | 'rejected'          // ถูกปฏิเสธ
  | 'inactive'          // ไม่ใช้งาน

export type VerificationStatus = 
  | 'pending'           // รอตรวจสอบ
  | 'documents_required' // ต้องอัพโหลดเอกสาร
  | 'under_review'      // กำลังตรวจสอบ
  | 'verified'          // ตรวจสอบแล้ว
  | 'rejected'          // เอกสารไม่ผ่าน

export interface Job {
  id: string
  service_type: ServiceType
  status: JobStatus
  
  // Customer Information
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_rating?: number
  
  // Location Details
  pickup_location: Location
  pickup_address: string
  pickup_instructions?: string
  
  dropoff_location?: Location
  dropoff_address?: string
  dropoff_instructions?: string
  
  // Job Details
  estimated_earnings: number
  estimated_duration: number
  estimated_distance: number
  
  // Service Specific Data
  service_data?: RideData | DeliveryData | ShoppingData | MovingData | LaundryData
  
  // Timestamps
  created_at: string
  scheduled_at?: string
  accepted_at?: string
  started_at?: string
  completed_at?: string
}

export type JobStatus = 
  | 'pending'           // รอรับงาน
  | 'accepted'          // รับงานแล้ว
  | 'arriving'          // กำลังไป
  | 'arrived'           // ถึงแล้ว
  | 'picked_up'         // รับแล้ว
  | 'in_progress'       // กำลังดำเนินการ
  | 'completed'         // เสร็จสิ้น
  | 'cancelled'         // ยกเลิก

export interface Location {
  lat: number
  lng: number
}

// Service-specific data types
export interface RideData {
  passenger_count: number
  ride_type: 'standard' | 'premium' | 'shared'
  vehicle_requirements?: string[]
}

export interface DeliveryData {
  package_type: string
  package_size: 'small' | 'medium' | 'large'
  package_weight?: number
  special_instructions?: string
  requires_signature: boolean
}

export interface ShoppingData {
  store_name: string
  store_location: Location
  shopping_list: ShoppingItem[]
  budget_limit: number
  payment_method: 'cash' | 'card' | 'wallet'
}

export interface ShoppingItem {
  name: string
  quantity: number
  estimated_price?: number
  notes?: string
}

export interface MovingData {
  items: MovingItem[]
  floors_pickup: number
  floors_dropoff: number
  requires_helpers: number
  estimated_hours: number
}

export interface MovingItem {
  name: string
  quantity: number
  size: 'small' | 'medium' | 'large'
  weight_category: 'light' | 'medium' | 'heavy'
}

export interface LaundryData {
  service_type: 'wash_fold' | 'dry_clean' | 'iron_only'
  estimated_weight: number
  special_instructions?: string
  pickup_time_preference: string
  delivery_time_preference: string
}

export interface Earnings {
  today: number
  this_week: number
  this_month: number
  total: number
  
  // Trip counts
  today_jobs: number
  week_jobs: number
  month_jobs: number
  total_jobs: number
  
  // Performance
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
  
  // Time metrics
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

// API Response Types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  success: boolean
  timestamp: string
}

// Form Types
export interface ProviderRegistrationForm {
  first_name: string
  last_name: string
  email: string
  phone_number: string
  service_types: ServiceType[]
  primary_service: ServiceType
  terms_accepted: boolean
  privacy_accepted: boolean
}

export interface DocumentUploadForm {
  id_card_front: File | null
  id_card_back: File | null
  driver_license?: File | null
  vehicle_registration?: File | null
  bank_account_book: File | null
  profile_photo: File | null
}

// Error Types
export interface ProviderError {
  code: string
  message: string
  field?: string
  details?: Record<string, unknown>
}