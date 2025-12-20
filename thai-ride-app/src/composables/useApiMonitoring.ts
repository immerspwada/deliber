/**
 * API Monitoring Composable
 * Production API performance tracking and monitoring
 * Feature: F194 - API Monitoring
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface ApiEndpointStats {
  endpoint: string
  total_requests: number
  success_rate: number
  avg_response_ms: number
  p95_response_ms: number
  error_count: number
}

export interface SlowQuery {
  query_hash: string
  query_template: string
  avg_time_ms: number
  max_time_ms: number
  call_count: number
  table_name: string
}

export interface ServiceHealth {
  service_name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  response_time_ms: number | null
  error_message: string | null
  consecutive_failures: number
  last_check_at: string
}

export function useApiMonitoring() {
  const endpointStats = ref<ApiEndpointStats[]>([])
  const slowQueries = ref<SlowQuery[]>([])
  const serviceHealth = ref<ServiceHealth[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Log API request
   */
  const logRequest = async (params: {
    endpoint: string
    method: string
    userId?: string
    responseTimeMs?: number
    statusCode?: number
    errorMessage?: string
    requestSize?: number
    responseSize?: number
  }): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('log_api_request', {
        p_endpoint: params.endpoint,
        p_method: params.method,
        p_user_id: params.userId || null,
        p_response_time_ms: params.responseTimeMs || null,
        p_status_code: params.statusCode || null,
        p_error_message: params.errorMessage || null,
        p_request_size: params.requestSize || null,
        p_response_size: params.responseSize || null
      })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to log API request:', err)
      return null
    }
  }

  /**
   * Fetch API performance summary
   */
  const fetchPerformanceSummary = async (hours = 24): Promise<ApiEndpointStats[]> => {
    loading.value = true
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_api_performance_summary', { p_hours: hours })

      if (rpcError) throw rpcError

      endpointStats.value = data || []
      return endpointStats.value
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to fetch performance summary:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch slow queries
   */
  const fetchSlowQueries = async (thresholdMs = 1000): Promise<SlowQuery[]> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_slow_queries', { 
          p_threshold_ms: thresholdMs,
          p_limit: 50
        })

      if (rpcError) throw rpcError

      slowQueries.value = data || []
      return slowQueries.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }


  /**
   * Fetch service health status
   */
  const fetchServiceHealth = async (): Promise<ServiceHealth[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('service_dependency_health')
        .select('*')
        .order('service_name')

      if (fetchError) throw fetchError

      serviceHealth.value = (data || []).map(s => ({
        service_name: s.service_name,
        status: s.status as ServiceHealth['status'],
        response_time_ms: s.response_time_ms,
        error_message: s.error_message,
        consecutive_failures: s.consecutive_failures,
        last_check_at: s.last_check_at
      }))
      return serviceHealth.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Update service health
   */
  const updateServiceHealth = async (
    serviceName: string,
    status: ServiceHealth['status'],
    responseTimeMs?: number,
    errorMessage?: string
  ): Promise<void> => {
    try {
      await supabase.rpc('update_service_health', {
        p_service_name: serviceName,
        p_status: status,
        p_response_time_ms: responseTimeMs || null,
        p_error_message: errorMessage || null
      })
    } catch (err) {
      logger.error('Failed to update service health:', err)
    }
  }

  /**
   * Check external service health
   */
  const checkServiceHealth = async (
    serviceName: string,
    checkFn: () => Promise<boolean>
  ): Promise<ServiceHealth['status']> => {
    const startTime = Date.now()
    try {
      const isHealthy = await checkFn()
      const responseTime = Date.now() - startTime
      
      const status: ServiceHealth['status'] = isHealthy 
        ? (responseTime > 2000 ? 'degraded' : 'healthy')
        : 'down'
      
      await updateServiceHealth(serviceName, status, responseTime)
      return status
    } catch (err: any) {
      const responseTime = Date.now() - startTime
      await updateServiceHealth(serviceName, 'down', responseTime, err.message)
      return 'down'
    }
  }

  /**
   * Get overall system status
   */
  const getOverallStatus = computed(() => {
    if (serviceHealth.value.length === 0) return 'unknown'
    
    const downCount = serviceHealth.value.filter(s => s.status === 'down').length
    const degradedCount = serviceHealth.value.filter(s => s.status === 'degraded').length
    
    if (downCount > 0) return 'critical'
    if (degradedCount > 0) return 'warning'
    return 'healthy'
  })

  /**
   * Get error rate for last N hours
   */
  const getErrorRate = computed(() => {
    const total = endpointStats.value.reduce((sum, e) => sum + e.total_requests, 0)
    const errors = endpointStats.value.reduce((sum, e) => sum + e.error_count, 0)
    return total > 0 ? (errors / total * 100).toFixed(2) : '0.00'
  })

  /**
   * Get average response time
   */
  const getAvgResponseTime = computed(() => {
    if (endpointStats.value.length === 0) return 0
    const total = endpointStats.value.reduce((sum, e) => sum + e.avg_response_ms * e.total_requests, 0)
    const count = endpointStats.value.reduce((sum, e) => sum + e.total_requests, 0)
    return count > 0 ? Math.round(total / count) : 0
  })

  return {
    // State
    endpointStats,
    slowQueries,
    serviceHealth,
    loading,
    error,

    // Computed
    getOverallStatus,
    getErrorRate,
    getAvgResponseTime,

    // Methods
    logRequest,
    fetchPerformanceSummary,
    fetchSlowQueries,
    fetchServiceHealth,
    updateServiceHealth,
    checkServiceHealth
  }
}
