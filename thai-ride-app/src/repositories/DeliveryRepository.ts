/**
 * Delivery Repository (F03)
 * 
 * Data access layer for delivery operations
 */

import { BaseRepository } from './BaseRepository'
import type { Result } from '../utils/result'

export interface DeliveryRequest {
  id: string
  user_id: string
  provider_id?: string
  tracking_id: string
  sender_name: string
  sender_phone: string
  sender_address: string
  sender_lat: number
  sender_lng: number
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  recipient_lat: number
  recipient_lng: number
  package_type: string
  package_description?: string
  package_weight?: number
  package_dimensions?: string
  special_instructions?: string
  estimated_fee: number
  final_fee?: number
  status: string
  pickup_time?: string
  delivery_time?: string
  created_at: string
  updated_at?: string
}

export interface DeliveryRequestInsert {
  user_id: string
  sender_name: string
  sender_phone: string
  sender_address: string
  sender_lat: number
  sender_lng: number
  recipient_name: string
  recipient_phone: string
  recipient_address: string
  recipient_lat: number
  recipient_lng: number
  package_type: string
  package_description?: string
  package_weight?: number
  package_dimensions?: string
  special_instructions?: string
  estimated_fee: number
  status?: string
}

export class DeliveryRepository extends BaseRepository<DeliveryRequest, DeliveryRequestInsert> {
  constructor() {
    super('delivery_requests', `
      *,
      user:user_id (id, name, phone_number, member_uid),
      provider:provider_id (id, vehicle_type, vehicle_plate, users(name, phone_number))
    `)
  }

  /**
   * Find active delivery for user
   */
  async findActiveDeliveryForUser(userId: string): Promise<Result<DeliveryRequest | null>> {
    return this.executeQuery(
      (query) => query
        .select(this.selectFields)
        .eq('user_id', userId)
        .in('status', ['pending', 'matched', 'pickup', 'in_transit'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      'findActiveDeliveryForUser'
    )
  }

  /**
   * Find deliveries for provider
   */
  async findDeliveriesForProvider(
    providerId: string,
    statuses: string[] = ['pending', 'matched', 'pickup', 'in_transit']
  ): Promise<Result<DeliveryRequest[]>> {
    return this.executeQuery(
      (query) => query
        .select(this.selectFields)
        .eq('provider_id', providerId)
        .in('status', statuses)
        .order('created_at', { ascending: false }),
      'findDeliveriesForProvider'
    )
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    additionalData?: Record<string, any>
  ): Promise<Result<DeliveryRequest>> {
    const updateData = {
      status,
      ...additionalData,
      updated_at: new Date().toISOString()
    }

    return this.update(deliveryId, updateData as any)
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(options?: {
    startDate?: string
    endDate?: string
  }): Promise<Result<{
    total: number
    completed: number
    cancelled: number
    averageRating: number
    totalRevenue: number
  }>> {
    return this.executeQuery(
      async (query) => {
        let baseQuery = query.select('status, final_fee, estimated_fee')
        
        if (options?.startDate) {
          baseQuery = baseQuery.gte('created_at', options.startDate)
        }
        if (options?.endDate) {
          baseQuery = baseQuery.lte('created_at', options.endDate)
        }

        const { data, error } = await baseQuery

        if (error) throw error

        const deliveries = data || []
        const total = deliveries.length
        const completed = deliveries.filter((d: any) => d.status === 'delivered').length
        const cancelled = deliveries.filter((d: any) => d.status === 'cancelled').length
        const totalRevenue = deliveries
          .filter((d: any) => d.status === 'delivered')
          .reduce((sum: number, d: any) => sum + (d.final_fee || d.estimated_fee || 0), 0)

        // Get average rating from delivery_ratings table
        const { data: ratingsData } = await this.supabase
          .from('delivery_ratings')
          .select('rating')

        const ratings = ratingsData || []
        const averageRating = ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
          : 0

        return {
          total,
          completed,
          cancelled,
          averageRating: Math.round(averageRating * 10) / 10,
          totalRevenue
        }
      },
      'getDeliveryStats'
    )
  }

  /**
   * Search deliveries with filters
   */
  async searchDeliveries(
    searchTerm?: string,
    filters?: {
      status?: string
      providerId?: string
      userId?: string
      packageType?: string
    },
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ data: DeliveryRequest[]; total: number }>> {
    return this.executeQuery(
      async (query) => {
        let searchQuery = query.select(this.selectFields, { count: 'exact' })

        // Apply filters
        if (filters?.status) {
          searchQuery = searchQuery.eq('status', filters.status)
        }
        if (filters?.providerId) {
          searchQuery = searchQuery.eq('provider_id', filters.providerId)
        }
        if (filters?.userId) {
          searchQuery = searchQuery.eq('user_id', filters.userId)
        }
        if (filters?.packageType) {
          searchQuery = searchQuery.eq('package_type', filters.packageType)
        }

        // Apply search term
        if (searchTerm) {
          searchQuery = searchQuery.or(`
            tracking_id.ilike.%${searchTerm}%,
            sender_name.ilike.%${searchTerm}%,
            recipient_name.ilike.%${searchTerm}%,
            sender_address.ilike.%${searchTerm}%,
            recipient_address.ilike.%${searchTerm}%
          `)
        }

        const { data, count, error } = await searchQuery
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false })

        if (error) throw error

        return {
          data: data || [],
          total: count || 0
        }
      },
      'searchDeliveries'
    )
  }

  private get supabase() {
    // Access supabase through the base class
    return (this as any).supabase || require('../lib/supabase').supabase
  }
}