/**
 * useAdminProviders - Admin composable for Provider Management
 * 
 * Role: Admin only
 * Functions: get_admin_providers_v2, count_admin_providers_v2
 * 
 * Features:
 * - Fetch providers with status and type filters
 * - Approve/reject provider applications
 * - Pagination support
 * - Error handling with useErrorHandler
 */

import { ref, computed, readonly } from 'vue'
import { supabase } from '@/lib/supabase'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useToast } from '@/composables/useToast'
import {
  ProviderApprovalSchema,
  ProviderRejectionSchema,
  ProviderSuspensionSchema,
  validateInput
} from '@/admin/schemas/validation'
import { useAuditLog } from '@/admin/composables/useAuditLog'

export interface AdminProvider {
  id: string
  user_id: string
  provider_uid: string
  email: string
  first_name: string
  last_name: string
  phone_number: string
  provider_type: 'ride' | 'delivery' | 'shopping' | 'all'
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  is_online: boolean
  is_available: boolean
  current_lat: number | null
  current_lng: number | null
  rating: number
  total_trips: number
  total_earnings: number
  wallet_balance: number
  documents_verified: boolean
  verification_notes: string | null
  created_at: string
  approved_at: string | null
  approved_by: string | null
  last_active_at: string | null
}

export interface ProviderFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'suspended' | null
  providerType?: 'ride' | 'delivery' | 'shopping' | 'all' | null
  limit?: number
  offset?: number
}

export function useAdminProviders() {
  const { handle: handleError } = useErrorHandler()
  const { showSuccess, showError } = useToast()
  const { logProviderApproval, logProviderRejection, logProviderSuspension } = useAuditLog()

  const loading = ref(false)
  const providers = ref<AdminProvider[]>([])
  const totalCount = ref(0)
  const error = ref<string | null>(null)

  // Computed
  const pendingProviders = computed(() =>
    providers.value.filter(p => p.status === 'pending')
  )

  const approvedProviders = computed(() =>
    providers.value.filter(p => p.status === 'approved')
  )

  const rejectedProviders = computed(() =>
    providers.value.filter(p => p.status === 'rejected')
  )

  const suspendedProviders = computed(() =>
    providers.value.filter(p => p.status === 'suspended')
  )

  const onlineProviders = computed(() =>
    providers.value.filter(p => p.is_online && p.status === 'approved')
  )

  /**
   * Fetch providers with filters and pagination
   */
  async function fetchProviders(filters: ProviderFilters = {}): Promise<AdminProvider[]> {
    loading.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_providers_v2', {
        p_status: filters.status || null,
        p_provider_type: filters.providerType || null,
        p_limit: filters.limit || 20,
        p_offset: filters.offset || 0
      })

      if (rpcError) throw rpcError

      providers.value = data || []
      return providers.value
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch providers'
      error.value = message
      handleError(err, 'useAdminProviders.fetchProviders')
      showError('ไม่สามารถโหลดข้อมูลผู้ให้บริการได้')
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch total count of providers for pagination
   */
  async function fetchCount(filters: Omit<ProviderFilters, 'limit' | 'offset'> = {}): Promise<number> {
    try {
      const { data, error: rpcError } = await supabase.rpc('count_admin_providers_v2', {
        p_status: filters.status || null,
        p_provider_type: filters.providerType || null
      })

      if (rpcError) throw rpcError

      totalCount.value = data || 0
      return totalCount.value
    } catch (err) {
      handleError(err, 'useAdminProviders.fetchCount')
      return 0
    }
  }

  /**
   * Approve a provider application
   */
  async function approveProvider(
    providerId: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    error.value = null

    try {
      // Validate input
      const validation = validateInput(ProviderApprovalSchema, { providerId, notes })
      if (!validation.success) {
        const errorMessage = Object.values(validation.errors).join(', ')
        showError(errorMessage)
        return { success: false, message: errorMessage }
      }

      const currentUser = await supabase.auth.getUser()
      const adminId = currentUser.data.user?.id

      // Update provider status in providers_v2 table
      const { error: updateError } = await supabase
        .from('providers_v2')
        .update({
          status: 'approved',
          documents_verified: true,
          verification_notes: notes || null,
          approved_at: new Date().toISOString(),
          approved_by: adminId
        })
        .eq('id', providerId)

      if (updateError) throw updateError

      // Log audit trail
      await logProviderApproval(providerId, notes)

      showSuccess('อนุมัติผู้ให้บริการสำเร็จ')

      // Update local state
      const index = providers.value.findIndex(p => p.id === providerId)
      if (index !== -1) {
        providers.value[index] = {
          ...providers.value[index],
          status: 'approved',
          documents_verified: true,
          verification_notes: notes || null,
          approved_at: new Date().toISOString(),
          approved_by: adminId || null
        }
      }

      return { success: true, message: 'อนุมัติผู้ให้บริการสำเร็จ' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve provider'
      error.value = message
      handleError(err, 'useAdminProviders.approveProvider')
      showError('ไม่สามารถอนุมัติผู้ให้บริการได้')
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Reject a provider application
   */
  async function rejectProvider(
    providerId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    error.value = null

    try {
      const currentUser = await supabase.auth.getUser()
      const adminId = currentUser.data.user?.id

      // Update provider status in providers_v2 table
      const { error: updateError } = await supabase
        .from('providers_v2')
        .update({
          status: 'rejected',
          verification_notes: reason,
          approved_at: new Date().toISOString(),
          approved_by: adminId
        })
        .eq('id', providerId)

      if (updateError) throw updateError

      showSuccess('ปฏิเสธผู้ให้บริการสำเร็จ')

      // Update local state
      const index = providers.value.findIndex(p => p.id === providerId)
      if (index !== -1) {
        providers.value[index] = {
          ...providers.value[index],
          status: 'rejected',
          verification_notes: reason,
          approved_at: new Date().toISOString(),
          approved_by: adminId || null
        }
      }

      return { success: true, message: 'ปฏิเสธผู้ให้บริการสำเร็จ' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject provider'
      error.value = message
      handleError(err, 'useAdminProviders.rejectProvider')
      showError('ไม่สามารถปฏิเสธผู้ให้บริการได้')
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Suspend a provider
   */
  async function suspendProvider(
    providerId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    loading.value = true
    error.value = null

    try {
      // Update provider status in providers_v2 table
      const { error: updateError } = await supabase
        .from('providers_v2')
        .update({
          status: 'suspended',
          verification_notes: reason
        })
        .eq('id', providerId)

      if (updateError) throw updateError

      showSuccess('ระงับผู้ให้บริการสำเร็จ')

      // Update local state
      const index = providers.value.findIndex(p => p.id === providerId)
      if (index !== -1) {
        providers.value[index] = {
          ...providers.value[index],
          status: 'suspended',
          verification_notes: reason
        }
      }

      return { success: true, message: 'ระงับผู้ให้บริการสำเร็จ' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to suspend provider'
      error.value = message
      handleError(err, 'useAdminProviders.suspendProvider')
      showError('ไม่สามารถระงับผู้ให้บริการได้')
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Format currency for display
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date for display
   */
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * Get status label in Thai
   */
  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'รอการอนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ',
      suspended: 'ระงับการใช้งาน'
    }
    return labels[status] || status
  }

  /**
   * Get status color class
   */
  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      suspended: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  /**
   * Get provider type label in Thai
   */
  function getProviderTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      ride: 'รถรับส่ง',
      delivery: 'ส่งของ',
      shopping: 'ช้อปปิ้ง',
      all: 'ทั้งหมด'
    }
    return labels[type] || type
  }

  /**
   * Get full name
   */
  function getFullName(provider: AdminProvider): string {
    return `${provider.first_name} ${provider.last_name}`.trim()
  }

  return {
    // State
    loading: readonly(loading),
    providers: readonly(providers),
    totalCount: readonly(totalCount),
    error: readonly(error),

    // Computed
    pendingProviders,
    approvedProviders,
    rejectedProviders,
    suspendedProviders,
    onlineProviders,

    // Methods
    fetchProviders,
    fetchCount,
    approveProvider,
    rejectProvider,
    suspendProvider,

    // Helpers
    formatCurrency,
    formatDate,
    getStatusLabel,
    getStatusColor,
    getProviderTypeLabel,
    getFullName
  }
}
