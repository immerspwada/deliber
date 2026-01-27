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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      commission_settings: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          service_type: string
          updated_at: string
        }
        Insert: {
          commission_rate: number
          created_at?: string
          id?: string
          service_type: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_requests: {
        Row: {
          created_at: string
          customer_id: string
          delivery_fee: number
          delivery_notes: string | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          id: string
          package_size: string
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          provider_id: string | null
          recipient_name: string
          recipient_phone: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_fee: number
          delivery_notes?: string | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          id?: string
          package_size: string
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          provider_id?: string | null
          recipient_name: string
          recipient_phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_fee?: number
          delivery_notes?: string | null
          dropoff_address?: string
          dropoff_lat?: number
          dropoff_lng?: number
          id?: string
          package_size?: string
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          provider_id?: string | null
          recipient_name?: string
          recipient_phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      distance_pricing: {
        Row: {
          base_fare: number
          created_at: string
          id: string
          per_km_rate: number
          service_type: string
          updated_at: string
        }
        Insert: {
          base_fare: number
          created_at?: string
          id?: string
          per_km_rate: number
          service_type: string
          updated_at?: string
        }
        Update: {
          base_fare?: number
          created_at?: string
          id?: string
          per_km_rate?: number
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          is_active: boolean
          payment_type: string
          qr_code_url: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          payment_type: string
          qr_code_url?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          payment_type?: string
          qr_code_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_revenue: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          provider_id: string | null
          revenue_type: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          provider_id?: string | null
          revenue_type: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          provider_id?: string | null
          revenue_type?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_revenue_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_amount: number | null
          discount_percentage: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          service_type: string | null
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          service_type?: string | null
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_amount?: number | null
          discount_percentage?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          service_type?: string | null
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      providers_v2: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          id_card_number: string | null
          license_number: string | null
          pending_withdrawal: number
          phone: string
          service_types: string[] | null
          status: string
          total_earnings: number
          total_withdrawn: number
          updated_at: string
          user_id: string
          vehicle_registration: string | null
          vehicle_type: string | null
          wallet_balance: number
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          id_card_number?: string | null
          license_number?: string | null
          pending_withdrawal?: number
          phone: string
          service_types?: string[] | null
          status?: string
          total_earnings?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
          vehicle_registration?: string | null
          vehicle_type?: string | null
          wallet_balance?: number
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          id_card_number?: string | null
          license_number?: string | null
          pending_withdrawal?: number
          phone?: string
          service_types?: string[] | null
          status?: string
          total_earnings?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
          vehicle_registration?: string | null
          vehicle_type?: string | null
          wallet_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "providers_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          description: string | null
          id: string
          provider_id: string
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          description?: string | null
          id?: string
          provider_id: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          description?: string | null
          id?: string
          provider_id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_wallet_transactions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          distance_km: number | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          fare: number
          id: string
          notes: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          provider_id: string | null
          service_type: string
          status: string
          tip_amount: number
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          distance_km?: number | null
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          fare: number
          id?: string
          notes?: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          provider_id?: string | null
          service_type?: string
          status?: string
          tip_amount?: number
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          distance_km?: number | null
          dropoff_address?: string
          dropoff_lat?: number
          dropoff_lng?: number
          fare?: number
          id?: string
          notes?: string | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          provider_id?: string | null
          service_type?: string
          status?: string
          tip_amount?: number
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_places: {
        Row: {
          address: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_places_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          customer_id: string
          id: string
          items: Json
          provider_id: string | null
          service_fee: number
          status: string
          store_address: string
          store_lat: number
          store_lng: number
          store_name: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          customer_id: string
          id?: string
          items: Json
          provider_id?: string | null
          service_fee: number
          status?: string
          store_address: string
          store_lat: number
          store_lng: number
          store_name: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          items?: Json
          provider_id?: string | null
          service_fee?: number
          status?: string
          store_address?: string
          store_lat?: number
          store_lng?: number
          store_name?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      topup_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          payment_method: string
          payment_proof_url: string | null
          rejected_at: string | null
          rejected_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          payment_method: string
          payment_proof_url?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          payment_method?: string
          payment_proof_url?: string | null
          rejected_at?: string | null
          rejected_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topup_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topup_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
          total_spent: number
          total_topup: number
          updated_at: string
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
          total_spent?: number
          total_topup?: number
          updated_at?: string
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          total_spent?: number
          total_topup?: number
          updated_at?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      vehicle_multipliers: {
        Row: {
          created_at: string
          id: string
          multiplier: number
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          multiplier: number
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          created_at?: string
          id?: string
          multiplier?: number
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at: string
          id: string
          processed_at: string | null
          provider_id: string
          rejected_at: string | null
          rejected_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          created_at?: string
          id?: string
          processed_at?: string | null
          provider_id: string
          rejected_at?: string | null
          rejected_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_name?: string
          bank_account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          provider_id?: string
          rejected_at?: string | null
          rejected_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_v2"
            referencedColumns: ["id"]
          },
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
