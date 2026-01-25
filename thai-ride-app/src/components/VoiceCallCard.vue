<script setup lang="ts">
/**
 * Feature: F142 - Voice Call Card
 * In-app voice call interface
 */
import { ref, onUnmounted } from 'vue'

interface Props {
  callerName: string
  callerPhoto?: string
  callType: 'incoming' | 'outgoing' | 'active'
  duration?: number
  isMuted?: boolean
  isSpeaker?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  duration: 0,
  isMuted: false,
  isSpeaker: false
})

const emit = defineEmits<{
  answer: []
  decline: []
  endCall: []
  toggleMute: []
  toggleSpeaker: []
}>()

const callDuration = ref(props.duration)
let timer: number | undefined

if (props.callType === 'active') {
  timer = window.setInterval(() => {
    callDuration.value++
  }, 1000)
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="voice-call-card" :class="callType">
    <div class="call-header">
      <span class="call-status">
        {{ callType === 'incoming' ? 'สายเรียกเข้า' : callType === 'outgoing' ? 'กำลังโทร...' : 'กำลังสนทนา' }}
      </span>
    </div>
    
    <div class="caller-info">
      <div class="caller-avatar">
        <img v-if="callerPhoto" :src="callerPhoto" :alt="callerName" />
        <span v-else class="avatar-initials">{{ getInitials(callerName) }}</span>
      </div>
      <h2 class="caller-name">{{ callerName }}</h2>
      <span v-if="callType === 'active'" class="call-duration">{{ formatDuration(callDuration) }}</span>
    </div>
    
    <div class="call-controls">
      <template v-if="callType === 'incoming'">
        <button type="button" class="control-btn decline" @click="emit('decline')">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </button>
        <button type="button" class="control-btn answer" @click="emit('answer')">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </button>
      </template>
      
      <template v-else>
        <button type="button" class="control-btn" :class="{ active: isMuted }" @click="emit('toggleMute')">
          <svg v-if="!isMuted" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 1l22 22M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
          </svg>
        </button>
        <button type="button" class="control-btn end-call" @click="emit('endCall')">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </button>
        <button type="button" class="control-btn" :class="{ active: isSpeaker }" @click="emit('toggleSpeaker')">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
          </svg>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.voice-call-card {
  background: linear-gradient(180deg, #1a1a1a 0%, #000 100%);
  border-radius: 24px;
  padding: 32px 24px;
  color: #fff;
  text-align: center;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.call-header {
  margin-bottom: 40px;
}

.call-status {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.caller-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.caller-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.caller-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 36px;
  font-weight: 600;
  color: #fff;
}

.caller-name {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
}

.call-duration {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
}

.call-controls {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 40px;
}

.control-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.control-btn:hover { background: rgba(255, 255, 255, 0.2); }
.control-btn.active { background: #fff; color: #000; }
.control-btn.answer { background: #2e7d32; }
.control-btn.answer:hover { background: #388e3c; }
.control-btn.decline, .control-btn.end-call { background: #c62828; }
.control-btn.decline:hover, .control-btn.end-call:hover { background: #d32f2f; }

.incoming .caller-avatar {
  animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.4); }
  70% { box-shadow: 0 0 0 20px rgba(46, 125, 50, 0); }
  100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
}
</style>
