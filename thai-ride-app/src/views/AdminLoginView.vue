<script setup lang="ts">
/**
 * Admin Login View
 * ================
 * หน้า Login สำหรับ Admin โดยเฉพาะ
 * - แยกจาก User App อย่างสมบูรณ์
 * - มี Rate Limiting และ Security
 * - รองรับ Demo Mode
 */

import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuth } from '../composables/useAdminAuth'

const router = useRouter()
const auth = useAdminAuth()

// Form state
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const passwordInput = ref<HTMLInputElement | null>(null)

// Fill demo credentials
const fillDemoCredentials = () => {
  email.value = auth.DEMO_CREDENTIALS.email
  password.value = auth.DEMO_CREDENTIALS.password
  auth.error.value = ''
}

// Handle login
const handleLogin = async () => {
  const success = await auth.login(email.value, password.value)
  if (success) {
    router.push('/admin/dashboard')
  }
}

// Toggle password visibility
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

// Go to user app
const goToUserApp = () => {
  window.location.href = '/'
}

// Check existing session on mount
onMounted(async () => {
  const hasSession = await auth.initialize()
  if (hasSession) {
    router.replace('/admin/dashboard')
  }
})

// Clear error when inputs change
watch([email, password], () => {
  if (auth.error.value) {
    auth.error.value = ''
  }
})
</script>

<template>
  <div class="admin-login-page">
    <!-- Offline Banner -->
    <div v-if="!auth.isOnline.value" class="offline-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      </svg>
      ไม่มีการเชื่อมต่ออินเทอร์เน็ต
    </div>

    <div class="login-container">
      <div class="login-header">
        <div class="logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1>GOBEAR Admin</h1>
        <p class="subtitle">ระบบจัดการสำหรับผู้ดูแล</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <!-- Lockout Warning -->
        <div v-if="auth.isLocked.value" class="lockout-warning">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div>
            <strong>บัญชีถูกล็อกชั่วคราว</strong>
            <p>กรุณารออีก {{ auth.remainingLockTime.value }} วินาที</p>
          </div>
        </div>

        <div class="form-group">
          <label for="email">อีเมล</label>
          <input 
            id="email"
            v-model="email" 
            type="email" 
            placeholder="admin@gobear.app" 
            autocomplete="email"
            :disabled="auth.loading.value || auth.isLocked.value"
            @keydown.enter.prevent="passwordInput?.focus()"
          />
        </div>

        <div class="form-group">
          <label for="password">รหัสผ่าน</label>
          <div class="password-input-wrapper">
            <input 
              id="password"
              ref="passwordInput"
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="รหัสผ่าน" 
              autocomplete="current-password"
              :disabled="auth.loading.value || auth.isLocked.value"
            />
            <button 
              type="button" 
              class="toggle-password" 
              @click="togglePassword"
              :disabled="auth.loading.value"
              tabindex="-1"
              aria-label="แสดง/ซ่อนรหัสผ่าน"
            >
              <svg v-if="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <p v-if="auth.error.value" class="error-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ auth.error.value }}
        </p>

        <button 
          type="submit" 
          class="btn-login" 
          :disabled="auth.loading.value || auth.isLocked.value || !auth.isOnline.value"
        >
          <span v-if="auth.loading.value" class="spinner"></span>
          <template v-else-if="auth.isLocked.value">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            รอ {{ auth.remainingLockTime.value }}s
          </template>
          <template v-else>
            เข้าสู่ระบบ
          </template>
        </button>
      </form>

      <div class="demo-info">
        <p>Demo Admin Account:</p>
        <code>{{ auth.DEMO_CREDENTIALS.email }} / {{ auth.DEMO_CREDENTIALS.password }}</code>
        <button 
          @click="fillDemoCredentials" 
          class="fill-btn"
          :disabled="auth.loading.value || auth.isLocked.value"
        >
          กรอกอัตโนมัติ
        </button>
      </div>

      <button class="link-btn" @click="goToUserApp">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        กลับไปหน้าผู้ใช้งาน
      </button>
    </div>
  </div>
</template>

<style scoped>
.admin-login-page {
  min-height: 100vh;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #e11900;
  color: #fff;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 100;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

.login-container {
  width: 100%;
  max-width: 400px;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
  color: #fff;
}

.logo {
  width: 80px;
  height: 80px;
  background: #fff;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: #000;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.subtitle {
  color: rgba(255,255,255,0.6);
  font-size: 14px;
}

.login-form {
  background: #fff;
  border-radius: 16px;
  padding: 32px 24px;
  margin-bottom: 24px;
}

.lockout-warning {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  color: #856404;
}

.lockout-warning svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.lockout-warning strong {
  display: block;
  font-size: 14px;
  margin-bottom: 2px;
}

.lockout-warning p {
  font-size: 13px;
  margin: 0;
  opacity: 0.8;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #000;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s;
  background: #fff;
}

.form-group input:focus {
  outline: none;
  border-color: #000;
  box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
}

.form-group input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.password-input-wrapper {
  position: relative;
}

.password-input-wrapper input {
  padding-right: 48px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.toggle-password:hover:not(:disabled) {
  color: #000;
}

.toggle-password:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-text {
  color: #e11900;
  font-size: 14px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fef2f2;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #fee2e2;
}

.btn-login {
  width: 100%;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-login:hover:not(:disabled) { background: #333; }
.btn-login:active:not(:disabled) { transform: scale(0.98); }
.btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.demo-info {
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  margin-bottom: 24px;
}

.demo-info p {
  color: rgba(255,255,255,0.6);
  font-size: 12px;
  margin-bottom: 8px;
}

.demo-info code {
  color: #fff;
  font-size: 14px;
  font-family: monospace;
  display: block;
  margin-bottom: 12px;
}

.fill-btn {
  padding: 8px 16px;
  background: #fff;
  color: #000;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.fill-btn:hover:not(:disabled) {
  background: #f0f0f0;
}

.fill-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.link-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: none;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.link-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.3);
}
</style>
