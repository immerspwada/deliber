<script setup lang="ts">
/**
 * Feature: F174 - Welcome Header
 * Display welcome message with user greeting
 */

interface Props {
  userName?: string
  greeting?: string
  subtitle?: string
  showNotification?: boolean
  notificationCount?: number
}

withDefaults(defineProps<Props>(), {
  greeting: 'สวัสดี',
  showNotification: true,
  notificationCount: 0
})

const emit = defineEmits<{
  notification: []
  profile: []
}>()

const getTimeGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'สวัสดีตอนเช้า'
  if (hour < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}
</script>

<template>
  <div class="welcome-header">
    <div class="header-content">
      <p class="greeting">{{ greeting || getTimeGreeting() }}</p>
      <h2 class="user-name">{{ userName || 'ผู้ใช้' }}</h2>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    
    <div class="header-actions">
      <button 
        v-if="showNotification" 
        type="button" 
        class="action-btn notification"
        @click="emit('notification')"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span v-if="notificationCount > 0" class="notification-badge">
          {{ notificationCount > 99 ? '99+' : notificationCount }}
        </span>
      </button>
      <button type="button" class="action-btn profile" @click="emit('profile')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.welcome-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
}

.header-content {
  flex: 1;
}

.greeting {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0 0 4px;
}

.user-name {
  font-size: 24px;
  font-weight: 700;
  color: #000;
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: #6b6b6b;
  margin: 6px 0 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f6f6;
  border: none;
  border-radius: 50%;
  color: #000;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #e5e5e5;
}

.notification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e11900;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 9px;
  padding: 0 4px;
}
</style>