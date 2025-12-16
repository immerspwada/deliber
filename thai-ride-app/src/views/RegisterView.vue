<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  validateThaiNationalId, 
  validateThaiPhoneNumber, 
  validateEmail,
  validateThaiName,
  validatePassword,
  formatThaiNationalId,
  formatThaiPhoneNumber
} from '../utils/validation'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()

// Steps: 1=Role, 2=Personal, 3=Contact+OTP, 4=Password
const step = ref(1)
const isLoading = ref(false)
const error = ref('')
const successMessage = ref('')

// Step 1: Role
const selectedRole = ref<'customer' | 'driver' | 'rider'>('customer')

// Step 2: Personal Info
const firstName = ref('')
const lastName = ref('')
const nationalId = ref('')

// Step 3: Contact + OTP
const phone = ref('')
const email = ref('')
const otpSent = ref(false)
const otpCode = ref('')
const otpVerified = ref(false)
const otpCountdown = ref(0)
let otpTimer: ReturnType<typeof setInterval> | null = null

// Step 4: Password
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const acceptTerms = ref(false)

// Validations
const isFirstNameValid = computed(() => firstName.value.length === 0 || validateThaiName(firstName.value))
const isLastNameValid = computed(() => lastName.value.length === 0 || validateThaiName(lastName.value))
const isNationalIdValid = computed(() => nationalId.value.length === 0 || validateThaiNationalId(nationalId.value))

const isEmailValid = computed(() => email.value.length === 0 || validateEmail(email.value))
const passwordValidation = computed(() => validatePassword(password.value))
const isPasswordMatch = computed(() => password.value === confirmPassword.value)

const formattedNationalId = computed(() => formatThaiNationalId(nationalId.value))
const formattedPhone = computed(() => formatThaiPhoneNumber(phone.value))

// Step validations
const canProceedStep1 = computed(() => !!selectedRole.value)

const canProceedStep2 = computed(() => 
  firstName.value.trim().length >= 2 && 
  lastName.value.trim().length >= 2 && 
  validateThaiName(firstName.value) && 
  validateThaiName(lastName.value) &&
  validateThaiNationalId(nationalId.value)
)

const canProceedStep3 = computed(() => 
  validateThaiPhoneNumber(phone.value) && 
  validateEmail(email.value) &&
  otpVerified.value
)

const canSubmit = computed(() => 
  passwordValidation.value.valid && 
  isPasswordMatch.value && 
  acceptTerms.value
)

// Role info
const roleInfo = {
  customer: {
    title: 'ผู้โดยสาร',
    desc: 'เรียกรถ สั่งอาหาร ส่งของ',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
  },
  driver: {
    title: 'คนขับรถ',
    desc: 'รับส่งผู้โดยสาร',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
  },
  rider: {
    title: 'ไรเดอร์',
    desc: 'ส่งอาหาร ส่งพัสดุ',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`
  }
}

// OTP Functions
const startOtpCountdown = () => {
  otpCountdown.value = 60
  if (otpTimer) clearInterval(otpTimer)
  otpTimer = setInterval(() => {
    otpCountdown.value--
    if (otpCountdown.value <= 0) {
      clearInterval(otpTimer!)
      otpTimer = null
    }
  }, 1000)
}

const sendOtp = async () => {
  if (!validateThaiPhoneNumber(phone.value)) {
    error.value = 'กรุณาใส่เบอร์โทรศัพท์ที่ถูกต้อง'
    return
  }
  
  isLoading.value = true
  error.value = ''
  
  try {
    // Format phone for Supabase (+66)
    let formattedPhone = phone.value.replace(/[-\s]/g, '')
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+66' + formattedPhone.slice(1)
    }
    
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: formattedPhone
    })
    
    if (otpError) {
      // For demo, allow proceeding without real OTP
      console.warn('OTP send failed:', otpError.message)
      error.value = 'ไม่สามารถส่ง OTP ได้ (Demo: ใส่ 123456)'
    }
    
    otpSent.value = true
    startOtpCountdown()
    successMessage.value = 'ส่งรหัส OTP แล้ว'
    setTimeout(() => successMessage.value = '', 3000)
  } catch (err: any) {
    error.value = 'ไม่สามารถส่ง OTP ได้'
    otpSent.value = true // Allow demo mode
    startOtpCountdown()
  } finally {
    isLoading.value = false
  }
}

const verifyOtp = async () => {
  if (otpCode.value.length !== 6) {
    error.value = 'กรุณาใส่รหัส OTP 6 หลัก'
    return
  }
  
  isLoading.value = true
  error.value = ''
  
  try {
    // Demo mode: accept 123456
    if (otpCode.value === '123456') {
      otpVerified.value = true
      successMessage.value = 'ยืนยันเบอร์โทรสำเร็จ'
      setTimeout(() => successMessage.value = '', 3000)
      isLoading.value = false
      return
    }
    
    let formattedPhone = phone.value.replace(/[-\s]/g, '')
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+66' + formattedPhone.slice(1)
    }
    
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otpCode.value,
      type: 'sms'
    })
    
    if (verifyError) {
      error.value = 'รหัส OTP ไม่ถูกต้อง'
      return
    }
    
    otpVerified.value = true
    successMessage.value = 'ยืนยันเบอร์โทรสำเร็จ'
    setTimeout(() => successMessage.value = '', 3000)
  } catch (err: any) {
    error.value = 'รหัส OTP ไม่ถูกต้อง'
  } finally {
    isLoading.value = false
  }
}



// Navigation
const nextStep = () => {
  error.value = ''
  if (step.value === 1 && canProceedStep1.value) step.value = 2
  else if (step.value === 2 && canProceedStep2.value) step.value = 3
  else if (step.value === 3 && canProceedStep3.value) step.value = 4
}

const prevStep = () => {
  error.value = ''
  if (step.value > 1) step.value--
}

// Submit Registration
const submitRegistration = async () => {
  if (!canSubmit.value) return
  
  isLoading.value = true
  error.value = ''
  
  try {
    const fullName = `${firstName.value} ${lastName.value}`.trim()
    const cleanPhone = phone.value.replace(/[-\s]/g, '')
    const cleanNationalId = nationalId.value.replace(/[-\s]/g, '')
    
    const success = await authStore.register(email.value, password.value, {
      name: fullName,
      phone: cleanPhone,
      role: selectedRole.value,
      nationalId: cleanNationalId
    })
    
    if (success) {
      successMessage.value = 'สมัครสมาชิกสำเร็จ! กรุณายืนยันอีเมล'
      setTimeout(() => {
        router.push({ path: '/verify-email', query: { email: email.value } })
      }, 1500)
    } else {
      error.value = authStore.error || 'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่'
    }
  } catch (err: any) {
    error.value = err.message || 'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่'
  } finally {
    isLoading.value = false
  }
}

const goToLogin = () => router.push('/login')

// Auto-format national ID
watch(nationalId, (val) => {
  const clean = val.replace(/\D/g, '').slice(0, 13)
  if (clean !== val.replace(/\D/g, '')) {
    nationalId.value = clean
  }
})

// Auto-format phone
watch(phone, (val) => {
  const clean = val.replace(/[^\d+]/g, '').slice(0, 12)
  if (clean !== val.replace(/[^\d+]/g, '')) {
    phone.value = clean
  }
})
</script>

<template>
  <div class="register-page">
    <!-- Header -->
    <div class="register-header">
      <button @click="step > 1 ? prevStep() : goToLogin()" class="back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1 class="header-title">สมัครสมาชิก</h1>
      <div class="header-spacer"></div>
    </div>

    <!-- Progress -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${(step / 4) * 100}%` }"></div>
    </div>

    <div class="register-content">
      <!-- Messages -->
      <div v-if="error" class="message error-message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        {{ error }}
      </div>
      <div v-if="successMessage" class="message success-message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
        </svg>
        {{ successMessage }}
      </div>

      <!-- Step 1: Role Selection -->
      <div v-if="step === 1" class="step-content">
        <h2 class="step-title">คุณต้องการใช้งานแบบไหน?</h2>
        <p class="step-desc">เลือกประเภทบัญชีที่ต้องการ</p>
        
        <div class="role-options">
          <button 
            v-for="(info, role) in roleInfo" 
            :key="role"
            @click="selectedRole = role as 'customer' | 'driver' | 'rider'"
            :class="['role-card', { 'role-card-active': selectedRole === role }]"
          >
            <div class="role-icon" v-html="info.icon"></div>
            <div class="role-info">
              <span class="role-title">{{ info.title }}</span>
              <span class="role-desc">{{ info.desc }}</span>
            </div>
            <div class="role-check">
              <svg v-if="selectedRole === role" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
          </button>
        </div>

        <button @click="nextStep" :disabled="!canProceedStep1" class="btn-primary">
          ถัดไป
        </button>
      </div>

      <!-- Step 2: Personal Info -->
      <div v-if="step === 2" class="step-content">
        <h2 class="step-title">ข้อมูลส่วนตัว</h2>
        <p class="step-desc">กรอกข้อมูลตามบัตรประชาชน</p>
        
        <div class="form-row">
          <div class="form-group">
            <label class="label">ชื่อ</label>
            <input 
              v-model="firstName" 
              type="text" 
              placeholder="ชื่อจริง" 
              class="input-field"
              :class="{ 'input-error': firstName && !isFirstNameValid }"
            />
            <p v-if="firstName && !isFirstNameValid" class="error-text">กรุณาใส่ชื่อที่ถูกต้อง</p>
          </div>
          <div class="form-group">
            <label class="label">นามสกุล</label>
            <input 
              v-model="lastName" 
              type="text" 
              placeholder="นามสกุล" 
              class="input-field"
              :class="{ 'input-error': lastName && !isLastNameValid }"
            />
            <p v-if="lastName && !isLastNameValid" class="error-text">กรุณาใส่นามสกุลที่ถูกต้อง</p>
          </div>
        </div>

        <div class="form-group">
          <label class="label">เลขบัตรประชาชน</label>
          <input 
            v-model="nationalId" 
            type="text" 
            inputmode="numeric"
            maxlength="13" 
            placeholder="1234567890123" 
            class="input-field"
            :class="{ 
              'input-error': nationalId.length === 13 && !isNationalIdValid,
              'input-success': nationalId.length === 13 && isNationalIdValid
            }"
          />
          <p v-if="nationalId.length === 13 && validateThaiNationalId(nationalId)" class="success-text">
            {{ formattedNationalId }}
          </p>
          <p v-if="nationalId.length === 13 && !validateThaiNationalId(nationalId)" class="error-text">
            เลขบัตรประชาชนไม่ถูกต้อง
          </p>
        </div>

        <div class="button-group">
          <button @click="prevStep" class="btn-secondary">ย้อนกลับ</button>
          <button @click="nextStep" :disabled="!canProceedStep2" class="btn-primary">ถัดไป</button>
        </div>
      </div>

      <!-- Step 3: Contact + OTP -->
      <div v-if="step === 3" class="step-content">
        <h2 class="step-title">ข้อมูลติดต่อ</h2>
        <p class="step-desc">ยืนยันเบอร์โทรศัพท์ด้วย OTP</p>
        
        <div class="form-group">
          <label class="label">เบอร์โทรศัพท์</label>
          <div class="input-with-btn">
            <input 
              v-model="phone" 
              type="tel" 
              inputmode="tel"
              placeholder="0812345678" 
              class="input-field"
              :class="{ 'input-success': otpVerified }"
              :disabled="otpVerified"
            />
            <button 
              v-if="!otpVerified"
              @click="sendOtp" 
              :disabled="!validateThaiPhoneNumber(phone) || isLoading || otpCountdown > 0"
              class="input-btn"
            >
              {{ otpSent ? (otpCountdown > 0 ? `${otpCountdown}s` : 'ส่งใหม่') : 'ส่ง OTP' }}
            </button>
            <span v-else class="verified-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
              ยืนยันแล้ว
            </span>
          </div>
          <p v-if="phone && validateThaiPhoneNumber(phone) && !otpVerified" class="helper-text">
            {{ formattedPhone }}
          </p>
          <p v-if="phone && !validateThaiPhoneNumber(phone)" class="error-text">เบอร์โทรศัพท์ไม่ถูกต้อง</p>
        </div>

        <!-- OTP Input -->
        <div v-if="otpSent && !otpVerified" class="form-group">
          <label class="label">รหัส OTP</label>
          <div class="otp-container">
            <input 
              v-model="otpCode" 
              type="text" 
              inputmode="numeric"
              maxlength="6" 
              placeholder="000000" 
              class="input-field otp-input"
            />
            <button 
              @click="verifyOtp" 
              :disabled="otpCode.length !== 6 || isLoading"
              class="btn-verify"
            >
              <span v-if="isLoading" class="spinner"></span>
              <span v-else>ยืนยัน</span>
            </button>
          </div>
          <p class="helper-text">Demo: ใส่ 123456</p>
        </div>

        <div class="form-group">
          <label class="label">อีเมล</label>
          <input 
            v-model="email" 
            type="email" 
            inputmode="email"
            placeholder="email@example.com" 
            class="input-field"
            :class="{ 'input-error': email && !isEmailValid }"
          />
          <p v-if="email && !isEmailValid" class="error-text">อีเมลไม่ถูกต้อง</p>
        </div>

        <div class="button-group">
          <button @click="prevStep" class="btn-secondary">ย้อนกลับ</button>
          <button @click="nextStep" :disabled="!canProceedStep3" class="btn-primary">ถัดไป</button>
        </div>
      </div>

      <!-- Step 4: Password -->
      <div v-if="step === 4" class="step-content">
        <h2 class="step-title">ตั้งรหัสผ่าน</h2>
        <p class="step-desc">รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร</p>
        
        <div class="form-group">
          <label class="label">รหัสผ่าน</label>
          <div class="password-input">
            <input 
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="รหัสผ่าน" 
              class="input-field"
              :class="{ 'input-error': password && !passwordValidation.valid }"
            />
            <button @click="showPassword = !showPassword" type="button" class="toggle-password">
              <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <p v-if="password && !passwordValidation.valid" class="error-text">{{ passwordValidation.message }}</p>
        </div>

        <div class="form-group">
          <label class="label">ยืนยันรหัสผ่าน</label>
          <div class="password-input">
            <input 
              v-model="confirmPassword" 
              :type="showConfirmPassword ? 'text' : 'password'" 
              placeholder="ยืนยันรหัสผ่าน" 
              class="input-field"
              :class="{ 'input-error': confirmPassword && !isPasswordMatch }"
            />
            <button @click="showConfirmPassword = !showConfirmPassword" type="button" class="toggle-password">
              <svg v-if="showConfirmPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <p v-if="confirmPassword && !isPasswordMatch" class="error-text">รหัสผ่านไม่ตรงกัน</p>
        </div>

        <!-- Password Requirements -->
        <div class="password-requirements">
          <div :class="['req-item', { 'req-met': password.length >= 8 }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            อย่างน้อย 8 ตัวอักษร
          </div>
          <div :class="['req-item', { 'req-met': /[a-zA-Z]/.test(password) }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            มีตัวอักษร (a-z, A-Z)
          </div>
          <div :class="['req-item', { 'req-met': /\d/.test(password) }]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            มีตัวเลข (0-9)
          </div>
        </div>

        <label class="terms-checkbox">
          <input v-model="acceptTerms" type="checkbox" />
          <span class="checkmark"></span>
          <span class="terms-text">
            ฉันยอมรับ <a href="#" @click.prevent>ข้อกำหนดและเงื่อนไข</a> และ <a href="#" @click.prevent>นโยบายความเป็นส่วนตัว</a>
          </span>
        </label>

        <div class="button-group">
          <button @click="prevStep" class="btn-secondary">ย้อนกลับ</button>
          <button @click="submitRegistration" :disabled="!canSubmit || isLoading" class="btn-primary">
            <span v-if="isLoading" class="btn-loading">
              <span class="spinner"></span>
              กำลังสมัคร
            </span>
            <span v-else>สมัครสมาชิก</span>
          </button>
        </div>
      </div>

      <!-- Login Link -->
      <div class="login-link">
        <span>มีบัญชีอยู่แล้ว?</span>
        <button @click="goToLogin" class="link-btn">เข้าสู่ระบบ</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  background-color: #FFFFFF;
}

.register-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background-color: #000000;
  color: #FFFFFF;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #FFFFFF;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
}

.header-spacer {
  width: 40px;
}

.progress-bar {
  height: 4px;
  background-color: #E5E5E5;
}

.progress-fill {
  height: 100%;
  background-color: #000000;
  transition: width 0.3s ease;
}

.register-content {
  padding: 24px 16px;
  max-width: 480px;
  margin: 0 auto;
}

.message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.error-message {
  background-color: rgba(225, 25, 0, 0.1);
  color: #E11900;
}

.success-message {
  background-color: rgba(39, 110, 241, 0.1);
  color: #276EF1;
}

.step-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-title {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  margin-bottom: 8px;
}

.step-desc {
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 24px;
}

/* Role Selection */
.role-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.role-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.role-card:hover {
  background-color: #EBEBEB;
}

.role-card-active {
  background-color: #FFFFFF;
  border-color: #000000;
}

.role-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF;
  border-radius: 12px;
}

.role-card-active .role-icon {
  background-color: #000000;
  color: #FFFFFF;
}

.role-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.role-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.role-title {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
}

.role-desc {
  font-size: 13px;
  color: #6B6B6B;
}

.role-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #E5E5E5;
  border-radius: 50%;
}

.role-card-active .role-check {
  background-color: #000000;
  border-color: #000000;
  color: #FFFFFF;
}

.role-check svg {
  width: 14px;
  height: 14px;
}

/* Form Styles */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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
  background-color: #FFFFFF;
}

.input-field:focus {
  outline: none;
  border-color: #000000;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
}

.input-field::placeholder {
  color: #CCCCCC;
}

.input-field:disabled {
  background-color: #F6F6F6;
  color: #6B6B6B;
}

.input-error {
  border-color: #E11900;
}

.input-success {
  border-color: #276EF1;
  background-color: rgba(39, 110, 241, 0.05);
}

.input-with-btn {
  display: flex;
  gap: 8px;
}

.input-with-btn .input-field {
  flex: 1;
}

.input-btn {
  padding: 14px 16px;
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
}

.input-btn:disabled {
  background-color: #CCCCCC;
  cursor: not-allowed;
}

.verified-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  color: #276EF1;
  font-size: 14px;
  font-weight: 500;
}

.verified-badge svg {
  width: 18px;
  height: 18px;
}

.otp-container {
  display: flex;
  gap: 8px;
}

.otp-input {
  flex: 1;
  text-align: center;
  font-size: 20px;
  letter-spacing: 8px;
  font-weight: 600;
}

.btn-verify {
  padding: 14px 24px;
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  min-width: 80px;
}

.btn-verify:disabled {
  background-color: #CCCCCC;
  cursor: not-allowed;
}

.helper-text {
  font-size: 12px;
  color: #6B6B6B;
  margin-top: 6px;
}

.error-text {
  font-size: 12px;
  color: #E11900;
  margin-top: 6px;
}

.success-text {
  font-size: 12px;
  color: #276EF1;
  margin-top: 6px;
}

/* Password Input */
.password-input {
  position: relative;
}

.password-input .input-field {
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
  color: #6B6B6B;
}

.toggle-password svg {
  width: 20px;
  height: 20px;
}

.password-requirements {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
  padding: 12px;
  background-color: #F6F6F6;
  border-radius: 8px;
}

.req-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6B6B6B;
}

.req-item svg {
  width: 16px;
  height: 16px;
  opacity: 0.3;
}

.req-met {
  color: #276EF1;
}

.req-met svg {
  opacity: 1;
  color: #276EF1;
}

/* Terms Checkbox */
.terms-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 24px;
  cursor: pointer;
}

.terms-checkbox input {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #E5E5E5;
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.terms-checkbox input:checked + .checkmark {
  background-color: #000000;
  border-color: #000000;
}

.terms-checkbox input:checked + .checkmark::after {
  content: '';
  width: 6px;
  height: 10px;
  border: solid #FFFFFF;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.terms-text {
  font-size: 14px;
  color: #6B6B6B;
  line-height: 1.5;
}

.terms-text a {
  color: #000000;
  text-decoration: underline;
}

/* Buttons */
.button-group {
  display: flex;
  gap: 12px;
}

.button-group .btn-secondary,
.button-group .btn-primary {
  flex: 1;
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

/* Login Link */
.login-link {
  margin-top: 32px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-link span {
  font-size: 14px;
  color: #6B6B6B;
}

.link-btn {
  background: none;
  border: none;
  color: #000000;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 400px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
