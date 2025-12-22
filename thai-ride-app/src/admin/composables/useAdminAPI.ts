/**
 * Admin API Composable
 * ====================
 * Central API layer for all admin operations
 */

import { ref } from 'vue'
import { supabase } from '../../lib/supabase'
import type { 
  Customer, 
  Provider, 
  Order, 
  UserFilters, 
  OrderFilters, 
  PaginationParams, 
  PaginatedResult,
  ProviderStatus
} from '../types'

// Type for RPC responses (Supabase doesn't auto-type custom RPCs)
type RpcResponse<T> = { data: T | null; error: any }

export function useAdminAPI() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ============================================
  // CUSTOMERS
  // ============================================
  
  async function getCustomers(
    filters: UserFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Customer>> {
    isLoading.value = true
    error.value = null
    
    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Build query directly on users table
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })

      // Apply search filter
      if (filters.search) {
        const searchTerm = `%${filters.search}%`
        query = query.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone_number.ilike.${searchTerm},member_uid.ilike.${searchTerm}`)
      }

      // Apply status filter (verification_status)
      if (filters.status) {
        query = query.eq('verification_status', filters.status)
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data, error: queryError, count } = await query

      if (queryError) {
        console.error('Query error:', queryError)
        throw queryError
      }

      const total = count || 0

      // Map to Customer type
      const customers: Customer[] = (data || []).map((user: any) => ({
        id: user.id,
        member_uid: user.member_uid,
        email: user.email,
        phone_number: user.phone_number || user.phone,
        first_name: user.first_name || user.name?.split(' ')[0] || '',
        last_name: user.last_name || user.name?.split(' ').slice(1).join(' ') || '',
        avatar_url: user.avatar_url || null,
        verification_status: user.verification_status || 'pending',
        created_at: user.created_at,
        last_active: user.updated_at,
        total_rides: 0,
        total_spent: 0,
        wallet_balance: 0,
        loyalty_points: 0
      } as Customer))

      return {
        data: customers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch customers'
      console.error('getCustomers error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  async function getCustomerById(id: string): Promise<Customer | null> {
    try {
      const { data, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (queryError) throw queryError
      return data as Customer
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch customer'
      return null
    }
  }

  // ============================================
  // PROVIDERS
  // ============================================

  async function getProviders(
    filters: UserFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Provider>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Use RPC function to bypass RLS (works with demo mode)
      const { data, error: queryError } = await (supabase.rpc as any)('get_all_providers_for_admin', {
        p_status: filters.status || null,
        p_provider_type: null,
        p_limit: limit,
        p_offset: offset
      }) as RpcResponse<any[]>

      if (queryError) throw queryError

      // Get total count
      const { data: countData, error: countError } = await (supabase.rpc as any)('count_providers_for_admin', {
        p_status: filters.status || null,
        p_provider_type: null
      }) as RpcResponse<number>

      if (countError) throw countError

      const total = countData || 0

      // Map to Provider type
      const providers: Provider[] = (data || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        provider_uid: p.provider_uid,
        provider_type: p.provider_type,
        status: p.status,
        first_name: p.user_first_name,
        last_name: p.user_last_name,
        phone_number: p.user_phone,
        email: p.user_email,
        avatar_url: null,
        vehicle_type: null,
        vehicle_plate: null,
        is_online: p.is_available,
        is_verified: p.is_verified,
        rating: p.rating || 0,
        total_trips: p.total_rides || 0,
        total_earnings: p.total_earnings || 0,
        created_at: p.created_at,
        approved_at: null
      }))

      return {
        data: providers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch providers'
      console.error('getProviders error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  async function updateProviderStatus(
    providerId: string, 
    status: ProviderStatus,
    reason?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { status }
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString()
        updateData.is_verified = true
      }
      if (reason) {
        updateData.rejection_reason = reason
      }

      const { error: updateError } = await supabase
        .from('service_providers')
        .update(updateData)
        .eq('id', providerId)

      if (updateError) throw updateError
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update provider'
      return false
    }
  }

  async function getVerificationQueue(): Promise<Provider[]> {
    try {
      // Use RPC function to bypass RLS (works with demo mode)
      const { data, error: queryError } = await (supabase.rpc as any)('get_all_providers_for_admin', {
        p_status: 'pending',
        p_provider_type: null,
        p_limit: 50,
        p_offset: 0
      }) as RpcResponse<any[]>

      if (queryError) throw queryError

      return (data || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        provider_uid: p.provider_uid,
        provider_type: p.provider_type,
        status: p.status,
        first_name: p.user_first_name,
        last_name: p.user_last_name,
        phone_number: p.user_phone,
        email: p.user_email,
        created_at: p.created_at
      })) as Provider[]
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch verification queue'
      console.error('getVerificationQueue error:', e)
      return []
    }
  }

  // ============================================
  // ORDERS
  // ============================================

  async function getOrders(
    filters: OrderFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Order>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Use RPC function to bypass RLS (works with demo mode)
      const { data, error: queryError } = await (supabase.rpc as any)('get_all_orders_for_admin', {
        p_type: filters.service_type || null,
        p_status: filters.status || null,
        p_limit: limit,
        p_offset: offset
      }) as RpcResponse<any[]>

      if (queryError) throw queryError

      // Get total count
      const { data: countData, error: countError } = await (supabase.rpc as any)('count_all_orders_for_admin', {
        p_type: filters.service_type || null,
        p_status: filters.status || null
      }) as RpcResponse<number>

      if (countError) throw countError

      const total = countData || 0

      // Map to Order type
      const orders: Order[] = (data || []).map((o: any) => ({
        id: o.id,
        tracking_id: o.tracking_id || o.id?.slice(0, 8).toUpperCase(),
        service_type: o.type,
        status: o.status,
        customer_id: o.user_id,
        customer_name: o.user_name,
        customer_phone: o.user_phone,
        provider_id: o.provider_id,
        provider_name: o.provider_name,
        provider_phone: null,
        pickup_address: o.pickup_address,
        pickup_lat: null,
        pickup_lng: null,
        dropoff_address: o.destination_address,
        dropoff_lat: null,
        dropoff_lng: null,
        base_fare: 0,
        distance_fare: null,
        surge_multiplier: null,
        promo_discount: null,
        tip_amount: null,
        total_amount: o.amount || 0,
        payment_method: 'cash',
        payment_status: 'pending',
        created_at: o.created_at,
        matched_at: null,
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        cancelled_by: null,
        cancel_reason: null,
        customer_rating: null,
        provider_rating: null,
        customer_notes: null
      }))

      return {
        data: orders,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch orders'
      console.error('getOrders error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      const { error: updateError } = await supabase
        .from('ride_requests')
        .update({ status })
        .eq('id', orderId)

      if (updateError) throw updateError
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update order'
      return false
    }
  }

  // ============================================
  // DELIVERY
  // ============================================

  async function getDeliveries(
    filters: OrderFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Order>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const { data, error: queryError } = await (supabase.rpc as any)('get_all_deliveries_for_admin', {
        p_status: filters.status || null,
        p_limit: limit,
        p_offset: offset
      }) as RpcResponse<any[]>

      if (queryError) throw queryError

      const { data: countData, error: countError } = await (supabase.rpc as any)('count_deliveries_for_admin', {
        p_status: filters.status || null
      }) as RpcResponse<number>

      if (countError) throw countError

      const total = countData || 0

      const deliveries: Order[] = (data || []).map((d: any) => ({
        id: d.id,
        tracking_id: d.tracking_id,
        service_type: 'delivery',
        status: d.status,
        customer_id: d.user_id,
        customer_name: d.user_name,
        customer_phone: d.user_phone,
        provider_id: d.provider_id,
        provider_name: d.provider_name,
        provider_phone: d.provider_phone,
        pickup_address: d.pickup_address,
        dropoff_address: d.destination_address,
        total_amount: d.amount || 0,
        payment_method: d.payment_method || 'cash',
        payment_status: 'pending',
        created_at: d.created_at,
        matched_at: d.matched_at,
        completed_at: d.completed_at,
        cancelled_at: d.cancelled_at,
        base_fare: 0
      }))

      return {
        data: deliveries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch deliveries'
      console.error('getDeliveries error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  // ============================================
  // SHOPPING
  // ============================================

  async function getShopping(
    filters: OrderFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Order>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const { data, error: queryError } = await (supabase.rpc as any)('get_all_shopping_for_admin', {
        p_status: filters.status || null,
        p_limit: limit,
        p_offset: offset
      }) as RpcResponse<any[]>

      if (queryError) throw queryError

      const { data: countData, error: countError } = await (supabase.rpc as any)('count_shopping_for_admin', {
        p_status: filters.status || null
      }) as RpcResponse<number>

      if (countError) throw countError

      const total = countData || 0

      const shopping: Order[] = (data || []).map((s: any) => ({
        id: s.id,
        tracking_id: s.tracking_id,
        service_type: 'shopping',
        status: s.status,
        customer_id: s.user_id,
        customer_name: s.user_name,
        customer_phone: s.user_phone,
        provider_id: s.provider_id,
        provider_name: s.provider_name,
        provider_phone: s.provider_phone,
        pickup_address: s.store_address,
        dropoff_address: s.delivery_address,
        total_amount: s.amount || 0,
        payment_method: s.payment_method || 'cash',
        payment_status: 'pending',
        created_at: s.created_at,
        matched_at: s.matched_at,
        completed_at: s.completed_at,
        cancelled_at: s.cancelled_at,
        base_fare: 0,
        customer_notes: s.shopping_list
      }))

      return {
        data: shopping,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch shopping'
      console.error('getShopping error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  // ============================================
  // QUEUE BOOKINGS
  // ============================================

  async function getQueueBookings(
    filters: OrderFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Order>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const { data, error: queryError } = await (supabase.rpc as any)('get_all_queues_for_admin', {
        p_status: filters.status || null,
        p_limit: limit,
        p_offset: offset
      }) as RpcResponse<any[]>

      if (queryError) throw queryError

      const { data: countData, error: countError } = await (supabase.rpc as any)('count_queues_for_admin', {
        p_status: filters.status || null
      }) as RpcResponse<number>

      if (countError) throw countError

      const total = countData || 0

      const queues: Order[] = (data || []).map((q: any) => ({
        id: q.id,
        tracking_id: q.tracking_id,
        service_type: 'queue',
        status: q.status,
        customer_id: q.user_id,
        customer_name: q.user_name,
        customer_phone: q.user_phone,
        provider_id: q.provider_id,
        provider_name: q.provider_name,
        provider_phone: q.provider_phone,
        pickup_address: q.place_name,
        dropoff_address: q.place_address,
        total_amount: q.amount || 0,
        payment_method: q.payment_method || 'cash',
        payment_status: 'pending',
        created_at: q.created_at,
        matched_at: q.confirmed_at,
        completed_at: q.completed_at,
        cancelled_at: q.cancelled_at,
        base_fare: 0,
        customer_notes: q.special_requests
      }))

      return {
        data: queues,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch queue bookings'
      console.error('getQueueBookings error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  // ============================================
  // MOVING
  // ============================================

  async function getMoving(
    filters: OrderFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Order>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const { data, error: queryError } = await (supabase.rpc as any)('get_all_moving_for_admin', {
        p_status: filters.status || null,
        p_limit: limit,
        p_offset: offset
      }) as RpcResponse<any[]>

      if (queryError) throw queryError

      const { data: countData, error: countError } = await (supabase.rpc as any)('count_moving_for_admin', {
        p_status: filters.status || null
      }) as RpcResponse<number>

      if (countError) throw countError

      const total = countData || 0

      const moving: Order[] = (data || []).map((m: any) => ({
        id: m.id,
        tracking_id: m.tracking_id,
        service_type: 'moving',
        status: m.status,
        customer_id: m.user_id,
        customer_name: m.user_name,
        customer_phone: m.user_phone,
        provider_id: m.provider_id,
        provider_name: m.provider_name,
        provider_phone: m.provider_phone,
        pickup_address: m.pickup_address,
        dropoff_address: m.destination_address,
        total_amount: m.amount || 0,
        payment_method: m.payment_method || 'cash',
        payment_status: 'pending',
        created_at: m.created_at,
        matched_at: m.matched_at,
        completed_at: m.completed_at,
        cancelled_at: m.cancelled_at,
        base_fare: 0,
        customer_notes: m.items_description
      }))

      return {
        data: moving,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch moving requests'
      console.error('getMoving error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  // ============================================
  // LAUNDRY
  // ============================================

  async function getLaundry(
    filters: OrderFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Order>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const { data, error: queryError } = await (supabase.rpc as any)('get_all_laundry_for_admin', {
        p_status: filters.status || null,
        p_limit: limit,
        p_offset: offset
      }) as RpcResponse<any[]>

      if (queryError) throw queryError

      const { data: countData, error: countError } = await (supabase.rpc as any)('count_laundry_for_admin', {
        p_status: filters.status || null
      }) as RpcResponse<number>

      if (countError) throw countError

      const total = countData || 0

      const laundry: Order[] = (data || []).map((l: any) => ({
        id: l.id,
        tracking_id: l.tracking_id,
        service_type: 'laundry',
        status: l.status,
        customer_id: l.user_id,
        customer_name: l.user_name,
        customer_phone: l.user_phone,
        provider_id: l.provider_id,
        provider_name: l.provider_name,
        provider_phone: l.provider_phone,
        pickup_address: l.pickup_address,
        dropoff_address: l.pickup_address, // Laundry uses same address for pickup/delivery
        total_amount: l.amount || 0,
        payment_method: l.payment_method || 'cash',
        payment_status: 'pending',
        created_at: l.created_at,
        matched_at: l.matched_at,
        completed_at: l.delivered_at,
        cancelled_at: l.cancelled_at,
        base_fare: 0,
        customer_notes: l.notes
      }))

      return {
        data: laundry,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch laundry requests'
      console.error('getLaundry error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  // ============================================
  // CANCELLATIONS
  // ============================================

  async function getCancellations(
    serviceType?: ServiceType,
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<any>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const { data, error: queryError } = await (supabase.rpc as any)('get_all_cancellations_for_admin', {
        p_service_type: serviceType || null,
        p_limit: limit,
        p_offset: offset
      }) as RpcResponse<any[]>

      if (queryError) throw queryError

      return {
        data: data || [],
        total: data?.length || 0,
        page,
        limit,
        totalPages: Math.ceil((data?.length || 0) / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch cancellations'
      console.error('getCancellations error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  // ============================================
  // DRIVER TRACKING
  // ============================================

  async function getActiveProvidersLocations(): Promise<any[]> {
    try {
      const { data, error: queryError } = await (supabase.rpc as any)('get_active_providers_locations') as RpcResponse<any[]>

      if (queryError) throw queryError

      // Map to expected format for DriverTrackingView
      return (data || []).map((p: any) => ({
        id: p.id,
        provider_uid: p.provider_uid,
        provider_type: p.provider_type,
        user_name: p.user_name,
        phone_number: p.phone_number,
        current_lat: p.current_lat,
        current_lng: p.current_lng,
        is_available: p.is_online,
        rating: p.rating,
        total_trips: p.total_trips,
        last_location_update: p.last_updated,
        current_job_id: null,
        current_job_type: null
      }))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch provider locations'
      console.error('getActiveProvidersLocations error:', e)
      return []
    }
  }

  // ============================================
  // DASHBOARD STATS
  // ============================================

  async function getDashboardStats() {
    try {
      // Use RPC function to bypass RLS (works with demo mode)
      const { data, error: queryError } = await (supabase.rpc as any)('get_admin_dashboard_stats') as RpcResponse<any>

      if (queryError) throw queryError

      if (data) {
        return {
          totalCustomers: data.total_users || 0,
          totalProviders: data.total_providers || 0,
          activeProviders: data.online_providers || 0,
          pendingProviders: data.pending_verifications || 0,
          totalOrders: data.total_rides || 0,
          pendingOrders: data.active_rides || 0,
          todayOrders: 0, // Not in RPC, would need separate query
          todayRevenue: data.total_revenue || 0
        }
      }

      return {
        totalCustomers: 0,
        totalProviders: 0,
        activeProviders: 0,
        pendingProviders: 0,
        totalOrders: 0,
        pendingOrders: 0,
        todayOrders: 0,
        todayRevenue: 0
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch stats'
      console.error('getDashboardStats error:', e)
      return {
        totalCustomers: 0,
        totalProviders: 0,
        activeProviders: 0,
        pendingProviders: 0,
        totalOrders: 0,
        pendingOrders: 0,
        todayOrders: 0,
        todayRevenue: 0
      }
    }
  }

  return {
    isLoading,
    error,
    // Customers
    getCustomers,
    getCustomerById,
    // Providers
    getProviders,
    updateProviderStatus,
    getVerificationQueue,
    // Orders
    getOrders,
    updateOrderStatus,
    // Services
    getDeliveries,
    getShopping,
    getQueueBookings,
    getMoving,
    getLaundry,
    getCancellations,
    getActiveProvidersLocations,
    // Dashboard
    getDashboardStats
  }
}
