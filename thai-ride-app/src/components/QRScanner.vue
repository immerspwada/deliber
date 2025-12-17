<script setup lang="ts">
/**
 * Feature: F271 - QR Scanner
 * Camera-based QR code scanner
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  subtitle?: string
}>(), {
  title: 'สแกน QR Code',
  subtitle: 'วาง QR Code ไว้ในกรอบ'
})

const emit = defineEmits<{
  'scan': [value: string]
  'error': [error: string]
  'close': []
}>()

const videoRef = ref<HTMLVideoElement>()
const scanning = ref(false)
const error = ref('')
const hasCamera = ref(true)
let stream: MediaStream | null = null

onMounted(async () => {
  await startCamera()
})

const startCamera = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      scanning.value = true
    }
  } catch (err) {
    hasCamera.value = false
    error.value = 'ไม่สามารถเข้าถึงกล้องได้'
    emit('error', error.value)
  }
}

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  scanning.value = false
}

// Simulate scan result (in real app, use a QR scanning library)
const simulateScan = () => {
  const mockValue = 'RIDE-' + Math.random().toString(36).substring(2, 10).toUpperCase()
  emit('scan', mockValue)
}

const close = () => {
  stopCamera()
  emit('close')
}

onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <div class="qr-scanner">
    <div class="header">
      <button type="button" class="close-btn" @click="close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <div class="header-text">
        <h3 class="title">{{ title }}</h3>
        <p class="subtitle">{{ subtitle }}</p>
      </div>
    </div>
    
    <div class="scanner-area">
      <video
        v-if="hasCamera"
        ref="videoRef"
        autoplay
        playsinline
        class="video"
      />
      
      <div v-else class="no-camera">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M1 1l22 22M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34"/>
          <path d="M9.5 9.5A5 5 0 0117 14"/>
        </svg>
        <p>{{ error }}</p>
      </div>
      
      <!-- Scan Frame -->
      <div class="scan-frame">
        <div class="corner top-left"></div>
        <div class="corner top-right"></div>
        <div class="corner bottom-left"></div>
        <div class="corner bottom-right"></div>
        <div v-if="scanning" class="scan-line"></div>
      </div>
    </div>
    
    <div class="actions">
      <button type="button" class="btn-manual" @click="simulateScan">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
        </svg>
        กรอกรหัสเอง
      </button>
    </div>
    
    <div class="tips">
      <p>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        ตรวจสอบให้แน่ใจว่า QR Code อยู่ในกรอบและมีแสงเพียงพอ
      </p>
    </div>
  </div>
</template>

<style scoped>
.qr-scanner {
  position: fixed;
  inset: 0;
  background: #000;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.8);
}

.close-btn {
  padding: 8px;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
}

.header-text {
  flex: 1;
}

.title {
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  margin: 4px 0 0;
}

.scanner-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-camera {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.no-camera p {
  font-size: 14px;
  margin: 0;
}

.scan-frame {
  position: absolute;
  width: 250px;
  height: 250px;
}

.corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border-color: #fff;
  border-style: solid;
  border-width: 0;
}

.corner.top-left {
  top: 0;
  left: 0;
  border-top-width: 3px;
  border-left-width: 3px;
  border-top-left-radius: 8px;
}

.corner.top-right {
  top: 0;
  right: 0;
  border-top-width: 3px;
  border-right-width: 3px;
  border-top-right-radius: 8px;
}

.corner.bottom-left {
  bottom: 0;
  left: 0;
  border-bottom-width: 3px;
  border-left-width: 3px;
  border-bottom-left-radius: 8px;
}

.corner.bottom-right {
  bottom: 0;
  right: 0;
  border-bottom-width: 3px;
  border-right-width: 3px;
  border-bottom-right-radius: 8px;
}

.scan-line {
  position: absolute;
  left: 10px;
  right: 10px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #fff, transparent);
  animation: scan 2s ease-in-out infinite;
}

@keyframes scan {
  0%, 100% { top: 10px; }
  50% { top: calc(100% - 10px); }
}

.actions {
  padding: 16px;
  background: rgba(0, 0, 0, 0.8);
}

.btn-manual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.tips {
  padding: 16px;
  background: rgba(0, 0, 0, 0.8);
}

.tips p {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}
</style>
