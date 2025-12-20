import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import type {
  ScheduledRide,
  RideStop,
  FavoriteDriver,
  BlockedDriver,
  DriverPreferences,
  VoiceCall,
  InsurancePlan,
  UserInsurance,
  InsuranceClaim,
  SubscriptionPlan,
  UserSubscription,
  SubscriptionStatus
} from '../types/database'

export function useAdvancedFeatures() {
  const authStore = useAuthStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  // =====================================================
  // 1. SCHEDULED RIDES
  // =====================================================
  
  const scheduledRides = ref<ScheduledRide[]>([])

  const fetchScheduledRides = async () => {
    if (!authStore.user?.id) return []
    loading.value = true
    try {
      const { data, error: err } = await (supabase
        .from('scheduled_rides') as any)
        .select('*')
        .eq('user_id', authStore.user.id)
        .in('status', ['scheduled', 'confirmed'])
        .order('scheduled_datetime', { ascending: true })

      if (err) throw err
      scheduledRides.value = data || []
      return data || []
    } catch (e: any) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  const createScheduledRide = async (params: {
    pickup: { lat: number; lng: number; address: string }
    destination: { lat: number; lng: number; address: string }
    scheduledDatetime: string
    rideType?: 'standard' | 'premium' | 'shared'
    estimatedFare?: number
    notes?: string
  }) => {
    if (!authStore.user?.id) {
      error.value = 'กรุณาเข้าสู่ระบบก่อนจองล่วงหน้า'
      return null
    }
    loading.value = true
    error.value = null
    try {
      // Use default Bangkok coordinates if not provided
      const pickupLat = params.pickup.lat || 13.7563
      const pickupLng = params.pickup.lng || 100.5018
      const destLat = params.destination.lat || 13.7563
      const destLng = params.destination.lng || 100.5018

      const { data, error: err } = await (supabase
        .from('scheduled_rides') as any)
        .insert({
          user_id: authStore.user.id,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          pickup_address: params.pickup.address,
          destination_lat: destLat,
          destination_lng: destLng,
          destination_address: params.destination.address,
          scheduled_datetime: params.scheduledDatetime,
          ride_type: params.rideType || 'standard',
          estimated_fare: params.estimatedFare,
          notes: params.notes
        })
        .select()
        .single()

      if (err) {
        console.error('Scheduled ride error:', err)
        throw err
      }
      await fetchScheduledRides()
      return data
    } catch (e: any) {
      error.value = e.message || 'ไม่สามารถจองได้ กรุณาลองใหม่'
      console.error('Create scheduled ride failed:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  const cancelScheduledRide = async (rideId: string) => {
    try {
      const { error: err } = await (supabase
        .from('scheduled_rides') as any)
        .update({ status: 'cancelled' })
        .eq('id', rideId)

      if (err) throw err
      await fetchScheduledRides()
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // =====================================================
  // 2. MULTI-STOP RIDES
  // =====================================================

  const rideStops = ref<RideStop[]>([])

  const addRideStop = async (rideId: string, stop: {
    lat: number
    lng: number
    address: string
    contactName?: string
    contactPhone?: string
    notes?: string
    waitTimeMinutes?: number
  }) => {
    try {
      // Get current max order
      const { data: existing } = await (supabase
        .from('ride_stops') as any)
        .select('stop_order')
        .eq('ride_id', rideId)
        .order('stop_order', { ascending: false })
        .limit(1)

      const nextOrder = existing?.[0]?.stop_order ? existing[0].stop_order + 1 : 1

      const { data, error: err } = await (supabase
        .from('ride_stops') as any)
        .insert({
          ride_id: rideId,
          stop_order: nextOrder,
          lat: stop.lat,
          lng: stop.lng,
          address: stop.address,
          contact_name: stop.contactName,
          contact_phone: stop.contactPhone,
          notes: stop.notes,
          wait_time_minutes: stop.waitTimeMinutes || 5
        })
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  const getRideStops = async (rideId: string) => {
    try {
      const { data, error: err } = await (supabase
        .from('ride_stops') as any)
        .select('*')
        .eq('ride_id', rideId)
        .order('stop_order', { ascending: true })

      if (err) throw err
      rideStops.value = data || []
      return data || []
    } catch (e: any) {
      error.value = e.message
      return []
    }
  }

  const updateStopStatus = async (stopId: string, status: RideStop['status']) => {
    try {
      const updates: any = { status }
      if (status === 'arrived') updates.arrived_at = new Date().toISOString()
      if (status === 'completed') updates.completed_at = new Date().toISOString()

      const { error: err } = await (supabase
        .from('ride_stops') as any)
        .update(updates)
        .eq('id', stopId)

      if (err) throw err
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // =====================================================
  // 3. FARE SPLITTING
  // =====================================================

  const createFareSplit = async (rideId: string, totalAmount: number, participants: {
    userId?: string
    phone?: string
    email?: string
    amount?: number
    percentage?: number
  }[], splitType: 'equal' | 'custom' | 'percentage' = 'equal') => {
    if (!authStore.user?.id) return null
    try {
      // Create split
      const { data: split, error: splitErr } = await (supabase
        .from('fare_splits') as any)
        .insert({
          ride_id: rideId,
          initiated_by: authStore.user.id,
          total_amount: totalAmount,
          split_type: splitType,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        })
        .select()
        .single()

      if (splitErr) throw splitErr

      // Calculate amounts
      const equalAmount = totalAmount / (participants.length + 1)
      
      // Add participants
      const participantData = participants.map(p => ({
        split_id: split.id,
        user_id: p.userId || null,
        phone_number: p.phone || null,
        email: p.email || null,
        amount: splitType === 'equal' ? equalAmount : (p.amount || 0),
        percentage: splitType === 'percentage' ? p.percentage : null
      }))

      const { error: partErr } = await (supabase
        .from('fare_split_participants') as any)
        .insert(participantData)

      if (partErr) throw partErr

      return split
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  const respondToFareSplit = async (participantId: string, accept: boolean) => {
    try {
      const { error: err } = await (supabase
        .from('fare_split_participants') as any)
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', participantId)

      if (err) throw err
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  const getPendingFareSplits = async () => {
    if (!authStore.user?.id) return []
    try {
      const { data, error: err } = await (supabase
        .from('fare_split_participants') as any)
        .select(`
          *,
          fare_splits (*)
        `)
        .eq('user_id', authStore.user.id)
        .eq('status', 'pending')

      if (err) throw err
      return data || []
    } catch (e: any) {
      error.value = e.message
      return []
    }
  }

  // =====================================================
  // 4. DRIVER PREFERENCES
  // =====================================================

  const favoriteDrivers = ref<FavoriteDriver[]>([])
  const blockedDrivers = ref<BlockedDriver[]>([])
  const driverPreferences = ref<DriverPreferences | null>(null)

  const fetchFavoriteDrivers = async () => {
    if (!authStore.user?.id) return []
    try {
      // Try RPC function first
      const { data, error: err } = await (supabase.rpc as any)('get_favorite_drivers', {
        p_user_id: authStore.user.id
      })

      if (err) {
        // Fallback to direct query if function doesn't exist
        if (err.code === 'PGRST202' || err.message?.includes('not found')) {
          const { data: fallbackData } = await (supabase
            .from('favorite_drivers') as any)
            .select(`
              driver_id,
              created_at,
              driver:service_providers(
                id,
                rating,
                total_rides,
                vehicle_type,
                vehicle_plate,
                user:users(first_name, last_name, phone_number)
              )
            `)
            .eq('user_id', authStore.user.id)
            .order('created_at', { ascending: false })
          
          // Transform to expected format
          favoriteDrivers.value = (fallbackData || []).map((fd: any) => ({
            provider_id: fd.driver_id,
            provider_name: fd.driver?.user ? 
              `${fd.driver.user.first_name || ''} ${fd.driver.user.last_name || ''}`.trim() || 'ไม่ระบุชื่อ' : 
              'ไม่ระบุชื่อ',
            provider_phone: fd.driver?.user?.phone_number || '',
            provider_rating: fd.driver?.rating || 5.0,
            total_rides: fd.driver?.total_rides || 0,
            vehicle_type: fd.driver?.vehicle_type || '',
            vehicle_plate: fd.driver?.vehicle_plate || '',
            favorited_at: fd.created_at
          }))
          return favoriteDrivers.value
        }
        throw err
      }
      
      favoriteDrivers.value = data || []
      return data || []
    } catch (e: any) {
      // Silently fail - don't spam console
      favoriteDrivers.value = []
      return []
    }
  }

  const addFavoriteDriver = async (providerId: string, nickname?: string) => {
    if (!authStore.user?.id) return false
    try {
      const { error: err } = await (supabase
        .from('favorite_drivers') as any)
        .insert({
          user_id: authStore.user.id,
          provider_id: providerId,
          nickname
        })

      if (err) throw err
      await fetchFavoriteDrivers()
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  const removeFavoriteDriver = async (providerId: string) => {
    if (!authStore.user?.id) return false
    try {
      const { error: err } = await (supabase
        .from('favorite_drivers') as any)
        .delete()
        .eq('user_id', authStore.user.id)
        .eq('provider_id', providerId)

      if (err) throw err
      await fetchFavoriteDrivers()
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  const blockDriver = async (providerId: string, reason?: string) => {
    if (!authStore.user?.id) return false
    try {
      const { error: err } = await (supabase
        .from('blocked_drivers') as any)
        .insert({
          user_id: authStore.user.id,
          provider_id: providerId,
          reason
        })

      if (err) throw err
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  const unblockDriver = async (providerId: string) => {
    if (!authStore.user?.id) return false
    try {
      const { error: err } = await (supabase
        .from('blocked_drivers') as any)
        .delete()
        .eq('user_id', authStore.user.id)
        .eq('provider_id', providerId)

      if (err) throw err
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  const updateDriverPreferences = async (prefs: Partial<DriverPreferences>) => {
    if (!authStore.user?.id) return false
    try {
      const { error: err } = await (supabase
        .from('driver_preferences') as any)
        .upsert({
          user_id: authStore.user.id,
          ...prefs,
          updated_at: new Date().toISOString()
        })

      if (err) throw err
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // =====================================================
  // 5. VOICE CALLS
  // =====================================================

  const initiateVoiceCall = async (rideId: string, receiverId: string, receiverType: 'user' | 'provider') => {
    if (!authStore.user?.id) return null
    try {
      const { data, error: err } = await (supabase
        .from('voice_calls') as any)
        .insert({
          ride_id: rideId,
          caller_type: 'user',
          caller_id: authStore.user.id,
          receiver_type: receiverType,
          receiver_id: receiverId,
          call_status: 'initiated'
        })
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  const updateCallStatus = async (callId: string, status: VoiceCall['call_status'], duration?: number) => {
    try {
      const updates: any = { call_status: status }
      if (status === 'answered') updates.answered_at = new Date().toISOString()
      if (status === 'ended') {
        updates.ended_at = new Date().toISOString()
        if (duration) updates.duration_seconds = duration
      }

      const { error: err } = await (supabase
        .from('voice_calls') as any)
        .update(updates)
        .eq('id', callId)

      if (err) throw err
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // =====================================================
  // 6. RIDE INSURANCE
  // =====================================================

  const insurancePlans = ref<InsurancePlan[]>([])
  const userInsurance = ref<UserInsurance | null>(null)

  const fetchInsurancePlans = async () => {
    try {
      const { data, error: err } = await (supabase
        .from('insurance_plans') as any)
        .select('*')
        .eq('is_active', true)
        .order('price_per_ride', { ascending: true })

      if (err) throw err
      insurancePlans.value = data || []
      return data || []
    } catch (e: any) {
      error.value = e.message
      return []
    }
  }

  const getUserInsurance = async () => {
    if (!authStore.user?.id) return null
    try {
      const { data, error: err } = await (supabase
        .from('user_insurance') as any)
        .select(`*, plan:insurance_plans(*)`)
        .eq('user_id', authStore.user.id)
        .eq('status', 'active')
        .single()

      if (err && err.code !== 'PGRST116') throw err
      userInsurance.value = data
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  const subscribeToInsurance = async (planId: string, subscriptionType: 'per_ride' | 'monthly' | 'yearly' = 'per_ride') => {
    if (!authStore.user?.id) return null
    try {
      let validUntil = null
      if (subscriptionType === 'monthly') {
        validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      } else if (subscriptionType === 'yearly') {
        validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }

      const { data, error: err } = await (supabase
        .from('user_insurance') as any)
        .insert({
          user_id: authStore.user.id,
          plan_id: planId,
          subscription_type: subscriptionType,
          valid_until: validUntil,
          auto_renew: subscriptionType !== 'per_ride'
        })
        .select()
        .single()

      if (err) throw err
      await getUserInsurance()
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  const submitInsuranceClaim = async (claim: {
    rideId?: string
    claimType: InsuranceClaim['claim_type']
    description: string
    incidentDate: string
    incidentLocation?: string
    evidenceUrls?: string[]
    claimedAmount: number
  }) => {
    if (!authStore.user?.id || !userInsurance.value) return null
    try {
      const { data, error: err } = await (supabase
        .from('insurance_claims') as any)
        .insert({
          user_insurance_id: userInsurance.value.id,
          ride_id: claim.rideId,
          user_id: authStore.user.id,
          claim_type: claim.claimType,
          description: claim.description,
          incident_date: claim.incidentDate,
          incident_location: claim.incidentLocation,
          evidence_urls: claim.evidenceUrls || [],
          claimed_amount: claim.claimedAmount
        })
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  // =====================================================
  // 8. SUBSCRIPTION PLANS
  // =====================================================

  const subscriptionPlans = ref<SubscriptionPlan[]>([])
  const userSubscription = ref<UserSubscription | null>(null)
  const subscriptionStatus = ref<SubscriptionStatus | null>(null)

  const fetchSubscriptionPlans = async () => {
    try {
      const { data, error: err } = await (supabase
        .from('subscription_plans') as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (err) throw err
      subscriptionPlans.value = data || []
      return data || []
    } catch (e: any) {
      error.value = e.message
      return []
    }
  }

  const getUserSubscription = async () => {
    if (!authStore.user?.id) return null
    try {
      const { data, error: err } = await (supabase
        .from('user_subscriptions') as any)
        .select(`*, plan:subscription_plans(*)`)
        .eq('user_id', authStore.user.id)
        .eq('status', 'active')
        .single()

      if (err && err.code !== 'PGRST116') throw err
      userSubscription.value = data
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  const checkSubscriptionStatus = async (): Promise<SubscriptionStatus | null> => {
    if (!authStore.user?.id) return null
    try {
      const { data, error: err } = await (supabase.rpc as any)('check_user_subscription', {
        p_user_id: authStore.user.id
      })

      if (err) throw err
      subscriptionStatus.value = data?.[0] || null
      return data?.[0] || null
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  const subscribeToPlan = async (planId: string) => {
    if (!authStore.user?.id) return null
    try {
      const plan = subscriptionPlans.value.find(p => p.id === planId)
      if (!plan) throw new Error('Plan not found')

      let periodEnd = new Date()
      switch (plan.billing_cycle) {
        case 'weekly':
          periodEnd.setDate(periodEnd.getDate() + 7)
          break
        case 'monthly':
          periodEnd.setMonth(periodEnd.getMonth() + 1)
          break
        case 'quarterly':
          periodEnd.setMonth(periodEnd.getMonth() + 3)
          break
        case 'yearly':
          periodEnd.setFullYear(periodEnd.getFullYear() + 1)
          break
      }

      const { data, error: err } = await (supabase
        .from('user_subscriptions') as any)
        .insert({
          user_id: authStore.user.id,
          plan_id: planId,
          current_period_end: periodEnd.toISOString(),
          free_cancellations_remaining: plan.free_cancellations,
          ride_credits_remaining: plan.ride_credits
        })
        .select()
        .single()

      if (err) throw err
      await getUserSubscription()
      await checkSubscriptionStatus()
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  const cancelSubscription = async (reason?: string) => {
    if (!userSubscription.value) return false
    try {
      const { error: err } = await (supabase
        .from('user_subscriptions') as any)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason,
          auto_renew: false
        })
        .eq('id', userSubscription.value.id)

      if (err) throw err
      userSubscription.value = null
      subscriptionStatus.value = null
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // Computed
  const hasActiveSubscription = computed(() => subscriptionStatus.value?.has_subscription || false)
  const subscriptionDiscount = computed(() => subscriptionStatus.value?.discount_percentage || 0)

  return {
    loading,
    error,
    // Scheduled Rides
    scheduledRides,
    fetchScheduledRides,
    createScheduledRide,
    cancelScheduledRide,
    // Multi-stop
    rideStops,
    addRideStop,
    getRideStops,
    updateStopStatus,
    // Fare Splitting
    createFareSplit,
    respondToFareSplit,
    getPendingFareSplits,
    // Driver Preferences
    favoriteDrivers,
    blockedDrivers,
    driverPreferences,
    fetchFavoriteDrivers,
    addFavoriteDriver,
    removeFavoriteDriver,
    blockDriver,
    unblockDriver,
    updateDriverPreferences,
    // Voice Calls
    initiateVoiceCall,
    updateCallStatus,
    // Insurance
    insurancePlans,
    userInsurance,
    fetchInsurancePlans,
    getUserInsurance,
    subscribeToInsurance,
    submitInsuranceClaim,
    // Subscriptions
    subscriptionPlans,
    userSubscription,
    subscriptionStatus,
    hasActiveSubscription,
    subscriptionDiscount,
    fetchSubscriptionPlans,
    getUserSubscription,
    checkSubscriptionStatus,
    subscribeToPlan,
    cancelSubscription
  }
}
