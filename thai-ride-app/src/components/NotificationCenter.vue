<script setup lang="ts">
/**
 * Feature: F166 - Notification Center
 * Display notification list with actions
 */
import { computed } from 'vue'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  time: string
  read: boolean
  action?: { label: string; id: string }
}

interface Props {
  notifications: Notification[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  markRead: [id: string]
  markAllRead: []
  action: [notificationId: string, actionId: string]
  close: []
}>()

const unreadCount = computed(() => props.notifications.filter(n => !n.read).length)

// Icon paths for notification types - used in template
 
const typeIcons = {
  info: 'M12 16v-4m0-4h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z',
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
}
void typeIcons
</script>

<template>
  <div class="notification-center">
    <div class="center-header">
      <h3 class="center-title">
        การแจ้งเตือน
        <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
      </h3>
      <div class="header-actions">
        <button v-if="unreadCount > 0" type="button" class="mark-all-btn" @click="emit('markAllRead')">
          อ่านทั้งหมด
        </button>
        <button type="button" class="close-btn" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

    <div v-if="notifications.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
      <p>ไม่มีการแจ้งเตือน</p>
    </div>
    
    <div v-else class="notification-list">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="notification-item"
        :class="{ unread: !notification.read, [notification.type]: true }"
        @click="emit('markRead', notification.id)"
      >
        <div class="notification-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="typeIcons[notification.type]"/>
          </svg>
        </div>
        <div class="notification-content">
          <h4 class="notification-title">{{ notification.title }}</h4>
          <p class="notification-message">{{ notification.message }}</p>
          <div class="notification-footer">
            <span class="notification-time">{{ notification.time }}</span>
            <button 
              v-if="notification.action"
              type="button"
              class="notification-action"
              @click.stop="emit('action', notification.id, notification.action.id)"
            >
              {{ notification.action.label }}
            </button>
          </div>
        </div>
        <div v-if="!notification.read" class="unread-dot"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-center {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  max-height: 480px;
  display: flex;
  flex-direction: column;
}

.center-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e5e5e5;
}

.center-title {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.unread-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: #e11900;
  color: #fff;
  border-radius: 10px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mark-all-btn {
  font-size: 12px;
  color: #276ef1;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #6b6b6b;
  cursor: pointer;
  border-radius: 8px;
}

.close-btn:hover {
  background: #f6f6f6;
  color: #000;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
  color: #6b6b6b;
}

.empty-state p {
  margin: 12px 0 0;
  font-size: 14px;
}

.notification-list {
  flex: 1;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f6f6f6;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.notification-item:hover {
  background: #f6f6f6;
}

.notification-item.unread {
  background: #fafafa;
}

.notification-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border-radius: 50%;
  flex-shrink: 0;
}

.notification-item.info .notification-icon {
  color: #276ef1;
  background: #e3f2fd;
}

.notification-item.success .notification-icon {
  color: #2e7d32;
  background: #e8f5e9;
}

.notification-item.warning .notification-icon {
  color: #ef6c00;
  background: #fff3e0;
}

.notification-item.error .notification-icon {
  color: #e11900;
  background: #ffebee;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.notification-message {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
  line-height: 1.4;
}

.notification-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.notification-time {
  font-size: 11px;
  color: #999;
}

.notification-action {
  font-size: 12px;
  font-weight: 500;
  color: #276ef1;
  background: none;
  border: none;
  cursor: pointer;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #276ef1;
  border-radius: 50%;
  position: absolute;
  top: 18px;
  right: 16px;
}
</style>