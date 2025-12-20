/**
 * Audit & Compliance Composable
 * Comprehensive audit logging and compliance tracking
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface AuditEvent {
  id: string
  event_type: string
  entity_type: string
  entity_id?: string
  actor_id?: string
  actor_type: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  metadata?: Record<string, any>
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  is_sensitive: boolean
  created_at: string
}

export interface ComplianceRequirement {
  id: string
  name: string
  description?: string
  regulation: string
  category: string
  status: 'pending' | 'compliant' | 'non_compliant' | 'in_progress'
  last_audit_date?: string
  next_audit_date?: string
  notes?: string
}

export interface RetentionPolicy {
  id: string
  table_name: string
  retention_days: number
  archive_before_delete: boolean
  is_active: boolean
  last_cleanup_at?: string
  records_deleted: number
}

export function useAuditCompliance() {
  const auditEvents = ref<AuditEvent[]>([])
  const highRiskEvents = ref<AuditEvent[]>([])
  const complianceRequirements = ref<ComplianceRequirement[]>([])
  const retentionPolicies = ref<RetentionPolicy[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Log audit event
   */
  const logAuditEvent = async (params: {
    eventType: string
    entityType: string
    entityId?: string
    actorId?: string
    actorType?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    metadata?: Record<string, any>
    riskLevel?: 'low' | 'medium' | 'high' | 'critical'
    isSensitive?: boolean
  }): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('log_audit_event', {
        p_event_type: params.eventType,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId || null,
        p_actor_id: params.actorId || null,
        p_actor_type: params.actorType || 'user',
        p_old_values: params.oldValues || null,
        p_new_values: params.newValues || null,
        p_metadata: params.metadata || null,
        p_risk_level: params.riskLevel || 'low',
        p_is_sensitive: params.isSensitive || false
      })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to log audit event:', err)
      return null
    }
  }

  /**
   * Fetch audit trail for entity
   */
  const fetchAuditTrail = async (
    entityType: string,
    entityId: string,
    limit = 100
  ): Promise<AuditEvent[]> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_audit_trail', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_limit: limit
      })

      if (rpcError) throw rpcError
      auditEvents.value = data || []
      return auditEvents.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Fetch high risk events
   */
  const fetchHighRiskEvents = async (hours = 24): Promise<AuditEvent[]> => {
    loading.value = true
    try {
      const { data, error: rpcError } = await supabase.rpc('get_high_risk_events', {
        p_hours: hours,
        p_limit: 100
      })

      if (rpcError) throw rpcError
      highRiskEvents.value = data || []
      return highRiskEvents.value
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch compliance requirements
   */
  const fetchComplianceRequirements = async (): Promise<ComplianceRequirement[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('compliance_requirements')
        .select('*')
        .order('regulation', { ascending: true })

      if (fetchError) throw fetchError
      complianceRequirements.value = data || []
      return complianceRequirements.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Update compliance status
   */
  const updateComplianceStatus = async (
    requirementId: string,
    status: ComplianceRequirement['status'],
    notes?: string
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('compliance_requirements')
        .update({ 
          status, 
          notes,
          last_audit_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', requirementId)

      if (updateError) throw updateError
      await fetchComplianceRequirements()
      return true
    } catch (err) {
      logger.error('Failed to update compliance status:', err)
      return false
    }
  }

  /**
   * Fetch retention policies
   */
  const fetchRetentionPolicies = async (): Promise<RetentionPolicy[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('data_retention_policies')
        .select('*')
        .order('table_name')

      if (fetchError) throw fetchError
      retentionPolicies.value = data || []
      return retentionPolicies.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Run data retention cleanup
   */
  const runRetentionCleanup = async (): Promise<{ table_name: string; records_deleted: number }[]> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('apply_data_retention')
      if (rpcError) throw rpcError
      await fetchRetentionPolicies()
      return data || []
    } catch (err) {
      logger.error('Failed to run retention cleanup:', err)
      return []
    }
  }

  // Computed
  const complianceScore = computed(() => {
    if (complianceRequirements.value.length === 0) return 0
    const compliant = complianceRequirements.value.filter(r => r.status === 'compliant').length
    return Math.round((compliant / complianceRequirements.value.length) * 100)
  })

  const nonCompliantCount = computed(() => 
    complianceRequirements.value.filter(r => r.status === 'non_compliant').length
  )

  const criticalEventCount = computed(() => 
    highRiskEvents.value.filter(e => e.risk_level === 'critical').length
  )

  return {
    auditEvents,
    highRiskEvents,
    complianceRequirements,
    retentionPolicies,
    loading,
    error,
    complianceScore,
    nonCompliantCount,
    criticalEventCount,
    logAuditEvent,
    fetchAuditTrail,
    fetchHighRiskEvents,
    fetchComplianceRequirements,
    updateComplianceStatus,
    fetchRetentionPolicies,
    runRetentionCleanup
  }
}
