/**
 * useCancellationAnalytics - Cancellation Analytics Composable
 * 
 * Feature: F53 - Cancellation System Analytics
 * Tables: ride_requests, delivery_requests, shopping_requests
 * 
 * Provides analytics for cancellation patterns, reasons, and trends
 */
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

export interface CancellationRecord {
  id: string
  trackingId: string
  serviceType: 'ride' | 'delivery' | 'shopping' | 'queue' | 'moving' | 'laundry'
  customerId: string
  customerName: string
  customerPhone: string
  providerId: string | null
  providerName: string | null
  cancelReason: string
  cancelledBy: 'customer' | 'provider' | 'admin' | 'system'
  cancellationFee: number
  refundAmount: number
  cancelledAt: string
  createdAt: string
  pickup: string
  destination: string
  estimatedFare: number
}

export interface CancellationStats {
  totalCancellations: number
  byCustomer: number
  byProvider: number
  byAdmin: number
  bySystem: number
  totalFees: number
  totalRefunds: number
  cancellationRate: number
}

export interface ReasonBreakdown {
  reason: string
  count: number
  percentage: number
}

export interface HourlyTrend {
  hour: number
  count: number
}

export interface DailyTrend {
  date: string
  count: number
  byCustomer: number
  byProvider: number
}

export function useCancellationAnalytics() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const cancellations = ref<CancellationRecord[]>([])
  const stats = ref<CancellationStats | null>(null)
  const reasonBreakdown = ref<ReasonBreakdown[]>([])
  const hourlyTrend = ref<HourlyTrend[]>([])
  const dailyTrend = ref<DailyTrend[]>([])

  // Fetch all cancellations with filters
  const fetchCancellations = async (options: {
    serviceType?: string
    startDate?: string
    endDate?: string
    cancelledBy?: string
    limit?: number
  } = {}) => {
    loading.value = true
    error.value = null
    
    try {
      const results: CancellationRecord[] = []
      const services = options.serviceType 
        ? [options.serviceType] 
        : ['ride', 'delivery', 'shopping']
      
      for (const service of services) {
        const tableName = service === 'ride' ? 'ride_requests' 
          : service === 'delivery' ? 'delivery_requests' 
          : 'shopping_requests'
        
        let query = supabase
          .from(tableName)
          .select(`
            id,
            tracking_id,
            customer_id,
            provider_id,
            cancel_reason,
            cancelled_by,
            cancellation_fee,
            cancelled_at,
            created_at,
            pickup_address,
            destination_address,
            estimated_fare,
            users!customer_id(first_name, last_name, phone_number),
            service_providers!provider_id(users(first_name, last_name))
          `)
          .eq('status', 'cancelled')
          .not('cancelled_at', 'is', null)
          .order('cancelled_at', { ascending: false })
        
        if (options.startDate) {
          query = query.gte('cancelled_at', options.startDate)
        }
        if (options.endDate) {
          query = query.lte('cancelled_at', options.endDate)
        }
        if (options.cancelledBy) {
          query = query.eq('cancelled_by', options.cancelledBy)
        }
        if (options.limit) {
          query = query.limit(options.limit)
        }
        
        const { data, error: fetchError } = await query
        
        if (fetchError) throw fetchError
        
        if (data) {
          results.push(...data.map((item: any) => ({
            id: item.id,
            trackingId: item.tracking_id,
            serviceType: service as any,
            customerId: item.customer_id,
            customerName: item.users ? `${item.users.first_name || ''} ${item.users.last_name || ''}`.trim() : 'ไม่ระบุ',
            customerPhone: item.users?.phone_number || '',
            providerId: item.provider_id,
            providerName: item.service_providers?.users 
              ? `${item.service_providers.users.first_name || ''} ${item.service_providers.users.last_name || ''}`.trim() 
              : null,
            cancelReason: item.cancel_reason || 'ไม่ระบุเหตุผล',
            cancelledBy: item.cancelled_by || 'customer',
            cancellationFee: item.cancellation_fee || 0,
            refundAmount: 0, // Calculate based on payment
            cancelledAt: item.cancelled_at,
            createdAt: item.created_at,
            pickup: item.pickup_address || '',
            destination: item.destination_address || '',
            estimatedFare: item.estimated_fare || 0
          })))
        }
      }
      
      // Sort by cancelled_at
      results.sort((a, b) => new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime())
      
      cancellations.value = results
      return results
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Fetch cancellation statistics
  const fetchStats = async (options: {
    startDate?: string
    endDate?: string
  } = {}) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: rpcError } = await supabase.rpc('get_cancellation_stats', {
        p_start_date: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_end_date: options.endDate || new Date().toISOString().split('T')[0]
      })
      
      if (rpcError) throw rpcError
      
      // Aggregate stats from all services
      let totalCancellations = 0
      let byCustomer = 0
      let byProvider = 0
      let byAdmin = 0
      const totalFees = 0
      
      if (data) {
        for (const row of data) {
          totalCancellations += Number(row.total_cancelled) || 0
          byCustomer += Number(row.cancelled_by_customer) || 0
          byProvider += Number(row.cancelled_by_provider) || 0
          byAdmin += Number(row.cancelled_by_admin) || 0
        }
      }
      
      // Get total orders for rate calculation
      const { count: totalOrders } = await supabase
        .from('ride_requests')
        .select('*', { count: 'exact', head: true })
      
      stats.value = {
        totalCancellations,
        byCustomer,
        byProvider,
        byAdmin,
        bySystem: totalCancellations - byCustomer - byProvider - byAdmin,
        totalFees,
        totalRefunds: 0,
        cancellationRate: totalOrders ? (totalCancellations / totalOrders) * 100 : 0
      }
      
      return stats.value
    } catch (err: any) {
      error.value = err.message
      return null
    } finally {
      loading.value = false
    }
  }

  // Fetch reason breakdown
  const fetchReasonBreakdown = async (options: {
    serviceType?: string
    startDate?: string
    endDate?: string
  } = {}) => {
    loading.value = true
    
    try {
      const { data, error: fetchError } = await supabase
        .from('ride_requests')
        .select('cancel_reason')
        .eq('status', 'cancelled')
        .not('cancel_reason', 'is', null)
      
      if (fetchError) throw fetchError
      
      // Count reasons
      const reasonCounts: Record<string, number> = {}
      let total = 0
      
      if (data) {
        for (const item of data) {
          const reason = item.cancel_reason || 'ไม่ระบุ'
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
          total++
        }
      }
      
      reasonBreakdown.value = Object.entries(reasonCounts)
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count)
      
      return reasonBreakdown.value
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Fetch hourly trend
  const fetchHourlyTrend = async () => {
    loading.value = true
    
    try {
      const { data, error: fetchError } = await supabase
        .from('ride_requests')
        .select('cancelled_at')
        .eq('status', 'cancelled')
        .not('cancelled_at', 'is', null)
        .gte('cancelled_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      
      if (fetchError) throw fetchError
      
      // Count by hour
      const hourCounts: Record<number, number> = {}
      for (let i = 0; i < 24; i++) hourCounts[i] = 0
      
      if (data) {
        for (const item of data) {
          const hour = new Date(item.cancelled_at).getHours()
          hourCounts[hour]++
        }
      }
      
      hourlyTrend.value = Object.entries(hourCounts)
        .map(([hour, count]) => ({
          hour: Number(hour),
          count
        }))
        .sort((a, b) => a.hour - b.hour)
      
      return hourlyTrend.value
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Fetch daily trend
  const fetchDailyTrend = async (days: number = 30) => {
    loading.value = true
    
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      
      const { data, error: fetchError } = await supabase
        .from('ride_requests')
        .select('cancelled_at, cancelled_by')
        .eq('status', 'cancelled')
        .not('cancelled_at', 'is', null)
        .gte('cancelled_at', startDate.toISOString())
      
      if (fetchError) throw fetchError
      
      // Count by date
      const dateCounts: Record<string, { count: number; byCustomer: number; byProvider: number }> = {}
      
      if (data) {
        for (const item of data) {
          const date = new Date(item.cancelled_at).toISOString().split('T')[0]
          if (!dateCounts[date]) {
            dateCounts[date] = { count: 0, byCustomer: 0, byProvider: 0 }
          }
          dateCounts[date].count++
          if (item.cancelled_by === 'customer') dateCounts[date].byCustomer++
          if (item.cancelled_by === 'provider') dateCounts[date].byProvider++
        }
      }
      
      dailyTrend.value = Object.entries(dateCounts)
        .map(([date, data]) => ({
          date,
          ...data
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
      
      return dailyTrend.value
    } catch (err: any) {
      error.value = err.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Notify provider about cancellation
  const notifyProviderCancellation = async (
    providerId: string,
    rideId: string,
    reason: string,
    customerName: string
  ) => {
    try {
      // Insert notification
      await supabase.from('user_notifications').insert({
        user_id: providerId,
        title: 'งานถูกยกเลิก',
        message: `ลูกค้า ${customerName} ยกเลิกงาน: ${reason}`,
        type: 'ride_cancelled',
        data: { ride_id: rideId, reason },
        is_read: false
      })
      
      // Queue push notification
      await supabase.from('push_notification_queue').insert({
        user_id: providerId,
        title: 'งานถูกยกเลิก',
        body: `ลูกค้ายกเลิกงาน: ${reason}`,
        data: { type: 'ride_cancelled', ride_id: rideId },
        priority: 'high'
      })
      
      return true
    } catch (err) {
      console.error('Failed to notify provider:', err)
      return false
    }
  }

  return {
    loading,
    error,
    cancellations,
    stats,
    reasonBreakdown,
    hourlyTrend,
    dailyTrend,
    fetchCancellations,
    fetchStats,
    fetchReasonBreakdown,
    fetchHourlyTrend,
    fetchDailyTrend,
    notifyProviderCancellation
  }
}
