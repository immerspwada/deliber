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
  ProviderStatus,
  ServiceType
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
    
    console.log('[Admin API] getCustomers called with:', { filters, pagination })
    
    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      console.log('[Admin API] Building query for users table...')
      
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

      console.log('[Admin API] Query result:', { 
        dataLength: data?.length, 
        count, 
        error: queryError,
        firstItem: data?.[0]
      })

      if (queryError) {
        console.error('[Admin API] Query error:', queryError)
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
      console.error('[Admin API] getCustomers error:', e)
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

    console.log('[Admin API] getProviders called with:', { filters, pagination })

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Query directly from providers_v2 table
      let query = supabase
        .from('providers_v2')
        .select(`
          id,
          user_id,
          provider_uid,
          provider_type,
          status,
          is_online,
          is_available,
          is_verified,
          rating,
          total_trips,
          total_earnings,
          vehicle_type,
          vehicle_plate,
          first_name,
          last_name,
          phone_number,
          email,
          created_at,
          approved_at
        `, { count: 'exact' })

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      // Apply search filter
      if (filters.search) {
        query = query.or(`provider_uid.ilike.%${filters.search}%,provider_type.ilike.%${filters.search}%`)
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data, error: queryError, count } = await query

      console.log('[Admin API] getProviders result:', { 
        dataLength: data?.length, 
        count, 
        error: queryError,
        firstItem: data?.[0]
      })

      if (queryError) {
        console.error('[Admin API] getProviders error:', queryError)
        throw queryError
      }

      const total = count || 0

      // Map to Provider type - using providers_v2 columns
      const providers: Provider[] = (data || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        provider_uid: p.provider_uid,
        provider_type: p.provider_type,
        status: p.status,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        phone_number: p.phone_number || '',
        email: p.email || '',
        avatar_url: null,
        vehicle_type: p.vehicle_type,
        vehicle_plate: p.vehicle_plate,
        is_online: p.is_online || false,
        is_verified: p.is_verified || false,
        rating: p.rating || 0,
        total_trips: p.total_trips || 0,
        total_earnings: p.total_earnings || 0,
        created_at: p.created_at,
        approved_at: p.approved_at
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
        .from('providers_v2')
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
    console.log('[Admin API] getVerificationQueue called')
    
    try {
      // Query directly from providers_v2 table with pending status
      const { data, error: queryError } = await supabase
        .from('providers_v2')
        .select(`
          id,
          user_id,
          provider_uid,
          provider_type,
          status,
          is_verified,
          first_name,
          last_name,
          phone_number,
          email,
          created_at
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50)

      console.log('[Admin API] getVerificationQueue result:', { 
        dataLength: data?.length, 
        error: queryError 
      })

      if (queryError) throw queryError

      return (data || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        provider_uid: p.provider_uid,
        provider_type: p.provider_type,
        status: p.status,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        phone_number: p.phone_number || '',
        email: p.email || '',
        is_verified: p.is_verified || false,
        created_at: p.created_at
      })) as Provider[]
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch verification queue'
      console.error('getVerificationQueue error:', e)
      return []
    }
  }

  // Enhanced Orders API
  async function getOrdersEnhanced(
    filters: OrderFilters & {
      service_type?: string;
      date_from?: string;
      date_to?: string;
      sortBy?: string;
      sortOrder?: string;
    } = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Order>> {
    isLoading.value = true
    error.value = null

    console.log('[Admin API] getOrdersEnhanced called with:', { filters, pagination })

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Use enhanced RPC function
      const { data, error: queryError } = await (supabase.rpc as any)('get_all_orders_for_admin', {
        p_service_type: filters.service_type || null,
        p_status: filters.status || null,
        p_limit: limit,
        p_offset: offset,
        p_search: filters.search || null,
        p_date_from: filters.date_from || null,
        p_date_to: filters.date_to || null,
        p_sort_by: filters.sortBy || 'created_at',
        p_sort_order: filters.sortOrder || 'desc'
      }) as RpcResponse<any[]>

      if (queryError) {
        console.error('[Admin API] Enhanced RPC error:', queryError)
        throw queryError
      }

      // Get total count with same filters
      const { data: countData, error: countError } = await (supabase.rpc as any)('count_all_orders_for_admin', {
        p_service_type: filters.service_type || null,
        p_status: filters.status || null,
        p_search: filters.search || null,
        p_date_from: filters.date_from || null,
        p_date_to: filters.date_to || null
      }) as RpcResponse<number>

      if (countError) {
        console.error('[Admin API] Enhanced count error:', countError)
        throw countError
      }

      const total = countData || 0

      // Map enhanced data to Order type
      const orders: Order[] = (data || []).map((o: any) => ({
        id: o.id,
        tracking_id: o.tracking_id,
        service_type: o.service_type,
        status: o.status,
        priority: o.priority || 'normal',
        customer_id: o.user_id,
        customer_name: o.user_name,
        customer_phone: o.user_phone,
        customer_email: o.user_email,
        provider_id: o.provider_id,
        provider_name: o.provider_name,
        provider_phone: o.provider_phone,
        provider_rating: o.provider_rating,
        pickup_address: o.pickup_address,
        pickup_lat: o.pickup_lat,
        pickup_lng: o.pickup_lng,
        dropoff_address: o.dropoff_address,
        dropoff_lat: o.dropoff_lat,
        dropoff_lng: o.dropoff_lng,
        estimated_amount: o.estimated_amount,
        final_amount: o.final_amount,
        total_amount: o.final_amount || o.estimated_amount || 0,
        payment_method: o.payment_method || 'cash',
        payment_status: o.payment_status || 'pending',
        promo_code: o.promo_code,
        promo_discount: o.promo_discount,
        distance_km: o.distance_km,
        duration_minutes: o.duration_minutes,
        special_notes: o.special_notes,
        created_at: o.created_at,
        matched_at: o.matched_at,
        started_at: o.started_at,
        completed_at: o.completed_at,
        cancelled_at: o.cancelled_at,
        cancel_reason: o.cancel_reason,
        cancelled_by: o.cancelled_by,
        rating: o.rating,
        feedback: o.feedback,
        last_updated: o.last_updated,
        base_fare: 0
      }))

      return {
        data: orders,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch enhanced orders'
      console.error('getOrdersEnhanced error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  async function getOrdersAnalytics(filters: {
    date_from?: string;
    date_to?: string;
  } = {}): Promise<any> {
    try {
      const { data, error: queryError } = await (supabase.rpc as any)('get_orders_analytics_for_admin', {
        p_date_from: filters.date_from || null,
        p_date_to: filters.date_to || null
      }) as RpcResponse<any>

      if (queryError) throw queryError
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch analytics'
      console.error('getOrdersAnalytics error:', e)
      return null
    }
  }

  async function bulkUpdateOrdersStatus(
    serviceType: string,
    orderIds: string[],
    newStatus: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const { data, error: queryError } = await (supabase.rpc as any)('bulk_update_orders_status', {
        p_service_type: serviceType,
        p_order_ids: orderIds,
        p_new_status: newStatus,
        p_reason: reason || null
      }) as RpcResponse<any>

      if (queryError) throw queryError
      
      return data?.success || false
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to bulk update orders'
      console.error('bulkUpdateOrdersStatus error:', e)
      return false
    }
  }

    async function updateOrderStatus(
      orderId: string, 
      status: string, 
      options?: { 
        cancelReason?: string;
        serviceType?: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry';
      }
    ): Promise<boolean> {
      try {
        const tableName = options?.serviceType ? `${options.serviceType}_requests` : 'ride_requests'
        
        // Build update object
        const updateData: Record<string, any> = { status }
        
        // If cancelling, add cancellation details
        if (status === 'cancelled') {
          updateData.cancelled_at = new Date().toISOString()
          updateData.cancelled_by = 'admin'
          updateData.cancel_reason = options?.cancelReason || 'ยกเลิกโดย Admin'
        }
        
        const { error: updateError } = await supabase
          .from(tableName as any)
          .update(updateData)
          .eq('id', orderId)

        if (updateError) throw updateError
        
        // Send notification to customer about status change
        try {
          // Get order details to find user_id
          const { data: orderData } = await supabase
            .from(tableName as any)
            .select('user_id, tracking_id')
            .eq('id', orderId)
            .single()
          
          if (orderData?.user_id) {
            const statusMessages: Record<string, string> = {
              cancelled: `คำสั่ง ${orderData.tracking_id} ถูกยกเลิกแล้ว`,
              completed: `คำสั่ง ${orderData.tracking_id} เสร็จสิ้นแล้ว`,
              in_progress: `คำสั่ง ${orderData.tracking_id} กำลังดำเนินการ`,
            }
            
            const message = statusMessages[status] || `สถานะคำสั่ง ${orderData.tracking_id} เปลี่ยนเป็น ${status}`
            
            // Map service type to notification type
            const notificationType = options?.serviceType || 'ride'
            
            await supabase.from('user_notifications' as any).insert({
              user_id: orderData.user_id,
              type: notificationType,
              title: status === 'cancelled' ? 'คำสั่งถูกยกเลิก' : 'อัพเดทสถานะคำสั่ง',
              message,
              data: { order_id: orderId, tracking_id: orderData.tracking_id, status }
            })
          }
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError)
          // Don't fail the whole operation if notification fails
        }
        
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

      // Get data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        (supabase.rpc as any)('get_all_cancellations_for_admin', {
          p_service_type: serviceType || null,
          p_limit: limit,
          p_offset: offset
        }) as Promise<RpcResponse<any[]>>,
        (supabase.rpc as any)('count_cancellations_for_admin', {
          p_service_type: serviceType || null
        }) as Promise<RpcResponse<number>>
      ])

      if (dataResult.error) throw dataResult.error

      const total = countResult.data || dataResult.data?.length || 0

      return {
        data: dataResult.data || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
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

      console.log('[Admin API] getDashboardStats result:', { data, error: queryError })

      if (queryError) throw queryError

      if (data) {
        // Handle both old and new field names from RPC
        return {
          totalCustomers: data.totalCustomers || data.total_users || 0,
          totalProviders: data.totalProviders || data.total_providers || 0,
          activeProviders: data.activeProviders || data.online_providers || 0,
          pendingProviders: data.pendingProviders || data.pending_verifications || 0,
          totalOrders: data.totalOrders || data.total_rides || 0,
          pendingOrders: data.pendingOrders || data.active_rides || 0,
          todayOrders: data.todayOrders || 0,
          todayRevenue: data.todayRevenue || data.total_revenue || 0
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

  // ============================================
  // SCHEDULED RIDES
  // ============================================

  async function getScheduledRides(
    filters: { status?: string } = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<any>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const { data, error: queryError } = await (supabase.rpc as any)('get_all_scheduled_rides_for_admin', {
        p_status: filters.status || null,
        p_limit: limit,
        p_offset: offset
      }) as RpcResponse<any[]>

      if (queryError) throw queryError

      const { data: countData, error: countError } = await (supabase.rpc as any)('count_scheduled_rides_for_admin', {
        p_status: filters.status || null
      }) as RpcResponse<number>

      if (countError) throw countError

      const total = countData || 0

      return {
        data: data || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch scheduled rides'
      console.error('getScheduledRides error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  // ============================================
  // SERVICE BUNDLES
  // ============================================

  async function getBundleTemplates(): Promise<any[]> {
    try {
      const { data, error: queryError } = await (supabase.rpc as any)('get_all_bundle_templates_for_admin') as RpcResponse<any[]>

      if (queryError) throw queryError
      return data || []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch bundle templates'
      console.error('getBundleTemplates error:', e)
      return []
    }
  }

  async function getServiceBundles(
    filters: { status?: string } = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<any>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Use correct RPC function name from migration 184
      const { data, error: queryError } = await (supabase.rpc as any)('get_service_bundles_for_admin', {
        p_status: filters.status || null,
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
      error.value = e instanceof Error ? e.message : 'Failed to fetch service bundles'
      console.error('getServiceBundles error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  async function getServiceBundlesStats(): Promise<any> {
    try {
      const { data, error: queryError } = await (supabase.rpc as any)('get_service_bundles_stats_for_admin') as RpcResponse<any[]>

      if (queryError) throw queryError
      return data?.[0] || { total_bundles: 0, active_bundles: 0, completed_bundles: 0, total_customers: 0, total_revenue: 0 }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch bundle stats'
      console.error('getServiceBundlesStats error:', e)
      return { total_bundles: 0, active_bundles: 0, completed_bundles: 0, total_customers: 0, total_revenue: 0 }
    }
  }

  // ============================================
  // REAL-TIME ANALYTICS
  // ============================================

  async function getRealtimeOrderStats() {
    try {
      const { data, error: queryError } = await (supabase.rpc as any)('get_realtime_order_stats') as RpcResponse<any>
      if (queryError) throw queryError
      return data || {
        today_orders: 0,
        today_completed: 0,
        today_cancelled: 0,
        today_revenue: 0,
        active_rides: 0,
        online_providers: 0,
        hourly_orders: []
      }
    } catch (e) {
      console.error('getRealtimeOrderStats error:', e)
      return {
        today_orders: 0,
        today_completed: 0,
        today_cancelled: 0,
        today_revenue: 0,
        active_rides: 0,
        online_providers: 0,
        hourly_orders: []
      }
    }
  }

  async function getRealtimeServiceBreakdown() {
    try {
      const { data, error: queryError } = await (supabase.rpc as any)('get_realtime_service_breakdown') as RpcResponse<any>
      if (queryError) throw queryError
      return data || {}
    } catch (e) {
      console.error('getRealtimeServiceBreakdown error:', e)
      return {}
    }
  }

  async function getLiveProviderStats() {
    try {
      const { data, error: queryError } = await (supabase.rpc as any)('get_live_provider_stats') as RpcResponse<any>
      if (queryError) throw queryError
      return data || {
        total_providers: 0,
        online_providers: 0,
        busy_providers: 0,
        by_type: {},
        pending_verification: 0
      }
    } catch (e) {
      console.error('getLiveProviderStats error:', e)
      return {
        total_providers: 0,
        online_providers: 0,
        busy_providers: 0,
        by_type: {},
        pending_verification: 0
      }
    }
  }

  async function getRevenueTrends() {
    try {
      const { data, error: queryError } = await (supabase.rpc as any)('get_revenue_trends') as RpcResponse<any[]>
      if (queryError) throw queryError
      return data || []
    } catch (e) {
      console.error('getRevenueTrends error:', e)
      return []
    }
  }

  // ============================================
  // ENHANCED PROVIDERS V2
  // ============================================

  async function getProvidersV2Enhanced(
    filters: {
      status?: string
      serviceType?: string
      isOnline?: boolean
      search?: string
    } = {},
    pagination: PaginationParams = { page: 1, limit: 20 },
    sorting: { sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<PaginatedResult<any>> {
    isLoading.value = true
    error.value = null

    try {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      console.log('[Admin API] getProvidersV2Enhanced called with:', { filters, pagination, sorting })

      const { data, error: queryError } = await (supabase.rpc as any)('get_all_providers_v2_for_admin', {
        p_status: filters.status || null,
        p_service_type: filters.serviceType || null,
        p_is_online: filters.isOnline ?? null,
        p_limit: limit,
        p_offset: offset,
        p_search: filters.search || null,
        p_sort_by: sorting.sortBy || 'created_at',
        p_sort_order: sorting.sortOrder || 'desc'
      }) as RpcResponse<any[]>

      if (queryError) {
        console.error('[Admin API] Enhanced RPC error:', queryError)
        throw queryError
      }

      // Get total count
      const { data: countData, error: countError } = await (supabase.rpc as any)('count_all_providers_v2_for_admin', {
        p_status: filters.status || null,
        p_service_type: filters.serviceType || null,
        p_is_online: filters.isOnline ?? null,
        p_search: filters.search || null
      }) as RpcResponse<number>

      if (countError) {
        console.error('[Admin API] Count RPC error:', countError)
        throw countError
      }

      const total = countData || 0

      console.log('[Admin API] Enhanced providers result:', { 
        dataLength: data?.length, 
        total, 
        totalPages: Math.ceil(total / limit),
        firstItem: data?.[0]
      })

      return {
        data: data || [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch enhanced providers'
      console.error('getProvidersV2Enhanced error:', e)
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 }
    } finally {
      isLoading.value = false
    }
  }

  async function getProvidersV2Analytics(): Promise<any> {
    try {
      console.log('[Admin API] getProvidersV2Analytics called')

      const { data, error: queryError } = await (supabase.rpc as any)('get_providers_v2_analytics_for_admin') as RpcResponse<any>

      if (queryError) {
        console.error('[Admin API] Analytics RPC error:', queryError)
        throw queryError
      }

      console.log('[Admin API] Analytics result:', data)

      return data || {
        overview: {
          total_providers: 0,
          active_providers: 0,
          pending_providers: 0,
          approved_providers: 0,
          suspended_providers: 0,
          online_providers: 0,
          new_this_month: 0,
          approved_this_month: 0,
          avg_rating: 0,
          total_trips_all: 0,
          total_earnings_all: 0
        },
        service_breakdown: [],
        monthly_performance: []
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch provider analytics'
      console.error('getProvidersV2Analytics error:', e)
      return {
        overview: {
          total_providers: 0,
          active_providers: 0,
          pending_providers: 0,
          approved_providers: 0,
          suspended_providers: 0,
          online_providers: 0,
          new_this_month: 0,
          approved_this_month: 0,
          avg_rating: 0,
          total_trips_all: 0,
          total_earnings_all: 0
        },
        service_breakdown: [],
        monthly_performance: []
      }
    }
  }

  async function approveProviderV2Enhanced(
    providerId: string,
    adminId?: string,
    serviceTypes?: string[],
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[Admin API] approveProviderV2Enhanced called with:', { providerId, adminId, serviceTypes, notes })

      const { data, error: queryError } = await (supabase.rpc as any)('approve_provider_v2_enhanced', {
        p_provider_id: providerId,
        p_admin_id: adminId || null,
        p_service_types: serviceTypes || null,
        p_notes: notes || null
      }) as RpcResponse<any>

      if (queryError) {
        console.error('[Admin API] Approve RPC error:', queryError)
        throw queryError
      }

      console.log('[Admin API] Approve result:', data)

      return data || { success: false, error: 'No response data' }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to approve provider'
      console.error('approveProviderV2Enhanced error:', e)
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }

  async function rejectProviderV2Enhanced(
    providerId: string,
    adminId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[Admin API] rejectProviderV2Enhanced called with:', { providerId, adminId, reason })

      const { data, error: queryError } = await (supabase.rpc as any)('reject_provider_v2_enhanced', {
        p_provider_id: providerId,
        p_admin_id: adminId || null,
        p_reason: reason || null
      }) as RpcResponse<any>

      if (queryError) {
        console.error('[Admin API] Reject RPC error:', queryError)
        throw queryError
      }

      console.log('[Admin API] Reject result:', data)

      return data || { success: false, error: 'No response data' }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to reject provider'
      console.error('rejectProviderV2Enhanced error:', e)
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
    }
  }

  async function suspendProviderV2Enhanced(
    providerId: string,
    adminId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[Admin API] suspendProviderV2Enhanced called with:', { providerId, adminId, reason })

      const { data, error: queryError } = await (supabase.rpc as any)('suspend_provider_v2_enhanced', {
        p_provider_id: providerId,
        p_admin_id: adminId || null,
        p_reason: reason || null
      }) as RpcResponse<any>

      if (queryError) {
        console.error('[Admin API] Suspend RPC error:', queryError)
        throw queryError
      }

      console.log('[Admin API] Suspend result:', data)

      return data || { success: false, error: 'No response data' }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to suspend provider'
      console.error('suspendProviderV2Enhanced error:', e)
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
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
    // Enhanced Providers V2
    getProvidersV2Enhanced,
    getProvidersV2Analytics,
    approveProviderV2Enhanced,
    rejectProviderV2Enhanced,
    suspendProviderV2Enhanced,
    // Orders
    getOrders: getOrdersEnhanced, // Use enhanced version as default
    getOrdersEnhanced,
    getOrdersAnalytics,
    bulkUpdateOrdersStatus,
    updateOrderStatus,
    // Services
    getDeliveries,
    getShopping,
    getQueueBookings,
    getMoving,
    getLaundry,
    getCancellations,
    getActiveProvidersLocations,
    // Scheduled Rides
    getScheduledRides,
    // Service Bundles
    getBundleTemplates,
    getServiceBundles,
    getServiceBundlesStats,
    // Dashboard
    getDashboardStats,
    // Real-time Analytics
    getRealtimeOrderStats,
    getRealtimeServiceBreakdown,
    getLiveProviderStats,
    getRevenueTrends
  }
}