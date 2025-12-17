<script setup lang="ts">
/**
 * Feature: F309 - Driver Message
 * Quick message to driver
 */
import { ref } from 'vue'

const props = defineProps<{
  visible: boolean
  driverName: string
}>()

const emit = defineEmits<{
  'close': []
  'send': [message: string]
}>()

const message = ref('')
const quickMessages = [
  'กำลังลงมาแล้วครับ',
  'รออีกสักครู่นะครับ',
  'อยู่หน้าตึกครับ',
  'มาถึงแล้วครับ'
]

const send = () => {
  if (message.value.trim()) {
    emit('send', message.value)
    message.value = ''
  }
}

const sendQuick = (msg: string) => {
  emit('send', msg)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div v-if="visible" class="sheet-overlay" @click="emit('close')">
        <div class="sheet-content" @click.stop>
          <div class="sheet-handle"></div>
          <h3 class="title">ส่งข้อความถึง {{ driverName }}</h3>
          
          <div class="quick-messages">
            <button
              v-for="msg in quickMessages"
              :key="msg"
              type="button"
              class="quick-btn"
              @click="sendQuick(msg)"
            >
              {{ msg }}
            </button>
          </div>
          
          <div class="input-area">
            <input
              v-model="message"
              type="text"
              placeholder="พิมพ์ข้อความ..."
              @keyup.enter="send"
            />
            <button type="button" class="send-btn" :disabled="!message.trim()" @click="send">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22,2 15,22 11,13 2,9"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.sheet-content {
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 12px 20px 24px;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #e5e5e5;
  border-radius: 2px;
  margin: 0 auto 16px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
}

.quick-messages {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.quick-btn {
  padding: 10px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
}

.quick-btn:hover {
  background: #e5e5e5;
}

.input-area {
  display: flex;
  gap: 8px;
}

.input-area input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
}

.input-area input:focus {
  border-color: #000;
}

.send-btn {
  width: 48px;
  height: 48px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.send-btn:disabled {
  background: #ccc;
}

.slide-enter-active, .slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
}

.slide-enter-from .sheet-content,
.slide-leave-to .sheet-content {
  transform: translateY(100%);
}
</style>
