/**
 * User Repository (F01)
 * 
 * Data access layer for user-related operations
 * Handles authentication, profile management, and user verification
 */

import { BaseRepository } from './BaseRepository'
import { supabase } from '../lib/supabase'
import { fromSupabaseError } from '../utils/errorHandling'
import type { Result } from '../utils/result'
import type { User, UserInsert, UserUpdate } from '../types/database'

export interface UserWithStats extends User {
  stats?: {
    totalRides: number
    totalSpent: number
    averageRating: number
    memberSince: string
  }
  wallet?: {
    balance: number
    totalEarned: number
    totalSpent: number
  }
  loyalty?: {
    points: number
    tier: string
    nextTierPoints: number
  }
}

export interface UserVerificationData {
  nationalId?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  verificationStatus: 'pending' | 'verified' | 'rejected'
  verifiedAt?: string
  rejectionReason?: string
}

export class UserRepository extends BaseRepository<User, UserInsert, UserUpdate> {
  constructor() {
    super('users', '*')
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<Result<User | null>> {
    return this.executeQuery(
      (query) => query
        .select(this.selectFields)
        .eq('email', email)
        .maybeSingle(),
      'findByEmail'
    )
  }

  /**
   * Find user by phone
   */
  async findByPhone(phone: string): Promise<Result<User | null>> {
    return this.executeQuery(
      (query) => query
        .select(this.selectFields)
        .eq('phone_number', phone)
        .maybeSingle(),
      'findByPhone'
    )
  }

  /**
   * Find user by member UID (F01 - Member UID System)
   */
  async findByMemberUid(memberUid: string): Promise<Result<User | null>> {
    return this.executeQuery(
      (query) => query
        .select(this.selectFields)
        .eq('member_uid', memberUid)
        .maybeSingle(),
      'findByMemberUid'
    )
  }

  /**
   * Get user with comprehensive stats
   */
  async getUserWithStats(userId: string): Promise<Result<UserWithStats | null>> {
    try {
      // Get user basic info
      const userResult = await this.findById(userId)
      if (!userResult.success || !userResult.data) {
        return userResult
      }

      const user = userResult.data

      // Get ride statistics
      const { data: rideStats } = await supabase
        .from('ride_requests')
        .select('final_fare, estimated_fare, status')
        .eq('user_id', userId)
        .eq('status', 'completed')

      // Get user ratings (as passenger)
      const { data: ratings } = await supabase
        .from('ride_ratings')
        .select('rating')
        .eq('user_id', userId)

      // Get wallet info
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance, total_earned, total_spent')
        .eq('user_id', userId)
        .maybeSingle()

      // Get loyalty info
      const { data: loyalty } = await supabase
        .from('user_loyalty')
        .select('points, tier, next_tier_points')
        .eq('user_id', userId)
        .maybeSingle()

      // Calculate stats
      const totalRides = rideStats?.length || 0
      const totalSpent = rideStats?.reduce((sum, ride) => sum + (ride.final_fare || ride.estimated_fare || 0), 0) || 0
      const averageRating = ratings?.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0

      const userWithStats: UserWithStats = {
        ...user,
        stats: {
          totalRides,
          totalSpent,
          averageRating: Math.round(averageRating * 100) / 100,
          memberSince: user.created_at || ''
        },
        wallet: wallet || undefined,
        loyalty: loyalty || undefined
      }

      return { success: true, data: userWithStats }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Update user verification status (Admin function)
   */
  async updateVerificationStatus(
    userId: string,
    status: 'verified' | 'rejected',
    reason?: string
  ): Promise<Result<User>> {
    try {
      const updateData: any = {
        verification_status: status,
        is_active: status === 'verified',
        updated_at: new Date().toISOString()
      }

      if (status === 'verified') {
        updateData.verified_at = new Date().toISOString()
      } else if (reason) {
        updateData.rejection_reason = reason
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select(this.selectFields)
        .single()

      if (error) throw fromSupabaseError(error)
      if (!data) throw new Error('User not found')

      // Send notification to user
      await this.sendVerificationNotification(userId, status, reason)

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Send verification notification
   */
  private async sendVerificationNotification(
    userId: string,
    status: 'verified' | 'rejected',
    reason?: string
  ): Promise<void> {
    try {
      const title = status === 'verified' 
        ? 'ยืนยันตัวตนสำเร็จ' 
        : 'การยืนยันตัวตนถูกปฏิเสธ'
      
      const message = status === 'verified'
        ? 'บัญชีของคุณได้รับการยืนยันแล้ว สามารถใช้งานได้เต็มรูปแบบ'
        : reason || 'กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง'

      await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          type: 'system',
          title,
          message,
          data: { verification_status: status }
        })
    } catch (error) {
      // Log error but don't fail the main operation
      console.warn('Failed to send verification notification:', error)
    }
  }

  /**
   * Search users (Admin function)
   */
  async searchUsers(
    searchTerm: string,
    filters?: {
      status?: 'active' | 'inactive'
      verificationStatus?: string
      role?: string
    },
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ data: User[]; total: number }>> {
    try {
      let query = supabase
        .from('users')
        .select(this.selectFields, { count: 'exact' })

      // Search in multiple fields including member_uid
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,member_uid.ilike.%${searchTerm}%`)
      }

      // Apply filters
      if (filters?.status === 'active') {
        query = query.eq('is_active', true)
      } else if (filters?.status === 'inactive') {
        query = query.eq('is_active', false)
      }

      if (filters?.verificationStatus) {
        query = query.eq('verification_status', filters.verificationStatus)
      }

      if (filters?.role) {
        query = query.eq('role', filters.role)
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
   * Get user verification statistics (Admin function)
   */
  async getVerificationStats(): Promise<Result<{
    total: number
    pending: number
    verified: number
    rejected: number
    activeUsers: number
  }>> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('verification_status, is_active')

      if (error) throw fromSupabaseError(error)

      const stats = {
        total: users?.length || 0,
        pending: users?.filter(u => u.verification_status === 'pending').length || 0,
        verified: users?.filter(u => u.verification_status === 'verified').length || 0,
        rejected: users?.filter(u => u.verification_status === 'rejected').length || 0,
        activeUsers: users?.filter(u => u.is_active === true).length || 0
      }

      return { success: true, data: stats }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Bulk update user status (Admin function)
   */
  async bulkUpdateStatus(
    userIds: string[],
    isActive: boolean
  ): Promise<Result<number>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .in('id', userIds)
        .select('id')

      if (error) throw fromSupabaseError(error)

      return { success: true, data: data?.length || 0 }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(
    userId: string,
    days: number = 30
  ): Promise<Result<{
    ridesCount: number
    lastRideDate?: string
    totalSpent: number
    averageRating: number
    loyaltyPoints: number
  }>> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get rides in period
      const { data: rides } = await supabase
        .from('ride_requests')
        .select('final_fare, estimated_fare, completed_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())

      // Get ratings
      const { data: ratings } = await supabase
        .from('ride_ratings')
        .select('rating')
        .eq('user_id', userId)

      // Get loyalty points
      const { data: loyalty } = await supabase
        .from('user_loyalty')
        .select('points')
        .eq('user_id', userId)
        .maybeSingle()

      const ridesCount = rides?.length || 0
      const lastRideDate = rides?.length ? rides[rides.length - 1]?.completed_at : undefined
      const totalSpent = rides?.reduce((sum, ride) => sum + (ride.final_fare || ride.estimated_fare || 0), 0) || 0
      const averageRating = ratings?.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0
      const loyaltyPoints = loyalty?.points || 0

      return {
        success: true,
        data: {
          ridesCount,
          lastRideDate,
          totalSpent,
          averageRating: Math.round(averageRating * 100) / 100,
          loyaltyPoints
        }
      }
    } catch (error) {
      return { success: false, error: error as any }
    }
  }
}