import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

// Types
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
  // Computed
  distance?: number
  duration?: number
  passenger_name?: string
  passenger_phone?: string
  passenger_rating?: number
}

export interface ActiveRide {
  id: string
  tracking_id: string
  passenger: {
    id: string
    name: string
    phone: string
    rating: number
    photo?: string
  }
  pickup: {
    lat: number
    lng: number
    address: string
  }
  destination: {
    lat: number
    lng: number
    address: string
  }
  fare: number
  status: 'matched' | 'arriving' | 'arrived' | 'picked_up' | 'in_progress' | 'completed'
  distance: number
  duration: number
  ride_type: string
  created_at: string
}

export interface EarningsSummary {
  today: number
  thisWeek: number
  thisMonth: number
  todayTrips: number
  weekTrips: number
  monthTrips: number
}

export interface DailyEarning {
  date: string
  day: string
  earnings: number
  trips: number
  hours_online: number
}

export function useProvider() {
  const authStore = useAuthStore()
  
  // State
  const loading = ref(false)
  const error = ref<string | null>(null)
  const profile = ref<ProviderProfile | null>(null)
  const isOnline = ref(false)
  const pendingRequests = ref<RideRequest[]>([])
  const activeRide = ref<ActiveRide | null>(null)
  const earnings = ref<EarningsSummary>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    todayTrips: 0,
    weekTrips: 0,
    monthTrips: 0
  })
  const weeklyEarnings = ref<DailyEarning[]>([])
  
  // Subscriptions
  let requestsSubscription: any = null
  let rideSubscription: any = null
  let locationInterval: number | null = null

  // Fetch provider profile
  const fetchProfile = async () => {
    loading.value = true
    
    try {
      // Try to get real provider profile from database
      if (authStore.user?.id) {
        const { data, error: fetchError } = await (supabase
          .from('service_providers') as any)
          .select('*')
          .eq('user_id', authStore.user.id)
          .single()

        if (!fetchError && data) {
          profile.value = data as ProviderProfile
          isOnline.value = data.is_available || false
          
          // Check for active ride assigned to this provider
          await checkActiveRide(data.id)
          
          return data
        }
      }
      
      // Try to find provider by email (for demo users)
      const demoUserStr = localStorage.getItem('demo_user')
      const userEmail = authStore.user?.email || (demoUserStr ? JSON.parse(demoUserStr).email : null)
      
      if (userEmail) {
        // First get user by email
        const { data: userData } = await (supabase
          .from('users') as any)
          .select('id')
          .eq('email', userEmail)
          .single()
        
        if (userData) {
          const { data: providerData } = await (supabase
            .from('service_providers') as any)
            .select('*')
            .eq('user_id', userData.id)
            .single()
          
          if (providerData) {
            profile.value = providerData as ProviderProfile
            isOnline.value = providerData.is_available || false
            
            // Check for active ride assigned to this provider
            await checkActiveRide(providerData.id)
            
            return providerData
          }
        }
      }
      
      // No provider found - return null (no demo fallback)
      profile.value = null
      return null
    } catch (e: any) {
      error.value = e.message
      profile.value = null
      return null
    } finally {
      loading.value = false
    }
  }
  
  // Check for active ride assigned to this provider
  const checkActiveRide = async (providerId: string) => {
    try {
      const { data: ride, error: rideError } = await (supabase
        .from('ride_requests') as any)
        .select(`
          *,
          users:user_id (
            id,
            name,
            phone,
            avatar_url
          )
        `)
        .eq('provider_id', providerId)
        .in('status', ['matched', 'pickup', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (!rideError && ride) {
        const user = ride.users
        activeRide.value = {
          id: ride.id,
          tracking_id: `TR${ride.id.slice(0, 8).toUpperCase()}`,
          passenger: {
            id: user?.id || ride.user_id,
            name: user?.name || 'ผู้โดยสาร',
            phone: user?.phone || '',
            rating: 4.5,
            photo: user?.avatar_url
          },
          pickup: {
            lat: ride.pickup_lat,
            lng: ride.pickup_lng,
            address: ride.pickup_address
          },
          destination: {
            lat: ride.destination_lat,
            lng: ride.destination_lng,
            address: ride.destination_address
          },
          fare: ride.estimated_fare || 0,
          status: ride.status === 'pickup' ? 'arriving' : (ride.status as ActiveRide['status']),
          distance: calculateDistance(
            ride.pickup_lat, ride.pickup_lng,
            ride.destination_lat, ride.destination_lng
          ),
          duration: 15,
          ride_type: ride.ride_type || 'standard',
          created_at: ride.created_at
        }
        
        // Subscribe to this ride updates
        subscribeToRide(ride.id)
      }
    } catch (e) {
      console.warn('Error checking active ride:', e)
    }
  }

  // Toggle online status
  const toggleOnline = async (online: boolean, location?: { lat: number; lng: number }) => {
    loading.value = true
    error.value = null

    try {
      if (profile.value?.id) {
        const updates: any = { is_available: online }
        if (location) {
          updates.current_lat = location.lat
          updates.current_lng = location.lng
        }

        const { error: updateError } = await (supabase
          .from('service_providers') as any)
          .update(updates)
          .eq('id', profile.value.id)

        if (updateError) throw updateError
      }

      isOnline.value = online

      if (online) {
        // Start listening for requests
        subscribeToRequests()
        // Start location updates
        startLocationUpdates()
        // Fetch existing pending requests from database
        await fetchPendingRequests()
      } else {
        // Stop listening
        unsubscribeFromRequests()
        stopLocationUpdates()
        pendingRequests.value = []
      }

      return true
    } catch (e: any) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Fetch pending ride requests from database
  const fetchPendingRequests = async () => {
    try {
      // Only fetch requests without a provider assigned (pending)
      const { data: requests, error: fetchError } = await (supabase
        .from('ride_requests') as any)
        .select(`
          *,
          users:user_id (
            id,
            name,
            phone,
            avatar_url
          )
        `)
        .eq('status', 'pending')
        .is('provider_id', null)
        .order('created_at', { ascending: false })
        .limit(20)

      if (fetchError) {
        console.warn('Error fetching requests:', fetchError)
        return
      }

      if (requests && requests.length > 0) {
        // Filter by distance if provider has location
        let filteredRequests = requests
        if (profile.value?.current_lat && profile.value?.current_lng) {
          filteredRequests = requests.filter((r: any) => {
            const distance = calculateDistance(
              profile.value!.current_lat!,
              profile.value!.current_lng!,
              r.pickup_lat,
              r.pickup_lng
            )
            return distance <= 10 // Within 10km
          })
        }

        pendingRequests.value = filteredRequests.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          pickup_lat: r.pickup_lat,
          pickup_lng: r.pickup_lng,
          pickup_address: r.pickup_address,
          destination_lat: r.destination_lat,
          destination_lng: r.destination_lng,
          destination_address: r.destination_address,
          ride_type: r.ride_type || 'standard',
          estimated_fare: r.estimated_fare || 0,
          status: r.status,
          created_at: r.created_at,
          distance: calculateDistance(
            r.pickup_lat, r.pickup_lng, r.destination_lat, r.destination_lng
          ),
          duration: Math.ceil(calculateDistance(
            r.pickup_lat, r.pickup_lng, r.destination_lat, r.destination_lng
          ) * 3), // Estimate 3 min per km
          passenger_name: r.users?.name || 'ผู้โดยสาร',
          passenger_phone: r.users?.phone || '',
          passenger_rating: 4.5
        }))
      } else {
        pendingRequests.value = []
      }
    } catch (e) {
      console.warn('Error in fetchPendingRequests:', e)
    }
  }

  // Subscribe to ride requests
  const subscribeToRequests = () => {
    if (!profile.value?.id) return

    // Real subscription for new requests
    requestsSubscription = supabase
      .channel('pending_ride_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests'
        },
        async (payload) => {
          const request = payload.new as any
          
          // Only process pending requests without provider
          if (request.status !== 'pending' || request.provider_id) return
          
          // Fetch user info
          const { data: userData } = await (supabase
            .from('users') as any)
            .select('id, name, phone, avatar_url')
            .eq('id', request.user_id)
            .single()
          
          // Check if within service radius
          let shouldAdd = true
          if (profile.value?.current_lat && profile.value?.current_lng) {
            const distance = calculateDistance(
              profile.value.current_lat,
              profile.value.current_lng,
              request.pickup_lat,
              request.pickup_lng
            )
            shouldAdd = distance <= 10 // Within 10km
          }
          
          if (shouldAdd) {
            // Check if not already in list
            const exists = pendingRequests.value.some(r => r.id === request.id)
            if (!exists) {
              pendingRequests.value.unshift({
                id: request.id,
                user_id: request.user_id,
                pickup_lat: request.pickup_lat,
                pickup_lng: request.pickup_lng,
                pickup_address: request.pickup_address,
                destination_lat: request.destination_lat,
                destination_lng: request.destination_lng,
                destination_address: request.destination_address,
                ride_type: request.ride_type || 'standard',
                estimated_fare: request.estimated_fare || 0,
                status: request.status,
                created_at: request.created_at,
                distance: calculateDistance(
                  request.pickup_lat, request.pickup_lng,
                  request.destination_lat, request.destination_lng
                ),
                duration: Math.ceil(calculateDistance(
                  request.pickup_lat, request.pickup_lng,
                  request.destination_lat, request.destination_lng
                ) * 3),
                passenger_name: userData?.name || 'ผู้โดยสาร',
                passenger_phone: userData?.phone || '',
                passenger_rating: 4.5
              })
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests'
        },
        (payload) => {
          const request = payload.new as any
          // Remove from pending if no longer pending or has provider
          if (request.status !== 'pending' || request.provider_id) {
            pendingRequests.value = pendingRequests.value.filter(r => r.id !== request.id)
          }
        }
      )
      .subscribe()
  }

  // Unsubscribe from requests
  const unsubscribeFromRequests = () => {
    if (requestsSubscription) {
      requestsSubscription.unsubscribe()
      requestsSubscription = null
    }
  }

  // Accept ride request
  const acceptRide = async (requestId: string) => {
    loading.value = true
    error.value = null

    try {
      const request = pendingRequests.value.find(r => r.id === requestId)
      if (!request) throw new Error('ไม่พบคำขอนี้')
      
      if (!profile.value?.id) throw new Error('ไม่พบข้อมูลผู้ให้บริการ')

      // Update in database - assign provider and change status
      const { error: updateError } = await (supabase
        .from('ride_requests') as any)
        .update({
          provider_id: profile.value.id,
          status: 'matched'
        })
        .eq('id', requestId)
        .eq('status', 'pending') // Only if still pending
        .is('provider_id', null) // Only if no provider assigned

      if (updateError) {
        // Might have been taken by another driver
        pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
        throw new Error('งานนี้ถูกรับไปแล้ว')
      }

      // Set as active ride
      activeRide.value = {
        id: request.id,
        tracking_id: `TR${request.id.slice(0, 8).toUpperCase()}`,
        passenger: {
          id: request.user_id,
          name: request.passenger_name || 'ผู้โดยสาร',
          phone: request.passenger_phone || '',
          rating: request.passenger_rating || 4.5
        },
        pickup: {
          lat: request.pickup_lat,
          lng: request.pickup_lng,
          address: request.pickup_address
        },
        destination: {
          lat: request.destination_lat,
          lng: request.destination_lng,
          address: request.destination_address
        },
        fare: request.estimated_fare,
        status: 'matched',
        distance: request.distance || 0,
        duration: request.duration || 0,
        ride_type: request.ride_type,
        created_at: request.created_at
      }

      // Remove from pending
      pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)

      // Subscribe to ride updates
      subscribeToRide(requestId)

      return true
    } catch (e: any) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Decline ride request
  const declineRide = (requestId: string) => {
    pendingRequests.value = pendingRequests.value.filter(r => r.id !== requestId)
  }

  // Update ride status
  const updateRideStatus = async (status: ActiveRide['status']) => {
    if (!activeRide.value) return false

    loading.value = true
    try {
      // Map UI status to database status
      let dbStatus: string = status
      if (status === 'arriving') dbStatus = 'pickup'
      if (status === 'arrived') dbStatus = 'pickup'
      if (status === 'picked_up') dbStatus = 'in_progress'

      const updateData: any = { status: dbStatus }
      
      // Add timestamps
      if (dbStatus === 'in_progress') {
        updateData.started_at = new Date().toISOString()
      } else if (dbStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error: updateError } = await (supabase
        .from('ride_requests') as any)
        .update(updateData)
        .eq('id', activeRide.value.id)

      if (updateError) throw updateError

      activeRide.value.status = status

      // If completed, update earnings and clear ride
      if (status === 'completed') {
        earnings.value.today += activeRide.value.fare
        earnings.value.todayTrips += 1
        
        // Update provider stats
        if (profile.value?.id) {
          await (supabase
            .from('service_providers') as any)
            .update({
              total_trips: (profile.value.total_trips || 0) + 1
            })
            .eq('id', profile.value.id)
        }
        
        // Clear active ride after delay
        setTimeout(() => {
          activeRide.value = null
          unsubscribeFromRide()
        }, 3000)
      }

      return true
    } catch (e: any) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Cancel active ride
  const cancelActiveRide = async (_reason?: string) => {
    if (!activeRide.value) return false

    loading.value = true
    try {
      // Reset ride to pending so another driver can pick it up
      const { error: updateError } = await (supabase
        .from('ride_requests') as any)
        .update({ 
          status: 'pending',
          provider_id: null
        })
        .eq('id', activeRide.value.id)

      if (updateError) throw updateError

      activeRide.value = null
      unsubscribeFromRide()
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    } finally {
      loading.value = false
    }
  }

  // Subscribe to active ride updates
  const subscribeToRide = (rideId: string) => {
    // Unsubscribe from previous
    if (rideSubscription) {
      rideSubscription.unsubscribe()
    }

    rideSubscription = supabase
      .channel(`provider_ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${rideId}`
        },
        (payload) => {
          const ride = payload.new as any
          
          // If cancelled by passenger
          if (ride.status === 'cancelled' && activeRide.value) {
            activeRide.value = null
            unsubscribeFromRide()
          }
          
          // Update status if changed externally
          if (activeRide.value && ride.status !== activeRide.value.status) {
            // Map db status to UI status
            let uiStatus = ride.status
            if (ride.status === 'pickup') uiStatus = 'arriving'
            activeRide.value.status = uiStatus
          }
        }
      )
      .subscribe()
  }

  // Unsubscribe from ride
  const unsubscribeFromRide = () => {
    if (rideSubscription) {
      rideSubscription.unsubscribe()
      rideSubscription = null
    }
  }

  // Update provider location
  const updateLocation = async (lat: number, lng: number) => {
    if (!profile.value?.id || profile.value.id.startsWith('demo')) return

    try {
      await (supabase
        .from('service_providers') as any)
        .update({
          current_lat: lat,
          current_lng: lng
        })
        .eq('id', profile.value.id)
    } catch (e) {
      console.warn('Error updating location:', e)
    }
  }

  // Start location updates
  const startLocationUpdates = () => {
    if (!navigator.geolocation) return

    locationInterval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateLocation(position.coords.latitude, position.coords.longitude)
        },
        () => {},
        { enableHighAccuracy: true }
      )
    }, 30000) // Update every 30 seconds
  }

  // Stop location updates
  const stopLocationUpdates = () => {
    if (locationInterval) {
      clearInterval(locationInterval)
      locationInterval = null
    }
  }

  // Fetch earnings from database
  const fetchEarnings = async () => {
    if (!profile.value?.id) {
      // Return empty earnings if no profile
      return earnings.value
    }

    try {
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const startOfWeek = new Date(startOfToday)
      startOfWeek.setDate(startOfWeek.getDate() - 6)
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      // Fetch completed rides for this provider
      const { data: rides, error: ridesError } = await (supabase
        .from('ride_requests') as any)
        .select('id, estimated_fare, final_fare, completed_at, created_at')
        .eq('provider_id', profile.value.id)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString())
        .order('created_at', { ascending: false })

      if (ridesError) {
        console.warn('Error fetching earnings:', ridesError)
        return earnings.value
      }

      // Calculate earnings
      let todayEarnings = 0
      let todayTrips = 0
      let weekEarnings = 0
      let weekTrips = 0
      let monthEarnings = 0
      let monthTrips = 0

      const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
      const dailyData: Record<string, { earnings: number; trips: number }> = {}

      // Initialize daily data for the week
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().slice(0, 10)
        dailyData[dateStr] = { earnings: 0, trips: 0 }
      }

      rides?.forEach((ride: any) => {
        const fare = ride.final_fare || ride.estimated_fare || 0
        const rideDate = new Date(ride.completed_at || ride.created_at)
        const rideDateStr = rideDate.toISOString().slice(0, 10)

        // Month totals
        monthEarnings += fare
        monthTrips += 1

        // Week totals
        if (rideDate >= startOfWeek) {
          weekEarnings += fare
          weekTrips += 1
          
          // Daily breakdown
          if (dailyData[rideDateStr]) {
            dailyData[rideDateStr].earnings += fare
            dailyData[rideDateStr].trips += 1
          }
        }

        // Today totals
        if (rideDate >= startOfToday) {
          todayEarnings += fare
          todayTrips += 1
        }
      })

      // Build weekly earnings array
      weeklyEarnings.value = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().slice(0, 10)
        const dayIndex = date.getDay()
        return {
          date: dateStr,
          day: days[dayIndex] || 'อา',
          earnings: dailyData[dateStr]?.earnings || 0,
          trips: dailyData[dateStr]?.trips || 0,
          hours_online: 0 // Would need separate tracking
        }
      })

      earnings.value = {
        today: todayEarnings,
        thisWeek: weekEarnings,
        thisMonth: monthEarnings,
        todayTrips: todayTrips,
        weekTrips: weekTrips,
        monthTrips: monthTrips
      }

      return earnings.value
    } catch (e) {
      console.warn('Error in fetchEarnings:', e)
      return earnings.value
    }
  }

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Computed
  const hasActiveRide = computed(() => !!activeRide.value)
  const maxWeeklyEarning = computed(() => 
    Math.max(...weeklyEarnings.value.map(d => d.earnings), 1)
  )

  // Cleanup
  onUnmounted(() => {
    unsubscribeFromRequests()
    unsubscribeFromRide()
    stopLocationUpdates()
  })

  return {
    // State
    loading,
    error,
    profile,
    isOnline,
    pendingRequests,
    activeRide,
    earnings,
    weeklyEarnings,
    // Computed
    hasActiveRide,
    maxWeeklyEarning,
    // Methods
    fetchProfile,
    toggleOnline,
    acceptRide,
    declineRide,
    updateRideStatus,
    cancelActiveRide,
    updateLocation,
    fetchEarnings
  }
}
