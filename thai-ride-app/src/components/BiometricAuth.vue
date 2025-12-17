<script setup lang="ts">
/**
 * Feature: F272 - Biometric Auth
 * Biometric authentication prompt (Face ID / Fingerprint)
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  type?: 'fingerprint' | 'face' | 'auto'
  title?: string
  subtitle?: string
}>(), {
  type: 'auto',
  title: 'ยืนยันตัวตน',
  subtitle: 'ใช้ลายนิ้วมือหรือ Face ID เพื่อดำเนินการต่อ'
})

const emit = defineEmits<{
  'success': []
  'error': [error: string]
  'cancel': []
}>()

const status = ref<'idle' | 'scanning' | 'success' | 'error'>('idle')
const errorMessage = ref('')

const biometricType = computed(() => {
  if (props.type !== 'auto') return props.type
  // Auto-detect (simplified - in real app check device capabilities)
  return 'fingerprint'
})

const authenticate = async () => {
  status.value = 'scanning'
  
  // Simulate biometric check
  setTimeout(() => {
    const success = Math.random() > 0.2
    if (success) {
      status.value = 'success'
      setTimeout(() => emit('success'), 500)
    } else {
      status.value = 'error'
      errorMessage.value = 'ไม่สามารถยืนยันตัวตนได้ กรุณาลองใหม่'
      emit('error', errorMessage.value)
    }
  }, 1500)
}

const retry = () => {
  status.value = 'idle'
  errorMessage.value = ''
}

const cancel = () => {
  emit('cancel')
}
</script>

<template>
  <div class="biometric-auth">
    <div class="icon-area" :class="status">
      <!-- Fingerprint Icon -->
      <svg v-if="biometricType === 'fingerprint'" width="64" height="64" viewBox="0 0 24 24" fill="none" 
           stroke="currentColor" stroke-width="1.5" class="icon">
        <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 018 4"/>
        <path d="M5 19.5C5.5 18 6 15 6 12c0-2 .5-4 2-5.5"/>
        <path d="M8.5 22c.4-1.5.5-3 .5-4.5 0-3 0-6 3-6s3 3 3 6c0 1.5.1 3 .5 4.5"/>
        <path d="M14 22c.2-1 .3-2 .3-3 0-2.5 0-4-1.3-5.5"/>
        <path d="M17.5 22c.2-1.5.5-3 .5-4.5 0-3.5-.5-6-3-8"/>
        <path d="M22 16c0-3-1-6-3-8"/>
      </svg>
      
      <!-- Face ID Icon -->
      <svg v-else width="64" height="64" viewBox="0 0 24 24" fill="none" 
           stroke="currentColor" stroke-width="1.5" class="icon">
        <path d="M7 3H5a2 2 0 00-2 2v2M17 3h2a2 2 0 012 2v2M7 21H5a2 2 0 01-2-2v-2M17 21h2a2 2 0 002-2v-2"/>
        <circle cx="9" cy="10" r="1"/>
        <circle cx="15" cy="10" r="1"/>
        <path d="M9.5 15a3.5 3.5 0 005 0"/>
      </svg>
      
      <!-- Status Overlay -->
      <div v-if="status === 'scanning'" class="scanning-ring"></div>
      <div v-if="status === 'success'" class="success-check">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3">
          <polyline points="20,6 9,17 4,12"/>
        </svg>
      </div>
    </div>
    
    <h2 class="title">{{ title }}</h2>
    <p class="subtitle">{{ subtitle }}</p>
    
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    
    <div class="actions">
      <button v-if="status === 'idle'" type="button" class="btn-primary" @click="authenticate">
        <span v-if="biometricType === 'fingerprint'">ใช้ลายนิ้วมือ</span>
        <span v-else>ใช้ Face ID</span>
      </button>
      
      <button v-if="status === 'error'" type="button" class="btn-primary" @click="retry">
        ลองใหม่
      </button>
      
      <button type="button" class="btn-secondary" @click="cancel">
        ยกเลิก
      </button>
    </div>
  </div>
</template>

<style scoped>
.biometric-auth {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  text-align: center;
}

.icon-area {
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.icon {
  color: #000;
  transition: color 0.3s;
}

.icon-area.scanning .icon { color: #276ef1; }
.icon-area.success .icon { color: #276ef1; }
.icon-area.error .icon { color: #e11900; }

.scanning-ring {
  position: absolute;
  inset: 0;
  border: 3px solid #276ef1;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.5; }
}

.success-check {
  position: absolute;
  inset: 0;
  background: #276ef1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pop 0.3s ease-out;
}

@keyframes pop {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: #000;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0 0 24px;
  max-width: 280px;
}

.error {
  font-size: 13px;
  color: #e11900;
  margin: 0 0 16px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 280px;
}

.btn-primary {
  padding: 14px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  padding: 14px 24px;
  background: transparent;
  color: #6b6b6b;
  border: none;
  font-size: 15px;
  cursor: pointer;
}
</style>
