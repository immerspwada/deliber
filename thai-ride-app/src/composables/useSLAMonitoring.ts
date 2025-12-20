/**
 * SLA Monitoring Composable
 * Track and monitor Service Level Agreements
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface SLADefinition {
  id: string
  name: string
  description?: string
  metric_type: string
  target_value: number
  target_unit: string
  measurement_period: string
  is_active: boolean
}

export interface SLAStatus {
  sla_name: string
  metric_type: string
  target_value: number
  target_unit: string
  current_value: number
  is_met: boolean
  trend: 'up' | 'down' | 'stable'
}

export interface UptimeRecord {
  service_name: string
  status: 'up' | 'down' | 'degraded'
  check_time: string
  response_time_ms?: number
  error_message?: string
}

export function useSLAMonitoring() {
  const slaDefinitions = ref<SLADefinition[]>([])
  const slaStatus = ref<SLAStatus[]>([])
  const uptimeHistory = ref<UptimeRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch SLA definitions
   */
  const fetchDefinitions = async (): Promise<SLADefinition[]> => {
    loading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('sla_definitions')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (fetchError) throw fetchError
      slaDefinitions.value = data || []
      return slaDefinitions.value
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch SLA dashboard status
   */
  const fetchSLADashboard = async (): Promise<SLAStatus[]> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_sla_dashboard')
      if (rpcError) throw rpcError
      slaStatus.value = data || []
      return slaStatus.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Calculate uptime for a service
   */
  const calculateUptime = async (
    serviceName: string,
    startDate: string,
    endDate: string
  ): Promise<number> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('calculate_uptime', {
        p_service_name: serviceName,
        p_start_date: startDate,
        p_end_date: endDate
      })
      if (rpcError) throw rpcError
      return data || 100
    } catch (err) {
      logger.error('Failed to calculate uptime:', err)
      return 0
    }
  }

  /**
   * Record uptime check
   */
  const recordUptimeCheck = async (
    serviceName: string,
    status: 'up' | 'down' | 'degraded',
    responseTimeMs?: number,
    errorMessage?: string
  ): Promise<void> => {
    try {
      await supabase.from('uptime_log').insert({
        service_name: serviceName,
        status,
        response_time_ms: responseTimeMs,
        error_message: errorMessage
      })
    } catch (err) {
      logger.error('Failed to record uptime check:', err)
    }
  }

  /**
   * Fetch uptime history
   */
  const fetchUptimeHistory = async (
    serviceName: string,
    hours = 24
  ): Promise<UptimeRecord[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('uptime_log')
        .select('*')
        .eq('service_name', serviceName)
        .gte('check_time', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('check_time', { ascending: false })

      if (fetchError) throw fetchError
      uptimeHistory.value = data || []
      return uptimeHistory.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Record SLA measurement
   */
  const recordMeasurement = async (
    slaId: string,
    periodStart: string,
    periodEnd: string,
    actualValue: number
  ): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('record_sla_measurement', {
        p_sla_id: slaId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_actual_value: actualValue
      })
      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to record SLA measurement:', err)
      return null
    }
  }

  // Computed
  const overallSLAHealth = computed(() => {
    if (slaStatus.value.length === 0) return 'unknown'
    const metCount = slaStatus.value.filter(s => s.is_met).length
    const ratio = metCount / slaStatus.value.length
    if (ratio >= 1) return 'excellent'
    if (ratio >= 0.75) return 'good'
    if (ratio >= 0.5) return 'warning'
    return 'critical'
  })

  const slaBreachCount = computed(() => 
    slaStatus.value.filter(s => !s.is_met).length
  )

  return {
    slaDefinitions,
    slaStatus,
    uptimeHistory,
    loading,
    error,
    overallSLAHealth,
    slaBreachCount,
    fetchDefinitions,
    fetchSLADashboard,
    calculateUptime,
    recordUptimeCheck,
    fetchUptimeHistory,
    recordMeasurement
  }
}
