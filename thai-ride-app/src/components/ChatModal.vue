<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { useChat } from '../composables/useChat'

const props = defineProps<{
  rideId: string
  driverName: string
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { messages, fetchMessages, sendMessage, subscribeToMessages, markAsRead } = useChat()

const newMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
let subscription: any = null

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const handleSend = async () => {
  if (!newMessage.value.trim()) return
  
  const msg = newMessage.value
  newMessage.value = ''
  
  await sendMessage(props.rideId, msg)
  scrollToBottom()
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

watch(() => props.show, async (show) => {
  if (show) {
    await fetchMessages(props.rideId)
    await markAsRead(props.rideId)
    scrollToBottom()
    
    subscription = subscribeToMessages(props.rideId, () => {
      scrollToBottom()
    })
  } else if (subscription) {
    subscription.unsubscribe()
  }
})

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe()
  }
})
</script>

<template>
  <div v-if="show" class="chat-overlay" @click.self="emit('close')">
    <div class="chat-modal">
      <!-- Header -->
      <div class="chat-header">
        <div class="driver-info">
          <div class="driver-avatar">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <span class="driver-name">{{ driverName }}</span>
        </div>
        <button class="close-btn" @click="emit('close')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div ref="messagesContainer" class="messages-container">
        <div v-if="messages.length === 0" class="empty-chat">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p>เริ่มแชทกับคนขับ</p>
        </div>
        
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message', msg.sender_type === 'user' ? 'sent' : 'received']"
        >
          <div class="message-bubble">
            <p>{{ msg.message }}</p>
            <span class="message-time">{{ formatTime(msg.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Quick replies -->
      <div class="quick-replies">
        <button class="quick-btn" @click="newMessage = 'ผมมาถึงแล้วครับ'">มาถึงแล้ว</button>
        <button class="quick-btn" @click="newMessage = 'รอสักครู่นะครับ'">รอสักครู่</button>
        <button class="quick-btn" @click="newMessage = 'อยู่ตรงไหนครับ?'">อยู่ตรงไหน?</button>
      </div>

      <!-- Input -->
      <div class="chat-input">
        <input
          v-model="newMessage"
          type="text"
          placeholder="พิมพ์ข้อความ..."
          @keyup.enter="handleSend"
        />
        <button :disabled="!newMessage.trim()" class="send-btn" @click="handleSend">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.chat-modal {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  border-radius: 20px 20px 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E5E5;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.driver-avatar {
  width: 40px;
  height: 40px;
  background: #F6F6F6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.driver-avatar svg {
  width: 24px;
  height: 24px;
  color: #6B6B6B;
}

.driver-name {
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: #F6F6F6;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 300px;
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6B6B6B;
}

.empty-chat svg {
  width: 48px;
  height: 48px;
  margin-bottom: 8px;
}

.message {
  display: flex;
}

.message.sent {
  justify-content: flex-end;
}

.message.received {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 16px;
}

.message.sent .message-bubble {
  background: #00A86B;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message.received .message-bubble {
  background: #F6F6F6;
  border-bottom-left-radius: 4px;
}

.message-bubble p {
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
}

.quick-replies {
  display: flex;
  gap: 8px;
  padding: 8px 20px;
  overflow-x: auto;
}

.quick-btn {
  padding: 8px 14px;
  background: #F6F6F6;
  border: none;
  border-radius: 16px;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
}

.chat-input {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #E5E5E5;
}

.chat-input input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 24px;
  font-size: 15px;
  outline: none;
}

.chat-input input:focus {
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
}

.send-btn:disabled {
  background: #CCC;
}

.send-btn svg {
  width: 20px;
  height: 20px;
  color: #fff;
}
</style>
