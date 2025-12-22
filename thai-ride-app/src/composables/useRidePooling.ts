/**
 * useRidePooling - Ride Sharing/Pooling System
 * Feature: F206 - Ride Pooling
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface PoolRide {
  id: string
  host_user_id: string
  pickup_lat: number
  pickup_lng: number
  dropoff_lat: number
  dropoff_lng: number
  departure_time: string
  max_passengers: number
  current_passengers: number
  price_per_seat: number
  status: 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled'
}

export function useRidePooling() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const availablePools = ref<PoolRide[]>([])
  const myPools = ref<PoolRide[]>([])

  const openPools = computed(() => availablePools.value.filter(p => p.status === 'open'))

  const searchPools = async (pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number, radius = 2) => {
    loading.value = true
    try {
      const { data, error: err } = await supabase.rpc('search_pool_rides', { p_pickup_lat: pickupLat, p_pickup_lng: pickupLng, p_dropoff_lat: dropoffLat, p_dropoff_lng: dropoffLng, p_radius: radius })
      if (err) throw err
      availablePools.value = data || []
    } catch (e: any) { error.value = e.message }
    finally { loading.value = false }
  }

  const createPool = async (pool: Partial<PoolRide>): Promise<PoolRide | null> => {
    try {
      const { data, error: err } = await supabase.from('pool_rides').insert({ ...pool, status: 'open', current_passengers: 0 } as never).select().single()
      if (err) throw err
      myPools.value.push(data)
      return data
    } catch (e: any) { error.value = e.message; return null }
  }

  const joinPool = async (poolId: string, userId: string, seats: number): Promise<boolean> => {
    try {
      const { error: err } = await supabase.from('pool_requests').insert({ pool_ride_id: poolId, user_id: userId, seats_requested: seats, status: 'pending' } as never)
      if (err) throw err
      return true
    } catch (e: any) { error.value = e.message; return false }
  }

  const getStatusText = (s: string) => ({ open: 'เปิดรับ', full: 'เต็ม', in_progress: 'กำลังเดินทาง', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก' }[s] || s)

  return { loading, error, availablePools, myPools, openPools, searchPools, createPool, joinPool, getStatusText }
}
