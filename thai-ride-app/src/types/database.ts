/**
 * Database Types - Auto-generated from Supabase schema
 * Last updated: 2026-01-16
 * 
 * Note: This file should be regenerated when schema changes
 * Command: npx supabase gen types typescript --project-id onsflqhkqhydeupiqyt > src/types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          phone_number: string | null
          avatar_url: string | null
          role: 'customer' | 'provider' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          phone_number?: string | null
          avatar_url?: string | null
          role?: 'customer' | 'provider' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          phone_number?: string | null
          avatar_url?: string | null
          role?: 'customer' | 'provider' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      providers_v2: {
        Row: {
          id: string
          user_id: string
          provider_uid: string | null
          first_name: string
          last_name: string
          email: string
          phone_number: string
          profile_image_url: string | null
          avatar_url: string | null
          vehicle_photo_url: string | null
          service_types: string[]
          status: string
          verification_status: string | null
          is_online: boolean
          is_available: boolean
          rating: number
          total_trips: number
          total_earnings: number
          completion_rate: number | null
          acceptance_rate: number | null
          cancellation_rate: number | null
          current_lat: number | null
          current_lng: number | null
          current_location: unknown | null
          vehicle_type: string | null
          vehicle_plate: string | null
          vehicle_color: string | null
          vehicle_info: Json | null
          license_number: string | null
          license_expiry: string | null
          national_id: string | null
          address: string | null
          documents: Json | null
          provider_type: string | null
          allowed_services: string[] | null
          bank_name: string | null
          bank_account_number: string | null
          bank_account_name: string | null
          created_at: string
          updated_at: string
          approved_at: string | null
          suspended_at: string | null
          suspension_reason: string | null
          last_active_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          provider_uid?: string | null
          first_name: string
          last_name: string
          email: string
          phone_number: string
          profile_image_url?: string | null
          avatar_url?: string | null
          vehicle_photo_url?: string | null
          service_types?: string[]
          status?: string
          verification_status?: string | null
          is_online?: boolean
          is_available?: boolean
          rating?: number
          total_trips?: number
          total_earnings?: number
          completion_rate?: number | null
          acceptance_rate?: number | null
          cancellation_rate?: number | null
          current_lat?: number | null
          current_lng?: number | null
          current_location?: unknown | null
          vehicle_type?: string | null
          vehicle_plate?: string | null
          vehicle_color?: string | null
          vehicle_info?: Json | null
          license_number?: string | null
          license_expiry?: string | null
          national_id?: string | null
          address?: string | null
          documents?: Json | null
          provider_type?: string | null
          allowed_services?: string[] | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_name?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          last_active_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          provider_uid?: string | null
          first_name?: string
          last_name?: string
          email?: string
          phone_number?: string
          profile_image_url?: string | null
          avatar_url?: string | null
          vehicle_photo_url?: string | null
          service_types?: string[]
          status?: string
          verification_status?: string | null
          is_online?: boolean
          is_available?: boolean
          rating?: number
          total_trips?: number
          total_earnings?: number
          completion_rate?: number | null
          acceptance_rate?: number | null
          cancellation_rate?: number | null
          current_lat?: number | null
          current_lng?: number | null
          current_location?: unknown | null
          vehicle_type?: string | null
          vehicle_plate?: string | null
          vehicle_color?: string | null
          vehicle_info?: Json | null
          license_number?: string | null
          license_expiry?: string | null
          national_id?: string | null
          address?: string | null
          documents?: Json | null
          provider_type?: string | null
          allowed_services?: string[] | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_name?: string | null
          created_at?: string
          updated_at?: string
          approved_at?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          last_active_at?: string | null
        }
      }
      ride_requests: {
        Row: {
          id: string
          customer_id: string
          provider_id: string | null
          service_type: string
          status: string
          pickup_lat: number
          pickup_lng: number
          pickup_address: string
          dropoff_lat: number
          dropoff_lng: number
          dropoff_address: string
          fare: number | null
          distance_km: number | null
          duration_minutes: number | null
          notes: string | null
          created_at: string
          updated_at: string
          accepted_at: string | null
          started_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          provider_id?: string | null
          service_type: string
          status?: string
          pickup_lat: number
          pickup_lng: number
          pickup_address: string
          dropoff_lat: number
          dropoff_lng: number
          dropoff_address: string
          fare?: number | null
          distance_km?: number | null
          duration_minutes?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          accepted_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          provider_id?: string | null
          service_type?: string
          status?: string
          pickup_lat?: number
          pickup_lng?: number
          pickup_address?: string
          dropoff_lat?: number
          dropoff_lng?: number
          dropoff_address?: string
          fare?: number | null
          distance_km?: number | null
          duration_minutes?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          accepted_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience types
export type Profile = Tables<'profiles'>
export type ProviderV2 = Tables<'providers_v2'>
export type RideRequest = Tables<'ride_requests'>
export type PushSubscription = Tables<'push_subscriptions'>
