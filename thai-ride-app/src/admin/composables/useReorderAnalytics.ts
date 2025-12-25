/**
 * useReorderAnalytics - Admin Reorder Analytics Composable
 * Feature: F254 - Quick Reorder Analytics for Admin
 */

import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface ReorderStat {
  service_type: string
  total_reorders: number
  unique_users: number
  avg_time_between: string
  conversion_rate?: number
}

export interface ReorderTrend {
  date: string
  reorders: number
  service_type?: string
}

export interface TopReorderedRoute {
  from_location: string
  to_location: string
  reorder_count: number
  service_type: string
}

export const useReorderAnalytics = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get reorder statistics by service type
  const getReorderStats = async (days = 30) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: err } = await supabase.rpc('get_reorder_statistics', {
        p_days: days
      })
      
      if (err) throw err
      return data as ReorderStat[]
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching reorder stats:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Get reorder trends over time
  const getReorderTrends = async (days = 30) => {
    loading.value = true
    error.value = null
    
    try {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - days)
      
      const { data, error: err } = await supabase
        .from('reorder_analytics')
        .select('created_at, service_type')
        .gte('created_at', daysAgo.toISOString())
        .order('created_at', { ascending: true })
      
      if (err) throw err
      
      // Group by date
      const grouped = (data || []).reduce((acc: any, item: any) => {
        const date = new Date(item.created_at).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { date, reorders: 0 }
        }
        acc[date].reorders++
        return acc
      }, {})
      
      return Object.values(grouped) as ReorderTrend[]
    } catch (err: any) {
      error.value = err.message
      console.error('Error fetching reorder trends:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Export reorder data
  const exportReorderData = async (days = 30) => {
    loading.value = true
    error.value = null
    
    try {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - days)
      
      const { data, error: err } = await supabase
        .from('reorder_analytics')
        .select(`
          *,
          users:user_id (
            first_name,
            last_name,
            phone_number,
            member_uid
          )
        `)
        .gte('created_at', daysAgo.toISOString())
        .order('created_at', { ascending: false })
      
      if (err) throw err
      
      // Convert to CSV
      const csv = convertToCSV(data || [])
      downloadCSV(csv, `reorder-analytics-${new Date().toISOString().split('T')[0]}.csv`)
      
      return true
    } catch (err: any) {
      error.value = err.message
      console.error('Error exporting data:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // Helper: Convert to CSV
  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return ''
    
    const headers = [
      'วันที่',
      'ลูกค้า',
      'เบอร์โทร',
      'Member UID',
      'บริการ',
      'วิธีสั่งซ้ำ',
      'ระยะเวลา'
    ]
    
    const rows = data.map(row => [
      new Date(row.created_at).toLocaleString('th-TH'),
      row.users ? `${row.users.first_name} ${row.users.last_name}` : '-',
      row.users?.phone_number || '-',
      row.users?.member_uid || '-',
      row.service_type,
      row.reorder_method,
      row.time_since_original || '-'
    ])
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
  }

  // Helper: Download CSV
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  return {
    loading,
    error,
    getReorderStats,
    getReorderTrends,
    exportReorderData
  }
}
