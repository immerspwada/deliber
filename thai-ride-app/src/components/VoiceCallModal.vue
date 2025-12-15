<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  show: boolean
  driverName: string
  driverPhone?: string
  rideId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'end'): void
}>()

const callState = ref<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting')
const callDuration = ref(0)
const isMuted = ref(false)
const isSpeaker = ref(false)

let durationInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Simulate call connection
  setTimeout(() => {
    callState.value = 'ringing'
  }, 1000)
  
  setTimeout(() => {
    callState.value = 'connected'
    startTimer()
  }, 3000)
})

onUnmounted(() => {
  if (durationInterval) clearInterval(durationInterval)
})

const startTimer = () => {
  durationInterval = setInterval(() => {
    callDuration.value++
  }, 1000)
}

const formatDuration = computed(() => {
  const mins = Math.floor(callDuration.value / 60)
  const secs = callDuration.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const toggleMute = () => {
  isMuted.value = !isMuted.value
}

const toggleSpeaker = () => {
  isSpeaker.value = !isSpeaker.value
}

const endCall = () => {
  if (durationInterval) clearInterval(durationInterval)
  callState.value = 'ended'
  setTimeout(() => {
    emit('end')
    emit('close')
  }, 1000)
}

const getStatusText = () => {
  switch (callState.value) {
    case 'connecting': return 'กำลังเชื่อมต่อ...'
    case 'ringing': return 'กำลังเรียก...'
    case 'connected': return formatDuration.value
    case 'ended': return 'สิ้นสุดการโทร'
  }
}
</script>

<template>
  <div v-if="show" class="call-overlay">
    <div class="call-content">
      <!-- Driver Info -->
      <div class="driver-section">
        <div class="driver-avatar">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
        <h2 class="driver-name">{{ driverName }}</h2>
        <p class="call-status">{{ getStatusText() }}</p>
      </div>

      <!-- Call Animation -->
      <div v-if="callState === 'ringing'" class="ringing-animation">
        <div class="ring ring-1"></div>
        <div class="ring ring-2"></div>
        <div class="ring ring-3"></div>
      </div>

      <!-- Call Controls -->
      <div class="call-controls">
        <button 
          :class="['control-btn', { active: isMuted }]"
          @click="toggleMute"
        >
          <svg v-if="!isMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
          </svg>
          <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>
          </svg>
          <span>{{ isMuted ? 'เปิดไมค์' : 'ปิดไมค์' }}</span>
        </button>

        <button 
          class="end-call-btn"
          @click="endCall"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"/>
          </svg>
        </button>

        <button 
          :class="['control-btn', { active: isSpeaker }]"
          @click="toggleSpeaker"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
          </svg>
          <span>ลำโพง</span>
        </button>
      </div>

      <!-- Privacy Note -->
      <p class="privacy-note">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        หมายเลขโทรศัพท์ของคุณจะถูกซ่อนเพื่อความเป็นส่วนตัว
      </p>
    </div>
  </div>
</template>

<style scoped>
.call-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, #1a1a1a 0%, #000 100%);
  z-index: 200;
  display: flex;
  flex-direction: column;
}

.call-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 60px 24px 40px;
}

.driver-section {
  text-align: center;
}

.driver-avatar {
  width: 120px;
  height: 120px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.driver-avatar svg {
  width: 60px;
  height: 60px;
  color: #fff;
}

.driver-name {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.call-status {
  font-size: 18px;
  color: rgba(255,255,255,0.7);
}

.ringing-animation {
  position: relative;
  width: 200px;
  height: 200px;
}

.ring {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  animation: ring-pulse 2s ease-out infinite;
}

.ring-2 {
  animation-delay: 0.5s;
}

.ring-3 {
  animation-delay: 1s;
}

@keyframes ring-pulse {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.call-controls {
  display: flex;
  align-items: center;
  gap: 32px;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
}

.control-btn svg {
  width: 28px;
  height: 28px;
  padding: 16px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
}

.control-btn.active svg {
  background: #fff;
  color: #000;
}

.control-btn span {
  font-size: 12px;
  color: rgba(255,255,255,0.7);
}

.end-call-btn {
  width: 72px;
  height: 72px;
  background: #ef4444;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.end-call-btn:hover {
  transform: scale(1.05);
}

.end-call-btn:active {
  transform: scale(0.95);
}

.end-call-btn svg {
  width: 32px;
  height: 32px;
  color: #fff;
}

.privacy-note {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  text-align: center;
}

.privacy-note svg {
  width: 16px;
  height: 16px;
}
</style>
