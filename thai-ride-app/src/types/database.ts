export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
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
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_read: boolean | null
          message: string
          message_type: string | null
          ride_id: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          message: string
          message_type?: string | null
          ride_id?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          message?: string
          message_type?: string | null
          ride_id?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "ride_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      providers_v2: {
        Row: {
          approved_at: string | null
          avatar_url: string | null
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
          location_updated_at: string | null
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
          vehicle_photo_url: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          approved_at?: string | null
          avatar_url?: string | null
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
          location_updated_at?: string | null
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
          vehicle_photo_url?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          approved_at?: string | null
          avatar_url?: string | null
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
          location_updated_at?: string | null
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
          vehicle_photo_url?: string | null
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
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          dropoff_photo: string | null
          dropoff_photo_at: string | null
          estimated_fare: number | null
          final_fare: number | null
          id: string
          matched_at: string | null
          notes: string | null
          original_provider_id: string | null
          paid_amount: number | null
          passenger_count: number | null
          payment_method: string | null
          payment_status: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_photo: string | null
          pickup_photo_at: string | null
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
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          destination_address: string
          destination_lat: number
          destination_lng: number
          dropoff_photo?: string | null
          dropoff_photo_at?: string | null
          estimated_fare?: number | null
          final_fare?: number | null
          id?: string
          matched_at?: string | null
          notes?: string | null
          original_provider_id?: string | null
          paid_amount?: number | null
          passenger_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          pickup_photo?: string | null
          pickup_photo_at?: string | null
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
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          destination_address?: string
          destination_lat?: number
          destination_lng?: number
          dropoff_photo?: string | null
          dropoff_photo_at?: string | null
          estimated_fare?: number | null
          final_fare?: number | null
          id?: string
          matched_at?: string | null
          notes?: string | null
          original_provider_id?: string | null
          paid_amount?: number | null
          passenger_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          pickup_photo?: string | null
          pickup_photo_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "ride_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_v2"
            referencedColumns: ["id"]
          },
        ]
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
    Views: {}
    Functions: {
      get_chat_history: {
        Args: { p_before_id?: string; p_limit?: number; p_ride_id: string }
        Returns: Json
      }
      get_unread_message_count: {
        Args: { p_ride_id: string; p_user_id: string }
        Returns: number
      }
      get_user_ride_role: {
        Args: { p_ride_id: string; p_user_id: string }
        Returns: string
      }
      is_ride_chat_allowed: { Args: { p_ride_id: string }; Returns: boolean }
      is_ride_participant: {
        Args: { p_ride_id: string; p_user_id: string }
        Returns: boolean
      }
      mark_messages_read: {
        Args: { p_ride_id: string; p_user_id: string }
        Returns: number
      }
      send_chat_message: {
        Args: {
          p_image_url?: string
          p_message: string
          p_message_type?: string
          p_ride_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      provider_status:
        | "pending"
        | "pending_verification"
        | "approved"
        | "active"
        | "suspended"
        | "rejected"
      service_type: "ride" | "delivery" | "shopping" | "moving" | "laundry"
    }
    CompositeTypes: {}
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
