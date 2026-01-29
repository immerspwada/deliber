/**
 * Customer History Composable
 * ============================
 * จัดการประวัติออเดอร์และการเปลี่ยนแปลงข้อมูลของลูกค้า
 */
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

// Types
export interface CustomerOrder {
  id: string
  order_type: 'ride' | 'queue' | 'shopping' | 'delivery'
  order_number: string
  status: string
  total_fare: number
  pickup_address: string
  dropoff_address: string
  provider_name: string
  created_at: string
  completed_at: string | null
}

export interface CustomerHistoryChange {
  id: string
  change_type: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: string
  changed_by_name: string
  changed_at: string
  reason: string | null
}

export function useCustomerHistory() {
  // State
  const orders = ref<CustomerOrder[]>([])
  const historyChanges = ref<CustomerHistoryChange[]>([])
  const loadingOrders = ref(false)
  const loadingHistory = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const totalOrders = computed(() => orders.value.length)
  const completedOrders = computed(() => 
    orders.value.filter(o => o.status === 'completed').length
  )
  const cancelledOrders = computed(() => 
    orders.value.filter(o => o.status === 'cancelled').length
  )
  const totalSpent = computed(() => 
    orders.value
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.total_fare || 0), 0)
  )

  // Fetch customer orders
  async function fetchCustomerOrders(customerId: string, limit = 50, offset = 0) {
    loadingOrders.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_get_customer_orders', {
          p_customer_id: customerId,
          p_limit: limit,
          p_offset: offset
        })

      if (rpcError) throw rpcError

      orders.value = (data || []) as CustomerOrder[]
    } catch (e) {
      console.error('Error fetching customer orders:', e)
      error.value = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการโหลดประวัติออเดอร์'
      orders.value = []
    } finally {
      loadingOrders.value = false
    }
  }

  // Fetch customer history changes
  async function fetchCustomerHistory(customerId: string, limit = 50) {
    loadingHistory.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_get_customer_history', {
          p_customer_id: customerId,
          p_limit: limit
        })

      if (rpcError) throw rpcError

      historyChanges.value = (data || []) as CustomerHistoryChange[]
    } catch (e) {
      console.error('Error fetching customer history:', e)
      error.value = e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการโหลดประวัติการเปลี่ยนแปลง'
      historyChanges.value = []
    } finally {
      loadingHistory.value = false
    }
  }

  // Format helpers
  function formatCurrency(amount: number): string {
    return `฿${amount.toLocaleString('th-TH')}`
  }

  function formatDate(date: string): string {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatOrderType(type: string): string {
    const types: Record<string, string> = {
      ride: 'เรียกรถ',
      queue: 'จองคิว',
      shopping: 'ช้อปปิ้ง',
      delivery: 'ส่งของ'
    }
    return types[type] || type
  }

  function formatStatus(status: string): string {
    const statuses: Record<string, string> = {
      pending: 'รอดำเนินการ',
      matched: 'จับคู่แล้ว',
      accepted: 'รับงานแล้ว',
      pickup: 'กำลังไปรับ',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    }
    return statuses[status] || status
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      matched: '#3B82F6',
      accepted: '#8B5CF6',
      pickup: '#06B6D4',
      in_progress: '#10B981',
      completed: '#059669',
      cancelled: '#EF4444'
    }
    return colors[status] || '#6B7280'
  }

  function getOrderTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      ride: '🚗',
      queue: '📅',
      shopping: '🛒',
      delivery: '📦'
    }
    return icons[type] || '📋'
  }

  return {
    // State
    orders,
    historyChanges,
    loadingOrders,
    loadingHistory,
    error,

    // Computed
    totalOrders,
    completedOrders,
    cancelledOrders,
    totalSpent,

    // Methods
    fetchCustomerOrders,
    fetchCustomerHistory,
    formatCurrency,
    formatDate,
    formatOrderType,
    formatStatus,
    getStatusColor,
    getOrderTypeIcon
  }
}
