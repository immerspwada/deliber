/**
 * Ride Service (F02)
 * 
 * Business logic layer for ride operations
 * Handles ride booking, matching, tracking, and completion
 */

import { BaseService } from './BaseService'
import { RideRepository } from '../repositories/RideRepository'
import { ProviderRepository } from '../repositories/ProviderRepository'
import { UserRepository } from '../repositories/UserRepository'
import { supabase } from '../lib/supabase'
import type { Result } from '../utils/result'
import type { RideRequestInsert } from '../types/database'

export interface CreateRideRequest {
  userId: string
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
  rideType?: 'standard' | 'premium' | 'shared'
  passengerCount?: number
  specialRequests?: string
  scheduledTime?: string
  promoCode?: string
}

export interface RideMatchResult {
  rideId: string
  providerId: string
  estimatedArrival: number
  provider: {
    name: string
    phone: string
    vehicleType: string
    vehiclePlate: string
    rating: number
    location: { lat: number; lng: number }
  }
}

export class RideService extends BaseService {
  private rideRepository: RideRepository
  private providerRepository: ProviderRepository
  private userRepository: UserRepository

  constructor() {
    super('RideService')
    this.rideRepository = new RideRepository()
    this.providerRepository = new ProviderRepository()
    this.userRepository = new UserRepository()
  }

  /**
   * Create a new ride request
   */
  async createRide(request: CreateRideRequest): Promise<Result<{ rideId: string; estimatedFare: number }>> {
    return this.execute(async () => {
      // Validate user exists and is active
      const userResult = await this.userRepository.findById(request.userId)
      if (!userResult.success || !userResult.data) {
        throw new Error('User not found or inactive')
      }

      const user = userResult.data
      if (!user.is_active) {
        throw new Error('User account is not active')
      }

      // Check for existing active ride
      const activeRideResult = await this.rideRepository.findActiveRideForUser(request.userId)
      if (!activeRideResult.success) {
        throw new Error('Failed to check existing rides')
      }

      if (activeRideResult.data) {
        throw new Error('You already have an active ride')
      }

      // Calculate distance and fare
      const distance = this.calculateDistance(
        request.pickup.lat, request.pickup.lng,
        request.destination.lat, request.destination.lng
      )

      const estimatedFare = this.calculateFare(distance, request.rideType || 'standard')

      // Apply promo code if provided
      let finalFare = estimatedFare
      if (request.promoCode) {
        const promoResult = await this.applyPromoCode(request.promoCode, request.userId, estimatedFare)
        if (promoResult.success) {
          finalFare = promoResult.data.discountedAmount
        }
      }

      // Create ride request
      const rideData: RideRequestInsert = {
        user_id: request.userId,
        pickup_lat: request.pickup.lat,
        pickup_lng: request.pickup.lng,
        pickup_address: request.pickup.address,
        destination_lat: request.destination.lat,
        destination_lng: request.destination.lng,
        destination_address: request.destination.address,
        ride_type: request.rideType || 'standard',
        passenger_count: request.passengerCount || 1,
        special_requests: request.specialRequests,
        estimated_fare: finalFare,
        scheduled_time: request.scheduledTime,
        status: 'pending'
      }

      const createResult = await this.rideRepository.create(rideData)
      if (!createResult.success) {
        throw new Error('Failed to create ride request')
      }

      const ride = createResult.data

      // Notify nearby providers
      await this.notifyNearbyProviders(ride.id, request.pickup.lat, request.pickup.lng)

      this.log('info', 'Ride created successfully', { rideId: ride.id, userId: request.userId })

      return {
        rideId: ride.id,
        estimatedFare: finalFare
      }
    }, 'createRide', { userId: request.userId })
  }

  /**
   * Find and match driver for ride
   */
  async matchDriver(rideId: string): Promise<Result<RideMatchResult>> {
    return this.execute(async () => {
      // Get ride details
      const rideResult = await this.rideRepository.findById(rideId)
      if (!rideResult.success || !rideResult.data) {
        throw new Error('Ride not found')
      }

      const ride = rideResult.data
      if (ride.status !== 'pending') {
        throw new Error('Ride is not available for matching')
      }

      // Find nearby available providers
      const providersResult = await this.rideRepository.findNearbyProviders(
        ride.pickup_lat,
        ride.pickup_lng,
        5, // 5km radius
        'driver'
      )

      if (!providersResult.success || !providersResult.data.length) {
        throw new Error('No available drivers found nearby')
      }

      // Select best provider (closest with good rating)
      const bestProvider = this.selectBestProvider(providersResult.data)
      if (!bestProvider) {
        throw new Error('No suitable driver found')
      }

      // Update ride with matched provider
      const updateResult = await this.rideRepository.updateRideStatus(rideId, 'matched', {
        provider_id: bestProvider.provider_id,
        matched_at: new Date().toISOString()
      })

      if (!updateResult.success) {
        throw new Error('Failed to match driver')
      }

      // Calculate estimated arrival time
      const estimatedArrival = Math.ceil(bestProvider.distance_km * 2) // 2 minutes per km

      // Update provider availability
      await this.providerRepository.updateAvailability(bestProvider.provider_id, false)

      this.log('info', 'Driver matched successfully', { 
        rideId, 
        providerId: bestProvider.provider_id,
        distance: bestProvider.distance_km 
      })

      return {
        rideId,
        providerId: bestProvider.provider_id,
        estimatedArrival,
        provider: {
          name: bestProvider.provider.users.name,
          phone: bestProvider.provider.users.phone,
          vehicleType: bestProvider.provider.vehicle_type,
          vehiclePlate: bestProvider.provider.vehicle_plate,
          rating: bestProvider.provider.rating,
          location: {
            lat: bestProvider.provider.current_lat,
            lng: bestProvider.provider.current_lng
          }
        }
      }
    }, 'matchDriver', { rideId })
  }

  /**
   * Update ride status
   */
  async updateRideStatus(
    rideId: string,
    status: string,
    providerId?: string,
    additionalData?: Record<string, any>
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      // Validate status transition
      const rideResult = await this.rideRepository.findById(rideId)
      if (!rideResult.success || !rideResult.data) {
        throw new Error('Ride not found')
      }

      const ride = rideResult.data
      
      // Validate provider authorization
      if (providerId && ride.provider_id !== providerId) {
        throw new Error('Unauthorized: Provider mismatch')
      }

      // Validate status transition
      if (!this.isValidStatusTransition(ride.status || 'pending', status)) {
        throw new Error(`Invalid status transition from ${ride.status} to ${status}`)
      }

      // Update ride status
      const updateResult = await this.rideRepository.updateRideStatus(rideId, status, additionalData)
      if (!updateResult.success) {
        throw new Error('Failed to update ride status')
      }

      // Handle status-specific logic
      await this.handleStatusChange(rideId, status, ride.provider_id)

      this.log('info', 'Ride status updated', { rideId, status, providerId })

      return true
    }, 'updateRideStatus', { rideId, status, providerId })
  }

  /**
   * Cancel ride
   */
  async cancelRide(
    rideId: string,
    cancelledBy: 'customer' | 'provider' | 'admin',
    reason?: string,
    userId?: string
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const rideResult = await this.rideRepository.findById(rideId)
      if (!rideResult.success || !rideResult.data) {
        throw new Error('Ride not found')
      }

      const ride = rideResult.data

      // Validate cancellation permissions
      if (cancelledBy === 'customer' && ride.user_id !== userId) {
        throw new Error('Unauthorized: User mismatch')
      }

      if (cancelledBy === 'provider' && ride.provider_id !== userId) {
        throw new Error('Unauthorized: Provider mismatch')
      }

      // Check if ride can be cancelled
      if (!['pending', 'matched', 'pickup'].includes(ride.status || '')) {
        throw new Error('Ride cannot be cancelled at this stage')
      }

      // Update ride status
      const updateResult = await this.rideRepository.updateRideStatus(rideId, 'cancelled', {
        cancelled_by: cancelledBy,
        cancel_reason: reason,
        cancelled_at: new Date().toISOString()
      })

      if (!updateResult.success) {
        throw new Error('Failed to cancel ride')
      }

      // Release provider if matched
      if (ride.provider_id) {
        await this.providerRepository.updateAvailability(ride.provider_id, true)
      }

      // Handle refund if payment was made
      if (ride.status === 'matched' || ride.status === 'pickup') {
        await this.processRefund(rideId, ride.estimated_fare || 0)
      }

      this.log('info', 'Ride cancelled', { rideId, cancelledBy, reason })

      return true
    }, 'cancelRide', { rideId, cancelledBy, reason })
  }

  /**
   * Complete ride
   */
  async completeRide(
    rideId: string,
    providerId: string,
    finalFare?: number
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const rideResult = await this.rideRepository.findById(rideId)
      if (!rideResult.success || !rideResult.data) {
        throw new Error('Ride not found')
      }

      const ride = rideResult.data

      // Validate provider
      if (ride.provider_id !== providerId) {
        throw new Error('Unauthorized: Provider mismatch')
      }

      if (ride.status !== 'in_progress') {
        throw new Error('Ride is not in progress')
      }

      // Update ride status
      const updateResult = await this.rideRepository.updateRideStatus(rideId, 'completed', {
        final_fare: finalFare || ride.estimated_fare,
        completed_at: new Date().toISOString()
      })

      if (!updateResult.success) {
        throw new Error('Failed to complete ride')
      }

      // Make provider available again
      await this.providerRepository.updateAvailability(providerId, true)

      // Process payment
      await this.processPayment(rideId, finalFare || ride.estimated_fare || 0)

      // Award loyalty points
      await this.awardLoyaltyPoints(ride.user_id!, finalFare || ride.estimated_fare || 0)

      this.log('info', 'Ride completed', { rideId, providerId, finalFare })

      return true
    }, 'completeRide', { rideId, providerId })
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLng = this.toRad(lng2 - lng1)
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180)
  }

  /**
   * Calculate fare based on distance and ride type
   */
  private calculateFare(distanceKm: number, rideType: string): number {
    const baseFare = 35 // Thai Baht
    const perKmRate = rideType === 'premium' ? 15 : rideType === 'shared' ? 8 : 10
    const minimumFare = rideType === 'premium' ? 80 : rideType === 'shared' ? 40 : 50
    
    const calculatedFare = baseFare + (distanceKm * perKmRate)
    return Math.max(calculatedFare, minimumFare)
  }

  /**
   * Select best provider from available options
   */
  private selectBestProvider(providers: any[]): any {
    // Sort by rating (desc) and distance (asc)
    return providers
      .filter(p => p.provider && p.provider.rating >= 4.0)
      .sort((a, b) => {
        const ratingDiff = b.provider.rating - a.provider.rating
        if (Math.abs(ratingDiff) > 0.5) return ratingDiff
        return a.distance_km - b.distance_km
      })[0]
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'pending': ['matched', 'cancelled'],
      'matched': ['pickup', 'cancelled'],
      'pickup': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }

  /**
   * Handle status change side effects
   */
  private async handleStatusChange(rideId: string, status: string, providerId?: string): Promise<void> {
    try {
      // Send notifications based on status
      switch (status) {
        case 'matched':
          await this.sendNotification(rideId, 'ride_matched', 'customer')
          break
        case 'pickup':
          await this.sendNotification(rideId, 'driver_arrived', 'customer')
          break
        case 'in_progress':
          await this.sendNotification(rideId, 'ride_started', 'customer')
          break
        case 'completed':
          await this.sendNotification(rideId, 'ride_completed', 'customer')
          await this.sendNotification(rideId, 'ride_completed', 'provider')
          break
        case 'cancelled':
          await this.sendNotification(rideId, 'ride_cancelled', 'customer')
          if (providerId) {
            await this.sendNotification(rideId, 'ride_cancelled', 'provider')
          }
          break
      }
    } catch (error) {
      this.log('warn', 'Failed to send status change notification', { rideId, status, error })
    }
  }

  /**
   * Notify nearby providers about new ride
   */
  private async notifyNearbyProviders(rideId: string, lat: number, lng: number): Promise<void> {
    try {
      await supabase.rpc('notify_nearby_providers_new_ride', {
        p_ride_id: rideId,
        p_lat: lat,
        p_lng: lng,
        p_radius_km: 10
      })
    } catch (error) {
      this.log('warn', 'Failed to notify nearby providers', { rideId, error })
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(rideId: string, type: string, recipient: 'customer' | 'provider'): Promise<void> {
    // Implementation would depend on notification service
    this.log('debug', 'Sending notification', { rideId, type, recipient })
  }

  /**
   * Apply promo code
   */
  private async applyPromoCode(
    promoCode: string,
    userId: string,
    orderAmount: number
  ): Promise<Result<{ discountedAmount: number; discountValue: number }>> {
    try {
      const { data, error } = await supabase.rpc('validate_promo_code', {
        p_code: promoCode,
        p_user_id: userId,
        p_order_amount: orderAmount
      })

      if (error) throw error

      const result = data?.[0]
      if (!result?.is_valid) {
        throw new Error(result?.message || 'Invalid promo code')
      }

      return {
        success: true,
        data: {
          discountedAmount: orderAmount - result.discount_amount,
          discountValue: result.discount_amount
        }
      }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Process payment
   */
  private async processPayment(rideId: string, amount: number): Promise<void> {
    // Implementation would depend on payment service
    this.log('debug', 'Processing payment', { rideId, amount })
  }

  /**
   * Process refund
   */
  private async processRefund(rideId: string, amount: number): Promise<void> {
    // Implementation would depend on payment service
    this.log('debug', 'Processing refund', { rideId, amount })
  }

  /**
   * Award loyalty points
   */
  private async awardLoyaltyPoints(userId: string, amount: number): Promise<void> {
    try {
      await supabase.rpc('auto_award_points', {
        p_user_id: userId,
        p_service_type: 'ride',
        p_amount: amount
      })
    } catch (error) {
      this.log('warn', 'Failed to award loyalty points', { userId, amount, error })
    }
  }
}