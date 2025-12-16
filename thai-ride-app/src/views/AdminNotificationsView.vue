<script setup lang="ts">
/**
 * Feature: F07 - Notifications (Admin)
 * Tables: user_notifications, notification_templates, scheduled_notifications, push_subscriptions, push_notification_queue
 * Migration: 007_complete_system.sql, 009_rating_notifications.sql, 010_notification_templates.sql, 011_scheduled_notifications.sql, 015_push_notifications.sql
 */
import { ref, onMounted, computed, watch } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'

const {
  loading,
  fetchAllNotifications,
  fetchNotificationStats,
  sendBulkNotification,
  deleteNotification,
  fetchUsers,
  fetchNotificationTemplates,
  createNotificationTemplate,
  deleteNotificationTemplate,
  useNotificationTemplate,
  TEMPLATE_VARIABLES,
  replaceTemplateVariables,
  extractTemplateVariables,
  USER_SEGMENTS,
  fetchScheduledNotifications,
  createScheduledNotification,
  cancelScheduledNotification,
  getSegmentUserCount,
  // Push Notifications
  fetchPushSubscriptions,
  fetchPushQueue,
  fetchPushStats,
  sendBroadcastPush,
  processPushQueue
} = useAdmin()

const notifications = ref<any[]>([])
const stats = ref<any>(null)
const filterType = ref<string | null>(null)
const showBroadcastModal = ref(false)
const activeTab = ref<'notifications' | 'templates' | 'scheduled' | 'push'>('notifications')

// Push Notifications
const pushStats = ref<any>(null)
const pushSubscriptions = ref<any[]>([])
const pushQueue = ref<any[]>([])
const showPushBroadcastModal = ref(false)
const pushBroadcastForm = ref({ title: '', body: '', url: '' })
const sendingPush = ref(false)
const processingQueue = ref(false)

// Templates
const templates = ref<any[]>([])
const showTemplateModal = ref(false)
const templateForm = ref({ name: '', type: 'system', title: '', message: '', actionUrl: '' })

// Scheduled notifications
const scheduledNotifications = ref<any[]>([])

// Broadcast form with scheduling and segmentation
const broadcastForm = ref({
  type: 'system',
  title: '',
  message: '',
  actionUrl: '',
  // Scheduling
  isScheduled: false,
  scheduledDate: '',
  scheduledTime: '09:00',
  // Segmentation
  segment: 'all',
  segmentConfig: {} as Record<string, any>
})
const sendingBroadcast = ref(false)
const segmentUserCount = ref<number>(0)
const loadingSegmentCount = ref(false)

// Template variables
const templateVariables = ref<Record<string, string>>({})
const detectedVariables = computed(() => {
  const titleVars = extractTemplateVariables(broadcastForm.value.title)
  const messageVars = extractTemplateVariables(broadcastForm.value.message)
  return [...new Set([...titleVars, ...messageVars])]
})

// Preview with replaced variables
const previewTitle = computed(() => replaceTemplateVariables(broadcastForm.value.title, templateVariables.value))
const previewMessage = computed(() => replaceTemplateVariables(broadcastForm.value.message, templateVariables.value))

// Watch segment changes to update user count
watch(() => broadcastForm.value.segment, async (newSegment) => {
  loadingSegmentCount.value = true
  const segmentDef = USER_SEGMENTS.find(s => s.key === newSegment)
  broadcastForm.value.segmentConfig = segmentDef?.config || {}
  segmentUserCount.value = await getSegmentUserCount(newSegment, broadcastForm.value.segmentConfig)
  loadingSegmentCount.value = false
}, { immediate: false })

const notificationTypes = [
  { key: null, label: 'ทั้งหมด' },
  { key: 'system', label: 'ระบบ' },
  { key: 'promo', label: 'โปรโมชั่น' },
  { key: 'rating', label: 'ให้คะแนน' },
  { key: 'ride', label: 'เรียกรถ' },
  { key: 'delivery', label: 'ส่งของ' },
  { key: 'shopping', label: 'ซื้อของ' },
  { key: 'payment', label: 'ชำระเงิน' },
  { key: 'referral', label: 'แนะนำเพื่อน' }
]

const filteredNotifications = computed(() => {
  if (!filterType.value) return notifications.value
  return notifications.value.filter(n => n.type === filterType.value)
})

const loadData = async () => {
  const [notifData, statsData, templatesData, scheduledData, segmentCount, pushStatsData, pushSubsData, pushQueueData] = await Promise.all([
    fetchAllNotifications(1, 100),
    fetchNotificationStats(),
    fetchNotificationTemplates(),
    fetchScheduledNotifications(1, 50),
    getSegmentUserCount('all'),
    fetchPushStats(),
    fetchPushSubscriptions(1, 50),
    fetchPushQueue(1, 50)
  ])
  notifications.value = notifData.data
  stats.value = statsData
  templates.value = templatesData
  scheduledNotifications.value = scheduledData.data
  segmentUserCount.value = segmentCount
  pushStats.value = pushStatsData
  pushSubscriptions.value = pushSubsData.data
  pushQueue.value = pushQueueData.data
}

// Push Notifications handlers
const handleSendPushBroadcast = async () => {
  if (!pushBroadcastForm.value.title || !pushBroadcastForm.value.body) {
    alert('กรุณากรอกหัวข้อและข้อความ')
    return
  }
  sendingPush.value = true
  const result = await sendBroadcastPush({
    title: pushBroadcastForm.value.title,
    body: pushBroadcastForm.value.body,
    url: pushBroadcastForm.value.url || undefined
  })
  sendingPush.value = false
  if (result.total > 0) {
    alert(`ส่ง Push Notification ไปยัง ${result.sent}/${result.total} คนสำเร็จ`)
    showPushBroadcastModal.value = false
    pushBroadcastForm.value = { title: '', body: '', url: '' }
    await loadData()
  } else {
    alert('ไม่มีผู้ใช้ที่เปิดรับ Push Notification')
  }
}

const handleProcessQueue = async () => {
  processingQueue.value = true
  const result = await processPushQueue()
  processingQueue.value = false
  if (result) {
    alert(`ประมวลผล Queue สำเร็จ: ส่งแล้ว ${result.processed}, ล้มเหลว ${result.failed}`)
    await loadData()
  } else {
    alert('เกิดข้อผิดพลาด')
  }
}

const getPushStatusClass = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'sent': return 'bg-green-100 text-green-800'
    case 'failed': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100'
  }
}

const getPushStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'รอส่ง'
    case 'sent': return 'ส่งแล้ว'
    case 'failed': return 'ล้มเหลว'
    default: return status
  }
}

// Use template for broadcast
const useTemplate = (template: any) => {
  broadcastForm.value = {
    ...broadcastForm.value,
    type: template.type,
    title: template.title,
    message: template.message,
    actionUrl: template.action_url || ''
  }
  useNotificationTemplate(template.id)
  showBroadcastModal.value = true
}

// Create new template
const handleCreateTemplate = async () => {
  if (!templateForm.value.name || !templateForm.value.title || !templateForm.value.message) {
    alert('กรุณากรอกข้อมูลให้ครบ')
    return
  }
  
  const result = await createNotificationTemplate({
    name: templateForm.value.name,
    type: templateForm.value.type,
    title: templateForm.value.title,
    message: templateForm.value.message,
    actionUrl: templateForm.value.actionUrl || undefined
  })
  
  if (result) {
    templates.value.unshift(result)
    showTemplateModal.value = false
    templateForm.value = { name: '', type: 'system', title: '', message: '', actionUrl: '' }
  }
}

// Delete template
const handleDeleteTemplate = async (id: string) => {
  if (!confirm('ต้องการลบ template นี้?')) return
  const success = await deleteNotificationTemplate(id)
  if (success) {
    templates.value = templates.value.filter(t => t.id !== id)
  }
}

const openBroadcastModal = async () => {
  // Reset form
  broadcastForm.value = {
    type: 'system',
    title: '',
    message: '',
    actionUrl: '',
    isScheduled: false,
    scheduledDate: '',
    scheduledTime: '09:00',
    segment: 'all',
    segmentConfig: {}
  }
  templateVariables.value = {}
  // Load users count for default segment
  segmentUserCount.value = await getSegmentUserCount('all')
  showBroadcastModal.value = true
}

const handleBroadcast = async () => {
  if (!broadcastForm.value.title || !broadcastForm.value.message) {
    alert('กรุณากรอกหัวข้อและข้อความ')
    return
  }
  
  // Validate scheduled date/time
  if (broadcastForm.value.isScheduled) {
    if (!broadcastForm.value.scheduledDate || !broadcastForm.value.scheduledTime) {
      alert('กรุณาเลือกวันและเวลาที่ต้องการส่ง')
      return
    }
  }
  
  sendingBroadcast.value = true
  
  // Replace template variables before sending
  const finalTitle = replaceTemplateVariables(broadcastForm.value.title, templateVariables.value)
  const finalMessage = replaceTemplateVariables(broadcastForm.value.message, templateVariables.value)
  
  if (broadcastForm.value.isScheduled) {
    // Create scheduled notification
    const scheduledAt = `${broadcastForm.value.scheduledDate}T${broadcastForm.value.scheduledTime}:00+07:00`
    const result = await createScheduledNotification({
      title: finalTitle,
      message: finalMessage,
      type: broadcastForm.value.type,
      actionUrl: broadcastForm.value.actionUrl || undefined,
      scheduledAt,
      segment: broadcastForm.value.segment,
      segmentConfig: broadcastForm.value.segmentConfig,
      templateVariables: templateVariables.value
    })
    
    sendingBroadcast.value = false
    
    if (result) {
      alert(`ตั้งเวลาส่ง notification สำเร็จ จะส่งไปยัง ~${segmentUserCount.value} คน`)
      showBroadcastModal.value = false
      await loadData()
    } else {
      alert('เกิดข้อผิดพลาด')
    }
  } else {
    // Send immediately - need to get user IDs by segment
    const usersData = await fetchUsers(1, 10000)
    const userIds = usersData.data.map((u: any) => u.id)
    
    const success = await sendBulkNotification({
      userIds,
      type: broadcastForm.value.type,
      title: finalTitle,
      message: finalMessage,
      actionUrl: broadcastForm.value.actionUrl || undefined
    })
    
    sendingBroadcast.value = false
    
    if (success) {
      alert(`ส่ง notification ไปยัง ${userIds.length} คนสำเร็จ`)
      showBroadcastModal.value = false
      await loadData()
    } else {
      alert('เกิดข้อผิดพลาด')
    }
  }
}

// Cancel scheduled notification
const handleCancelScheduled = async (id: string) => {
  if (!confirm('ต้องการยกเลิก notification นี้?')) return
  const success = await cancelScheduledNotification(id)
  if (success) {
    scheduledNotifications.value = scheduledNotifications.value.map(n => 
      n.id === id ? { ...n, status: 'cancelled' } : n
    )
  }
}

// Get segment label
const getSegmentLabel = (key: string) => {
  return USER_SEGMENTS.find(s => s.key === key)?.label || key
}

// Format scheduled date
const formatScheduledDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get status badge class for scheduled
const getScheduledStatusClass = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800'
    case 'sent': return 'bg-green-100 text-green-800'
    case 'cancelled': return 'bg-gray-100 text-gray-500'
    case 'failed': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100'
  }
}

const getScheduledStatusLabel = (status: string) => {
  switch (status) {
    case 'scheduled': return 'รอส่ง'
    case 'sent': return 'ส่งแล้ว'
    case 'cancelled': return 'ยกเลิก'
    case 'failed': return 'ล้มเหลว'
    default: return status
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('ต้องการลบ notification นี้?')) return
  const success = await deleteNotification(id)
  if (success) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }
}

const getTypeLabel = (type: string) => {
  const found = notificationTypes.find(t => t.key === type)
  return found?.label || type
}

const getTypeBadgeClass = (type: string) => {
  switch (type) {
    case 'system': return 'bg-gray-800 text-white'
    case 'promo': return 'bg-green-100 text-green-800'
    case 'rating': return 'bg-yellow-100 text-yellow-800'
    case 'ride': return 'bg-black text-white'
    case 'delivery': return 'bg-gray-600 text-white'
    case 'shopping': return 'bg-gray-400 text-black'
    case 'payment': return 'bg-blue-100 text-blue-800'
    case 'referral': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-200'
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(loadData)
</script>

<template>
  <AdminLayout>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">จัดการ Notifications</h1>
        <p class="text-gray-500 text-sm">F07 - ดูและส่ง notifications ไปยังผู้ใช้</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="showTemplateModal = true"
          class="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          สร้าง Template
        </button>
        <button
          @click="openBroadcastModal"
          class="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
            </svg>
            Broadcast
          </span>
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        @click="activeTab = 'notifications'"
        :class="['px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap', activeTab === 'notifications' ? 'bg-black text-white' : 'bg-gray-100']"
      >
        In-App
      </button>
      <button
        @click="activeTab = 'push'"
        :class="['px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap', activeTab === 'push' ? 'bg-black text-white' : 'bg-gray-100']"
      >
        Push ({{ pushStats?.activeSubscriptions || 0 }})
      </button>
      <button
        @click="activeTab = 'scheduled'"
        :class="['px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap', activeTab === 'scheduled' ? 'bg-black text-white' : 'bg-gray-100']"
      >
        ตั้งเวลา ({{ scheduledNotifications.filter(n => n.status === 'scheduled').length }})
      </button>
      <button
        @click="activeTab = 'templates'"
        :class="['px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap', activeTab === 'templates' ? 'bg-black text-white' : 'bg-gray-100']"
      >
        Templates ({{ templates.length }})
      </button>
    </div>

    <!-- Push Tab -->
    <div v-if="activeTab === 'push'" class="space-y-6">
      <!-- Push Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl p-4 border border-gray-100">
          <div class="text-sm text-gray-500">Subscribers</div>
          <div class="text-2xl font-bold">{{ pushStats?.activeSubscriptions || 0 }}</div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-100">
          <div class="text-sm text-gray-500">รอส่ง</div>
          <div class="text-2xl font-bold text-yellow-500">{{ pushStats?.pendingQueue || 0 }}</div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-100">
          <div class="text-sm text-gray-500">ส่งแล้ว</div>
          <div class="text-2xl font-bold text-green-500">{{ pushStats?.sentToday || 0 }}</div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-100">
          <div class="text-sm text-gray-500">ล้มเหลว</div>
          <div class="text-2xl font-bold text-red-500">{{ pushStats?.failedToday || 0 }}</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          @click="showPushBroadcastModal = true"
          class="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          ส่ง Push Broadcast
        </button>
        <button
          @click="handleProcessQueue"
          :disabled="processingQueue || (pushStats?.pendingQueue || 0) === 0"
          class="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
        >
          <svg v-if="processingQueue" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Process Queue
        </button>
      </div>

      <!-- Subscriptions -->
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-medium">Push Subscribers</h3>
          <span class="text-sm text-gray-500">{{ pushSubscriptions.length }} devices</span>
        </div>
        <div class="divide-y divide-gray-100 max-h-64 overflow-y-auto">
          <div v-for="sub in pushSubscriptions" :key="sub.id" class="px-4 py-3 flex items-center justify-between">
            <div>
              <div class="font-medium text-sm">{{ sub.users?.name || 'Unknown' }}</div>
              <div class="text-xs text-gray-400">{{ sub.users?.email }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500">{{ sub.device_info || 'Unknown device' }}</div>
              <div class="text-xs text-gray-400">{{ formatDate(sub.created_at) }}</div>
            </div>
          </div>
          <div v-if="pushSubscriptions.length === 0" class="px-4 py-8 text-center text-gray-500">
            ยังไม่มีผู้ใช้ subscribe Push Notifications
          </div>
        </div>
      </div>

      <!-- Queue -->
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100">
          <h3 class="font-medium">Push Queue</h3>
        </div>
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">ผู้รับ</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">หัวข้อ</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">สถานะ</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-gray-500">วันที่</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="item in pushQueue.slice(0, 20)" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-2">
                <div class="text-sm font-medium">{{ item.users?.name || '-' }}</div>
              </td>
              <td class="px-4 py-2">
                <div class="text-sm">{{ item.title }}</div>
                <div class="text-xs text-gray-400 truncate max-w-xs">{{ item.body }}</div>
              </td>
              <td class="px-4 py-2">
                <span :class="['px-2 py-1 rounded text-xs font-medium', getPushStatusClass(item.status)]">
                  {{ getPushStatusLabel(item.status) }}
                </span>
              </td>
              <td class="px-4 py-2 text-xs text-gray-500">
                {{ formatDate(item.created_at) }}
              </td>
            </tr>
            <tr v-if="pushQueue.length === 0">
              <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                Queue ว่าง
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Scheduled Tab -->
    <div v-if="activeTab === 'scheduled'" class="space-y-4">
      <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">หัวข้อ</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">กลุ่มเป้าหมาย</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">กำหนดส่ง</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">สถานะ</th>
              <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">ส่งแล้ว</th>
              <th class="text-right px-4 py-3 text-sm font-medium text-gray-500">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="item in scheduledNotifications" :key="item.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="font-medium">{{ item.title }}</div>
                <div class="text-xs text-gray-400 truncate max-w-xs">{{ item.message }}</div>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                  {{ getSegmentLabel(item.segment) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm">
                {{ formatScheduledDate(item.scheduled_at) }}
              </td>
              <td class="px-4 py-3">
                <span :class="['px-2 py-1 rounded text-xs font-medium', getScheduledStatusClass(item.status)]">
                  {{ getScheduledStatusLabel(item.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm">
                {{ item.sent_count || '-' }}
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="item.status === 'scheduled'"
                  @click="handleCancelScheduled(item.id)"
                  class="text-red-500 hover:text-red-700 text-sm"
                >
                  ยกเลิก
                </button>
                <span v-else class="text-gray-400 text-sm">-</span>
              </td>
            </tr>
            <tr v-if="scheduledNotifications.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-gray-500">
                ยังไม่มี notification ที่ตั้งเวลาไว้
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Templates Tab -->
    <div v-if="activeTab === 'templates'" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="template in templates"
          :key="template.id"
          class="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between mb-2">
            <span :class="['px-2 py-1 rounded text-xs font-medium', getTypeBadgeClass(template.type)]">
              {{ getTypeLabel(template.type) }}
            </span>
            <span class="text-xs text-gray-400">ใช้ {{ template.usage_count }} ครั้ง</span>
          </div>
          <h4 class="font-bold mb-1">{{ template.name }}</h4>
          <p class="text-sm text-gray-600 mb-1">{{ template.title }}</p>
          <p class="text-xs text-gray-400 mb-3 line-clamp-2">{{ template.message }}</p>
          <div class="flex gap-2">
            <button
              @click="useTemplate(template)"
              class="flex-1 px-3 py-2 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800"
            >
              ใช้ Template
            </button>
            <button
              @click="handleDeleteTemplate(template.id)"
              class="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs"
            >
              ลบ
            </button>
          </div>
        </div>
      </div>
      <div v-if="templates.length === 0" class="text-center py-12 text-gray-500">
        ยังไม่มี template
      </div>
    </div>

    <!-- Notifications Tab -->
    <div v-if="activeTab === 'notifications'">
    <!-- Stats Cards -->
    <div v-if="stats" class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-sm text-gray-500">ทั้งหมด</div>
        <div class="text-2xl font-bold">{{ stats.total || 0 }}</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-sm text-gray-500">ยังไม่อ่าน</div>
        <div class="text-2xl font-bold text-red-500">{{ stats.unread || 0 }}</div>
      </div>
      <div class="bg-white rounded-xl p-4 border border-gray-100">
        <div class="text-sm text-gray-500">เตือนให้คะแนน</div>
        <div class="text-2xl font-bold text-yellow-500">{{ stats.ratingReminders || 0 }}</div>
      </div>
    </div>

    <!-- Filter -->
    <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
      <button
        v-for="type in notificationTypes"
        :key="type.key || 'all'"
        @click="filterType = type.key"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
          filterType === type.key ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >
        {{ type.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto"></div>
      <p class="text-gray-500 mt-2">กำลังโหลด...</p>
    </div>

    <!-- Notifications List -->
    <div v-else class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">ประเภท</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">ผู้รับ</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">หัวข้อ</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">ข้อความ</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">สถานะ</th>
            <th class="text-left px-4 py-3 text-sm font-medium text-gray-500">วันที่</th>
            <th class="text-right px-4 py-3 text-sm font-medium text-gray-500">จัดการ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="notif in filteredNotifications" :key="notif.id" class="hover:bg-gray-50">
            <td class="px-4 py-3">
              <span :class="['px-2 py-1 rounded text-xs font-medium', getTypeBadgeClass(notif.type)]">
                {{ getTypeLabel(notif.type) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="font-medium">{{ notif.user?.name || '-' }}</div>
              <div class="text-xs text-gray-400">{{ notif.user?.email || '' }}</div>
            </td>
            <td class="px-4 py-3 font-medium">
              {{ notif.title }}
            </td>
            <td class="px-4 py-3">
              <div class="max-w-xs truncate text-sm text-gray-600">
                {{ notif.message }}
              </div>
            </td>
            <td class="px-4 py-3">
              <span :class="[
                'px-2 py-1 rounded text-xs font-medium',
                notif.is_read ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'
              ]">
                {{ notif.is_read ? 'อ่านแล้ว' : 'ยังไม่อ่าน' }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-500">
              {{ formatDate(notif.created_at) }}
            </td>
            <td class="px-4 py-3 text-right">
              <button
                @click="handleDelete(notif.id)"
                class="text-red-500 hover:text-red-700 text-sm"
              >
                ลบ
              </button>
            </td>
          </tr>
          <tr v-if="filteredNotifications.length === 0">
            <td colspan="7" class="px-4 py-12 text-center text-gray-500">
              ไม่พบ notification
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    </div>

    <!-- Template Modal -->
    <div v-if="showTemplateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl w-full max-w-md mx-4 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">สร้าง Template ใหม่</h3>
          <button @click="showTemplateModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อ Template</label>
            <input v-model="templateForm.name" type="text" placeholder="เช่น โปรโมชั่นใหม่" class="w-full px-3 py-2 border border-gray-200 rounded-lg"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
            <select v-model="templateForm.type" class="w-full px-3 py-2 border border-gray-200 rounded-lg">
              <option value="system">ระบบ</option>
              <option value="promo">โปรโมชั่น</option>
              <option value="payment">ชำระเงิน</option>
              <option value="referral">แนะนำเพื่อน</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">หัวข้อ</label>
            <input v-model="templateForm.title" type="text" placeholder="หัวข้อ notification" class="w-full px-3 py-2 border border-gray-200 rounded-lg"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ข้อความ</label>
            <textarea v-model="templateForm.message" rows="3" placeholder="ข้อความ" class="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Action URL</label>
            <input v-model="templateForm.actionUrl" type="text" placeholder="/promotions" class="w-full px-3 py-2 border border-gray-200 rounded-lg"/>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button @click="showTemplateModal = false" class="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">ยกเลิก</button>
          <button @click="handleCreateTemplate" class="flex-1 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800">สร้าง Template</button>
        </div>
      </div>
    </div>

    <!-- Broadcast Modal -->
    <div v-if="showBroadcastModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl w-full max-w-md mx-4 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">Broadcast Notification</h3>
          <button @click="showBroadcastModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4 max-h-[70vh] overflow-y-auto">
          <!-- User Segmentation -->
          <div class="bg-gray-50 rounded-lg p-3">
            <label class="block text-sm font-medium text-gray-700 mb-2">กลุ่มเป้าหมาย</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="seg in USER_SEGMENTS"
                :key="seg.key"
                @click="broadcastForm.segment = seg.key"
                :class="[
                  'px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors',
                  broadcastForm.segment === seg.key 
                    ? 'bg-black text-white' 
                    : 'bg-white border border-gray-200 hover:border-gray-300'
                ]"
              >
                {{ seg.label }}
              </button>
            </div>
            <div class="mt-2 text-sm text-gray-600 flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
              <span v-if="loadingSegmentCount">กำลังนับ...</span>
              <span v-else>~{{ segmentUserCount.toLocaleString() }} คน</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
              <select v-model="broadcastForm.type" class="w-full px-3 py-2 border border-gray-200 rounded-lg">
                <option value="system">ระบบ</option>
                <option value="promo">โปรโมชั่น</option>
                <option value="payment">ชำระเงิน</option>
                <option value="referral">แนะนำเพื่อน</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Action URL</label>
              <input
                v-model="broadcastForm.actionUrl"
                type="text"
                placeholder="/promotions"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">หัวข้อ</label>
            <input
              v-model="broadcastForm.title"
              type="text"
              placeholder="หัวข้อ notification"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ข้อความ</label>
            <textarea
              v-model="broadcastForm.message"
              rows="3"
              placeholder="ข้อความที่ต้องการส่ง"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
            ></textarea>
          </div>

          <!-- Scheduling -->
          <div class="border-t border-gray-100 pt-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="broadcastForm.isScheduled"
                class="w-4 h-4 rounded border-gray-300"
              />
              <span class="text-sm font-medium text-gray-700">ตั้งเวลาส่ง</span>
            </label>
            
            <div v-if="broadcastForm.isScheduled" class="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">วันที่</label>
                <input
                  v-model="broadcastForm.scheduledDate"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">เวลา</label>
                <input
                  v-model="broadcastForm.scheduledTime"
                  type="time"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          <!-- Template Variables -->
          <div v-if="detectedVariables.length > 0" class="border-t border-gray-100 pt-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ตัวแปร Template ({{ detectedVariables.length }})
            </label>
            <div class="space-y-2">
              <div v-for="varName in detectedVariables" :key="varName" class="flex items-center gap-2">
                <span class="text-xs bg-gray-100 px-2 py-1 rounded font-mono">&#123;&#123;{{ varName }}&#125;&#125;</span>
                <input
                  v-model="templateVariables[varName]"
                  type="text"
                  :placeholder="TEMPLATE_VARIABLES.find(v => v.key === varName)?.example || varName"
                  class="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                />
              </div>
            </div>
          </div>

          <!-- Available Variables Hint -->
          <div class="text-xs text-gray-400">
            ตัวแปรที่ใช้ได้: 
            <span v-for="(v, i) in TEMPLATE_VARIABLES" :key="v.key">
              <code class="bg-gray-100 px-1 rounded">&#123;&#123;{{ v.key }}&#125;&#125;</code><span v-if="i < TEMPLATE_VARIABLES.length - 1">, </span>
            </span>
          </div>

          <!-- Preview -->
          <div v-if="detectedVariables.length > 0" class="bg-gray-50 rounded-lg p-3">
            <div class="text-xs text-gray-500 mb-1">ตัวอย่าง:</div>
            <div class="font-medium text-sm">{{ previewTitle }}</div>
            <div class="text-sm text-gray-600">{{ previewMessage }}</div>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button
            @click="showBroadcastModal = false"
            class="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            @click="handleBroadcast"
            :disabled="sendingBroadcast"
            class="flex-1 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:bg-gray-300"
          >
            <span v-if="sendingBroadcast">กำลังดำเนินการ...</span>
            <span v-else-if="broadcastForm.isScheduled">ตั้งเวลาส่ง</span>
            <span v-else>ส่งทันที ({{ segmentUserCount }} คน)</span>
          </button>
        </div>
      </div>
    </div>
    <!-- Push Broadcast Modal -->
    <div v-if="showPushBroadcastModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl w-full max-w-md mx-4 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold">ส่ง Push Notification</h3>
          <button @click="showPushBroadcastModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <div class="flex items-center gap-2 mb-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="font-medium">Push Notification</span>
            </div>
            จะส่งไปยังผู้ใช้ที่เปิดรับ Push ทั้งหมด ({{ pushStats?.activeSubscriptions || 0 }} คน)
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">หัวข้อ</label>
            <input
              v-model="pushBroadcastForm.title"
              type="text"
              placeholder="หัวข้อ notification"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ข้อความ</label>
            <textarea
              v-model="pushBroadcastForm.body"
              rows="3"
              placeholder="ข้อความที่ต้องการส่ง"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL (เมื่อกด notification)</label>
            <input
              v-model="pushBroadcastForm.url"
              type="text"
              placeholder="/promotions"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>

          <!-- Preview -->
          <div class="bg-gray-900 text-white rounded-lg p-3">
            <div class="text-xs text-gray-400 mb-2">Preview</div>
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm">{{ pushBroadcastForm.title || 'หัวข้อ' }}</div>
                <div class="text-xs text-gray-300 line-clamp-2">{{ pushBroadcastForm.body || 'ข้อความ' }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button
            @click="showPushBroadcastModal = false"
            class="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            @click="handleSendPushBroadcast"
            :disabled="sendingPush"
            class="flex-1 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:bg-gray-300"
          >
            <span v-if="sendingPush">กำลังส่ง...</span>
            <span v-else>ส่ง Push</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  </AdminLayout>
</template>
