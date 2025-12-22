<!--
  Admin V2 Login View
  ==================
  Login page for Admin Dashboard V2
-->

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuthStore } from '../stores/adminAuth.store'

const router = useRouter()
const authStore = useAdminAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

onMounted(async () => {
  // Check if already logged in
  const hasSession = await authStore.initialize()
  if (hasSession) {
    router.replace('/admin/dashboard')
  }
})

const handleLogin = async () => {
  const success = await authStore.login(email.value, password.value)
  if (success) {
    router.push('/admin/dashboard')
  }
}

const fillDemo = () => {
  email.value = 'admin@demo.com'
  password.value = 'admin1234'
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Logo -->
      <div class="logo">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>

      <!-- Title -->
      <h1 class="title">GOBEAR Admin</h1>
      <p class="subtitle">ระบบจัดการสำหรับผู้ดูแล</p>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="form">
        <!-- Error Message -->
        <div v-if="authStore.error" class="error-message">
          {{ authStore.error }}
        </div>

        <!-- Lockout Warning -->
        <div v-if="authStore.isLocked" class="lockout-warning">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          <span>บัญชีถูกล็อกชั่วคราว กรุณารอ {{ Math.ceil((authStore.lockoutEndTime - Date.now()) / 1000) }} วินาที</span>
        </div>

        <!-- Email -->
        <div class="form-group">
          <label>อีเมล</label>
          <input
            v-model="email"
            type="email"
            placeholder="admin@example.com"
            required
            :disabled="authStore.isLoading"
          />
        </div>

        <!-- Password -->
        <div class="form-group">
          <label>รหัสผ่าน</label>
          <div class="password-input">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              required
              :disabled="authStore.isLoading"
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          class="submit-btn"
          :disabled="authStore.isLoading || authStore.isLocked"
        >
          <span v-if="authStore.isLoading">กำลังเข้าสู่ระบบ...</span>
          <span v-else>เข้าสู่ระบบ</span>
        </button>

        <!-- Demo Button -->
        <button type="button" class="demo-btn" @click="fillDemo">
          ใช้ Demo Credentials
        </button>
      </form>

      <!-- Footer -->
      <div class="footer">
        <p>Demo: admin@demo.com / admin1234</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.logo {
  display: flex;
  justify-content: center;
  color: #00A86B;
  margin-bottom: 24px;
}

.title {
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  color: #1F2937;
  margin: 0 0 8px 0;
}

.subtitle {
  text-align: center;
  color: #6B7280;
  margin: 0 0 32px 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-message {
  padding: 12px 16px;
  background: #FEE2E2;
  color: #991B1B;
  border-radius: 8px;
  font-size: 14px;
}

.lockout-warning {
  padding: 12px 16px;
  background: #FEF3C7;
  color: #92400E;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #00A86B;
}

.form-group input:disabled {
  background: #F9FAFB;
  cursor: not-allowed;
}

.password-input {
  position: relative;
}

.password-input input {
  width: 100%;
  padding-right: 48px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6B7280;
  cursor: pointer;
  padding: 4px;
}

.toggle-password:hover {
  color: #1F2937;
}

.submit-btn {
  padding: 14px 24px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #008F5B;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.demo-btn {
  padding: 12px 24px;
  background: #F3F4F6;
  color: #1F2937;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.demo-btn:hover {
  background: #E5E7EB;
}

.footer {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #E5E7EB;
  text-align: center;
}

.footer p {
  font-size: 13px;
  color: #9CA3AF;
  margin: 0;
}
</style>
