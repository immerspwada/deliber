<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useImageUtils } from '../composables/useImageUtils'
import { supabase } from '../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()
const { validateThaiID, performOCR } = useImageUtils()

const isLoading = ref(false)
const error = ref('')
const successMessage = ref('')
const step = ref(1)

// Form data
const selectedType = ref<'driver' | 'rider'>('driver')
const vehicleType = ref('')
const vehicleBrand = ref('')
const vehicleModel = ref('')
const vehicleYear = ref('')
const licensePlate = ref('')
const licenseNumber = ref('')
const licenseExpiry = ref('')
const acceptTerms = ref(false)

// Thai ID validation
const nationalId = ref('')
const nationalIdError = ref('')
const nationalIdValid = ref(false)

// OCR processing
const ocrProgress = ref(0)
const ocrStatus = ref('')
const isProcessingOCR = ref(false)

// Document uploads
const idCardFile = ref<File | null>(null)
const licenseFile = ref<File | null>(null)
const vehicleFile = ref<File | null>(null)
const idCardPreview = ref('')
const licensePreview = ref('')
const vehiclePreview = ref('')
const uploadProgress = ref(0)

// Vehicle options
const vehicleOptions = {
  driver: [
    { value: 'car', label: 'รถยนต์', icon: 'car' },
    { value: 'suv', label: 'รถ SUV', icon: 'suv' },
    { value: 'van', label: 'รถตู้', icon: 'van' }
  ],
  rider: [
    { value: 'motorcycle', label: 'มอเตอร์ไซค์', icon: 'motorcycle' },
    { value: 'bicycle', label: 'จักรยาน', icon: 'bicycle' }
  ]
}

const currentVehicleOptions = computed(() => vehicleOptions[selectedType.value])

// Real-time Thai ID validation
watch(nationalId, (value) => {
  // Remove non-digits
  const cleaned = value.replace(/\D/g, '')
  if (cleaned !== value) {
    nationalId.value = cleaned
    return
  }
  
  if (cleaned.length === 0) {
    nationalIdError.value = ''
    nationalIdValid.value = false
  } else if (cleaned.length < 13) {
    nationalIdError.value = `กรอกอีก ${13 - cleaned.length} หลัก`
    nationalIdValid.value = false
  } else if (cleaned.length === 13) {
    if (validateThaiID(cleaned)) {
      nationalIdError.value = ''
      nationalIdValid.value = true
    } else {
      nationalIdError.value = 'เลขบัตรประชาชนไม่ถูกต้อง'
      nationalIdValid.value = false
    }
  } else {
    nationalId.value = cleaned.slice(0, 13)
  }
})

// Format Thai ID for display (x-xxxx-xxxxx-xx-x)
const formattedNationalId = computed(() => {
  const id = nationalId.value
  if (id.length <= 1) return id
  if (id.length <= 5) return `${id.slice(0, 1)}-${id.slice(1)}`
  if (id.length <= 10) return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5)}`
  if (id.length <= 12) return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10)}`
  return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id.slice(12)}`
})

// Validations
const canProceedStep1 = computed(() => !!selectedType.value)

const canProceedStep2 = computed(() => 
  vehicleType.value && 
  vehicleBrand.value.trim().length >= 2 &&
  vehicleModel.value.trim().length >= 1 &&
  licensePlate.value.trim().length >= 4
)

const canProceedStep3 = computed(() => 
  licenseNumber.value.trim().length >= 6 &&
  licenseExpiry.value &&
  nationalIdValid.value
)

const canSubmit = computed(() => 
  idCardFile.value &&
  licenseFile.value &&
  vehicleFile.value &&
  acceptTerms.value
)

// Image compression utility
const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        
        // Scale down if larger than maxWidth
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }
        
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              console.log(`Compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`)
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// File handling with compression and OCR
const handleFileSelect = async (type: 'idCard' | 'license' | 'vehicle', event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  // Validate file
  if (!file.type.startsWith('image/')) {
    error.value = 'กรุณาเลือกไฟล์รูปภาพเท่านั้น'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'ไฟล์ต้องมีขนาดไม่เกิน 10MB'
    return
  }
  
  error.value = ''
  
  try {
    // Compress image
    ocrStatus.value = 'กำลังบีบอัดรูปภาพ...'
    ocrProgress.value = 10
    const compressedFile = await compressImage(file)
    ocrProgress.value = 30
    
    // Set preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (type === 'idCard') {
        idCardFile.value = compressedFile
        idCardPreview.value = result
      } else if (type === 'license') {
        licenseFile.value = compressedFile
        licensePreview.value = result
      } else {
        vehicleFile.value = compressedFile
        vehiclePreview.value = result
      }
    }
    reader.readAsDataURL(compressedFile)
    
    // Perform OCR for ID card and license
    if (type === 'idCard' || type === 'license') {
      isProcessingOCR.value = true
      ocrStatus.value = 'กำลังอ่านข้อมูลจากเอกสาร...'
      ocrProgress.value = 50
      
      try {
        const ocrResult = await performOCR(compressedFile, type === 'idCard' ? 'id_card' : 'license')
        ocrProgress.value = 90
        
        if (ocrResult.success && ocrResult.data) {
          // Auto-fill data from OCR
          if (type === 'idCard' && ocrResult.data.idNumber) {
            nationalId.value = ocrResult.data.idNumber
            ocrStatus.value = 'อ่านเลขบัตรประชาชนสำเร็จ'
          }
          if (type === 'license') {
            if (ocrResult.data.licenseNumber) {
              licenseNumber.value = ocrResult.data.licenseNumber
            }
            if (ocrResult.data.expiryDate) {
              // Convert DD/MM/YYYY to YYYY-MM-DD for date input
              const parts = ocrResult.data.expiryDate.split('/')
              if (parts.length === 3) {
                const year = parseInt(parts[2] || '0')
                // Convert Buddhist year to Christian year if needed
                const christianYear = year > 2500 ? year - 543 : year
                licenseExpiry.value = `${christianYear}-${parts[1]?.padStart(2, '0')}-${parts[0]?.padStart(2, '0')}`
              }
            }
            ocrStatus.value = 'อ่านข้อมูลใบขับขี่สำเร็จ'
          }
        }
      } catch (ocrErr) {
        console.warn('OCR failed:', ocrErr)
        ocrStatus.value = 'ไม่สามารถอ่านข้อมูลได้ กรุณากรอกเอง'
      }
      
      ocrProgress.value = 100
      setTimeout(() => {
        isProcessingOCR.value = false
        ocrProgress.value = 0
        ocrStatus.value = ''
      }, 2000)
    }
  } catch (err) {
    console.error('Processing error:', err)
    error.value = 'ไม่สามารถประมวลผลรูปภาพได้'
    isProcessingOCR.value = false
    ocrProgress.value = 0
  }
}

const removeFile = (type: 'idCard' | 'license' | 'vehicle') => {
  if (type === 'idCard') {
    idCardFile.value = null
    idCardPreview.value = ''
  } else if (type === 'license') {
    licenseFile.value = null
    licensePreview.value = ''
  } else {
    vehicleFile.value = null
    vehiclePreview.value = ''
  }
}

// Convert file to base64 (fallback when storage not available)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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

// Submit
const submitApplication = async () => {
  if (!canSubmit.value || !authStore.user) return
  
  isLoading.value = true
  error.value = ''
  uploadProgress.value = 0
  
  try {
    const userId = authStore.user.id
    
    // Convert documents to base64 directly (simpler approach)
    uploadProgress.value = 10
    let idCardData = ''
    let licenseData = ''
    let vehicleData = ''
    
    if (idCardFile.value) {
      idCardData = await fileToBase64(idCardFile.value)
      uploadProgress.value = 30
    }
    
    if (licenseFile.value) {
      licenseData = await fileToBase64(licenseFile.value)
      uploadProgress.value = 50
    }
    
    if (vehicleFile.value) {
      vehicleData = await fileToBase64(vehicleFile.value)
      uploadProgress.value = 70
    }
    
    // Create provider profile
    const { error: insertError } = await (supabase
      .from('service_providers') as any)
      .insert({
        user_id: userId,
        provider_type: selectedType.value,
        vehicle_type: vehicleType.value,
        vehicle_info: {
          brand: vehicleBrand.value,
          model: vehicleModel.value,
          year: vehicleYear.value,
          license_plate: licensePlate.value
        },
        license_number: licenseNumber.value,
        license_expiry: licenseExpiry.value,
        documents: {
          id_card: idCardData,
          license: licenseData,
          vehicle: vehicleData
        },
        status: 'pending',
        is_available: false,
        rating: 5.0,
        total_trips: 0
      })
    
    uploadProgress.value = 90
    
    if (insertError) {
      if (insertError.code === '23505') {
        error.value = 'คุณได้สมัครเป็นผู้ให้บริการแล้ว'
      } else {
        error.value = insertError.message
      }
      return
    }
    
    uploadProgress.value = 100
    successMessage.value = 'สมัครสำเร็จ! รอการอนุมัติจากทีมงาน'
    setTimeout(() => {
      router.push('/provider')
    }, 2000)
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  if (step.value > 1) {
    prevStep()
  } else {
    router.push('/')
  }
}

onMounted(() => {
  if (!authStore.user) {
    router.push('/login')
  }
})
</script>

<template>
  <div class="provider-register-page">
    <!-- Header -->
    <div class="page-header">
      <button @click="goBack" class="back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1 class="header-title">สมัครเป็นผู้ให้บริการ</h1>
      <div class="header-spacer"></div>
    </div>

    <!-- Progress -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${(step / 4) * 100}%` }"></div>
    </div>

    <div class="page-content">
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

      <!-- Step 1: Select Type -->
      <div v-if="step === 1" class="step-content">
        <h2 class="step-title">คุณต้องการเป็นอะไร?</h2>
        <p class="step-desc">เลือกประเภทผู้ให้บริการ</p>

        <div class="type-options">
          <button 
            @click="selectedType = 'driver'"
            :class="['type-card', { 'type-card-active': selectedType === 'driver' }]"
          >
            <div class="type-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div class="type-info">
              <span class="type-title">คนขับรถ (Driver)</span>
              <span class="type-desc">รับส่งผู้โดยสาร ด้วยรถยนต์</span>
            </div>
            <div class="type-check">
              <svg v-if="selectedType === 'driver'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
          </button>

          <button 
            @click="selectedType = 'rider'"
            :class="['type-card', { 'type-card-active': selectedType === 'rider' }]"
          >
            <div class="type-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18.5" cy="17.5" r="3.5"/>
                <circle cx="5.5" cy="17.5" r="3.5"/>
                <circle cx="15" cy="5" r="1"/>
                <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
              </svg>
            </div>
            <div class="type-info">
              <span class="type-title">ไรเดอร์ (Rider)</span>
              <span class="type-desc">ส่งอาหาร ส่งพัสดุ ด้วยมอเตอร์ไซค์</span>
            </div>
            <div class="type-check">
              <svg v-if="selectedType === 'rider'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
          </button>
        </div>

        <div class="benefits-card">
          <h3>สิทธิประโยชน์</h3>
          <ul>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              รายได้ดี ถอนเงินได้ทุกวัน
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              เลือกเวลาทำงานได้เอง
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              ประกันอุบัติเหตุฟรี
            </li>
          </ul>
        </div>

        <button @click="nextStep" :disabled="!canProceedStep1" class="btn-primary">
          ถัดไป
        </button>
      </div>

      <!-- Step 2: Vehicle Info -->
      <div v-if="step === 2" class="step-content">
        <h2 class="step-title">ข้อมูลยานพาหนะ</h2>
        <p class="step-desc">กรอกข้อมูลรถที่จะใช้ให้บริการ</p>

        <div class="form-group">
          <label class="label">ประเภทยานพาหนะ</label>
          <div class="vehicle-options">
            <button 
              v-for="option in currentVehicleOptions" 
              :key="option.value"
              @click="vehicleType = option.value"
              :class="['vehicle-btn', { 'vehicle-btn-active': vehicleType === option.value }]"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">ยี่ห้อ</label>
            <input v-model="vehicleBrand" type="text" placeholder="เช่น Toyota, Honda" class="input-field" />
          </div>
          <div class="form-group">
            <label class="label">รุ่น</label>
            <input v-model="vehicleModel" type="text" placeholder="เช่น Vios, City" class="input-field" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">ปี (ค.ศ.)</label>
            <input v-model="vehicleYear" type="text" inputmode="numeric" maxlength="4" placeholder="2020" class="input-field" />
          </div>
          <div class="form-group">
            <label class="label">ทะเบียนรถ</label>
            <input v-model="licensePlate" type="text" placeholder="กข 1234" class="input-field" />
          </div>
        </div>

        <div class="button-group">
          <button @click="prevStep" class="btn-secondary">ย้อนกลับ</button>
          <button @click="nextStep" :disabled="!canProceedStep2" class="btn-primary">ถัดไป</button>
        </div>
      </div>

      <!-- Step 3: License Info -->
      <div v-if="step === 3" class="step-content">
        <h2 class="step-title">ข้อมูลส่วนตัวและใบขับขี่</h2>
        <p class="step-desc">กรอกข้อมูลเพื่อยืนยันตัวตน</p>

        <!-- Thai National ID -->
        <div class="form-group">
          <label class="label">เลขบัตรประชาชน 13 หลัก</label>
          <div class="id-input-wrapper">
            <input 
              v-model="nationalId" 
              type="text" 
              inputmode="numeric"
              maxlength="13"
              placeholder="x-xxxx-xxxxx-xx-x" 
              :class="['input-field', { 
                'input-valid': nationalIdValid, 
                'input-error': nationalIdError && nationalId.length > 0 
              }]" 
            />
            <div v-if="nationalIdValid" class="input-icon valid">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div v-else-if="nationalIdError && nationalId.length > 0" class="input-icon error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
            </div>
          </div>
          <span v-if="nationalId.length > 0" :class="['field-hint', { 'hint-error': nationalIdError, 'hint-valid': nationalIdValid }]">
            {{ nationalIdError || (nationalIdValid ? 'เลขบัตรถูกต้อง' : '') }}
          </span>
          <span class="field-format">{{ formattedNationalId }}</span>
        </div>

        <div class="form-group">
          <label class="label">เลขที่ใบอนุญาตขับขี่</label>
          <input v-model="licenseNumber" type="text" placeholder="12345678" class="input-field" />
        </div>

        <div class="form-group">
          <label class="label">วันหมดอายุใบขับขี่</label>
          <input v-model="licenseExpiry" type="date" class="input-field" />
        </div>

        <div class="button-group">
          <button @click="prevStep" class="btn-secondary">ย้อนกลับ</button>
          <button @click="nextStep" :disabled="!canProceedStep3" class="btn-primary">ถัดไป</button>
        </div>
      </div>

      <!-- Step 4: Document Upload & Submit -->
      <div v-if="step === 4" class="step-content">
        <h2 class="step-title">อัพโหลดเอกสาร</h2>
        <p class="step-desc">อัพโหลดรูปเอกสารเพื่อยืนยันตัวตน</p>

        <!-- OCR Progress -->
        <div v-if="isProcessingOCR" class="ocr-progress-card">
          <div class="ocr-progress-header">
            <div class="ocr-spinner"></div>
            <span>{{ ocrStatus }}</span>
          </div>
          <div class="ocr-progress-bar">
            <div class="ocr-progress-fill" :style="{ width: `${ocrProgress}%` }"></div>
          </div>
          <span class="ocr-progress-text">{{ ocrProgress }}%</span>
        </div>

        <!-- ID Card Upload -->
        <div class="upload-group">
          <label class="label">รูปบัตรประชาชน</label>
          <p class="upload-desc">ระบบจะอ่านเลขบัตรประชาชนอัตโนมัติ</p>
          <div v-if="!idCardPreview" class="upload-box" @click="($refs.idCardInput as HTMLInputElement).click()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              <circle cx="8" cy="15" r="1"/><path d="M14 15h4"/>
            </svg>
            <span>แตะเพื่อเลือกรูป</span>
            <span class="upload-hint">JPG, PNG ไม่เกิน 5MB</span>
          </div>
          <div v-else class="upload-preview">
            <img :src="idCardPreview" alt="ID Card" />
            <button @click="removeFile('idCard')" class="remove-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <input ref="idCardInput" type="file" accept="image/*" hidden @change="handleFileSelect('idCard', $event)" />
        </div>

        <!-- License Upload -->
        <div class="upload-group">
          <label class="label">รูปใบขับขี่</label>
          <div v-if="!licensePreview" class="upload-box" @click="($refs.licenseInput as HTMLInputElement).click()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M7 15h2M14 15h4"/>
            </svg>
            <span>แตะเพื่อเลือกรูป</span>
            <span class="upload-hint">JPG, PNG ไม่เกิน 5MB</span>
          </div>
          <div v-else class="upload-preview">
            <img :src="licensePreview" alt="License" />
            <button @click="removeFile('license')" class="remove-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <input ref="licenseInput" type="file" accept="image/*" hidden @change="handleFileSelect('license', $event)" />
        </div>

        <!-- Vehicle Upload -->
        <div class="upload-group">
          <label class="label">รูปยานพาหนะ (เห็นทะเบียนชัด)</label>
          <div v-if="!vehiclePreview" class="upload-box" @click="($refs.vehicleInput as HTMLInputElement).click()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <span>แตะเพื่อเลือกรูป</span>
            <span class="upload-hint">JPG, PNG ไม่เกิน 5MB</span>
          </div>
          <div v-else class="upload-preview">
            <img :src="vehiclePreview" alt="Vehicle" />
            <button @click="removeFile('vehicle')" class="remove-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <input ref="vehicleInput" type="file" accept="image/*" hidden @change="handleFileSelect('vehicle', $event)" />
        </div>

        <div class="info-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          <p>หลังจากสมัคร ทีมงานจะตรวจสอบเอกสารและติดต่อกลับภายใน 1-3 วันทำการ</p>
        </div>

        <label class="terms-checkbox">
          <input v-model="acceptTerms" type="checkbox" />
          <span class="checkmark"></span>
          <span class="terms-text">
            ฉันยอมรับ <a href="#" @click.prevent>ข้อกำหนดสำหรับผู้ให้บริการ</a> และยืนยันว่าข้อมูลและเอกสารทั้งหมดเป็นความจริง
          </span>
        </label>

        <!-- Upload Progress -->
        <div v-if="isLoading && uploadProgress > 0" class="upload-progress">
          <div class="progress-track">
            <div class="progress-bar-fill" :style="{ width: `${uploadProgress}%` }"></div>
          </div>
          <span>กำลังอัพโหลด {{ uploadProgress }}%</span>
        </div>

        <div class="button-group">
          <button @click="prevStep" :disabled="isLoading" class="btn-secondary">ย้อนกลับ</button>
          <button @click="submitApplication" :disabled="!canSubmit || isLoading" class="btn-primary">
            <span v-if="isLoading" class="btn-loading">
              <span class="spinner"></span>
              กำลังส่ง
            </span>
            <span v-else>ส่งใบสมัคร</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.provider-register-page {
  min-height: 100vh;
  background-color: #FFFFFF;
}

.page-header {
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

.page-content {
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

/* Type Selection */
.type-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.type-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.type-card:hover {
  background-color: #EBEBEB;
}

.type-card-active {
  background-color: #FFFFFF;
  border-color: #000000;
}

.type-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF;
  border-radius: 12px;
}

.type-card-active .type-icon {
  background-color: #000000;
  color: #FFFFFF;
}

.type-icon svg {
  width: 28px;
  height: 28px;
}

.type-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.type-title {
  font-size: 16px;
  font-weight: 600;
  color: #000000;
}

.type-desc {
  font-size: 13px;
  color: #6B6B6B;
}

.type-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #E5E5E5;
  border-radius: 50%;
}

.type-card-active .type-check {
  background-color: #000000;
  border-color: #000000;
  color: #FFFFFF;
}

.type-check svg {
  width: 14px;
  height: 14px;
}

/* Benefits Card */
.benefits-card {
  padding: 20px;
  background-color: #F6F6F6;
  border-radius: 12px;
  margin-bottom: 24px;
}

.benefits-card h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.benefits-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.benefits-card li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #000000;
}

.benefits-card li svg {
  width: 18px;
  height: 18px;
  color: #276EF1;
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

/* Vehicle Options */
.vehicle-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.vehicle-btn {
  padding: 12px 20px;
  background-color: #F6F6F6;
  border: 2px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vehicle-btn:hover {
  background-color: #EBEBEB;
}

.vehicle-btn-active {
  background-color: #000000;
  color: #FFFFFF;
  border-color: #000000;
}

/* Info Card */
.info-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: #F6F6F6;
  border-radius: 8px;
  margin-bottom: 20px;
}

.info-card svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #6B6B6B;
}

.info-card p {
  font-size: 13px;
  color: #6B6B6B;
  line-height: 1.5;
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

/* Upload Styles */
.upload-group {
  margin-bottom: 20px;
}

.upload-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px;
  background-color: #F6F6F6;
  border: 2px dashed #E5E5E5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-box:hover {
  border-color: #000000;
  background-color: #EBEBEB;
}

.upload-box svg {
  width: 32px;
  height: 32px;
  color: #6B6B6B;
}

.upload-box span {
  font-size: 14px;
  color: #000000;
  font-weight: 500;
}

.upload-hint {
  font-size: 12px !important;
  color: #6B6B6B !important;
  font-weight: 400 !important;
}

.upload-preview {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
}

.upload-preview img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 12px;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #FFFFFF;
}

.remove-btn svg {
  width: 16px;
  height: 16px;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.progress-track {
  height: 8px;
  background-color: #E5E5E5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: #276EF1;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.upload-progress span {
  font-size: 13px;
  color: #6B6B6B;
  text-align: center;
}

@media (max-width: 400px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

/* Thai ID Input */
.id-input-wrapper {
  position: relative;
}

.id-input-wrapper .input-field {
  padding-right: 44px;
}

.input-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
}

.input-icon.valid {
  color: #05944F;
}

.input-icon.error {
  color: #E11900;
}

.input-icon svg {
  width: 100%;
  height: 100%;
}

.input-field.input-valid {
  border-color: #05944F;
}

.input-field.input-error {
  border-color: #E11900;
}

.field-hint {
  display: block;
  font-size: 12px;
  margin-top: 6px;
  color: #6B6B6B;
}

.field-hint.hint-error {
  color: #E11900;
}

.field-hint.hint-valid {
  color: #05944F;
}

.field-format {
  display: block;
  font-size: 13px;
  color: #999;
  margin-top: 4px;
  font-family: monospace;
  letter-spacing: 1px;
}

/* OCR Progress */
.ocr-progress-card {
  padding: 16px;
  background: #F6F6F6;
  border-radius: 12px;
  margin-bottom: 20px;
}

.ocr-progress-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.ocr-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.ocr-progress-header span {
  font-size: 14px;
  font-weight: 500;
}

.ocr-progress-bar {
  height: 6px;
  background: #E5E5E5;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.ocr-progress-fill {
  height: 100%;
  background: #000;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.ocr-progress-text {
  font-size: 12px;
  color: #6B6B6B;
}

.upload-desc {
  font-size: 12px;
  color: #6B6B6B;
  margin-bottom: 8px;
}
</style>
