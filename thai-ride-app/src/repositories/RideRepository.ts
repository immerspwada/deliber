/**
 * Ride Repository (F02)
 * 
 * Data access layer for ride-related operations
 * Handles all database interactions for rides, ratings, and tracking
 */

import { BaseRepository } from './BaseRepository'
import { supabase } from '../lib/supabase'
import { fromSupabaseError } from '../utils/errorHandling'
import type { Result } from '../utils/result'
import type { RideRequest, RideRequestInsert, RideRequestUpdate, RideRating } from '../types/database'

export interface NearbyProvider {
  provider_id: string
  distance_km: number
  provider: {
    id: string
    vehicle_type: string
    vehicle_plate: string
    rating: number
    total_trips: number
    current_lat: number
    current_lng: number
    users: {
      name: string
      phone: string
      avatar_url?: string
    }
  }
}

export interface RideWithDetails extends RideRequest {
  provider?: {
    id: string
    vehicle_type: string
    vehicle_plate: string
    vehicle_color: string
    rating: number
    total_trips: number
    current_lat: number
    current_lng: number
    users: {
      name: string
      phone: string
      avatar_url?: string
    }
  }
  user?: {
    name: string
    phone: string
    member_uid: string
  }
  rating?: RideRating
}

export class RideRepository extends BaseRepository<RideRequest, RideRequestInsert, RideRequestUpdate> {
  constructor() {
    super('ride_requests', `
      *,
      provider:provider_id (
        id,
        vehicle_type,
        vehicle_plate,
        vehicle_color,
        rating,
        total_trips,
        current_lat,
        current_lng,
        users:user_id (
          name,
          phone,
          avatar_url
        )
      ),
      user:user_id (
        name,
        phone,
        member_uid
      )
    `)
  }

  /**
   * Find nearby providers using database function
   */
  async findNearbyProviders(
    lat: number,
    lng: number,
    radiusKm: number = 5,
    providerType: string = 'driver'
  ): Promise<Result<NearbyProvider[]>> {
    try {
      const { data, error } = await supabase.rpc('find_nearby_providers', {
        lat,
        lng,
        radius_km: radiusKm,
        provider_type_filter: providerType
      })

      if (error) throw fromSupabaseError(error)

      // Get detailed provider info
      if (data && data.length > 0) {
        const providerIds = data.map((p: any) => p.provider_id)
        
        const { data: providers, error: providerError } = await supabase
          .from('service_providers')
          .select(`
            id,
            vehicle_type,
            vehicle_plate,
            rating,
            total_trips,
            current_lat,
            current_lng,
            users:user_id (
              name,
              phone,
              avatar_url
            )
          `)
          .in('id', providerIds)
          .eq('is_available', true)
          .eq('is_verified', true)

        if (providerError) throw fromSupabaseError(providerError)

        // Combine distance data with provider details
        const result = data.map((distanceData: any) => ({
          provider_id: distanceData.provider_id,
          distance_km: distanceData.distance_km,
          provider: providers?.find((p: any) => p.id === distanceData.provider_id)
        })).filter((item: any) => item.provider)

        return { success: true, data: result }
      }

      return { success: true, data: [] }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Find active ride for user
   */
  async findActiveRideForUser(userId: string): Promise<Result<RideWithDetails | null>> {
    return this.executeQuery(
      (query) => query
        .select(this.selectFields)
        .eq('user_id', userId)
        .in('status', ['pending', 'matched', 'pickup', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      'findActiveRideForUser'
    )
  }

  /**
   * Find pending rides for provider
   */
  async findPendingRidesForProvider(
    providerId: string,
    lat?: number,
    lng?: number,
    radiusKm: number = 10
  ): Promise<Result<RideWithDetails[]>> {
    try {
      let query = supabase
        .from('ride_requests')
        .select(this.selectFields)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      // If location provided, filter by distance
      if (lat && lng) {
        // This would need a custom function for distance filtering
        // For now, we'll get all pending and filter in application
      }

      const { data, error } = await query.limit(20)

      if (error) throw fromSupabaseError(error)

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Find active ride for provider
   */
  async findActiveRideForProvider(providerId: string): Promise<Result<RideWithDetails | null>> {
    return this.executeQuery(
      (query) => query
        .select(this.selectFields)
        .eq('provider_id', providerId)
        .in('status', ['matched', 'pickup', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      'findActiveRideForProvider'
    )
  }

  /**
   * Update ride status with validation
   */
  async updateRideStatus(
    rideId: string,
    status: string,
    additionalData?: Record<string, any>
  ): Promise<Result<RideWithDetails>> {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      }

      // Add timestamp fields based on status
      if (status === 'matched') {
        updateData.matched_at = new Date().toISOString()
      } else if (status === 'pickup') {
        updateData.pickup_at = new Date().toISOString()
      } else if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('ride_requests')
        .update(updateData)
        .eq('id', rideId)
        .select(this.selectFields)
        .single()

      if (error) throw fromSupabaseError(error)
      if (!data) throw new Error('Ride not found')

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Get ride history for user
   */
  async getRideHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ data: RideWithDetails[]; total: number }>> {
    try {
      const { data, count, error } = await supabase
        .from('ride_requests')
        .select(this.selectFields, { count: 'exact' })
        .eq('user_id', userId)
        .in('status', ['completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (error) throw fromSupabaseError(error)

      return {
        success: true,
        data: {
          data: data || [],
          total: count || 0
        }
      }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Get ride statistics
   */
  async getRideStats(filters?: {
    startDate?: string
    endDate?: string
    status?: string
    providerId?: string
  }): Promise<Result<{
    total: number
    completed: number
    cancelled: number
    averageFare: number
    averageRating: number
  }>> {
    try {
      let query = supabase
        .from('ride_requests')
        .select('status, final_fare, estimated_fare')

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.providerId) {
        query = query.eq('provider_id', filters.providerId)
      }

      const { data: rides, error: ridesError } = await query

      if (ridesError) throw fromSupabaseError(ridesError)

      // Get ratings
      let ratingsQuery = supabase
        .from('ride_ratings')
        .select('rating')

      if (filters?.providerId) {
        ratingsQuery = ratingsQuery.eq('provider_id', filters.providerId)
      }

      const { data: ratings, error: ratingsError } = await ratingsQuery

      if (ratingsError) throw fromSupabaseError(ratingsError)

      const total = rides?.length || 0
      const completed = rides?.filter(r => r.status === 'completed').length || 0
      const cancelled = rides?.filter(r => r.status === 'cancelled').length || 0
      
      const fares = rides?.map(r => r.final_fare || r.estimated_fare).filter(Boolean) || []
      const averageFare = fares.length > 0 ? fares.reduce((sum, fare) => sum + fare, 0) / fares.length : 0
      
      const ratingValues = ratings?.map(r => r.rating) || []
      const averageRating = ratingValues.length > 0 ? ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length : 0

      return {
        success: true,
        data: {
          total,
          completed,
          cancelled,
          averageFare: Math.round(averageFare * 100) / 100,
          averageRating: Math.round(averageRating * 100) / 100
        }
      }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }
}