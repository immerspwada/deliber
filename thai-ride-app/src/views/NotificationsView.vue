<script setup lang="ts">
import { onMounted } from 'vue'
import { useNotifications } from '../composables/useNotifications'

const { 
  notifications, 
  unreadCount, 
  fetchNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} = useNotifications()

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  if (days === 1) return 'เมื่อวาน'
  return `${days} วันที่แล้ว`
}

onMounted(() => {
  fetchNotifications()
})
</script>

<template>
  <div class="notifications-page">
    <div class="content-container">
      <div class="page-header">
        <h1 class="page-title">การแจ้งเตือน</h1>
        <button v-if="unreadCount > 0" @click="markAllAsRead" class="mark-all-btn">
          อ่านทั้งหมด
        </button>
      </div>

      <div class="notifications-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="['notification-card', { unread: !notification.is_read }]"
          @click="markAsRead(notification.id)"
        >
          <div class="notification-icon" :class="notification.type">
            <svg v-if="notification.type === 'promo'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
            </svg>
            <svg v-else-if="notification.type === 'ride'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
            </svg>
            <svg v-else-if="notification.type === 'payment'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="notification-content">
            <div class="notification-header">
              <h3 class="notification-title">{{ notification.title }}</h3>
              <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
            </div>
            <p class="notification-message">{{ notification.message }}</p>
          </div>
          <button @click.stop="deleteNotification(notification.id)" class="delete-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          <div v-if="!notification.is_read" class="unread-dot"></div>
        </div>

        <div v-if="notifications.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <p>ไม่มีการแจ้งเตือน</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-page {
  min-height: 100vh;
  background-color: var(--color-background);
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
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
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
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.notification-card.unread {
  background-color: rgba(0, 0, 0, 0.02);
}

.notification-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-secondary);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.notification-icon svg {
  width: 22px;
  height: 22px;
}

.notification-icon.promo {
  background-color: #F6F6F6;
  color: #000;
}

.notification-icon.ride {
  background-color: #F6F6F6;
  color: #000;
}

.notification-icon.payment {
  background-color: #F6F6F6;
  color: #000;
}

.notification-icon.system {
  background-color: #F6F6F6;
  color: #000;
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
}

.notification-time {
  font-size: 12px;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.notification-message {
  font-size: 13px;
  color: var(--color-text-secondary);
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
  color: var(--color-text-muted);
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
  background-color: #276EF1;
  border-radius: 50%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-muted);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}
</style>
