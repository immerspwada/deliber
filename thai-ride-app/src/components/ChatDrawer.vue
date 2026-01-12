<script setup lang="ts">
/**
 * Chat Drawer Component
 * แชทระหว่างลูกค้าและ Provider
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useChat } from '../composables/useChat'

interface Props {
  rideId: string
  otherUserName: string
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const {
  messages,
  loading,
  sending,
  error,
  currentUserId,
  loadMessages,
  sendMessage,
  markAsRead
} = useChat(props.rideId)

// State
const messageInput = ref('')
const messagesContainer = ref<HTMLDivElement | null>(null)

// Computed
const sortedMessages = computed(() => {
  return [...messages.value].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
})

// Methods
async function handleSend(): Promise<void> {
  const text = messageInput.value.trim()
  if (!text || sending.value) return

  messageInput.value = ''
  await sendMessage(text)
  scrollToBottom()
}

function scrollToBottom(): void {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function isMyMessage(senderId: string): boolean {
  return senderId === currentUserId.value
}

// Quick messages
const quickMessages = [
  'รอสักครู่นะครับ',
  'ถึงแล้วครับ',
  'กำลังไปครับ',
  'ขอบคุณครับ'
]

function sendQuickMessage(text: string): void {
  sendMessage(text)
  scrollToBottom()
}

// Watch for new messages
watch(messages, () => {
  scrollToBottom()
  markAsRead()
}, { deep: true })

// Watch for drawer open
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    loadMessages()
  }
})

// Load on mount if open
onMounted(() => {
  if (props.isOpen) {
    loadMessages()
  }
})
</script>

<template>
  <Transition name="drawer">
    <div v-if="isOpen" class="drawer-overlay" @click.self="emit('close')">
      <div class="drawer-content">
        <!-- Header -->
        <div class="drawer-header">
          <button class="back-btn" @click="emit('close')" type="button" aria-label="ปิด">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div class="header-info">
            <h3>{{ otherUserName }}</h3>
            <span class="online-status">ออนไลน์</span>
          </div>
          <div class="header-spacer"></div>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="messages-container">
          <!-- Loading -->
          <div v-if="loading" class="loading-state">
            <div class="loader"></div>
          </div>

          <!-- Empty State -->
          <div v-else-if="sortedMessages.length === 0" class="empty-state">
            <div class="empty-icon">💬</div>
            <p>เริ่มการสนทนา</p>
          </div>

          <!-- Messages List -->
          <template v-else>
            <div
              v-for="msg in sortedMessages"
              :key="msg.id"
              class="message"
              :class="{ mine: isMyMessage(msg.sender_id) }"
            >
              <div class="message-bubble">
                <p class="message-text">{{ msg.message }}</p>
                <span class="message-time">{{ formatTime(msg.created_at) }}</span>
              </div>
            </div>
          </template>
        </div>

        <!-- Quick Messages -->
        <div class="quick-messages">
          <button
            v-for="qm in quickMessages"
            :key="qm"
            class="quick-msg-btn"
            @click="sendQuickMessage(qm)"
            type="button"
          >
            {{ qm }}
          </button>
        </div>

        <!-- Error -->
        <div v-if="error" class="error-bar" role="alert">
          {{ error }}
        </div>

        <!-- Input -->
        <div class="input-container">
          <input
            v-model="messageInput"
            type="text"
            placeholder="พิมพ์ข้อความ..."
            @keyup.enter="handleSend"
            :disabled="sending"
            maxlength="1000"
          />
          <button
            class="send-btn"
            @click="handleSend"
            :disabled="!messageInput.trim() || sending"
            type="button"
            aria-label="ส่งข้อความ"
          >
            <svg v-if="!sending" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
            <div v-else class="btn-loader"></div>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Drawer Animation */
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-content,
.drawer-leave-to .drawer-content {
  transform: translateX(100%);
}

/* Overlay */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

/* Content */
.drawer-content {
  width: 100%;
  max-width: 400px;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
}

/* Header */
.drawer-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  min-height: 60px;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
}

.back-btn:active {
  background: #f3f4f6;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #374151;
}

.header-info {
  flex: 1;
  text-align: center;
}

.header-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0;
}

.online-status {
  font-size: 12px;
  color: #10b981;
}

.header-spacer {
  width: 40px;
}

/* Messages Container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.loader {
  width: 32px;
  height: 32px;
  border: 2px solid #f3f4f6;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

/* Message */
.message {
  display: flex;
  justify-content: flex-start;
}

.message.mine {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 75%;
  padding: 10px 14px;
  background: #f3f4f6;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
}

.message.mine .message-bubble {
  background: #000;
  color: #fff;
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 4px;
}

.message-text {
  font-size: 14px;
  line-height: 1.4;
  margin: 0 0 4px 0;
  word-break: break-word;
}

.message-time {
  font-size: 10px;
  color: #9ca3af;
  display: block;
  text-align: right;
}

.message.mine .message-time {
  color: rgba(255,255,255,0.6);
}

/* Quick Messages */
.quick-messages {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  overflow-x: auto;
  border-top: 1px solid #f0f0f0;
}

.quick-msg-btn {
  padding: 6px 12px;
  background: #f3f4f6;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  color: #374151;
  white-space: nowrap;
  cursor: pointer;
}

.quick-msg-btn:active {
  background: #e5e7eb;
}

/* Error */
.error-bar {
  padding: 8px 16px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  text-align: center;
}

/* Input */
.input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.input-container input {
  flex: 1;
  padding: 12px 16px;
  background: #f3f4f6;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
}

.input-container input:focus {
  background: #e5e7eb;
}

.send-btn {
  width: 44px;
  height: 44px;
  background: #000;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn svg {
  width: 20px;
  height: 20px;
}

.btn-loader {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
</style>
