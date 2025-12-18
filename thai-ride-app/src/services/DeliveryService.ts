/**
 * Delivery Service (F03)
 * 
 * Business logic layer for delivery operations
 */

import { BaseService } from './BaseService'
import { DeliveryRepository } from '../repositories/DeliveryRepository'
import { ProviderRepository } from '../repositories/ProviderRepository'
import { UserRepository } from '../repositories/UserRepository'
import { supabase } from '../lib/supabase'
import type { Result } from '../utils/result'
import type { DeliveryRequestInsert } from '../repositories/DeliveryRepository'

export interface CreateDeliveryRequest {
  userId: string
  senderName: string
  senderPhone: string
  senderAddress: string
  senderLocation: { lat: number; lng: number }
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  recipientLocation: { lat: number; lng: number }
  packageType: string
  packageDescription?: string
  packageWeight?: number
  packageDimensions?: string
  specialInstructions?: string
  scheduledPickupTime?: string
}

export class DeliveryService extends BaseService {
  private deliveryRepository: DeliveryRepository
  private providerRepository: ProviderRepository
  private userRepository: UserRepository

  constructor() {
    super('DeliveryService')
    this.deliveryRepository = new DeliveryRepository()
    this.providerRepository = new ProviderRepository()
    this.userRepository = new UserRepository()
  }

  /**
   * Create a new delivery request
   */
  async createDelivery(request: CreateDeliveryRequest): Promise<Result<{ deliveryId: string; estimatedFee: number }>> {
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

      // Check for existing active delivery
      const activeDeliveryResult = await this.deliveryRepository.findActiveDeliveryForUser(request.userId)
      if (!activeDeliveryResult.success) {
        throw new Error('Failed to check existing deliveries')
      }

      if (activeDeliveryResult.data) {
        throw new Error('You already have an active delivery')
      }

      // Calculate distance and fee
      const distance = this.calculateDistance(
        request.senderLocation.lat, request.senderLocation.lng,
        request.recipientLocation.lat, request.recipientLocation.lng
      )

      const estimatedFee = this.calculateDeliveryFee(distance, request.packageType, request.packageWeight)

      // Generate tracking ID
      const trackingId = await this.generateTrackingId('DEL')

      // Create delivery request
      const deliveryData: DeliveryRequestInsert = {
        user_id: request.userId,
        sender_name: request.senderName,
        sender_phone: request.senderPhone,
        sender_address: request.senderAddress,
        sender_lat: request.senderLocation.lat,
        sender_lng: request.senderLocation.lng,
        recipient_name: request.recipientName,
        recipient_phone: request.recipientPhone,
        recipient_address: request.recipientAddress,
        recipient_lat: request.recipientLocation.lat,
        recipient_lng: request.recipientLocation.lng,
        package_type: request.packageType,
        package_description: request.packageDescription,
        package_weight: request.packageWeight,
        package_dimensions: request.packageDimensions,
        special_instructions: request.specialInstructions,
        estimated_fee: estimatedFee,
        status: 'pending'
      }

      const createResult = await this.deliveryRepository.create(deliveryData)
      if (!createResult.success) {
        throw new Error('Failed to create delivery request')
      }

      const delivery = createResult.data

      // Notify nearby providers
      await this.notifyNearbyProviders(delivery.id, request.senderLocation.lat, request.senderLocation.lng)

      this.log('info', 'Delivery created successfully', { deliveryId: delivery.id, userId: request.userId })

      return {
        deliveryId: delivery.id,
        estimatedFee
      }
    }, 'createDelivery', { userId: request.userId })
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    providerId?: string,
    additionalData?: Record<string, any>
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      // Validate status transition
      const deliveryResult = await this.deliveryRepository.findById(deliveryId)
      if (!deliveryResult.success || !deliveryResult.data) {
        throw new Error('Delivery not found')
      }

      const delivery = deliveryResult.data
      
      // Validate provider authorization
      if (providerId && delivery.provider_id !== providerId) {
        throw new Error('Unauthorized: Provider mismatch')
      }

      // Validate status transition
      if (!this.isValidStatusTransition(delivery.status || 'pending', status)) {
        throw new Error(`Invalid status transition from ${delivery.status} to ${status}`)
      }

      // Update delivery status
      const updateResult = await this.deliveryRepository.updateDeliveryStatus(deliveryId, status, additionalData)
      if (!updateResult.success) {
        throw new Error('Failed to update delivery status')
      }

      // Handle status-specific logic
      await this.handleStatusChange(deliveryId, status, delivery.provider_id)

      this.log('info', 'Delivery status updated', { deliveryId, status, providerId })

      return true
    }, 'updateDeliveryStatus', { deliveryId, status, providerId })
  }

  /**
   * Cancel delivery
   */
  async cancelDelivery(
    deliveryId: string,
    cancelledBy: 'customer' | 'provider' | 'admin',
    reason?: string,
    userId?: string
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const deliveryResult = await this.deliveryRepository.findById(deliveryId)
      if (!deliveryResult.success || !deliveryResult.data) {
        throw new Error('Delivery not found')
      }

      const delivery = deliveryResult.data

      // Validate cancellation permissions
      if (cancelledBy === 'customer' && delivery.user_id !== userId) {
        throw new Error('Unauthorized: User mismatch')
      }

      if (cancelledBy === 'provider' && delivery.provider_id !== userId) {
        throw new Error('Unauthorized: Provider mismatch')
      }

      // Check if delivery can be cancelled
      if (!['pending', 'matched', 'pickup'].includes(delivery.status || '')) {
        throw new Error('Delivery cannot be cancelled at this stage')
      }

      // Update delivery status
      const updateResult = await this.deliveryRepository.updateDeliveryStatus(deliveryId, 'cancelled', {
        cancelled_by: cancelledBy,
        cancel_reason: reason,
        cancelled_at: new Date().toISOString()
      })

      if (!updateResult.success) {
        throw new Error('Failed to cancel delivery')
      }

      // Release provider if matched
      if (delivery.provider_id) {
        await this.providerRepository.updateAvailability(delivery.provider_id, true)
      }

      this.log('info', 'Delivery cancelled', { deliveryId, cancelledBy, reason })

      return true
    }, 'cancelDelivery', { deliveryId, cancelledBy, reason })
  }

  /**
   * Complete delivery
   */
  async completeDelivery(
    deliveryId: string,
    providerId: string,
    finalFee?: number
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const deliveryResult = await this.deliveryRepository.findById(deliveryId)
      if (!deliveryResult.success || !deliveryResult.data) {
        throw new Error('Delivery not found')
      }

      const delivery = deliveryResult.data

      // Validate provider
      if (delivery.provider_id !== providerId) {
        throw new Error('Unauthorized: Provider mismatch')
      }

      if (delivery.status !== 'in_transit') {
        throw new Error('Delivery is not in transit')
      }

      // Update delivery status
      const updateResult = await this.deliveryRepository.updateDeliveryStatus(deliveryId, 'delivered', {
        final_fee: finalFee || delivery.estimated_fee,
        delivery_time: new Date().toISOString()
      })

      if (!updateResult.success) {
        throw new Error('Failed to complete delivery')
      }

      // Make provider available again
      await this.providerRepository.updateAvailability(providerId, true)

      // Process payment
      await this.processPayment(deliveryId, finalFee || delivery.estimated_fee || 0)

      // Award loyalty points
      await this.awardLoyaltyPoints(delivery.user_id!, finalFee || delivery.estimated_fee || 0)

      this.log('info', 'Delivery completed', { deliveryId, providerId, finalFee })

      return true
    }, 'completeDelivery', { deliveryId, providerId })
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
   * Calculate delivery fee based on distance, package type, and weight
   */
  private calculateDeliveryFee(distanceKm: number, packageType: string, weight?: number): number {
    const baseFee = 25 // Thai Baht
    const perKmRate = 8
    const minimumFee = 35
    
    // Package type multipliers
    const typeMultipliers: Record<string, number> = {
      'document': 1.0,
      'small_package': 1.2,
      'medium_package': 1.5,
      'large_package': 2.0,
      'fragile': 1.8,
      'food': 1.3
    }
    
    const typeMultiplier = typeMultipliers[packageType] || 1.0
    
    // Weight surcharge (if over 5kg)
    const weightSurcharge = (weight && weight > 5) ? (weight - 5) * 5 : 0
    
    const calculatedFee = (baseFee + (distanceKm * perKmRate)) * typeMultiplier + weightSurcharge
    return Math.max(calculatedFee, minimumFee)
  }

  /**
   * Generate tracking ID
   */
  private async generateTrackingId(prefix: string): Promise<string> {
    try {
      const { data } = await supabase.rpc('generate_tracking_id', { prefix })
      return data || `${prefix}-${Date.now()}`
    } catch {
      return `${prefix}-${Date.now()}`
    }
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
    const validTransitions: Record<string, string[]> = {
      'pending': ['matched', 'cancelled'],
      'matched': ['pickup', 'cancelled'],
      'pickup': ['in_transit', 'cancelled'],
      'in_transit': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }

  /**
   * Handle status change side effects
   */
  private async handleStatusChange(deliveryId: string, status: string, providerId?: string): Promise<void> {
    try {
      // Send notifications based on status
      switch (status) {
        case 'matched':
          await this.sendNotification(deliveryId, 'delivery_matched', 'customer')
          break
        case 'pickup':
          await this.sendNotification(deliveryId, 'delivery_pickup', 'customer')
          break
        case 'in_transit':
          await this.sendNotification(deliveryId, 'delivery_in_transit', 'customer')
          break
        case 'delivered':
          await this.sendNotification(deliveryId, 'delivery_completed', 'customer')
          await this.sendNotification(deliveryId, 'delivery_completed', 'provider')
          break
        case 'cancelled':
          await this.sendNotification(deliveryId, 'delivery_cancelled', 'customer')
          if (providerId) {
            await this.sendNotification(deliveryId, 'delivery_cancelled', 'provider')
          }
          break
      }
    } catch (error) {
      this.log('warn', 'Failed to send status change notification', { deliveryId, status, error })
    }
  }

  /**
   * Notify nearby providers about new delivery
   */
  private async notifyNearbyProviders(deliveryId: string, lat: number, lng: number): Promise<void> {
    try {
      await supabase.rpc('notify_nearby_providers_new_delivery', {
        p_delivery_id: deliveryId,
        p_lat: lat,
        p_lng: lng,
        p_radius_km: 10
      })
    } catch (error) {
      this.log('warn', 'Failed to notify nearby providers', { deliveryId, error })
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(deliveryId: string, type: string, recipient: 'customer' | 'provider'): Promise<void> {
    // Implementation would depend on notification service
    this.log('debug', 'Sending notification', { deliveryId, type, recipient })
  }

  /**
   * Process payment
   */
  private async processPayment(deliveryId: string, amount: number): Promise<void> {
    // Implementation would depend on payment service
    this.log('debug', 'Processing payment', { deliveryId, amount })
  }

  /**
   * Award loyalty points
   */
  private async awardLoyaltyPoints(userId: string, amount: number): Promise<void> {
    try {
      await supabase.rpc('auto_award_points', {
        p_user_id: userId,
        p_service_type: 'delivery',
        p_amount: amount
      })
    } catch (error) {
      this.log('warn', 'Failed to award loyalty points', { userId, amount, error })
    }
  }
}