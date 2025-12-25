/**
 * useSystemLogs - Admin System Logs Management
 * Feature: Realtime Logging System - Admin Dashboard
 * 
 * Centralized log monitoring for Admin
 * - View logs from all users in realtime
 * - Filter by level, category, user, page, date range
 * - View statistics and error trends
 * - Export logs
 * - Clean old logs
 */

import { ref, computed } from 'vue'
import { supabase } from '../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface SystemLog {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'success'
  category: string
  message: string
  data?: any
  stack?: string
  user_id?: string
  user_email?: string
  user_name?: string
  page?: string
  session_id?: string
  user_agent?: string
  ip_address?: string
}

export interface LogStats {
  total_logs: number
  error_count: number
  warn_count: number
  info_count: number
  debug_count: number
  success_count: number
  unique_users: number
  unique_sessions: number
  top_category: string
  top_page: string
  error_rate: number
}

export interface ErrorTrend {
  hour_bucket: string
  error_count: number
  warn_count: number
  total_count: number
}

export interface CommonError {
  message: string
  category: string
  count: number
  first_seen: string
  last_seen: string
  affected_users: number
}

export interface LogFilters {
  level?: string
  category?: string
  user_id?: string
  page?: string
  search?: string
  start_date?: string
  end_date?: string
}

export const useSystemLogs = () => {
  const loading = ref(false)
  const logs = ref<SystemLog[]>([])
  const stats = ref<LogStats | null>(null)
  const errorTrends = ref<ErrorTrend[]>([])
  const commonErrors = ref<CommonError[]>([])
  const totalCount = ref(0)
  
  let realtimeChannel: RealtimeChannel | null = null
  
  // Fetch logs with filters
  const fetchLogs = async (
    filters: LogFilters = {},
    limit = 100,
    offset = 0
  ) => {
    loading.value = true
    try {
      const { data, error } = await supabase.rpc('admin_get_logs', {
        p_level: filters.level || null,
        p_category: filters.category || null,
        p_user_id: filters.user_id || null,
        p_page: filters.page || null,
        p_search: filters.search || null,
        p_start_date: filters.start_date || null,
        p_end_date: filters.end_date || null,
        p_limit: limit,
        p_offset: offset
      })
      
      if (error) throw error
      
      logs.value = data || []
      
      // Get total count (approximate)
      if (offset === 0) {
        totalCount.value = logs.value.length
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // Fetch log statistics
  const fetchStats = async (hours = 24) => {
    loading.value = true
    try {
      const { data, error } = await supabase.rpc('admin_get_log_stats', {
        p_hours: hours
      })
      
      if (error) throw error
      
      if (data && data.length > 0) {
        stats.value = data[0]
      }
    } catch (err) {
      console.error('Error fetching log stats:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // Fetch error trends
  const fetchErrorTrends = async (hours = 24) => {
    loading.value = true
    try {
      const { data, error } = await supabase.rpc('admin_get_error_trends', {
        p_hours: hours
      })
      
      if (error) throw error
      
      errorTrends.value = data || []
    } catch (err) {
      console.error('Error fetching error trends:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // Fetch common errors
  const fetchCommonErrors = async (hours = 24, limit = 10) => {
    loading.value = true
    try {
      const { data, error } = await supabase.rpc('admin_get_common_errors', {
        p_hours: hours,
        p_limit: limit
      })
      
      if (error) throw error
      
      commonErrors.value = data || []
    } catch (err) {
      console.error('Error fetching common errors:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  // Subscribe to realtime logs
  const subscribeToLogs = (filters: LogFilters = {}) => {
    // Unsubscribe from previous channel
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
    }
    
    // Create new channel
    realtimeChannel = supabase
      .channel('system_logs_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_logs'
        },
        (payload) => {
          const newLog = payload.new as SystemLog
          
          // Apply filters
          if (filters.level && newLog.level !== filters.level) return
          if (filters.category && newLog.category !== filters.category) return
          if (filters.user_id && newLog.user_id !== filters.user_id) return
          if (filters.page && !newLog.page?.includes(filters.page)) return
          if (filters.search && !newLog.message.toLowerCase().includes(filters.search.toLowerCase())) return
          
          // Add to beginning of logs array
          logs.value.unshift(newLog)
          
          // Keep only last 500 logs in memory
          if (logs.value.length > 500) {
            logs.value = logs.value.slice(0, 500)
          }
          
          // Update stats if error
          if (newLog.level === 'error' && stats.value) {
            stats.value.error_count++
            stats.value.total_logs++
          }
        }
      )
      .subscribe()
  }
  
  // Unsubscribe from realtime
  const unsubscribe = () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }
  
  // Export logs
  const exportLogs = async (filters: LogFilters = {}) => {
    try {
      // Fetch all logs (no limit)
      const { data, error } = await supabase.rpc('admin_get_logs', {
        p_level: filters.level || null,
        p_category: filters.category || null,
        p_user_id: filters.user_id || null,
        p_page: filters.page || null,
        p_search: filters.search || null,
        p_start_date: filters.start_date || null,
        p_end_date: filters.end_date || null,
        p_limit: 10000,
        p_offset: 0
      })
      
      if (error) throw error
      
      // Create JSON file
      const jsonData = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `system-logs-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      return data?.length || 0
    } catch (err) {
      console.error('Error exporting logs:', err)
      throw err
    }
  }
  
  // Clean old logs
  const cleanOldLogs = async (days = 30) => {
    try {
      const { data, error } = await supabase.rpc('admin_clean_old_logs', {
        p_days: days
      })
      
      if (error) throw error
      
      return data || 0
    } catch (err) {
      console.error('Error cleaning old logs:', err)
      throw err
    }
  }
  
  // Fetch all data
  const fetchAll = async (hours = 24, filters: LogFilters = {}) => {
    await Promise.all([
      fetchLogs(filters),
      fetchStats(hours),
      fetchErrorTrends(hours),
      fetchCommonErrors(hours)
    ])
  }
  
  // Computed
  const hasData = computed(() => logs.value.length > 0)
  const errorRate = computed(() => stats.value?.error_rate || 0)
  const totalLogs = computed(() => stats.value?.total_logs || 0)
  
  return {
    loading,
    logs,
    stats,
    errorTrends,
    commonErrors,
    totalCount,
    hasData,
    errorRate,
    totalLogs,
    fetchLogs,
    fetchStats,
    fetchErrorTrends,
    fetchCommonErrors,
    fetchAll,
    subscribeToLogs,
    unsubscribe,
    exportLogs,
    cleanOldLogs
  }
}
