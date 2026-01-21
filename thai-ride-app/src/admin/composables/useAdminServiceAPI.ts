/**
 * Admin Service Management Composable
 * ====================================
 * Extended API functions for service management with advanced features
 */

import { ref } from 'vue'
import { supabase } from '../../lib/supabase'
import type { ServiceType, OrderStatus } from '../types'

type RpcResponse<T> = { data: T | null; error: any }

export interface ServiceFilters {
  search?: string
  status?: OrderStatus
  serviceType?: ServiceType
  dateFrom?: string
  dateTo?: string
  minAmount?: number
  maxAmount?: number
  providerId?: string
  customerId?: string
}

export interface BulkActionResult {
  success: number
  failed: number
  errors: string[]
}

export function useAdminServiceAPI() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ============================================
  // UPDATE SERVICE STATUS
  // ============================================

  async function updateDeliveryStatus(id: string, status: OrderStatus, notes?: string): Promise<boolean> {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() }
      if (notes) updateData.admin_notes = notes
      if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString()
      if (status === 'completed') updateData.completed_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('delivery_requests')
        .update(updateData)
        .eq('id', id)

      if (updateError) throw updateError
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update delivery'
      return false
    }
  }

  async function updateShoppingStatus(id: string, status: OrderStatus, notes?: string): Promise<boolean> {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() }
      if (notes) updateData.admin_notes = notes
      if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString()
      if (status === 'completed') updateData.completed_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('shopping_requests')
        .update(updateData)
        .eq('id', id)

      if (updateError) throw updateError
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update shopping'
      return false
    }
  }

  async function updateQueueStatus(id: string, status: OrderStatus, notes?: string): Promise<boolean> {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() }
      if (notes) updateData.admin_notes = notes
      if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString()
      if (status === 'completed') updateData.completed_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('queue_bookings')
        .update(updateData)
        .eq('id', id)

      if (updateError) throw updateError
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update queue'
      return false
    }
  }

  async function updateMovingStatus(id: string, status: OrderStatus, notes?: string): Promise<boolean> {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() }
      if (notes) updateData.admin_notes = notes
      if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString()
      if (status === 'completed') updateData.completed_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('moving_requests')
        .update(updateData)
        .eq('id', id)

      if (updateError) throw updateError
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update moving'
      return false
    }
  }

  async function updateLaundryStatus(id: string, status: OrderStatus, notes?: string): Promise<boolean> {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() }
      if (notes) updateData.admin_notes = notes
      if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString()
      if (status === 'delivered') updateData.delivered_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('laundry_requests')
        .update(updateData)
        .eq('id', id)

      if (updateError) throw updateError
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update laundry'
      return false
    }
  }

  // ============================================
  // CANCEL & REFUND
  // ============================================

  async function cancelService(
    serviceType: ServiceType,
    id: string,
    reason: string,
    refundAmount?: number
  ): Promise<boolean> {
    try {
      const tableName = getTableName(serviceType)
      const updateData: any = {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'admin',
        cancel_reason: reason,
        updated_at: new Date().toISOString()
      }

      if (refundAmount !== undefined) {
        updateData.refund_amount = refundAmount
        updateData.refund_status = 'pending'
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)

      if (updateError) throw updateError
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to cancel service'
      return false
    }
  }

  async function processRefund(
    serviceType: ServiceType,
    id: string,
    refundAmount: number,
    refundMethod: 'wallet' | 'original'
  ): Promise<boolean> {
    try {
      const tableName = getTableName(serviceType)
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          refund_amount: refundAmount,
          refund_status: 'completed',
          refund_method: refundMethod,
          refunded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) throw updateError
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to process refund'
      return false
    }
  }

  // ============================================
  // BULK ACTIONS
  // ============================================

  async function bulkUpdateStatus(
    serviceType: ServiceType,
    ids: string[],
    status: OrderStatus
  ): Promise<BulkActionResult> {
    const result: BulkActionResult = { success: 0, failed: 0, errors: [] }
    const tableName = getTableName(serviceType)

    for (const id of ids) {
      try {
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id)

        if (updateError) {
          result.failed++
          result.errors.push(`${id}: ${updateError.message}`)
        } else {
          result.success++
        }
      } catch (e) {
        result.failed++
        result.errors.push(`${id}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }

    return result
  }

  async function bulkCancel(
    serviceType: ServiceType,
    ids: string[],
    reason: string
  ): Promise<BulkActionResult> {
    const result: BulkActionResult = { success: 0, failed: 0, errors: [] }

    for (const id of ids) {
      const success = await cancelService(serviceType, id, reason)
      if (success) {
        result.success++
      } else {
        result.failed++
        result.errors.push(`${id}: ${error.value}`)
      }
    }

    return result
  }

  // ============================================
  // EXPORT DATA
  // ============================================

  async function exportToCSV(
    serviceType: ServiceType,
    filters: ServiceFilters = {}
  ): Promise<string> {
    isLoading.value = true
    try {
      const tableName = getTableName(serviceType)
      let query = supabase.from(tableName).select('*')

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo)

      const { data, error: queryError } = await query.order('created_at', { ascending: false })

      if (queryError) throw queryError

      // Convert to CSV
      if (!data || data.length === 0) return ''

      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            if (value === null || value === undefined) return ''
            if (typeof value === 'string' && value.includes(',')) return `"${value}"`
            return String(value)
          }).join(',')
        )
      ]

      return csvRows.join('\n')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to export data'
      return ''
    } finally {
      isLoading.value = false
    }
  }

  function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // ============================================
  // GET SERVICE DETAILS
  // ============================================

  async function getDeliveryDetails(id: string): Promise<any | null> {
    try {
      const { data, error: queryError } = await supabase
        .from('delivery_requests')
        .select(`
          *,
          user:users!delivery_requests_user_id_fkey(id, first_name, last_name, phone_number, email),
          provider:service_providers!delivery_requests_provider_id_fkey(
            id, provider_uid, provider_type,
            user:users!service_providers_user_id_fkey(first_name, last_name, phone_number)
          )
        `)
        .eq('id', id)
        .single()

      if (queryError) throw queryError
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to get delivery details'
      return null
    }
  }

  async function getShoppingDetails(id: string): Promise<any | null> {
    try {
      const { data, error: queryError } = await supabase
        .from('shopping_requests')
        .select(`
          *,
          user:users!shopping_requests_user_id_fkey(id, first_name, last_name, phone_number, email),
          provider:service_providers!shopping_requests_provider_id_fkey(
            id, provider_uid, provider_type,
            user:users!service_providers_user_id_fkey(first_name, last_name, phone_number)
          )
        `)
        .eq('id', id)
        .single()

      if (queryError) throw queryError
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to get shopping details'
      return null
    }
  }

  async function getQueueDetails(id: string): Promise<any | null> {
    try {
      const { data, error: queryError } = await supabase
        .from('queue_bookings')
        .select(`
          *,
          user:users!queue_bookings_user_id_fkey(id, first_name, last_name, phone_number, email),
          provider:service_providers!queue_bookings_provider_id_fkey(
            id, provider_uid, provider_type,
            user:users!service_providers_user_id_fkey(first_name, last_name, phone_number)
          )
        `)
        .eq('id', id)
        .single()

      if (queryError) throw queryError
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to get queue details'
      return null
    }
  }

  async function getMovingDetails(id: string): Promise<any | null> {
    try {
      const { data, error: queryError } = await supabase
        .from('moving_requests')
        .select(`
          *,
          user:users!moving_requests_user_id_fkey(id, first_name, last_name, phone_number, email),
          provider:service_providers!moving_requests_provider_id_fkey(
            id, provider_uid, provider_type,
            user:users!service_providers_user_id_fkey(first_name, last_name, phone_number)
          )
        `)
        .eq('id', id)
        .single()

      if (queryError) throw queryError
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to get moving details'
      return null
    }
  }

  async function getLaundryDetails(id: string): Promise<any | null> {
    try {
      const { data, error: queryError } = await supabase
        .from('laundry_requests')
        .select(`
          *,
          user:users!laundry_requests_user_id_fkey(id, first_name, last_name, phone_number, email),
          provider:service_providers!laundry_requests_provider_id_fkey(
            id, provider_uid, provider_type,
            user:users!service_providers_user_id_fkey(first_name, last_name, phone_number)
          )
        `)
        .eq('id', id)
        .single()

      if (queryError) throw queryError
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to get laundry details'
      return null
    }
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  function getTableName(serviceType: ServiceType): string {
    const tables: Record<ServiceType, string> = {
      ride: 'ride_requests',
      delivery: 'delivery_requests',
      shopping: 'shopping_requests',
      queue: 'queue_bookings',
      moving: 'moving_requests',
      laundry: 'laundry_requests'
    }
    return tables[serviceType]
  }

  return {
    isLoading,
    error,
    // Status updates
    updateDeliveryStatus,
    updateShoppingStatus,
    updateQueueStatus,
    updateMovingStatus,
    updateLaundryStatus,
    // Cancel & Refund
    cancelService,
    processRefund,
    // Bulk actions
    bulkUpdateStatus,
    bulkCancel,
    // Export
    exportToCSV,
    downloadCSV,
    // Details
    getDeliveryDetails,
    getShoppingDetails,
    getQueueDetails,
    getMovingDetails,
    getLaundryDetails
  }
}
