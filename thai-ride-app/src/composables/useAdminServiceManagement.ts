/**
 * useAdminServiceManagement - Admin Service Management Composable
 * Task: 9 - Implement useAdminServiceManagement composable
 * Requirements: 4.4, 7.1, 7.2, 7.3, 7.5
 * 
 * Handles admin operations:
 * - Fetching all requests with filtering and pagination
 * - Getting request details with full relationships
 * - Updating request status with audit logging
 * - Cancelling requests with refund option
 * - Issuing refunds
 * - Analytics dashboard
 */

import { ref, reactive, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { 
  type ServiceType, 
  type RequestStatus,
  getTableName,
  getAllServiceTypes,
  getDisplayName
} from '@/lib/serviceRegistry'
import { AppError, handleRpcError, ErrorType } from '@/lib/errorHandler'

export interface AdminServiceRequest {
  id: string
  tracking_id: string
  user_id: string
  provider_id: string | null
  status: RequestStatus
  estimated_fare: number
  actual_fare: number | null
  pickup_address: string | null
  destination_address: string | null
  created_at: string
  matched_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  service_type: ServiceType
  customer?: {
    id: string
    first_name: string
    last_name: string
    phone_number: string
    member_uid: string
  }
  provider?: {
    id: string
    first_name: string
    last_name: string
    phone_number: string
  }
  [key: string]: any
}

export interface AdminFilters {
  serviceType: ServiceType | null
  status: RequestStatus | null
  dateRange: { start: string; end: string } | null
  providerId: string | null
  customerId: string | null
  searchQuery: string | null
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface AdminAnalytics {
  totalRequests: number
  pendingRequests: number
  completedRequests: number
  cancelledRequests: number
  totalRevenue: number
  averageFare: number
  byServiceType: Record<ServiceType, number>
  byStatus: Record<RequestStatus, number>
}

export function useAdminServiceManagement() {
  const allRequests = ref<AdminServiceRequest[]>([])
  const selectedRequest = ref<AdminServiceRequest | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  const filters = reactive<AdminFilters>({
    serviceType: null,
    status: null,
    dateRange: null,
    providerId: null,
    customerId: null,
    searchQuery: null
  })

  const pagination = reactive<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

  // Computed
  const hasFilters = computed(() => 
    filters.serviceType !== null ||
    filters.status !== null ||
    filters.dateRange !== null ||
    filters.providerId !== null ||
    filters.customerId !== null ||
    filters.searchQuery !== null
  )

  // Fetch all requests (unified view)
  async function fetchAllRequests(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const requests: AdminServiceRequest[] = []
      const serviceTypes = filters.serviceType ? [filters.serviceType] : getAllServiceTypes()

      for (const serviceType of serviceTypes) {
        const tableName = getTableName(serviceType)
        
        let query = supabase
          .from(tableName)
          .select(`
            *,
            customer:users!user_id(id, first_name, last_name, phone_number, member_uid),
            provider:service_providers!provider_id(id, first_name, last_name, phone_number)
          `, { count: 'exact' })
          .order('created_at', { ascending: false })

        // Apply filters
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.providerId) {
          query = query.eq('provider_id', filters.providerId)
        }
        if (filters.customerId) {
          query = query.eq('user_id', filters.customerId)
        }
        if (filters.dateRange) {
          query = query
            .gte('created_at', filters.dateRange.start)
            .lte('created_at', filters.dateRange.end)
        }
        if (filters.searchQuery) {
          query = query.or(`tracking_id.ilike.%${filters.searchQuery}%,pickup_address.ilike.%${filters.searchQuery}%`)
        }

        // Pagination
        const start = (pagination.page - 1) * pagination.limit
        query = query.range(start, start + pagination.limit - 1)

        const { data, count, error: fetchError } = await query

        if (fetchError) throw fetchError

        if (data) {
          requests.push(...data.map(r => ({ ...r, service_type: serviceType })))
        }
        
        if (count) {
          pagination.total += count
        }
      }

      // Sort by created_at across all service types
      requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      allRequests.value = requests
      pagination.totalPages = Math.ceil(pagination.total / pagination.limit)
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get request details
  async function getRequestDetails(requestId: string, serviceType: ServiceType): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const tableName = getTableName(serviceType)
      
      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select(`
          *,
          customer:users!user_id(id, first_name, last_name, phone_number, member_uid, email),
          provider:service_providers!provider_id(id, first_name, last_name, phone_number, vehicle_plate_number, rating)
        `)
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError

      selectedRequest.value = { ...data, service_type: serviceType } as AdminServiceRequest
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Update request status
  async function updateRequestStatus(
    requestId: string,
    serviceType: ServiceType,
    newStatus: RequestStatus,
    reason?: string
  ): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new AppError(ErrorType.AUTH_REQUIRED)

      const tableName = getTableName(serviceType)
      const oldStatus = selectedRequest.value?.status

      // Update status
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        admin_id: user.id,
        action: 'update_status',
        entity_type: serviceType,
        entity_id: requestId,
        old_value: oldStatus,
        new_value: newStatus,
        reason: reason,
        created_at: new Date().toISOString()
      })

      // Refresh data
      if (selectedRequest.value) {
        selectedRequest.value.status = newStatus
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Cancel request as admin
  async function cancelRequestAsAdmin(
    requestId: string,
    serviceType: ServiceType,
    reason: string,
    issueRefund: boolean = true
  ): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new AppError(ErrorType.AUTH_REQUIRED)

      const { error: rpcError } = await supabase.rpc('cancel_request_atomic', {
        p_request_id: requestId,
        p_request_type: serviceType,
        p_cancelled_by: user.id,
        p_cancelled_by_role: 'admin',
        p_cancel_reason: reason,
        p_issue_refund: issueRefund
      })

      if (rpcError) throw handleRpcError(rpcError)

      // Refresh data
      await fetchAllRequests()
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Issue refund
  async function issueRefund(
    requestId: string,
    serviceType: ServiceType,
    amount: number,
    reason: string
  ): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new AppError(ErrorType.AUTH_REQUIRED)

      const { error: rpcError } = await supabase.rpc('issue_refund_atomic', {
        p_request_id: requestId,
        p_request_type: serviceType,
        p_refund_amount: amount,
        p_admin_id: user.id,
        p_reason: reason
      })

      if (rpcError) throw handleRpcError(rpcError)

      // Refresh request details
      await getRequestDetails(requestId, serviceType)
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get analytics
  async function getAnalytics(dateRange?: { start: string; end: string }): Promise<AdminAnalytics> {
    const analytics: AdminAnalytics = {
      totalRequests: 0,
      pendingRequests: 0,
      completedRequests: 0,
      cancelledRequests: 0,
      totalRevenue: 0,
      averageFare: 0,
      byServiceType: {} as Record<ServiceType, number>,
      byStatus: {} as Record<RequestStatus, number>
    }

    try {
      for (const serviceType of getAllServiceTypes()) {
        const tableName = getTableName(serviceType)
        
        let query = supabase.from(tableName).select('status, actual_fare, estimated_fare', { count: 'exact' })
        
        if (dateRange) {
          query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end)
        }

        const { data, count } = await query

        if (data && count) {
          analytics.totalRequests += count
          analytics.byServiceType[serviceType] = count

          for (const request of data) {
            // Count by status
            analytics.byStatus[request.status as RequestStatus] = 
              (analytics.byStatus[request.status as RequestStatus] || 0) + 1

            if (request.status === 'pending') analytics.pendingRequests++
            if (request.status === 'completed') {
              analytics.completedRequests++
              analytics.totalRevenue += request.actual_fare || request.estimated_fare || 0
            }
            if (request.status === 'cancelled') analytics.cancelledRequests++
          }
        }
      }

      if (analytics.completedRequests > 0) {
        analytics.averageFare = analytics.totalRevenue / analytics.completedRequests
      }

      return analytics
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  // Reset filters
  function resetFilters(): void {
    filters.serviceType = null
    filters.status = null
    filters.dateRange = null
    filters.providerId = null
    filters.customerId = null
    filters.searchQuery = null
    pagination.page = 1
  }

  // Set page
  function setPage(page: number): void {
    pagination.page = page
    fetchAllRequests()
  }

  return {
    allRequests,
    selectedRequest,
    isLoading,
    error,
    filters,
    pagination,
    hasFilters,
    fetchAllRequests,
    getRequestDetails,
    updateRequestStatus,
    cancelRequestAsAdmin,
    issueRefund,
    getAnalytics,
    resetFilters,
    setPage
  }
}
