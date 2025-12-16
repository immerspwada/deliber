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
      app_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          ride_id: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          ride_id?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          ride_id?: string | null
          sender_id?: string
          sender_type?: string
        }
      }
      emergency_contacts: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string
          relationship: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone: string
          relationship?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string
          relationship?: string | null
          user_id?: string | null
        }
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_last4: string | null
          created_at: string | null
          detail: string | null
          id: string
          is_default: boolean | null
          is_verified: boolean | null
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string | null
          detail?: string | null
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          name: string
          type: string
          user_id?: string | null
        }
        Update: {
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string | null
          detail?: string | null
          id?: string
          is_default?: boolean | null
          is_verified?: boolean | null
          name?: string
          type?: string
          user_id?: string | null
        }
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_order_amount: number | null
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_amount?: number | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_amount?: number | null
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
      }
      recent_places: {
        Row: {
          address: string
          created_at: string | null
          id: string
          last_used_at: string | null
          lat: number
          lng: number
          name: string
          search_count: number | null
          user_id: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          lat: number
          lng: number
          name: string
          search_count?: number | null
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          lat?: number
          lng?: number
          name?: string
          search_count?: number | null
          user_id?: string | null
        }
      }
      ride_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          provider_id: string | null
          rating: number
          ride_id: string | null
          tip_amount: number | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          provider_id?: string | null
          rating: number
          ride_id?: string | null
          tip_amount?: number | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          provider_id?: string | null
          rating?: number
          ride_id?: string | null
          tip_amount?: number | null
          user_id?: string | null
        }
      }
      ride_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          estimated_fare: number | null
          final_fare: number | null
          id: string
          passenger_count: number | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          provider_id: string | null
          ride_type: string | null
          scheduled_time: string | null
          special_requests: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          estimated_fare?: number | null
          final_fare?: number | null
          id?: string
          passenger_count?: number | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          provider_id?: string | null
          ride_type?: string | null
          scheduled_time?: string | null
          special_requests?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          destination_address?: string
          destination_lat?: number
          destination_lng?: number
          estimated_fare?: number | null
          final_fare?: number | null
          id?: string
          passenger_count?: number | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          provider_id?: string | null
          ride_type?: string | null
          scheduled_time?: string | null
          special_requests?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
      }
      saved_places: {
        Row: {
          address: string
          created_at: string | null
          id: string
          lat: number
          lng: number
          name: string
          place_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          place_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          place_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
      }
      service_providers: {
        Row: {
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          id: string
          is_available: boolean | null
          is_verified: boolean | null
          license_number: string | null
          provider_type: string | null
          rating: number | null
          total_trips: number | null
          updated_at: string | null
          user_id: string | null
          vehicle_color: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          license_number?: string | null
          provider_type?: string | null
          rating?: number | null
          total_trips?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          id?: string
          is_available?: boolean | null
          is_verified?: boolean | null
          license_number?: string | null
          provider_type?: string | null
          rating?: number | null
          total_trips?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
      }
      trip_shares: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ride_id: string | null
          share_code: string
          shared_with_email: string | null
          shared_with_phone: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ride_id?: string | null
          share_code: string
          shared_with_email?: string | null
          shared_with_phone?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ride_id?: string | null
          share_code?: string
          shared_with_email?: string | null
          shared_with_phone?: string | null
        }
      }
      user_notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
      }
      user_promo_usage: {
        Row: {
          id: string
          promo_id: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          promo_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          promo_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
      }
      favorite_promos: {
        Row: {
          id: string
          user_id: string
          promo_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          promo_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          promo_id?: string
          created_at?: string | null
        }
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
      }
    }
    Functions: {
      find_nearby_providers: {
        Args: {
          lat: number
          lng: number
          provider_type_filter?: string
          radius_km?: number
        }
        Returns: {
          distance_km: number
          provider_id: string
        }[]
      }
      use_promo_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      validate_promo_code: {
        Args: { p_code: string; p_order_amount: number; p_user_id: string }
        Returns: {
          discount_amount: number
          is_valid: boolean
          message: string
          promo_id: string
        }[]
      }
    }
  }
}

// Helper types
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type ServiceProvider = Database['public']['Tables']['service_providers']['Row']
export type ServiceProviderInsert = Database['public']['Tables']['service_providers']['Insert']
export type ServiceProviderUpdate = Database['public']['Tables']['service_providers']['Update']

export type RideRequest = Database['public']['Tables']['ride_requests']['Row']
export type RideRequestInsert = Database['public']['Tables']['ride_requests']['Insert']
export type RideRequestUpdate = Database['public']['Tables']['ride_requests']['Update']

export type PromoCode = Database['public']['Tables']['promo_codes']['Row']
export type SavedPlace = Database['public']['Tables']['saved_places']['Row']
export type RecentPlace = Database['public']['Tables']['recent_places']['Row']
export type RideRating = Database['public']['Tables']['ride_ratings']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type EmergencyContact = Database['public']['Tables']['emergency_contacts']['Row']
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type TripShare = Database['public']['Tables']['trip_shares']['Row']
export type UserNotification = Database['public']['Tables']['user_notifications']['Row']

// Wallet types
export interface UserWallet {
  id: string
  user_id: string
  balance: number
  total_earned: number
  total_spent: number
  currency: string
  created_at: string
  updated_at: string
}

export interface WalletTransaction {
  id: string
  wallet_id: string
  user_id: string
  type: 'topup' | 'payment' | 'refund' | 'cashback' | 'referral' | 'promo' | 'withdrawal'
  amount: number
  balance_before: number
  balance_after: number
  reference_type: string | null
  reference_id: string | null
  description: string | null
  status: string
  created_at: string
}

// Referral types
export interface ReferralCode {
  id: string
  user_id: string
  code: string
  reward_amount: number
  referee_reward: number
  usage_count: number
  max_usage: number | null
  is_active: boolean
  created_at: string
}

export interface Referral {
  id: string
  referrer_id: string
  referee_id: string
  referral_code: string
  referrer_reward: number
  referee_reward: number
  status: 'pending' | 'completed' | 'expired'
  completed_at: string | null
  created_at: string
}

// Additional types for advanced features (placeholder types for tables not yet in database)
export interface DeliveryRequest {
  id: string
  user_id: string | null
  sender_address: string
  recipient_address: string
  sender_lat: number
  sender_lng: number
  recipient_lat: number
  recipient_lng: number
  sender_name: string | null
  sender_phone: string | null
  recipient_name: string | null
  recipient_phone: string | null
  package_size: string | null
  package_type: string | null
  package_weight: number | null
  package_description: string | null
  estimated_fee: number | null
  final_fee: number | null
  status: string | null
  provider_id: string | null
  created_at: string | null
  updated_at: string | null
}
export type DeliveryRequestInsert = Partial<DeliveryRequest>

export interface Payment {
  id: string
  user_id: string | null
  amount: number
  payment_method: string | null
  status: string | null
  request_type: string | null
  request_id: string | null
  transaction_ref: string | null
  created_at: string | null
}
export type PaymentInsert = Partial<Payment>

export interface ScheduledRide {
  id: string
  user_id: string | null
  pickup_address: string
  destination_address: string
  scheduled_datetime: string
  ride_type: string | null
  estimated_fare: number | null
  status: string | null
  created_at: string | null
}

export interface RideStop {
  id: string
  ride_id: string | null
  address: string
  lat: number
  lng: number
  stop_order: number
  status: string | null
}

export interface FavoriteDriver {
  id: string
  user_id: string | null
  provider_id: string | null
  created_at: string | null
}

export interface BlockedDriver {
  id: string
  user_id: string | null
  provider_id: string | null
  reason: string | null
  created_at: string | null
}

export interface DriverPreferences {
  id: string
  user_id: string | null
  preferred_gender: string | null
  preferred_vehicle_type: string | null
  prefer_female_driver: boolean | null
  prefer_high_rated: boolean | null
  min_rating: number | null
  prefer_experienced: boolean | null
  created_at: string | null
}

export interface VoiceCall {
  id: string
  ride_id: string | null
  caller_id: string | null
  receiver_id: string | null
  duration: number | null
  status: string | null
  call_status: string | null
  created_at: string | null
}

export interface InsurancePlan {
  id: string
  name: string
  name_th: string | null
  description: string | null
  description_th: string | null
  coverage_type: string | null
  coverage_details: string[] | null
  price_per_ride: number
  coverage_amount: number
  is_active: boolean | null
}

export interface UserInsurance {
  id: string
  user_id: string | null
  plan_id: string | null
  is_active: boolean | null
  created_at: string | null
}

export interface InsuranceClaim {
  id: string
  user_id: string | null
  ride_id: string | null
  claim_amount: number
  claim_type: string | null
  status: string | null
  description: string | null
  created_at: string | null
}

export interface SubscriptionPlan {
  id: string
  name: string
  name_th: string | null
  description_th: string | null
  price: number
  original_price: number | null
  duration_days: number
  billing_cycle: string | null
  plan_type: string | null
  features: string[] | null
  free_cancellations: number | null
  ride_credits: number | null
  is_active: boolean | null
}

export interface UserSubscription {
  id: string
  user_id: string | null
  plan_id: string | null
  plan: SubscriptionPlan | null
  status: string | null
  start_date: string | null
  end_date: string | null
  current_period_end: string | null
  free_cancellations_remaining: number | null
  created_at: string | null
}

export type SubscriptionStatusType = 'active' | 'expired' | 'cancelled' | 'pending'

export interface SubscriptionStatus {
  has_subscription: boolean
  discount_percentage: number
  free_wait_time_minutes: number | null
  status: SubscriptionStatusType | null
}

export interface TrackingLookupResult {
  type: 'ride' | 'delivery' | 'shopping'
  data: any
  provider: any
  user: any
}

export interface ChatSession {
  id: string
  ride_id: string | null
  user_id: string | null
  provider_id: string | null
  created_at: string | null
}

export interface SupportTicket {
  id: string
  user_id: string | null
  subject: string
  description: string | null
  category: string | null
  priority: string | null
  status: string | null
  created_at: string | null
}

export interface Complaint {
  id: string
  user_id: string | null
  ride_id: string | null
  description: string
  status: string | null
  created_at: string | null
}

export interface Refund {
  id: string
  payment_id: string | null
  amount: number
  reason: string | null
  status: string | null
  created_at: string | null
}

export interface SafetyIncident {
  id: string
  ride_id: string | null
  user_id: string | null
  incident_type: string | null
  description: string | null
  status: string | null
  created_at: string | null
}

export interface Company {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: string | null
  created_at: string | null
}

export interface CompanyEmployee {
  id: string
  company_id: string | null
  user_id: string | null
  role: string | null
  monthly_limit: number | null
  can_book_for_others: boolean | null
  created_at: string | null
}

export interface CorporatePolicy {
  id: string
  company_id: string | null
  max_fare_per_ride: number | null
  allowed_hours: string | null
  allowed_hours_start: string | null
  allowed_hours_end: string | null
  allowed_ride_types: string[] | null
  allowed_days: string[] | null
  require_approval_above: number | null
  is_default: boolean | null
  created_at: string | null
}

export interface CorporateRideRequest {
  id: string
  company_id: string | null
  employee_id: string | null
  ride_id: string | null
  status: string | null
  created_at: string | null
}

export interface ShoppingRequest {
  id: string
  user_id: string | null
  store_name: string | null
  store_address: string | null
  store_lat: number | null
  store_lng: number | null
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  items: string | null
  estimated_total: number | null
  service_fee: number | null
  status: string | null
  provider_id: string | null
  created_at: string | null
  updated_at: string | null
}
export type ShoppingRequestInsert = Partial<ShoppingRequest>
