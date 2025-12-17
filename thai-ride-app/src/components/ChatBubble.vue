<script setup lang="ts">
/**
 * Feature: F122 - Chat Bubble
 * Chat message bubble component
 */
interface Props {
  message: string
  time: string
  isOwn?: boolean
  status?: 'sending' | 'sent' | 'delivered' | 'read'
  avatar?: string
  senderName?: string
}

const props = withDefaults(defineProps<Props>(), {
  isOwn: false,
  status: 'sent',
  avatar: '',
  senderName: ''
})
</script>

<template>
  <div class="chat-bubble-wrapper" :class="{ own: isOwn }">
    <div v-if="!isOwn && avatar" class="chat-avatar">
      <img v-if="avatar" :src="avatar" :alt="senderName" />
      <span v-else class="avatar-placeholder">{{ senderName?.charAt(0) || '?' }}</span>
    </div>
    
    <div class="chat-bubble" :class="{ own: isOwn }">
      <p v-if="!isOwn && senderName" class="sender-name">{{ senderName }}</p>
      <p class="chat-message">{{ message }}</p>
      
      <div class="chat-meta">
        <span class="chat-time">{{ time }}</span>
        
        <span v-if="isOwn" class="chat-status">
          <!-- Sending -->
          <svg v-if="status === 'sending'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <!-- Sent -->
          <svg v-else-if="status === 'sent'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <!-- Delivered -->
          <svg v-else-if="status === 'delivered'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 6 9 17 4 12"/><polyline points="22 6 13 17"/>
          </svg>
          <!-- Read -->
          <svg v-else-if="status === 'read'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#276ef1" stroke-width="2">
            <polyline points="18 6 9 17 4 12"/><polyline points="22 6 13 17"/>
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-bubble-wrapper {
  display: flex;
  gap: 8px;
  max-width: 80%;
}

.chat-bubble-wrapper.own {
  margin-left: auto;
  flex-direction: row-reverse;
}

.chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 14px;
  font-weight: 600;
  color: #6b6b6b;
}

.chat-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  background: #f6f6f6;
}

.chat-bubble.own {
  background: #000;
  color: #fff;
}

.sender-name {
  font-size: 12px;
  font-weight: 600;
  color: #6b6b6b;
  margin: 0 0 4px;
}

.chat-message {
  font-size: 15px;
  line-height: 1.4;
  margin: 0;
  word-break: break-word;
}

.chat-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 4px;
}

.chat-time {
  font-size: 11px;
  opacity: 0.6;
}

.chat-status {
  display: flex;
  align-items: center;
}

.chat-status svg {
  opacity: 0.6;
}
</style>
