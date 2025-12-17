<script setup lang="ts">
/**
 * Feature: F267 - Phone Verification
 * Phone number verification with OTP flow
 */
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  phone?: string
  otpLength?: number
  resendDelay?: number
}>(), {
  phone: '',
  otpLength: 6,
  resendDelay: 60
})

const emit = defineEmits<{
  'send-otp': [phone: string]
  'verify': [otp: string]
  'resend': []
}>()

const step = ref<'phone' | 'otp'>('phone')
const phoneNumber = ref(props.phone)
const otpDigits = ref<string[]>(Array(props.otpLength).fill(''))
const countdown = ref(0)
const loading = ref(false)
const error = ref('')

let countdownInterval: ReturnType<typeof setInterval> | null = null

const formattedPhone = computed(() => {
  if (!phoneNumber.value) return ''
  const cleaned = phoneNumber.value.replace(/\D/g, '')
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }
  return phoneNumber.value
})

const otpComplete = computed(() => otpDigits.value.every(d => d !== ''))

const sendOTP = () => {
  if (!phoneNumber.value || phoneNumber.value.length < 10) {
    error.value = 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง'
    return
  }
  loading.value = true
  error.value = ''
  emit('send-otp', phoneNumber.value)
  
  setTimeout(() => {
    loading.value = false
    step.value = 'otp'
    startCountdown()
  }, 1000)
}

const startCountdown = () => {
  countdown.value = props.resendDelay
  countdownInterval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && countdownInterval) {
      clearInterval(countdownInterval)
    }
  }, 1000)
}

const handleOtpInput = (index: number, e: Event) => {
  const input = e.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '')
  
  if (value && value[0]) {
    otpDigits.value[index] = value[0]
    if (index < props.otpLength - 1) {
      const nextInput = input.parentElement?.children[index + 1] as HTMLInputElement
      nextInput?.focus()
    }
  }
}

const handleOtpKeydown = (index: number, e: KeyboardEvent) => {
  const input = e.target as HTMLInputElement
  if (e.key === 'Backspace' && !input.value && index > 0) {
    const prevInput = input.parentElement?.children[index - 1] as HTMLInputElement
    prevInput?.focus()
  }
}

const verifyOTP = () => {
  if (!otpComplete.value) return
  loading.value = true
  error.value = ''
  emit('verify', otpDigits.value.join(''))
}

const resendOTP = () => {
  if (countdown.value > 0) return
  otpDigits.value = Array(props.otpLength).fill('')
  emit('resend')
  startCountdown()
}

const goBack = () => {
  step.value = 'phone'
  otpDigits.value = Array(props.otpLength).fill('')
  if (countdownInterval) clearInterval(countdownInterval)
}
</script>

<template>
  <div class="phone-verification">
    <!-- Phone Input Step -->
    <div v-if="step === 'phone'" class="step">
      <div class="icon-wrapper">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>
      </div>
      
      <h2 class="title">ยืนยันเบอร์โทรศัพท์</h2>
      <p class="desc">กรอกเบอร์โทรศัพท์เพื่อรับรหัส OTP</p>
      
      <div class="phone-input-wrapper">
        <span class="country-code">+66</span>
        <input
          v-model="phoneNumber"
          type="tel"
          class="phone-input"
          placeholder="812345678"
          maxlength="10"
        />
      </div>
      
      <p v-if="error" class="error">{{ error }}</p>
      
      <button
        type="button"
        class="btn-primary"
        :disabled="loading || !phoneNumber"
        @click="sendOTP"
      >
        <span v-if="loading">กำลังส่ง...</span>
        <span v-else>ส่งรหัส OTP</span>
      </button>
    </div>
    
    <!-- OTP Input Step -->
    <div v-else class="step">
      <button type="button" class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      
      <div class="icon-wrapper">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>
      
      <h2 class="title">กรอกรหัส OTP</h2>
      <p class="desc">ส่งไปยัง {{ formattedPhone }}</p>
      
      <div class="otp-inputs">
        <input
          v-for="(_, index) in otpDigits"
          :key="index"
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="otp-input"
          :value="otpDigits[index]"
          @input="handleOtpInput(index, $event)"
          @keydown="handleOtpKeydown(index, $event)"
        />
      </div>
      
      <p v-if="error" class="error">{{ error }}</p>
      
      <button
        type="button"
        class="btn-primary"
        :disabled="loading || !otpComplete"
        @click="verifyOTP"
      >
        <span v-if="loading">กำลังตรวจสอบ...</span>
        <span v-else>ยืนยัน</span>
      </button>
      
      <button
        type="button"
        class="resend-btn"
        :disabled="countdown > 0"
        @click="resendOTP"
      >
        <span v-if="countdown > 0">ส่งรหัสใหม่ใน {{ countdown }} วินาที</span>
        <span v-else>ส่งรหัสใหม่</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.phone-verification {
  padding: 24px;
  max-width: 360px;
  margin: 0 auto;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  background: #f6f6f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: #000;
  margin: 0 0 8px;
}

.desc {
  font-size: 14px;
  color: #6b6b6b;
  margin: 0 0 24px;
}

.phone-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.country-code {
  padding: 12px 16px;
  background: #f6f6f6;
  font-size: 15px;
  font-weight: 500;
  color: #000;
  border-right: 1px solid #e5e5e5;
}

.phone-input {
  flex: 1;
  padding: 12px 16px;
  border: none;
  font-size: 15px;
  outline: none;
}

.otp-inputs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.otp-input {
  width: 44px;
  height: 52px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 600;
  text-align: center;
  outline: none;
}

.otp-input:focus {
  border-color: #000;
}

.error {
  font-size: 13px;
  color: #e11900;
  margin: 0 0 16px;
}

.btn-primary {
  width: 100%;
  padding: 14px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.resend-btn {
  margin-top: 16px;
  padding: 8px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
}

.resend-btn:not(:disabled):hover {
  color: #000;
}

.resend-btn:disabled {
  cursor: not-allowed;
}
</style>
