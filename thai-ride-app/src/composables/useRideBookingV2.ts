/**
 * useRideBookingV2 - Diamond Standard Ride Booking System
 * 
 * Feature: F02 - Customer Ride Booking (Enhanced)
 * 
 * Diamond Standard Requirements:
 * ✅ 50-Session Endurance: Memory management, cleanup, no leaks
 * ✅ Multi-Dimensional Seamless Flow: Optimistic UI, State harmony
 * ✅ Zero-Error Defensive Programming: Graceful degradation
 * 
 * @syncs-with
 * - Admin: useAdmin.ts (ดู/จัดการออเดอร์)
 * - Provider: useProvider.ts (รับงาน/อัพเดทสถานะ)
 * - Database: Realtime subscription on ride_requests
 */

import { ref, computed, shallowRef, triggerRef, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ============================================
// TYPES
// ============================================
export interface Location {
  lat: number
  lng: number
  address: string
}

export interface RideType {
  value: 'standard' | 'premium' | 'shared'
  label: string
  description: string
  multiplier: number
  icon: string
  eta: string
  capacity: number
}

export interface MatchedDriver {
  id: string
  name: string
  phone: string
  rating: number
  totalTrips: number
  vehicleType: string
  vehicleColor: string
  vehiclePlate: string
  avatarUrl?: string
  currentLat: number
  currentLng: number
  eta: number
}

export interface RideRequest {
  id: string
  userId: string
  trackingId: string
  status: RideStatus
  pickup: Location
  destination: Location
  rideType: RideType['value']
  passengerCount: number
  estimatedFare: number
  finalFare?: number
  providerId?: string
  provider?: MatchedDriver
  scheduledAt?: string
  specialRequests?: string
  createdAt: string
  updatedAt: string
}

export type RideStatus = 
  | 'pending' 
  | 'matched' 
  | 'pickup' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled'
  | 'scheduled'

export type BookingStep = 'pickup' | 'destination' | 'options' | 'confirm'

export interface BookingState {
  step: BookingStep
  pickup: Location | null
  destination: Location | null
  rideType: RideType['value']
  passengerCount: number
  paymentMethod: 'cash' | 'wallet' | 'card'
  promoCode: string
  specialRequests: string
  isScheduled: boolean
  scheduledDate: string
  scheduledTime: string
}

// ============================================
// CONSTANTS
// ============================================
export const RIDE_TYPES: RideType[] = [
  { 
    value: 'standard', 
    label: 'สบาย', 
    description: 'เดินทางสบายกับคนขับที่ไว้ใจได้',
    multiplier: 1.0, 
    icon: 'comfort',
    eta: '2 นาที',
    capacity: 4
  },
  { 
    value: 'premium', 
    label: 'พรีเมียม', 
    description: 'รถหรูสำหรับโอกาสพิเศษ',
    multiplier: 1.5, 
    icon: 'premium',
    eta: '5 นาที',
    capacity: 4
  },
  { 
    value: 'shared', 
    label: 'แชร์', 
    description: 'แชร์การเดินทาง ประหยัดกว่า',
    multiplier: 0.7, 
    icon: 'share',
    eta: '5 นาที',
    capacity: 2
  }
]

const BASE_FARE = 35
const PER_KM_RATES = { standard: 10, premium: 15, shared: 8 }
const MIN_FARES = { standard: 50, premium: 80, shared: 40 }

// ============================================
// SINGLETON STATE (Shared across components)
// ============================================
// Using module-level state for singleton pattern
// This ensures state persists across component mounts/unmounts
// and prevents memory leaks from multiple instances

let _instance: ReturnType<typeof createRideBookingInstance> | null = null
let _instanceCount = 0
let _cleanupTimer: ReturnType<typeof setTimeout> | null = null

// ============================================
// MEMORY MANAGEMENT
// ============================================
class SubscriptionManager {
  private subscriptions: Map<string, RealtimeChannel> = new Map()
  private cleanupCallbacks: Set<() => void> = new Set()
  
  add(key: string, channel: RealtimeChannel) {
    // Clean up existing subscription with same key
    this.remove(key)
    this.subscriptions.set(key, channel)
  }
  
  remove(key: string) {
    const existing = this.subscriptions.get(key)
    if (existing) {
      existing.unsubscribe()
      this.subscriptions.delete(key)
    }
  }
  

  
  addCleanup(callback: () => void) {
    this.cleanupCallbacks.add(callback)
  }
  
  removeCleanup(callback: () => void) {
    this.cleanupCallbacks.delete(callback)
  }
  
  cleanup() {
    // Unsubscribe all channels
    this.subscriptions.forEach((channel) => {
      channel.unsubscribe()
    })
    this.subscriptions.clear()
    
    // Run cleanup callbacks
    this.cleanupCallbacks.forEach(cb => cb())
    this.cleanupCallbacks.clear()
  }
  
  get size() {
    return this.subscriptions.size
  }
}

// ============================================
// REQUEST DEDUPLICATION & CACHING
// ============================================
class RequestCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
  private pendingRequests: Map<string, Promise<any>> = new Map()
  
  async dedupe<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = 30000
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T
    }
    
    // Check if request is already pending
    const pending = this.pendingRequests.get(key)
    if (pending) {
      return pending as Promise<T>
    }
    
    // Create new request
    const request = fetcher()
      .then(data => {
        this.cache.set(key, { data, timestamp: Date.now(), ttl })
        this.pendingRequests.delete(key)
        return data
      })
      .catch(err => {
        this.pendingRequests.delete(key)
        throw err
      })
    
    this.pendingRequests.set(key, request)
    return request
  }
  
  invalidate(key: string) {
    this.cache.delete(key)
  }
  
  clear() {
    this.cache.clear()
    this.pendingRequests.clear()
  }
}

// ============================================
// OPTIMISTIC UPDATE MANAGER
// ============================================
class OptimisticUpdateManager<T> {
  private rollbackStack: Array<{ key: string; previousValue: T; timestamp: number }> = []
  private maxStackSize = 10
  
  push(key: string, previousValue: T) {
    this.rollbackStack.push({ key, previousValue, timestamp: Date.now() })
    
    // Limit stack size to prevent memory issues
    if (this.rollbackStack.length > this.maxStackSize) {
      this.rollbackStack.shift()
    }
  }
  
  pop(key: string): T | undefined {
    const index = this.rollbackStack.findIndex(item => item.key === key)
    if (index !== -1) {
      const removed = this.rollbackStack.splice(index, 1)
      return removed[0]?.previousValue
    }
    return undefined
  }
  
  clear() {
    this.rollbackStack = []
  }
}

// ============================================
// CIRCUIT BREAKER (Fail-safe pattern)
// ============================================
class CircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private threshold: number
  private resetTimeout: number
  
  constructor(threshold: number = 3, resetTimeout: number = 30000) {
    this.threshold = threshold
    this.resetTimeout = resetTimeout
  }
  
  async execute<T>(operation: () => Promise<T>, fallback?: () => T): Promise<T> {
    // Check if circuit should reset
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open'
      } else {
        if (fallback) return fallback()
        throw new Error('Circuit breaker is open')
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      if (fallback) return fallback()
      throw error
    }
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }
  
  private onFailure() {
    this.failures++
    this.lastFailure = Date.now()
    if (this.failures >= this.threshold) {
      this.state = 'open'
    }
  }
  
  get isOpen() {
    return this.state === 'open'
  }
  
  reset() {
    this.failures = 0
    this.state = 'closed'
  }
}

// ============================================
// MAIN COMPOSABLE FACTORY
// ============================================
function createRideBookingInstance() {
  // Managers (singleton per instance)
  const subscriptionManager = new SubscriptionManager()
  const requestCache = new RequestCache()
  const optimisticManager = new OptimisticUpdateManager<RideRequest | null>()
  const circuitBreaker = new CircuitBreaker(3, 30000)
  
  // ============================================
  // REACTIVE STATE (using shallowRef for performance)
  // ============================================
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = ref(false)
  
  // Booking state
  const bookingState = ref<BookingState>({
    step: 'pickup',
    pickup: null,
    destination: null,
    rideType: 'standard',
    passengerCount: 1,
    paymentMethod: 'cash',
    promoCode: '',
    specialRequests: '',
    isScheduled: false,
    scheduledDate: '',
    scheduledTime: ''
  })
  
  // Active ride (using shallowRef to avoid deep reactivity overhead)
  const currentRide = shallowRef<RideRequest | null>(null)
  const matchedDriver = shallowRef<MatchedDriver | null>(null)
  
  // Fare calculation
  const estimatedFare = ref(0)
  const estimatedDistance = ref(0)
  const estimatedTime = ref(0)
  const surgeMultiplier = ref(1.0)
  
  // UI state
  const isCalculating = ref(false)
  const isBooking = ref(false)
  const viewMode = ref<'booking' | 'tracking'>('booking')
  
  // ============================================
  // COMPUTED PROPERTIES
  // ============================================
  const hasActiveRide = computed(() => 
    currentRide.value && 
    ['pending', 'matched', 'pickup', 'in_progress'].includes(currentRide.value.status)
  )
  
  const canCalculateFare = computed(() => 
    bookingState.value.pickup && bookingState.value.destination
  )
  
  const selectedRideType = computed(() => 
    RIDE_TYPES.find(t => t.value === bookingState.value.rideType) || RIDE_TYPES[0]
  )
  
  const finalFare = computed(() => {
    let fare = estimatedFare.value
    if (surgeMultiplier.value > 1) {
      fare = fare * surgeMultiplier.value
    }
    return Math.round(fare)
  })
  
  const currentStepIndex = computed(() => {
    const steps: BookingStep[] = ['pickup', 'destination', 'options', 'confirm']
    return steps.indexOf(bookingState.value.step)
  })

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const calculateDistance = (
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number => {
    const R = 6371 // Earth's radius in km
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
  
  const toRad = (deg: number): number => deg * (Math.PI / 180)
  
  const calculateFareAmount = (
    distanceKm: number, 
    rideType: RideType['value']
  ): number => {
    const perKmRate = PER_KM_RATES[rideType]
    const minFare = MIN_FARES[rideType]
    const calculatedFare = BASE_FARE + (distanceKm * perKmRate)
    return Math.round(Math.max(calculatedFare, minFare))
  }
  
  const calculateTravelTime = (distanceKm: number): number => {
    // Assume average speed of 25 km/h in city traffic
    return Math.ceil((distanceKm / 25) * 60)
  }
  
  // ============================================
  // HAPTIC FEEDBACK
  // ============================================
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = { light: 10, medium: 25, heavy: 50 }
      navigator.vibrate(patterns[type])
    }
  }
  
  // ============================================
  // ERROR HANDLING
  // ============================================
  const handleError = (err: any, context: string): string => {
    console.error(`[RideBookingV2] ${context}:`, err)
    
    // Network errors
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
    }
    
    // Supabase errors
    if (err.code === 'PGRST116') {
      return 'ไม่พบข้อมูล'
    }
    
    // Generic error
    return err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  }

  // ============================================
  // CORE METHODS
  // ============================================
  
  /**
   * Initialize the booking system
   * Restores active ride if exists
   */
  const initialize = async (userId: string) => {
    if (isInitialized.value) return
    
    loading.value = true
    error.value = null
    
    try {
      await circuitBreaker.execute(async () => {
        const { data, error: queryError } = await (supabase
          .from('ride_requests') as any)
          .select(`
            *,
            provider:provider_id (
              id, user_id, vehicle_type, vehicle_plate, vehicle_color,
              rating, total_trips, current_lat, current_lng,
              users:user_id (name, phone, avatar_url)
            )
          `)
          .eq('user_id', userId)
          .in('status', ['pending', 'matched', 'pickup', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (queryError) throw queryError
        
        if (data) {
          currentRide.value = mapRideFromDB(data)
          triggerRef(currentRide)
          
          if (data.provider) {
            matchedDriver.value = mapDriverFromDB(data.provider)
            triggerRef(matchedDriver)
          }
          
          // Subscribe to updates
          subscribeToRideUpdates(data.id)
          if (data.provider_id) {
            subscribeToDriverLocation(data.provider_id)
          }
          
          viewMode.value = 'tracking'
        }
      })
      
      isInitialized.value = true
    } catch (err) {
      error.value = handleError(err, 'initialize')
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Map database ride to our interface
   */
  const mapRideFromDB = (data: any): RideRequest => ({
    id: data.id,
    userId: data.user_id,
    trackingId: data.tracking_id,
    status: data.status,
    pickup: {
      lat: data.pickup_lat,
      lng: data.pickup_lng,
      address: data.pickup_address
    },
    destination: {
      lat: data.destination_lat,
      lng: data.destination_lng,
      address: data.destination_address
    },
    rideType: data.ride_type,
    passengerCount: data.passenger_count,
    estimatedFare: data.estimated_fare,
    finalFare: data.final_fare,
    providerId: data.provider_id,
    scheduledAt: data.scheduled_time,
    specialRequests: data.special_requests,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  })
  
  /**
   * Map database provider to our interface
   */
  const mapDriverFromDB = (provider: any): MatchedDriver => {
    const user = provider.users
    return {
      id: provider.id,
      name: user?.name || 'คนขับ',
      phone: user?.phone || '',
      rating: provider.rating || 4.8,
      totalTrips: provider.total_trips || 0,
      vehicleType: provider.vehicle_type || 'รถยนต์',
      vehicleColor: provider.vehicle_color || 'สีดำ',
      vehiclePlate: provider.vehicle_plate || '',
      avatarUrl: user?.avatar_url,
      currentLat: provider.current_lat,
      currentLng: provider.current_lng,
      eta: 5
    }
  }

  // ============================================
  // BOOKING FLOW METHODS
  // ============================================
  
  /**
   * Set pickup location
   */
  const setPickup = async (location: Location) => {
    bookingState.value.pickup = location
    triggerHaptic('light')
    
    // Calculate surge pricing in background
    calculateSurge(location.lat, location.lng)
  }
  
  /**
   * Set destination location
   */
  const setDestination = async (location: Location) => {
    bookingState.value.destination = location
    triggerHaptic('light')
    
    // Auto-calculate fare
    if (bookingState.value.pickup) {
      await calculateFare()
    }
  }
  
  /**
   * Calculate fare with optimistic update
   */
  const calculateFare = async () => {
    const { pickup, destination, rideType } = bookingState.value
    if (!pickup || !destination) return
    
    isCalculating.value = true
    
    try {
      // Calculate distance
      const distance = calculateDistance(
        pickup.lat, pickup.lng,
        destination.lat, destination.lng
      )
      
      // Optimistic update
      estimatedDistance.value = distance
      estimatedTime.value = calculateTravelTime(distance)
      estimatedFare.value = calculateFareAmount(distance, rideType)
      
      // Move to options step
      bookingState.value.step = 'options'
      triggerHaptic('medium')
      
    } catch (err) {
      error.value = handleError(err, 'calculateFare')
    } finally {
      isCalculating.value = false
    }
  }
  
  /**
   * Calculate surge pricing
   */
  const calculateSurge = async (lat: number, lng: number) => {
    try {
      const cacheKey = `surge_${lat.toFixed(2)}_${lng.toFixed(2)}`
      
      const multiplier = await requestCache.dedupe(cacheKey, async () => {
        const { data } = await (supabase.rpc as any)('get_surge_multiplier', {
          p_lat: lat,
          p_lng: lng
        })
        return data || 1.0
      }, 60000) // Cache for 1 minute
      
      surgeMultiplier.value = multiplier
    } catch {
      // Silent fail - use default multiplier
      surgeMultiplier.value = 1.0
    }
  }
  
  /**
   * Select ride type
   */
  const selectRideType = (type: RideType['value']) => {
    bookingState.value.rideType = type
    triggerHaptic('light')
    
    // Recalculate fare
    if (estimatedDistance.value > 0) {
      estimatedFare.value = calculateFareAmount(estimatedDistance.value, type)
    }
  }

  // ============================================
  // RIDE CREATION WITH OPTIMISTIC UPDATE
  // ============================================
  
  /**
   * Create ride request with optimistic UI update
   */
  const createRide = async (userId: string): Promise<RideRequest | null> => {
    const { pickup, destination, rideType, passengerCount, specialRequests,
            isScheduled, scheduledDate, scheduledTime } = bookingState.value
    
    if (!pickup || !destination) {
      error.value = 'กรุณาเลือกจุดรับและจุดหมาย'
      return null
    }
    
    isBooking.value = true
    error.value = null
    
    // Create optimistic ride
    const optimisticRide: RideRequest = {
      id: `temp-${Date.now()}`,
      userId,
      trackingId: `RID-PENDING`,
      status: isScheduled ? 'scheduled' : 'pending',
      pickup,
      destination,
      rideType,
      passengerCount,
      estimatedFare: finalFare.value,
      specialRequests,
      scheduledAt: isScheduled ? `${scheduledDate}T${scheduledTime}` : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Optimistic update - show immediately
    optimisticManager.push('currentRide', currentRide.value)
    currentRide.value = optimisticRide
    triggerRef(currentRide)
    viewMode.value = 'tracking'
    triggerHaptic('heavy')
    
    try {
      const result = await circuitBreaker.execute(async () => {
        const insertPayload = {
          user_id: userId,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          pickup_address: pickup.address,
          destination_lat: destination.lat,
          destination_lng: destination.lng,
          destination_address: destination.address,
          ride_type: rideType,
          passenger_count: passengerCount,
          special_requests: specialRequests || null,
          estimated_fare: finalFare.value,
          status: isScheduled ? 'scheduled' : 'pending',
          scheduled_time: isScheduled ? `${scheduledDate}T${scheduledTime}` : null
        }
        
        const { data, error: insertError } = await (supabase
          .from('ride_requests') as any)
          .insert(insertPayload)
          .select()
          .single()
        
        if (insertError) throw insertError
        return data
      })
      
      // Update with real data
      currentRide.value = mapRideFromDB(result)
      triggerRef(currentRide)
      
      // Subscribe to updates
      subscribeToRideUpdates(result.id)
      
      // Find driver if not scheduled
      if (!isScheduled) {
        findAndMatchDriver()
      }
      
      return currentRide.value
      
    } catch (err) {
      // Rollback optimistic update
      const previous = optimisticManager.pop('currentRide')
      currentRide.value = previous || null
      triggerRef(currentRide)
      viewMode.value = 'booking'
      
      error.value = handleError(err, 'createRide')
      return null
    } finally {
      isBooking.value = false
    }
  }

  // ============================================
  // DRIVER MATCHING
  // ============================================
  
  /**
   * Find and match driver for current ride
   */
  const findAndMatchDriver = async (): Promise<MatchedDriver | null> => {
    if (!currentRide.value) return null
    
    loading.value = true
    
    try {
      const ride = currentRide.value
      
      // Find nearby drivers with caching
      const cacheKey = `drivers_${ride.pickup.lat.toFixed(2)}_${ride.pickup.lng.toFixed(2)}`
      
      const drivers = await requestCache.dedupe(cacheKey, async () => {
        const { data, error: err } = await (supabase.rpc as any)('find_nearby_providers', {
          lat: ride.pickup.lat,
          lng: ride.pickup.lng,
          radius_km: 5,
          provider_type_filter: 'driver'
        })
        if (err) throw err
        return data || []
      }, 30000)
      
      if (!drivers.length) {
        error.value = 'ไม่พบคนขับในบริเวณใกล้เคียง กรุณารอสักครู่'
        return null
      }
      
      // Get first available driver
      const driver = drivers[0] as any
      const { data: providerData, error: providerError } = await (supabase
        .from('service_providers') as any)
        .select(`*, users:user_id (name, phone, avatar_url)`)
        .eq('id', driver.provider_id)
        .single()
      
      if (providerError || !providerData) {
        error.value = 'ไม่สามารถดึงข้อมูลคนขับได้'
        return null
      }
      
      // Update ride with matched driver (optimistic)
      const previousRide = { ...currentRide.value } as RideRequest
      currentRide.value = { ...currentRide.value!, status: 'matched', providerId: providerData.id }
      triggerRef(currentRide)
      
      // Update in database
      const { error: updateError } = await (supabase
        .from('ride_requests') as any)
        .update({ provider_id: providerData.id, status: 'matched' })
        .eq('id', ride.id)
      
      if (updateError) {
        // Rollback
        currentRide.value = previousRide
        triggerRef(currentRide)
        throw updateError
      }
      
      // Set matched driver
      matchedDriver.value = mapDriverFromDB(providerData)
      triggerRef(matchedDriver)
      
      // Subscribe to driver location
      subscribeToDriverLocation(providerData.id)
      
      triggerHaptic('heavy')
      return matchedDriver.value
      
    } catch (err) {
      error.value = handleError(err, 'findAndMatchDriver')
      return null
    } finally {
      loading.value = false
    }
  }

  // ============================================
  // RIDE MANAGEMENT
  // ============================================
  
  /**
   * Calculate cancellation fee based on current status
   */
  const calculateCancellationFee = (): number => {
    if (!currentRide.value) return 0
    
    const { status, estimatedFare } = currentRide.value
    let feePercentage = 0
    
    switch (status) {
      case 'pending':
      case 'scheduled':
        feePercentage = 0 // Free cancellation
        break
      case 'matched':
        feePercentage = 0.30 // 30% fee
        break
      case 'pickup':
        feePercentage = 0.50 // 50% fee (driver on the way)
        break
      case 'in_progress':
        feePercentage = 1.00 // 100% (cannot cancel normally)
        break
      default:
        feePercentage = 0
    }
    
    let fee = Math.round(estimatedFare * feePercentage)
    
    // Minimum fee of 20 baht if there's any fee
    if (fee > 0 && fee < 20) fee = 20
    
    // Maximum fee cap at 200 baht
    if (fee > 200) fee = 200
    
    return fee
  }
  
  /**
   * Cancel ride with optimistic update, fee calculation, and refund
   */
  const cancelRide = async (reason?: string): Promise<{ success: boolean; fee: number; refund: number }> => {
    // Validate current ride exists
    if (!currentRide.value) {
      error.value = 'ไม่พบข้อมูลการเดินทาง'
      return { success: false, fee: 0, refund: 0 }
    }
    
    const rideId = currentRide.value.id
    
    // Check if ride id is temporary (not yet saved to database)
    if (rideId.startsWith('temp-')) {
      // Just clear the local state - ride was never saved
      cleanup()
      triggerHaptic('medium')
      return { success: true, fee: 0, refund: 0 }
    }
    
    // Check if ride can be cancelled (only pending, matched, pickup statuses)
    const cancellableStatuses = ['pending', 'matched', 'pickup', 'scheduled']
    if (!cancellableStatuses.includes(currentRide.value.status)) {
      error.value = `ไม่สามารถยกเลิกได้ สถานะปัจจุบัน: ${currentRide.value.status}`
      return { success: false, fee: 0, refund: 0 }
    }
    
    // Calculate fee before cancellation
    const cancellationFee = calculateCancellationFee()
    
    // Optimistic update
    const previousRide = currentRide.value
    currentRide.value = { ...currentRide.value, status: 'cancelled' }
    triggerRef(currentRide)
    
    try {
      // Try using the enhanced refund function first
      const { data: refundData, error: refundError } = await (supabase.rpc as any)(
        'cancel_ride_with_refund',
        {
          p_ride_id: rideId,
          p_reason: reason || 'ลูกค้ายกเลิก',
          p_cancelled_by: 'customer'
        }
      )
      
      if (!refundError && refundData?.[0]) {
        // Success with refund function
        cleanup()
        triggerHaptic('medium')
        return { 
          success: refundData[0].success, 
          fee: refundData[0].cancellation_fee || 0,
          refund: refundData[0].refund_amount || 0
        }
      }
      
      // Fallback to basic cancel function
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
        'cancel_ride_with_fee',
        {
          p_ride_id: rideId,
          p_reason: reason || 'ลูกค้ายกเลิก',
          p_cancelled_by: 'customer'
        }
      )
      
      if (rpcError) {
        // Fallback to direct update if function doesn't exist
        console.warn('[cancelRide] RPC failed, using direct update:', rpcError)
        
        const { data, error: cancelError } = await (supabase
          .from('ride_requests') as any)
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancel_reason: reason || 'ลูกค้ายกเลิก',
            cancelled_by: 'customer',
            cancellation_fee: cancellationFee
          })
          .eq('id', rideId)
          .select()
          .single()
        
        if (cancelError) throw cancelError
        if (!data) throw new Error('ไม่พบข้อมูลการเดินทางในระบบ')
      }
      
      // Notify provider if ride was matched
      if (previousRide.providerId) {
        try {
          // Insert notification for provider
          await (supabase.from('user_notifications') as any).insert({
            user_id: previousRide.providerId,
            title: 'งานถูกยกเลิก',
            message: `ลูกค้ายกเลิกงาน: ${reason || 'ไม่ระบุเหตุผล'}`,
            type: 'ride_cancelled',
            data: { ride_id: rideId, reason: reason || 'ไม่ระบุเหตุผล' },
            is_read: false
          })
          
          // Queue push notification
          await (supabase.from('push_notification_queue') as any).insert({
            user_id: previousRide.providerId,
            title: 'งานถูกยกเลิก',
            body: `ลูกค้ายกเลิกงาน: ${reason || 'ไม่ระบุเหตุผล'}`,
            data: { type: 'ride_cancelled', ride_id: rideId },
            priority: 'high'
          })
        } catch (notifyErr) {
          console.warn('[cancelRide] Failed to notify provider:', notifyErr)
        }
      }
      
      // Cleanup
      cleanup()
      triggerHaptic('medium')
      return { success: true, fee: cancellationFee, refund: 0 }
      
    } catch (err: any) {
      // Rollback
      currentRide.value = previousRide
      triggerRef(currentRide)
      
      // Set specific error message
      if (err.code === 'PGRST116') {
        error.value = 'ไม่พบข้อมูลการเดินทางในระบบ'
      } else if (err.message?.includes('violates row-level security')) {
        error.value = 'ไม่มีสิทธิ์ยกเลิกการเดินทางนี้'
      } else {
        error.value = handleError(err, 'cancelRide')
      }
      
      return { success: false, fee: 0, refund: 0 }
    }
  }
  
  /**
   * Submit rating after ride completion
   */
  const submitRating = async (
    rating: number, 
    tipAmount: number = 0, 
    comment?: string
  ): Promise<boolean> => {
    if (!currentRide.value || !matchedDriver.value) return false
    
    loading.value = true
    
    try {
      await (supabase.from('ride_ratings') as any).insert({
        ride_id: currentRide.value.id,
        user_id: currentRide.value.userId,
        provider_id: matchedDriver.value.id,
        rating,
        tip_amount: tipAmount,
        comment
      })
      
      // Update provider rating average
      const { data: ratings } = await (supabase
        .from('ride_ratings') as any)
        .select('rating')
        .eq('provider_id', matchedDriver.value.id)
      
      if (ratings?.length) {
        const avgRating = ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
        await (supabase
          .from('service_providers') as any)
          .update({ rating: Math.round(avgRating * 100) / 100 })
          .eq('id', matchedDriver.value.id)
      }
      
      cleanup()
      triggerHaptic('heavy')
      return true
      
    } catch (err) {
      error.value = handleError(err, 'submitRating')
      return false
    } finally {
      loading.value = false
    }
  }

  // ============================================
  // REALTIME SUBSCRIPTIONS
  // ============================================
  
  /**
   * Subscribe to ride status updates
   */
  const subscribeToRideUpdates = (rideId: string) => {
    const channel = supabase
      .channel(`ride-v2:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `id=eq.${rideId}`
        },
        (payload) => {
          const newData = payload.new as any
          
          // Update current ride
          if (currentRide.value) {
            currentRide.value = {
              ...currentRide.value,
              status: newData.status,
              providerId: newData.provider_id,
              finalFare: newData.final_fare,
              updatedAt: newData.updated_at
            }
            triggerRef(currentRide)
          }
          
          // Handle terminal states
          if (['cancelled', 'completed'].includes(newData.status)) {
            // Keep data for rating/receipt, but stop tracking
            subscriptionManager.remove(`ride-v2:${rideId}`)
            subscriptionManager.remove(`driver-v2:${newData.provider_id}`)
          }
          
          // Trigger haptic on status change
          triggerHaptic('medium')
        }
      )
      .subscribe()
    
    subscriptionManager.add(`ride-v2:${rideId}`, channel)
  }
  
  /**
   * Subscribe to driver location updates
   */
  const subscribeToDriverLocation = (providerId: string) => {
    const channel = supabase
      .channel(`driver-v2:${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_providers',
          filter: `id=eq.${providerId}`
        },
        (payload) => {
          const { current_lat, current_lng } = payload.new as any
          
          if (matchedDriver.value && current_lat && current_lng) {
            matchedDriver.value = {
              ...matchedDriver.value,
              currentLat: current_lat,
              currentLng: current_lng
            }
            triggerRef(matchedDriver)
          }
        }
      )
      .subscribe()
    
    subscriptionManager.add(`driver-v2:${providerId}`, channel)
  }

  // ============================================
  // STEP NAVIGATION
  // ============================================
  
  const goToStep = (targetStep: BookingStep) => {
    const steps: BookingStep[] = ['pickup', 'destination', 'options', 'confirm']
    const currentIndex = steps.indexOf(bookingState.value.step)
    const targetIndex = steps.indexOf(targetStep)
    
    // Only allow going back or to current step
    if (targetIndex <= currentIndex) {
      bookingState.value.step = targetStep
      triggerHaptic('light')
    }
  }
  
  const goBack = () => {
    const steps: BookingStep[] = ['pickup', 'destination', 'options', 'confirm']
    const currentIndex = steps.indexOf(bookingState.value.step)
    
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1]
      if (prevStep) {
        bookingState.value.step = prevStep
        triggerHaptic('light')
      }
    }
  }
  
  const goNext = async () => {
    const { step, pickup, destination } = bookingState.value
    
    if (step === 'pickup' && pickup) {
      bookingState.value.step = 'destination'
    } else if (step === 'destination' && destination) {
      await calculateFare()
    } else if (step === 'options') {
      bookingState.value.step = 'confirm'
    }
    
    triggerHaptic('medium')
  }
  
  // ============================================
  // CLEANUP & RESET
  // ============================================
  
  const cleanup = () => {
    subscriptionManager.cleanup()
    requestCache.clear()
    optimisticManager.clear()
    
    currentRide.value = null
    matchedDriver.value = null
    viewMode.value = 'booking'
  }
  
  const reset = () => {
    cleanup()
    
    bookingState.value = {
      step: 'pickup',
      pickup: null,
      destination: null,
      rideType: 'standard',
      passengerCount: 1,
      paymentMethod: 'cash',
      promoCode: '',
      specialRequests: '',
      isScheduled: false,
      scheduledDate: '',
      scheduledTime: ''
    }
    
    estimatedFare.value = 0
    estimatedDistance.value = 0
    estimatedTime.value = 0
    surgeMultiplier.value = 1.0
    error.value = null
    isInitialized.value = false
  }

  // ============================================
  // RETURN INSTANCE
  // ============================================
  
  return {
    // State
    loading,
    error,
    isInitialized,
    bookingState,
    currentRide,
    matchedDriver,
    estimatedFare,
    estimatedDistance,
    estimatedTime,
    surgeMultiplier,
    isCalculating,
    isBooking,
    viewMode,
    
    // Computed
    hasActiveRide,
    canCalculateFare,
    selectedRideType,
    finalFare,
    currentStepIndex,
    
    // Constants
    RIDE_TYPES,
    
    // Methods
    initialize,
    setPickup,
    setDestination,
    calculateFare,
    selectRideType,
    createRide,
    findAndMatchDriver,
    cancelRide,
    calculateCancellationFee,
    submitRating,
    goToStep,
    goBack,
    goNext,
    cleanup,
    reset,
    triggerHaptic,
    
    // Utilities
    calculateDistance,
    calculateFareAmount,
    
    // For debugging
    _subscriptionManager: subscriptionManager,
    _circuitBreaker: circuitBreaker
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

/**
 * useRideBookingV2 - Diamond Standard Composable
 * 
 * Uses singleton pattern to ensure:
 * 1. State persists across component mounts/unmounts
 * 2. Only one set of subscriptions exists
 * 3. Memory is properly managed
 * 
 * The instance is lazily created and cleaned up when
 * no components are using it for 5 minutes.
 */
export function useRideBookingV2() {
  _instanceCount++
  
  // Clear any pending cleanup
  if (_cleanupTimer) {
    clearTimeout(_cleanupTimer)
    _cleanupTimer = null
  }
  
  // Create instance if needed
  if (!_instance) {
    _instance = createRideBookingInstance()
  }
  
  // Setup cleanup on unmount
  onUnmounted(() => {
    _instanceCount--
    
    // Schedule cleanup if no more users
    if (_instanceCount === 0) {
      _cleanupTimer = setTimeout(() => {
        if (_instanceCount === 0 && _instance) {
          _instance.cleanup()
          _instance = null
        }
      }, 5 * 60 * 1000) // 5 minutes
    }
  })
  
  return _instance
}

// Force cleanup (for testing or logout)
export function forceCleanupRideBooking() {
  if (_cleanupTimer) {
    clearTimeout(_cleanupTimer)
    _cleanupTimer = null
  }
  if (_instance) {
    _instance.reset()
    _instance = null
  }
  _instanceCount = 0
}
