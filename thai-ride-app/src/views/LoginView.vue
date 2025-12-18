<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loginMethod = ref<'otp' | 'password'>('password')
const email = ref('')
const password = ref('')
const otp = ref('')
const isOtpSent = ref(false)
const isLoading = ref(false)

const rememberMe = ref(true)
const error = ref('')
const successMessage = ref('')
const showFillToast = ref(false)
const filledAccount = ref('')

const testAccounts = [
  { label: 'ลูกค้า', email: 'customer@demo.com', password: 'demo1234', role: 'customer' },
  { label: 'คนขับรถ', email: 'driver1@demo.com', password: 'demo1234', role: 'driver' },
  { label: 'ไรเดอร์', email: 'rider@demo.com', password: 'demo1234', role: 'rider' },
  { label: 'แอดมิน', email: 'admin@demo.com', password: 'admin1234', role: 'admin' }
]

const selectTestAccount = (account: typeof testAccounts[0]) => {
  email.value = account.email
  password.value = account.password
  loginMethod.value = 'password'
  error.value = ''
  
  filledAccount.value = account.label
  showFillToast.value = true
  setTimeout(() => {
    showFillToast.value = false
  }, 2000)
}

const isEmailValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

const sendEmailOtp = async () => {
  if (!isEmailValid.value) {
    error.value = 'กรุณาใส่อีเมลที่ถูกต้อง'
    return
  }
  isLoading.value = true
  error.value = ''
  successMessage.value = ''
  
  try {
    const success = await authStore.loginWithEmailOtp(email.value)
    
    if (success) {
      isOtpSent.value = true
      successMessage.value = `ส่งรหัส OTP ไปที่ ${email.value} แล้ว`
    } else {
      error.value = authStore.error || 'ไม่สามารถส่ง OTP ได้'
    }
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาด'
  } finally {
    isLoading.value = false
  }
}

const verifyEmailOtp = async () => {
  if (otp.value.length !== 6) {
    error.value = 'กรุณาใส่รหัส OTP 6 หลัก'
    return
  }
  isLoading.value = true
  error.value = ''
  
  try {
    const success = await authStore.verifyEmailOtp(email.value, otp.value)
    if (success) {
      await router.replace('/')
    } else {
      error.value = authStore.error || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ'
    }
  } catch (err: any) {
    error.value = err.message || 'รหัส OTP ไม่ถูกต้อง'
  } finally {
    isLoading.value = false
  }
}

const loginWithPassword = async () => {
  if (!email.value || !password.value) {
    error.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
    return
  }
  isLoading.value = true
  error.value = ''
  
  localStorage.removeItem('demo_mode')
  localStorage.removeItem('demo_user')
  
  try {
    const success = await authStore.login(email.value, password.value)
    
    if (success) {
      const userRole = authStore.user?.role
      const targetRoute = userRole === 'rider' || userRole === 'driver' 
        ? '/provider' 
        : userRole === 'admin' 
          ? '/admin' 
          : '/'
      
      await router.replace(targetRoute)
    } else {
      error.value = authStore.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
    }
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    isLoading.value = false
  }
}

const resetOtpState = () => {
  isOtpSent.value = false
  otp.value = ''
  error.value = ''
  successMessage.value = ''
}

const goToRegister = () => router.push('/register')
</script>

<template>
  <div class="auth-page">
    <!-- Hero Section with Illustration -->
    <div class="hero-section">
      <div class="hero-illustration">
        <svg viewBox="0 0 300 200" fill="none">
          <!-- Night sky background -->
          <rect width="300" height="200" fill="#1A1A2E"/>
          <!-- Stars -->
          <circle cx="50" cy="30" r="1" fill="#FFF"/>
          <circle cx="100" cy="50" r="1.5" fill="#FFF"/>
          <circle cx="200" cy="25" r="1" fill="#FFF"/>
          <circle cx="250" cy="60" r="1.5" fill="#FFF"/>
          <circle cx="280" cy="35" r="1" fill="#FFF"/>
          <!-- Moon -->
          <circle cx="240" cy="45" r="20" fill="#F5F5F5"/>
          <!-- Road -->
          <path d="M0 180 Q150 150 300 180" fill="#333"/>
          <path d="M0 185 L300 185" stroke="#FFD700" stroke-width="2" stroke-dasharray="20 10"/>
          <!-- Car -->
          <g transform="translate(100, 130)">
            <rect x="0" y="20" width="80" height="30" rx="8" fill="#00A86B"/>
            <rect x="10" y="5" width="60" height="25" rx="6" fill="#00A86B"/>
            <rect x="15" y="8" width="22" height="15" rx="3" fill="#4DD4AC"/>
            <rect x="43" y="8" width="22" height="15" rx="3" fill="#4DD4AC"/>
            <circle cx="20" cy="50" r="10" fill="#1A1A1A"/>
            <circle cx="60" cy="50" r="10" fill="#1A1A1A"/>
            <circle cx="20" cy="50" r="5" fill="#333"/>
            <circle cx="60" cy="50" r="5" fill="#333"/>
            <!-- Headlights -->
            <ellipse cx="85" cy="35" rx="15" ry="8" fill="#FFD700" opacity="0.3"/>
          </g>
          <!-- Speed lines -->
          <path d="M60 155 L30 155" stroke="#00A86B" stroke-width="2" opacity="0.5"/>
          <path d="M70 165 L35 165" stroke="#00A86B" stroke-width="2" opacity="0.3"/>
          <!-- Logo -->
          <g transform="translate(120, 70)">
            <circle cx="30" cy="30" r="25" stroke="#00A86B" stroke-width="3" fill="none"/>
            <path d="M30 15L42 40H18L30 15Z" fill="#00A86B"/>
            <circle cx="30" cy="32" r="6" fill="#00A86B"/>
          </g>
        </svg>
      </div>
      <h1 class="hero-title">เข้าสู่ระบบ<br/>เพื่อดำเนินการต่อ</h1>
    </div>

    <!-- Login Form -->
    <div class="auth-content">
      <div class="method-toggle">
        <button
          @click="loginMethod = 'otp'; resetOtpState()"
          :class="['toggle-option', { active: loginMethod === 'otp' }]"
        >
          OTP ทางอีเมล
        </button>
        <button
          @click="loginMethod = 'password'; resetOtpState()"
          :class="['toggle-option', { active: loginMethod === 'password' }]"
        >
          รหัสผ่าน
        </button>
      </div>

      <div v-if="error" class="error-message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
        {{ error }}
      </div>
      <div v-if="successMessage" class="success-message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <path d="M22 4L12 14.01l-3-3"/>
        </svg>
        {{ successMessage }}
      </div>

      <!-- Email OTP Login -->
      <div v-if="loginMethod === 'otp'">
        <div v-if="!isOtpSent">
          <div class="form-group">
            <label class="label">อีเมล</label>
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M22 6l-10 7L2 6"/>
              </svg>
              <input 
                v-model="email" 
                type="email" 
                placeholder="email@example.com" 
                class="input-field"
                @keyup.enter="sendEmailOtp"
              />
            </div>
            <p v-if="email && !isEmailValid" class="error-text">รูปแบบอีเมลไม่ถูกต้อง</p>
          </div>
          <button @click="sendEmailOtp" :disabled="!isEmailValid || isLoading" class="btn-primary">
            <span v-if="isLoading" class="btn-loading"><span class="spinner"></span>กำลังส่ง OTP</span>
            <span v-else>ส่งรหัส OTP</span>
          </button>
        </div>
        <div v-else>
          <div class="form-group">
            <label class="label">รหัส OTP</label>
            <p class="helper-text">ส่งไปยัง {{ email }}</p>
            <input 
              v-model="otp" 
              type="text" 
              maxlength="6" 
              placeholder="000000" 
              class="input-field otp-input"
              @keyup.enter="verifyEmailOtp"
            />
          </div>
          <button @click="verifyEmailOtp" :disabled="otp.length !== 6 || isLoading" class="btn-primary">
            <span v-if="isLoading" class="btn-loading"><span class="spinner"></span>กำลังตรวจสอบ</span>
            <span v-else>ยืนยัน OTP</span>
          </button>
          <div class="otp-actions">
            <button @click="resetOtpState" class="text-btn">เปลี่ยนอีเมล</button>
            <button @click="sendEmailOtp" :disabled="isLoading" class="text-btn">ส่ง OTP อีกครั้ง</button>
          </div>
        </div>
      </div>

      <!-- Password Login -->
      <div v-else>
        <div class="form-group">
          <label class="label">อีเมล</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M22 6l-10 7L2 6"/>
            </svg>
            <input v-model="email" type="email" placeholder="email@example.com" class="input-field" />
          </div>
        </div>
        <div class="form-group">
          <label class="label">รหัสผ่าน</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <input 
              v-model="password" 
              type="password" 
              placeholder="รหัสผ่าน" 
              class="input-field"
              @keyup.enter="loginWithPassword"
            />
          </div>
        </div>
        
        <div class="form-options">
          <label class="remember-me">
            <input type="checkbox" v-model="rememberMe" class="checkbox" />
            <span>จดจำการเข้าสู่ระบบ</span>
          </label>
          <button class="forgot-btn">ลืมรหัสผ่าน?</button>
        </div>
        
        <button @click="loginWithPassword" :disabled="!email || !password || isLoading" class="btn-primary">
          <span v-if="isLoading" class="btn-loading"><span class="spinner"></span>กำลังเข้าสู่ระบบ</span>
          <span v-else>เข้าสู่ระบบ</span>
        </button>
        
        <!-- Test Accounts -->
        <div class="demo-section">
          <p class="demo-hint">บัญชีทดสอบ:</p>
          <div class="demo-btns">
            <button 
              v-for="account in testAccounts" 
              :key="'fill-' + account.email"
              @click="selectTestAccount(account)"
              class="demo-btn"
            >
              {{ account.label }}
            </button>
          </div>
        </div>
        
        <!-- Fill Toast -->
        <Transition name="toast">
          <div v-if="showFillToast" class="fill-toast">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
            กรอกข้อมูล {{ filledAccount }} แล้ว
          </div>
        </Transition>
      </div>

      <div class="register-link">
        <span>ยังไม่มีบัญชี?</span>
        <button @click="goToRegister" class="link-btn">สมัครสมาชิก</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  background-color: #FFFFFF;
}

/* Hero Section */
.hero-section {
  background: linear-gradient(180deg, #1A1A2E 0%, #16213E 100%);
  padding: 40px 24px 48px;
  text-align: center;
}

.hero-illustration {
  margin-bottom: 24px;
}

.hero-illustration svg {
  width: 100%;
  max-width: 300px;
  height: auto;
  border-radius: 20px;
}

.hero-title {
  font-size: 28px;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.3;
}

/* Auth Content */
.auth-content {
  padding: 24px 20px 40px;
  max-width: 400px;
  margin: 0 auto;
  margin-top: -20px;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  position: relative;
}

.method-toggle {
  display: flex;
  background-color: #F5F5F5;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
}

.toggle-option {
  flex: 1;
  padding: 14px;
  background: none;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #999999;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-option.active {
  background-color: #FFFFFF;
  color: #00A86B;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.error-message,
.success-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 14px;
  margin-bottom: 20px;
}

.error-message {
  background-color: #FFEBEE;
  color: #E53935;
}

.success-message {
  background-color: #E8F5EF;
  color: #00A86B;
}

.error-message svg,
.success-message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.form-group {
  margin-bottom: 20px;
}

.label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #999999;
}

.input-field {
  width: 100%;
  padding: 16px 16px 16px 48px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.2s ease;
  background: #FFFFFF;
}

.input-field:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 4px rgba(0, 168, 107, 0.1);
}

.input-field::placeholder {
  color: #CCCCCC;
}

.otp-input {
  padding-left: 16px;
  text-align: center;
  font-size: 28px;
  letter-spacing: 12px;
  font-weight: 600;
}

.helper-text {
  font-size: 13px;
  color: #666666;
  margin-bottom: 12px;
}

.error-text {
  font-size: 12px;
  color: #E53935;
  margin-top: 6px;
}

.btn-primary {
  width: 100%;
  padding: 18px 24px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: #008F5B;
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background: #CCCCCC;
  box-shadow: none;
  cursor: not-allowed;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.otp-actions {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
}

.text-btn {
  background: none;
  border: none;
  color: #00A86B;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.text-btn:hover {
  text-decoration: underline;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #666666;
}

.checkbox {
  width: 20px;
  height: 20px;
  accent-color: #00A86B;
  cursor: pointer;
}

.forgot-btn {
  background: none;
  border: none;
  color: #00A86B;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.demo-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #F0F0F0;
}

.demo-hint {
  font-size: 12px;
  color: #999999;
  text-align: center;
  margin-bottom: 12px;
}

.demo-btns {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.demo-btn {
  padding: 10px 18px;
  background: #F5F5F5;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s ease;
}

.demo-btn:hover {
  background: #00A86B;
  color: #FFFFFF;
}

.demo-btn:active {
  transform: scale(0.95);
}

.fill-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: #1A1A1A;
  color: #FFFFFF;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.fill-toast svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

.toast-enter-active {
  animation: toastIn 0.3s ease;
}

.toast-leave-active {
  animation: toastOut 0.3s ease;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
}

.register-link {
  margin-top: 32px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.register-link span {
  font-size: 14px;
  color: #666666;
}

.link-btn {
  background: none;
  border: none;
  color: #00A86B;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}
</style>
