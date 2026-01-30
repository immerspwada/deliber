/**
 * Enhanced Ride Requests Types - Production Ready
 * Aligned with database schema and Provider Job Detail flow
 */
import { z } from 'zod'

// =====================================================
// DATABASE TYPES (Aligned with Supabase Schema)
// =====================================================

export interface RideRequestRow {
  id: string
  user_id: string
  provider_id: string | null
  status: RideStatus
  ride_type: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  destination_address: string
  destination_lat: number
  destination_lng: number
  estimated_fare: number
  final_fare: number | null
  notes: string | null
  created_at: string
  updated_at: string
  accepted_at: string | null
  arrived_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  cancelled_by: 'customer' | 'provider' | 'system' | null
  passenger_count: number
  payment_method: string
  promo_code: string | null
  promo_discount: number | null
  pickup_photo: string | null
  dropoff_photo: string | null
}

export interface UserProfile {
  id: string
  name: string | null
  phone: string | null
  avatar_url: string | null
}

// =====================================================
// RIDE STATUS ENUM
// =====================================================

export type RideStatus = 
  | 'pending'
  | 'matched'
  | 'confirmed'  // Queue booking status
  | 'pickup'     // Ride: arrived at pickup
  | 'shopping'   // Shopping: shopping at store
  | 'in_progress' // Ride: customer in vehicle
  | 'delivering'  // Shopping: delivering items
  | 'completed'
  | 'cancelled'

// =====================================================
// PROVIDER JOB DETAIL TYPES
// =====================================================

export interface JobDetail {
  id: string
  type: 'ride' | 'delivery' | 'shopping' | 'queue'
  status: RideStatus
  service_type: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  dropoff_address: string
  dropoff_lat: number
  dropoff_lng: number
  fare: number  // Provider earnings (what they actually get)
  notes?: string
  created_at: string
  pickup_photo?: string | null
  dropoff_photo?: string | null
  customer: CustomerInfo | null
  // Promo & Pricing
  estimated_fare: number
  final_fare: number | null
  provider_earnings?: number | null  // What provider actually receives
  platform_commission?: number | null  // Platform's commission
  commission_rate?: number | null  // Commission rate (e.g., 0.2 = 20%)
  promo_code?: string | null
  promo_discount?: number | null
  // Tip
  tip_amount?: number | null
  tip_message?: string | null
  // Queue-specific fields
  tracking_id?: string | null
  scheduled_date?: string | null
  scheduled_time?: string | null
  service_name?: string | null
  location_name?: string | null
  // Shopping-specific fields
  store_name?: string | null
  items?: any | null
  items_cost?: number | null
  budget_limit?: number | null
  matched_at?: string | null
  reference_images?: readonly string[] | null
  item_list?: string | null
}

export interface CustomerInfo {
  id: string
  name: string
  phone: string
  avatar_url?: string
}

export interface StatusStep {
  key: RideStatus
  label: string
  icon: string
  action?: string
}

// =====================================================
// ZOD VALIDATION SCHEMAS
// =====================================================

export const JobIdSchema = z.string().uuid('Invalid job ID format')

export const RideStatusSchema = z.enum([
  'pending',
  'matched', 
  'pickup',
  'in_progress',
  'completed',
  'cancelled'
])

export const CancelReasonSchema = z.string()
  .max(500, 'เหตุผลยาวเกินไป (สูงสุด 500 ตัวอักษร)')
  .optional()

export const UpdateStatusSchema = z.object({
  jobId: JobIdSchema,
  status: RideStatusSchema,
  notes: z.string().max(500).optional()
})

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface LoadJobResponse {
  success: boolean
  data?: JobDetail
  error?: string
}

export interface UpdateStatusResponse {
  success: boolean
  newStatus?: RideStatus
  error?: string
}

export interface CancelJobResponse {
  success: boolean
  error?: string
}

// =====================================================
// CONSTANTS
// =====================================================

export const STATUS_FLOW: StatusStep[] = [
  { key: 'matched', label: 'รับงานแล้ว', icon: '✅', action: 'กำลังไปรับ' },
  { key: 'confirmed', label: 'รับงานแล้ว', icon: '✅', action: 'กำลังไปรับ' }, // Queue booking status
  { key: 'pickup', label: 'ถึงจุดรับแล้ว', icon: '📍', action: 'ถึงจุดรับแล้ว' }, // Ride
  { key: 'shopping', label: 'กำลังซื้อของ', icon: '🛒', action: 'กำลังซื้อของ' }, // Shopping
  { key: 'in_progress', label: 'กำลังเดินทาง', icon: '🛣️', action: 'รับลูกค้าแล้ว' }, // Ride
  { key: 'delivering', label: 'กำลังส่งของ', icon: '🚚', action: 'กำลังส่งของ' }, // Shopping
  { key: 'completed', label: 'เสร็จสิ้น', icon: '🎉', action: 'ส่งลูกค้าสำเร็จ' }
] as const

// =====================================================
// TYPE GUARDS
// =====================================================

export function isValidRideStatus(status: string): status is RideStatus {
  return ['pending', 'matched', 'confirmed', 'pickup', 'in_progress', 'completed', 'cancelled'].includes(status)
}

export function isJobDetail(obj: unknown): obj is JobDetail {
  return typeof obj === 'object' && 
         obj !== null && 
         'id' in obj && 
         'status' in obj &&
         typeof (obj as any).id === 'string'
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export function getStatusIndex(status: RideStatus): number {
  return STATUS_FLOW.findIndex(s => s.key === status)
}

export function getNextStatus(currentStatus: RideStatus): StatusStep | null {
  // Shopping flow: matched → shopping → delivering → completed
  if (currentStatus === 'matched') {
    // Could be ride (→ pickup) or shopping (→ shopping)
    // Return shopping as default, caller should handle job type
    return STATUS_FLOW.find(s => s.key === 'shopping') || STATUS_FLOW.find(s => s.key === 'pickup') || null
  }
  if (currentStatus === 'shopping') {
    return STATUS_FLOW.find(s => s.key === 'delivering') || null
  }
  if (currentStatus === 'delivering') {
    return STATUS_FLOW.find(s => s.key === 'completed') || null
  }
  
  // Ride flow: matched → pickup → in_progress → completed
  if (currentStatus === 'pickup') {
    return STATUS_FLOW.find(s => s.key === 'in_progress') || null
  }
  if (currentStatus === 'in_progress') {
    return STATUS_FLOW.find(s => s.key === 'completed') || null
  }
  
  // Queue flow: confirmed → completed
  if (currentStatus === 'confirmed') {
    return STATUS_FLOW.find(s => s.key === 'completed') || null
  }
  
  return null
}

export function canUpdateStatus(status: RideStatus): boolean {
  return getNextStatus(status) !== null
}

export function isCompleted(status: RideStatus): boolean {
  return status === 'completed'
}

export function isCancelled(status: RideStatus): boolean {
  return status === 'cancelled'
}