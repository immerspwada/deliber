/**
 * Push Analytics Composable
 * Admin dashboard for push notification analytics
 * 
 * Role Impact:
 * - Provider: No access
 * - Customer: No access
 * - Admin: Full access to analytics
 */
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface PushAnalyticsSummary {
  total_sent: number
  total_delivered: number
  total_failed: number
  delivery_rate: number
  avg_latency_ms: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  failure_reasons: Record<string, number>
}

export interface PushVolumeData {
  time_bucket: string
  total_count: number
  sent_count: number
  delivered_count: number
  failed_count: number
}

export interface PushLogEntry {
  id: string
  provider_id: string | null
  subscription_id: string | null
  notification_type: string
  title: string
  body: string | null
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired'
  error_message: string | null
  latency_ms: number | null
  sent_at: string
  delivered_at: string | null
  metadata: Record<string, unknown>
}

export type TimeRange = '24h' | '7d' | '30d' | 'custom'
export type TimeInterval = 'hour' | 'day' | 'week'

export function usePushAnalytics() {
  const summary = ref<PushAnalyticsSummary | null>(null)
  const volumeData = ref<PushVolumeData[]>([])
  const recentLogs = ref<PushLogEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Date range state
  const timeRange = ref<TimeRange>('7d')
  const customStartDate = ref<string>('')
  const customEndDate = ref<string>('')

  // Computed date range
  const dateRange = computed(() => {
    const now = new Date()
    let start: Date
    let end = now

    switch (timeRange.value) {
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'custom':
        start = customStartDate.value ? new Date(customStartDate.value) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        end = customEndDate.value ? new Date(customEndDate.value) : now
        break
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    return { start, end }
  })

  // Computed interval based on time range
  const interval = computed((): TimeInterval => {
    switch (timeRange.value) {
      case '24h':
        return 'hour'
      case '7d':
        return 'day'
      case '30d':
        return 'day'
      default:
        return 'day'
    }
  })

  // Load analytics summary
  async function loadSummary(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { start, end } = dateRange.value

      const { data, error: fetchError } = await supabase
        .rpc('get_push_analytics', {
          p_start_date: start.toISOString(),
          p_end_date: end.toISOString()
        }) as { data: PushAnalyticsSummary[] | null; error: Error | null }

      if (fetchError) throw fetchError

      if (data && data.length > 0) {
        summary.value = data[0]
      } else {
        summary.value = {
          total_sent: 0,
          total_delivered: 0,
          total_failed: 0,
          delivery_rate: 0,
          avg_latency_ms: 0,
          by_type: {},
          by_status: {},
          failure_reasons: {}
        }
      }

      console.log('[PushAnalytics] Summary loaded:', summary.value)
    } catch (err) {
      console.error('[PushAnalytics] Load summary error:', err)
      error.value = 'ไม่สามารถโหลดข้อมูลสถิติได้'
    } finally {
      loading.value = false
    }
  }

  // Load volume data for chart
  async function loadVolumeData(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { start, end } = dateRange.value

      const { data, error: fetchError } = await supabase
        .rpc('get_push_volume_by_time', {
          p_start_date: start.toISOString(),
          p_end_date: end.toISOString(),
          p_interval: interval.value
        }) as { data: PushVolumeData[] | null; error: Error | null }

      if (fetchError) throw fetchError

      volumeData.value = data || []

      console.log('[PushAnalytics] Volume data loaded:', volumeData.value.length, 'points')
    } catch (err) {
      console.error('[PushAnalytics] Load volume error:', err)
      error.value = 'ไม่สามารถโหลดข้อมูลกราฟได้'
    } finally {
      loading.value = false
    }
  }

  // Load recent logs
  async function loadRecentLogs(limit = 50): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { start, end } = dateRange.value

      const { data, error: fetchError } = await (supabase
        .from('push_logs') as ReturnType<typeof supabase.from>)
        .select('*')
        .gte('sent_at', start.toISOString())
        .lte('sent_at', end.toISOString())
        .order('sent_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      recentLogs.value = data || []

      console.log('[PushAnalytics] Recent logs loaded:', recentLogs.value.length)
    } catch (err) {
      console.error('[PushAnalytics] Load logs error:', err)
      error.value = 'ไม่สามารถโหลดประวัติการส่งได้'
    } finally {
      loading.value = false
    }
  }

  // Load all analytics data
  async function loadAnalytics(): Promise<void> {
    await Promise.all([
      loadSummary(),
      loadVolumeData(),
      loadRecentLogs()
    ])
  }

  // Set time range and reload
  async function setTimeRange(range: TimeRange): Promise<void> {
    timeRange.value = range
    await loadAnalytics()
  }

  // Set custom date range
  async function setCustomRange(start: string, end: string): Promise<void> {
    customStartDate.value = start
    customEndDate.value = end
    timeRange.value = 'custom'
    await loadAnalytics()
  }

  // Computed: top notification types
  const topNotificationTypes = computed(() => {
    if (!summary.value?.by_type) return []
    
    return Object.entries(summary.value.by_type)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  })

  // Computed: top failure reasons
  const topFailureReasons = computed(() => {
    if (!summary.value?.failure_reasons) return []
    
    return Object.entries(summary.value.failure_reasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  })

  // Computed: status breakdown for pie chart
  const statusBreakdown = computed(() => {
    if (!summary.value?.by_status) return []
    
    const statusLabels: Record<string, string> = {
      pending: 'รอส่ง',
      sent: 'ส่งแล้ว',
      delivered: 'ส่งถึง',
      failed: 'ล้มเหลว',
      expired: 'หมดอายุ'
    }
    
    return Object.entries(summary.value.by_status)
      .map(([status, count]) => ({
        status,
        label: statusLabels[status] || status,
        count
      }))
  })

  return {
    summary,
    volumeData,
    recentLogs,
    loading,
    error,
    timeRange,
    customStartDate,
    customEndDate,
    dateRange,
    interval,
    topNotificationTypes,
    topFailureReasons,
    statusBreakdown,
    loadAnalytics,
    loadSummary,
    loadVolumeData,
    loadRecentLogs,
    setTimeRange,
    setCustomRange
  }
}
