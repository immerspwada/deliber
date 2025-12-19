<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useChat, type ChatMessage } from '../../composables/useChat'

const props = defineProps<{
  orderId: string
  orderType: string
  providerName?: string
  isOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'newMessage', msg: ChatMessage): void
}>()

const { messages, loading, fetchMessages, sendMessage, subscribeToMessages, markAsRead } = useChat()

const newMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
let subscription: any = null

// Scroll to bottom
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Send message handler
const handleSend = async () => {
  const text = newMessage.value.trim()
  if (!text) return
  
  newMessage.value = ''
  await sendMessage(props.orderId, text)
  scrollToBottom()
}

// Format time
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

// Quick messages
const quickMessages = [
  'รอสักครู่นะครับ',
  'อยู่ตรงไหนครับ?',
  'มาถึงแล้วครับ',
  'ขอบคุณครับ'
]

const sendQuickMessage = (msg: string) => {
  newMessage.value = msg
  handleSend()
}

// Watch for new messages
watch(messages, (newMsgs, oldMsgs) => {
  if (newMsgs.length > (oldMsgs?.length || 0)) {
    scrollToBottom()
    const lastMsg = newMsgs[newMsgs.length - 1]
    if (lastMsg.sender_type === 'driver') {
      emit('newMessage', lastMsg)
    }
  }
}, { deep: true })

onMounted(async () => {
  await fetchMessages(props.orderId)
  scrollToBottom()
  
  subscription = subscribeToMessages(props.orderId, (msg) => {
    emit('newMessage', msg)
    scrollToBottom()
  })
  
  markAsRead(props.orderId)
})

onUnmounted(() => {
  if (subscription?.unsubscribe) {
    subscription.unsubscribe()
  }
})
</script>

<template>
  <div class="chat-widget">
    <!-- Header -->
    <div class="chat-header">
      <div class="header-info">
        <div class="avatar">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <div class="header-text">
          <span class="name">{{ providerName || 'ผู้ให้บริการ' }}</span>
          <span class="status">ออนไลน์</span>
        </div>
      </div>
      <button class="close-btn" @click="emit('close')">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Messages -->
    <div class="messages-container" ref="messagesContainer">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
      </div>
      
      <div v-else-if="messages.length === 0" class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <p>เริ่มแชทกับผู้ให้บริการ</p>
      </div>

      <template v-else>
        <div 
          v-for="msg in messages" 
          :key="msg.id"
          :class="['message', msg.sender_type === 'user' ? 'sent' : 'received']"
        >
          <div class="bubble">
            <p>{{ msg.message }}</p>
            <span class="time">{{ formatTime(msg.created_at) }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Quick Messages -->
    <div class="quick-messages">
      <button 
        v-for="msg in quickMessages" 
        :key="msg" 
        @click="sendQuickMessage(msg)"
        class="quick-btn"
      >
        {{ msg }}
      </button>
    </div>

    <!-- Input -->
    <div class="input-area">
      <input
        ref="inputRef"
        v-model="newMessage"
        type="text"
        placeholder="พิมพ์ข้อความ..."
        @keyup.enter="handleSend"
      />
      <button class="send-btn" @click="handleSend" :disabled="!newMessage.trim()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-widget {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 70vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #F0F0F0;
  background: #fff;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: #E8F5EF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.status {
  font-size: 12px;
  color: #00A86B;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: #F5F5F5;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-btn svg {
  width: 18px;
  height: 18px;
  color: #666666;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading, .empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999999;
  gap: 8px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  width: 48px;
  height: 48px;
  color: #E8E8E8;
}

.empty-state p {
  font-size: 14px;
}

.message {
  display: flex;
  max-width: 80%;
}

.message.sent {
  align-self: flex-end;
}

.message.received {
  align-self: flex-start;
}

.bubble {
  padding: 10px 14px;
  border-radius: 16px;
  position: relative;
}

.message.sent .bubble {
  background: #00A86B;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.received .bubble {
  background: #F5F5F5;
  color: #1A1A1A;
  border-bottom-left-radius: 4px;
}

.bubble p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.time {
  display: block;
  font-size: 10px;
  margin-top: 4px;
  opacity: 0.7;
}

.message.sent .time {
  text-align: right;
}

.quick-messages {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  overflow-x: auto;
  border-top: 1px solid #F0F0F0;
}

.quick-btn {
  padding: 6px 12px;
  background: #E8F5EF;
  color: #00A86B;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #F0F0F0;
  background: #fff;
}

.input-area input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
}

.input-area input:focus {
  border-color: #00A86B;
}

.send-btn {
  width: 44px;
  height: 44px;
  background: #00A86B;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn svg {
  width: 20px;
  height: 20px;
  color: #fff;
}
</style>
