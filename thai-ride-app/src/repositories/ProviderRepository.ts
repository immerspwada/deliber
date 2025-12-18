/**
 * Provider Repository (F14)
 * 
 * Data access layer for service provider operations
 * Handles provider management, earnings, and performance tracking
 */

import { BaseRepository } from './BaseRepository'
import { supabase } from '../lib/supabase'
import { fromSupabaseError } from '../utils/errorHandling'
import type { Result } from '../utils/result'
import type { ServiceProvider, ServiceProviderInsert, ServiceProviderUpdate } from '../types/database'

export interface ProviderWithDetails extends ServiceProvider {
  users?: {
    name: string
    email: string
    phone: string
    avatar_url?: string
  }
  earnings?: {
    totalEarnings: number
    weeklyEarnings: number
    monthlyEarnings: number
    pendingWithdrawals: number
  }
  performance?: {
    completionRate: number
    averageRating: number
    totalTrips: number
    cancellationRate: number
    onlineHours: number
  }
}

export interface ProviderEarnings {
  totalEarnings: number
  weeklyEarnings: number
  monthlyEarnings: number
  dailyEarnings: number
  pendingWithdrawals: number
  availableBalance: number
}

export interface ProviderPerformance {
  totalTrips: number
  completedTrips: number
  cancelledTrips: number
  completionRate: number
  averageRating: number
  totalRatings: number
  onlineHours: number
  averageResponseTime: number
}

export class ProviderRepository extends BaseRepository<ServiceProvider, ServiceProviderInsert, ServiceProviderUpdate> {
  constructor() {
    super('service_providers', `
      *,
      users:user_id (
        name,
        email,
        phone,
        avatar_url
      )
    `)
  }

  /**
   * Find provider by user ID
   */
  async findByUserId(userId: string): Promise<Result<ProviderWithDetails | null>> {
    return this.executeQuery(
      (query) => query
        .select(this.selectFields)
        .eq('user_id', userId)
        .maybeSingle(),
      'findByUserId'
    )
  }

  /**
   * Find available providers by type and location
   */
  async findAvailableProviders(
    providerType?: string,
    lat?: number,
    lng?: number,
    radiusKm: number = 10
  ): Promise<Result<ProviderWithDetails[]>> {
    try {
      let query = supabase
        .from('service_providers')
        .select(this.selectFields)
        .eq('is_available', true)
        .eq('is_verified', true)

      if (providerType) {
        query = query.eq('provider_type', providerType)
      }

      // If location provided, use nearby function
      if (lat && lng) {
        const { data: nearbyData, error: nearbyError } = await supabase.rpc('find_nearby_providers', {
          lat,
          lng,
          radius_km: radiusKm,
          provider_type_filter: providerType || null
        })

        if (nearbyError) throw fromSupabaseError(nearbyError)

        if (nearbyData && nearbyData.length > 0) {
          const providerIds = nearbyData.map((p: any) => p.provider_id)
          query = query.in('id', providerIds)
        } else {
          return { success: true, data: [] }
        }
      }

      const { data, error } = await query.order('rating', { ascending: false })

      if (error) throw fromSupabaseError(error)

      return { success: true, data: data || [] }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Update provider availability
   */
  async updateAvailability(
    providerId: string,
    isAvailable: boolean,
    location?: { lat: number; lng: number }
  ): Promise<Result<ServiceProvider>> {
    try {
      const updateData: any = {
        is_available: isAvailable,
        updated_at: new Date().toISOString()
      }

      if (location) {
        updateData.current_lat = location.lat
        updateData.current_lng = location.lng
        updateData.last_location_update = new Date().toISOString()
      }

      // Handle online session tracking
      if (isAvailable) {
        // Start online session
        await supabase.rpc('start_provider_session', { p_provider_id: providerId })
      } else {
        // End online session
        await supabase.rpc('end_provider_session', { p_provider_id: providerId })
      }

      const { data, error } = await supabase
        .from('service_providers')
        .update(updateData)
        .eq('id', providerId)
        .select(this.selectFields)
        .single()

      if (error) throw fromSupabaseError(error)
      if (!data) throw new Error('Provider not found')

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Update provider location
   */
  async updateLocation(
    providerId: string,
    lat: number,
    lng: number
  ): Promise<Result<boolean>> {
    try {
      const { error } = await supabase
        .from('service_providers')
        .update({
          current_lat: lat,
          current_lng: lng,
          last_location_update: new Date().toISOString()
        })
        .eq('id', providerId)

      if (error) throw fromSupabaseError(error)

      return { success: true, data: true }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Get provider earnings summary
   */
  async getProviderEarnings(providerId: string): Promise<Result<ProviderEarnings>> {
    try {
      const { data, error } = await supabase.rpc('get_provider_earnings_summary', {
        p_provider_id: providerId
      })

      if (error) throw fromSupabaseError(error)

      const earnings = data?.[0] || {
        total_earnings: 0,
        weekly_earnings: 0,
        monthly_earnings: 0,
        daily_earnings: 0,
        pending_withdrawals: 0,
        available_balance: 0
      }

      return {
        success: true,
        data: {
          totalEarnings: earnings.total_earnings,
          weeklyEarnings: earnings.weekly_earnings,
          monthlyEarnings: earnings.monthly_earnings,
          dailyEarnings: earnings.daily_earnings,
          pendingWithdrawals: earnings.pending_withdrawals,
          availableBalance: earnings.available_balance
        }
      }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Get provider performance metrics
   */
  async getProviderPerformance(providerId: string): Promise<Result<ProviderPerformance>> {
    try {
      // Get ride statistics
      const { data: rides } = await supabase
        .from('ride_requests')
        .select('status, created_at, started_at')
        .eq('provider_id', providerId)

      // Get ratings
      const { data: ratings } = await supabase
        .from('ride_ratings')
        .select('rating')
        .eq('provider_id', providerId)

      // Get online hours
      const { data: onlineHours } = await supabase.rpc('get_provider_weekly_hours', {
        p_provider_id: providerId
      })

      const totalTrips = rides?.length || 0
      const completedTrips = rides?.filter(r => r.status === 'completed').length || 0
      const cancelledTrips = rides?.filter(r => r.status === 'cancelled').length || 0
      const completionRate = totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0

      const totalRatings = ratings?.length || 0
      const averageRating = totalRatings > 0 ? ratings!.reduce((sum, r) => sum + r.rating, 0) / totalRatings : 0

      // Calculate average response time (mock for now)
      const averageResponseTime = 120 // seconds

      return {
        success: true,
        data: {
          totalTrips,
          completedTrips,
          cancelledTrips,
          completionRate: Math.round(completionRate * 100) / 100,
          averageRating: Math.round(averageRating * 100) / 100,
          totalRatings,
          onlineHours: onlineHours?.[0]?.total_hours || 0,
          averageResponseTime
        }
      }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Get provider with comprehensive details
   */
  async getProviderWithDetails(providerId: string): Promise<Result<ProviderWithDetails | null>> {
    try {
      const providerResult = await this.findById(providerId)
      if (!providerResult.success || !providerResult.data) {
        return providerResult
      }

      const provider = providerResult.data as ProviderWithDetails

      // Get earnings
      const earningsResult = await this.getProviderEarnings(providerId)
      if (earningsResult.success) {
        provider.earnings = earningsResult.data
      }

      // Get performance
      const performanceResult = await this.getProviderPerformance(providerId)
      if (performanceResult.success) {
        provider.performance = performanceResult.data
      }

      return { success: true, data: provider }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Update provider verification status (Admin function)
   */
  async updateVerificationStatus(
    providerId: string,
    isVerified: boolean,
    notes?: string
  ): Promise<Result<ServiceProvider>> {
    try {
      const updateData: any = {
        is_verified: isVerified,
        updated_at: new Date().toISOString()
      }

      if (notes) {
        updateData.verification_notes = notes
      }

      if (isVerified) {
        updateData.verified_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('service_providers')
        .update(updateData)
        .eq('id', providerId)
        .select(this.selectFields)
        .single()

      if (error) throw fromSupabaseError(error)
      if (!data) throw new Error('Provider not found')

      // Send notification to provider
      await this.sendVerificationNotification(data.user_id!, isVerified, notes)

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Send verification notification to provider
   */
  private async sendVerificationNotification(
    userId: string,
    isVerified: boolean,
    notes?: string
  ): Promise<void> {
    try {
      const title = isVerified 
        ? 'การสมัครได้รับการอนุมัติ' 
        : 'การสมัครถูกปฏิเสธ'
      
      const message = isVerified
        ? 'ยินดีต้อนรับสู่ Thai Ride! คุณสามารถเริ่มให้บริการได้แล้ว'
        : notes || 'กรุณาตรวจสอบข้อมูลและเอกสารแล้วสมัครใหม่อีกครั้ง'

      await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          type: 'provider',
          title,
          message,
          data: { verification_status: isVerified ? 'approved' : 'rejected' }
        })
    } catch (error) {
      console.warn('Failed to send provider verification notification:', error)
    }
  }

  /**
   * Search providers (Admin function)
   */
  async searchProviders(
    searchTerm?: string,
    filters?: {
      providerType?: string
      verificationStatus?: 'verified' | 'pending' | 'rejected'
      availabilityStatus?: 'available' | 'unavailable'
      minRating?: number
    },
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ data: ProviderWithDetails[]; total: number }>> {
    try {
      let query = supabase
        .from('service_providers')
        .select(this.selectFields, { count: 'exact' })

      // Search in provider and user fields
      if (searchTerm) {
        query = query.or(`vehicle_plate.ilike.%${searchTerm}%,vehicle_type.ilike.%${searchTerm}%,license_number.ilike.%${searchTerm}%`)
      }

      // Apply filters
      if (filters?.providerType) {
        query = query.eq('provider_type', filters.providerType)
      }

      if (filters?.verificationStatus === 'verified') {
        query = query.eq('is_verified', true)
      } else if (filters?.verificationStatus === 'pending') {
        query = query.eq('is_verified', false)
      }

      if (filters?.availabilityStatus === 'available') {
        query = query.eq('is_available', true)
      } else if (filters?.availabilityStatus === 'unavailable') {
        query = query.eq('is_available', false)
      }

      if (filters?.minRating) {
        query = query.gte('rating', filters.minRating)
      }

      const { data, count, error } = await query
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
   * Get provider statistics (Admin function)
   */
  async getProviderStats(): Promise<Result<{
    total: number
    verified: number
    pending: number
    online: number
    totalEarnings: number
    averageRating: number
  }>> {
    try {
      const { data: providers, error } = await supabase
        .from('service_providers')
        .select('is_verified, is_available, rating')

      if (error) throw fromSupabaseError(error)

      // Get total earnings (would need a proper aggregation)
      const { data: earnings } = await supabase
        .from('ride_requests')
        .select('final_fare, estimated_fare')
        .eq('status', 'completed')

      const total = providers?.length || 0
      const verified = providers?.filter(p => p.is_verified === true).length || 0
      const pending = providers?.filter(p => p.is_verified === false).length || 0
      const online = providers?.filter(p => p.is_available === true).length || 0

      const totalEarnings = earnings?.reduce((sum, ride) => sum + (ride.final_fare || ride.estimated_fare || 0), 0) || 0
      
      const ratings = providers?.map(p => p.rating).filter(Boolean) || []
      const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0

      return {
        success: true,
        data: {
          total,
          verified,
          pending,
          online,
          totalEarnings,
          averageRating: Math.round(averageRating * 100) / 100
        }
      }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }
}