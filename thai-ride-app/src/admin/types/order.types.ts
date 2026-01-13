/**
 * Order Management Types
 */

export type ServiceType = 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'

export type OrderStatus = 
  | 'pending'
  | 'matched'
  | 'accepted'
  | 'picking_up'
  | 'in_progress'
  | 'arrived'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export interface Order {
  id: string
  tracking_id: string
  service_type: ServiceType
  status: OrderStatus
  priority?: 'normal' | 'urgent' | 'high_value' | 'scheduled'
  customer_id: string
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  provider_id?: string
  provider_name?: string
  provider_phone?: string
  provider_rating?: number
  
  // Location
  pickup_address?: string
  pickup_lat?: number
  pickup_lng?: number
  dropoff_address?: string
  dropoff_lat?: number
  dropoff_lng?: number
  
  // Pricing
  base_fare: number
  distance_fare?: number
  surge_multiplier?: number
  estimated_amount?: number
  final_amount?: number
  promo_discount?: number
  promo_code?: string
  tip_amount?: number
  total_amount: number
  payment_method: 'cash' | 'wallet' | 'card'
  payment_status: 'pending' | 'paid' | 'refunded'
  
  // Additional Info
  distance_km?: number
  duration_minutes?: number
  special_notes?: string
  
  // Timestamps
  created_at: string
  matched_at?: string
  started_at?: string
  completed_at?: string
  cancelled_at?: string
  last_updated?: string
  
  // Cancellation
  cancelled_by?: 'customer' | 'provider' | 'admin' | 'system'
  cancel_reason?: string
  
  // Rating & Feedback
  customer_rating?: number
  provider_rating?: number
  rating?: number
  customer_review?: string
  provider_review?: string
  feedback?: string
  
  // Notes
  customer_notes?: string
  admin_notes?: string
}

export interface OrderFilters {
  search?: string
  service_type?: ServiceType
  status?: OrderStatus
  payment_status?: string
  date_from?: string
  date_to?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface OrderStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  total_revenue: number
}

export interface OrderTimeline {
  status: OrderStatus
  timestamp: string
  actor?: string
  note?: string
}
