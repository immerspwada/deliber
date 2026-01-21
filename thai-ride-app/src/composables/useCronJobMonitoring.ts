/**
 * Composable: useCronJobMonitoring
 * จัดการข้อมูล cron jobs และ execution history
 * 
 * Features:
 * - Load cron jobs with statistics
 * - View execution history with filters
 * - Manually trigger job execution
 * - Real-time stats updates
 */

import { ref, computed, type Ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useErrorHandler } from './useErrorHandler'

// Types
export interface CronJob {
  jobid: number
  jobname: string
  schedule: string
  command: string
  nodename: string
  nodeport: number
  database: string
  username: string
  active: boolean
  last_run_time: string | null
  next_run_time: string | null
  last_status: string | null
  failed_count_24h: number
  success_count_24h: number
}

export interface CronJobRunDetail {
  runid: number
  jobid: number
  job_pid: number
  database: string
  username: string
  command: string
  status: 'starting' | 'running' | 'sending' | 'connecting' | 'succeeded' | 'failed'
  return_message: string | null
  start_time: string
  end_time: string | null
  duration_seconds: number | null
}

export interface CronJobStats {
  total_jobs: number
  active_jobs: number
  inactive_jobs: number
  failed_last_24h: number
  succeeded_last_24h: number
  total_executions_24h: number
}

export interface HistoryFilters {
  startDate: Date | null
  endDate: Date | null
  status: string | null
}

export interface UseCronJobMonitoringReturn {
  // State
  jobs: Ref<CronJob[]>
  selectedJob: Ref<CronJob | null>
  runHistory: Ref<CronJobRunDetail[]>
  stats: Ref<CronJobStats>
  loading: Ref<boolean>
  historyLoading: Ref<boolean>
  error: Ref<string | null>
  
  // Filters
  historyFilters: Ref<HistoryFilters>
  
  // Computed
  activeJobs: Ref<CronJob[]>
  failedJobs: Ref<CronJob[]>
  
  // Actions
  loadJobs: () => Promise<void>
  loadJobHistory: (jobId: number) => Promise<void>
  runJobManually: (jobName: string) => Promise<{ success: boolean; message: string }>
  refreshStats: () => Promise<void>
  setHistoryFilters: (filters: Partial<HistoryFilters>) => void
  clearHistoryFilters: () => void
}

// Concurrent execution tracking
const runningJobs = new Set<string>()

export function useCronJobMonitoring(): UseCronJobMonitoringReturn {
  const { handle } = useErrorHandler()
  
  // State
  const jobs = ref<CronJob[]>([])
  const selectedJob = ref<CronJob | null>(null)
  const runHistory = ref<CronJobRunDetail[]>([])
  const stats = ref<CronJobStats>({
    total_jobs: 0,
    active_jobs: 0,
    inactive_jobs: 0,
    failed_last_24h: 0,
    succeeded_last_24h: 0,
    total_executions_24h: 0
  })
  const loading = ref(false)
  const historyLoading = ref(false)
  const error = ref<string | null>(null)
  
  // Filters
  const historyFilters = ref<HistoryFilters>({
    startDate: null,
    endDate: null,
    status: null
  })
  
  // Computed
  const activeJobs = computed(() => 
    jobs.value.filter(job => job.active)
  )
  
  const failedJobs = computed(() => 
    jobs.value.filter(job => job.last_status === 'failed')
  )
  
  /**
   * Load all cron jobs with statistics
   */
  async function loadJobs(): Promise<void> {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_cron_jobs_with_stats')
      
      if (rpcError) throw rpcError
      
      jobs.value = data || []
      
      // Also refresh stats
      await refreshStats()
    } catch (err) {
      console.error('[useCronJobMonitoring] Error loading jobs:', err)
      error.value = 'ไม่สามารถโหลดข้อมูล cron jobs ได้'
      handle(err, 'useCronJobMonitoring.loadJobs')
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Load execution history for a specific job
   */
  async function loadJobHistory(jobId: number): Promise<void> {
    historyLoading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_cron_job_history', {
          p_job_id: jobId,
          p_start_date: historyFilters.value.startDate?.toISOString() || null,
          p_end_date: historyFilters.value.endDate?.toISOString() || null,
          p_status: historyFilters.value.status,
          p_limit: 50
        })
      
      if (rpcError) throw rpcError
      
      runHistory.value = data || []
      
      // Update selected job
      selectedJob.value = jobs.value.find(j => j.jobid === jobId) || null
    } catch (err) {
      console.error('[useCronJobMonitoring] Error loading history:', err)
      error.value = 'ไม่สามารถโหลดประวัติการทำงานได้'
      handle(err, 'useCronJobMonitoring.loadJobHistory')
    } finally {
      historyLoading.value = false
    }
  }
  
  /**
   * Manually trigger a cron job execution
   * Prevents concurrent executions of the same job
   */
  async function runJobManually(jobName: string): Promise<{ success: boolean; message: string }> {
    // Check if job is already running
    if (runningJobs.has(jobName)) {
      return {
        success: false,
        message: 'งานนี้กำลังทำงานอยู่ กรุณารอให้เสร็จก่อน'
      }
    }
    
    try {
      // Mark job as running
      runningJobs.add(jobName)
      
      const { data, error: rpcError } = await supabase
        .rpc('run_cron_job_manually', {
          p_job_name: jobName
        })
      
      if (rpcError) throw rpcError
      
      const result = data as { success: boolean; message: string }
      
      // Refresh jobs list after execution
      if (result.success) {
        setTimeout(() => loadJobs(), 2000)
      }
      
      return result
    } catch (err) {
      console.error('[useCronJobMonitoring] Error running job:', err)
      handle(err, 'useCronJobMonitoring.runJobManually')
      return {
        success: false,
        message: 'ไม่สามารถรันงานได้'
      }
    } finally {
      // Remove from running set after a delay
      setTimeout(() => {
        runningJobs.delete(jobName)
      }, 5000)
    }
  }
  
  /**
   * Refresh summary statistics
   */
  async function refreshStats(): Promise<void> {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_cron_job_stats_summary')
      
      if (rpcError) throw rpcError
      
      if (data) {
        stats.value = data as CronJobStats
      }
    } catch (err) {
      console.error('[useCronJobMonitoring] Error refreshing stats:', err)
      handle(err, 'useCronJobMonitoring.refreshStats')
    }
  }
  
  /**
   * Set history filters
   */
  function setHistoryFilters(filters: Partial<HistoryFilters>): void {
    historyFilters.value = {
      ...historyFilters.value,
      ...filters
    }
    
    // Reload history if a job is selected
    if (selectedJob.value) {
      loadJobHistory(selectedJob.value.jobid)
    }
  }
  
  /**
   * Clear all history filters
   */
  function clearHistoryFilters(): void {
    historyFilters.value = {
      startDate: null,
      endDate: null,
      status: null
    }
    
    // Reload history if a job is selected
    if (selectedJob.value) {
      loadJobHistory(selectedJob.value.jobid)
    }
  }
  
  return {
    // State
    jobs,
    selectedJob,
    runHistory,
    stats,
    loading,
    historyLoading,
    error,
    
    // Filters
    historyFilters,
    
    // Computed
    activeJobs,
    failedJobs,
    
    // Actions
    loadJobs,
    loadJobHistory,
    runJobManually,
    refreshStats,
    setHistoryFilters,
    clearHistoryFilters
  }
}
