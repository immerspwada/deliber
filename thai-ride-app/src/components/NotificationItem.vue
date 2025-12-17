<script setup lang="ts">
/**
 * Feature: F121 - Notification Item
 * Single notification display item
 */
interface Props {
  title: string
  message: string
  time: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'promo'
  read?: boolean
  avatar?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  read: false,
  avatar: ''
})

const emit = defineEmits<{
  click: []
  dismiss: []
}>()
</script>

<template>
  <div class="notification-item" :class="{ unread: !read }" @click="emit('click')">
    <div class="notification-icon" :class="type">
      <!-- Info icon -->
      <svg v-if="type === 'info'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      <!-- Success icon -->
      <svg v-else-if="type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <!-- Warning icon -->
      <svg v-else-if="type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <!-- Error icon -->
      <svg v-else-if="type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <!-- Promo icon -->
      <svg v-else-if="type === 'promo'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
        <circle cx="7" cy="7" r="1"/>
      </svg>
    </div>
    
    <div class="notification-content">
      <p class="notification-title">{{ title }}</p>
      <p class="notification-message">{{ message }}</p>
      <span class="notification-time">{{ time }}</span>
    </div>
    
    <button type="button" class="dismiss-btn" @click.stop="emit('dismiss')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
    
    <div v-if="!read" class="unread-dot" />
  </div>
</template>

<style scoped>
.notification-item {
  position: relative;
  display: flex;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #f6f6f6;
}

.notification-item.unread {
  background: #f9f9f9;
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

.notification-icon.info {
  background: rgba(39, 110, 241, 0.1);
  color: #276ef1;
}

.notification-icon.success {
  background: rgba(0, 200, 83, 0.1);
  color: #00c853;
}

.notification-icon.warning {
  background: rgba(255, 170, 0, 0.1);
  color: #b37700;
}

.notification-icon.error {
  background: rgba(225, 25, 0, 0.1);
  color: #e11900;
}

.notification-icon.promo {
  background: rgba(0, 0, 0, 0.05);
  color: #000;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 15px;
  font-weight: 600;
  color: #000;
  margin: 0 0 4px;
}

.notification-message {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-time {
  font-size: 12px;
  color: #999;
}

.dismiss-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.2s;
}

.notification-item:hover .dismiss-btn {
  opacity: 1;
}

.dismiss-btn:hover {
  color: #6b6b6b;
  background: #e5e5e5;
}

.unread-dot {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 8px;
  height: 8px;
  background: #276ef1;
  border-radius: 50%;
}

.notification-item:hover .unread-dot {
  display: none;
}
</style>
