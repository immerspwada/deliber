<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProvider } from '../../composables/useProvider'
import ProviderLayout from '../../components/ProviderLayout.vue'

const router = useRouter()
const { profile, fetchProfile, updateProfile } = useProvider()

const isLoading = ref(true)
const isSaving = ref(false)
const isEditing = ref(false)
const error = ref('')
const success = ref('')

// Form data
const vehicleType = ref('')
const vehicleBrand = ref('')
const vehicleModel = ref('')
const vehicleYear = ref('')
const vehiclePlate = ref('')
const vehicleColor = ref('')

// Validation errors
const errors = ref<Record<string, string>>({})

const vehicleTypes = [
  { value: 'car', label: 'รถยนต์' },
  { value: 'suv', label: 'รถ SUV' },
  { value: 'van', label: 'รถตู้' },
  { value: 'motorcycle', label: 'มอเตอร์ไซค์' }
]

const colors = [
  'สีดำ', 'สีขาว', 'สีเงิน', 'สีเทา', 'สีแดง', 'สีน้ำเงิน', 'สีเขียว', 'สีน้ำตาล', 'สีทอง', 'สีอื่นๆ'
]

const loadVehicleData = () => {
  if (profile.value) {
    const p = profile.value as any
    vehicleType.value = p.vehicle_type || ''
    vehiclePlate.value = p.vehicle_plate || ''
    vehicleColor.value = p.vehicle_color || ''
    vehicleBrand.value = p.vehicle_brand || p.vehicle_info?.brand || ''
    vehicleModel.value = p.vehicle_model || p.vehicle_info?.model || ''
    vehicleYear.value = p.vehicle_year?.toString() || p.vehicle_info?.year || ''
  }
}

// Validation functions
const validateYear = (year: string): string | null => {
  if (!year) return null // Optional field
  const yearNum = parseInt(year)
  const currentYear = new Date().getFullYear()
  if (!/^\d+$/.test(year)) return 'ปีต้องเป็นตัวเลขเท่านั้น'
  if (year.length < 3 || year.length > 4) return 'ปีต้องมี 3-4 หลัก'
  if (yearNum < 1900 || yearNum > currentYear + 1) return `ปีต้องอยู่ระหว่าง 1900-${currentYear + 1}`
  return null
}

const validatePlate = (plate: string): string | null => {
  if (!plate) return null // Optional field
  // Thai license plate patterns:
  // - กข 1234 (2 Thai chars + space + 1-4 digits)
  // - 1กข 1234 (1 digit + 2 Thai chars + space + 1-4 digits)
  // - กข-1234 (with dash)
  // Allow flexible format: Thai chars, numbers, spaces, dashes
  const thaiPattern = /^[ก-ฮ0-9\s\-]+$/
  if (!thaiPattern.test(plate)) return 'ทะเบียนต้องเป็นภาษาไทยและตัวเลข'
  if (plate.replace(/[\s\-]/g, '').length < 3) return 'ทะเบียนต้องมีอย่างน้อย 3 ตัวอักษร'
  if (plate.length > 20) return 'ทะเบียนยาวเกินไป'
  return null
}

const validateForm = (): boolean => {
  errors.value = {}
  
  const yearError = validateYear(vehicleYear.value)
  if (yearError) errors.value.year = yearError
  
  const plateError = validatePlate(vehiclePlate.value)
  if (plateError) errors.value.plate = plateError
  
  return Object.keys(errors.value).length === 0
}

const saveChanges = async () => {
  if (!profile.value) return
  
  // Validate before saving
  if (!validateForm()) {
    error.value = 'กรุณาตรวจสอบข้อมูลให้ถูกต้อง'
    return
  }
  
  isSaving.value = true
  error.value = ''
  success.value = ''

  try {
    await updateProfile({
      vehicle_type: vehicleType.value || null,
      vehicle_plate: vehiclePlate.value || null,
      vehicle_color: vehicleColor.value || null,
      vehicle_brand: vehicleBrand.value || null,
      vehicle_model: vehicleModel.value || null,
      vehicle_year: vehicleYear.value ? parseInt(vehicleYear.value) : null
    })
    success.value = 'บันทึกข้อมูลสำเร็จ'
    isEditing.value = false
    errors.value = {}
  } catch (e: any) {
    error.value = e.message || 'เกิดข้อผิดพลาด'
  } finally {
    isSaving.value = false
  }
}

const cancelEdit = () => {
  loadVehicleData()
  isEditing.value = false
  error.value = ''
  errors.value = {}
}

// Real-time validation on input
const onYearInput = () => {
  // Allow only numbers
  vehicleYear.value = vehicleYear.value.replace(/[^0-9]/g, '')
  if (isEditing.value) {
    const err = validateYear(vehicleYear.value)
    if (err) errors.value.year = err
    else delete errors.value.year
  }
}

const onPlateInput = () => {
  if (isEditing.value) {
    const err = validatePlate(vehiclePlate.value)
    if (err) errors.value.plate = err
    else delete errors.value.plate
  }
}

onMounted(async () => {
  await fetchProfile()
  loadVehicleData()
  isLoading.value = false
})
</script>

<template>
  <ProviderLayout>
    <div class="vehicle-page">
      <div class="page-content">
        <!-- Header -->
        <div class="page-header">
          <button @click="router.push('/provider/profile')" class="back-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>ข้อมูลยานพาหนะ</h1>
          <button v-if="!isEditing" @click="isEditing = true" class="edit-btn">แก้ไข</button>
          <div v-else class="header-spacer"></div>
        </div>

        <!-- Messages -->
        <div v-if="error" class="message error">{{ error }}</div>
        <div v-if="success" class="message success">{{ success }}</div>

        <!-- Loading -->
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <!-- Content -->
        <template v-else>
          <!-- Vehicle Icon -->
          <div class="vehicle-icon-card">
            <div class="vehicle-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
              </svg>
            </div>
            <span class="vehicle-label">{{ vehicleBrand }} {{ vehicleModel }}</span>
            <span class="vehicle-plate">{{ vehiclePlate || 'ยังไม่ระบุทะเบียน' }}</span>
          </div>

          <!-- Form -->
          <div class="form-card">
            <div class="form-group">
              <label>ประเภทยานพาหนะ</label>
              <select v-model="vehicleType" :disabled="!isEditing" class="input-field">
                <option value="">เลือกประเภท</option>
                <option v-for="type in vehicleTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>ยี่ห้อ</label>
                <input v-model="vehicleBrand" :disabled="!isEditing" type="text" placeholder="เช่น Toyota" class="input-field" />
              </div>
              <div class="form-group">
                <label>รุ่น</label>
                <input v-model="vehicleModel" :disabled="!isEditing" type="text" placeholder="เช่น Vios" class="input-field" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>ปี (ค.ศ.)</label>
                <input 
                  v-model="vehicleYear" 
                  :disabled="!isEditing" 
                  type="text" 
                  maxlength="4" 
                  placeholder="2020" 
                  :class="['input-field', { 'input-error': errors.year }]"
                  @input="onYearInput"
                />
                <span v-if="errors.year" class="field-error">{{ errors.year }}</span>
              </div>
              <div class="form-group">
                <label>ทะเบียนรถ</label>
                <input 
                  v-model="vehiclePlate" 
                  :disabled="!isEditing" 
                  type="text" 
                  placeholder="กข 1234" 
                  :class="['input-field', { 'input-error': errors.plate }]"
                  @input="onPlateInput"
                />
                <span v-if="errors.plate" class="field-error">{{ errors.plate }}</span>
              </div>
            </div>

            <div class="form-group">
              <label>สีรถ</label>
              <select v-model="vehicleColor" :disabled="!isEditing" class="input-field">
                <option value="">เลือกสี</option>
                <option v-for="color in colors" :key="color" :value="color">{{ color }}</option>
              </select>
            </div>
          </div>

          <!-- Action Buttons -->
          <div v-if="isEditing" class="action-buttons">
            <button @click="cancelEdit" class="btn-secondary">ยกเลิก</button>
            <button @click="saveChanges" :disabled="isSaving" class="btn-primary">
              {{ isSaving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </ProviderLayout>
</template>

<style scoped>
.vehicle-page { min-height: 100vh; }
.page-content { max-width: 480px; margin: 0 auto; padding: 16px; }

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.page-header h1 { flex: 1; font-size: 20px; font-weight: 600; }
.back-btn {
  width: 40px; height: 40px;
  background: none; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.back-btn svg { width: 24px; height: 24px; }
.edit-btn {
  padding: 8px 16px;
  background: #F6F6F6; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 500; cursor: pointer;
}
.header-spacer { width: 60px; }

.message {
  padding: 12px 16px; border-radius: 8px;
  font-size: 14px; margin-bottom: 16px;
}
.message.error { background: #FEE2E2; color: #E11900; }
.message.success { background: #E8F5E9; color: #05944F; }

.loading-state {
  display: flex; justify-content: center; padding: 60px 0;
}
.spinner {
  width: 32px; height: 32px;
  border: 3px solid #E5E5E5; border-top-color: #000;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.vehicle-icon-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 32px 20px; background: #FFFFFF;
  border-radius: 16px; margin-bottom: 16px; text-align: center;
}
.vehicle-icon {
  width: 80px; height: 80px;
  display: flex; align-items: center; justify-content: center;
  background: #F6F6F6; border-radius: 50%; margin-bottom: 16px;
}
.vehicle-icon svg { width: 40px; height: 40px; }
.vehicle-label { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.vehicle-plate { font-size: 14px; color: #6B6B6B; }

.form-card {
  background: #FFFFFF; border-radius: 16px; padding: 20px; margin-bottom: 16px;
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { margin-bottom: 16px; }
.form-group label {
  display: block; font-size: 14px; font-weight: 500;
  color: #000; margin-bottom: 8px;
}
.input-field {
  width: 100%; padding: 14px 16px;
  border: 1px solid #E5E5E5; border-radius: 8px;
  font-size: 16px; background: #FFFFFF;
}
.input-field:focus { outline: none; border-color: #000; }
.input-field:disabled { background: #F6F6F6; color: #6B6B6B; }
.input-field.input-error { border-color: #E11900; }
.field-error { display: block; font-size: 12px; color: #E11900; margin-top: 4px; }

.action-buttons { display: flex; gap: 12px; }
.btn-secondary, .btn-primary {
  flex: 1; padding: 14px 24px;
  border: none; border-radius: 8px;
  font-size: 16px; font-weight: 500; cursor: pointer;
}
.btn-secondary { background: #F6F6F6; color: #000; }
.btn-primary { background: #000; color: #FFF; }
.btn-primary:disabled { background: #CCC; cursor: not-allowed; }
</style>
