/**
 * Alerting System Composable
 * Production alert management and notifications
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface AlertRule {
  id: string
  name: string
  description: string
  metric_type: string
  condition: string
  threshold: number
  severity: 'info' | 'warning' | 'critical'
  is_enabled: boolean
  cooldown_minutes: number
  notification_channels: string[]
}

export interface Alert {
  id: string
  rule_name: string
  severity: 'info' | 'warning' | 'critical'
  metric_value: number
  threshold_value: number
  message: string
  status: 'triggered' | 'acknowledged' | 'resolved'
  created_at: string
}

export function useAlerting() {
  const rules = ref<AlertRule[]>([])
  const activeAlerts = ref<Alert[]>([])
  const alertHistory = ref<Alert[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch alert rules
   */
  const fetchRules = async (): Promise<AlertRule[]> => {
    loading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('alert_rules')
        .select('*')
        .order('severity', { ascending: false })

      if (fetchError) throw fetchError
      rules.value = data || []
      return rules.value
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch active alerts
   */
  const fetchActiveAlerts = async (): Promise<Alert[]> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_active_alerts')
      if (rpcError) throw rpcError
      activeAlerts.value = data || []
      return activeAlerts.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Fetch alert history
   */
  const fetchAlertHistory = async (limit = 100): Promise<Alert[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('alert_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError
      alertHistory.value = data || []
      return alertHistory.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Acknowledge alert
   */
  const acknowledgeAlert = async (alertId: string, adminId: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('acknowledge_alert', {
        p_alert_id: alertId,
        p_admin_id: adminId
      })
      if (rpcError) throw rpcError
      await fetchActiveAlerts()
      return data
    } catch (err) {
      logger.error('Failed to acknowledge alert:', err)
      return false
    }
  }

  /**
   * Resolve alert
   */
  const resolveAlert = async (alertId: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('resolve_alert', {
        p_alert_id: alertId
      })
      if (rpcError) throw rpcError
      await fetchActiveAlerts()
      return data
    } catch (err) {
      logger.error('Failed to resolve alert:', err)
      return false
    }
  }

  /**
   * Create/Update alert rule
   */
  const saveRule = async (rule: Partial<AlertRule>): Promise<boolean> => {
    try {
      if (rule.id) {
        const { error: updateError } = await supabase
          .from('alert_rules')
          .update(rule)
          .eq('id', rule.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('alert_rules')
          .insert(rule)
        if (insertError) throw insertError
      }
      await fetchRules()
      return true
    } catch (err) {
      logger.error('Failed to save rule:', err)
      return false
    }
  }

  /**
   * Toggle rule enabled status
   */
  const toggleRule = async (ruleId: string, enabled: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('alert_rules')
        .update({ is_enabled: enabled })
        .eq('id', ruleId)
      if (updateError) throw updateError
      await fetchRules()
      return true
    } catch (err) {
      logger.error('Failed to toggle rule:', err)
      return false
    }
  }

  // Computed
  const criticalAlertCount = computed(() => 
    activeAlerts.value.filter(a => a.severity === 'critical').length
  )

  const warningAlertCount = computed(() => 
    activeAlerts.value.filter(a => a.severity === 'warning').length
  )

  const hasActiveAlerts = computed(() => activeAlerts.value.length > 0)

  return {
    rules,
    activeAlerts,
    alertHistory,
    loading,
    error,
    criticalAlertCount,
    warningAlertCount,
    hasActiveAlerts,
    fetchRules,
    fetchActiveAlerts,
    fetchAlertHistory,
    acknowledgeAlert,
    resolveAlert,
    saveRule,
    toggleRule
  }
}
