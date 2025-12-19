<script setup lang="ts">
/**
 * ProviderRegisterView - หน้าสมัครเป็นคนขับ GOBEAR
 * MUNEEF Style: สีเขียว #00A86B
 * Flow: 4 ขั้นตอน → สมัครสำเร็จ → รอ Admin อนุมัติ
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useImageUtils } from '../composables/useImageUtils'
import { useHapticFeedback } from '../composables/useHapticFeedback'
import { supabase } from '../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()
const haptic = useHapticFeedback()
const { validateThaiID, performOCR } = useImageUtils()

// State
const isLoading = ref(false)
const error = ref('')
const step = ref(1)
const showSuccess = ref(false)

// Form data - ไม่ต้องเลือกประเภทงานแล้ว Admin จะเปิดสิทธิ์ให้ทีหลัง
const vehicleType = ref('')
const vehicleBrand = ref('')
const vehicleModel = ref('')
const vehicleYear = ref('')
const vehiclePlate = ref('')
const vehicleColor = ref('')
const licenseNumber = ref('')
const licenseExpiry = ref('')
const acceptTerms = ref(false)

// Thai ID
const nationalId = ref('')
const nationalIdError = ref('')
const nationalIdValid = ref(false)

// Documents
const idCardFile = ref<File | null>(null)
const licenseFile = ref<File | null>(null)
const vehicleFile = ref<File | null>(null)
const idCardPreview = ref('')
const licensePreview = ref('')
const vehiclePreview = ref('')

// OCR & Upload progress
const isProcessingOCR = ref(false)
const ocrStatus = ref('')
const uploadProgress = ref(0)

// Steps config - 3 ขั้นตอน (ไม่ต้องเลือกประเภทงาน)
const steps = [
  { num: 1, title: 'ยานพาหนะ', icon: 'car' },
  { num: 2, title: 'ข้อมูล', icon: 'id' },
  { num: 3, title: 'เอกสาร', icon: 'doc' }
]

// Vehicle options - รวมทุกประเภท
const vehicleOptions = [
  { value: 'motorcycle', label: 'มอเตอร์ไซค์' },
  { value: 'car', label: 'รถยนต์' },
  { value: 'suv', label: 'รถ SUV' },
  { value: 'van', label: 'รถตู้' },
  { value: 'pickup', label: 'รถกระบะ' },
  { value: 'bicycle', label: 'จักรยาน' }
]

const colorOptions = [
  { value: 'black', label: 'ดำ', color: '#1A1A1A' },
  { value: 'white', label: 'ขาว', color: '#FFFFFF' },
  { value: 'silver', label: 'เงิน', color: '#C0C0C0' },
  { value: 'red', label: 'แดง', color: '#E53935' },
  { value: 'blue', label: 'น้ำเงิน', color: '#2196F3' },
  { value: 'green', label: 'เขียว', color: '#4CAF50' },
  { value: 'other', label: 'อื่นๆ', color: '#9E9E9E' }
]

// ใช้ vehicleOptions โดยตรง (ไม่ต้อง filter ตาม type แล้ว)

// Thai ID validation
watch(nationalId, (value) => {
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
      haptic.success()
    } else {
      nationalIdError.value = 'เลขบัตรประชาชนไม่ถูกต้อง'
      nationalIdValid.value = false
    }
  } else {
    nationalId.value = cleaned.slice(0, 13)
  }
})

const formattedNationalId = computed(() => {
  const id = nationalId.value
  if (id.length <= 1) return id
  if (id.length <= 5) return `${id.slice(0, 1)}-${id.slice(1)}`
  if (id.length <= 10) return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5)}`
  if (id.length <= 12) return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10)}`
  return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id.slice(12)}`
})

// Validations - 3 ขั้นตอน
const canProceedStep1 = computed(() => 
  vehicleType.value && 
  vehicleBrand.value.trim().length >= 2 &&
  vehicleModel.value.trim().length >= 1 &&
  vehiclePlate.value.trim().length >= 4 &&
  vehicleColor.value
)
const canProceedStep2 = computed(() => 
  licenseNumber.value.trim().length >= 6 &&
  licenseExpiry.value &&
  nationalIdValid.value
)
const canProceedStep3 = computed(() => 
  idCardFile.value && licenseFile.value && vehicleFile.value && acceptTerms.value
)
// canSubmit = canProceedStep3 สำหรับ step สุดท้าย
const canSubmit = canProceedStep3

// Image compression
const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(file); return }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
          } else { resolve(file) }
        }, 'image/jpeg', quality)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

// File handling
const handleFileSelect = async (type: 'idCard' | 'license' | 'vehicle', event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    error.value = 'กรุณาเลือกไฟล์รูปภาพเท่านั้น'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'ไฟล์ต้องมีขนาดไม่เกิน 10MB'
    return
  }
  
  error.value = ''
  haptic.light()
  
  try {
    isProcessingOCR.value = true
    ocrStatus.value = 'กำลังประมวลผล...'
    const compressedFile = await compressImage(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (type === 'idCard') { idCardFile.value = compressedFile; idCardPreview.value = result }
      else if (type === 'license') { licenseFile.value = compressedFile; licensePreview.value = result }
      else { vehicleFile.value = compressedFile; vehiclePreview.value = result }
    }
    reader.readAsDataURL(compressedFile)
    
    // OCR for ID card and license
    if (type === 'idCard' || type === 'license') {
      ocrStatus.value = 'กำลังอ่านข้อมูล...'
      try {
        const ocrResult = await performOCR(compressedFile, type === 'idCard' ? 'id_card' : 'license')
        if (ocrResult.success && ocrResult.data) {
          if (type === 'idCard' && ocrResult.data.idNumber) {
            nationalId.value = ocrResult.data.idNumber
            ocrStatus.value = 'อ่านเลขบัตรสำเร็จ!'
          }
          if (type === 'license') {
            if (ocrResult.data.licenseNumber) licenseNumber.value = ocrResult.data.licenseNumber
            if (ocrResult.data.expiryDate) {
              const parts = ocrResult.data.expiryDate.split('/')
              if (parts.length === 3) {
                const year = parseInt(parts[2] || '0')
                const christianYear = year > 2500 ? year - 543 : year
                licenseExpiry.value = `${christianYear}-${parts[1]?.padStart(2, '0')}-${parts[0]?.padStart(2, '0')}`
              }
            }
            ocrStatus.value = 'อ่านข้อมูลใบขับขี่สำเร็จ!'
          }
          haptic.success()
        }
      } catch { ocrStatus.value = 'กรุณากรอกข้อมูลเอง' }
    }
    
    setTimeout(() => { isProcessingOCR.value = false; ocrStatus.value = '' }, 2000)
  } catch (err) {
    error.value = 'ไม่สามารถประมวลผลรูปภาพได้'
    isProcessingOCR.value = false
  }
}

const removeFile = (type: 'idCard' | 'license' | 'vehicle') => {
  haptic.light()
  if (type === 'idCard') { idCardFile.value = null; idCardPreview.value = '' }
  else if (type === 'license') { licenseFile.value = null; licensePreview.value = '' }
  else { vehicleFile.value = null; vehiclePreview.value = '' }
}

// Upload file to Supabase Storage
const uploadToStorage = async (file: File, path: string): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${path}_${Date.now()}.${fileExt}`
  const filePath = `provider-documents/${fileName}`
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) {
    // If bucket doesn't exist, try public bucket
    const { data: publicData, error: publicError } = await supabase.storage
      .from('public')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (publicError) {
      throw new Error(`อัพโหลดไฟล์ไม่สำเร็จ: ${publicError.message}`)
    }
    
    const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath)
    return urlData.publicUrl
  }
  
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
  return urlData.publicUrl
}

// Navigation - 3 ขั้นตอน
const nextStep = () => {
  error.value = ''
  haptic.light()
  if (step.value === 1 && canProceedStep1.value) step.value = 2
  else if (step.value === 2 && canProceedStep2.value) step.value = 3
  // step 3 คือขั้นตอนสุดท้าย ไม่มี nextStep
}

const prevStep = () => {
  error.value = ''
  haptic.light()
  if (step.value > 1) step.value--
}

const goBack = () => {
  if (step.value > 1) prevStep()
  else router.push('/provider/onboarding')
}

// Submit
const submitApplication = async () => {
  if (!canSubmit.value || !authStore.user) return
  
  isLoading.value = true
  error.value = ''
  uploadProgress.value = 0
  haptic.medium()
  
  try {
    const userId = authStore.user.id
    uploadProgress.value = 5
    
    // Upload documents to Storage (or use 'pending' status if storage fails)
    let idCardUrl = 'pending'
    let licenseUrl = 'pending'
    let vehicleUrl = 'pending'
    
    try {
      if (idCardFile.value) {
        idCardUrl = await uploadToStorage(idCardFile.value, `${userId}/id_card`)
      }
      uploadProgress.value = 25
      
      if (licenseFile.value) {
        licenseUrl = await uploadToStorage(licenseFile.value, `${userId}/license`)
      }
      uploadProgress.value = 50
      
      if (vehicleFile.value) {
        vehicleUrl = await uploadToStorage(vehicleFile.value, `${userId}/vehicle`)
      }
      uploadProgress.value = 75
    } catch (uploadErr: any) {
      console.warn('Storage upload failed, using pending status:', uploadErr.message)
      // Continue with 'pending' status - admin can request re-upload
    }
    
    const { error: insertError } = await (supabase.from('service_providers') as any).insert({
      user_id: userId,
      provider_type: 'pending', // Admin จะเปิดสิทธิ์งานให้ทีหลัง
      allowed_services: [], // Admin จะกำหนดว่าเห็นงานอะไรได้บ้าง
      vehicle_type: vehicleType.value,
      vehicle_plate: vehiclePlate.value,
      vehicle_color: vehicleColor.value,
      vehicle_info: {
        brand: vehicleBrand.value,
        model: vehicleModel.value,
        year: vehicleYear.value,
        license_plate: vehiclePlate.value,
        color: vehicleColor.value
      },
      license_number: licenseNumber.value,
      license_expiry: licenseExpiry.value,
      national_id: nationalId.value,
      documents: { 
        id_card: idCardUrl, 
        license: licenseUrl, 
        vehicle: vehicleUrl 
      },
      status: 'pending',
      is_available: false,
      rating: 5.0,
      total_trips: 0
    })
    
    uploadProgress.value = 100
    
    if (insertError) {
      if (insertError.code === '23505') error.value = 'คุณได้สมัครเป็นผู้ให้บริการแล้ว'
      else error.value = insertError.message
      return
    }
    
    haptic.success()
    showSuccess.value = true
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    haptic.error()
  } finally {
    isLoading.value = false
  }
}

const goToOnboarding = () => {
  router.push('/provider/onboarding')
}

onMounted(() => {
  if (!authStore.user) router.push('/login')
})
</script>

<template>
  <div class="register-page">
    <!-- Success Screen -->
    <div v-if="showSuccess" class="success-screen">
      <div class="success-content">
        <div class="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <path d="M22 4L12 14.01l-3-3"/>
          </svg>
        </div>
        <h1>สมัครสำเร็จ!</h1>
        <p>ใบสมัครของคุณถูกส่งเรียบร้อยแล้ว<br/>ทีมงานจะตรวจสอบและแจ้งผลภายใน 1-3 วันทำการ</p>
        
        <div class="success-steps">
          <div class="success-step done">
            <div class="step-dot"></div>
            <span>ส่งใบสมัคร</span>
          </div>
          <div class="success-step active">
            <div class="step-dot"></div>
            <span>รอตรวจสอบ</span>
          </div>
          <div class="success-step">
            <div class="step-dot"></div>
            <span>อนุมัติ</span>
          </div>
        </div>
        
        <div class="success-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>เราจะแจ้งเตือนคุณทันทีเมื่อมีการอัพเดท</span>
        </div>
        
        <button @click="goToOnboarding" class="btn-primary">ตกลง</button>
      </div>
    </div>

    <!-- Main Form -->
    <div v-else class="register-form">
      <!-- Header -->
      <div class="page-header">
        <button @click="goBack" class="back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="header-logo">
          <span class="logo-text">GOBEAR</span>
          <span class="logo-badge">Partner</span>
        </div>
        <div class="header-spacer"></div>
      </div>

      <!-- Step Indicator -->
      <div class="step-indicator">
        <div v-for="s in steps" :key="s.num" 
          :class="['step-item', { active: step === s.num, done: step > s.num }]">
          <div class="step-circle">
            <svg v-if="step > s.num" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <span v-else>{{ s.num }}</span>
          </div>
          <span class="step-label">{{ s.title }}</span>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-msg">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        {{ error }}
      </div>

      <!-- OCR Status -->
      <div v-if="isProcessingOCR" class="ocr-status">
        <div class="ocr-spinner"></div>
        <span>{{ ocrStatus }}</span>
      </div>

      <div class="form-content">
        <!-- Step 1: Vehicle Info (ไม่ต้องเลือกประเภทงานแล้ว) -->
        <div v-if="step === 1" class="step-content">
          <h2 class="step-title">ข้อมูลยานพาหนะ</h2>
          <p class="step-desc">กรอกข้อมูลรถที่จะใช้ให้บริการ</p>

          <div class="form-group">
            <label class="label">ประเภทยานพาหนะ</label>
            <div class="vehicle-btns">
              <button v-for="opt in vehicleOptions" :key="opt.value"
                @click="vehicleType = opt.value; haptic.light()"
                :class="['vehicle-btn', { active: vehicleType === opt.value }]">
                {{ opt.label }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="label">ยี่ห้อ</label>
              <input v-model="vehicleBrand" type="text" placeholder="Toyota, Honda" class="input" />
            </div>
            <div class="form-group">
              <label class="label">รุ่น</label>
              <input v-model="vehicleModel" type="text" placeholder="Vios, City" class="input" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="label">ปี (ค.ศ.)</label>
              <input v-model="vehicleYear" type="text" inputmode="numeric" maxlength="4" placeholder="2020" class="input" />
            </div>
            <div class="form-group">
              <label class="label">ทะเบียนรถ</label>
              <input v-model="vehiclePlate" type="text" placeholder="กข 1234" class="input" />
            </div>
          </div>

          <div class="form-group">
            <label class="label">สีรถ</label>
            <div class="color-options">
              <button v-for="c in colorOptions" :key="c.value"
                @click="vehicleColor = c.value; haptic.light()"
                :class="['color-btn', { active: vehicleColor === c.value }]"
                :style="{ '--color': c.color }">
                <span class="color-dot"></span>
                <span>{{ c.label }}</span>
              </button>
            </div>
          </div>

          <button @click="nextStep" :disabled="!canProceedStep1" class="btn-primary">
            ถัดไป
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <!-- Step 2: Personal Info -->
        <div v-if="step === 2" class="step-content">
          <h2 class="step-title">ข้อมูลส่วนตัว</h2>
          <p class="step-desc">กรอกข้อมูลเพื่อยืนยันตัวตน</p>

          <div class="form-group">
            <label class="label">เลขบัตรประชาชน 13 หลัก</label>
            <div class="id-input-wrap">
              <input v-model="nationalId" type="text" inputmode="numeric" maxlength="13"
                placeholder="x-xxxx-xxxxx-xx-x"
                :class="['input', { valid: nationalIdValid, error: nationalIdError && nationalId.length > 0 }]" />
              <div v-if="nationalIdValid" class="input-status valid">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div v-else-if="nationalIdError && nationalId.length > 0" class="input-status error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              </div>
            </div>
            <span v-if="nationalId.length > 0" :class="['hint', { 'hint-error': nationalIdError, 'hint-valid': nationalIdValid }]">
              {{ nationalIdError || (nationalIdValid ? 'เลขบัตรถูกต้อง' : '') }}
            </span>
            <span class="id-format">{{ formattedNationalId }}</span>
          </div>

          <div class="form-group">
            <label class="label">เลขที่ใบอนุญาตขับขี่</label>
            <input v-model="licenseNumber" type="text" placeholder="12345678" class="input" />
          </div>

          <div class="form-group">
            <label class="label">วันหมดอายุใบขับขี่</label>
            <input v-model="licenseExpiry" type="date" class="input" />
          </div>

          <div class="btn-group">
            <button @click="prevStep" class="btn-secondary">ย้อนกลับ</button>
            <button @click="nextStep" :disabled="!canProceedStep2" class="btn-primary">ถัดไป</button>
          </div>
        </div>

        <!-- Step 3: Documents -->
        <div v-if="step === 3" class="step-content">
          <h2 class="step-title">อัพโหลดเอกสาร</h2>
          <p class="step-desc">อัพโหลดรูปเอกสารเพื่อยืนยันตัวตน</p>

          <!-- ID Card -->
          <div class="upload-section">
            <label class="label">รูปบัตรประชาชน</label>
            <p class="upload-hint">ระบบจะอ่านเลขบัตรอัตโนมัติ</p>
            <div v-if="!idCardPreview" class="upload-box" @click="($refs.idCardInput as HTMLInputElement).click()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                <circle cx="8" cy="15" r="1"/><path d="M14 15h4"/>
              </svg>
              <span>แตะเพื่อเลือกรูป</span>
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

          <!-- License -->
          <div class="upload-section">
            <label class="label">รูปใบขับขี่</label>
            <div v-if="!licensePreview" class="upload-box" @click="($refs.licenseInput as HTMLInputElement).click()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 15h2M14 15h4"/>
                <circle cx="9" cy="10" r="2"/>
              </svg>
              <span>แตะเพื่อเลือกรูป</span>
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

          <!-- Vehicle -->
          <div class="upload-section">
            <label class="label">รูปยานพาหนะ (เห็นทะเบียนชัด)</label>
            <div v-if="!vehiclePreview" class="upload-box" @click="($refs.vehicleInput as HTMLInputElement).click()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <span>แตะเพื่อเลือกรูป</span>
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

          <div class="info-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
            </svg>
            <p>หลังจากสมัคร ทีมงานจะตรวจสอบและติดต่อกลับภายใน 1-3 วันทำการ</p>
          </div>

          <label class="terms-check">
            <input v-model="acceptTerms" type="checkbox" />
            <span class="checkmark"></span>
            <span class="terms-text">ฉันยอมรับ <a href="#">ข้อกำหนดสำหรับผู้ให้บริการ</a> และยืนยันว่าข้อมูลทั้งหมดเป็นความจริง</span>
          </label>

          <!-- Upload Progress -->
          <div v-if="isLoading && uploadProgress > 0" class="progress-bar">
            <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
            <span>กำลังอัพโหลด {{ uploadProgress }}%</span>
          </div>

          <div class="btn-group">
            <button @click="prevStep" :disabled="isLoading" class="btn-secondary">ย้อนกลับ</button>
            <button @click="submitApplication" :disabled="!canSubmit || isLoading" class="btn-primary">
              <span v-if="isLoading" class="loading">
                <span class="spinner"></span> กำลังส่ง
              </span>
              <span v-else>ส่งใบสมัคร</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  background: #FFFFFF;
}

/* Success Screen */
.success-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(180deg, #E8F5EF 0%, #FFFFFF 50%);
}

.success-content {
  text-align: center;
  max-width: 360px;
}

.success-icon {
  width: 100px;
  height: 100px;
  margin: 0 auto 24px;
  background: #00A86B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: scaleIn 0.5s ease;
}

@keyframes scaleIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.success-icon svg {
  width: 50px;
  height: 50px;
  color: #FFFFFF;
}

.success-content h1 {
  font-size: 28px;
  font-weight: 800;
  color: #1A1A1A;
  margin-bottom: 12px;
}

.success-content p {
  font-size: 15px;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 32px;
}

.success-steps {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.success-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.success-step .step-dot {
  width: 16px;
  height: 16px;
  background: #E8E8E8;
  border-radius: 50%;
  position: relative;
}

.success-step.done .step-dot {
  background: #00A86B;
}

.success-step.done .step-dot::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #FFFFFF;
  font-size: 10px;
}

.success-step.active .step-dot {
  background: #F59E0B;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
}

.success-step span:last-child {
  font-size: 12px;
  color: #666666;
}

.success-step.done span:last-child { color: #00A86B; }
.success-step.active span:last-child { color: #F59E0B; }

.success-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: #E8F5EF;
  border-radius: 12px;
  margin-bottom: 24px;
}

.success-info svg {
  width: 20px;
  height: 20px;
  color: #00A86B;
}

.success-info span {
  font-size: 13px;
  color: #008F5B;
}

/* Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: transparent;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-size: 20px;
  font-weight: 800;
  color: #00A86B;
}

.logo-badge {
  padding: 4px 8px;
  background: #00A86B;
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 600;
  border-radius: 6px;
}

.header-spacer { width: 40px; }

/* Step Indicator */
.step-indicator {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px 20px;
  background: #F5F5F5;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 80px;
}

.step-circle {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8E8E8;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
  color: #999999;
  transition: all 0.3s ease;
}

.step-item.active .step-circle {
  background: #00A86B;
  color: #FFFFFF;
}

.step-item.done .step-circle {
  background: #00A86B;
  color: #FFFFFF;
}

.step-item.done .step-circle svg {
  width: 18px;
  height: 18px;
}

.step-label {
  font-size: 11px;
  color: #999999;
  font-weight: 500;
}

.step-item.active .step-label,
.step-item.done .step-label {
  color: #00A86B;
}

/* Error & OCR Status */
.error-msg {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 20px;
  padding: 12px 16px;
  background: #FEE2E2;
  border-radius: 12px;
  color: #E53935;
  font-size: 14px;
}

.error-msg svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.ocr-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 16px 20px;
  padding: 12px;
  background: #E8F5EF;
  border-radius: 12px;
}

.ocr-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.ocr-status span {
  font-size: 14px;
  color: #00A86B;
  font-weight: 500;
}

/* Form Content */
.form-content {
  padding: 24px 20px;
  max-width: 480px;
  margin: 0 auto;
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
  color: #1A1A1A;
  margin-bottom: 8px;
}

.step-desc {
  font-size: 14px;
  color: #666666;
  margin-bottom: 24px;
}

/* Type Cards */
.type-cards {
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
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.type-card:hover { background: #EBEBEB; }

.type-card.active {
  background: #E8F5EF;
  border-color: #00A86B;
}

.type-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border-radius: 14px;
}

.type-card.active .type-icon {
  background: #00A86B;
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

.type-name {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.type-desc {
  font-size: 13px;
  color: #666666;
}

.type-check {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #E8E8E8;
  border-radius: 50%;
}

.type-card.active .type-check {
  background: #00A86B;
  border-color: #00A86B;
  color: #FFFFFF;
}

.type-check svg {
  width: 16px;
  height: 16px;
}

/* Benefits Box */
.benefits-box {
  padding: 20px;
  background: #F5F5F5;
  border-radius: 16px;
  margin-bottom: 24px;
}

.benefits-box h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #1A1A1A;
  padding: 6px 0;
}

.benefit-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.benefit-icon svg {
  width: 20px;
  height: 20px;
  stroke: #00A86B;
}

/* Form Elements */
.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.2s ease;
  background: #FFFFFF;
}

.input:focus {
  outline: none;
  border-color: #00A86B;
}

.input::placeholder {
  color: #999999;
}

.input.valid { border-color: #00A86B; }
.input.error { border-color: #E53935; }

/* Vehicle Buttons */
.vehicle-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.vehicle-btn {
  padding: 12px 20px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vehicle-btn:hover { background: #EBEBEB; }

.vehicle-btn.active {
  background: #00A86B;
  color: #FFFFFF;
}

/* Color Options */
.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #F5F5F5;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-btn:hover { background: #EBEBEB; }

.color-btn.active {
  border-color: #00A86B;
  background: #E8F5EF;
}

.color-dot {
  width: 16px;
  height: 16px;
  background: var(--color);
  border-radius: 50%;
  border: 1px solid #E8E8E8;
}

/* ID Input */
.id-input-wrap {
  position: relative;
}

.id-input-wrap .input {
  padding-right: 44px;
}

.input-status {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
}

.input-status.valid { color: #00A86B; }
.input-status.error { color: #E53935; }

.input-status svg {
  width: 100%;
  height: 100%;
}

.hint {
  display: block;
  font-size: 12px;
  margin-top: 6px;
  color: #666666;
}

.hint-error { color: #E53935; }
.hint-valid { color: #00A86B; }

.id-format {
  display: block;
  font-size: 13px;
  color: #999999;
  margin-top: 4px;
  font-family: monospace;
  letter-spacing: 1px;
}

/* Upload Section */
.upload-section {
  margin-bottom: 20px;
}

.upload-hint {
  font-size: 12px;
  color: #666666;
  margin-bottom: 8px;
}

.upload-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px;
  background: #F5F5F5;
  border: 2px dashed #E8E8E8;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-box:hover {
  border-color: #00A86B;
  background: #E8F5EF;
}

.upload-box svg {
  width: 36px;
  height: 36px;
  color: #666666;
}

.upload-box span {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 500;
}

.upload-preview {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
}

.upload-preview img {
  width: 100%;
  height: 160px;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #FFFFFF;
}

.remove-btn svg {
  width: 16px;
  height: 16px;
}

/* Info Box */
.info-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 12px;
  margin-bottom: 20px;
}

.info-box svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #666666;
}

.info-box p {
  font-size: 13px;
  color: #666666;
  line-height: 1.5;
}

/* Terms Checkbox */
.terms-check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 24px;
  cursor: pointer;
}

.terms-check input { display: none; }

.checkmark {
  width: 22px;
  height: 22px;
  border: 2px solid #E8E8E8;
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.terms-check input:checked + .checkmark {
  background: #00A86B;
  border-color: #00A86B;
}

.terms-check input:checked + .checkmark::after {
  content: '✓';
  color: #FFFFFF;
  font-size: 14px;
  font-weight: bold;
}

.terms-text {
  font-size: 14px;
  color: #666666;
  line-height: 1.5;
}

.terms-text a {
  color: #00A86B;
  text-decoration: underline;
}

/* Progress Bar */
.progress-bar {
  margin-bottom: 20px;
}

.progress-bar > div:first-child {
  height: 8px;
  background: #E8E8E8;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-bar span {
  font-size: 13px;
  color: #666666;
  text-align: center;
  display: block;
}

/* Buttons */
.btn-group {
  display: flex;
  gap: 12px;
}

.btn-group .btn-secondary,
.btn-group .btn-primary {
  flex: 1;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 16px 24px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #008F5B;
}

.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background: #CCCCCC;
  cursor: not-allowed;
}

.btn-primary svg {
  width: 20px;
  height: 20px;
}

.btn-secondary {
  padding: 16px 24px;
  background: #F5F5F5;
  color: #1A1A1A;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #EBEBEB;
}

.loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Responsive */
@media (max-width: 400px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .color-options {
    gap: 6px;
  }
  
  .color-btn {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>
