/**
 * Data Management Composable
 * Production data backup, export, and archiving
 */

import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface DataStatistics {
  table_name: string
  row_count: number
  size_bytes: number
  oldest_record?: string
  newest_record?: string
}

export interface ExportRequest {
  id: string
  export_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  file_path?: string
  file_size_bytes?: number
  record_count?: number
  filters: Record<string, any>
  error_message?: string
  created_at: string
  completed_at?: string
}

export function useDataManagement() {
  const statistics = ref<DataStatistics[]>([])
  const exportRequests = ref<ExportRequest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch data statistics
   */
  const fetchStatistics = async (): Promise<DataStatistics[]> => {
    loading.value = true
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_data_statistics')

      if (rpcError) throw rpcError

      statistics.value = data || []
      return statistics.value
    } catch (err: any) {
      error.value = err.message
      logger.error('Failed to fetch statistics:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Archive old rides
   */
  const archiveOldRides = async (daysOld = 365, adminId: string): Promise<number> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('archive_old_rides', {
          p_days_old: daysOld,
          p_admin_id: adminId
        })

      if (rpcError) throw rpcError
      return data || 0
    } catch (err) {
      logger.error('Failed to archive rides:', err)
      return 0
    }
  }

  /**
   * Soft delete user
   */
  const softDeleteUser = async (userId: string, adminId: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('soft_delete_user', {
          p_user_id: userId,
          p_admin_id: adminId
        })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to soft delete user:', err)
      return false
    }
  }

  /**
   * Restore deleted user
   */
  const restoreUser = async (userId: string, adminId: string): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('restore_deleted_user', {
          p_user_id: userId,
          p_admin_id: adminId
        })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to restore user:', err)
      return false
    }
  }

  /**
   * Export user data (GDPR)
   */
  const exportUserData = async (userId: string): Promise<any> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('export_user_data', { p_user_id: userId })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to export user data:', err)
      return null
    }
  }

  /**
   * Request data export
   */
  const requestExport = async (
    exportType: string,
    adminId: string,
    filters: Record<string, any> = {}
  ): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('request_data_export', {
          p_export_type: exportType,
          p_admin_id: adminId,
          p_filters: filters
        })

      if (rpcError) throw rpcError
      return data
    } catch (err) {
      logger.error('Failed to request export:', err)
      return null
    }
  }

  /**
   * Fetch export requests
   */
  const fetchExportRequests = async (): Promise<ExportRequest[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('data_export_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      exportRequests.value = data || []
      return exportRequests.value
    } catch (err: any) {
      error.value = err.message
      return []
    }
  }

  /**
   * Download exported data as JSON
   */
  const downloadAsJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Download exported data as CSV
   */
  const downloadAsCsv = (data: any[], filename: string) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h]
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`
        }
        return val
      }).join(',')
    )

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Format bytes to human readable
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return {
    // State
    statistics,
    exportRequests,
    loading,
    error,

    // Methods
    fetchStatistics,
    archiveOldRides,
    softDeleteUser,
    restoreUser,
    exportUserData,
    requestExport,
    fetchExportRequests,
    downloadAsJson,
    downloadAsCsv,
    formatBytes
  }
}
