<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { validateThaiPhoneNumber, formatThaiPhoneNumber } from '../utils/validation'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loginMethod = ref<'phone' | 'email'>('email')
const phone = ref('')
const email = ref('')
const password = ref('')
const otp = ref('')
const isOtpSent = ref(false)
const isLoading = ref(false)

const rememberMe = ref(true)
const error = ref('')
const showFillToast = ref(false)
const filledAccount = ref('')

// Demo accounts - login จริงผ่าน Supabase
const demoAccounts = [
  { label: 'ลูกค้า', email: 'customer@demo.com', password: 'demo1234', role: 'customer' },
  { label: 'คนขับ', email: 'driver1@demo.com', password: 'driver1234', role: 'rider' },
  { label: 'แอดมิน', email: 'admin@demo.com', password: 'admin1234', role: 'admin' }
]

const selectDemoAccount = (account: typeof demoAccounts[0]) => {
  email.value = account.email
  password.value = account.password
  loginMethod.value = 'email'
  error.value = ''
  
  // Show toast feedback
  filledAccount.value = account.label
  showFillToast.value = true
  setTimeout(() => {
    showFillToast.value = false
  }, 2000)
}



const formattedPhone = computed(() => formatThaiPhoneNumber(phone.value))
const isPhoneValid = computed(() => validateThaiPhoneNumber(phone.value))

const sendOtp = async () => {
  if (!isPhoneValid.value) {
    error.value = 'กรุณาใส่เบอร์โทรศัพท์ที่ถูกต้อง'
    return
  }
  isLoading.value = true
  error.value = ''
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    isOtpSent.value = true
  } catch {
    error.value = 'ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่'
  } finally {
    isLoading.value = false
  }
}

const verifyOtp = async () => {
  if (otp.value.length !== 6) {
    error.value = 'กรุณาใส่รหัส OTP 6 หลัก'
    return
  }
  isLoading.value = true
  error.value = ''
  try {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    router.push('/')
  } catch {
    error.value = 'รหัส OTP ไม่ถูกต้อง'
  } finally {
    isLoading.value = false
  }
}

const loginWithEmail = async () => {
  if (!email.value || !password.value) {
    error.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
    return
  }
  isLoading.value = true
  error.value = ''
  try {
    const success = await authStore.login(email.value, password.value)
    if (success) {
      // Redirect based on user role
      const userRole = authStore.user?.role
      if (userRole === 'rider' || userRole === 'driver') {
        router.push('/provider')
      } else if (userRole === 'admin') {
        router.push('/admin')
      } else {
        router.push('/')
      }
    } else {
      error.value = authStore.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
    }
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    isLoading.value = false
  }
}

const goToRegister = () => router.push('/register')


</script>

<template>
  <div class="auth-page">
    <div class="auth-header">
      <h1 class="auth-logo">ThaiRide</h1>
      <p class="auth-subtitle">เข้าสู่ระบบ</p>
    </div>

    <div class="auth-content">
      <div class="method-toggle">
        <button
          @click="loginMethod = 'phone'"
          :class="['toggle-option', { active: loginMethod === 'phone' }]"
        >
          เบอร์โทรศัพท์
        </button>
        <button
          @click="loginMethod = 'email'"
          :class="['toggle-option', { active: loginMethod === 'email' }]"
        >
          อีเมล
        </button>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>

      <div v-if="loginMethod === 'phone'">
        <div v-if="!isOtpSent">
          <div class="form-group">
            <label class="label">เบอร์โทรศัพท์</label>
            <input v-model="phone" type="tel" placeholder="081-234-5678" class="input-field" />
            <p v-if="phone && !isPhoneValid" class="error-text">เบอร์โทรศัพท์ไม่ถูกต้อง</p>
          </div>
          <button @click="sendOtp" :disabled="!isPhoneValid || isLoading" class="btn-primary">
            <span v-if="isLoading" class="btn-loading"><span class="spinner"></span>กำลังส่ง OTP</span>
            <span v-else>ส่งรหัส OTP</span>
          </button>
        </div>
        <div v-else>
          <div class="form-group">
            <label class="label">รหัส OTP</label>
            <p class="helper-text">ส่งไปยัง {{ formattedPhone }}</p>
            <input v-model="otp" type="text" maxlength="6" placeholder="123456" class="input-field otp-input" />
          </div>
          <button @click="verifyOtp" :disabled="otp.length !== 6 || isLoading" class="btn-primary">
            <span v-if="isLoading" class="btn-loading"><span class="spinner"></span>กำลังตรวจสอบ</span>
            <span v-else>ยืนยัน OTP</span>
          </button>
          <button @click="isOtpSent = false" class="btn-secondary change-btn">เปลี่ยนเบอร์โทรศัพท์</button>
        </div>
      </div>

      <div v-else>
        <div class="form-group">
          <label class="label">อีเมล</label>
          <input v-model="email" type="email" placeholder="email@example.com" class="input-field" />
        </div>
        <div class="form-group">
          <label class="label">รหัสผ่าน</label>
          <input v-model="password" type="password" placeholder="รหัสผ่าน" class="input-field" />
        </div>
        <label class="remember-me">
          <input type="checkbox" v-model="rememberMe" class="checkbox" />
          <span>จดจำการเข้าสู่ระบบ</span>
        </label>
        <button @click="loginWithEmail" :disabled="!email || !password || isLoading" class="btn-primary">
          <span v-if="isLoading" class="btn-loading"><span class="spinner"></span>กำลังเข้าสู่ระบบ</span>
          <span v-else>เข้าสู่ระบบ</span>
        </button>
        
        <!-- Demo Quick Fill -->
        <div class="demo-fill-section">
          <p class="demo-hint">กรอกอัตโนมัติ:</p>
          <div class="demo-fill-btns">
            <button 
              v-for="account in demoAccounts" 
              :key="'fill-' + account.email"
              @click="selectDemoAccount(account)"
              class="demo-fill-btn"
              :title="account.email"
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
        
        <button class="forgot-btn">ลืมรหัสผ่าน?</button>
      </div>

      <div class="register-link">
        <p>ยังไม่มีบัญชี?</p>
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

.auth-header {
  background-color: #000000;
  color: #FFFFFF;
  padding: 48px 24px 32px;
  text-align: center;
}

.auth-logo {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.auth-subtitle {
  font-size: 16px;
  opacity: 0.8;
}

.auth-content {
  padding: 24px 16px;
  max-width: 400px;
  margin: 0 auto;
}

/* Demo Fill Section */
.demo-fill-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E5E5E5;
}

.demo-hint {
  font-size: 12px;
  color: #6B6B6B;
  text-align: center;
  margin-bottom: 8px;
}

.demo-fill-btns {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.demo-fill-btn {
  padding: 8px 16px;
  background-color: #F6F6F6;
  border: 1px solid #E5E5E5;
  border-radius: 20px;
  font-size: 13px;
  color: #000000;
  cursor: pointer;
  transition: all 0.2s ease;
}

.demo-fill-btn:hover {
  background-color: #000000;
  color: #FFFFFF;
  border-color: #000000;
}

.demo-fill-btn:active {
  transform: scale(0.95);
}

/* Fill Toast */
.fill-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background-color: #000000;
  color: #FFFFFF;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
}

.fill-toast svg {
  width: 18px;
  height: 18px;
  color: #4ADE80;
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

/* Remember Me */
.remember-me {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  cursor: pointer;
  font-size: 14px;
  color: #000000;
}

.checkbox {
  width: 20px;
  height: 20px;
  accent-color: #000000;
  cursor: pointer;
}

/* Method Toggle */
.method-toggle {
  display: flex;
  background-color: #F6F6F6;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 24px;
}

.toggle-option {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #6B6B6B;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-option.active {
  background-color: #FFFFFF;
  color: #000000;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.error-message {
  background-color: rgba(225, 25, 0, 0.1);
  color: #E11900;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  margin-bottom: 8px;
}

.input-field {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: #000000;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
}

.input-field::placeholder {
  color: #CCCCCC;
}

.otp-input {
  text-align: center;
  font-size: 24px;
  letter-spacing: 8px;
}

.helper-text {
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 8px;
}

.error-text {
  font-size: 12px;
  color: #E11900;
  margin-top: 4px;
}

.btn-primary {
  width: 100%;
  padding: 14px 24px;
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background-color: #CCCCCC;
  cursor: not-allowed;
}

.btn-secondary {
  width: 100%;
  padding: 14px 24px;
  background-color: #F6F6F6;
  color: #000000;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: #EBEBEB;
}

.btn-loading {
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

.change-btn {
  margin-top: 12px;
}

.forgot-btn {
  display: block;
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: none;
  border: none;
  color: #000000;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.forgot-btn:hover {
  opacity: 0.7;
}

.register-link {
  margin-top: 32px;
  text-align: center;
}

.register-link p {
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 8px;
}

.link-btn {
  background: none;
  border: none;
  color: #000000;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
  transition: opacity 0.2s ease;
}

.link-btn:hover {
  opacity: 0.7;
}
</style>
