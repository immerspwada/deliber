/**
 * useProvider - Provider/Rider Composable
 * Feature: F14 - Provider Dashboard
 */

import { ref, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useProviderEarnings } from './useProviderEarnings'

export interface ProviderProfile {
  id: string
  user_id: string
  provider_type: 'driver' | 'delivery' | 'both'
  license_number: string | null
  vehicle_type: string | null
  vehicle_plate: string | null
  vehicle_color: string | null
  is_verified: boolean
  is_available: boolean
  rating: number
  total_trips: number
  current_lat: number | null
  current_lng: number | null
}

export interface RideRequest {
  id: string
  tracking_id?: string
  user_id: string
  pickup_lat: number
  pickup_lng: number
  pickup_address: string
  destination_lat: number
  destination_lng: number
  destination_address: string
  ride_type: 'standard' | 'premium' | 'shared'
  estimated_fare: number
  status: string
  created_at: string
  distance?: number
  duration?: number
  passenger_name?: string
  passenger_phone?: string
  passenger_rating?: number
}

export interface ActiveRide {
  id: string
  tracking_id: string
  passenger: { id: string; name: string; phone: string; rating: number; photo?: string }
  pickup: { lat: number; lng: number; address: string }
  destination: { lat: number; lng: number; address: string }
  fare: number
  status: 'matched' | 'arriving' | 'arrived' | 'picked_up' | 'in_progress' | 'completed'
  distance: number
  duration: number
  ride_type: string
  created_at: string
}

export interface EarningsSummary {
  today: number; thisWeek: number; thisMonth: number
  todayTrips: number; weekTrips: number; monthTrips: number
}

export interface DailyEarning {
  date: string; day: string; earnings: number; trips: number; hours_online: number
}

// Delivery Request Interface
export interface DeliveryRequest {
  id: string
  tracking_id?: string
  user_id: string
  type: 'delivery'
  sender_name: string
  sender_phone: string
  sender_address: string
  sender_lat: number
  sender_lng: number
  recipient_name: string
  recipient_address: string
  recipient_lat: number
  recipient_lng: number
  package_type: string
  package_description?: string
  estimated_fee: number
  distance_km?: number
  status: string
  created_at: string
  customer_name?: string
}

// Shopping Request Interface
export interface ShoppingRequest {
  id: string
  tracking_id?: string
  user_id: string
  type: 'shopping'
  store_name?: string
  store_address?: string
  store_lat?: number
  store_lng?: number
  delivery_address: string
  delivery_lat: number
  delivery_lng: number
  items: any[]
  item_list?: string
  budget_limit: number
  service_fee: number
  special_instructions?: string
  status: string
  created_at: string
  customer_name?: string
}

// Active Job (can be ride, delivery, or shopping)
export interface ActiveJob {
  id: string
  tracking_id: string
  type: 'ride' | 'delivery' | 'shopping'
  customer: { id: string; name: string; phone: string; rating?: number }
  pickup: { lat: number; lng: number; address: string }
  destination: { lat: number; lng: number; address: string }
  fare: number
  status: string
  distance?: number
  created_at: string
  // Delivery specific
  package_type?: string
  package_description?: string
  recipient_name?: string
  recipient_phone?: string
  // Shopping specific
  store_name?: string
  items?: any[]
  item_list?: string
  budget_limit?: number
}

export function useProvider() {
  const authStore = useAuthStore()
  const { startOnlineSession, endOnlineSession } = useProviderEarnings()
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  const profile = ref<ProviderProfile | null>(null)
  const isOnline = ref(false)
  const pendingRequests = ref<RideRequest[]>([])
  const pendingDeliveries = ref<DeliveryRequest[]>([])
  const pendingShopping = ref<ShoppingRequest[]>([])
  const activeRide = ref<ActiveRide | null>(null)
  const activeJob = ref<ActiveJob | null>(null)
  const earnings = ref<EarningsSummary>({ today: 0, thisWeek: 0, thisMonth: 0, todayTrips: 0, weekTrips: 0, monthTrips: 0 })
  const weeklyEarnings = ref<DailyEarning[]>([])
  
  let requestsSubscription: any = null
  let rideSubscription: any = null
  let jobSubscription: any = null
  let locationInterval: number | null = null
  let reconnectTimeout: number | null = null
  let fetchInterval: number | null = null

  const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'
  const hasActiveRide = () => activeRide.value !== null
  const hasActiveJob = () => activeJob.value !== null

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  const fetchProfile = async () => {
    loading.value = true
    try {
      if (isDemoMode()) {
        const demoUser = JSON.parse(localStorage.getItem('demo_user') || '{}')
        profile.value = {
          id: 'demo-provider-' + (demoUser.role || 'driver'), user_id: demoUser.id || 'demo-user',
          provider_type: demoUser.role === 'driver' ? 'driver' : 'delivery',
          license_number: 'กข 1234', vehicle_type: demoUser.role === 'driver' ? 'รถยนต์' : 'มอเตอร์ไซค์',
          vehicle_plate: 'กข 1234 กรุงเทพ', vehicle_color: 'สีดำ',
          is_verified: true, is_available: false, rating: 4.8, total_trips: 156,
          current_lat: 13.7563, current_lng: 100.5018
        }
        isOnline.value = false
        return profile.value
      }
      if (!authStore.user?.id) { profile.value = null; return null }
      const { data } = await (supabase.from('service_providers') as any).select('*').eq('user_id', authStore.user.id).single()
      if (!data) { profile.value = null; return null }
      profile.value = data as ProviderProfile
      isOnline.value = data.is_available || false
      return data
    } catch (e: any) { error.value = e.message; return null }
    finally { loading.value = false }
  }

  const updateProfile = async (updates: Record<string, any>) => {
    loading.value = true
    error.value = null
    try {
      if (!profile.value?.id) {
        await fetchProfile()
        if (!profile.value?.id) throw new Error('ไม่พบข้อมูลผู้ให้บริการ')
      }
      
      if (isDemoMode()) {
        // Demo mode: update local profile
        profile.value = { ...profile.value, ...updates } as ProviderProfile
        return profile.value
      }
      
      const { data, error: updateError } = await (supabase.from('service_providers') as any)
        .update(updates)
        .eq('id', profile.value.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      if (data) profile.value = data as ProviderProfile
      return data
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchEarnings = async () => {
    if (!profile.value?.id) return
    if (isDemoMode()) {
      earnings.value = { today: 1250, thisWeek: 8500, thisMonth: 32000, todayTrips: 8, weekTrips: 45, monthTrips: 180 }
      weeklyEarnings.value = [
        { date: '2025-12-10', day: 'จ.', earnings: 1200, trips: 7, hours_online: 8 },
        { date: '2025-12-11', day: 'อ.', earnings: 1450, trips: 9, hours_online: 9 },
        { date: '2025-12-12', day: 'พ.', earnings: 980, trips: 5, hours_online: 6 },
        { date: '2025-12-13', day: 'พฤ.', earnings: 1680, trips: 10, hours_online: 10 },
        { date: '2025-12-14', day: 'ศ.', earnings: 1890, trips: 11, hours_online: 11 },
        { date: '2025-12-15', day: 'ส.', earnings: 1050, trips: 6, hours_online: 7 },
        { date: '2025-12-16', day: 'อา.', earnings: 1250, trips: 8, hours_online: 8 }
      ]
      return
    }
    try {
      const { data } = await (supabase.rpc as any)('get_provider_earnings_summary', { p_provider_id: profile.value.id })
      if (data?.[0]) {
        earnings.value = {
          today: data[0].today_earnings || 0, thisWeek: data[0].week_earnings || 0, thisMonth: data[0].month_earnings || 0,
          todayTrips: data[0].today_trips || 0, weekTrips: data[0].week_trips || 0, monthTrips: data[0].month_trips || 0
        }
      }
    } catch (e) { console.warn('Error fetching earnings:', e) }
  }

  const toggleOnline = async (online: boolean, location?: { lat: number; lng: number }) => {
    loading.value = true
    error.value = null
    try {
      if (!profile.value?.id) await fetchProfile()
      if (isDemoMode()) {
        isOnline.value = online
        if (profile.value?.id) {
          if (online) await startOnlineSession(profile.value.id)
          else await endOnlineSession(profile.value.id)
        }
        if (online) { subscribeToRequests(); startLocationUpdates() }
        else { unsubscribeFromRequests(); stopLocationUpdates(); pendingRequests.value = [] }
        return true
      }
      if (!profile.value?.id) throw new Error('ไม่พบข้อมูลผู้ให้บริการ')
      const { data, error: updateError } = await (supabase.rpc as any)('set_provider_availability', {
        p_provider_id: profile.value.id, p_is_available: online, p_lat: location?.lat || null, p_lng: location?.lng || null
      })
      if (updateError) throw updateError
      if (data?.[0] && !data[0].success) throw new Error(data[0].message)
      if (online) await startOnlineSession(profile.value.id)
      else await endOnlineSession(profile.value.id)
      isOnline.value = online
      if (online) { subscribeToRequests(); startLocationUpdates(); await fetchPendingRequests() }
      else { unsubscribeFromRequests(); stopLocationUpdates(); pendingRequests.value = [] }
      return true
    } catch (e: any) { error.value = e.message; return false }
    finally { loading.value = false }
  }

  const fetchPendingRequests = async () => {
    if (!profile.value?.id) return
    try {
      const { data: requests } = await (supabase.rpc as any)('get_available_rides_for_provider', { p_provider_id: profile.value.id, p_radius_km: 10 })
      if (requests?.length > 0) {
        pendingRequests.value = requests.map((r: any) => ({
          id: r.ride_id, tracking_id: r.tracking_id, user_id: r.user_id,
          pickup_lat: r.pickup_lat, pickup_lng: r.pickup_lng, pickup_address: r.pickup_address,
          destination_lat: r.destination_lat, destination_lng: r.destination_lng, destination_address: r.destination_address,
          ride_type: r.ride_type || 'standard', estimated_fare: r.estimated_fare || 0, status: 'pending', created_at: r.created_at,
          distance: r.ride_distance, duration: Math.ceil((r.ride_distance || 1) * 3),
          passenger_name: r.passenger_name, passenger_phone: r.passenger_phone, passenger_rating: r.passenger_rating || 4.5
        }))
      } else { pendingRequests.value = [] }
    } catch (e) { console.warn('Error fetching requests:', e) }
  }

  const subscribeToRequests = () => {
    if (!profile.value?.id) return
    unsubscribeFromRequests()
    requestsSubscription = supabase.channel('pending_ride_requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_requests' }, async (payload) => {
        const request = payload.new as any
        if (request.status !== 'pending' || request.provider_id) return
        let shouldAdd = true
        if (profile.value?.current_lat && profile.value?.current_lng) {
          shouldAdd = calculateDistance(profile.value.current_lat, profile.value.current_lng, request.pickup_lat, request.pickup_lng) <= 10
        }
        if (shouldAdd && !pendingRequests.value.some(r => r.id === request.id)) {
          pendingRequests.value.unshift({
            id: request.id, tracking_id: request.tracking_id, user_id: request.user_id,
            pickup_lat: request.pickup_lat, pickup_lng: request.pickup_lng, pickup_address: request.pickup_address,
            destination_lat: request.destination_lat, destination_lng: request.destination_lng, destination_address: request.destination_address,
            ride_type: request.ride_type || 'standard', estimated_fare: request.estimated_fare || 0, status: request.status, created_at: request.created_at,
            distance: calculateDistance(request.pickup_lat, request.pickup_lng, request.destination_lat, request.destination_lng),
            duration: 15, passenger_name: 'ผู้โดยสาร', passenger_phone: '', passenger_rating: 4.5
          })
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ride_requests' }, (payload) => {
        const request = payload.new as any
        if (request.status !== 'pending' || request.provider_id) {
          pendingRequests.value = pendingRequests.value.filter(r => r.id !== request.id)
        }
      })
      .subscribe((status) => { if (status === 'CHANNEL_ERROR') scheduleReconnect() })
    fetchInterval = window.setInterval(() => { if (isOnline.value && !activeRide.value) fetchPendingRequests() }, 30000)
  }

  const scheduleReconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    reconnectTimeout = window.setTimeout(() => { if (isOnline.value) subscribeToRequests() }, 5000)
  }

  const unsubscribeFromRequests = () => {
    if (requestsSubscription) { requestsSubscription.unsubscribe(); requestsSubscription = null }
    if (fetchInterval) { clearInterval(fetchInterval); fetchInterval = null }
  }

  const acceptRide = async (requestId: string) => {
    loading.value = true
    error.value = null
    try {
      if (!profile.value?.id) throw new Error('ไม่พบข้อมูลผู้ให้บริการ')
      if (isDemoMode() || profile.value.id.startsWith('demo')) {
        const request = pendingRequests.value.find(r => r.id === requestId)
        if (!request) throw new Error('ไม่พบคำขอนี้')
        activeRide.value = {
          id: request.id, tracking_id: request.tracking_id || 'TR' + request.id.slice(0, 8).toUpperCase(),
          passenger: { id: request.user_id, name: request.passenger_name || 'ผู้โดยสาร', phone: request.passenger_phone || '', rating: request.passenger_rating || 4.5 },
          pickup: { lat: request.pickup_lat, lng: request.pickup_lng, address: request.pickup_address },
          destination: { lat: request.destination_lat, lng: request.destination_lng, address: request.destination_address },
          fare: request.estimated_fare, status: 'matched', distance: request.distance || 0, duration: request.duration || 0,
          ride_type: request.ride_type, created_at: request.created_at
        }
        pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
        return true
      }
      const { data, error: acceptError } = await (supabase.rpc as any)('accept_ride_request', { p_ride_id: requestId, p_provider_id: profile.value.id })
      if (acceptError) throw acceptError
      const result = data?.[0]
      if (!result?.success) {
        pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
        throw new Error(result?.message || 'ไม่สามารถรับงานได้')
      }
      const rideData = result.ride_data
      activeRide.value = {
        id: rideData.id, tracking_id: rideData.tracking_id || 'TR' + rideData.id.slice(0, 8).toUpperCase(),
        passenger: { id: rideData.passenger?.id || rideData.user_id, name: rideData.passenger?.name || 'ผู้โดยสาร', phone: rideData.passenger?.phone || '', rating: 4.5, photo: rideData.passenger?.avatar_url },
        pickup: { lat: rideData.pickup_lat, lng: rideData.pickup_lng, address: rideData.pickup_address },
        destination: { lat: rideData.destination_lat, lng: rideData.destination_lng, address: rideData.destination_address },
        fare: rideData.estimated_fare, status: 'matched',
        distance: calculateDistance(rideData.pickup_lat, rideData.pickup_lng, rideData.destination_lat, rideData.destination_lng),
        duration: 15, ride_type: rideData.ride_type || 'standard', created_at: rideData.created_at
      }
      pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
      subscribeToRide(requestId)
      return true
    } catch (e: any) { error.value = e.message; return false }
    finally { loading.value = false }
  }

  const declineRide = (requestId: string) => {
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
  }

  const updateRideStatus = async (status: ActiveRide['status']) => {
    if (!activeRide.value) return false
    loading.value = true
    try {
      let dbStatus: string = status
      if (status === 'arriving' || status === 'arrived') dbStatus = 'pickup'
      if (status === 'picked_up') dbStatus = 'in_progress'
      if (isDemoMode() || profile.value?.id?.startsWith('demo')) {
        activeRide.value.status = status
        if (status === 'completed') {
          earnings.value.today += activeRide.value.fare
          earnings.value.todayTrips += 1
          setTimeout(() => { activeRide.value = null; unsubscribeFromRide() }, 3000)
        }
        return true
      }
      const { data, error: updateError } = await (supabase.rpc as any)('update_ride_status', {
        p_ride_id: activeRide.value.id, p_provider_id: profile.value?.id, p_new_status: dbStatus
      })
      if (updateError) throw updateError
      if (data?.[0] && !data[0].success) throw new Error(data[0].message || 'ไม่สามารถอัพเดทสถานะได้')
      activeRide.value.status = status
      if (status === 'completed') {
        earnings.value.today += activeRide.value.fare
        earnings.value.todayTrips += 1
        setTimeout(() => { activeRide.value = null; unsubscribeFromRide() }, 3000)
      }
      return true
    } catch (e: any) { error.value = e.message; return false }
    finally { loading.value = false }
  }

  const cancelActiveRide = async (reason?: string) => {
    if (!activeRide.value) return false
    loading.value = true
    try {
      if (isDemoMode()) { activeRide.value = null; return true }
      await (supabase.from('ride_requests') as any).update({ status: 'cancelled', cancel_reason: reason }).eq('id', activeRide.value.id)
      activeRide.value = null
      unsubscribeFromRide()
      return true
    } catch (e: any) { error.value = e.message; return false }
    finally { loading.value = false }
  }

  const completeRide = () => updateRideStatus('completed')

  // =====================================================
  // DELIVERY FUNCTIONS
  // =====================================================
  const fetchPendingDeliveries = async () => {
    if (!profile.value?.id) return
    try {
      const { data } = await (supabase.rpc as any)('get_available_deliveries_for_provider', { p_provider_id: profile.value.id, p_radius_km: 10 })
      if (data?.length > 0) {
        pendingDeliveries.value = data.map((d: any) => ({
          id: d.delivery_id, tracking_id: d.tracking_id, user_id: d.user_id, type: 'delivery' as const,
          sender_name: d.sender_name, sender_phone: d.sender_phone, sender_address: d.sender_address,
          sender_lat: d.sender_lat, sender_lng: d.sender_lng,
          recipient_name: d.recipient_name, recipient_address: d.recipient_address,
          recipient_lat: d.recipient_lat, recipient_lng: d.recipient_lng,
          package_type: d.package_type, package_description: d.package_description,
          estimated_fee: d.estimated_fee || 0, distance_km: d.distance_km,
          status: 'pending', created_at: d.created_at, customer_name: d.customer_name
        }))
      } else { pendingDeliveries.value = [] }
    } catch (e) { console.warn('Error fetching deliveries:', e) }
  }

  const acceptDelivery = async (deliveryId: string) => {
    loading.value = true
    error.value = null
    try {
      if (!profile.value?.id) throw new Error('ไม่พบข้อมูลผู้ให้บริการ')
      const { data, error: acceptError } = await (supabase.rpc as any)('accept_delivery_request', { p_delivery_id: deliveryId, p_provider_id: profile.value.id })
      if (acceptError) throw acceptError
      const result = data?.[0]
      if (!result?.success) {
        pendingDeliveries.value = pendingDeliveries.value.filter(d => d.id !== deliveryId)
        throw new Error(result?.message || 'ไม่สามารถรับงานได้')
      }
      const deliveryData = result.delivery_data
      activeJob.value = {
        id: deliveryData.id, tracking_id: deliveryData.tracking_id, type: 'delivery',
        customer: { id: deliveryData.customer?.id, name: deliveryData.customer?.name || 'ลูกค้า', phone: deliveryData.customer?.phone || '' },
        pickup: { lat: deliveryData.sender_lat, lng: deliveryData.sender_lng, address: deliveryData.sender_address },
        destination: { lat: deliveryData.recipient_lat, lng: deliveryData.recipient_lng, address: deliveryData.recipient_address },
        fare: deliveryData.estimated_fee, status: 'matched', created_at: new Date().toISOString(),
        package_type: deliveryData.package_type, package_description: deliveryData.package_description,
        recipient_name: deliveryData.recipient_name, recipient_phone: deliveryData.recipient_phone
      }
      pendingDeliveries.value = pendingDeliveries.value.filter(d => d.id !== deliveryId)
      subscribeToJob(deliveryId, 'delivery')
      return true
    } catch (e: any) { error.value = e.message; return false }
    finally { loading.value = false }
  }

  const updateDeliveryStatus = async (status: 'pickup' | 'in_transit' | 'delivered') => {
    if (!activeJob.value || activeJob.value.type !== 'delivery') return false
    loading.value = true
    try {
      const { data, error: updateError } = await (supabase.rpc as any)('update_delivery_status', {
        p_delivery_id: activeJob.value.id, p_provider_id: profile.value?.id, p_new_status: status
      })
      if (updateError) throw updateError
      if (data?.[0] && !data[0].success) throw new Error(data[0].message || 'ไม่สามารถอัพเดทสถานะได้')
      activeJob.value.status = status
      if (status === 'delivered') {
        earnings.value.today += activeJob.value.fare
        earnings.value.todayTrips += 1
        setTimeout(() => { activeJob.value = null; unsubscribeFromJob() }, 3000)
      }
      return true
    } catch (e: any) { error.value = e.message; return false }
    finally { loading.value = false }
  }

  // =====================================================
  // SHOPPING FUNCTIONS
  // =====================================================
  const fetchPendingShopping = async () => {
    if (!profile.value?.id) return
    try {
      const { data } = await (supabase.rpc as any)('get_available_shopping_for_provider', { p_provider_id: profile.value.id, p_radius_km: 10 })
      if (data?.length > 0) {
        pendingShopping.value = data.map((s: any) => ({
          id: s.shopping_id, tracking_id: s.tracking_id, user_id: s.user_id, type: 'shopping' as const,
          store_name: s.store_name, store_address: s.store_address, store_lat: s.store_lat, store_lng: s.store_lng,
          delivery_address: s.delivery_address, delivery_lat: s.delivery_lat, delivery_lng: s.delivery_lng,
          items: s.items || [], item_list: s.item_list, budget_limit: s.budget_limit, service_fee: s.service_fee || 0,
          special_instructions: s.special_instructions, status: 'pending', created_at: s.created_at, customer_name: s.customer_name
        }))
      } else { pendingShopping.value = [] }
    } catch (e) { console.warn('Error fetching shopping:', e) }
  }

  const acceptShopping = async (shoppingId: string) => {
    loading.value = true
    error.value = null
    try {
      if (!profile.value?.id) throw new Error('ไม่พบข้อมูลผู้ให้บริการ')
      const { data, error: acceptError } = await (supabase.rpc as any)('accept_shopping_request', { p_shopping_id: shoppingId, p_provider_id: profile.value.id })
      if (acceptError) throw acceptError
      const result = data?.[0]
      if (!result?.success) {
        pendingShopping.value = pendingShopping.value.filter(s => s.id !== shoppingId)
        throw new Error(result?.message || 'ไม่สามารถรับงานได้')
      }
      const shoppingData = result.shopping_data
      activeJob.value = {
        id: shoppingData.id, tracking_id: shoppingData.tracking_id, type: 'shopping',
        customer: { id: shoppingData.customer?.id, name: shoppingData.customer?.name || 'ลูกค้า', phone: shoppingData.customer?.phone || '' },
        pickup: { lat: shoppingData.store_lat || 0, lng: shoppingData.store_lng || 0, address: shoppingData.store_address || 'ร้านค้า' },
        destination: { lat: shoppingData.delivery_lat, lng: shoppingData.delivery_lng, address: shoppingData.delivery_address },
        fare: shoppingData.service_fee, status: 'matched', created_at: new Date().toISOString(),
        store_name: shoppingData.store_name, items: shoppingData.items, item_list: shoppingData.item_list, budget_limit: shoppingData.budget_limit
      }
      pendingShopping.value = pendingShopping.value.filter(s => s.id !== shoppingId)
      subscribeToJob(shoppingId, 'shopping')
      return true
    } catch (e: any) { error.value = e.message; return false }
    finally { loading.value = false }
  }

  const updateShoppingStatus = async (status: 'shopping' | 'delivering' | 'completed', itemsCost?: number) => {
    if (!activeJob.value || activeJob.value.type !== 'shopping') return false
    loading.value = true
    try {
      const { data, error: updateError } = await (supabase.rpc as any)('update_shopping_status', {
        p_shopping_id: activeJob.value.id, p_provider_id: profile.value?.id, p_new_status: status,
        p_items_cost: itemsCost || null
      })
      if (updateError) throw updateError
      if (data?.[0] && !data[0].success) throw new Error(data[0].message || 'ไม่สามารถอัพเดทสถานะได้')
      activeJob.value.status = status
      if (status === 'completed') {
        earnings.value.today += activeJob.value.fare
        earnings.value.todayTrips += 1
        setTimeout(() => { activeJob.value = null; unsubscribeFromJob() }, 3000)
      }
      return true
    } catch (e: any) { error.value = e.message; return false }
    finally { loading.value = false }
  }

  // =====================================================
  // JOB SUBSCRIPTION (for delivery/shopping)
  // =====================================================
  const subscribeToJob = (jobId: string, type: 'delivery' | 'shopping') => {
    if (jobSubscription) jobSubscription.unsubscribe()
    const table = type === 'delivery' ? 'delivery_requests' : 'shopping_requests'
    jobSubscription = supabase.channel(`job_${type}_${jobId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `id=eq.${jobId}` }, (payload) => {
        const updated = payload.new as any
        if (activeJob.value?.id === jobId) {
          if (updated.status === 'cancelled') { activeJob.value = null; unsubscribeFromJob() }
          else { activeJob.value.status = updated.status }
        }
      })
      .subscribe()
  }

  const unsubscribeFromJob = () => {
    if (jobSubscription) { jobSubscription.unsubscribe(); jobSubscription = null }
  }

  // =====================================================
  // FETCH ALL PENDING JOBS
  // =====================================================
  const fetchAllPendingJobs = async () => {
    await Promise.all([fetchPendingRequests(), fetchPendingDeliveries(), fetchPendingShopping()])
  }

  const subscribeToRide = (rideId: string) => {
    if (rideSubscription) rideSubscription.unsubscribe()
    rideSubscription = supabase.channel('ride_' + rideId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ride_requests', filter: 'id=eq.' + rideId }, (payload) => {
        const updated = payload.new as any
        if (activeRide.value?.id === rideId) {
          if (updated.status === 'cancelled') { activeRide.value = null; unsubscribeFromRide() }
          else { activeRide.value.status = updated.status }
        }
      })
      .subscribe()
  }

  const unsubscribeFromRide = () => {
    if (rideSubscription) { rideSubscription.unsubscribe(); rideSubscription = null }
  }

  const updateLocation = async (lat: number, lng: number) => {
    if (!profile.value?.id || profile.value.id.startsWith('demo')) return
    try {
      await (supabase.from('service_providers') as any).update({ current_lat: lat, current_lng: lng }).eq('id', profile.value.id)
      if (profile.value) { profile.value.current_lat = lat; profile.value.current_lng = lng }
    } catch (e) { console.warn('Error updating location:', e) }
  }

  const startLocationUpdates = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => updateLocation(pos.coords.latitude, pos.coords.longitude), () => {}, { enableHighAccuracy: true })
    locationInterval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition((pos) => updateLocation(pos.coords.latitude, pos.coords.longitude), () => {}, { enableHighAccuracy: true })
    }, 30000)
  }

  const stopLocationUpdates = () => {
    if (locationInterval) { clearInterval(locationInterval); locationInterval = null }
  }

  onUnmounted(() => {
    unsubscribeFromRequests()
    unsubscribeFromRide()
    unsubscribeFromJob()
    stopLocationUpdates()
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
  })

  return {
    // State
    loading, error, profile, isOnline, earnings, weeklyEarnings,
    // Ride state
    pendingRequests, activeRide,
    // Delivery/Shopping state
    pendingDeliveries, pendingShopping, activeJob,
    // Computed
    hasActiveRide, hasActiveJob,
    // Profile
    fetchProfile, updateProfile, fetchEarnings, toggleOnline,
    // Ride functions
    fetchPendingRequests, acceptRide, declineRide, updateRideStatus, cancelActiveRide, completeRide,
    // Delivery functions
    fetchPendingDeliveries, acceptDelivery, updateDeliveryStatus,
    // Shopping functions
    fetchPendingShopping, acceptShopping, updateShoppingStatus,
    // All jobs
    fetchAllPendingJobs
  }
}
