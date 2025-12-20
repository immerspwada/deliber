/**
 * Performance Baseline Composable
 * Track and compare performance against baselines
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface PerformanceBaseline {
  id: string
  metric_name: string
  metric_type: string
  baseline_value: number
  threshold_warning?: number
  threshold_critical?: number
  measurement_unit: string
  environment: string
  is_active: boolean
}

export interface PerformanceMeasurement {
  measurement_time: string
  measured_value: number
  baseline_value: number
  deviation_percent: number
  status: 'normal' | 'warning' | 'critical' | 'improved'
}

export interface PerformanceRegression {
  metric_name: string
  baseline_value: number
  current_avg: number
  deviation_percent: number
  status: 'normal' | 'warning' | 'critical'
}

export interface LoadTestResult {
  id: string
  test_name: string
  test_type: string
  concurrent_users: number
  duration_seconds: number
  total_requests: number
  successful_requests: number
  failed_requests: number
  avg_response_time_ms: number
  p95_response_time_ms: number
  p99_response_time_ms: number
  requests_per_second: number
  error_rate: number
  created_at: string
}

export function usePerformanceBaseline() {
  const baselines = ref<PerformanceBaseline[]>([])
  const measurements = ref<PerformanceMeasurement[]>([])
  const regressions = ref<PerformanceRegression[]>([])
  const loadTestResults = ref<LoadTestResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch performance baselines
   */
  const fetchBaselines = async (environment = 'production'): Promise<PerformanceBaseline[]> => {
    loading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('performance_baselines')
        .select('*')
        .eq('environment', environment)
        .eq('is_active', true)
        .order('metric_name')

      if (fetchError) throw fetchError
      baselines.value = data || []
      return baselines.value
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Record performance measurement
   */
  const recordMeasurement = async (
    metricName: string,
    measuredValue: number,
    environment = 'production',
    metadata?: Record<string, any>
  ): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('record_performance_measurement', {
        p_metric_name: metricName,
        p_measured_value: measuredValue,
        p_environment: environment,
        p_metadata: metadata || null
      })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to record measurement:', err)
      return null
    }
  }

  /**
   * Fetch performance trend
   */
  const fetchTrend = async (
    metricName: string,
    hours = 24,
    environment = 'production'
  ): Promise<PerformanceMeasurement[]> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_performance_trend', {
        p_metric_name: metricName,
        p_hours: hours,
        p_environment: environment
      })

      if (rpcError) throw rpcError
      measurements.value = data || []
      return measurements.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Detect performance regressions
   */
  const detectRegressions = async (hours = 1): Promise<PerformanceRegression[]> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('detect_performance_regression', {
        p_hours: hours
      })

      if (rpcError) throw rpcError
      regressions.value = data || []
      return regressions.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Fetch load test results
   */
  const fetchLoadTestResults = async (limit = 20): Promise<LoadTestResult[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('load_test_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError
      loadTestResults.value = data || []
      return loadTestResults.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Save load test result
   */
  const saveLoadTestResult = async (result: Partial<LoadTestResult>): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('load_test_results')
        .insert(result)

      if (insertError) throw insertError
      await fetchLoadTestResults()
      return true
    } catch (err) {
      logger.error('Failed to save load test result:', err)
      return false
    }
  }

  /**
   * Update baseline value
   */
  const updateBaseline = async (
    baselineId: string,
    newValue: number
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('performance_baselines')
        .update({ 
          baseline_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', baselineId)

      if (updateError) throw updateError
      await fetchBaselines()
      return true
    } catch (err) {
      logger.error('Failed to update baseline:', err)
      return false
    }
  }

  // Computed
  const hasRegressions = computed(() => regressions.value.length > 0)
  
  const criticalRegressions = computed(() => 
    regressions.value.filter(r => r.status === 'critical')
  )

  const healthScore = computed(() => {
    if (baselines.value.length === 0) return 100
    const healthy = baselines.value.length - regressions.value.length
    return Math.round((healthy / baselines.value.length) * 100)
  })

  return {
    baselines,
    measurements,
    regressions,
    loadTestResults,
    loading,
    error,
    hasRegressions,
    criticalRegressions,
    healthScore,
    fetchBaselines,
    recordMeasurement,
    fetchTrend,
    detectRegressions,
    fetchLoadTestResults,
    saveLoadTestResult,
    updateBaseline
  }
}
