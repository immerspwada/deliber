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
  provider_type: 'driver' | 'delivery' | 'both' | 'rider' | 'pending' | 'multi'
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
  allowed_services?: string[] // งานที่ได้รับอนุญาตให้เห็น (Admin กำหนด)
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
  const allowedServices = ref<string[]>([]) // งานที่ได้รับอนุญาตให้เห็น
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
      // Use maybeSingle() to avoid 406 error when user is not a provider
      const { data } = await (supabase.from('service_providers') as any).select('*').eq('user_id', authStore.user.id).maybeSingle()
      if (!data) { profile.value = null; return null }
      profile.value = data as ProviderProfile
      isOnline.value = data.is_available || false
      // ดึง allowed_services จาก profile
      allowedServices.value = data.allowed_services || []
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

  // =====================================================
  // NEW SERVICES: Queue, Moving, Laundry (F158, F159, F160)
  // =====================================================
  
  const pendingQueueJobs = ref<any[]>([])
  const pendingMovingJobs = ref<any[]>([])
  const pendingLaundryJobs = ref<any[]>([])

  // Fetch pending queue bookings (Requirements 4.1)
  const fetchPendingQueueJobs = async () => {
    if (!profile.value?.id) return
    try {
      const { data } = await (supabase.rpc as any)('get_available_queue_bookings_for_provider', {
        p_provider_id: profile.value.id
      })
      pendingQueueJobs.value = data || []
    } catch (e) { console.error('Error fetching queue jobs:', e) }
  }

  // Fetch pending moving requests (Requirements 4.1)
  const fetchPendingMovingJobs = async () => {
    if (!profile.value?.id) return
    try {
      const { data } = await (supabase.rpc as any)('get_available_moving_requests_for_provider', {
        p_provider_id: profile.value.id,
        p_lat: profile.value.current_lat,
        p_lng: profile.value.current_lng
      })
      pendingMovingJobs.value = data || []
    } catch (e) { console.error('Error fetching moving jobs:', e) }
  }

  // Fetch pending laundry requests (Requirements 4.1)
  const fetchPendingLaundryJobs = async () => {
    if (!profile.value?.id) return
    try {
      const { data } = await (supabase.rpc as any)('get_available_laundry_requests_for_provider', {
        p_provider_id: profile.value.id,
        p_lat: profile.value.current_lat,
        p_lng: profile.value.current_lng
      })
      pendingLaundryJobs.value = data || []
    } catch (e) { console.error('Error fetching laundry jobs:', e) }
  }

  // Accept queue booking (Requirements 4.2)
  const acceptQueueBooking = async (bookingId: string) => {
    if (!profile.value?.id) return { success: false, error: 'ไม่พบข้อมูลผู้ให้บริการ' }
    try {
      const { data } = await (supabase.rpc as any)('accept_queue_booking', {
        p_booking_id: bookingId,
        p_provider_id: profile.value.id
      })
      if (data?.success) {
        pendingQueueJobs.value = pendingQueueJobs.value.filter(j => j.id !== bookingId)
      }
      return data || { success: false }
    } catch (e: any) { return { success: false, error: e.message } }
  }

  // Accept moving request (Requirements 4.2)
  const acceptMovingRequest = async (requestId: string) => {
    if (!profile.value?.id) return { success: false, error: 'ไม่พบข้อมูลผู้ให้บริการ' }
    try {
      const { data } = await (supabase.rpc as any)('accept_moving_request', {
        p_request_id: requestId,
        p_provider_id: profile.value.id
      })
      if (data?.success) {
        pendingMovingJobs.value = pendingMovingJobs.value.filter(j => j.id !== requestId)
      }
      return data || { success: false }
    } catch (e: any) { return { success: false, error: e.message } }
  }

  // Accept laundry request (Requirements 4.2)
  const acceptLaundryRequest = async (requestId: string) => {
    if (!profile.value?.id) return { success: false, error: 'ไม่พบข้อมูลผู้ให้บริการ' }
    try {
      const { data } = await (supabase.rpc as any)('accept_laundry_request', {
        p_request_id: requestId,
        p_provider_id: profile.value.id
      })
      if (data?.success) {
        pendingLaundryJobs.value = pendingLaundryJobs.value.filter(j => j.id !== requestId)
      }
      return data || { success: false }
    } catch (e: any) { return { success: false, error: e.message } }
  }

  // Update queue status (Requirements 4.3)
  const updateQueueStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { data } = await (supabase.rpc as any)('update_queue_status', {
        p_booking_id: bookingId,
        p_new_status: newStatus
      })
      return data
    } catch (e: any) { return { success: false, error: e.message } }
  }

  // Update moving status (Requirements 4.3)
  const updateMovingStatus = async (requestId: string, newStatus: string, finalPrice?: number) => {
    try {
      const { data } = await (supabase.rpc as any)('update_moving_status', {
        p_request_id: requestId,
        p_new_status: newStatus,
        p_final_price: finalPrice || null
      })
      return data
    } catch (e: any) { return { success: false, error: e.message } }
  }

  // Update laundry status (Requirements 4.3)
  const updateLaundryStatus = async (requestId: string, newStatus: string, actualWeight?: number) => {
    try {
      const { data } = await (supabase.rpc as any)('update_laundry_status', {
        p_request_id: requestId,
        p_new_status: newStatus,
        p_actual_weight: actualWeight || null
      })
      return data
    } catch (e: any) { return { success: false, error: e.message } }
  }

  // =====================================================
  // DELIVERY PROOF PHOTO (F03 Enhancement)
  // =====================================================

  // Compress image for upload
  const compressProofImage = async (file: File, maxWidth = 1024, quality = 0.7): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }))
              else resolve(file)
            },
            'image/jpeg',
            quality
          )
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  // Get current GPS location
  const getCurrentGPS = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  // Upload delivery proof photo with GPS timestamp
  const uploadDeliveryProof = async (
    deliveryId: string,
    file: File,
    proofType: 'pickup' | 'delivery' = 'delivery'
  ): Promise<{ success: boolean; photoUrl?: string; error?: string }> => {
    if (!profile.value?.id) {
      return { success: false, error: 'ไม่พบข้อมูลผู้ให้บริการ' }
    }

    try {
      // Get GPS location
      const gps = await getCurrentGPS()
      
      // Compress image
      const compressedFile = await compressProofImage(file)
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${profile.value.id}/${deliveryId}/${proofType}_${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('delivery-proofs')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        console.error('Upload error:', uploadError)
        return { success: false, error: 'ไม่สามารถอัพโหลดรูปได้' }
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('delivery-proofs')
        .getPublicUrl(uploadData.path)
      
      const photoUrl = urlData.publicUrl
      
      // Save to database with GPS
      const { data, error: dbError } = await (supabase.rpc as any)('upload_delivery_proof', {
        p_delivery_id: deliveryId,
        p_provider_id: profile.value.id,
        p_photo_url: photoUrl,
        p_lat: gps?.lat || null,
        p_lng: gps?.lng || null,
        p_proof_type: proofType
      })
      
      if (dbError) {
        console.error('DB error:', dbError)
        return { success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' }
      }
      
      if (data && !data.success) {
        return { success: false, error: data.message }
      }
      
      return { success: true, photoUrl }
    } catch (e: any) {
      console.error('Error uploading proof:', e)
      return { success: false, error: e.message || 'เกิดข้อผิดพลาด' }
    }
  }

  // Complete delivery with proof photo (convenience function)
  const completeDeliveryWithProof = async (
    deliveryId: string,
    proofFile: File
  ): Promise<{ success: boolean; error?: string }> => {
    // Upload proof first
    const uploadResult = await uploadDeliveryProof(deliveryId, proofFile, 'delivery')
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error }
    }
    
    // Then update status to delivered
    const statusResult = await updateDeliveryStatus('delivered')
    if (!statusResult) {
      return { success: false, error: 'ไม่สามารถอัพเดทสถานะได้' }
    }
    
    return { success: true }
  }

  // Save recipient signature (F03c Enhancement)
  const saveDeliverySignature = async (
    deliveryId: string,
    signatureData: string,
    signerName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!profile.value?.id) {
      return { success: false, error: 'ไม่พบข้อมูลผู้ให้บริการ' }
    }

    try {
      const { data, error: dbError } = await (supabase.rpc as any)('save_delivery_signature', {
        p_delivery_id: deliveryId,
        p_provider_id: profile.value.id,
        p_signature: signatureData,
        p_signer_name: signerName || null
      })

      if (dbError) {
        console.error('Signature save error:', dbError)
        return { success: false, error: 'ไม่สามารถบันทึกลายเซ็นได้' }
      }

      if (data && !data.success) {
        return { success: false, error: data.message }
      }

      return { success: true }
    } catch (e: any) {
      console.error('Error saving signature:', e)
      return { success: false, error: e.message || 'เกิดข้อผิดพลาด' }
    }
  }

  // Complete delivery with full proof (photo + signature)
  const completeDeliveryWithFullProof = async (
    deliveryId: string,
    proofFile: File,
    signatureData?: string,
    signerName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Upload proof photo first
    const uploadResult = await uploadDeliveryProof(deliveryId, proofFile, 'delivery')
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error }
    }

    // Save signature if provided
    if (signatureData) {
      const signatureResult = await saveDeliverySignature(deliveryId, signatureData, signerName)
      if (!signatureResult.success) {
        console.warn('Signature save failed:', signatureResult.error)
        // Continue anyway - signature is optional
      }
    }

    // Update status to delivered
    const statusResult = await updateDeliveryStatus('delivered')
    if (!statusResult) {
      return { success: false, error: 'ไม่สามารถอัพเดทสถานะได้' }
    }

    return { success: true }
  }

  // Fetch all new service jobs
  const fetchAllNewServiceJobs = async () => {
    await Promise.all([
      fetchPendingQueueJobs(),
      fetchPendingMovingJobs(),
      fetchPendingLaundryJobs()
    ])
  }

  // =====================================================
  // SCHEDULED RIDES - Provider Functions (F15)
  // =====================================================
  
  interface ScheduledRideForProvider {
    id: string
    tracking_id?: string
    user_id: string
    scheduled_datetime: string
    pickup_address: string
    destination_address: string
    pickup_lat: number
    pickup_lng: number
    destination_lat: number
    destination_lng: number
    ride_type: string
    estimated_fare?: number
    notes?: string
    status: string
    customer_name?: string
    customer_phone?: string
  }
  
  const upcomingScheduledRides = ref<ScheduledRideForProvider[]>([])
  
  // Fetch upcoming scheduled rides that are confirmed and need a driver
  const fetchUpcomingScheduledRides = async () => {
    if (!profile.value?.id) return
    
    try {
      // Get scheduled rides that are confirmed and within next 2 hours
      const twoHoursFromNow = new Date()
      twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2)
      
      const { data, error: err } = await (supabase
        .from('scheduled_rides') as any)
        .select('*')
        .eq('status', 'confirmed')
        .gte('scheduled_datetime', new Date().toISOString())
        .lte('scheduled_datetime', twoHoursFromNow.toISOString())
        .order('scheduled_datetime', { ascending: true })
      
      if (err) {
        console.error('Error fetching scheduled rides:', err)
        return
      }
      
      // Fetch customer info separately
      const ridesWithCustomer = await Promise.all(
        (data || []).map(async (ride: any) => {
          if (ride.user_id) {
            const { data: userData } = await (supabase
              .from('users') as any)
              .select('first_name, last_name, phone_number')
              .eq('id', ride.user_id)
              .maybeSingle()
            
            return {
              ...ride,
              customer_name: userData ? [userData.first_name, userData.last_name].filter(Boolean).join(' ') : undefined,
              customer_phone: userData?.phone_number
            }
          }
          return ride
        })
      )
      
      upcomingScheduledRides.value = ridesWithCustomer
    } catch (e) {
      console.error('Error fetching scheduled rides:', e)
    }
  }
  
  // Accept a scheduled ride (convert to active ride)
  const acceptScheduledRide = async (scheduledRideId: string): Promise<{ success: boolean; rideId?: string; error?: string }> => {
    if (!profile.value?.id) {
      return { success: false, error: 'ไม่พบข้อมูลผู้ให้บริการ' }
    }
    
    try {
      // Get the scheduled ride
      const { data: scheduledRide, error: fetchErr } = await (supabase
        .from('scheduled_rides') as any)
        .select('*')
        .eq('id', scheduledRideId)
        .eq('status', 'confirmed')
        .maybeSingle()
      
      if (fetchErr || !scheduledRide) {
        return { success: false, error: 'ไม่พบการจองนี้หรือถูกรับไปแล้ว' }
      }
      
      // Create actual ride request from scheduled ride
      const { data: newRide, error: createErr } = await (supabase
        .from('ride_requests') as any)
        .insert({
          user_id: scheduledRide.user_id,
          provider_id: profile.value.id,
          pickup_lat: scheduledRide.pickup_lat,
          pickup_lng: scheduledRide.pickup_lng,
          pickup_address: scheduledRide.pickup_address,
          destination_lat: scheduledRide.destination_lat,
          destination_lng: scheduledRide.destination_lng,
          destination_address: scheduledRide.destination_address,
          ride_type: scheduledRide.ride_type || 'standard',
          estimated_fare: scheduledRide.estimated_fare,
          notes: scheduledRide.notes,
          status: 'matched',
          scheduled_ride_id: scheduledRideId
        })
        .select()
        .single()
      
      if (createErr) {
        console.error('Error creating ride from scheduled:', createErr)
        return { success: false, error: 'ไม่สามารถสร้างงานได้' }
      }
      
      // Update scheduled ride status
      await (supabase
        .from('scheduled_rides') as any)
        .update({ 
          status: 'completed',
          provider_id: profile.value.id,
          actual_ride_id: newRide.id
        })
        .eq('id', scheduledRideId)
      
      // Refresh lists
      await fetchUpcomingScheduledRides()
      await fetchPendingRequests()
      
      return { success: true, rideId: newRide.id }
    } catch (e: any) {
      console.error('Error accepting scheduled ride:', e)
      return { success: false, error: e.message || 'เกิดข้อผิดพลาด' }
    }
  }

  onUnmounted(() => {
    unsubscribeFromRequests()
    unsubscribeFromRide()
    unsubscribeFromJob()
    stopLocationUpdates()
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
  })

  // ตรวจสอบว่า provider มีสิทธิ์เห็นงานประเภทนี้หรือไม่
  const canSeeService = (serviceType: string): boolean => {
    // ถ้ายังไม่มี allowed_services = เห็นได้ทุกงาน (backward compatible)
    if (!allowedServices.value || allowedServices.value.length === 0) {
      return true
    }
    return allowedServices.value.includes(serviceType)
  }

  return {
    // State
    loading, error, profile, isOnline, earnings, weeklyEarnings,
    // Ride state
    pendingRequests, activeRide,
    // Delivery/Shopping state
    pendingDeliveries, pendingShopping, activeJob,
    // New Services state (F158, F159, F160)
    pendingQueueJobs, pendingMovingJobs, pendingLaundryJobs,
    // Scheduled Rides state (F15)
    upcomingScheduledRides,
    // Service permissions
    allowedServices, canSeeService,
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
    // Queue Booking functions (F158)
    fetchPendingQueueJobs, acceptQueueBooking, updateQueueStatus,
    // Moving functions (F159)
    fetchPendingMovingJobs, acceptMovingRequest, updateMovingStatus,
    // Laundry functions (F160)
    fetchPendingLaundryJobs, acceptLaundryRequest, updateLaundryStatus,
    // Scheduled Rides functions (F15)
    fetchUpcomingScheduledRides, acceptScheduledRide,
    // Delivery Proof Photo & Signature (F03 Enhancement)
    uploadDeliveryProof, completeDeliveryWithProof, saveDeliverySignature, completeDeliveryWithFullProof,
    // All jobs
    fetchAllPendingJobs, fetchAllNewServiceJobs
  }
}
