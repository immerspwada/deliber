<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const route = useRoute()

const status = ref<'verifying' | 'success' | 'error' | 'resent'>('verifying')
const errorMessage = ref('')
const email = ref('')
const isResending = ref(false)

onMounted(async () => {
  // Check if this is a callback from email verification
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const accessToken = hashParams.get('access_token')
  const type = hashParams.get('type')
  
  if (accessToken && type === 'signup') {
    // User clicked verification link
    try {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: hashParams.get('refresh_token') || ''
      })
      
      if (error) throw error
      
      status.value = 'success'
      setTimeout(() => router.push('/'), 3000)
    } catch (err: any) {
      status.value = 'error'
      errorMessage.value = err.message || 'ไม่สามารถยืนยันอีเมลได้'
    }
  } else {
    // User just registered, show waiting screen
    email.value = (route.query.email as string) || ''
    status.value = 'verifying'
  }
})

const resendVerification = async () => {
  if (!email.value || isResending.value) return
  
  isResending.value = true
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.value
    })
    
    if (error) throw error
    
    status.value = 'resent'
    setTimeout(() => status.value = 'verifying', 3000)
  } catch (err: any) {
    errorMessage.value = err.message || 'ไม่สามารถส่งอีเมลได้'
  } finally {
    isResending.value = false
  }
}

const goToLogin = () => router.push('/login')
</script>

<template>
  <div class="verification-page">
    <div class="verification-container">
      <!-- Verifying / Waiting -->
      <div v-if="status === 'verifying'" class="status-content">
        <div class="icon-circle pending">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h1>ตรวจสอบอีเมลของคุณ</h1>
        <p class="desc">เราได้ส่งลิงก์ยืนยันไปที่</p>
        <p class="email">{{ email || 'อีเมลของคุณ' }}</p>
        <p class="hint">กรุณาคลิกลิงก์ในอีเมลเพื่อยืนยันบัญชี</p>
        
        <div class="actions">
          <button :disabled="isResending" class="btn-secondary" @click="resendVerification">
            {{ isResending ? 'กำลังส่ง...' : 'ส่งอีเมลอีกครั้ง' }}
          </button>
          <button class="btn-text" @click="goToLogin">กลับไปหน้าเข้าสู่ระบบ</button>
        </div>
      </div>

      <!-- Success -->
      <div v-if="status === 'success'" class="status-content">
        <div class="icon-circle success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h1>ยืนยันอีเมลสำเร็จ!</h1>
        <p class="desc">บัญชีของคุณพร้อมใช้งานแล้ว</p>
        <p class="hint">กำลังนำคุณไปหน้าหลัก...</p>
      </div>

      <!-- Error -->
      <div v-if="status === 'error'" class="status-content">
        <div class="icon-circle error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h1>ยืนยันไม่สำเร็จ</h1>
        <p class="desc">{{ errorMessage || 'ลิงก์อาจหมดอายุหรือไม่ถูกต้อง' }}</p>
        
        <div class="actions">
          <button class="btn-primary" @click="goToLogin">กลับไปหน้าเข้าสู่ระบบ</button>
        </div>
      </div>

      <!-- Resent -->
      <div v-if="status === 'resent'" class="status-content">
        <div class="icon-circle success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h1>ส่งอีเมลแล้ว!</h1>
        <p class="desc">กรุณาตรวจสอบกล่องจดหมายของคุณ</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verification-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 24px;
}

.verification-container {
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.status-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.icon-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.icon-circle svg {
  width: 40px;
  height: 40px;
}

.icon-circle.pending {
  background: #f6f6f6;
  color: #000;
}

.icon-circle.success {
  background: rgba(39, 110, 241, 0.1);
  color: #276EF1;
}

.icon-circle.error {
  background: rgba(225, 25, 0, 0.1);
  color: #E11900;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  color: #000;
  margin-bottom: 12px;
}

.desc {
  font-size: 16px;
  color: #6b6b6b;
  margin-bottom: 8px;
}

.email {
  font-size: 16px;
  font-weight: 600;
  color: #000;
  margin-bottom: 16px;
}

.hint {
  font-size: 14px;
  color: #999;
  margin-bottom: 32px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn-primary {
  width: 100%;
  padding: 14px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  width: 100%;
  padding: 14px 24px;
  background: #f6f6f6;
  color: #000;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-text {
  background: none;
  border: none;
  color: #6b6b6b;
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
}
</style>
