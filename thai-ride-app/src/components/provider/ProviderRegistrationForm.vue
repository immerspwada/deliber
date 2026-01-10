<script setup lang="ts">
/**
 * Provider Registration Form Component
 * Requirements: 1.1, 1.2
 */
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'vue-router'

const router = useRouter()

// Form data
const formData = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  service_types: [] as string[],
  terms_accepted: false
})

// Validation errors
const errors = ref<Record<string, string>>({})

// Loading state
const isSubmitting = ref(false)

// Service types with icons
const serviceTypes = [
  { value: 'ride', label: 'Ride', icon: '🚗', description: 'รับส่งผู้โดยสาร' },
  { value: 'delivery', label: 'Delivery', icon: '📦', description: 'จัดส่งพัสดุ' },
  { value: 'shopping', label: 'Shopping', icon: '🛒', description: 'ช้อปปิ้งแทน' },
  { value: 'moving', label: 'Moving', icon: '🚚', description: 'ขนย้ายของ' },
  { value: 'laundry', label: 'Laundry', icon: '👕', description: 'รับ-ส่งซักผ้า' }
]

// Computed
const isFormValid = computed(() => {
  return (
    formData.value.first_name.trim().length > 0 &&
    formData.value.last_name.trim().length > 0 &&
    formData.value.email.trim().length > 0 &&
    formData.value.phone_number.trim().length === 10 &&
    formData.value.service_types.length > 0 &&
    formData.value.terms_accepted
  )
})

// Validation functions
function validateEmail(email: string): string | null {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
  if (!email) return 'กรุณากรอกอีเมล'
  if (!emailRegex.test(email)) return 'รูปแบบอีเมลไม่ถูกต้อง'
  return null
}

function validatePhoneNumber(phone: string): string | null {
  const phoneRegex = /^\d{10}$/
  if (!phone) return 'กรุณากรอกเบอร์โทรศัพท์'
  if (!phoneRegex.test(phone)) return 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก'
  if (!phone.startsWith('0')) return 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0'
  return null
}

function validateName(name: string, field: string): string | null {
  if (!name || name.trim().length === 0) return `กรุณากรอก${field}`
  if (name.trim().length < 2) return `${field}ต้องมีอย่างน้อย 2 ตัวอักษร`
  if (name.trim().length > 50) return `${field}ต้องไม่เกิน 50 ตัวอักษร`
  return null
}

function validateServiceTypes(types: string[]): string | null {
  if (types.length === 0) return 'กรุณาเลือกประเภทบริการอย่างน้อย 1 ประเภท'
  if (types.length > 5) return 'เลือกได้สูงสุด 5 ประเภท'
  return null
}

// Validate all fields
function validateForm(): boolean {
  errors.value = {}
  
  const firstNameError = validateName(formData.value.first_name, 'ชื่อ')
  if (firstNameError) errors.value.first_name = firstNameError
  
  const lastNameError = validateName(formData.value.last_name, 'นามสกุล')
  if (lastNameError) errors.value.last_name = lastNameError
  
  const emailError = validateEmail(formData.value.email)
  if (emailError) errors.value.email = emailError
  
  const phoneError = validatePhoneNumber(formData.value.phone_number)
  if (phoneError) errors.value.phone_number = phoneError
  
  const serviceTypesError = validateServiceTypes(formData.value.service_types)
  if (serviceTypesError) errors.value.service_types = serviceTypesError
  
  if (!formData.value.terms_accepted) {
    errors.value.terms_accepted = 'กรุณายอมรับข้อกำหนดและเงื่อนไข'
  }
  
  return Object.keys(errors.value).length === 0
}

// Toggle service type selection
function toggleServiceType(type: string): void {
  const index = formData.value.service_types.indexOf(type)
  if (index > -1) {
    formData.value.service_types.splice(index, 1)
  } else {
    if (formData.value.service_types.length < 5) {
      formData.value.service_types.push(type)
    }
  }
  // Clear service types error when user makes selection
  if (errors.value.service_types && formData.value.service_types.length > 0) {
    delete errors.value.service_types
  }
}

// Submit form
async function handleSubmit(): Promise<void> {
  if (!validateForm()) {
    return
  }
  
  isSubmitting.value = true
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      errors.value.general = 'กรุณาเข้าสู่ระบบก่อนลงทะเบียน'
      return
    }
    
    // Insert provider record
    const { data, error } = await supabase
      .from('providers_v2')
      .insert({
        user_id: user.id,
        first_name: formData.value.first_name.trim(),
        last_name: formData.value.last_name.trim(),
        email: formData.value.email.trim(),
        phone_number: formData.value.phone_number,
        service_types: formData.value.service_types,
        status: 'pending'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Registration error:', error)
      if (error.code === '23505') { // Unique constraint violation
        errors.value.general = 'คุณได้ลงทะเบียนเป็น Provider แล้ว'
      } else {
        errors.value.general = 'เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง'
      }
      return
    }
    
    // Success - redirect to email verification
    router.push({
      name: 'ProviderEmailVerification',
      params: { providerId: data.id }
    })
    
  } catch (err) {
    console.error('Unexpected error:', err)
    errors.value.general = 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง'
  } finally {
    isSubmitting.value = false
  }
}

// Clear error when user types
function clearError(field: string): void {
  if (errors.value[field]) {
    delete errors.value[field]
  }
}
</script>

<template>
  <div class="registration-form">
    <div class="form-header">
      <h1 class="form-title">ลงทะเบียนเป็น Provider</h1>
      <p class="form-subtitle">เริ่มต้นสร้างรายได้กับเรา</p>
    </div>

    <form @submit.prevent="handleSubmit" class="form-content">
      <!-- General Error -->
      <div v-if="errors.general" class="error-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ errors.general }}</span>
      </div>

      <!-- First Name -->
      <div class="form-group">
        <label for="first_name" class="form-label">
          ชื่อ <span class="required">*</span>
        </label>
        <input
          id="first_name"
          v-model="formData.first_name"
          type="text"
          class="form-input"
          :class="{ 'input-error': errors.first_name }"
          placeholder="กรอกชื่อของคุณ"
          maxlength="50"
          @input="clearError('first_name')"
        />
        <span v-if="errors.first_name" class="error-message">{{ errors.first_name }}</span>
      </div>

      <!-- Last Name -->
      <div class="form-group">
        <label for="last_name" class="form-label">
          นามสกุล <span class="required">*</span>
        </label>
        <input
          id="last_name"
          v-model="formData.last_name"
          type="text"
          class="form-input"
          :class="{ 'input-error': errors.last_name }"
          placeholder="กรอกนามสกุลของคุณ"
          maxlength="50"
          @input="clearError('last_name')"
        />
        <span v-if="errors.last_name" class="error-message">{{ errors.last_name }}</span>
      </div>

      <!-- Email -->
      <div class="form-group">
        <label for="email" class="form-label">
          อีเมล <span class="required">*</span>
        </label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          class="form-input"
          :class="{ 'input-error': errors.email }"
          placeholder="example@email.com"
          @input="clearError('email')"
        />
        <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
      </div>

      <!-- Phone Number -->
      <div class="form-group">
        <label for="phone_number" class="form-label">
          เบอร์โทรศัพท์ <span class="required">*</span>
        </label>
        <input
          id="phone_number"
          v-model="formData.phone_number"
          type="tel"
          class="form-input"
          :class="{ 'input-error': errors.phone_number }"
          placeholder="0812345678"
          maxlength="10"
          @input="clearError('phone_number')"
        />
        <span v-if="errors.phone_number" class="error-message">{{ errors.phone_number }}</span>
      </div>

      <!-- Service Types -->
      <div class="form-group">
        <label class="form-label">
          ประเภทบริการ <span class="required">*</span>
        </label>
        <p class="form-hint">เลือกได้สูงสุด 5 ประเภท</p>
        
        <div class="service-types-grid">
          <button
            v-for="service in serviceTypes"
            :key="service.value"
            type="button"
            class="service-type-card"
            :class="{ 'selected': formData.service_types.includes(service.value) }"
            @click="toggleServiceType(service.value)"
          >
            <span class="service-icon">{{ service.icon }}</span>
            <span class="service-label">{{ service.label }}</span>
            <span class="service-description">{{ service.description }}</span>
            <div v-if="formData.service_types.includes(service.value)" class="check-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </button>
        </div>
        
        <span v-if="errors.service_types" class="error-message">{{ errors.service_types }}</span>
      </div>

      <!-- Terms and Conditions -->
      <div class="form-group">
        <label class="checkbox-label">
          <input
            v-model="formData.terms_accepted"
            type="checkbox"
            class="checkbox-input"
            @change="clearError('terms_accepted')"
          />
          <span class="checkbox-text">
            ฉันยอมรับ
            <a href="/terms" target="_blank" class="link">ข้อกำหนดและเงื่อนไข</a>
            และ
            <a href="/privacy" target="_blank" class="link">นโยบายความเป็นส่วนตัว</a>
          </span>
        </label>
        <span v-if="errors.terms_accepted" class="error-message">{{ errors.terms_accepted }}</span>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        class="submit-button"
        :disabled="!isFormValid || isSubmitting"
      >
        <span v-if="!isSubmitting">ลงทะเบียน</span>
        <span v-else class="loading-text">
          <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/>
          </svg>
          กำลังลงทะเบียน...
        </span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.registration-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: #1F2937;
  margin: 0 0 8px 0;
}

.form-subtitle {
  font-size: 16px;
  color: #6B7280;
  margin: 0;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #FEE2E2;
  border: 1px solid #FCA5A5;
  border-radius: 8px;
  color: #DC2626;
  font-size: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.required {
  color: #EF4444;
}

.form-hint {
  font-size: 13px;
  color: #6B7280;
  margin: 0;
}

.form-input {
  padding: 12px 16px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #00A86B;
  box-shadow: 0 0 0 3px rgba(0, 168, 107, 0.1);
}

.form-input.input-error {
  border-color: #EF4444;
}

.error-message {
  font-size: 13px;
  color: #EF4444;
}

.service-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.service-type-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #fff;
  border: 2px solid #E5E7EB;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.service-type-card:hover {
  border-color: #00A86B;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.1);
}

.service-type-card.selected {
  border-color: #00A86B;
  background: #E8F5EF;
}

.service-icon {
  font-size: 32px;
}

.service-label {
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
}

.service-description {
  font-size: 12px;
  color: #6B7280;
  text-align: center;
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  margin-top: 2px;
  cursor: pointer;
}

.checkbox-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}

.link {
  color: #00A86B;
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}

.submit-button {
  padding: 14px 24px;
  background: #00A86B;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-button:hover:not(:disabled) {
  background: #008F5C;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.submit-button:disabled {
  background: #D1D5DB;
  cursor: not-allowed;
  transform: none;
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .registration-form {
    padding: 16px;
  }
  
  .form-title {
    font-size: 24px;
  }
  
  .service-types-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

