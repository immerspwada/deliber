<script setup lang="ts">
import { ref, computed } from 'vue'
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

const router = useRouter()
const authStore = useAuthStore()

const step = ref(1)
const isLoading = ref(false)
const error = ref('')

const firstName = ref('')
const lastName = ref('')
const nationalId = ref('')
const phone = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const acceptTerms = ref(false)

const isFirstNameValid = computed(() => validateThaiName(firstName.value))
const isLastNameValid = computed(() => validateThaiName(lastName.value))
const isNationalIdValid = computed(() => validateThaiNationalId(nationalId.value))
const isPhoneValid = computed(() => validateThaiPhoneNumber(phone.value))
const isEmailValid = computed(() => validateEmail(email.value))
const passwordValidation = computed(() => validatePassword(password.value))
const isPasswordMatch = computed(() => password.value === confirmPassword.value)

const formattedNationalId = computed(() => formatThaiNationalId(nationalId.value))
const formattedPhone = computed(() => formatThaiPhoneNumber(phone.value))

const canProceedStep1 = computed(() => 
  isFirstNameValid.value && isLastNameValid.value && isNationalIdValid.value
)

const canProceedStep2 = computed(() => 
  isPhoneValid.value && isEmailValid.value
)

const canSubmit = computed(() => 
  passwordValidation.value.valid && isPasswordMatch.value && acceptTerms.value
)

const nextStep = () => {
  if (step.value === 1 && canProceedStep1.value) step.value = 2
  else if (step.value === 2 && canProceedStep2.value) step.value = 3
}

const prevStep = () => {
  if (step.value > 1) step.value--
}

const submitRegistration = async () => {
  if (!canSubmit.value) return
  
  isLoading.value = true
  error.value = ''
  
  try {
    const success = await authStore.register(email.value, password.value, {
      name: `${firstName.value} ${lastName.value}`.trim(),
      phone: phone.value
    })
    
    if (success) {
      // สมัครสำเร็จ - ไปหน้า login เพื่อยืนยันอีเมล
      router.push('/login')
    } else {
      error.value = authStore.error || 'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่'
    }
  } catch (err: any) {
    error.value = err.message || 'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่'
  } finally {
    isLoading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-header">
      <h1 class="auth-logo">ThaiRide</h1>
      <p class="auth-subtitle">สมัครสมาชิก</p>
    </div>

    <div class="auth-content">
      <div class="progress-steps">
        <div 
          v-for="i in 3" 
          :key="i"
          class="progress-step-wrapper"
        >
          <div :class="['progress-step', { 'progress-step-active': step >= i }]">
            {{ i }}
          </div>
          <div v-if="i < 3" :class="['progress-line', { 'progress-line-active': step > i }]"></div>
        </div>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>

      <div v-if="step === 1">
        <h2 class="step-title">ข้อมูลส่วนตัว</h2>
        
        <div class="form-group">
          <label class="label">ชื่อ</label>
          <input v-model="firstName" type="text" placeholder="ชื่อ" class="input-field" />
          <p v-if="firstName && !isFirstNameValid" class="error-text">กรุณาใส่ชื่อที่ถูกต้อง</p>
        </div>

        <div class="form-group">
          <label class="label">นามสกุล</label>
          <input v-model="lastName" type="text" placeholder="นามสกุล" class="input-field" />
          <p v-if="lastName && !isLastNameValid" class="error-text">กรุณาใส่นามสกุลที่ถูกต้อง</p>
        </div>

        <div class="form-group">
          <label class="label">เลขบัตรประชาชน</label>
          <input v-model="nationalId" type="text" maxlength="17" placeholder="1-2345-67890-12-3" class="input-field" />
          <p v-if="nationalId && isNationalIdValid" class="success-text">{{ formattedNationalId }}</p>
          <p v-if="nationalId && !isNationalIdValid" class="error-text">เลขบัตรประชาชนไม่ถูกต้อง</p>
        </div>

        <button @click="nextStep" :disabled="!canProceedStep1" class="btn-primary">
          ถัดไป
        </button>
      </div>

      <div v-if="step === 2">
        <h2 class="step-title">ข้อมูลติดต่อ</h2>
        
        <div class="form-group">
          <label class="label">เบอร์โทรศัพท์</label>
          <input v-model="phone" type="tel" placeholder="081-234-5678" class="input-field" />
          <p v-if="phone && isPhoneValid" class="success-text">{{ formattedPhone }}</p>
          <p v-if="phone && !isPhoneValid" class="error-text">เบอร์โทรศัพท์ไม่ถูกต้อง</p>
        </div>

        <div class="form-group">
          <label class="label">อีเมล</label>
          <input v-model="email" type="email" placeholder="email@example.com" class="input-field" />
          <p v-if="email && !isEmailValid" class="error-text">อีเมลไม่ถูกต้อง</p>
        </div>

        <div class="button-group">
          <button @click="prevStep" class="btn-secondary">ย้อนกลับ</button>
          <button @click="nextStep" :disabled="!canProceedStep2" class="btn-primary">ถัดไป</button>
        </div>
      </div>

      <div v-if="step === 3">
        <h2 class="step-title">ตั้งรหัสผ่าน</h2>
        
        <div class="form-group">
          <label class="label">รหัสผ่าน</label>
          <input v-model="password" type="password" placeholder="รหัสผ่าน" class="input-field" />
          <p v-if="password && !passwordValidation.valid" class="error-text">{{ passwordValidation.message }}</p>
        </div>

        <div class="form-group">
          <label class="label">ยืนยันรหัสผ่าน</label>
          <input v-model="confirmPassword" type="password" placeholder="ยืนยันรหัสผ่าน" class="input-field" />
          <p v-if="confirmPassword && !isPasswordMatch" class="error-text">รหัสผ่านไม่ตรงกัน</p>
        </div>

        <div class="terms-checkbox">
          <input v-model="acceptTerms" type="checkbox" id="terms" />
          <label for="terms">
            ฉันยอมรับ <a href="#">ข้อกำหนดและเงื่อนไข</a> และ <a href="#">นโยบายความเป็นส่วนตัว</a>
          </label>
        </div>

        <div class="button-group">
          <button @click="prevStep" class="btn-secondary">ย้อนกลับ</button>
          <button @click="submitRegistration" :disabled="!canSubmit || isLoading" class="btn-primary">
            <span v-if="isLoading" class="btn-loading">
              <span class="spinner"></span>
              <span>กำลังสมัคร</span>
            </span>
            <span v-else>สมัครสมาชิก</span>
          </button>
        </div>
      </div>

      <div class="login-link">
        <p>มีบัญชีอยู่แล้ว?</p>
        <button @click="goToLogin" class="link-btn">เข้าสู่ระบบ</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  background-color: var(--color-background);
}

.auth-header {
  background-color: var(--color-primary);
  color: white;
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

.progress-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.progress-step-wrapper {
  display: flex;
  align-items: center;
}

.progress-step {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  background-color: var(--color-secondary);
  color: var(--color-text-muted);
  transition: all 0.2s ease;
}

.progress-step-active {
  background-color: var(--color-primary);
  color: white;
}

.progress-line {
  width: 48px;
  height: 2px;
  background-color: var(--color-border);
  margin: 0 8px;
  transition: background-color 0.2s ease;
}

.progress-line-active {
  background-color: var(--color-primary);
}

.error-message {
  background-color: rgba(225, 25, 0, 0.1);
  color: var(--color-error);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  margin-bottom: 16px;
}

.step-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.button-group {
  display: flex;
  gap: 12px;
}

.button-group .btn-secondary,
.button-group .btn-primary {
  flex: 1;
}

.terms-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 24px;
}

.terms-checkbox input {
  margin-top: 4px;
}

.terms-checkbox label {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.terms-checkbox a {
  color: var(--color-accent);
  text-decoration: none;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-link {
  margin-top: 32px;
  text-align: center;
}

.login-link p {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.link-btn {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}
</style>