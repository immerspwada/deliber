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
const socialLoading = ref<'google' | 'facebook' | null>(null)

const rememberMe = ref(true)
const error = ref('')
const successMessage = ref('')
const showFillToast = ref(false)
const filledAccount = ref('')

const testAccounts = [
  { label: 'ลูกค้า', email: 'customer@demo.com', password: 'demo1234', role: 'customer' },
  { label: 'คนขับ', email: 'driver1@demo.com', password: 'demo1234', role: 'driver' },
  { label: 'ไรเดอร์', email: 'rider@demo.com', password: 'demo1234', role: 'rider' },
  { label: 'แอดมิน', email: 'admin@demo.com', password: 'admin1234', role: 'admin' }
]

// Social Login handlers
const loginWithGoogle = async () => {
  socialLoading.value = 'google'
  error.value = ''
  
  try {
    await authStore.loginWithGoogle()
  } catch (err: any) {
    error.value = err.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้'
  } finally {
    socialLoading.value = null
  }
}

const loginWithFacebook = async () => {
  socialLoading.value = 'facebook'
  error.value = ''
  
  try {
    await authStore.loginWithFacebook()
  } catch (err: any) {
    error.value = err.message || 'ไม่สามารถเข้าสู่ระบบด้วย Facebook ได้'
  } finally {
    socialLoading.value = null
  }
}

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
  <div class="login-page">
    <div class="login-container">
      <!-- Logo & Welcome -->
      <div class="logo-section">
        <div class="logo-circle">
          <svg viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#00A86B" stroke-width="3"/>
            <path d="M24 12L34 32H14L24 12Z" fill="#00A86B"/>
            <circle cx="24" cy="28" r="5" fill="#00A86B"/>
          </svg>
        </div>
        <h1 class="welcome-title">ยินดีต้อนรับ</h1>
        <p class="welcome-subtitle">เข้าสู่ระบบเพื่อใช้งาน</p>
      </div>

      <!-- Method Toggle -->
      <div class="method-toggle">
        <button
          @click="loginMethod = 'otp'; resetOtpState()"
          :class="['toggle-btn', { active: loginMethod === 'otp' }]"
        >
          OTP
        </button>
        <button
          @click="loginMethod = 'password'; resetOtpState()"
          :class="['toggle-btn', { active: loginMethod === 'password' }]"
        >
          รหัสผ่าน
        </button>
      </div>

      <!-- Messages -->
      <div v-if="error" class="message error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        {{ error }}
      </div>
      <div v-if="successMessage" class="message success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
        </svg>
        {{ successMessage }}
      </div>

      <!-- OTP Login -->
      <div v-if="loginMethod === 'otp'" class="form-section">
        <div v-if="!isOtpSent">
          <div class="input-group">
            <div class="input-box">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>
              </svg>
              <input v-model="email" type="email" placeholder="อีเมล" @keyup.enter="sendEmailOtp"/>
            </div>
            <p v-if="email && !isEmailValid" class="field-error">รูปแบบอีเมลไม่ถูกต้อง</p>
          </div>
          <button @click="sendEmailOtp" :disabled="!isEmailValid || isLoading" class="btn-primary">
            <span v-if="isLoading" class="loading"><span class="spinner"></span>กำลังส่ง...</span>
            <span v-else>ส่งรหัส OTP</span>
          </button>
        </div>
        <div v-else>
          <p class="otp-hint">ส่งไปยัง {{ email }}</p>
          <div class="input-group">
            <input v-model="otp" type="text" maxlength="6" placeholder="000000" class="otp-field" @keyup.enter="verifyEmailOtp"/>
          </div>
          <button @click="verifyEmailOtp" :disabled="otp.length !== 6 || isLoading" class="btn-primary">
            <span v-if="isLoading" class="loading"><span class="spinner"></span>ตรวจสอบ...</span>
            <span v-else>ยืนยัน OTP</span>
          </button>
          <div class="otp-links">
            <button @click="resetOtpState" class="link-btn">เปลี่ยนอีเมล</button>
            <button @click="sendEmailOtp" :disabled="isLoading" class="link-btn">ส่งอีกครั้ง</button>
          </div>
        </div>
      </div>

      <!-- Password Login -->
      <div v-else class="form-section">
        <div class="input-group">
          <div class="input-box">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>
            </svg>
            <input v-model="email" type="email" placeholder="อีเมล"/>
          </div>
        </div>
        <div class="input-group">
          <div class="input-box">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            <input v-model="password" type="password" placeholder="รหัสผ่าน" @keyup.enter="loginWithPassword"/>
          </div>
        </div>
        
        <div class="form-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="rememberMe"/>
            <span>จดจำฉัน</span>
          </label>
          <button class="link-btn small">ลืมรหัสผ่าน?</button>
        </div>
        
        <button @click="loginWithPassword" :disabled="!email || !password || isLoading" class="btn-primary">
          <span v-if="isLoading" class="loading"><span class="spinner"></span>กำลังเข้าสู่ระบบ...</span>
          <span v-else>เข้าสู่ระบบ</span>
        </button>
        
        <!-- Demo Accounts -->
        <div class="demo-row">
          <span class="demo-label">ทดสอบ:</span>
          <div class="demo-chips">
            <button v-for="acc in testAccounts" :key="acc.email" @click="selectTestAccount(acc)" class="chip">
              {{ acc.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Social Login -->
      <div class="social-section">
        <div class="divider">
          <span>หรือเข้าสู่ระบบด้วย</span>
        </div>
        <div class="social-buttons">
          <button @click="loginWithGoogle" :disabled="!!socialLoading" class="social-btn google">
            <svg v-if="socialLoading !== 'google'" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span v-else class="spinner small"></span>
            <span>Google</span>
          </button>
          <button @click="loginWithFacebook" :disabled="!!socialLoading" class="social-btn facebook">
            <svg v-if="socialLoading !== 'facebook'" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span v-else class="spinner small"></span>
            <span>Facebook</span>
          </button>
        </div>
      </div>

      <!-- Register Link -->
      <div class="register-row">
        <span>ยังไม่มีบัญชี?</span>
        <button @click="goToRegister" class="link-btn accent">สมัครสมาชิก</button>
      </div>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="showFillToast" class="toast">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
        </svg>
        กรอก {{ filledAccount }} แล้ว
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #E8F5EF 0%, #FFFFFF 50%, #F0FDF4 100%);
  padding: 16px;
}

.login-container {
  width: 100%;
  max-width: 360px;
  background: #FFFFFF;
  border-radius: 24px;
  padding: 28px 24px;
  box-shadow: 0 8px 32px rgba(0, 168, 107, 0.12);
}

/* Logo Section */
.logo-section {
  text-align: center;
  margin-bottom: 20px;
}

.logo-circle {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
}

.logo-circle svg {
  width: 100%;
  height: 100%;
}

.welcome-title {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.welcome-subtitle {
  font-size: 13px;
  color: #666666;
  margin: 4px 0 0;
}

/* Method Toggle */
.method-toggle {
  display: flex;
  background: #F5F5F5;
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 16px;
}

.toggle-btn {
  flex: 1;
  padding: 10px;
  background: none;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #999999;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: #FFFFFF;
  color: #00A86B;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

/* Messages */
.message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 12px;
}

.message svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.message.error {
  background: #FFEBEE;
  color: #E53935;
}

.message.success {
  background: #E8F5EF;
  color: #00A86B;
}

/* Form Section */
.form-section {
  margin-bottom: 16px;
}

.input-group {
  margin-bottom: 12px;
}

.input-box {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #999999;
}

.input-box input {
  width: 100%;
  padding: 14px 14px 14px 44px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s;
  background: #FFFFFF;
}

.input-box input:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.input-box input::placeholder {
  color: #CCCCCC;
}

.field-error {
  font-size: 11px;
  color: #E53935;
  margin: 4px 0 0 4px;
}

.otp-hint {
  font-size: 12px;
  color: #666666;
  text-align: center;
  margin-bottom: 12px;
}

.otp-field {
  width: 100%;
  padding: 14px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 24px;
  text-align: center;
  letter-spacing: 10px;
  font-weight: 600;
}

.otp-field:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

/* Buttons */
.btn-primary {
  width: 100%;
  padding: 14px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.25);
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

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Links */
.link-btn {
  background: none;
  border: none;
  color: #00A86B;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}

.link-btn:hover {
  text-decoration: underline;
}

.link-btn.small {
  font-size: 12px;
}

.link-btn.accent {
  font-weight: 600;
}

.otp-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 12px;
}

/* Form Row */
.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666666;
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  accent-color: #00A86B;
}

/* Demo Row */
.demo-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #F0F0F0;
}

.demo-label {
  font-size: 11px;
  color: #999999;
  white-space: nowrap;
}

.demo-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  padding: 6px 12px;
  background: #F5F5F5;
  border: none;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 500;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  background: #00A86B;
  color: #FFFFFF;
}

.chip:active {
  transform: scale(0.95);
}

/* Register Row */
.register-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666666;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #1A1A1A;
  color: #FFFFFF;
  border-radius: 24px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.toast svg {
  width: 18px;
  height: 18px;
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

/* Mobile Optimization */
@media (max-height: 700px) {
  .login-container {
    padding: 20px;
  }
  
  .logo-circle {
    width: 52px;
    height: 52px;
    margin-bottom: 8px;
  }
  
  .welcome-title {
    font-size: 20px;
  }
  
  .logo-section {
    margin-bottom: 16px;
  }
  
  .input-box input,
  .otp-field {
    padding: 12px 12px 12px 40px;
  }
  
  .otp-field {
    padding: 12px;
    font-size: 22px;
  }
  
  .btn-primary {
    padding: 12px;
  }
  
  .demo-row {
    margin-top: 10px;
    padding-top: 10px;
  }
}
</style>
