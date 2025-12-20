/**
 * System Health Monitoring (F251)
 * Production-ready health monitoring composable
 * 
 * Features:
 * - Real-time system health checks
 * - Error logging and tracking
 * - Rate limiting management
 * - System configuration
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface HealthCheck {
  component: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  response_time_ms: number
  details: Record<string, any>
}

export interface ErrorLog {
  id: string
  error_type: string
  error_message: string
  stack_trace?: string
  user_id?: string
  request_path?: string
  metadata: Record<string, any>
  resolved: boolean
  created_at: string
}

export interface SystemConfig {
  key: string
  value: any
  description?: string
  updated_at: string
}

export function useSystemHealth() {
  const healthChecks = ref<HealthCheck[]>([])
  const errorLogs = ref<ErrorLog[]>([])
  const systemConfigs = ref<SystemConfig[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastCheckTime = ref<Date | null>(null)
  
  let healthCheckInterval: number | null = null

  // Computed
  const overallStatus = computed(() => {
    if (healthChecks.value.length === 0) return 'unknown'
    
    const hasUnhealthy = healthChecks.value.some(h => h.status === 'unhealthy')
    const hasDegraded = healthChecks.value.some(h => h.status === 'degraded')
    
    if (hasUnhealthy) return 'unhealthy'
    if (hasDegraded) return 'degraded'
    return 'healthy'
  })

  const unresolvedErrorCount = computed(() => 
    errorLogs.value.filter(e => !e.resolved).length
  )

  /**
   * Run system health check
   */
  const checkHealth = async (): Promise<HealthCheck[]> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await supabase
        .rpc('check_system_health')
      
      if (rpcError) throw rpcError
      
      healthChecks.value = data || []
      lastCheckTime.value = new Date()
      
      // Log health check result
      await logHealthCheck(healthChecks.value)
      
      return healthChecks.value
    } catch (err: any) {
      error.value = err.message
      logger.error('Health check failed:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Log health check to database
   */
  const logHealthCheck = async (checks: HealthCheck[]) => {
    for (const check of checks) {
      if (check.status !== 'healthy') {
        await supabase.from('system_health_log').insert({
          check_type: check.component,
          status: check.status,
          response_time_ms: check.response_time_ms,
          metadata: check.details
        })
      }
    }
  }

  /**
   * Log error to database
   */
  const logError = async (
    errorType: string,
    errorMessage: string,
    options?: {
      stackTrace?: string
      userId?: string
      requestPath?: string
      metadata?: Record<string, any>
    }
  ): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('log_error', {
          p_error_type: errorType,
          p_error_message: errorMessage,
          p_stack_trace: options?.stackTrace,
          p_user_id: options?.userId,
          p_request_path: options?.requestPath,
          p_metadata: options?.metadata || {}
        })
      
      if (rpcError) throw rpcError
      
      return data
    } catch (err) {
      logger.error('Failed to log error:', err)
      return null
    }
  }

  /**
   * Fetch error logs
   */
  const fetchErrorLogs = async (options?: {
    resolved?: boolean
    limit?: number
    offset?: number
  }): Promise<ErrorLog[]> => {
    loading.value = true
    
    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50)
      
      if (options?.resolved !== undefined) {
        query = query.eq('resolved', options.resolved)
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }
      
      const { data, error: fetchError } = await query
      
      if (fetchError) throw fetchError
      
      errorLogs.value = data || []
      return errorLogs.value
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to fetch error logs:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Resolve error
   */
  const resolveError = async (errorId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('error_logs')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', errorId)
      
      if (updateError) throw updateError
      
      // Update local state
      const index = errorLogs.value.findIndex(e => e.id === errorId)
      if (index !== -1) {
        errorLogs.value[index].resolved = true
      }
      
      return true
    } catch (err) {
      logger.error('Failed to resolve error:', err)
      return false
    }
  }

  /**
   * Get system config
   */
  const getConfig = async (key: string): Promise<any> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_system_config', { p_key: key })
      
      if (rpcError) throw rpcError
      
      return data
    } catch (err) {
      logger.error('Failed to get config:', err)
      return null
    }
  }

  /**
   * Update system config
   */
  const updateConfig = async (
    key: string, 
    value: any, 
    adminId: string
  ): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('update_system_config', {
          p_key: key,
          p_value: value,
          p_admin_id: adminId
        })
      
      if (rpcError) throw rpcError
      
      return data
    } catch (err) {
      logger.error('Failed to update config:', err)
      return false
    }
  }

  /**
   * Fetch all system configs
   */
  const fetchConfigs = async (): Promise<SystemConfig[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('system_config')
        .select('*')
        .order('key')
      
      if (fetchError) throw fetchError
      
      systemConfigs.value = data || []
      return systemConfigs.value
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to fetch configs:', err)
      return []
    }
  }

  /**
   * Check rate limit
   */
  const checkRateLimit = async (
    userId: string,
    endpoint: string,
    maxRequests = 100,
    windowMs = 60000
  ): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('check_rate_limit', {
          p_user_id: userId,
          p_endpoint: endpoint,
          p_max_requests: maxRequests,
          p_window_ms: windowMs
        })
      
      if (rpcError) throw rpcError
      
      return data
    } catch (err) {
      logger.error('Rate limit check failed:', err)
      return true // Allow on error
    }
  }

  /**
   * Run cleanup
   */
  const runCleanup = async (): Promise<{ table_name: string; rows_deleted: number }[]> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('cleanup_old_data')
      
      if (rpcError) throw rpcError
      
      logger.info('Cleanup completed:', data)
      return data || []
    } catch (err) {
      logger.error('Cleanup failed:', err)
      return []
    }
  }

  /**
   * Start periodic health checks
   */
  const startPeriodicChecks = (intervalMs = 60000) => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
    }
    
    checkHealth() // Initial check
    healthCheckInterval = setInterval(checkHealth, intervalMs) as unknown as number
  }

  /**
   * Stop periodic health checks
   */
  const stopPeriodicChecks = () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
      healthCheckInterval = null
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopPeriodicChecks()
  })

  return {
    // State
    healthChecks,
    errorLogs,
    systemConfigs,
    loading,
    error,
    lastCheckTime,
    
    // Computed
    overallStatus,
    unresolvedErrorCount,
    
    // Methods
    checkHealth,
    logError,
    fetchErrorLogs,
    resolveError,
    getConfig,
    updateConfig,
    fetchConfigs,
    checkRateLimit,
    runCleanup,
    startPeriodicChecks,
    stopPeriodicChecks
  }
}
