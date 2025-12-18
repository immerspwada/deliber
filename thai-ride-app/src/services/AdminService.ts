/**
 * Admin Service (F23)
 * 
 * Business logic layer for admin operations
 * Handles all administrative functions across the platform
 * 
 * @syncs-with
 * - Customer: All customer-related operations
 * - Provider: All provider-related operations
 * - Database: Full access to all tables
 */

import { BaseService } from './BaseService'
import { UserRepository } from '../repositories/UserRepository'
import { ProviderRepository } from '../repositories/ProviderRepository'
import { RideRepository } from '../repositories/RideRepository'
import type { Result } from '../utils/result'

export interface DashboardStats {
  users: {
    total: number
    active: number
    pending: number
    verified: number
  }
  providers: {
    total: number
    verified: number
    online: number
    pending: number
  }
  rides: {
    total: number
    active: number
    completed: number
    cancelled: number
    revenue: number
  }
  performance: {
    averageRating: number
    completionRate: number
    responseTime: number
  }
}

export interface AdminSearchFilters {
  searchTerm?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  type?: string
  [key: string]: any
}

export class AdminService extends BaseService {
  private userRepository: UserRepository
  private providerRepository: ProviderRepository
  private rideRepository: RideRepository

  constructor() {
    super('AdminService')
    this.userRepository = new UserRepository()
    this.providerRepository = new ProviderRepository()
    this.rideRepository = new RideRepository()
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(): Promise<Result<DashboardStats>> {
    return this.execute(async () => {
      // Fetch all stats in parallel
      const [userStats, providerStats, rideStats] = await Promise.all([
        this.userRepository.getVerificationStats(),
        this.providerRepository.getProviderStats(),
        this.rideRepository.getRideStats()
      ])

      if (!userStats.success || !providerStats.success || !rideStats.success) {
        throw new Error('Failed to fetch dashboard statistics')
      }

      const stats: DashboardStats = {
        users: {
          total: userStats.data.total,
          active: userStats.data.activeUsers,
          pending: userStats.data.pending,
          verified: userStats.data.verified
        },
        providers: {
          total: providerStats.data.total,
          verified: providerStats.data.verified,
          online: providerStats.data.online,
          pending: providerStats.data.pending
        },
        rides: {
          total: rideStats.data.total,
          active: rideStats.data.total - rideStats.data.completed - rideStats.data.cancelled,
          completed: rideStats.data.completed,
          cancelled: rideStats.data.cancelled,
          revenue: providerStats.data.totalEarnings
        },
        performance: {
          averageRating: rideStats.data.averageRating,
          completionRate: rideStats.data.total > 0 
            ? (rideStats.data.completed / rideStats.data.total) * 100 
            : 0,
          responseTime: 0 // Would need additional data
        }
      }

      this.log('info', 'Dashboard stats fetched successfully')

      return stats
    }, 'getDashboardStats')
  }

  /**
   * Search and manage users
   */
  async searchUsers(
    filters: AdminSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ data: any[]; total: number; page: number; limit: number }>> {
    return this.execute(async () => {
      const result = await this.userRepository.searchUsers(
        filters.searchTerm || '',
        {
          status: filters.status as any,
          verificationStatus: filters.verificationStatus,
          role: filters.role
        },
        page,
        limit
      )

      if (!result.success) {
        throw new Error('Failed to search users')
      }

      return {
        data: result.data.data,
        total: result.data.total,
        page,
        limit
      }
    }, 'searchUsers', { filters, page, limit })
  }

  /**
   * Verify user identity (F01)
   */
  async verifyUser(
    userId: string,
    status: 'verified' | 'rejected',
    reason?: string,
    adminId?: string
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const result = await this.userRepository.updateVerificationStatus(userId, status, reason)

      if (!result.success) {
        throw new Error('Failed to update user verification status')
      }

      this.log('info', 'User verification updated', { 
        userId, 
        status, 
        adminId,
        reason 
      })

      return true
    }, 'verifyUser', { userId, status, adminId })
  }

  /**
   * Search and manage providers
   */
  async searchProviders(
    filters: AdminSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ data: any[]; total: number; page: number; limit: number }>> {
    return this.execute(async () => {
      const result = await this.providerRepository.searchProviders(
        filters.searchTerm,
        {
          providerType: filters.providerType,
          verificationStatus: filters.verificationStatus as any,
          availabilityStatus: filters.availabilityStatus as any,
          minRating: filters.minRating
        },
        page,
        limit
      )

      if (!result.success) {
        throw new Error('Failed to search providers')
      }

      return {
        data: result.data.data,
        total: result.data.total,
        page,
        limit
      }
    }, 'searchProviders', { filters, page, limit })
  }

  /**
   * Verify provider (F14)
   */
  async verifyProvider(
    providerId: string,
    isVerified: boolean,
    notes?: string,
    adminId?: string
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const result = await this.providerRepository.updateVerificationStatus(
        providerId,
        isVerified,
        notes
      )

      if (!result.success) {
        throw new Error('Failed to update provider verification status')
      }

      this.log('info', 'Provider verification updated', { 
        providerId, 
        isVerified, 
        adminId,
        notes 
      })

      return true
    }, 'verifyProvider', { providerId, isVerified, adminId })
  }

  /**
   * Get all rides with filters
   */
  async getRides(
    filters: AdminSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ data: any[]; total: number; page: number; limit: number }>> {
    return this.execute(async () => {
      const result = await this.rideRepository.findAll({
        page,
        limit,
        orderBy: 'created_at',
        orderDirection: 'desc',
        filters: {
          status: filters.status,
          provider_id: filters.providerId,
          user_id: filters.userId
        }
      })

      if (!result.success) {
        throw new Error('Failed to fetch rides')
      }

      return {
        data: result.data.data,
        total: result.data.total,
        page,
        limit
      }
    }, 'getRides', { filters, page, limit })
  }

  /**
   * Update ride status (Admin override)
   */
  async updateRideStatus(
    rideId: string,
    status: string,
    adminId: string,
    reason?: string
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const result = await this.rideRepository.updateRideStatus(rideId, status, {
        admin_updated: true,
        admin_id: adminId,
        admin_reason: reason
      })

      if (!result.success) {
        throw new Error('Failed to update ride status')
      }

      this.log('info', 'Ride status updated by admin', { 
        rideId, 
        status, 
        adminId,
        reason 
      })

      return true
    }, 'updateRideStatus', { rideId, status, adminId })
  }

  /**
   * Cancel ride (Admin action)
   */
  async cancelRide(
    rideId: string,
    adminId: string,
    reason: string
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const result = await this.rideRepository.updateRideStatus(rideId, 'cancelled', {
        cancelled_by: 'admin',
        cancel_reason: reason,
        cancelled_at: new Date().toISOString(),
        admin_id: adminId
      })

      if (!result.success) {
        throw new Error('Failed to cancel ride')
      }

      // Process refund if applicable
      const ride = await this.rideRepository.findById(rideId)
      if (ride.success && ride.data) {
        // Release provider if matched
        if (ride.data.provider_id) {
          await this.providerRepository.updateAvailability(ride.data.provider_id, true)
        }
      }

      this.log('info', 'Ride cancelled by admin', { rideId, adminId, reason })

      return true
    }, 'cancelRide', { rideId, adminId, reason })
  }

  /**
   * Get user details with comprehensive information
   */
  async getUserDetails(userId: string): Promise<Result<any>> {
    return this.execute(async () => {
      const result = await this.userRepository.getUserWithStats(userId)

      if (!result.success) {
        throw new Error('Failed to fetch user details')
      }

      return result.data
    }, 'getUserDetails', { userId })
  }

  /**
   * Get provider details with comprehensive information
   */
  async getProviderDetails(providerId: string): Promise<Result<any>> {
    return this.execute(async () => {
      const result = await this.providerRepository.getProviderWithDetails(providerId)

      if (!result.success) {
        throw new Error('Failed to fetch provider details')
      }

      return result.data
    }, 'getProviderDetails', { providerId })
  }

  /**
   * Suspend user account
   */
  async suspendUser(
    userId: string,
    adminId: string,
    reason: string
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const result = await this.userRepository.update(userId, {
        is_active: false,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: adminId
      } as any)

      if (!result.success) {
        throw new Error('Failed to suspend user')
      }

      this.log('info', 'User suspended', { userId, adminId, reason })

      return true
    }, 'suspendUser', { userId, adminId, reason })
  }

  /**
   * Suspend provider account
   */
  async suspendProvider(
    providerId: string,
    adminId: string,
    reason: string
  ): Promise<Result<boolean>> {
    return this.execute(async () => {
      const result = await this.providerRepository.update(providerId, {
        is_verified: false,
        is_available: false,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: adminId
      } as any)

      if (!result.success) {
        throw new Error('Failed to suspend provider')
      }

      this.log('info', 'Provider suspended', { providerId, adminId, reason })

      return true
    }, 'suspendProvider', { providerId, adminId, reason })
  }

  /**
   * Generate analytics report
   */
  async generateReport(
    reportType: 'users' | 'providers' | 'rides' | 'revenue',
    startDate: string,
    endDate: string
  ): Promise<Result<any>> {
    return this.execute(async () => {
      let reportData: any = {}

      switch (reportType) {
        case 'users':
          reportData = await this.generateUserReport(startDate, endDate)
          break
        case 'providers':
          reportData = await this.generateProviderReport(startDate, endDate)
          break
        case 'rides':
          reportData = await this.generateRideReport(startDate, endDate)
          break
        case 'revenue':
          reportData = await this.generateRevenueReport(startDate, endDate)
          break
      }

      this.log('info', 'Report generated', { reportType, startDate, endDate })

      return reportData
    }, 'generateReport', { reportType, startDate, endDate })
  }

  /**
   * Generate user report
   */
  private async generateUserReport(startDate: string, endDate: string): Promise<any> {
    // Implementation would fetch and aggregate user data
    return {
      period: { startDate, endDate },
      totalUsers: 0,
      newUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0
    }
  }

  /**
   * Generate provider report
   */
  private async generateProviderReport(startDate: string, endDate: string): Promise<any> {
    // Implementation would fetch and aggregate provider data
    return {
      period: { startDate, endDate },
      totalProviders: 0,
      newProviders: 0,
      activeProviders: 0,
      verifiedProviders: 0
    }
  }

  /**
   * Generate ride report
   */
  private async generateRideReport(startDate: string, endDate: string): Promise<any> {
    const result = await this.rideRepository.getRideStats({
      startDate,
      endDate
    })

    if (!result.success) {
      throw new Error('Failed to generate ride report')
    }

    return {
      period: { startDate, endDate },
      ...result.data
    }
  }

  /**
   * Generate revenue report
   */
  private async generateRevenueReport(startDate: string, endDate: string): Promise<any> {
    // Implementation would fetch and aggregate revenue data
    return {
      period: { startDate, endDate },
      totalRevenue: 0,
      rideRevenue: 0,
      deliveryRevenue: 0,
      shoppingRevenue: 0
    }
  }
}