/**
 * useRideHistory - Order History Composable
 * 
 * Feature: F11 - Ride History
 * Tables: ride_requests, delivery_requests, shopping_requests, ride_ratings, delivery_ratings, shopping_ratings
 * View: order_history_view (unified view with provider info)
 * 
 * @description
 * Fetches and manages order history for all service types (ride, delivery, shopping)
 * from the database with real-time data.
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface RideHistoryItem {
  id: string
  tracking_id: string  // Human-readable tracking ID (e.g., RID-20251215-000001)
  type: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  typeName: string
  from: string
  to: string
  date: string
  time: string
  fare: number
  status: 'completed' | 'cancelled'
  rating: number | null
  driver_name?: string
  driver_tracking_id?: string  // Driver tracking ID
  vehicle?: string
  created_at?: string  // For sorting
}

export interface ProviderInfo {
  id: string
  tracking_id: string | null
  name: string | null
  phone: string | null
  avatar_url: string | null
  vehicle_type: string | null
  vehicle_plate: string | null
  vehicle_color: string | null
  rating: number | null
}

export function useRideHistory() {
  const authStore = useAuthStore()
  const history = ref<RideHistoryItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const unratedRidesCount = ref(0)

  // Cache for provider info
  const providerCache = new Map<string, ProviderInfo>()

  // Fetch provider info by ID (with caching)
  const fetchProviderInfo = async (providerId: string): Promise<ProviderInfo | null> => {
    if (!providerId) return null

    // Check cache first
    if (providerCache.has(providerId)) {
      return providerCache.get(providerId) || null
    }

    try {
      const { data, error: err } = await (supabase
        .from('service_providers') as any)
        .select(`
          id,
          tracking_id,
          vehicle_type,
          vehicle_plate,
          vehicle_color,
          rating,
          user_id
        `)
        .eq('id', providerId)
        .maybeSingle()

      if (err || !data) return null

      // Fetch user info separately
      let userName = null
      let userPhone = null
      let userAvatar = null

      if (data.user_id) {
        const { data: userData } = await (supabase
          .from('users') as any)
          .select('name, phone_number, avatar_url')
          .eq('id', data.user_id)
          .maybeSingle()

        if (userData) {
          userName = userData.name
          userPhone = userData.phone_number
          userAvatar = userData.avatar_url
        }
      }

      const providerInfo: ProviderInfo = {
        id: data.id,
        tracking_id: data.tracking_id,
        name: userName,
        phone: userPhone,
        avatar_url: userAvatar,
        vehicle_type: data.vehicle_type,
        vehicle_plate: data.vehicle_plate,
        vehicle_color: data.vehicle_color,
        rating: data.rating
      }

      // Cache the result
      providerCache.set(providerId, providerInfo)

      return providerInfo
    } catch (err) {
      console.error('Error fetching provider info:', err)
      return null
    }
  }

  // Clear provider cache
  const clearProviderCache = () => {
    providerCache.clear()
  }

  // Fetch all order history (ride, delivery, shopping, queue, moving, laundry)
  const fetchHistory = async (filter?: 'all' | 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry') => {
    loading.value = true
    error.value = null

    try {
      if (!authStore.user?.id) {
        history.value = []
        return history.value
      }

      const userId = authStore.user.id
      const allItems: RideHistoryItem[] = []

      // Fetch rides if filter is 'all' or 'ride'
      if (!filter || filter === 'all' || filter === 'ride') {
        const { data: rides, error: ridesError } = await (supabase
          .from('ride_requests') as any)
          .select(`
            id,
            tracking_id,
            pickup_address,
            destination_address,
            ride_type,
            estimated_fare,
            final_fare,
            status,
            created_at,
            completed_at,
            provider_id
          `)
          .eq('user_id', userId)
          .in('status', ['completed', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(30)

        if (!ridesError && rides) {
          rides.forEach((item: any) => {
            allItems.push({
              id: item.id,
              tracking_id: item.tracking_id || `RID-${formatDateForId(item.created_at)}-000000`,
              type: 'ride',
              typeName: 'เรียกรถ',
              from: item.pickup_address?.split(',')[0] || 'ไม่ระบุ',
              to: item.destination_address?.split(',')[0] || 'ไม่ระบุ',
              date: formatDate(item.created_at),
              time: formatTime(item.created_at),
              fare: item.final_fare || item.estimated_fare || 0,
              status: item.status === 'completed' ? 'completed' : 'cancelled',
              rating: null,
              driver_name: undefined,
              driver_tracking_id: undefined,
              vehicle: item.ride_type,
              created_at: item.created_at
            })
          })
        }
      }

      // Fetch deliveries if filter is 'all' or 'delivery'
      if (!filter || filter === 'all' || filter === 'delivery') {
        const { data: deliveries, error: deliveriesError } = await (supabase
          .from('delivery_requests') as any)
          .select(`
            id,
            tracking_id,
            sender_address,
            recipient_address,
            estimated_fee,
            final_fee,
            status,
            created_at,
            delivered_at,
            provider_id
          `)
          .eq('user_id', userId)
          .in('status', ['delivered', 'completed', 'cancelled', 'failed'])
          .order('created_at', { ascending: false })
          .limit(30)

        if (!deliveriesError && deliveries) {
          deliveries.forEach((item: any) => {
            allItems.push({
              id: item.id,
              tracking_id: item.tracking_id || `DEL-${formatDateForId(item.created_at)}-000000`,
              type: 'delivery',
              typeName: 'ส่งของ',
              from: item.sender_address?.split(',')[0] || 'ไม่ระบุ',
              to: item.recipient_address?.split(',')[0] || 'ไม่ระบุ',
              date: formatDate(item.created_at),
              time: formatTime(item.created_at),
              fare: item.final_fee || item.estimated_fee || 0,
              status: ['delivered', 'completed'].includes(item.status) ? 'completed' : 'cancelled',
              rating: null,
              driver_name: undefined,
              driver_tracking_id: undefined,
              vehicle: undefined,
              created_at: item.created_at
            })
          })
        }
      }

      // Fetch shopping if filter is 'all' or 'shopping'
      if (!filter || filter === 'all' || filter === 'shopping') {
        const { data: shopping, error: shoppingError } = await (supabase
          .from('shopping_requests') as any)
          .select(`
            id,
            tracking_id,
            store_name,
            store_address,
            delivery_address,
            service_fee,
            total_cost,
            status,
            created_at,
            delivered_at,
            provider_id
          `)
          .eq('user_id', userId)
          .in('status', ['completed', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(30)

        if (!shoppingError && shopping) {
          shopping.forEach((item: any) => {
            allItems.push({
              id: item.id,
              tracking_id: item.tracking_id || `SHP-${formatDateForId(item.created_at)}-000000`,
              type: 'shopping',
              typeName: 'ซื้อของ',
              from: item.store_name || item.store_address?.split(',')[0] || 'ร้านค้า',
              to: item.delivery_address?.split(',')[0] || 'ไม่ระบุ',
              date: formatDate(item.created_at),
              time: formatTime(item.created_at),
              fare: item.total_cost || item.service_fee || 0,
              status: item.status === 'completed' ? 'completed' : 'cancelled',
              rating: null,
              driver_name: undefined,
              driver_tracking_id: undefined,
              vehicle: undefined,
              created_at: item.created_at
            })
          })
        }
      }

      // Fetch queue bookings if filter is 'all' or 'queue'
      if (!filter || filter === 'all' || filter === 'queue') {
        const { data: queues, error: queuesError } = await (supabase
          .from('queue_bookings') as any)
          .select(`
            id,
            tracking_id,
            category,
            place_name,
            place_address,
            scheduled_date,
            scheduled_time,
            service_fee,
            final_fee,
            status,
            created_at,
            completed_at,
            provider_id
          `)
          .eq('user_id', userId)
          .in('status', ['completed', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(30)

        if (!queuesError && queues) {
          queues.forEach((item: any) => {
            allItems.push({
              id: item.id,
              tracking_id: item.tracking_id || `QUE-${formatDateForId(item.created_at)}-000000`,
              type: 'queue',
              typeName: 'จองคิว',
              from: item.category || 'บริการ',
              to: item.place_name || item.place_address?.split(',')[0] || 'ไม่ระบุ',
              date: formatDate(item.created_at),
              time: formatTime(item.created_at),
              fare: item.final_fee || item.service_fee || 0,
              status: item.status === 'completed' ? 'completed' : 'cancelled',
              rating: null,
              driver_name: undefined,
              driver_tracking_id: undefined,
              created_at: item.created_at
            })
          })
        }
      }

      // Fetch moving requests if filter is 'all' or 'moving'
      if (!filter || filter === 'all' || filter === 'moving') {
        const { data: movings, error: movingsError } = await (supabase
          .from('moving_requests') as any)
          .select(`
            id,
            tracking_id,
            pickup_address,
            destination_address,
            service_type,
            estimated_price,
            final_price,
            status,
            created_at,
            completed_at,
            provider_id
          `)
          .eq('user_id', userId)
          .in('status', ['completed', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(30)

        if (!movingsError && movings) {
          movings.forEach((item: any) => {
            allItems.push({
              id: item.id,
              tracking_id: item.tracking_id || `MOV-${formatDateForId(item.created_at)}-000000`,
              type: 'moving',
              typeName: 'ขนย้าย',
              from: item.pickup_address?.split(',')[0] || 'ไม่ระบุ',
              to: item.destination_address?.split(',')[0] || 'ไม่ระบุ',
              date: formatDate(item.created_at),
              time: formatTime(item.created_at),
              fare: item.final_price || item.estimated_price || 0,
              status: item.status === 'completed' ? 'completed' : 'cancelled',
              rating: null,
              driver_name: undefined,
              driver_tracking_id: undefined,
              vehicle: item.service_type,
              created_at: item.created_at
            })
          })
        }
      }

      // Fetch laundry requests if filter is 'all' or 'laundry'
      if (!filter || filter === 'all' || filter === 'laundry') {
        const { data: laundries, error: laundriesError } = await (supabase
          .from('laundry_requests') as any)
          .select(`
            id,
            tracking_id,
            pickup_address,
            services,
            estimated_price,
            final_price,
            status,
            created_at,
            delivered_at,
            provider_id
          `)
          .eq('user_id', userId)
          .in('status', ['delivered', 'completed', 'cancelled'])
          .order('created_at', { ascending: false })
          .limit(30)

        if (!laundriesError && laundries) {
          laundries.forEach((item: any) => {
            allItems.push({
              id: item.id,
              tracking_id: item.tracking_id || `LAU-${formatDateForId(item.created_at)}-000000`,
              type: 'laundry',
              typeName: 'ซักรีด',
              from: item.pickup_address?.split(',')[0] || 'ไม่ระบุ',
              to: 'บริการซักรีด',
              date: formatDate(item.created_at),
              time: formatTime(item.created_at),
              fare: item.final_price || item.estimated_price || 0,
              status: ['delivered', 'completed'].includes(item.status) ? 'completed' : 'cancelled',
              rating: null,
              driver_name: undefined,
              driver_tracking_id: undefined,
              created_at: item.created_at
            })
          })
        }
      }

      // Sort all items by created_at descending
      allItems.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateB - dateA
      })

      history.value = allItems
      return history.value
    } catch (err: any) {
      console.error('Error fetching history:', err)
      error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดประวัติ'
      history.value = []
      return history.value
    } finally {
      loading.value = false
    }
  }

  // Get single order details by ID and type
  const getOrderDetails = async (orderId: string, orderType?: 'ride' | 'delivery' | 'shopping') => {
    try {
      // If type is known, query directly
      if (orderType === 'ride') {
        const { data } = await (supabase
          .from('ride_requests') as any)
          .select('*')
          .eq('id', orderId)
          .single()
        return data ? { ...data, orderType: 'ride' } : null
      }

      if (orderType === 'delivery') {
        const { data } = await (supabase
          .from('delivery_requests') as any)
          .select('*')
          .eq('id', orderId)
          .single()
        return data ? { ...data, orderType: 'delivery' } : null
      }

      if (orderType === 'shopping') {
        const { data } = await (supabase
          .from('shopping_requests') as any)
          .select('*')
          .eq('id', orderId)
          .single()
        return data ? { ...data, orderType: 'shopping' } : null
      }

      // If type is unknown, try all tables
      const { data: ride } = await (supabase
        .from('ride_requests') as any)
        .select('*')
        .eq('id', orderId)
        .maybeSingle()
      if (ride) return { ...ride, orderType: 'ride' }

      const { data: delivery } = await (supabase
        .from('delivery_requests') as any)
        .select('*')
        .eq('id', orderId)
        .maybeSingle()
      if (delivery) return { ...delivery, orderType: 'delivery' }

      const { data: shopping } = await (supabase
        .from('shopping_requests') as any)
        .select('*')
        .eq('id', orderId)
        .maybeSingle()
      if (shopping) return { ...shopping, orderType: 'shopping' }

      return null
    } catch (err) {
      console.error('Error fetching order details:', err)
      return null
    }
  }

  // Get order by tracking ID
  const getOrderByTrackingId = async (trackingId: string) => {
    try {
      // Determine type from tracking ID prefix
      if (trackingId.startsWith('RID-')) {
        const { data } = await (supabase
          .from('ride_requests') as any)
          .select('*')
          .eq('tracking_id', trackingId)
          .maybeSingle()
        return data ? { ...data, orderType: 'ride' } : null
      }

      if (trackingId.startsWith('DEL-')) {
        const { data } = await (supabase
          .from('delivery_requests') as any)
          .select('*')
          .eq('tracking_id', trackingId)
          .maybeSingle()
        return data ? { ...data, orderType: 'delivery' } : null
      }

      if (trackingId.startsWith('SHP-')) {
        const { data } = await (supabase
          .from('shopping_requests') as any)
          .select('*')
          .eq('tracking_id', trackingId)
          .maybeSingle()
        return data ? { ...data, orderType: 'shopping' } : null
      }

      return null
    } catch (err) {
      console.error('Error fetching order by tracking ID:', err)
      return null
    }
  }

  // Rebook a ride/delivery/shopping
  const rebookRide = (item: RideHistoryItem) => {
    // Return data needed to pre-fill a new request
    return {
      from: item.from,
      to: item.to,
      type: item.type,
      tracking_id: item.tracking_id
    }
  }

  // Fetch count of unrated completed orders (for badge display)
  const fetchUnratedRides = async () => {
    try {
      if (!authStore.user?.id) {
        unratedRidesCount.value = 0
        return 0
      }

      const userId = authStore.user.id
      let count = 0

      // Count unrated rides
      const { count: rideCount } = await supabase
        .from('ride_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .is('rated_at', null)

      count += rideCount || 0

      // Count unrated deliveries
      const { count: deliveryCount } = await supabase
        .from('delivery_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['delivered', 'completed'])
        .is('rated_at', null)

      count += deliveryCount || 0

      // Count unrated shopping
      const { count: shoppingCount } = await supabase
        .from('shopping_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .is('rated_at', null)

      count += shoppingCount || 0

      unratedRidesCount.value = count
      return count
    } catch (err) {
      console.error('Error fetching unrated rides count:', err)
      unratedRidesCount.value = 0
      return 0
    }
  }

  // Fetch unrated orders with details (for QuickRatingModal)
  const fetchUnratedOrdersDetails = async () => {
    try {
      if (!authStore.user?.id) return []

      const userId = authStore.user.id
      const unratedOrders: Array<{
        id: string
        type: 'ride' | 'delivery' | 'shopping'
        typeName: string
        from: string
        to: string
        date: string
        fare: number
        driverName?: string
      }> = []

      // Fetch unrated rides
      const { data: rides } = await supabase
        .from('ride_requests')
        .select(`
          id,
          pickup_address,
          destination_address,
          final_fare,
          estimated_fare,
          created_at
        `)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .is('rated_at', null)
        .order('created_at', { ascending: false })
        .limit(5)

      if (rides) {
        rides.forEach((r: any) => {
          unratedOrders.push({
            id: r.id,
            type: 'ride',
            typeName: 'เรียกรถ',
            from: r.pickup_address?.split(',')[0] || 'ไม่ระบุ',
            to: r.destination_address?.split(',')[0] || 'ไม่ระบุ',
            date: formatDate(r.created_at),
            fare: r.final_fare || r.estimated_fare || 0,
            driverName: undefined
          })
        })
      }

      // Fetch unrated deliveries
      const { data: deliveries } = await supabase
        .from('delivery_requests')
        .select(`
          id,
          sender_address,
          recipient_address,
          final_fee,
          estimated_fee,
          created_at
        `)
        .eq('user_id', userId)
        .in('status', ['delivered', 'completed'])
        .is('rated_at', null)
        .order('created_at', { ascending: false })
        .limit(5)

      if (deliveries) {
        deliveries.forEach((d: any) => {
          unratedOrders.push({
            id: d.id,
            type: 'delivery',
            typeName: 'ส่งของ',
            from: d.sender_address?.split(',')[0] || 'ไม่ระบุ',
            to: d.recipient_address?.split(',')[0] || 'ไม่ระบุ',
            date: formatDate(d.created_at),
            fare: d.final_fee || d.estimated_fee || 0,
            driverName: undefined
          })
        })
      }

      // Fetch unrated shopping
      const { data: shopping } = await supabase
        .from('shopping_requests')
        .select(`
          id,
          store_name,
          delivery_address,
          total_cost,
          service_fee,
          created_at
        `)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .is('rated_at', null)
        .order('created_at', { ascending: false })
        .limit(5)

      if (shopping) {
        shopping.forEach((s: any) => {
          unratedOrders.push({
            id: s.id,
            type: 'shopping',
            typeName: 'ซื้อของ',
            from: s.store_name || 'ร้านค้า',
            to: s.delivery_address?.split(',')[0] || 'ไม่ระบุ',
            date: formatDate(s.created_at),
            fare: s.total_cost || s.service_fee || 0,
            driverName: undefined
          })
        })
      }

      // Sort by date (newest first)
      return unratedOrders.slice(0, 5)
    } catch (err) {
      console.error('Error fetching unrated orders details:', err)
      return []
    }
  }

  // Submit rating for an order
  const submitRating = async (
    orderId: string,
    orderType: 'ride' | 'delivery' | 'shopping',
    rating: number,
    comment?: string
  ) => {
    try {
      if (!authStore.user?.id) return false

      const userId = authStore.user.id
      let ratingTable = ''
      let orderIdColumn = ''

      switch (orderType) {
        case 'ride':
          ratingTable = 'ride_ratings'
          orderIdColumn = 'ride_id'
          break
        case 'delivery':
          ratingTable = 'delivery_ratings'
          orderIdColumn = 'delivery_id'
          break
        case 'shopping':
          ratingTable = 'shopping_ratings'
          orderIdColumn = 'shopping_id'
          break
        default:
          return false
      }

      // Insert rating
      const { error: ratingError } = await (supabase
        .from(ratingTable) as any)
        .insert({
          [orderIdColumn]: orderId,
          user_id: userId,
          rating,
          comment: comment || null
        })

      if (ratingError) {
        console.error('Error submitting rating:', ratingError)
        return false
      }

      // Update unrated count
      await fetchUnratedRides()
      
      return true
    } catch (err) {
      console.error('Error submitting rating:', err)
      return false
    }
  }

  // Skip rating (mark as rated without actual rating)
  const skipRating = async (orderId: string, orderType: string) => {
    try {
      // Call database function to mark as rated
      const { error } = await (supabase.rpc as any)('mark_order_rated', {
        p_order_id: orderId,
        p_order_type: orderType
      })

      if (error) {
        console.error('Error skipping rating:', error)
        return false
      }

      // Update unrated count
      await fetchUnratedRides()
      
      return true
    } catch (err) {
      console.error('Error skipping rating:', err)
      return false
    }
  }

  // Fetch history using the unified view (more efficient)
  const fetchHistoryFromView = async (
    filter?: 'all' | 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry',
    limit = 30
  ) => {
    loading.value = true
    error.value = null

    try {
      if (!authStore.user?.id) {
        history.value = []
        return history.value
      }

      const serviceType = filter === 'all' ? null : filter
      const statuses = ['completed', 'cancelled', 'delivered']

      const { data, error: err } = await (supabase.rpc as any)('get_user_order_history', {
        p_user_id: authStore.user.id,
        p_service_type: serviceType,
        p_status: statuses,
        p_limit: limit
      })

      if (err) {
        console.warn('View query failed, falling back to direct queries:', err)
        // Fallback to direct queries
        return fetchHistory(filter)
      }

      if (data) {
        const typeNames: Record<string, string> = {
          ride: 'เรียกรถ',
          delivery: 'ส่งของ',
          shopping: 'ซื้อของ',
          queue: 'จองคิว',
          moving: 'ขนย้าย',
          laundry: 'ซักรีด'
        }

        history.value = (data as any[]).map((item: any) => ({
          id: item.id,
          tracking_id: item.tracking_id,
          type: item.service_type,
          typeName: typeNames[item.service_type] || item.service_type,
          from: item.from_address?.split(',')[0] || 'ไม่ระบุ',
          to: item.to_address?.split(',')[0] || 'ไม่ระบุ',
          date: formatDate(item.created_at),
          time: formatTime(item.created_at),
          fare: item.final_price || 0,
          status: ['completed', 'delivered'].includes(item.status) ? 'completed' : 'cancelled',
          rating: item.customer_rating || null,
          driver_name: item.provider_name,
          driver_tracking_id: item.provider_tracking_id,
          vehicle: item.vehicle_type || item.service_subtype,
          created_at: item.created_at
        }))
      }

      return history.value
    } catch (err: any) {
      console.error('Error fetching history from view:', err)
      // Fallback to direct queries
      return fetchHistory(filter)
    } finally {
      loading.value = false
    }
  }

  return {
    history,
    loading,
    error,
    unratedRidesCount,
    fetchHistory,
    fetchHistoryFromView,
    fetchProviderInfo,
    clearProviderCache,
    fetchUnratedRides,
    fetchUnratedOrdersDetails,
    submitRating,
    skipRating,
    getOrderDetails,
    getOrderByTrackingId,
    rebookRide
  }
}

// Helper functions
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function formatDateForId(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}
