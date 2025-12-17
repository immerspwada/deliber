<script setup lang="ts">
/**
 * Feature: F348 - Provider Notification List
 * Notification list for providers
 */
interface Notification {
  id: string
  type: 'order' | 'payment' | 'system' | 'promo' | 'alert'
  title: string
  message: string
  time: string
  read: boolean
}

const props = withDefaults(defineProps<{
  notifications: Notification[]
  loading?: boolean
}>(), {
  loading: false
})

const emit = defineEmits<{
  (e: 'select', notification: Notification): void
  (e: 'markRead', id: string): void
  (e: 'markAllRead'): void
}>()

const typeIcons = {
  order: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  payment: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>`,
  system: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  promo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  alert: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
}

const typeColors = {
  order: '#276EF1',
  payment: '#22c55e',
  system: '#6b6b6b',
  promo: '#f59e0b',
  alert: '#e11900'
}

const formatTime = (time: string) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'เมื่อกี้'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`
  if (days < 7) return `${days} วันที่แล้ว`
  return date.toLocaleDateString('th-TH')
}

const unreadCount = () => props.notifications.filter(n => !n.read).length
</script>

<template>
  <div class="provider-notification-list">
    <div class="list-header">
      <h3 class="header-title">การแจ้งเตือน</h3>
      <button
        v-if="unreadCount() > 0"
        type="button"
        class="mark-all-btn"
        @click="emit('markAllRead')"
      >
        อ่านทั้งหมด
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div v-for="i in 4" :key="i" class="skeleton-item">
        <div class="skeleton-icon"></div>
        <div class="skeleton-content">
          <div class="skeleton-line w-70"></div>
          <div class="skeleton-line w-90"></div>
        </div>
      </div>
    </div>

    <div v-else-if="notifications.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <p>ไม่มีการแจ้งเตือน</p>
    </div>

    <div v-else class="notifications">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-item"
        :class="{ unread: !notification.read }"
        @click="emit('select', notification)"
      >
        <div
          class="notification-icon"
          :style="{ background: typeColors[notification.type] + '15', color: typeColors[notification.type] }"
          v-html="typeIcons[notification.type]"
        ></div>
        
        <div class="notification-content">
          <div class="notification-header">
            <span class="notification-title">{{ notification.title }}</span>
            <span class="notification-time">{{ formatTime(notification.time) }}</span>
          </div>
          <p class="notification-message">{{ notification.message }}</p>
        </div>
        
        <div v-if="!notification.read" class="unread-dot"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.provider-notification-list {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
}

.mark-all-btn {
  background: none;
  border: none;
  font-size: 13px;
  color: #276EF1;
  cursor: pointer;
}

.loading-state {
  padding: 16px;
}

.skeleton-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
}

.skeleton-icon {
  width: 40px;
  height: 40px;
  background: #f0f0f0;
  border-radius: 10px;
  animation: pulse 1.5s infinite;
}

.skeleton-content {
  flex: 1;
}

.skeleton-line {
  height: 12px;
  background: #f0f0f0;
  border-radius: 4px;
  margin-bottom: 8px;
  animation: pulse 1.5s infinite;
}

.skeleton-line.w-70 { width: 70%; }
.skeleton-line.w-90 { width: 90%; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.empty-state {
  padding: 48px 24px;
  text-align: center;
}

.empty-state svg {
  margin-bottom: 12px;
}

.empty-state p {
  color: #6b6b6b;
  margin: 0;
}

.notifications {
  padding: 8px 0;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.notification-item:hover {
  background: #f6f6f6;
}

.notification-item.unread {
  background: #f8fafc;
}

.notification-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #000;
}

.notification-time {
  font-size: 11px;
  color: #6b6b6b;
  flex-shrink: 0;
}

.notification-message {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
  line-height: 1.4;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #276EF1;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}
</style>
