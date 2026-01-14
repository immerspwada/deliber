export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          event_category: string
          event_name: string
          id: string
          os: string | null
          page_name: string | null
          page_url: string | null
          properties: Json | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          event_category: string
          event_name: string
          id?: string
          os?: string | null
          page_name?: string | null
          page_url?: string | null
          properties?: Json | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          event_category?: string
          event_name?: string
          id?: string
          os?: string | null
          page_name?: string | null
          page_url?: string | null
          properties?: Json | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      job_assignment_queue: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          distance_km: number | null
          id: string
          job_id: string
          job_type: string
          max_attempts: number | null
          offered_at: string | null
          priority_score: number | null
          provider_acceptance_rate: number | null
          provider_id: string | null
          provider_rating: number | null
          queue_position: number | null
          responded_at: string | null
          response_deadline: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          distance_km?: number | null
          id?: string
          job_id: string
          job_type: string
          max_attempts?: number | null
          offered_at?: string | null
          priority_score?: number | null
          provider_acceptance_rate?: number | null
          provider_id?: string | null
          provider_rating?: number | null
          queue_position?: number | null
          responded_at?: string | null
          response_deadline?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          distance_km?: number | null
          id?: string
          job_id?: string
          job_type?: string
          max_attempts?: number | null
          offered_at?: string | null
          priority_score?: number | null
          provider_acceptance_rate?: number | null
          provider_id?: string | null
          provider_rating?: number | null
          queue_position?: number | null
          responded_at?: string | null
          response_deadline?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      job_reassignment_log: {
        Row: {
          id: string
          job_id: string
          job_type: string
          new_provider_id: string | null
          previous_provider_id: string | null
          previous_status: string | null
          reassign_notes: string | null
          reassign_reason: string | null
          reassigned_at: string | null
          reassigned_by: string | null
        }
        Insert: {
          id?: string
          job_id: string
          job_type: string
          new_provider_id?: string | null
          previous_provider_id?: string | null
          previous_status?: string | null
          reassign_notes?: string | null
          reassign_reason?: string | null
          reassigned_at?: string | null
          reassigned_by?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          job_type?: string
          new_provider_id?: string | null
          previous_provider_id?: string | null
          previous_status?: string | null
          reassign_notes?: string | null
          reassign_reason?: string | null
          reassigned_at?: string | null
          reassigned_by?: string | null
        }
        Relationships: []
      }
      provider_auto_accept_rules: {
        Row: {
          active_days: number[] | null
          active_hours: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          max_distance_km: number | null
          min_fare: number | null
          provider_id: string
          service_types: string[] | null
          updated_at: string | null
        }
        Insert: {
          active_days?: number[] | null
          active_hours?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_distance_km?: number | null
          min_fare?: number | null
          provider_id: string
          service_types?: string[] | null
          updated_at?: string | null
        }
        Update: {
          active_days?: number[] | null
          active_hours?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_distance_km?: number | null
          min_fare?: number | null
          provider_id?: string
          service_types?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      provider_performance_metrics: {
        Row: {
          acceptance_rate: number | null
          avg_earnings_per_job: number | null
          avg_rating: number | null
          avg_response_time_seconds: number | null
          cancellation_rate: number | null
          completion_rate: number | null
          created_at: string | null
          id: string
          jobs_accepted: number | null
          jobs_cancelled: number | null
          jobs_completed: number | null
          jobs_expired: number | null
          jobs_offered: number | null
          jobs_rejected: number | null
          max_response_time_seconds: number | null
          metric_date: string
          min_response_time_seconds: number | null
          online_minutes: number | null
          provider_id: string
          rating_count: number | null
          total_earnings: number | null
          updated_at: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          avg_earnings_per_job?: number | null
          avg_rating?: number | null
          avg_response_time_seconds?: number | null
          cancellation_rate?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          jobs_accepted?: number | null
          jobs_cancelled?: number | null
          jobs_completed?: number | null
          jobs_expired?: number | null
          jobs_offered?: number | null
          jobs_rejected?: number | null
          max_response_time_seconds?: number | null
          metric_date: string
          min_response_time_seconds?: number | null
          online_minutes?: number | null
          provider_id: string
          rating_count?: number | null
          total_earnings?: number | null
          updated_at?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          avg_earnings_per_job?: number | null
          avg_rating?: number | null
          avg_response_time_seconds?: number | null
          cancellation_rate?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          jobs_accepted?: number | null
          jobs_cancelled?: number | null
          jobs_completed?: number | null
          jobs_expired?: number | null
          jobs_offered?: number | null
          jobs_rejected?: number | null
          max_response_time_seconds?: number | null
          metric_date?: string
          min_response_time_seconds?: number | null
          online_minutes?: number | null
          provider_id?: string
          rating_count?: number | null
          total_earnings?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      providers_v2: {
        Row: {
          approved_at: string | null
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          documents: Json | null
          email: string
          first_name: string
          id: string
          is_available: boolean | null
          is_online: boolean | null
          last_name: string
          license_expiry: string | null
          license_number: string | null
          national_id: string | null
          phone_number: string
          provider_type: string | null
          provider_uid: string | null
          rating: number | null
          service_types: Database["public"]["Enums"]["service_type"][]
          status: Database["public"]["Enums"]["provider_status"]
          suspended_at: string | null
          suspension_reason: string | null
          total_earnings: number | null
          total_trips: number | null
          updated_at: string | null
          user_id: string
          vehicle_color: string | null
          vehicle_info: Json | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          documents?: Json | null
          email: string
          first_name: string
          id?: string
          is_available?: boolean | null
          is_online?: boolean | null
          last_name: string
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          phone_number: string
          provider_type?: string | null
          provider_uid?: string | null
          rating?: number | null
          service_types?: Database["public"]["Enums"]["service_type"][]
          status?: Database["public"]["Enums"]["provider_status"]
          suspended_at?: string | null
          suspension_reason?: string | null
          total_earnings?: number | null
          total_trips?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_color?: string | null
          vehicle_info?: Json | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          documents?: Json | null
          email?: string
          first_name?: string
          id?: string
          is_available?: boolean | null
          is_online?: boolean | null
          last_name?: string
          license_expiry?: string | null
          license_number?: string | null
          national_id?: string | null
          phone_number?: string
          provider_type?: string | null
          provider_uid?: string | null
          rating?: number | null
          service_types?: Database["public"]["Enums"]["service_type"][]
          status?: Database["public"]["Enums"]["provider_status"]
          suspended_at?: string | null
          suspension_reason?: string | null
          total_earnings?: number | null
          total_trips?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_color?: string | null
          vehicle_info?: Json | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      ride_requests: {
        Row: {
          accepted_at: string | null
          actual_fare: number | null
          arrived_at: string | null
          cancel_reason: string | null
          cancellation_fee: number | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          estimated_fare: number | null
          final_fare: number | null
          id: string
          notes: string | null
          paid_amount: number | null
          passenger_count: number | null
          payment_method: string | null
          payment_status: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee: number | null
          promo_code: string | null
          promo_code_id: string | null
          promo_discount_amount: number | null
          provider_earnings: number | null
          provider_id: string | null
          rated_at: string | null
          refund_amount: number | null
          refund_status: string | null
          refunded_at: string | null
          ride_type: string | null
          scheduled_time: string | null
          special_requests: string | null
          started_at: string | null
          status: string | null
          tracking_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          actual_fare?: number | null
          arrived_at?: string | null
          cancel_reason?: string | null
          cancellation_fee?: number | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          estimated_fare?: number | null
          final_fare?: number | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          passenger_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee?: number | null
          promo_code?: string | null
          promo_code_id?: string | null
          promo_discount_amount?: number | null
          provider_earnings?: number | null
          provider_id?: string | null
          rated_at?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          refunded_at?: string | null
          ride_type?: string | null
          scheduled_time?: string | null
          special_requests?: string | null
          started_at?: string | null
          status?: string | null
          tracking_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          actual_fare?: number | null
          arrived_at?: string | null
          cancel_reason?: string | null
          cancellation_fee?: number | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          destination_address?: string
          destination_lat?: number
          destination_lng?: number
          estimated_fare?: number | null
          final_fare?: number | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          passenger_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          platform_fee?: number | null
          promo_code?: string | null
          promo_code_id?: string | null
          promo_discount_amount?: number | null
          provider_earnings?: number | null
          provider_id?: string | null
          rated_at?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          refunded_at?: string | null
          ride_type?: string | null
          scheduled_time?: string | null
          special_requests?: string | null
          started_at?: string | null
          status?: string | null
          tracking_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          email_verified: boolean | null
          email_verified_at: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_also_provider: boolean | null
          last_name: string | null
          member_uid: string | null
          name: string | null
          national_id: string | null
          phone: string | null
          phone_number: string | null
          provider_types: string[] | null
          role: string
          updated_at: string | null
          verification_status: string | null
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_also_provider?: boolean | null
          last_name?: string | null
          member_uid?: string | null
          name?: string | null
          national_id?: string | null
          phone?: string | null
          phone_number?: string | null
          provider_types?: string[] | null
          role: string
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          email_verified?: boolean | null
          email_verified_at?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_also_provider?: boolean | null
          last_name?: string | null
          member_uid?: string | null
          name?: string | null
          national_id?: string | null
          phone?: string | null
          phone_number?: string | null
          provider_types?: string[] | null
          role?: string
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_user_provider_view: {
        Row: {
          application_count: number | null
          applied_at: string | null
          approved_at: string | null
          email: string | null
          first_name: string | null
          is_active_provider: boolean | null
          is_available: boolean | null
          is_customer: boolean | null
          is_provider: boolean | null
          is_verified: boolean | null
          last_name: string | null
          member_uid: string | null
          phone_number: string | null
          provider_id: string | null
          provider_rating: number | null
          provider_status: string | null
          provider_type: string | null
          provider_uid: string | null
          rejection_reason: string | null
          total_trips: number | null
          user_created_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_job_priority_score: {
        Args: {
          p_acceptance_rate: number
          p_distance_km: number
          p_fare?: number
          p_provider_rating: number
        }
        Returns: number
      }
      find_providers_for_job: {
        Args: {
          p_fare?: number
          p_job_type: string
          p_limit?: number
          p_pickup_lat: number
          p_pickup_lng: number
        }
        Returns: {
          acceptance_rate: number
          distance_km: number
          priority_score: number
          provider_id: string
          rating: number
        }[]
      }
      get_provider_performance_summary: {
        Args: { p_days?: number; p_provider_id: string }
        Returns: Json
      }
      process_expired_job_offers: { Args: Record<string, never>; Returns: number }
    }
    Enums: {
      provider_status:
        | 'pending'
        | 'pending_verification'
        | 'approved'
        | 'active'
        | 'suspended'
        | 'rejected'
      service_type: 'ride' | 'delivery' | 'shopping' | 'moving' | 'laundry'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Enum types
export type ProviderStatus = Database['public']['Enums']['provider_status']
export type ServiceType = Database['public']['Enums']['service_type']

// Table types
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row']
export type JobAssignmentQueue = Database['public']['Tables']['job_assignment_queue']['Row']
export type JobReassignmentLog = Database['public']['Tables']['job_reassignment_log']['Row']
export type ProviderAutoAcceptRule = Database['public']['Tables']['provider_auto_accept_rules']['Row']
export type ProviderPerformanceMetric = Database['public']['Tables']['provider_performance_metrics']['Row']
export type ProviderV2 = Database['public']['Tables']['providers_v2']['Row']
export type RideRequest = Database['public']['Tables']['ride_requests']['Row']
export type User = Database['public']['Tables']['users']['Row']

// Insert types
export type AnalyticsEventInsert = Database['public']['Tables']['analytics_events']['Insert']
export type JobAssignmentQueueInsert = Database['public']['Tables']['job_assignment_queue']['Insert']
export type ProviderAutoAcceptRuleInsert = Database['public']['Tables']['provider_auto_accept_rules']['Insert']
export type ProviderPerformanceMetricInsert = Database['public']['Tables']['provider_performance_metrics']['Insert']
export type ProviderV2Insert = Database['public']['Tables']['providers_v2']['Insert']
export type RideRequestInsert = Database['public']['Tables']['ride_requests']['Insert']
export type UserInsert = Database['public']['Tables']['users']['Insert']

// Update types
export type AnalyticsEventUpdate = Database['public']['Tables']['analytics_events']['Update']
export type JobAssignmentQueueUpdate = Database['public']['Tables']['job_assignment_queue']['Update']
export type ProviderAutoAcceptRuleUpdate = Database['public']['Tables']['provider_auto_accept_rules']['Update']
export type ProviderPerformanceMetricUpdate = Database['public']['Tables']['provider_performance_metrics']['Update']
export type ProviderV2Update = Database['public']['Tables']['providers_v2']['Update']
export type RideRequestUpdate = Database['public']['Tables']['ride_requests']['Update']
export type UserUpdate = Database['public']['Tables']['users']['Update']

// View types
export type AdminUserProviderView = Database['public']['Views']['admin_user_provider_view']['Row']

// Constants
export const PROVIDER_STATUS = ['pending', 'pending_verification', 'approved', 'active', 'suspended', 'rejected'] as const
export const SERVICE_TYPES = ['ride', 'delivery', 'shopping', 'moving', 'laundry'] as const

// Manual types for tables not in generated schema
export interface JobV2 {
  id: string
  job_uid: string | null
  service_type: ServiceType
  status: string
  customer_id: string
  provider_id: string | null
  pickup_address: string
  pickup_lat: number | null
  pickup_lng: number | null
  dropoff_address: string | null
  dropoff_lat: number | null
  dropoff_lng: number | null
  distance_km: number | null
  estimated_earnings: number | null
  final_earnings: number | null
  created_at: string | null
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
}

export interface EarningsV2 {
  id: string
  provider_id: string
  job_id: string | null
  job_type: ServiceType | null
  gross_earnings: number
  platform_fee: number | null
  net_earnings: number | null
  tip_amount: number | null
  earned_at: string | null
  created_at: string | null
}
