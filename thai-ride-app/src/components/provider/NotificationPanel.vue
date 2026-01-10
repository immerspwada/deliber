<script setup lang="ts">
import { ref, computed } from 'vue'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionLabel?: string
  actionUrl?: string
}

interface Props {
  notifications?: Notification[]
}

const props = withDefaults(defineProps<Props>(), {
  notifications: () => []
})

const emit = defineEmits<{
  markAsRead: [id: string]
  clearAll: []
  actionClick: [notification: Notification]
}>()

const isExpanded = ref(false)
const unreadCount = computed(() => props.notifications.filter(n => !n.read).length)

const getNotificationIcon = (type: string): string => {
  const icons = {
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z',
    error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
  }
  return icons[type as keyof typeof icons] || icons.info
}

const getNotificationColor = (type: string): string => {
  const colors = {
    info: 'text-blue-600 bg-blue-100',
    success: 'text-green-600 bg-green-100',
    warning: 'text-yellow-600 bg-yellow-100',
    error: 'text-red-600 bg-red-100'
  }
  return colors[type as keyof typeof colors] || colors.info
}

const formatTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  return `${days} วันที่แล้ว`
}

const handleMarkAsRead = (id: string): void => {
  emit('markAsRead', id)
}

const handleClearAll = (): void => {
  emit('clearAll')
}

const handleActionClick = (notification: Notification): void => {
  emit('actionClick', notification)
}
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-200">
    <!-- Header -->
    <div class="p-4 border-b border-gray-100">
      <button
        @click="isExpanded = !isExpanded"
        class="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded-lg p-2 transition-colors duration-200"
      >
        <div class="flex items-center">
          <div class="w-2 h-5 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></div>
          <h3 class="text-lg font-semibold text-gray-900">การแจ้งเตือน</h3>
          <span v-if="unreadCount > 0" class="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
            {{ unreadCount }}
          </span>
        </div>
        <svg 
          class="w-5 h-5 text-gray-400 transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div v-if="isExpanded" class="p-4">
      <!-- No notifications -->
      <div v-if="notifications.length === 0" class="text-center py-8">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM9 17H4l5 5v-5zM12 3v18" />
          </svg>
        </div>
        <p class="text-gray-500 text-sm">ไม่มีการแจ้งเตือนใหม่</p>
      </div>

      <!-- Notifications list -->
      <div v-else class="space-y-3 max-h-80 overflow-y-auto">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="flex items-start p-3 rounded-xl border transition-all duration-200 hover:shadow-sm"
          :class="notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'"
        >
          <!-- Icon -->
          <div class="flex-shrink-0 mr-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="getNotificationColor(notification.type)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="getNotificationIcon(notification.type)" />
              </svg>
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="text-sm font-semibold text-gray-900 mb-1">{{ notification.title }}</h4>
                <p class="text-sm text-gray-600 leading-relaxed">{{ notification.message }}</p>
                <p class="text-xs text-gray-500 mt-2">{{ formatTime(notification.timestamp) }}</p>
              </div>
              
              <!-- Mark as read button -->
              <button
                v-if="!notification.read"
                @click="handleMarkAsRead(notification.id)"
                class="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                :aria-label="`ทำเครื่องหมายว่าอ่านแล้ว: ${notification.title}`"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>

            <!-- Action button -->
            <button
              v-if="notification.actionLabel"
              @click="handleActionClick(notification)"
              class="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              {{ notification.actionLabel }}
              <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Clear all button -->
      <div v-if="notifications.length > 0" class="mt-4 pt-4 border-t border-gray-100">
        <button
          @click="handleClearAll"
          class="w-full py-2 px-4 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors duration-200"
        >
          ล้างการแจ้งเตือนทั้งหมด
        </button>
      </div>
    </div>
  </div>
</template>