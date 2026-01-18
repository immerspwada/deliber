/**
 * useAuditLog - Status Change Audit Log Composable
 *
 * Feature: F30 - Status Change Audit Log
 * Tables: status_audit_log
 *
 * @syncs-with
 * - Admin: useAdmin.ts (ดู audit trail ทั้งหมด)
 * - Provider: useProvider.ts (ดู audit trail ของงานตัวเอง)
 * - Customer: stores/ride.ts, useDelivery.ts, useShopping.ts (ดู audit trail ของออเดอร์ตัวเอง)
 * - Database: Auto-triggered on status changes via triggers
 *
 * @auto-logged-entities
 * - ride_requests: pending → matched → pickup → in_progress → completed/cancelled
 * - delivery_requests: pending → accepted → picking_up → picked_up → delivering → delivered/cancelled
 * - shopping_requests: pending → accepted → shopping → purchased → delivering → delivered/cancelled
 * - provider_withdrawals: pending → approved/rejected → completed
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface AuditLogEntry {
  id: string
  entity_type: 'ride' | 'delivery' | 'shopping' | 'provider' | 'user' | 'withdrawal' | 'support_ticket'
  entity_id: string
  tracking_id: string | null
  old_status: string | null
  new_status: string
  changed_by: string | null
  changed_by_role: 'customer' | 'provider' | 'admin' | 'system'
  changed_by_name: string | null
  reason: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface StatusChangeStats {
  entity_type: string
  status: string
  change_count: number
  by_customer: number
  by_provider: number
  by_admin: number
  by_system: number
}

export function useAuditLog() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const auditLogs = ref<AuditLogEntry[]>([])
  const stats = ref<StatusChangeStats[]>([])

  // PRODUCTION ONLY - No demo mode

  // Fetch recent audit logs
  const fetchRecentLogs = async (limit = 50, entityType?: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await (supabase.rpc as any)('get_recent_status_changes', {
        p_limit: limit,
        p_entity_type: entityType || null
      })

      if (fetchError) throw fetchError

      auditLogs.value = data || []
      return auditLogs.value
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return []
    } finally {
      loading.value = false
    }
  }

  // Fetch audit trail for specific entity
  const fetchEntityAuditTrail = async (entityType: string, entityId: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await (supabase.rpc as any)('get_entity_audit_trail', {
        p_entity_type: entityType,
        p_entity_id: entityId
      })

      if (fetchError) throw fetchError

      return data || []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return []
    } finally {
      loading.value = false
    }
  }

  // Fetch status change statistics
  const fetchStatusChangeStats = async (entityType?: string) => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await (supabase.rpc as any)('get_status_change_stats', {
        p_entity_type: entityType || null
      })

      if (fetchError) throw fetchError

      stats.value = data || []
      return stats.value
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return []
    } finally {
      loading.value = false
    }
  }

  // Log status change - PRODUCTION ONLY
  const logStatusChange = async (
    entityType: string,
    entityId: string,
    oldStatus: string | null,
    newStatus: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      const { error: insertError } = await supabase
        .from('status_audit_log')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          old_status: oldStatus,
          new_status: newStatus,
          metadata: metadata || {}
        })

      if (insertError) throw insertError
      return true
    } catch (e: unknown) {
      console.error('Failed to log status change:', e)
      return false
    }
  }

  return {
    loading,
    error,
    auditLogs,
    stats,
    fetchRecentLogs,
    fetchEntityAuditTrail,
    fetchStatusChangeStats,
    logStatusChange
  }
}

    try {
      if (isDemoMode()) {
        stats.value = [
          { entity_type: 'ride', status: 'completed', change_count: 156, by_customer: 0, by_provider: 156, by_admin: 0, by_system: 0 },
          { entity_type: 'ride', status: 'matched', change_count: 162, by_customer: 0, by_provider: 162, by_admin: 0, by_system: 0 },
          { entity_type: 'ride', status: 'cancelled', change_count: 12, by_customer: 8, by_provider: 2, by_admin: 2, by_system: 0 },
          { entity_type: 'delivery', status: 'delivered', change_count: 89, by_customer: 0, by_provider: 89, by_admin: 0, by_system: 0 },
          { entity_type: 'delivery', status: 'cancelled', change_count: 5, by_customer: 3, by_provider: 1, by_admin: 1, by_system: 0 },
          { entity_type: 'shopping', status: 'delivered', change_count: 45, by_customer: 0, by_provider: 45, by_admin: 0, by_system: 0 }
        ]
        return stats.value
      }

      const { data, error: fetchError } = await (supabase.rpc as any)('get_status_change_stats', {
        p_start_date: startDate?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate?.toISOString() || new Date().toISOString()
      })

      if (fetchError) throw fetchError

      stats.value = data || []
      return stats.value
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return []
    } finally {
      loading.value = false
    }
  }

  // Manual log (for admin actions)
  const logStatusChange = async (
    entityType: string,
    entityId: string,
    oldStatus: string | null,
    newStatus: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (isDemoMode()) {
      console.log('Demo: Status change logged', { entityType, entityId, oldStatus, newStatus })
      return true
    }

    try {
      const { error: logError } = await (supabase.rpc as any)('log_status_change', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_old_status: oldStatus,
        p_new_status: newStatus,
        p_changed_by_role: 'admin',
        p_reason: reason || null,
        p_metadata: metadata || {}
      })

      if (logError) throw logError
      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      return false
    }
  }

  // Get status label in Thai
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'รอดำเนินการ',
      matched: 'จับคู่แล้ว',
      pickup: 'กำลังไปรับ',
      in_progress: 'กำลังเดินทาง',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
      accepted: 'รับงานแล้ว',
      picking_up: 'กำลังไปรับของ',
      picked_up: 'รับของแล้ว',
      delivering: 'กำลังจัดส่ง',
      delivered: 'จัดส่งแล้ว',
      shopping: 'กำลังซื้อของ',
      purchased: 'ซื้อของแล้ว',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธ'
    }
    return labels[status] || status
  }

  // Get role label in Thai
  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      customer: 'ลูกค้า',
      provider: 'ผู้ให้บริการ',
      admin: 'แอดมิน',
      system: 'ระบบ'
    }
    return labels[role] || role
  }

  return {
    loading,
    error,
    auditLogs,
    stats,
    fetchRecentLogs,
    fetchEntityAuditTrail,
    fetchStatusChangeStats,
    logStatusChange,
    getStatusLabel,
    getRoleLabel
  }
}
