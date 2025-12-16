<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotifications, type UserNotification } from '../composables/useNotifications'
import PullToRefresh from '../components/PullToRefresh.vue'

const {
  notifications,
  unreadCount,
  loading,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = useNotifications()

const refreshing = ref(false)

// Group notifications by date
const groupedNotifications = computed(() => {
  const groups: { label: string; date: string; items: UserNotification[] }[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  notifications.value.forEach((notification) => {
    const notifDate = new Date(notification.created_at || new Date())
    notifDate.setHours(0, 0, 0, 0)

    let label = ''
    let dateKey = ''

    if (notifDate.getTime() === today.getTime()) {
      label = 'วันนี้'
      dateKey = 'today'
    } else if (notifDate.getTime() === yesterday.getTime()) {
      label = 'เมื่อวาน'
      dateKey = 'yesterday'
    } else {
      label = notifDate.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      dateKey = notifDate.toISOString().split('T')[0] || 'unknown'
    }

    const existingGroup = groups.find((g) => g.date === dateKey)
    if (existingGroup) {
      existingGroup.items.push(notification)
    } else {
      groups.push({ label, date: dateKey, items: [notification] })
    }
  })

  return groups
})

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

const handleRefresh = async () => {
  refreshing.value = true
  await fetchNotifications()
  refreshing.value = false
}

onMounted(() => {
  fetchNotifications()
})
</script>

<template>
  <PullToRefresh :loading="refreshing" @refresh="handleRefresh">
    <div class="notifications-page">
      <div class="content-container">
        <div class="page-header">
          <h1 class="page-title">การแจ้งเตือน</h1>
          <button v-if="unreadCount > 0" class="mark-all-btn" @click="markAllAsRead">
            อ่านทั้งหมด
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading && notifications.length === 0" class="loading-state">
          <div v-for="i in 3" :key="i" class="skeleton-card">
            <div class="skeleton-icon"></div>
            <div class="skeleton-content">
              <div class="skeleton-title"></div>
              <div class="skeleton-text"></div>
            </div>
          </div>
        </div>

        <!-- Grouped Notifications -->
        <div v-else-if="groupedNotifications.length > 0" class="notifications-groups">
          <div v-for="group in groupedNotifications" :key="group.date" class="notification-group">
            <div class="group-header">
              <span class="group-label">{{ group.label }}</span>
              <span class="group-count">{{ group.items.length }} รายการ</span>
            </div>

            <div class="notifications-list">
              <div
                v-for="notification in group.items"
                :key="notification.id"
                :class="['notification-card', { unread: !notification.is_read }]"
                @click="markAsRead(notification.id)"
              >
                <div class="notification-icon" :class="notification.type">
                  <!-- Promo -->
                  <svg
                    v-if="notification.type === 'promo'"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    />
                  </svg>
                  <!-- Ride -->
                  <svg
                    v-else-if="notification.type === 'ride'"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"
                    />
                  </svg>
                  <!-- Delivery -->
                  <svg
                    v-else-if="notification.type === 'delivery'"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  <!-- Shopping -->
                  <svg
                    v-else-if="notification.type === 'shopping'"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <!-- Payment -->
                  <svg
                    v-else-if="notification.type === 'payment'"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <!-- Rating -->
                  <svg
                    v-else-if="notification.type === 'rating'"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                  <!-- Referral -->
                  <svg
                    v-else-if="notification.type === 'referral'"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <!-- SOS -->
                  <svg
                    v-else-if="notification.type === 'sos'"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <!-- Default/System -->
                  <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div class="notification-content">
                  <div class="notification-header">
                    <h3 class="notification-title">{{ notification.title }}</h3>
                    <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
                  </div>
                  <p class="notification-message">{{ notification.message }}</p>
                </div>
                <button class="delete-btn" @click.stop="deleteNotification(notification.id)">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div v-if="!notification.is_read" class="unread-dot"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p>ไม่มีการแจ้งเตือน</p>
          <span class="empty-hint">ดึงลงเพื่อรีเฟรช</span>
        </div>
      </div>
    </div>
  </PullToRefresh>
</template>

<style scoped>
.notifications-page {
  min-height: 100vh;
  background-color: #f6f6f6;
  padding-bottom: 100px;
}

.content-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0 16px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
}

.mark-all-btn {
  font-size: 14px;
  color: #6b6b6b;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}

.mark-all-btn:hover {
  color: #000;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}

.skeleton-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 10px;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-title {
  height: 16px;
  width: 60%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-text {
  height: 14px;
  width: 90%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Notification Groups */
.notifications-groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.notification-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.group-label {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.group-count {
  font-size: 12px;
  color: #6b6b6b;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-card {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: #fff;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification-card:active {
  transform: scale(0.98);
}

.notification-card.unread {
  background-color: #fafafa;
  border-left: 3px solid #000;
}

.notification-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f6f6f6;
  border-radius: 10px;
  flex-shrink: 0;
  color: #000;
}

.notification-icon svg {
  width: 22px;
  height: 22px;
}

.notification-icon.sos {
  background-color: #fee2e2;
  color: #e11900;
}

.notification-icon.rating {
  background-color: #fef3c7;
  color: #d97706;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.notification-title {
  font-size: 15px;
  font-weight: 600;
  color: #000;
}

.notification-time {
  font-size: 12px;
  color: #6b6b6b;
  white-space: nowrap;
}

.notification-message {
  font-size: 13px;
  color: #6b6b6b;
  line-height: 1.4;
}

.delete-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b6b6b;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.notification-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn svg {
  width: 18px;
  height: 18px;
}

.unread-dot {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 8px;
  height: 8px;
  background-color: #276ef1;
  border-radius: 50%;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64px 24px;
  text-align: center;
  color: #6b6b6b;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 13px;
  color: #999;
}
</style>
