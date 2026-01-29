/**
 * useAuditLog - Composable for Admin Audit Logging
 * 
 * Logs all sensitive admin operations for security and compliance.
 * 
 * Features:
 * - Log provider approval/rejection
 * - Log customer suspension
 * - Log withdrawal approval/rejection
 * - Log topup approval/rejection
 * - Log settings changes
 * - Capture IP address and user agent
 */

import { supabase } from '@/lib/supabase'
import { useErrorHandler } from '@/composables/useErrorHandler'

export type AuditAction =
  | 'provider_approved'
  | 'provider_rejected'
  | 'provider_suspended'
  | 'customer_suspended'
  | 'customer_unsuspended'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'topup_approved'
  | 'topup_rejected'
  | 'settings_updated'
  | 'admin_login'
  | 'admin_logout'

export type ResourceType =
  | 'provider'
  | 'customer'
  | 'withdrawal'
  | 'topup'
  | 'settings'
  | 'admin'

export interface AuditLogEntry {
  user_id: string
  action: AuditAction
  resource_type: ResourceType
  resource_id: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

export function useAuditLog() {
  const { handle: handleError } = useErrorHandler()

  /**
   * Get client IP address (best effort)
   */
  function getClientIP(): string | undefined {
    // In a real app, this would come from a server-side API
    // For now, we'll return undefined and let the database handle it
    return undefined
  }

  /**
   * Get user agent
   */
  function getUserAgent(): string {
    return navigator.userAgent
  }

  /**
   * Create an audit log entry
   */
  async function log(entry: Omit<AuditLogEntry, 'user_id'>): Promise<boolean> {
    try {
      console.log('[AuditLog] Creating audit log entry:', entry)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('[AuditLog] No authenticated user, skipping audit log')
        return false
      }

      console.log('[AuditLog] User authenticated:', user.id)

      // Prepare audit log entry - use 'details' column instead of 'changes'
      const auditEntry = {
        admin_id: user.id, // Use admin_id instead of user_id
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        details: entry.details || null, // Use details instead of changes
        ip_address: entry.ip_address || getClientIP() || null,
        user_agent: entry.user_agent || getUserAgent()
      }

      console.log('[AuditLog] Prepared audit entry:', auditEntry)

      // Insert into admin_audit_logs table
      const { error } = await supabase
        .from('admin_audit_logs')
        .insert(auditEntry)

      if (error) {
        console.error('[AuditLog] Failed to create audit log:', error)
        handleError(error, 'useAuditLog.log')
        return false
      }

      console.log('[AuditLog] ✅ Logged action:', entry.action, 'for', entry.resource_type, entry.resource_id)
      return true
    } catch (err) {
      console.error('[AuditLog] Error creating audit log:', err)
      handleError(err, 'useAuditLog.log')
      return false
    }
  }

  /**
   * Log provider approval
   */
  async function logProviderApproval(
    providerId: string,
    notes?: string
  ): Promise<boolean> {
    return log({
      action: 'provider_approved',
      resource_type: 'provider',
      resource_id: providerId,
      details: { status: 'approved', notes, timestamp: new Date().toISOString() }
    })
  }

  /**
   * Log provider rejection
   */
  async function logProviderRejection(
    providerId: string,
    reason: string
  ): Promise<boolean> {
    return log({
      action: 'provider_rejected',
      resource_type: 'provider',
      resource_id: providerId,
      details: { status: 'rejected', reason, timestamp: new Date().toISOString() }
    })
  }

  /**
   * Log provider suspension
   */
  async function logProviderSuspension(
    providerId: string,
    reason: string
  ): Promise<boolean> {
    return log({
      action: 'provider_suspended',
      resource_type: 'provider',
      resource_id: providerId,
      details: { status: 'suspended', reason, timestamp: new Date().toISOString() }
    })
  }

  /**
   * Log customer suspension
   */
  async function logCustomerSuspension(
    customerId: string,
    reason: string
  ): Promise<boolean> {
    return log({
      action: 'customer_suspended',
      resource_type: 'customer',
      resource_id: customerId,
      details: { status: 'suspended', reason, timestamp: new Date().toISOString() }
    })
  }

  /**
   * Log customer unsuspension
   */
  async function logCustomerUnsuspension(
    customerId: string
  ): Promise<boolean> {
    return log({
      action: 'customer_unsuspended',
      resource_type: 'customer',
      resource_id: customerId,
      details: { status: 'active', timestamp: new Date().toISOString() }
    })
  }

  /**
   * Log withdrawal approval
   */
  async function logWithdrawalApproval(
    withdrawalId: string,
    transactionId: string,
    amount: number
  ): Promise<boolean> {
    return log({
      action: 'withdrawal_approved',
      resource_type: 'withdrawal',
      resource_id: withdrawalId,
      details: { status: 'approved', transactionId, amount, timestamp: new Date().toISOString() }
    })
  }

  /**
   * Log withdrawal rejection
   */
  async function logWithdrawalRejection(
    withdrawalId: string,
    reason: string
  ): Promise<boolean> {
    return log({
      action: 'withdrawal_rejected',
      resource_type: 'withdrawal',
      resource_id: withdrawalId,
      details: { status: 'rejected', reason, timestamp: new Date().toISOString() }
    })
  }

  /**
   * Log topup approval
   */
  async function logTopupApproval(
    topupId: string,
    amount: number
  ): Promise<boolean> {
    return log({
      action: 'topup_approved',
      resource_type: 'topup',
      resource_id: topupId,
      details: { status: 'approved', amount, timestamp: new Date().toISOString() }
    })
  }

  /**
   * Log topup rejection
   */
  async function logTopupRejection(
    topupId: string,
    reason: string
  ): Promise<boolean> {
    return log({
      action: 'topup_rejected',
      resource_type: 'topup',
      resource_id: topupId,
      details: { status: 'rejected', reason, timestamp: new Date().toISOString() }
    })
  }

  /**
   * Log settings update
   */
  async function logSettingsUpdate(
    settingKey: string,
    oldValue: any,
    newValue: any
  ): Promise<boolean> {
    return log({
      action: 'settings_updated',
      resource_type: 'settings',
      resource_id: settingKey,
      details: { old: oldValue, new: newValue, timestamp: new Date().toISOString() }
    })
  }

  return {
    log,
    logProviderApproval,
    logProviderRejection,
    logProviderSuspension,
    logCustomerSuspension,
    logCustomerUnsuspension,
    logWithdrawalApproval,
    logWithdrawalRejection,
    logTopupApproval,
    logTopupRejection,
    logSettingsUpdate
  }
}
