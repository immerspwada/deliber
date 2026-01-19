/**
 * Customer Bulk Actions Composable
 * =================================
 * จัดการ bulk actions สำหรับลูกค้าหลายคน
 */
import { ref, computed } from 'vue'
import { useToast } from '@/composables/useToast'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { supabase } from '@/lib/supabase'

export interface BulkActionResult {
  success: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

export function useCustomerBulkActions() {
  const toast = useToast()
  const errorHandler = useErrorHandler()

  // Selection state
  const selectedIds = ref<Set<string>>(new Set())
  const selectAll = ref(false)
  const excludedIds = ref<Set<string>>(new Set())

  // UI state
  const isProcessing = ref(false)
  const progress = ref(0)
  const currentAction = ref<string | null>(null)

  // Computed
  const selectedCount = computed(() => {
    if (selectAll.value) {
      return totalCount.value - excludedIds.value.size
    }
    return selectedIds.value.size
  })

  const hasSelection = computed(() => selectedCount.value > 0)

  const canBulkSuspend = computed(() => hasSelection.value && !isProcessing.value)
  const canBulkExport = computed(() => hasSelection.value && !isProcessing.value)
  const canBulkEmail = computed(() => hasSelection.value && !isProcessing.value)

  // Total count (should be passed from parent)
  const totalCount = ref(0)

  // Methods
  function toggleSelection(id: string) {
    if (selectAll.value) {
      // In select-all mode, toggle exclusion
      if (excludedIds.value.has(id)) {
        excludedIds.value.delete(id)
      } else {
        excludedIds.value.add(id)
      }
    } else {
      // Normal mode, toggle selection
      if (selectedIds.value.has(id)) {
        selectedIds.value.delete(id)
      } else {
        selectedIds.value.add(id)
      }
    }
  }

  function isSelected(id: string): boolean {
    if (selectAll.value) {
      return !excludedIds.value.has(id)
    }
    return selectedIds.value.has(id)
  }

  function toggleSelectAll() {
    selectAll.value = !selectAll.value
    if (!selectAll.value) {
      excludedIds.value.clear()
    }
    selectedIds.value.clear()
  }

  function clearSelection() {
    selectedIds.value.clear()
    excludedIds.value.clear()
    selectAll.value = false
  }

  function setTotalCount(count: number) {
    totalCount.value = count
  }

  // Get selected IDs (handles both modes)
  async function getSelectedIds(allIds: string[]): Promise<string[]> {
    if (selectAll.value) {
      return allIds.filter(id => !excludedIds.value.has(id))
    }
    return Array.from(selectedIds.value)
  }

  // Bulk suspend
  async function bulkSuspend(
    allIds: string[],
    reason: string
  ): Promise<BulkActionResult> {
    if (!reason.trim()) {
      throw new Error('กรุณาระบุเหตุผลในการระงับ')
    }

    isProcessing.value = true
    currentAction.value = 'suspend'
    progress.value = 0

    const result: BulkActionResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    try {
      const ids = await getSelectedIds(allIds)
      const total = ids.length

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        
        try {
          const { error } = await supabase.rpc('admin_suspend_customer', {
            p_customer_id: id,
            p_reason: reason
          })

          if (error) throw error
          result.success++
        } catch (error) {
          result.failed++
          result.errors.push({
            id,
            error: (error as Error).message
          })
        }

        progress.value = Math.round(((i + 1) / total) * 100)
      }

      if (result.success > 0) {
        toast.success(`ระงับสำเร็จ ${result.success} คน`)
      }
      if (result.failed > 0) {
        toast.error(`ระงับไม่สำเร็จ ${result.failed} คน`)
      }

      clearSelection()
      return result
    } finally {
      isProcessing.value = false
      currentAction.value = null
      progress.value = 0
    }
  }

  // Bulk unsuspend
  async function bulkUnsuspend(allIds: string[]): Promise<BulkActionResult> {
    isProcessing.value = true
    currentAction.value = 'unsuspend'
    progress.value = 0

    const result: BulkActionResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    try {
      const ids = await getSelectedIds(allIds)
      const total = ids.length

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        
        try {
          const { error } = await supabase.rpc('admin_unsuspend_customer', {
            p_customer_id: id
          })

          if (error) throw error
          result.success++
        } catch (error) {
          result.failed++
          result.errors.push({
            id,
            error: (error as Error).message
          })
        }

        progress.value = Math.round(((i + 1) / total) * 100)
      }

      if (result.success > 0) {
        toast.success(`ปลดระงับสำเร็จ ${result.success} คน`)
      }
      if (result.failed > 0) {
        toast.error(`ปลดระงับไม่สำเร็จ ${result.failed} คน`)
      }

      clearSelection()
      return result
    } finally {
      isProcessing.value = false
      currentAction.value = null
      progress.value = 0
    }
  }

  // Bulk export to CSV
  async function bulkExportCSV(
    allCustomers: any[],
    allIds: string[]
  ): Promise<void> {
    isProcessing.value = true
    currentAction.value = 'export'

    try {
      const ids = await getSelectedIds(allIds)
      const customers = allCustomers.filter(c => ids.includes(c.id))

      // Generate CSV
      const headers = [
        'ID',
        'ชื่อ',
        'อีเมล',
        'เบอร์โทร',
        'สถานะ',
        'Wallet',
        'จำนวนออเดอร์',
        'ยอดใช้จ่ายรวม',
        'คะแนนเฉลี่ย',
        'วันที่สมัคร'
      ]

      const rows = customers.map(c => [
        c.id,
        c.full_name || '',
        c.email || '',
        c.phone_number || '',
        c.status,
        c.wallet_balance || 0,
        c.total_orders || 0,
        c.total_spent || 0,
        c.average_rating || 0,
        new Date(c.created_at).toLocaleDateString('th-TH')
      ])

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast.success(`ส่งออกข้อมูล ${customers.length} คนสำเร็จ`)
      clearSelection()
    } catch (error) {
      errorHandler.handle(error, 'bulkExportCSV')
    } finally {
      isProcessing.value = false
      currentAction.value = null
    }
  }

  // Bulk send email
  async function bulkSendEmail(
    allIds: string[],
    subject: string,
    message: string
  ): Promise<BulkActionResult> {
    if (!subject.trim() || !message.trim()) {
      throw new Error('กรุณาระบุหัวข้อและข้อความ')
    }

    isProcessing.value = true
    currentAction.value = 'email'
    progress.value = 0

    const result: BulkActionResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    try {
      const ids = await getSelectedIds(allIds)
      const total = ids.length

      // TODO: Implement email sending via Edge Function
      // For now, just simulate
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        
        try {
          // await supabase.functions.invoke('send-email', {
          //   body: { customer_id: id, subject, message }
          // })
          
          // Simulate delay
          await new Promise(resolve => setTimeout(resolve, 100))
          result.success++
        } catch (error) {
          result.failed++
          result.errors.push({
            id,
            error: (error as Error).message
          })
        }

        progress.value = Math.round(((i + 1) / total) * 100)
      }

      if (result.success > 0) {
        toast.success(`ส่งอีเมลสำเร็จ ${result.success} คน`)
      }
      if (result.failed > 0) {
        toast.error(`ส่งอีเมลไม่สำเร็จ ${result.failed} คน`)
      }

      clearSelection()
      return result
    } finally {
      isProcessing.value = false
      currentAction.value = null
      progress.value = 0
    }
  }

  // Bulk send push notification
  async function bulkSendPushNotification(
    allIds: string[],
    title: string,
    body: string
  ): Promise<BulkActionResult> {
    if (!title.trim() || !body.trim()) {
      throw new Error('กรุณาระบุหัวข้อและข้อความ')
    }

    isProcessing.value = true
    currentAction.value = 'push'
    progress.value = 0

    const result: BulkActionResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    try {
      const ids = await getSelectedIds(allIds)
      const total = ids.length

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        
        try {
          const { error } = await supabase.functions.invoke('send-push', {
            body: {
              user_id: id,
              title,
              body,
              data: { type: 'admin_notification' }
            }
          })

          if (error) throw error
          result.success++
        } catch (error) {
          result.failed++
          result.errors.push({
            id,
            error: (error as Error).message
          })
        }

        progress.value = Math.round(((i + 1) / total) * 100)
      }

      if (result.success > 0) {
        toast.success(`ส่งการแจ้งเตือนสำเร็จ ${result.success} คน`)
      }
      if (result.failed > 0) {
        toast.error(`ส่งการแจ้งเตือนไม่สำเร็จ ${result.failed} คน`)
      }

      clearSelection()
      return result
    } finally {
      isProcessing.value = false
      currentAction.value = null
      progress.value = 0
    }
  }

  return {
    // State
    selectedIds,
    selectAll,
    excludedIds,
    isProcessing,
    progress,
    currentAction,

    // Computed
    selectedCount,
    hasSelection,
    canBulkSuspend,
    canBulkExport,
    canBulkEmail,

    // Methods
    toggleSelection,
    isSelected,
    toggleSelectAll,
    clearSelection,
    setTotalCount,
    getSelectedIds,
    bulkSuspend,
    bulkUnsuspend,
    bulkExportCSV,
    bulkSendEmail,
    bulkSendPushNotification
  }
}
