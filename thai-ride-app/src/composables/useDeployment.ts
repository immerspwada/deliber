/**
 * Deployment Management Composable
 * Production deployment tracking and rollback
 */

import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface Deployment {
  id: string
  version: string
  environment: string
  status: 'pending' | 'deploying' | 'success' | 'failed' | 'rolled_back'
  deployed_by: string
  commit_hash?: string
  release_notes?: string
  started_at: string
  completed_at?: string
  error_message?: string
}

export interface MaintenanceWindow {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  is_active: boolean
  affected_services?: string[]
}

export function useDeployment() {
  const deployments = ref<Deployment[]>([])
  const currentDeployment = ref<Deployment | null>(null)
  const maintenanceWindows = ref<MaintenanceWindow[]>([])
  const isMaintenanceMode = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch deployment history
   */
  const fetchDeployments = async (environment = 'production', limit = 20): Promise<Deployment[]> => {
    loading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('deployment_history')
        .select('*')
        .eq('environment', environment)
        .order('started_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError
      deployments.value = data || []
      return deployments.value
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Get current deployment
   */
  const fetchCurrentDeployment = async (environment = 'production'): Promise<Deployment | null> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_current_deployment', { p_environment: environment })

      if (rpcError) throw rpcError
      currentDeployment.value = data?.[0] || null
      return currentDeployment.value
    } catch (err: any) {
      error.value = err.message
      return null
    }
  }

  /**
   * Start new deployment
   */
  const startDeployment = async (params: {
    version: string
    environment: string
    adminId: string
    commitHash?: string
    releaseNotes?: string
  }): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('start_deployment', {
        p_version: params.version,
        p_environment: params.environment,
        p_deployed_by: params.adminId,
        p_commit_hash: params.commitHash || null,
        p_release_notes: params.releaseNotes || null
      })

      if (rpcError) throw rpcError
      await fetchDeployments(params.environment)
      return data
    } catch (err) {
      logger.error('Failed to start deployment:', err)
      return null
    }
  }

  /**
   * Complete deployment
   */
  const completeDeployment = async (
    deploymentId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('complete_deployment', {
        p_deployment_id: deploymentId,
        p_success: success,
        p_error_message: errorMessage || null
      })

      if (rpcError) throw rpcError
      await fetchDeployments()
      return data
    } catch (err) {
      logger.error('Failed to complete deployment:', err)
      return false
    }
  }

  /**
   * Rollback deployment
   */
  const rollbackDeployment = async (
    currentId: string,
    targetId: string,
    adminId: string
  ): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('rollback_deployment', {
        p_deployment_id: currentId,
        p_rollback_to: targetId,
        p_admin_id: adminId
      })

      if (rpcError) throw rpcError
      await fetchDeployments()
      return data
    } catch (err) {
      logger.error('Failed to rollback deployment:', err)
      return null
    }
  }

  /**
   * Check maintenance mode
   */
  const checkMaintenanceMode = async (): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('is_maintenance_mode')
      if (rpcError) throw rpcError
      isMaintenanceMode.value = data
      return data
    } catch (err) {
      return false
    }
  }

  /**
   * Fetch maintenance windows
   */
  const fetchMaintenanceWindows = async (): Promise<MaintenanceWindow[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('maintenance_windows')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(20)

      if (fetchError) throw fetchError
      maintenanceWindows.value = data || []
      return maintenanceWindows.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Create maintenance window
   */
  const createMaintenanceWindow = async (window: Partial<MaintenanceWindow>): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('maintenance_windows')
        .insert(window)

      if (insertError) throw insertError
      await fetchMaintenanceWindows()
      return true
    } catch (err) {
      logger.error('Failed to create maintenance window:', err)
      return false
    }
  }

  /**
   * Toggle maintenance window
   */
  const toggleMaintenanceWindow = async (windowId: string, active: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('maintenance_windows')
        .update({ is_active: active })
        .eq('id', windowId)

      if (updateError) throw updateError
      await fetchMaintenanceWindows()
      await checkMaintenanceMode()
      return true
    } catch (err) {
      logger.error('Failed to toggle maintenance window:', err)
      return false
    }
  }

  // Computed
  const latestSuccessfulDeployment = computed(() => 
    deployments.value.find(d => d.status === 'success')
  )

  const hasActiveDeployment = computed(() => 
    deployments.value.some(d => d.status === 'deploying')
  )

  return {
    deployments,
    currentDeployment,
    maintenanceWindows,
    isMaintenanceMode,
    loading,
    error,
    latestSuccessfulDeployment,
    hasActiveDeployment,
    fetchDeployments,
    fetchCurrentDeployment,
    startDeployment,
    completeDeployment,
    rollbackDeployment,
    checkMaintenanceMode,
    fetchMaintenanceWindows,
    createMaintenanceWindow,
    toggleMaintenanceWindow
  }
}
