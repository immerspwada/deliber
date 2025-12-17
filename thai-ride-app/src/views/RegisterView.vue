<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  validateThaiPhoneNumber, 
  validateEmail,
  validatePassword,
  formatThaiPhoneNumber
} from '../utils/validation'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const error = ref('')
const successMessage = ref('')

// Form fields
const firstName = ref('')
const lastName = ref('')
const phone = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const acceptTerms = ref(false)

// Validations
const isPhoneValid = computed(() => phone.value.length === 0 || validateThaiPhoneNumber(phone.value))
const isEmailValid = computed(() => email.value.length === 0 || validateEmail(email.value))
const passwordValidation = computed(() => validatePassword(password.value))
const isPasswordMatch = computed(() => password.value === confirmPassword.value)
const formattedPhone = computed(() => formatThaiPhoneNumber(phone.value))

// Email is REQUIRED for real registration
const canSubmit = computed(() => 
  firstName.value.trim().length >= 2 &&
  lastName.value.trim().length >= 2 &&
  validateThaiPhoneNumber(phone.value) &&
  validateEmail(email.value) && // Email required for Supabase auth
  passwordValidation.value.valid && 
  isPasswordMatch.value && 
  acceptTerms.value
)

// Submit Registration - Real Supabase registration
const submitRegistration = async () => {
  if (!canSubmit.value) return
  
  isLoading.value = true
  error.value = ''
  successMessage.value = ''
  
  try {
    const fullName = `${firstName.value} ${lastName.value}`.trim()
    const cleanPhone = phone.value.replace(/[-\s]/g, '')
    
    // Clear any existing demo mode
    localStorage.removeItem('demo_mode')
    localStorage.removeItem('demo_user')
    
    console.log('Starting Supabase registration for:', email.value)
    
    // Register with Supabase
    const success = await authStore.register(email.value, password.value, {
      name: fullName,
      phone: cleanPhone,
      role: 'customer'
    })
    
    if (!success) {
      // Show the actual error from authStore
      error.value = authStore.error || 'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่'
      console.error('Registration failed:', authStore.error)
      return
    }
    
    console.log('Registration successful, attempting login...')
    successMessage.value = 'สมัครสมาชิกสำเร็จ!'
    
    // Auto login after registration
    const loginSuccess = await authStore.login(email.value, password.value)
    
    if (loginSuccess) {
      console.log('Login successful, user ID:', authStore.user?.id)
      // Navigate to saved places setup
      setTimeout(() => {
        router.push('/customer/saved-places?setup=true')
      }, 500)
    } else {
      // Registration succeeded but login failed - redirect to login page
      console.warn('Auto-login failed, redirecting to login page')
      error.value = 'สมัครสำเร็จ! กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่สมัคร'
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  } catch (err: any) {
    console.error('Registration error:', err)
    error.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    isLoading.value = false
  }
}

const goToLogin = () => router.push('/login')

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
      <button @click="goToLogin" class="back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1 class="header-title">สมัครสมาชิก</h1>
      <div class="header-spacer"></div>
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

      <div class="form-content">
        <h2 class="form-title">สร้างบัญชีใหม่</h2>
        <p class="form-desc">กรอกข้อมูลเพื่อเริ่มใช้งาน ThaiRide</p>

        <!-- Name -->
        <div class="form-row">
          <div class="form-group">
            <label class="label">ชื่อ <span class="required">*</span></label>
            <input 
              v-model="firstName" 
              type="text" 
              placeholder="ชื่อจริง" 
              class="input-field"
            />
          </div>
          <div class="form-group">
            <label class="label">นามสกุล <span class="required">*</span></label>
            <input 
              v-model="lastName" 
              type="text" 
              placeholder="นามสกุล" 
              class="input-field"
            />
          </div>
        </div>

        <!-- Phone -->
        <div class="form-group">
          <label class="label">เบอร์โทรศัพท์ <span class="required">*</span></label>
          <input 
            v-model="phone" 
            type="tel" 
            inputmode="tel"
            placeholder="0812345678" 
            class="input-field"
            :class="{ 
              'input-error': phone && !isPhoneValid,
              'input-success': phone && isPhoneValid
            }"
          />
          <p v-if="phone && isPhoneValid" class="success-text">{{ formattedPhone }}</p>
          <p v-if="phone && !isPhoneValid" class="error-text">เบอร์โทรศัพท์ไม่ถูกต้อง</p>
        </div>

        <!-- Email (Required) -->
        <div class="form-group">
          <label class="label">อีเมล <span class="required">*</span></label>
          <input 
            v-model="email" 
            type="email" 
            inputmode="email"
            placeholder="email@example.com" 
            class="input-field"
            :class="{ 
              'input-error': email && !isEmailValid,
              'input-success': email && isEmailValid
            }"
          />
          <p v-if="email && !isEmailValid" class="error-text">อีเมลไม่ถูกต้อง</p>
          <p class="hint-text">ใช้สำหรับเข้าสู่ระบบและรับการแจ้งเตือน</p>
        </div>

        <!-- Password -->
        <div class="form-group">
          <label class="label">รหัสผ่าน <span class="required">*</span></label>
          <div class="password-input">
            <input 
              v-model="password" 
              :type="showPassword ? 'text' : 'password'" 
              placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" 
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

        <!-- Confirm Password -->
        <div class="form-group">
          <label class="label">ยืนยันรหัสผ่าน <span class="required">*</span></label>
          <div class="password-input">
            <input 
              v-model="confirmPassword" 
              :type="showConfirmPassword ? 'text' : 'password'" 
              placeholder="ยืนยันรหัสผ่าน" 
              class="input-field"
              :class="{ 
                'input-error': confirmPassword && !isPasswordMatch,
                'input-success': confirmPassword && isPasswordMatch && passwordValidation.valid
              }"
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
          <p v-if="confirmPassword && isPasswordMatch && passwordValidation.valid" class="success-text">รหัสผ่านตรงกัน</p>
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

        <!-- Terms -->
        <label class="terms-checkbox">
          <input v-model="acceptTerms" type="checkbox" />
          <span class="checkmark"></span>
          <span class="terms-text">
            ฉันยอมรับ <a href="#" @click.prevent>ข้อกำหนดและเงื่อนไข</a> และ <a href="#" @click.prevent>นโยบายความเป็นส่วนตัว</a>
          </span>
        </label>

        <!-- Submit -->
        <button @click="submitRegistration" :disabled="!canSubmit || isLoading" class="btn-primary">
          <span v-if="isLoading" class="btn-loading">
            <span class="spinner"></span>
            กำลังสมัคร
          </span>
          <span v-else>สมัครสมาชิก</span>
        </button>

        <!-- Login Link -->
        <div class="login-link">
          <span>มีบัญชีอยู่แล้ว?</span>
          <button @click="goToLogin" class="link-btn">เข้าสู่ระบบ</button>
        </div>
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

.form-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-title {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  margin-bottom: 8px;
}

.form-desc {
  font-size: 14px;
  color: #6B6B6B;
  margin-bottom: 24px;
}

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

.required {
  color: #E11900;
}

.optional {
  color: #6B6B6B;
  font-weight: 400;
  font-size: 12px;
}

.hint-text {
  font-size: 12px;
  color: #6B6B6B;
  margin-top: 6px;
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

.input-error {
  border-color: #E11900;
}

.input-success {
  border-color: #276EF1;
  background-color: rgba(39, 110, 241, 0.05);
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

.login-link {
  margin-top: 24px;
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

@media (max-width: 400px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
