<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  validateThaiPhoneNumber, 
  validateEmail,
  validatePassword,
  formatThaiPhoneNumber,
  validateThaiNationalId,
  formatThaiNationalId
} from '../utils/validation'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Registration steps
const currentStep = ref(1)
const totalSteps = 3
const isLoading = ref(false)
const error = ref('')
const successMessage = ref('')
const registrationComplete = ref(false)
const memberUid = ref('')

// Step 1: Basic Info
const firstName = ref('')
const lastName = ref('')
const phone = ref('')

// Step 2: Account Setup
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Step 3: Verification & Terms
const nationalId = ref('')
const acceptTerms = ref(false)
const acceptPrivacy = ref(false)

// Social login loading state
const socialLoading = ref<'google' | 'facebook' | null>(null)

// Validations - Step 1
const isFirstNameValid = computed(() => firstName.value.trim().length >= 2)
const isLastNameValid = computed(() => lastName.value.trim().length >= 2)
const isPhoneValid = computed(() => phone.value.length === 0 || validateThaiPhoneNumber(phone.value))
const formattedPhone = computed(() => formatThaiPhoneNumber(phone.value))

// Validations - Step 2
const isEmailValid = computed(() => email.value.length === 0 || validateEmail(email.value))
const passwordValidation = computed(() => validatePassword(password.value))
const isPasswordMatch = computed(() => password.value === confirmPassword.value)

// Validations - Step 3
const isNationalIdValid = computed(() => nationalId.value.length === 0 || validateThaiNationalId(nationalId.value))
const formattedNationalId = computed(() => formatThaiNationalId(nationalId.value))

// Step validation
const canProceedStep1 = computed(() => 
  isFirstNameValid.value && 
  isLastNameValid.value && 
  validateThaiPhoneNumber(phone.value)
)

const canProceedStep2 = computed(() => 
  validateEmail(email.value) && 
  passwordValidation.value.valid && 
  isPasswordMatch.value
)

const canSubmit = computed(() => 
  canProceedStep1.value && 
  canProceedStep2.value && 
  acceptTerms.value && 
  acceptPrivacy.value
)

// Step navigation
const nextStep = () => {
  error.value = ''
  if (currentStep.value === 1 && canProceedStep1.value) {
    currentStep.value = 2
  } else if (currentStep.value === 2 && canProceedStep2.value) {
    currentStep.value = 3
  }
}

const prevStep = () => {
  error.value = ''
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

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

// Loading progress state
const loadingProgress = ref(0)
const loadingMessage = ref('')

// Submit Registration with progress tracking
const submitRegistration = async () => {
  if (!canSubmit.value) return
  
  isLoading.value = true
  loadingProgress.value = 0
  loadingMessage.value = 'กำลังสร้างบัญชี...'
  error.value = ''
  successMessage.value = ''
  
  try {
    const fullName = `${firstName.value} ${lastName.value}`.trim()
    const cleanPhone = phone.value.replace(/[-\s]/g, '')
    const cleanNationalId = nationalId.value.replace(/[-\s]/g, '') || null
    
    localStorage.removeItem('demo_mode')
    localStorage.removeItem('demo_user')
    
    // Step 1: Create account (0-40%)
    loadingProgress.value = 10
    loadingMessage.value = 'กำลังสร้างบัญชี...'
    
    const success = await authStore.register(email.value, password.value, {
      name: fullName,
      phone: cleanPhone,
      role: 'customer',
      nationalId: cleanNationalId || undefined
    })
    
    loadingProgress.value = 40
    
    if (!success) {
      error.value = authStore.error || 'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่'
      return
    }
    
    // Step 2: Auto login (40-70%)
    loadingProgress.value = 50
    loadingMessage.value = 'กำลังเข้าสู่ระบบ...'
    
    const loginSuccess = await authStore.login(email.value, password.value)
    loadingProgress.value = 70
    
    // Step 3: Fetch profile & member UID (70-100%)
    loadingMessage.value = 'กำลังโหลดข้อมูลสมาชิก...'
    loadingProgress.value = 85
    
    // Small delay to ensure profile is fetched
    await new Promise(resolve => setTimeout(resolve, 500))
    loadingProgress.value = 100
    
    if (loginSuccess && authStore.user) {
      memberUid.value = (authStore.user as any).member_uid || ''
      registrationComplete.value = true
      successMessage.value = 'สมัครสมาชิกสำเร็จ!'
    } else {
      error.value = 'สมัครสำเร็จ! กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่สมัคร'
      setTimeout(() => router.push('/login'), 2000)
    }
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    isLoading.value = false
    loadingProgress.value = 0
    loadingMessage.value = ''
  }
}

const goToHome = () => router.push('/customer')
const goToLogin = () => router.push('/login')
const copyMemberUid = () => {
  if (memberUid.value) {
    navigator.clipboard.writeText(memberUid.value)
    successMessage.value = 'คัดลอก Member ID แล้ว'
    setTimeout(() => successMessage.value = '', 2000)
  }
}

// Auto-format phone
watch(phone, (val) => {
  const clean = val.replace(/[^\d+]/g, '').slice(0, 12)
  if (clean !== val.replace(/[^\d+]/g, '')) {
    phone.value = clean
  }
})

// Auto-format national ID
watch(nationalId, (val) => {
  const clean = val.replace(/[^\d]/g, '').slice(0, 13)
  if (clean !== val.replace(/[^\d]/g, '')) {
    nationalId.value = clean
  }
})
</script>

<template>
  <div class="register-page">
    <!-- Loading Skeleton Overlay -->
    <Transition name="fade">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner-container">
            <div class="loading-spinner"></div>
            <div class="loading-checkmark" :class="{ show: loadingProgress >= 100 }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
          </div>
          
          <div class="loading-progress-container">
            <div class="loading-progress-bar">
              <div class="loading-progress-fill" :style="{ width: loadingProgress + '%' }"></div>
            </div>
            <span class="loading-percentage">{{ loadingProgress }}%</span>
          </div>
          
          <p class="loading-message">{{ loadingMessage }}</p>
          
          <!-- Skeleton Preview -->
          <div class="skeleton-preview">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-lines">
              <div class="skeleton-line long"></div>
              <div class="skeleton-line medium"></div>
              <div class="skeleton-line short"></div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Success Screen -->
    <div v-if="registrationComplete" class="success-screen">
      <div class="success-content">
        <div class="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <path d="M22 4L12 14.01l-3-3"/>
          </svg>
        </div>
        <h1 class="success-title">สมัครสมาชิกสำเร็จ!</h1>
        <p class="success-subtitle">ยินดีต้อนรับสู่ GOBEAR</p>
        
        <!-- Member UID Card -->
        <div v-if="memberUid" class="member-card">
          <div class="member-label">Member ID ของคุณ</div>
          <div class="member-uid">{{ memberUid }}</div>
          <button @click="copyMemberUid" class="copy-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            คัดลอก
          </button>
          <p class="member-hint">ใช้ Member ID นี้ในการติดตามประวัติการใช้งาน</p>
        </div>
        
        <button @click="goToHome" class="btn-primary">
          เริ่มใช้งาน
        </button>
      </div>
    </div>

    <!-- Registration Form -->
    <template v-else>
      <!-- Header -->
      <div class="register-header">
        <button @click="currentStep > 1 ? prevStep() : goToLogin()" class="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="header-title">สมัครสมาชิก</h1>
        <div class="header-spacer"></div>
      </div>

      <!-- Progress Steps -->
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${(currentStep / totalSteps) * 100}%` }"></div>
        </div>
        <div class="step-indicators">
          <div v-for="step in totalSteps" :key="step" 
               :class="['step-dot', { active: step <= currentStep, current: step === currentStep }]">
            <span v-if="step < currentStep" class="step-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </span>
            <span v-else>{{ step }}</span>
          </div>
        </div>
        <div class="step-labels">
          <span :class="{ active: currentStep >= 1 }">ข้อมูลส่วนตัว</span>
          <span :class="{ active: currentStep >= 2 }">บัญชีผู้ใช้</span>
          <span :class="{ active: currentStep >= 3 }">ยืนยันตัวตน</span>
        </div>
      </div>

      <div class="register-content">
        <!-- Messages -->
        <Transition name="fade">
          <div v-if="error" class="message error-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
            {{ error }}
          </div>
        </Transition>
        <Transition name="fade">
          <div v-if="successMessage && !registrationComplete" class="message success-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
            {{ successMessage }}
          </div>
        </Transition>

        <!-- Step 1: Basic Info -->
        <Transition name="slide" mode="out-in">
          <div v-if="currentStep === 1" key="step1" class="form-step">
            <h2 class="step-title">ข้อมูลส่วนตัว</h2>
            <p class="step-desc">กรอกชื่อและเบอร์โทรศัพท์ของคุณ</p>

            <div class="form-row">
              <div class="form-group">
                <label class="label">ชื่อ <span class="required">*</span></label>
                <div class="input-wrapper">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input v-model="firstName" type="text" placeholder="ชื่อจริง" class="input-field"
                    :class="{ 'input-success': firstName && isFirstNameValid }" />
                </div>
                <p v-if="firstName && !isFirstNameValid" class="error-text">กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร</p>
              </div>
              <div class="form-group">
                <label class="label">นามสกุล <span class="required">*</span></label>
                <div class="input-wrapper">
                  <input v-model="lastName" type="text" placeholder="นามสกุล" class="input-field no-icon"
                    :class="{ 'input-success': lastName && isLastNameValid }" />
                </div>
                <p v-if="lastName && !isLastNameValid" class="error-text">กรุณากรอกนามสกุลอย่างน้อย 2 ตัวอักษร</p>
              </div>
            </div>

            <div class="form-group">
              <label class="label">เบอร์โทรศัพท์ <span class="required">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <input v-model="phone" type="tel" inputmode="tel" placeholder="0812345678" class="input-field"
                  :class="{ 'input-error': phone && !isPhoneValid, 'input-success': phone && isPhoneValid }" />
              </div>
              <p v-if="phone && isPhoneValid" class="success-text">{{ formattedPhone }}</p>
              <p v-if="phone && !isPhoneValid" class="error-text">เบอร์โทรศัพท์ไม่ถูกต้อง</p>
            </div>

            <button @click="nextStep" :disabled="!canProceedStep1" class="btn-primary">
              ถัดไป
            </button>
          </div>

          <!-- Step 2: Account Setup -->
          <div v-else-if="currentStep === 2" key="step2" class="form-step">
            <h2 class="step-title">สร้างบัญชีผู้ใช้</h2>
            <p class="step-desc">ตั้งอีเมลและรหัสผ่านสำหรับเข้าสู่ระบบ</p>

            <div class="form-group">
              <label class="label">อีเมล <span class="required">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>
                </svg>
                <input v-model="email" type="email" inputmode="email" placeholder="email@example.com" class="input-field"
                  :class="{ 'input-error': email && !isEmailValid, 'input-success': email && isEmailValid }" />
              </div>
              <p v-if="email && !isEmailValid" class="error-text">อีเมลไม่ถูกต้อง</p>
            </div>

            <div class="form-group">
              <label class="label">รหัสผ่าน <span class="required">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" class="input-field"
                  :class="{ 'input-error': password && !passwordValidation.valid }" />
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
              <label class="label">ยืนยันรหัสผ่าน <span class="required">*</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" placeholder="ยืนยันรหัสผ่าน" class="input-field"
                  :class="{ 'input-error': confirmPassword && !isPasswordMatch, 'input-success': confirmPassword && isPasswordMatch && passwordValidation.valid }" />
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                อย่างน้อย 8 ตัวอักษร
              </div>
              <div :class="['req-item', { 'req-met': /[a-zA-Z]/.test(password) }]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                มีตัวอักษร (a-z, A-Z)
              </div>
              <div :class="['req-item', { 'req-met': /\d/.test(password) }]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                มีตัวเลข (0-9)
              </div>
            </div>

            <button @click="nextStep" :disabled="!canProceedStep2" class="btn-primary">
              ถัดไป
            </button>

            <!-- Social Login Divider -->
            <div class="social-divider">
              <span>หรือสมัครด้วย</span>
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

          <!-- Step 3: Verification & Terms -->
          <div v-else-if="currentStep === 3" key="step3" class="form-step">
            <h2 class="step-title">ยืนยันตัวตน</h2>
            <p class="step-desc">กรอกข้อมูลเพิ่มเติมและยอมรับเงื่อนไข</p>

            <div class="form-group">
              <label class="label">เลขบัตรประชาชน <span class="optional">(ไม่บังคับ)</span></label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <path d="M2 10h20"/>
                </svg>
                <input v-model="nationalId" type="text" inputmode="numeric" placeholder="X-XXXX-XXXXX-XX-X" class="input-field"
                  :class="{ 'input-error': nationalId && !isNationalIdValid, 'input-success': nationalId && isNationalIdValid }" />
              </div>
              <p v-if="nationalId && isNationalIdValid" class="success-text">{{ formattedNationalId }}</p>
              <p v-if="nationalId && !isNationalIdValid" class="error-text">เลขบัตรประชาชนไม่ถูกต้อง</p>
              <p class="hint-text">ใช้สำหรับยืนยันตัวตนเพื่อรับสิทธิพิเศษ</p>
            </div>

            <!-- Summary Card -->
            <div class="summary-card">
              <h3 class="summary-title">ข้อมูลการสมัคร</h3>
              <div class="summary-row">
                <span class="summary-label">ชื่อ-นามสกุล</span>
                <span class="summary-value">{{ firstName }} {{ lastName }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">เบอร์โทรศัพท์</span>
                <span class="summary-value">{{ formattedPhone }}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">อีเมล</span>
                <span class="summary-value">{{ email }}</span>
              </div>
            </div>

            <!-- Terms Checkboxes -->
            <label class="terms-checkbox">
              <input v-model="acceptTerms" type="checkbox" />
              <span class="checkmark"></span>
              <span class="terms-text">
                ฉันยอมรับ <a href="#" @click.prevent>ข้อกำหนดและเงื่อนไข</a> การใช้งาน
              </span>
            </label>

            <label class="terms-checkbox">
              <input v-model="acceptPrivacy" type="checkbox" />
              <span class="checkmark"></span>
              <span class="terms-text">
                ฉันยอมรับ <a href="#" @click.prevent>นโยบายความเป็นส่วนตัว</a>
              </span>
            </label>

            <button @click="submitRegistration" :disabled="!canSubmit || isLoading" class="btn-primary">
              <span v-if="isLoading" class="btn-loading">
                <span class="spinner"></span>
                กำลังสมัคร...
              </span>
              <span v-else>สมัครสมาชิก</span>
            </button>
          </div>
        </Transition>

        <!-- Login Link -->
        <div class="login-link">
          <span>มีบัญชีอยู่แล้ว?</span>
          <button @click="goToLogin" class="link-btn">เข้าสู่ระบบ</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  min-height: 100dvh;
  background: #FFFFFF;
}

/* Success Screen */
.success-screen {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #E8F5EF 0%, #FFFFFF 50%, #F0FDF4 100%);
  padding: 24px;
}

.success-content {
  text-align: center;
  max-width: 360px;
  width: 100%;
}

.success-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: scaleIn 0.5s ease;
}

.success-icon svg {
  width: 40px;
  height: 40px;
  color: #FFFFFF;
}

@keyframes scaleIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.success-title {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px;
}

.success-subtitle {
  font-size: 14px;
  color: #666666;
  margin: 0 0 24px;
}

.member-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 168, 107, 0.12);
  border: 2px solid #E8F5EF;
}

.member-label {
  font-size: 12px;
  color: #666666;
  margin-bottom: 8px;
}

.member-uid {
  font-size: 24px;
  font-weight: 700;
  color: #00A86B;
  font-family: 'SF Mono', 'Consolas', monospace;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #E8F5EF;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #00A86B;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #00A86B;
  color: #FFFFFF;
}

.copy-btn svg {
  width: 16px;
  height: 16px;
}

.member-hint {
  font-size: 11px;
  color: #999999;
  margin: 12px 0 0;
}

/* Header */
.register-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #00A86B;
  color: #FFFFFF;
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 12px;
  color: #FFFFFF;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(255,255,255,0.25);
}

.back-btn svg {
  width: 22px;
  height: 22px;
}

.header-title {
  font-size: 17px;
  font-weight: 600;
}

.header-spacer {
  width: 40px;
}

/* Progress */
.progress-container {
  padding: 20px 24px;
  background: #FFFFFF;
  border-bottom: 1px solid #F0F0F0;
}

.progress-bar {
  height: 4px;
  background: #E8E8E8;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 2px;
  transition: width 0.4s ease;
}

.step-indicators {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: #E8E8E8;
  color: #999999;
  transition: all 0.3s;
}

.step-dot.active {
  background: #00A86B;
  color: #FFFFFF;
}

.step-dot.current {
  box-shadow: 0 0 0 4px rgba(0, 168, 107, 0.2);
}

.step-check svg {
  width: 14px;
  height: 14px;
}

.step-labels {
  display: flex;
  justify-content: space-between;
}

.step-labels span {
  font-size: 11px;
  color: #999999;
  transition: color 0.3s;
}

.step-labels span.active {
  color: #00A86B;
  font-weight: 500;
}

/* Content */
.register-content {
  padding: 24px 20px;
  max-width: 480px;
  margin: 0 auto;
}

/* Messages */
.message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  margin-bottom: 16px;
}

.message svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.error-message {
  background: #FFEBEE;
  color: #E53935;
}

.success-message {
  background: #E8F5EF;
  color: #00A86B;
}

/* Form Step */
.form-step {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-title {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 6px;
}

.step-desc {
  font-size: 14px;
  color: #666666;
  margin: 0 0 24px;
}

/* Form */
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
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.required {
  color: #E53935;
}

.optional {
  color: #999999;
  font-weight: 400;
  font-size: 11px;
}

.hint-text {
  font-size: 11px;
  color: #999999;
  margin-top: 6px;
}

.input-wrapper {
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
  pointer-events: none;
}

.input-field {
  width: 100%;
  padding: 14px 14px 14px 44px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.2s;
  background: #FFFFFF;
}

.input-field.no-icon {
  padding-left: 14px;
}

.input-field:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.input-field::placeholder {
  color: #CCCCCC;
}

.input-error {
  border-color: #E53935 !important;
}

.input-success {
  border-color: #00A86B !important;
  background: rgba(0, 168, 107, 0.03);
}

.error-text {
  font-size: 11px;
  color: #E53935;
  margin-top: 6px;
}

.success-text {
  font-size: 11px;
  color: #00A86B;
  margin-top: 6px;
}

/* Password Toggle */
.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #999999;
}

.toggle-password svg {
  width: 20px;
  height: 20px;
}

/* Password Requirements */
.password-requirements {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
  padding: 12px;
  background: #F8F8F8;
  border-radius: 10px;
}

.req-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #999999;
}

.req-item svg {
  width: 14px;
  height: 14px;
  opacity: 0.3;
}

.req-met {
  color: #00A86B;
}

.req-met svg {
  opacity: 1;
  color: #00A86B;
}

/* Summary Card */
.summary-card {
  background: #F8F8F8;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #E8E8E8;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-label {
  font-size: 13px;
  color: #666666;
}

.summary-value {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
}

/* Terms Checkbox */
.terms-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  cursor: pointer;
}

.terms-checkbox input {
  display: none;
}

.checkmark {
  width: 22px;
  height: 22px;
  border: 2px solid #E8E8E8;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.terms-checkbox input:checked + .checkmark {
  background: #00A86B;
  border-color: #00A86B;
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
  font-size: 13px;
  color: #666666;
  line-height: 1.5;
}

.terms-text a {
  color: #00A86B;
  text-decoration: underline;
}

/* Buttons */
.btn-primary {
  width: 100%;
  padding: 16px 24px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
  margin-top: 8px;
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
  gap: 8px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner.small {
  width: 14px;
  height: 14px;
  border-width: 2px;
  border-color: #E8E8E8;
  border-top-color: #00A86B;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Social Login */
.social-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
}

.social-divider::before,
.social-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #E8E8E8;
}

.social-divider span {
  font-size: 12px;
  color: #999999;
  white-space: nowrap;
}

.social-buttons {
  display: flex;
  gap: 10px;
}

.social-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  background: #FFFFFF;
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  cursor: pointer;
  transition: all 0.2s;
}

.social-btn:hover:not(:disabled) {
  border-color: #CCCCCC;
  background: #FAFAFA;
}

.social-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.social-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.social-btn svg {
  width: 18px;
  height: 18px;
}

.social-btn.google:hover:not(:disabled) {
  border-color: #4285F4;
}

.social-btn.facebook:hover:not(:disabled) {
  border-color: #1877F2;
}

/* Login Link */
.login-link {
  margin-top: 24px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.login-link span {
  font-size: 13px;
  color: #666666;
}

.link-btn {
  background: none;
  border: none;
  color: #00A86B;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Mobile Optimization */
@media (max-width: 400px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .register-content {
    padding: 20px 16px;
  }
  
  .step-labels span {
    font-size: 10px;
  }
  
  .progress-container {
    padding: 16px 20px;
  }
}

@media (max-height: 700px) {
  .register-content {
    padding: 16px;
  }
  
  .step-title {
    font-size: 20px;
    margin-bottom: 4px;
  }
  
  .step-desc {
    margin-bottom: 16px;
  }
  
  .form-group {
    margin-bottom: 12px;
  }
  
  .input-field {
    padding: 12px 12px 12px 40px;
  }
  
  .btn-primary {
    padding: 14px 20px;
  }
  
  .password-requirements {
    padding: 10px;
    margin-bottom: 16px;
  }
}

/* Loading Overlay Styles */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
}

.loading-content {
  text-align: center;
  padding: 32px;
  max-width: 320px;
}

.loading-spinner-container {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
}

.loading-spinner {
  width: 80px;
  height: 80px;
  border: 4px solid #E8F5EF;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-checkmark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 40px;
  height: 40px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s ease;
}

.loading-checkmark.show {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
}

.loading-checkmark svg {
  width: 24px;
  height: 24px;
  color: #FFFFFF;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.loading-progress-bar {
  flex: 1;
  height: 6px;
  background: #E8E8E8;
  border-radius: 3px;
  overflow: hidden;
}

.loading-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00A86B, #00C77B);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.loading-percentage {
  font-size: 13px;
  font-weight: 600;
  color: #00A86B;
  min-width: 40px;
}

.loading-message {
  font-size: 15px;
  color: #1A1A1A;
  font-weight: 500;
  margin: 0 0 24px;
}

/* Skeleton Preview */
.skeleton-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #F8F8F8;
  border-radius: 12px;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(90deg, #E8E8E8 25%, #F0F0F0 50%, #E8E8E8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(90deg, #E8E8E8 25%, #F0F0F0 50%, #E8E8E8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-line.long { width: 100%; }
.skeleton-line.medium { width: 75%; }
.skeleton-line.short { width: 50%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
