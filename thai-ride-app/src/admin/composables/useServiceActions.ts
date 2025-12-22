/**
 * Admin Service Actions Composable
 * =================================
 * Shared actions for all service views: status update, export CSV, etc.
 */

import { ref } from 'vue'
import { supabase } from '../../lib/supabase'
import type { Order, ServiceType } from '../types'

export function useServiceActions() {
  const isUpdating = ref(false)
  const isExporting = ref(false)
  const error = ref<string | null>(null)

  // Status options per service type
  const statusOptions: Record<ServiceType, { value: string; label: string }[]> = {
    ride: [
      { value: 'pending', label: 'รอรับ' },
      { value: 'matched', label: 'จับคู่แล้ว' },
      { value: 'pickup', label: 'กำลังไปรับ' },
      { value: 'in_progress', label: 'กำลังเดินทาง' },
      { value: 'completed', label: 'เสร็จสิ้น' },
      { value: 'cancelled', label: 'ยกเลิก' }
    ],
    delivery: [
      { value: 'pending', label: 'รอรับ' },
      { value: 'matched', label: 'จับคู่แล้ว' },
      { value: 'pickup', label: 'กำลังไปรับ' },
      { value: 'in_transit', label: 'กำลังส่ง' },
      { value: 'delivered', label: 'ส่งแล้ว' },
      { value: 'cancelled', label: 'ยกเลิก' }
    ],
    shopping: [
      { value: 'pending', label: 'รอรับ' },
      { value: 'matched', label: 'จับคู่แล้ว' },
      { value: 'shopping', label: 'กำลังซื้อ' },
      { value: 'delivering', label: 'กำลังส่ง' },
      { value: 'completed', label: 'เสร็จสิ้น' },
      { value: 'cancelled', label: 'ยกเลิก' }
    ],
    queue: [
      { value: 'pending', label: 'รอยืนยัน' },
      { value: 'confirmed', label: 'ยืนยันแล้ว' },
      { value: 'in_progress', label: 'กำลังดำเนินการ' },
      { value: 'completed', label: 'เสร็จสิ้น' },
      { value: 'cancelled', label: 'ยกเลิก' }
    ],
    moving: [
      { value: 'pending', label: 'รอรับ' },
      { value: 'matched', label: 'จับคู่แล้ว' },
      { value: 'pickup', label: 'กำลังไปรับ' },
      { value: 'in_progress', label: 'กำลังขนย้าย' },
      { value: 'completed', label: 'เสร็จสิ้น' },
      { value: 'cancelled', label: 'ยกเลิก' }
    ],
    laundry: [
      { value: 'pending', label: 'รอรับ' },
      { value: 'matched', label: 'จับคู่แล้ว' },
      { value: 'picked_up', label: 'รับแล้ว' },
      { value: 'washing', label: 'กำลังซัก' },
      { value: 'ready', label: 'พร้อมส่ง' },
      { value: 'delivered', label: 'ส่งแล้ว' },
      { value: 'cancelled', label: 'ยกเลิก' }
    ]
  }

  // Table names per service type
  const tableNames: Record<ServiceType, string> = {
    ride: 'ride_requests',
    delivery: 'delivery_requests',
    shopping: 'shopping_requests',
    queue: 'queue_bookings',
    moving: 'moving_requests',
    laundry: 'laundry_requests'
  }

  // Update order status
  async function updateStatus(
    serviceType: ServiceType,
    orderId: string,
    newStatus: string
  ): Promise<boolean> {
    isUpdating.value = true
    error.value = null

    try {
      const tableName = tableNames[serviceType]
      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() }

      // Add timestamp fields based on status
      if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
      } else if (newStatus === 'completed' || newStatus === 'delivered') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', orderId)

      if (updateError) throw updateError
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update status'
      console.error('updateStatus error:', e)
      return false
    } finally {
      isUpdating.value = false
    }
  }

  // Export to CSV
  function exportToCSV(data: Order[], filename: string) {
    isExporting.value = true

    try {
      // Define CSV headers
      const headers = [
        'Tracking ID',
        'Status',
        'Customer Name',
        'Customer Phone',
        'Provider Name',
        'Pickup Address',
        'Dropoff Address',
        'Amount',
        'Payment Method',
        'Created At',
        'Completed At'
      ]

      // Convert data to CSV rows
      const rows = data.map(order => [
        order.tracking_id || '',
        order.status || '',
        order.customer_name || '',
        order.customer_phone || '',
        order.provider_name || '',
        order.pickup_address || '',
        order.dropoff_address || '',
        order.total_amount?.toString() || '0',
        order.payment_method || '',
        order.created_at ? new Date(order.created_at).toLocaleString('th-TH') : '',
        order.completed_at ? new Date(order.completed_at).toLocaleString('th-TH') : ''
      ])

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      // Add BOM for Thai characters
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

      // Download file
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(link.href)

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to export CSV'
      console.error('exportToCSV error:', e)
      return false
    } finally {
      isExporting.value = false
    }
  }

  // Get status options for a service type
  function getStatusOptions(serviceType: ServiceType) {
    return statusOptions[serviceType] || []
  }

  // Format date for display
  function formatDate(date: string | null | undefined): string {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format currency
  function formatCurrency(amount: number | null | undefined): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  // Get status color
  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      matched: '#3B82F6',
      confirmed: '#3B82F6',
      pickup: '#8B5CF6',
      in_transit: '#8B5CF6',
      in_progress: '#8B5CF6',
      shopping: '#8B5CF6',
      delivering: '#8B5CF6',
      washing: '#6366F1',
      picked_up: '#8B5CF6',
      ready: '#10B981',
      completed: '#10B981',
      delivered: '#059669',
      cancelled: '#EF4444',
      failed: '#EF4444'
    }
    return colors[status] || '#6B7280'
  }

  // Get status label
  function getStatusLabel(status: string, serviceType: ServiceType): string {
    const options = statusOptions[serviceType]
    const option = options?.find(o => o.value === status)
    return option?.label || status
  }

  return {
    isUpdating,
    isExporting,
    error,
    statusOptions,
    updateStatus,
    exportToCSV,
    getStatusOptions,
    formatDate,
    formatCurrency,
    getStatusColor,
    getStatusLabel
  }
}
