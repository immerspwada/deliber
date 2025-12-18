/**
 * useAdminNew - Refactored Admin Composable
 * 
 * Feature: F23 - Admin Dashboard (New Architecture)
 * Uses Service Layer for better separation of concerns
 * 
 * @syncs-with
 * - AdminService: Business logic layer
 * - All repositories: Data access layer
 * - All admin views: Presentation layer
 */

import { ref, computed } from 'vue'
import { AdminService } from '../services/AdminService'

import { logger } from '../utils/logger'
import { handleError } from '../utils/errorHandling'
import type { Result } from '../utils/result'

export function useAdminNew() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Services
  const adminService = new AdminService()

  // Dashboard state
  const dashboardStats = ref<any>({
    users: { total: 0, active: 0, pending: 0, verified: 0 },
    providers: { total: 0, verified: 0, online: 0, pending: 0 },
    rides: { total: 0, active: 0, completed: 0, cancelled: 0, revenue: 0 },
    performance: { averageRating: 0, completionRate: 0, responseTime: 0 }
  })

  // Data state
  const users = ref<any[]>([])
  const providers = ref<any[]>([])
  const rides = ref<any[]>([])
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  })

  // Check if admin demo mode
  const isAdminDemoMode = () => localStorage.getItem('admin_demo_mode') === 'true'

  /**
   * Execute service operation with error handling
   */
  const executeService = async <T>(
    operation: () => Promise<Result<T>>,
    operationName: string
  ): Promise<T | null> => {
    loading.value = true
    error.value = null

    try {
      const result = await operation()
      
      if (result.success) {
        logger.debug(`[useAdminNew] ${operationName} completed successfully`)
        return result.data
      } else {
        error.value = result.error.message
        logger.error(`[useAdminNew] ${operationName} failed:`, result.error.message)
        return null
      }
    } catch (err) {
      const appError = handleError(err)
      error.value = appError.message
      logger.error(`[useAdminNew] ${operationName} exception:`, appError.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch dashboard statistics
   */
  const fetchDashboardStats = async () => {
    if (isAdminDemoMode()) {
      // Use mock data for demo
      dashboardStats.value = {
        users: { total: 1247, active: 1156, pending: 45, verified: 1202 },
        providers: { total: 89, verified: 76, online: 34, pending: 13 },
        rides: { total: 5832, active: 23, completed: 5654, cancelled: 155, revenue: 2847500 },
        performance: { averageRating: 4.7, completionRate: 97.3, responseTime: 245 }
      }
      return dashboardStats.value
    }

    return executeService(
      () => adminService.getDashboardStats(),
      'fetchDashboardStats'
    ).then(data => {
      if (data) {
        dashboardStats.value = data
      }
      return data
    })
  }

  /**
   * Search and fetch users
   */
  const fetchUsers = async (
    searchTerm?: string,
    filters?: any,
    page: number = 1,
    limit: number = 20
  ) => {
    return executeService(
      () => adminService.searchUsers({ searchTerm, ...filters }, page, limit),
      'fetchUsers'
    ).then(data => {
      if (data) {
        users.value = data.data
        pagination.value = {
          page: data.page,
          limit: data.limit,
          total: data.total,
          hasMore: data.page * data.limit < data.total
        }
      }
      return data
    })
  }

  /**
   * Search and fetch providers
   */
  const fetchProviders = async (
    searchTerm?: string,
    filters?: any,
    page: number = 1,
    limit: number = 20
  ) => {
    return executeService(
      () => adminService.searchProviders({ searchTerm, ...filters }, page, limit),
      'fetchProviders'
    ).then(data => {
      if (data) {
        providers.value = data.data
        pagination.value = {
          page: data.page,
          limit: data.limit,
          total: data.total,
          hasMore: data.page * data.limit < data.total
        }
      }
      return data
    })
  }

  /**
   * Fetch rides
   */
  const fetchRides = async (
    filters?: any,
    page: number = 1,
    limit: number = 20
  ) => {
    return executeService(
      () => adminService.getRides(filters || {}, page, limit),
      'fetchRides'
    ).then(data => {
      if (data) {
        rides.value = data.data
        pagination.value = {
          page: data.page,
          limit: data.limit,
          total: data.total,
          hasMore: data.page * data.limit < data.total
        }
      }
      return data
    })
  }

  /**
   * Verify user (F01)
   */
  const verifyUser = async (
    userId: string,
    status: 'verified' | 'rejected',
    reason?: string
  ) => {
    return executeService(
      () => adminService.verifyUser(userId, status, reason, 'admin'),
      'verifyUser'
    )
  }

  /**
   * Verify provider (F14)
   */
  const verifyProvider = async (
    providerId: string,
    isVerified: boolean,
    notes?: string
  ) => {
    return executeService(
      () => adminService.verifyProvider(providerId, isVerified, notes, 'admin'),
      'verifyProvider'
    )
  }

  /**
   * Update ride status (Admin override)
   */
  const updateRideStatus = async (
    rideId: string,
    status: string,
    reason?: string
  ) => {
    return executeService(
      () => adminService.updateRideStatus(rideId, status, 'admin', reason),
      'updateRideStatus'
    )
  }

  /**
   * Cancel ride (Admin action)
   */
  const cancelRide = async (rideId: string, reason: string) => {
    return executeService(
      () => adminService.cancelRide(rideId, 'admin', reason),
      'cancelRide'
    )
  }

  /**
   * Get user details
   */
  const getUserDetails = async (userId: string) => {
    return executeService(
      () => adminService.getUserDetails(userId),
      'getUserDetails'
    )
  }

  /**
   * Get provider details
   */
  const getProviderDetails = async (providerId: string) => {
    return executeService(
      () => adminService.getProviderDetails(providerId),
      'getProviderDetails'
    )
  }

  /**
   * Suspend user account
   */
  const suspendUser = async (userId: string, reason: string) => {
    return executeService(
      () => adminService.suspendUser(userId, 'admin', reason),
      'suspendUser'
    )
  }

  /**
   * Suspend provider account
   */
  const suspendProvider = async (providerId: string, reason: string) => {
    return executeService(
      () => adminService.suspendProvider(providerId, 'admin', reason),
      'suspendProvider'
    )
  }

  /**
   * Generate analytics report
   */
  const generateReport = async (
    reportType: 'users' | 'providers' | 'rides' | 'revenue',
    startDate: string,
    endDate: string
  ) => {
    return executeService(
      () => adminService.generateReport(reportType, startDate, endDate),
      'generateReport'
    )
  }

  // Computed properties
  const totalUsers = computed(() => dashboardStats.value.users.total)
  const totalProviders = computed(() => dashboardStats.value.providers.total)
  const totalRides = computed(() => dashboardStats.value.rides.total)
  const totalRevenue = computed(() => dashboardStats.value.rides.revenue)
  const averageRating = computed(() => dashboardStats.value.performance.averageRating)

  const hasUsers = computed(() => users.value.length > 0)
  const hasProviders = computed(() => providers.value.length > 0)
  const hasRides = computed(() => rides.value.length > 0)

  const canLoadMore = computed(() => pagination.value.hasMore)

  // Chart data generators (for backward compatibility)
  const getRevenueChartData = () => ({
    labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
    datasets: [
      { 
        label: 'รายได้ (บาท)', 
        data: [180000, 220000, 195000, 280000, 310000, 290000, 350000, 380000, 420000, 450000, 480000, 520000] 
      }
    ]
  })

  const getOrdersChartData = () => ({
    labels: ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'],
    datasets: [
      { label: 'เรียกรถ', data: [120, 145, 132, 156, 189, 210, 178] },
      { label: 'ส่งของ', data: [45, 52, 48, 61, 72, 85, 68] },
      { label: 'ซื้อของ', data: [23, 28, 25, 32, 38, 45, 35] }
    ]
  })

  return {
    // State
    loading,
    error,
    dashboardStats,
    users,
    providers,
    rides,
    pagination,

    // Computed
    totalUsers,
    totalProviders,
    totalRides,
    totalRevenue,
    averageRating,
    hasUsers,
    hasProviders,
    hasRides,
    canLoadMore,

    // Methods
    fetchDashboardStats,
    fetchUsers,
    fetchProviders,
    fetchRides,
    verifyUser,
    verifyProvider,
    updateRideStatus,
    cancelRide,
    getUserDetails,
    getProviderDetails,
    suspendUser,
    suspendProvider,
    generateReport,

    // Chart data (backward compatibility)
    getRevenueChartData,
    getOrdersChartData,

    // Utilities
    isAdminDemoMode
  }
}