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

// State
const currentStep = ref(1)
const totalSteps = 2
const isLoading = ref(false)
const error = ref('')
const successMessage = ref('')
const registrationComplete = ref(false)
const memberUid = ref('')

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
const acceptPrivacy = ref(false)
const socialLoading = ref<'google' | 'facebook' | null>(null)

// Validations
const isFirstNameValid = computed(() => firstName.value.trim().length >= 2)
const isLastNameValid = computed(() => lastName.value.trim().length >= 2)
const isPhoneValid = computed(() => !phone.value || validateThaiPhoneNumber(phone.value))
const formattedPhone = computed(() => formatThaiPhoneNumber(phone.value))
const isEmailValid = computed(() => !email.value || validateEmail(email.value))
const passwordValidation = computed(() => validatePassword(password.value))
const isPasswordMatch = computed(() => password.value === confirmPassword.value)

const canProceedStep1 = computed(() => 
  isFirstNameValid.value && 
  isLastNameValid.value && 
  validateThaiPhoneNumber(phone.value) &&
  validateEmail(email.value) && 
  passwordValidation.value.valid && 
  isPasswordMatch.value
)

const canSubmit = computed(() => canProceedStep1.value && acceptTerms.value && acceptPrivacy.value)

// Navigation
const nextStep = (): void => {
  error.value = ''
  if (currentStep.value === 1 && canProceedStep1.value) currentStep.value = 2
}
const prevStep = (): void => { error.value = ''; if (currentStep.value > 1) currentStep.value-- }
const goToLogin = (): void => { router.push('/login') }
const goToHome = (): void => { router.push('/customer') }

// Social Login
const loginWithGoogle = async (): Promise<void> => {
  socialLoading.value = 'google'
  error.value = ''
  try { await authStore.loginWithGoogle() }
  catch (err: unknown) { error.value = (err as Error).message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้' }
  finally { socialLoading.value = null }
}

const loginWithFacebook = async (): Promise<void> => {
  socialLoading.value = 'facebook'
  error.value = ''
  try { await authStore.loginWithFacebook() }
  catch (err: unknown) { error.value = (err as Error).message || 'ไม่สามารถเข้าสู่ระบบด้วย Facebook ได้' }
  finally { socialLoading.value = null }
}

// Submit
const submitRegistration = async (): Promise<void> => {
  if (!canSubmit.value) return
  isLoading.value = true
  error.value = ''
  
  try {
    const fullName = `${firstName.value} ${lastName.value}`.trim()
    const cleanPhone = phone.value.replace(/[-\s]/g, '')
    localStorage.removeItem('demo_mode')
    localStorage.removeItem('demo_user')
    
    const success = await authStore.register(email.value, password.value, {
      name: fullName, phone: cleanPhone, role: 'customer'
    })
    
    if (!success) { error.value = authStore.error || 'ไม่สามารถสมัครสมาชิกได้'; return }
    
    const loginSuccess = await authStore.login(email.value, password.value)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (loginSuccess && authStore.user) {
      memberUid.value = (authStore.user as Record<string, unknown>).member_uid as string || ''
      registrationComplete.value = true
    } else {
      error.value = 'สมัครสำเร็จ! กรุณาเข้าสู่ระบบ'
      setTimeout(() => router.push('/login'), 2000)
    }
  } catch (err: unknown) { error.value = (err as Error).message || 'เกิดข้อผิดพลาด' }
  finally { isLoading.value = false }
}

const copyMemberUid = (): void => {
  if (memberUid.value) {
    navigator.clipboard.writeText(memberUid.value)
    successMessage.value = 'คัดลอกแล้ว!'
    setTimeout(() => successMessage.value = '', 2000)
  }
}

watch(phone, (val) => {
  const clean = val.replace(/[^\d+]/g, '').slice(0, 12)
  if (clean !== val.replace(/[^\d+]/g, '')) phone.value = clean
})
</script>

<template>
  <div class="register-page">
    <!-- Success Screen -->
    <div v-if="registrationComplete" class="success-screen">
      <div class="success-card">
        <div class="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h1>สมัครสมาชิกสำเร็จ!</h1>
        <p>ยินดีต้อนรับสู่ GOBEAR</p>
        
        <div v-if="memberUid" class="member-card">
          <span class="member-label">Member ID</span>
          <span class="member-id">{{ memberUid }}</span>
          <button @click="copyMemberUid" class="copy-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            {{ successMessage || 'คัดลอก' }}
          </button>
        </div>
        
        <button @click="goToHome" class="btn-primary">เริ่มใช้งาน</button>
      </div>
    </div>

    <!-- Registration Form -->
    <template v-else>
      <header class="header">
        <button @click="currentStep > 1 ? prevStep() : goToLogin()" class="back-btn" aria-label="ย้อนกลับ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1>สมัครสมาชิก</h1>
        <div class="spacer"></div>
      </header>

      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: (currentStep / totalSteps * 100) + '%' }"></div>
        </div>
        <span class="progress-text">{{ currentStep }}/{{ totalSteps }}</span>
      </div>

      <main class="main-content">
        <div v-if="error" class="error-alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
          </svg>
          <span>{{ error }}</span>
        </div>

        <!-- Step 1 -->
        <Transition name="slide" mode="out-in">
          <div v-if="currentStep === 1" key="step1" class="form-section">
            <div class="section-header">
              <h2>สร้างบัญชีใหม่</h2>
              <p>กรอกข้อมูลเพื่อเริ่มใช้งาน</p>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>ชื่อ <span class="required">*</span></label>
                <input v-model="firstName" type="text" placeholder="ชื่อจริง" 
                  :class="{ error: firstName && !isFirstNameValid, success: firstName && isFirstNameValid }" />
              </div>
              <div class="form-group">
                <label>นามสกุล <span class="required">*</span></label>
                <input v-model="lastName" type="text" placeholder="นามสกุล"
                  :class="{ error: lastName && !isLastNameValid, success: lastName && isLastNameValid }" />
              </div>
            </div>

            <div class="form-group">
              <label>เบอร์โทรศัพท์ <span class="required">*</span></label>
              <div class="input-with-icon">
                <span class="icon-left">🇹🇭</span>
                <input v-model="phone" type="tel" inputmode="tel" placeholder="0812345678"
                  :class="{ error: phone && !isPhoneValid, success: phone && isPhoneValid }" />
              </div>
              <span v-if="phone && isPhoneValid" class="hint success">{{ formattedPhone }}</span>
              <span v-if="phone && !isPhoneValid" class="hint error">เบอร์โทรศัพท์ไม่ถูกต้อง</span>
            </div>

            <div class="form-group">
              <label>อีเมล <span class="required">*</span></label>
              <input v-model="email" type="email" inputmode="email" placeholder="email@example.com"
                :class="{ error: email && !isEmailValid, success: email && isEmailValid }" />
              <span v-if="email && !isEmailValid" class="hint error">อีเมลไม่ถูกต้อง</span>
            </div>

            <div class="form-group">
              <label>รหัสผ่าน <span class="required">*</span></label>
              <div class="input-with-icon">
                <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="อย่างน้อย 8 ตัวอักษร"
                  :class="{ error: password && !passwordValidation.valid }" />
                <button type="button" @click="showPassword = !showPassword" class="icon-btn" aria-label="แสดงรหัสผ่าน">
                  <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <div class="password-rules">
                <span :class="{ met: password.length >= 8 }">✓ 8 ตัวอักษร</span>
                <span :class="{ met: /[a-zA-Z]/.test(password) }">✓ ตัวอักษร</span>
                <span :class="{ met: /\d/.test(password) }">✓ ตัวเลข</span>
              </div>
            </div>

            <div class="form-group">
              <label>ยืนยันรหัสผ่าน <span class="required">*</span></label>
              <div class="input-with-icon">
                <input v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="ยืนยันรหัสผ่าน"
                  :class="{ error: confirmPassword && !isPasswordMatch, success: confirmPassword && isPasswordMatch && passwordValidation.valid }" />
                <button type="button" @click="showConfirmPassword = !showConfirmPassword" class="icon-btn" aria-label="แสดงรหัสผ่าน">
                  <svg v-if="!showConfirmPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <span v-if="confirmPassword && !isPasswordMatch" class="hint error">รหัสผ่านไม่ตรงกัน</span>
              <span v-if="confirmPassword && isPasswordMatch && passwordValidation.valid" class="hint success">รหัสผ่านตรงกัน ✓</span>
            </div>

            <button @click="nextStep" :disabled="!canProceedStep1" class="btn-primary">ถัดไป</button>

            <div class="divider"><span>หรือสมัครด้วย</span></div>

            <div class="social-buttons">
              <button @click="loginWithGoogle" :disabled="!!socialLoading" class="social-btn">
                <svg v-if="socialLoading !== 'google'" viewBox="0 0 24 24" class="google-icon">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span v-else class="spinner"></span>
                Google
              </button>
              <button @click="loginWithFacebook" :disabled="!!socialLoading" class="social-btn">
                <svg v-if="socialLoading !== 'facebook'" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span v-else class="spinner"></span>
                Facebook
              </button>
            </div>
          </div>

          <!-- Step 2 -->
          <div v-else-if="currentStep === 2" key="step2" class="form-section">
            <div class="section-header">
              <h2>ยืนยันการสมัคร</h2>
              <p>ตรวจสอบข้อมูลและยอมรับเงื่อนไข</p>
            </div>

            <div class="summary-card">
              <h3>ข้อมูลการสมัคร</h3>
              <div class="summary-row">
                <span>ชื่อ-นามสกุล</span>
                <span>{{ firstName }} {{ lastName }}</span>
              </div>
              <div class="summary-row">
                <span>เบอร์โทรศัพท์</span>
                <span>{{ formattedPhone }}</span>
              </div>
              <div class="summary-row">
                <span>อีเมล</span>
                <span>{{ email }}</span>
              </div>
            </div>

            <div class="checkbox-group">
              <label class="checkbox-label">
                <input v-model="acceptTerms" type="checkbox" />
                <span class="checkmark"></span>
                <span>ฉันยอมรับ <a href="#" @click.prevent>ข้อกำหนดและเงื่อนไข</a></span>
              </label>
              <label class="checkbox-label">
                <input v-model="acceptPrivacy" type="checkbox" />
                <span class="checkmark"></span>
                <span>ฉันยอมรับ <a href="#" @click.prevent>นโยบายความเป็นส่วนตัว</a></span>
              </label>
            </div>

            <button @click="submitRegistration" :disabled="!canSubmit || isLoading" class="btn-primary">
              <span v-if="isLoading" class="btn-loading">
                <span class="spinner white"></span>
                กำลังสมัคร...
              </span>
              <span v-else>สมัครสมาชิก</span>
            </button>
          </div>
        </Transition>

        <div class="login-link">
          <span>มีบัญชีอยู่แล้ว?</span>
          <button @click="goToLogin">เข้าสู่ระบบ</button>
        </div>
      </main>
    </template>
  </div>
</template>

<style scoped>
/* Base */
.register-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 50%, #ecfdf5 100%);
}

/* Success Screen */
.success-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.success-card {
  text-align: center;
  max-width: 340px;
  width: 100%;
}

.success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
  animation: pop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.success-icon svg {
  width: 40px;
  height: 40px;
  color: white;
}

@keyframes pop {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

.success-card h1 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px;
}

.success-card > p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px;
}

.member-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.member-label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 8px;
}

.member-id {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #10b981;
  font-family: 'SF Mono', monospace;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f0fdf4;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #10b981;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover { background: #dcfce7; }
.copy-btn svg { width: 16px; height: 16px; }

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #f3f4f6;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  font-size: 17px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.back-btn, .spacer {
  width: 40px;
  height: 40px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.back-btn:hover { background: #f3f4f6; }
.back-btn svg { width: 20px; height: 20px; color: #374151; }

/* Progress */
.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  max-width: 480px;
  margin: 0 auto;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.progress-text {
  font-size: 13px;
  font-weight: 600;
  color: #10b981;
  min-width: 32px;
}

/* Main Content */
.main-content {
  padding: 0 20px 32px;
  max-width: 480px;
  margin: 0 auto;
}

/* Error Alert */
.error-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  margin-bottom: 20px;
}

.error-alert svg {
  width: 20px;
  height: 20px;
  color: #ef4444;
  flex-shrink: 0;
  margin-top: 1px;
}

.error-alert span {
  font-size: 14px;
  color: #dc2626;
  line-height: 1.5;
}

/* Form Section */
.form-section {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px;
}

.section-header p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Form Elements */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.required { color: #ef4444; }

.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 15px;
  color: #111827;
  background: white;
  transition: all 0.2s;
  outline: none;
}

.form-group input::placeholder { color: #9ca3af; }
.form-group input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }
.form-group input.error { border-color: #ef4444; }
.form-group input.error:focus { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1); }
.form-group input.success { border-color: #10b981; }

.input-with-icon {
  position: relative;
}

.input-with-icon input { padding-left: 48px; padding-right: 48px; }
.icon-left {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
}

.icon-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #9ca3af;
  transition: all 0.2s;
}

.icon-btn:hover { background: #f3f4f6; color: #6b7280; }
.icon-btn svg { width: 20px; height: 20px; }

.hint {
  display: block;
  font-size: 12px;
  margin-top: 6px;
}

.hint.success { color: #10b981; }
.hint.error { color: #ef4444; }

/* Password Rules */
.password-rules {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 10px;
}

.password-rules span {
  font-size: 12px;
  color: #9ca3af;
  transition: color 0.2s;
}

.password-rules span.met { color: #10b981; }

/* Buttons */
.btn-primary {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  box-shadow: none;
  cursor: not-allowed;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.divider span {
  padding: 0 16px;
  font-size: 13px;
  color: #9ca3af;
}

/* Social Buttons */
.social-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.social-btn:hover:not(:disabled) { border-color: #d1d5db; background: #f9fafb; }
.social-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.social-btn svg { width: 20px; height: 20px; }

/* Summary Card */
.summary-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
}

.summary-card h3 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.summary-row:last-child { border-bottom: none; }
.summary-row span:first-child { font-size: 14px; color: #6b7280; }
.summary-row span:last-child { font-size: 14px; font-weight: 500; color: #111827; }

/* Checkbox */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: #4b5563;
  line-height: 1.5;
}

.checkbox-label input { display: none; }

.checkmark {
  width: 22px;
  height: 22px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  flex-shrink: 0;
  position: relative;
  transition: all 0.2s;
  margin-top: 1px;
}

.checkbox-label input:checked + .checkmark {
  background: #10b981;
  border-color: #10b981;
}

.checkbox-label input:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label a {
  color: #10b981;
  text-decoration: none;
  font-weight: 500;
}

.checkbox-label a:hover { text-decoration: underline; }

/* Login Link */
.login-link {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #6b7280;
}

.login-link button {
  background: none;
  border: none;
  color: #10b981;
  font-weight: 600;
  cursor: pointer;
  margin-left: 4px;
}

.login-link button:hover { text-decoration: underline; }

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.white {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: white;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
}

.slide-enter-from { opacity: 0; transform: translateX(16px); }
.slide-leave-to { opacity: 0; transform: translateX(-16px); }
</style>
