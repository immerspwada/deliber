<script setup lang="ts">
/**
 * Admin Push Notifications Management View
 * Feature: F07 - Push Notifications
 * 
 * Admin สามารถ:
 * - ดูสถานะ Push Notification Queue
 * - ส่ง Broadcast Push Notification
 * - ดูสถิติการส่ง (Analytics Dashboard)
 * - จัดการ Failed Notifications
 * - ใช้ Templates สำหรับ Broadcast
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { 
  useNotificationTemplates, 
  type NotificationTemplate,
  type PushAnalytics,
  TEMPLATE_CATEGORIES 
} from '../composables/useNotificationTemplates'

const router = useRouter()
const {
  templates,
  analytics,
  analyticsOverview,
  fetchTemplates,
  fetchAnalytics,
  previewTemplate
} = useNotificationTemplates()

interface QueueItem {
  id: string
  user_id: string
  title: string
  body: string
  status: 'pending' | 'sent' | 'failed' | 'expired'
  attempts: number
  error_message: string | null
  created_at: string
  processed_at: string | null
  scheduled_for: string
  user?: {
    first_name: string
    last_name: string
    email: string
  }
}

interface PushStats {
  total: number
  pending: number
  sent: number
  failed: number
  expired: number
}

// State
const isLoading = ref(false)
const queueItems = ref<QueueItem[]>([])
const stats = ref<PushStats>({ total: 0, pending: 0, sent: 0, failed: 0, expired: 0 })
const activeTab = ref<'queue' | 'broadcast' | 'analytics'>('queue')
const statusFilter = ref<string>('all')
const analyticsDateRange = ref<'7' | '14' | '30'>('30')

// Broadcast form
const broadcastForm = ref({
  title: '',
  body: '',
  url: '',
  targetType: 'all' as 'all' | 'customers' | 'providers',
  scheduledFor: '',
  useTemplate: false,
  templateId: ''
})
const isSending = ref(false)
const sendResult = ref<{ success: boolean; message: string } | null>(null)
const selectedTemplate = ref<NotificationTemplate | null>(null)
const templateVariables = ref<Record<string, string>>({})

// Subscription
let subscription: any = null

// Fetch queue items
const fetchQueue = async () => {
  isLoading.value = true
  try {
    let query = supabase
      .from('push_notification_queue')
      .select(`
        *,
        user:users(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (statusFilter.value !== 'all') {
      query = query.eq('status', statusFilter.value)
    }

    const { data, error } = await query

    if (error) throw error
    queueItems.value = data || []
  } catch (err) {
    console.error('Failed to fetch queue:', err)
  } finally {
    isLoading.value = false
  }
}

// Fetch stats
const fetchStats = async () => {
  try {
    const { data, error } = await supabase
      .from('push_notification_queue')
      .select('status')

    if (error) throw error

    const counts = (data || []).reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      acc.total++
      return acc
    }, { total: 0, pending: 0, sent: 0, failed: 0, expired: 0 })

    stats.value = counts
  } catch (err) {
    console.error('Failed to fetch stats:', err)
  }
}

// Process queue (trigger Edge Function)
const processQueue = async () => {
  isLoading.value = true
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: { action: 'process_queue' }
    })

    if (error) throw error

    alert(`ประมวลผลสำเร็จ: ส่งแล้ว ${data.processed}, ล้มเหลว ${data.failed}`)
    await fetchQueue()
    await fetchStats()
  } catch (err: any) {
    alert('เกิดข้อผิดพลาด: ' + err.message)
  } finally {
    isLoading.value = false
  }
}

// Select template
const selectTemplate = (template: NotificationTemplate) => {
  selectedTemplate.value = template
  broadcastForm.value.templateId = template.id
  broadcastForm.value.title = template.title
  broadcastForm.value.body = template.body
  broadcastForm.value.url = template.url || ''
  
  // Reset variables
  templateVariables.value = {}
  for (const v of template.variables) {
    templateVariables.value[v] = ''
  }
}

// Apply template variables
const applyTemplateVariables = () => {
  if (!selectedTemplate.value) return
  
  const preview = previewTemplate(selectedTemplate.value, templateVariables.value)
  broadcastForm.value.title = preview.title
  broadcastForm.value.body = preview.body
}

// Send broadcast notification
const sendBroadcast = async () => {
  if (!broadcastForm.value.title || !broadcastForm.value.body) {
    alert('กรุณากรอกหัวข้อและเนื้อหา')
    return
  }

  isSending.value = true
  sendResult.value = null

  try {
    // Get target users based on type
    let userQuery = supabase.from('users').select('id')
    
    if (broadcastForm.value.targetType === 'providers') {
      const { data: providers } = await supabase
        .from('service_providers')
        .select('user_id')
        .eq('status', 'approved')
      
      const providerUserIds = providers?.map(p => p.user_id) || []
      userQuery = userQuery.in('id', providerUserIds)
    }

    const { data: users, error: userError } = await userQuery
    if (userError) throw userError

    // Queue notifications for all users
    const notifications = (users || []).map(user => ({
      user_id: user.id,
      title: broadcastForm.value.title,
      body: broadcastForm.value.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      url: broadcastForm.value.url || '/',
      data: { broadcast: true },
      status: 'pending',
      scheduled_for: broadcastForm.value.scheduledFor || new Date().toISOString()
    }))

    const { error: insertError } = await supabase
      .from('push_notification_queue')
      .insert(notifications)

    if (insertError) throw insertError

    sendResult.value = {
      success: true,
      message: `เพิ่มการแจ้งเตือนสำหรับ ${notifications.length} คนในคิวแล้ว`
    }

    // Reset form
    broadcastForm.value = {
      title: '',
      body: '',
      url: '',
      targetType: 'all',
      scheduledFor: ''
    }

    await fetchStats()
  } catch (err: any) {
    sendResult.value = {
      success: false,
      message: 'เกิดข้อผิดพลาด: ' + err.message
    }
  } finally {
    isSending.value = false
  }
}

// Retry failed notification
const retryNotification = async (id: string) => {
  try {
    const { error } = await supabase
      .from('push_notification_queue')
      .update({ status: 'pending', attempts: 0, error_message: null })
      .eq('id', id)

    if (error) throw error
    await fetchQueue()
  } catch (err: any) {
    alert('เกิดข้อผิดพลาด: ' + err.message)
  }
}

// Delete notification
const deleteNotification = async (id: string) => {
  if (!confirm('ต้องการลบรายการนี้?')) return

  try {
    const { error } = await supabase
      .from('push_notification_queue')
      .delete()
      .eq('id', id)

    if (error) throw error
    await fetchQueue()
    await fetchStats()
  } catch (err: any) {
    alert('เกิดข้อผิดพลาด: ' + err.message)
  }
}

// Format date
const formatDate = (date: string) => {
  return new Date(date).toLocaleString('th-TH')
}

// Status badge color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'sent': return 'bg-green-100 text-green-800'
    case 'failed': return 'bg-red-100 text-red-800'
    case 'expired': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// Status text
const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'รอส่ง'
    case 'sent': return 'ส่งแล้ว'
    case 'failed': return 'ล้มเหลว'
    case 'expired': return 'หมดอายุ'
    default: return status
  }
}

// Filtered items
const filteredItems = computed(() => queueItems.value)

// Analytics chart data
const chartData = computed(() => {
  const data = [...analytics.value].reverse()
  return {
    labels: data.map(d => new Date(d.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })),
    sent: data.map(d => d.total_sent),
    delivered: data.map(d => d.total_delivered),
    clicked: data.map(d => d.total_clicked),
    failed: data.map(d => d.total_failed)
  }
})

// Max value for chart scaling
const chartMax = computed(() => {
  const allValues = [...chartData.value.sent, ...chartData.value.delivered]
  return Math.max(...allValues, 10)
})

// Watch analytics date range
watch(analyticsDateRange, () => {
  const days = parseInt(analyticsDateRange.value)
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  fetchAnalytics(startDate)
})

// Watch template selection
watch(() => broadcastForm.value.useTemplate, (useTemplate) => {
  if (useTemplate && templates.value.length === 0) {
    fetchTemplates()
  }
  if (!useTemplate) {
    selectedTemplate.value = null
    broadcastForm.value.templateId = ''
    templateVariables.value = {}
  }
})

// Process scheduled notifications
const processScheduledNotifications = async () => {
  isLoading.value = true
  try {
    const { data, error } = await supabase.functions.invoke('process-scheduled-notifications')
    
    if (error) throw error
    
    alert(`ประมวลผลสำเร็จ: ${data.processed} รายการ, เพิ่มในคิว ${data.queued} รายการ`)
  } catch (err: any) {
    alert('เกิดข้อผิดพลาด: ' + err.message)
  } finally {
    isLoading.value = false
  }
}

// Export analytics to CSV
const exportAnalyticsCSV = () => {
  if (analytics.value.length === 0) {
    alert('ไม่มีข้อมูลสำหรับ Export')
    return
  }

  // CSV headers
  const headers = ['วันที่', 'ส่ง', 'ส่งถึง', 'คลิก', 'ล้มเหลว', 'Delivery Rate (%)', 'Click Rate (%)']
  
  // CSV rows
  const rows = analytics.value.map(row => [
    row.date,
    row.total_sent,
    row.total_delivered,
    row.total_clicked,
    row.total_failed,
    row.delivery_rate,
    row.click_rate
  ])

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  // Add BOM for Thai characters
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  
  // Create download link
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `push-analytics-${analyticsDateRange.value}days-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Export analytics to Excel (XLSX format via CSV)
const exportAnalyticsExcel = () => {
  if (analytics.value.length === 0) {
    alert('ไม่มีข้อมูลสำหรับ Export')
    return
  }

  // For Excel, we use tab-separated values which Excel can open
  const headers = ['วันที่', 'ส่ง', 'ส่งถึง', 'คลิก', 'ล้มเหลว', 'Delivery Rate (%)', 'Click Rate (%)']
  
  const rows = analytics.value.map(row => [
    row.date,
    row.total_sent,
    row.total_delivered,
    row.total_clicked,
    row.total_failed,
    row.delivery_rate,
    row.click_rate
  ])

  // Build TSV content (Excel-friendly)
  const tsvContent = [
    headers.join('\t'),
    ...rows.map(row => row.join('\t'))
  ].join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `push-analytics-${analyticsDateRange.value}days-${new Date().toISOString().split('T')[0]}.xls`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Setup realtime subscription
const setupSubscription = () => {
  subscription = supabase
    .channel('push_queue_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'push_notification_queue'
    }, () => {
      fetchQueue()
      fetchStats()
    })
    .subscribe()
}

onMounted(() => {
  fetchQueue()
  fetchStats()
  setupSubscription()
  fetchAnalytics()
  fetchTemplates()
})

onUnmounted(() => {
  if (subscription) {
    supabase.removeChannel(subscription)
  }
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Push Notifications</h1>
      <p class="text-gray-600">จัดการการแจ้งเตือนแบบ Push</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-2xl font-bold text-gray-900">{{ stats.total }}</div>
        <div class="text-sm text-gray-500">ทั้งหมด</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-2xl font-bold text-yellow-600">{{ stats.pending }}</div>
        <div class="text-sm text-gray-500">รอส่ง</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-2xl font-bold text-green-600">{{ stats.sent }}</div>
        <div class="text-sm text-gray-500">ส่งแล้ว</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-2xl font-bold text-red-600">{{ stats.failed }}</div>
        <div class="text-sm text-gray-500">ล้มเหลว</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-2xl font-bold text-gray-600">{{ stats.expired }}</div>
        <div class="text-sm text-gray-500">หมดอายุ</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6">
      <button
        @click="activeTab = 'queue'"
        :class="[
          'px-4 py-2 rounded-lg font-medium transition-colors',
          activeTab === 'queue' 
            ? 'bg-green-600 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        คิวการส่ง
      </button>
      <button
        @click="activeTab = 'broadcast'"
        :class="[
          'px-4 py-2 rounded-lg font-medium transition-colors',
          activeTab === 'broadcast' 
            ? 'bg-green-600 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        ส่ง Broadcast
      </button>
      <button
        @click="activeTab = 'analytics'"
        :class="[
          'px-4 py-2 rounded-lg font-medium transition-colors',
          activeTab === 'analytics' 
            ? 'bg-green-600 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        Analytics
      </button>
      <button
        @click="router.push('/admin/notification-templates')"
        class="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
      >
        จัดการ Templates
      </button>
    </div>

    <!-- Queue Tab -->
    <div v-if="activeTab === 'queue'" class="bg-white rounded-xl border border-gray-100">
      <!-- Actions -->
      <div class="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between">
        <div class="flex gap-2">
          <select
            v-model="statusFilter"
            @change="fetchQueue"
            class="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รอส่ง</option>
            <option value="sent">ส่งแล้ว</option>
            <option value="failed">ล้มเหลว</option>
            <option value="expired">หมดอายุ</option>
          </select>
        </div>
        <div class="flex gap-2">
          <button
            @click="fetchQueue"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            รีเฟรช
          </button>
          <button
            @click="processQueue"
            :disabled="isLoading || stats.pending === 0"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            ประมวลผลคิว ({{ stats.pending }})
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ผู้รับ</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">หัวข้อ</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ครั้งที่ส่ง</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สร้างเมื่อ</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="isLoading">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                กำลังโหลด...
              </td>
            </tr>
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                ไม่มีรายการ
              </td>
            </tr>
            <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">
                  {{ item.user?.first_name }} {{ item.user?.last_name }}
                </div>
                <div class="text-xs text-gray-500">{{ item.user?.email }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">{{ item.title }}</div>
                <div class="text-xs text-gray-500 truncate max-w-xs">{{ item.body }}</div>
              </td>
              <td class="px-4 py-3">
                <span :class="['px-2 py-1 text-xs font-medium rounded-full', getStatusColor(item.status)]">
                  {{ getStatusText(item.status) }}
                </span>
                <div v-if="item.error_message" class="text-xs text-red-500 mt-1 truncate max-w-xs">
                  {{ item.error_message }}
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">
                {{ item.attempts }}/3
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">
                {{ formatDate(item.created_at) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button
                    v-if="item.status === 'failed'"
                    @click="retryNotification(item.id)"
                    class="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ลองใหม่
                  </button>
                  <button
                    @click="deleteNotification(item.id)"
                    class="text-red-600 hover:text-red-800 text-sm"
                  >
                    ลบ
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Broadcast Tab -->
    <div v-if="activeTab === 'broadcast'" class="bg-white rounded-xl border border-gray-100 p-6">
      <h2 class="text-lg font-semibold mb-4">ส่ง Broadcast Notification</h2>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Left: Form -->
        <div class="space-y-4">
          <!-- Use Template Toggle -->
          <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <input
              v-model="broadcastForm.useTemplate"
              type="checkbox"
              id="use_template"
              class="w-4 h-4 text-green-600 rounded focus:ring-green-500"
            />
            <label for="use_template" class="text-sm text-gray-700">ใช้ Template</label>
          </div>

          <!-- Template Selector -->
          <div v-if="broadcastForm.useTemplate" class="space-y-3">
            <label class="block text-sm font-medium text-gray-700">เลือก Template</label>
            <div class="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              <button
                v-for="template in templates.filter(t => t.is_active)"
                :key="template.id"
                @click="selectTemplate(template)"
                :class="[
                  'p-3 text-left rounded-lg border transition-colors',
                  selectedTemplate?.id === template.id 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                ]"
              >
                <div class="font-medium text-sm">{{ template.name_th || template.name }}</div>
                <div class="text-xs text-gray-500 truncate">{{ template.title }}</div>
              </button>
            </div>

            <!-- Template Variables -->
            <div v-if="selectedTemplate && selectedTemplate.variables.length > 0" class="space-y-2">
              <p class="text-sm font-medium text-gray-700">กรอกค่าตัวแปร:</p>
              <div v-for="v in selectedTemplate.variables" :key="v" class="flex gap-2 items-center">
                <label class="text-sm text-gray-600 w-24">{{ v }}:</label>
                <input
                  v-model="templateVariables[v]"
                  type="text"
                  :placeholder="`ค่าของ ${v}`"
                  @input="applyTemplateVariables"
                  class="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">หัวข้อ *</label>
            <input
              v-model="broadcastForm.title"
              type="text"
              placeholder="เช่น โปรโมชั่นพิเศษ!"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">เนื้อหา *</label>
            <textarea
              v-model="broadcastForm.body"
              rows="3"
              placeholder="รายละเอียดการแจ้งเตือน..."
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL (เมื่อคลิก)</label>
            <input
              v-model="broadcastForm.url"
              type="text"
              placeholder="/promotions"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">กลุ่มเป้าหมาย</label>
            <select
              v-model="broadcastForm.targetType"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">ทุกคน</option>
              <option value="customers">ลูกค้าเท่านั้น</option>
              <option value="providers">ผู้ให้บริการเท่านั้น</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">กำหนดเวลาส่ง (ไม่บังคับ)</label>
            <input
              v-model="broadcastForm.scheduledFor"
              type="datetime-local"
              class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p class="text-xs text-gray-500 mt-1">ถ้าไม่ระบุจะส่งทันที</p>
          </div>

          <!-- Result message -->
          <div v-if="sendResult" :class="[
            'p-4 rounded-lg',
            sendResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          ]">
            {{ sendResult.message }}
          </div>

          <button
            @click="sendBroadcast"
            :disabled="isSending || !broadcastForm.title || !broadcastForm.body"
            class="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {{ isSending ? 'กำลังส่ง...' : 'ส่ง Broadcast' }}
          </button>
        </div>

        <!-- Right: Preview -->
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3">ตัวอย่าง Notification</h3>
          <div class="bg-gray-100 rounded-xl p-4">
            <div class="bg-white rounded-lg shadow-lg p-4 max-w-sm">
              <div class="flex items-start gap-3">
                <img src="/pwa-192x192.png" alt="icon" class="w-10 h-10 rounded-lg" />
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900 text-sm">{{ broadcastForm.title || 'หัวข้อ' }}</p>
                  <p class="text-gray-600 text-sm mt-1">{{ broadcastForm.body || 'เนื้อหา...' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div v-if="activeTab === 'analytics'" class="space-y-6">
      <!-- Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border border-gray-100 p-6">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ analyticsOverview.totalSent.toLocaleString() }}</p>
              <p class="text-sm text-gray-500">ส่งทั้งหมด ({{ analyticsDateRange }} วัน)</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-100 p-6">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ analyticsOverview.avgDeliveryRate }}%</p>
              <p class="text-sm text-gray-500">Delivery Rate เฉลี่ย</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-100 p-6">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{{ analyticsOverview.avgClickRate }}%</p>
              <p class="text-sm text-gray-500">Click Rate เฉลี่ย</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart Section -->
      <div class="bg-white rounded-xl border border-gray-100 p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900">Push Notification Trends</h3>
          <div class="flex items-center gap-2">
            <select
              v-model="analyticsDateRange"
              class="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="7">7 วัน</option>
              <option value="14">14 วัน</option>
              <option value="30">30 วัน</option>
            </select>
            <button
              @click="processScheduledNotifications"
              :disabled="isLoading"
              class="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
              title="ประมวลผล Scheduled Notifications"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              @click="exportAnalyticsCSV"
              class="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors"
              title="Export CSV"
            >
              CSV
            </button>
            <button
              @click="exportAnalyticsExcel"
              class="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition-colors"
              title="Export Excel"
            >
              Excel
            </button>
          </div>
        </div>

        <!-- Simple Bar Chart -->
        <div v-if="chartData.labels.length > 0" class="space-y-4">
          <!-- Legend -->
          <div class="flex flex-wrap gap-4 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-500 rounded"></div>
              <span>ส่ง</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-green-500 rounded"></div>
              <span>ส่งถึง</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-purple-500 rounded"></div>
              <span>คลิก</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-red-500 rounded"></div>
              <span>ล้มเหลว</span>
            </div>
          </div>

          <!-- Chart -->
          <div class="overflow-x-auto">
            <div class="flex items-end gap-1 h-48 min-w-max">
              <div
                v-for="(label, i) in chartData.labels"
                :key="label"
                class="flex flex-col items-center gap-1"
              >
                <div class="flex items-end gap-0.5 h-40">
                  <div
                    class="w-3 bg-blue-500 rounded-t"
                    :style="{ height: `${(chartData.sent[i] / chartMax) * 100}%` }"
                    :title="`ส่ง: ${chartData.sent[i]}`"
                  ></div>
                  <div
                    class="w-3 bg-green-500 rounded-t"
                    :style="{ height: `${(chartData.delivered[i] / chartMax) * 100}%` }"
                    :title="`ส่งถึง: ${chartData.delivered[i]}`"
                  ></div>
                  <div
                    class="w-3 bg-purple-500 rounded-t"
                    :style="{ height: `${(chartData.clicked[i] / chartMax) * 100}%` }"
                    :title="`คลิก: ${chartData.clicked[i]}`"
                  ></div>
                  <div
                    class="w-3 bg-red-500 rounded-t"
                    :style="{ height: `${(chartData.failed[i] / chartMax) * 100}%` }"
                    :title="`ล้มเหลว: ${chartData.failed[i]}`"
                  ></div>
                </div>
                <span class="text-xs text-gray-500 -rotate-45 origin-top-left whitespace-nowrap">{{ label }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-12 text-gray-500">
          ยังไม่มีข้อมูล Analytics
        </div>
      </div>

      <!-- Daily Stats Table -->
      <div class="bg-white rounded-xl border border-gray-100">
        <div class="p-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">รายละเอียดรายวัน</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ส่ง</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ส่งถึง</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">คลิก</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ล้มเหลว</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Delivery %</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Click %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-if="analytics.length === 0">
                <td colspan="7" class="px-4 py-8 text-center text-gray-500">ไม่มีข้อมูล</td>
              </tr>
              <tr v-for="row in analytics" :key="row.date" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">{{ formatDate(row.date) }}</td>
                <td class="px-4 py-3 text-sm text-right text-gray-900">{{ row.total_sent }}</td>
                <td class="px-4 py-3 text-sm text-right text-green-600">{{ row.total_delivered }}</td>
                <td class="px-4 py-3 text-sm text-right text-purple-600">{{ row.total_clicked }}</td>
                <td class="px-4 py-3 text-sm text-right text-red-600">{{ row.total_failed }}</td>
                <td class="px-4 py-3 text-sm text-right">
                  <span :class="row.delivery_rate >= 80 ? 'text-green-600' : row.delivery_rate >= 50 ? 'text-yellow-600' : 'text-red-600'">
                    {{ row.delivery_rate }}%
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-right">
                  <span :class="row.click_rate >= 10 ? 'text-green-600' : row.click_rate >= 5 ? 'text-yellow-600' : 'text-gray-600'">
                    {{ row.click_rate }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
