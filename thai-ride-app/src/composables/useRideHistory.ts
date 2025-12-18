/**
 * useRideHistory - Order History Composable
 * 
 * Feature: F11 - Ride History
 * Tables: ride_requests, delivery_requests, shopping_requests, ride_ratings, delivery_ratings, shopping_ratings
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

export function useRideHistory() {
  const authStore = useAuthStore()
  const history = ref<RideHistoryItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const unratedRidesCount = ref(0)

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
            provider:provider_id (
              tracking_id,
              vehicle_type,
              vehicle_plate,
              users:user_id (name)
            ),
            rating:ride_ratings (rating)
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
              rating: item.rating?.[0]?.rating || null,
              driver_name: item.provider?.users?.name,
              driver_tracking_id: item.provider?.tracking_id,
              vehicle: item.provider?.vehicle_type,
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
            provider:provider_id (
              tracking_id,
              vehicle_type,
              vehicle_plate,
              users:user_id (name)
            ),
            rating:delivery_ratings (rating)
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
              rating: item.rating?.[0]?.rating || null,
              driver_name: item.provider?.users?.name,
              driver_tracking_id: item.provider?.tracking_id,
              vehicle: item.provider?.vehicle_type,
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
            provider:provider_id (
              tracking_id,
              vehicle_type,
              vehicle_plate,
              users:user_id (name)
            ),
            rating:shopping_ratings (rating)
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
              rating: item.rating?.[0]?.rating || null,
              driver_name: item.provider?.users?.name,
              driver_tracking_id: item.provider?.tracking_id,
              vehicle: item.provider?.vehicle_type,
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
            service_name,
            location_name,
            location_address,
            booking_date,
            booking_time,
            estimated_price,
            final_price,
            status,
            created_at,
            completed_at,
            provider:provider_id (
              tracking_id,
              users:user_id (name)
            ),
            rating:queue_ratings (rating)
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
              from: item.service_name || 'บริการ',
              to: item.location_name || item.location_address?.split(',')[0] || 'ไม่ระบุ',
              date: formatDate(item.created_at),
              time: formatTime(item.created_at),
              fare: item.final_price || item.estimated_price || 0,
              status: item.status === 'completed' ? 'completed' : 'cancelled',
              rating: item.rating?.[0]?.rating || null,
              driver_name: item.provider?.users?.name,
              driver_tracking_id: item.provider?.tracking_id,
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
            provider:provider_id (
              tracking_id,
              vehicle_type,
              users:user_id (name)
            ),
            rating:moving_ratings (rating)
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
              rating: item.rating?.[0]?.rating || null,
              driver_name: item.provider?.users?.name,
              driver_tracking_id: item.provider?.tracking_id,
              vehicle: item.provider?.vehicle_type,
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
            delivery_address,
            service_type,
            estimated_price,
            final_price,
            status,
            created_at,
            delivered_at,
            provider:provider_id (
              tracking_id,
              users:user_id (name)
            ),
            rating:laundry_ratings (rating)
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
              to: item.delivery_address?.split(',')[0] || 'ไม่ระบุ',
              date: formatDate(item.created_at),
              time: formatTime(item.created_at),
              fare: item.final_price || item.estimated_price || 0,
              status: ['delivered', 'completed'].includes(item.status) ? 'completed' : 'cancelled',
              rating: item.rating?.[0]?.rating || null,
              driver_name: item.provider?.users?.name,
              driver_tracking_id: item.provider?.tracking_id,
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
          .select(`
            *,
            provider:provider_id (
              tracking_id,
              vehicle_type,
              vehicle_plate,
              rating,
              users:user_id (name, avatar_url, phone)
            ),
            rating:ride_ratings (rating, comment, tip_amount)
          `)
          .eq('id', orderId)
          .single()
        return data ? { ...data, orderType: 'ride' } : null
      }

      if (orderType === 'delivery') {
        const { data } = await (supabase
          .from('delivery_requests') as any)
          .select(`
            *,
            provider:provider_id (
              tracking_id,
              vehicle_type,
              vehicle_plate,
              rating,
              users:user_id (name, avatar_url, phone)
            ),
            rating:delivery_ratings (rating, comment, tip_amount)
          `)
          .eq('id', orderId)
          .single()
        return data ? { ...data, orderType: 'delivery' } : null
      }

      if (orderType === 'shopping') {
        const { data } = await (supabase
          .from('shopping_requests') as any)
          .select(`
            *,
            provider:provider_id (
              tracking_id,
              vehicle_type,
              vehicle_plate,
              rating,
              users:user_id (name, avatar_url, phone)
            ),
            rating:shopping_ratings (rating, comment, tip_amount)
          `)
          .eq('id', orderId)
          .single()
        return data ? { ...data, orderType: 'shopping' } : null
      }

      // If type is unknown, try all tables
      const { data: ride } = await (supabase
        .from('ride_requests') as any)
        .select('*')
        .eq('id', orderId)
        .single()
      if (ride) return { ...ride, orderType: 'ride' }

      const { data: delivery } = await (supabase
        .from('delivery_requests') as any)
        .select('*')
        .eq('id', orderId)
        .single()
      if (delivery) return { ...delivery, orderType: 'delivery' }

      const { data: shopping } = await (supabase
        .from('shopping_requests') as any)
        .select('*')
        .eq('id', orderId)
        .single()
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
          .select(`
            *,
            provider:provider_id (
              tracking_id,
              vehicle_type,
              vehicle_plate,
              vehicle_color,
              rating,
              current_lat,
              current_lng,
              users:user_id (name, avatar_url, phone)
            )
          `)
          .eq('tracking_id', trackingId)
          .single()
        return data ? { ...data, orderType: 'ride' } : null
      }

      if (trackingId.startsWith('DEL-')) {
        const { data } = await (supabase
          .from('delivery_requests') as any)
          .select(`
            *,
            provider:provider_id (
              tracking_id,
              vehicle_type,
              vehicle_plate,
              rating,
              current_lat,
              current_lng,
              users:user_id (name, avatar_url, phone)
            )
          `)
          .eq('tracking_id', trackingId)
          .single()
        return data ? { ...data, orderType: 'delivery' } : null
      }

      if (trackingId.startsWith('SHP-')) {
        const { data } = await (supabase
          .from('shopping_requests') as any)
          .select(`
            *,
            provider:provider_id (
              tracking_id,
              vehicle_type,
              vehicle_plate,
              rating,
              current_lat,
              current_lng,
              users:user_id (name, avatar_url, phone)
            )
          `)
          .eq('tracking_id', trackingId)
          .single()
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

  return {
    history,
    loading,
    error,
    unratedRidesCount,
    fetchHistory,
    fetchUnratedRides,
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
