<script setup lang="ts">
/**
 * Feature: F219 - Chat Input
 * Chat message input component
 */
import { ref } from 'vue'

defineProps<{
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [message: string]
  attachment: []
}>()

const message = ref('')

const handleSend = () => {
  if (message.value.trim()) {
    emit('send', message.value.trim())
    message.value = ''
  }
}
</script>

<template>
  <div class="chat-input" :class="{ disabled }">
    <button type="button" class="attach-btn" :disabled="disabled" @click="emit('attachment')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
      </svg>
    </button>
    <input
      v-model="message" type="text" :placeholder="placeholder || 'พิมพ์ข้อความ...'" :disabled="disabled"
      @keyup.enter="handleSend"
    />
    <button type="button" class="send-btn" :disabled="disabled || !message.trim()" @click="handleSend">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.chat-input { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #fff; border-top: 1px solid #e5e5e5; }
.chat-input.disabled { opacity: 0.6; }
.chat-input input { flex: 1; padding: 12px 16px; background: #f6f6f6; border: none; border-radius: 24px; font-size: 15px; outline: none; }
.chat-input input:focus { background: #e5e5e5; }
.attach-btn, .send-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 50%; cursor: pointer; color: #6b6b6b; }
.attach-btn:hover:not(:disabled), .send-btn:hover:not(:disabled) { background: #f6f6f6; color: #000; }
.send-btn { background: #000; color: #fff; }
.send-btn:hover:not(:disabled) { background: #333; color: #fff; }
.send-btn:disabled { background: #e5e5e5; color: #999; cursor: not-allowed; }
</style>
