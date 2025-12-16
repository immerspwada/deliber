<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProvider } from '../../composables/useProvider'
import { useImageUtils, type OCRResult } from '../../composables/useImageUtils'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'
import ProviderLayout from '../../components/ProviderLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const providerComposable = useProvider()
const { profile, fetchProfile } = providerComposable
const { compressImage, performOCR, needsCompression } = useImageUtils()

// Refresh state
const isRefreshing = ref(false)

// Helper function to safely call updateProfile
const safeUpdateProfile = async (updates: Record<string, any>) => {
  if (typeof providerComposable.updateProfile !== 'function') {
    throw new Error('ระบบมีปัญหา กรุณารีเฟรชหน้าและลองใหม่อีกครั้ง')
  }
  return await providerComposable.updateProfile(updates)
}

const isLoading = ref(true)
const uploadingDoc = ref<string | null>(null)
const processingOCR = ref(false)
const ocrProgress = ref(0)
const ocrStatus = ref('')
const error = ref('')
const success = ref('')

// OCR Results Modal
const showOCRModal = ref(false)
const ocrResult = ref<OCRResult | null>(null)
const pendingUpload = ref<{ file: File; docType: 'id_card' | 'license' | 'vehicle' } | null>(null)

interface Document {
  type: 'id_card' | 'license' | 'vehicle'
  label: string
  status: 'verified' | 'pending' | 'rejected' | 'missing'
  expiry?: string
  url?: string
  rejectionReason?: string
  updatedAt?: string
}

const documents = ref<Document[]>([])

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'verified': return 'ยืนยันแล้ว'
    case 'pending': return 'รอตรวจสอบ'
    case 'rejected': return 'ไม่ผ่าน'
    default: return 'ยังไม่อัพโหลด'
  }
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'verified': return 'status-verified'
    case 'pending': return 'status-pending'
    case 'rejected': return 'status-rejected'
    default: return 'status-missing'
  }
}

// Helper to determine document status
const getDocStatus = (docValue: any): 'verified' | 'pending' | 'rejected' | 'missing' => {
  if (!docValue) return 'missing'
  if (docValue === 'verified') return 'verified'
  if (docValue === 'rejected') return 'rejected'
  // If it's a URL string or 'pending', it's pending review
  return 'pending'
}

// Helper to get rejection reason if available
const getDocRejectionReason = (docType: string): string | undefined => {
  const rejectionReasons = profile.value?.rejection_reasons as Record<string, string> | undefined
  return rejectionReasons?.[docType]
}

// Helper to get document updated timestamp
const getDocUpdatedAt = (docType: string): string | undefined => {
  const timestamps = profile.value?.document_timestamps as Record<string, string> | undefined
  return timestamps?.[docType]
}

// Format date for display
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

const loadDocuments = () => {
  const docs = profile.value?.documents || {}
  documents.value = [
    {
      type: 'id_card',
      label: 'บัตรประชาชน',
      status: getDocStatus(docs.id_card),
      url: typeof docs.id_card === 'string' && !['verified', 'rejected', 'pending'].includes(docs.id_card) ? docs.id_card : undefined,
      rejectionReason: getDocRejectionReason('id_card'),
      updatedAt: getDocUpdatedAt('id_card')
    },
    {
      type: 'license',
      label: 'ใบขับขี่',
      status: getDocStatus(docs.license),
      expiry: profile.value?.license_expiry || undefined,
      url: typeof docs.license === 'string' && !['verified', 'rejected', 'pending'].includes(docs.license) ? docs.license : undefined,
      rejectionReason: getDocRejectionReason('license'),
      updatedAt: getDocUpdatedAt('license')
    },
    {
      type: 'vehicle',
      label: 'รูปยานพาหนะ',
      status: getDocStatus(docs.vehicle),
      url: typeof docs.vehicle === 'string' && !['verified', 'rejected', 'pending'].includes(docs.vehicle) ? docs.vehicle : undefined,
      rejectionReason: getDocRejectionReason('vehicle'),
      updatedAt: getDocUpdatedAt('vehicle')
    }
  ]
}

const isDemoMode = () => localStorage.getItem('demo_mode') === 'true'

const handleFileSelect = async (docType: 'id_card' | 'license' | 'vehicle', event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  let file = input.files[0]
  
  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    error.value = 'รองรับเฉพาะไฟล์ JPG, PNG, WEBP'
    return
  }
  if (file.size > 10 * 1024 * 1024) { // Allow up to 10MB before compression
    error.value = 'ไฟล์ต้องมีขนาดไม่เกิน 10MB'
    return
  }

  uploadingDoc.value = docType
  error.value = ''
  success.value = ''

  try {
    // Compress image if needed
    ocrProgress.value = 10
    ocrStatus.value = 'กำลังบีบอัดรูปภาพ...'
    if (await needsCompression(file, 800)) {
      file = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85
      })
    }
    ocrProgress.value = 30

    // Perform OCR for ID card and license
    if (docType !== 'vehicle') {
      processingOCR.value = true
      ocrStatus.value = 'กำลังอ่านข้อมูลจากเอกสาร...'
      ocrProgress.value = 50
      
      const result = await performOCR(file, docType)
      ocrProgress.value = 90
      
      if (result.success && Object.keys(result.data).length > 0) {
        // Show OCR results modal
        ocrResult.value = result
        pendingUpload.value = { file, docType }
        showOCRModal.value = true
        processingOCR.value = false
        uploadingDoc.value = null
        ocrProgress.value = 0
        ocrStatus.value = ''
        input.value = ''
        return
      }
      processingOCR.value = false
      ocrProgress.value = 100
    }

    // Proceed with upload
    await uploadDocumentInternal(file, docType)
    
  } catch (e: any) {
    // แปลง error เป็นภาษาไทยที่เข้าใจง่าย
    let errorMsg = e.message || 'เกิดข้อผิดพลาด'
    if (errorMsg.includes('is not a function')) {
      errorMsg = 'ระบบมีปัญหา กรุณารีเฟรชหน้าและลองใหม่อีกครั้ง'
    } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
      errorMsg = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
    }
    error.value = errorMsg
  } finally {
    uploadingDoc.value = null
    processingOCR.value = false
    input.value = ''
  }
}

// Upload document to storage (internal function)
const uploadDocumentInternal = async (file: File, docType: 'id_card' | 'license' | 'vehicle') => {
  uploadingDoc.value = docType
  
  try {
    // ตรวจสอบว่ามีข้อมูลผู้ให้บริการหรือไม่
    if (!profile.value?.id) {
      // ลองโหลดข้อมูลใหม่
      await fetchProfile()
      if (!profile.value?.id) {
        throw new Error('กรุณาเข้าสู่ระบบใหม่อีกครั้ง')
      }
    }
    
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const currentDocs = profile.value?.documents || {}
      await safeUpdateProfile({
        documents: { ...currentDocs, [docType]: 'pending' }
      })
      success.value = 'อัพโหลดสำเร็จ รอการตรวจสอบ'
      loadDocuments()
    } else {
      const userId = profile.value?.user_id
      if (!userId) throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่')

      const fileName = `${userId}/${docType}_${Date.now()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('provider-documents')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        // แปลง error message เป็นภาษาไทย
        if (uploadError.message.includes('not found')) {
          throw new Error('ไม่พบที่เก็บไฟล์ กรุณาติดต่อผู้ดูแลระบบ')
        } else if (uploadError.message.includes('permission')) {
          throw new Error('ไม่มีสิทธิ์อัพโหลดไฟล์ กรุณาเข้าสู่ระบบใหม่')
        } else if (uploadError.message.includes('size')) {
          throw new Error('ไฟล์มีขนาดใหญ่เกินไป')
        }
        throw new Error('ไม่สามารถอัพโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง')
      }

      const { data: urlData } = supabase.storage
        .from('provider-documents')
        .getPublicUrl(fileName)

      const currentDocs = profile.value?.documents || {}
      await safeUpdateProfile({
        documents: { ...currentDocs, [docType]: urlData.publicUrl },
        status: 'pending'
      })

      success.value = 'อัพโหลดสำเร็จ รอการตรวจสอบจากทีมงาน'
      loadDocuments()
    }
  } catch (e: any) {
    // แปลง error ทั่วไปเป็นภาษาไทย
    let errorMsg = e.message || 'เกิดข้อผิดพลาด'
    if (errorMsg.includes('is not a function')) {
      errorMsg = 'ระบบมีปัญหา กรุณารีเฟรชหน้าและลองใหม่อีกครั้ง'
    } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
      errorMsg = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต'
    } else if (errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
      errorMsg = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
    }
    error.value = errorMsg
    throw e
  } finally {
    uploadingDoc.value = null
  }
}

// Loading state for OCR modal buttons
const isUploading = ref(false)
const isSubmitting = ref(false)

// Computed: check if any documents are uploaded (pending or verified)
const hasUploadedDocuments = computed(() => {
  return documents.value.some(doc => doc.status === 'pending' || doc.status === 'verified')
})

// Computed: check if all documents are verified
const allDocumentsVerified = computed(() => {
  return documents.value.length > 0 && documents.value.every(doc => doc.status === 'verified')
})

// Computed: document progress stats
const uploadedCount = computed(() => {
  return documents.value.filter(doc => doc.status !== 'missing').length
})

const totalDocuments = computed(() => documents.value.length)

const progressPercent = computed(() => {
  if (totalDocuments.value === 0) return 0
  return Math.round((uploadedCount.value / totalDocuments.value) * 100)
})

// Computed: verification timeline status
const timelineStatus = computed(() => {
  const hasAnyUploaded = documents.value.some(doc => doc.status !== 'missing')
  const allPending = documents.value.every(doc => doc.status === 'pending' || doc.status === 'missing')
  const hasRejected = documents.value.some(doc => doc.status === 'rejected')
  const allVerified = documents.value.length > 0 && documents.value.every(doc => doc.status === 'verified')
  
  if (allVerified) return 'verified'
  if (hasRejected) return 'rejected'
  if (hasAnyUploaded && allPending) return 'reviewing'
  if (hasAnyUploaded) return 'submitted'
  return 'not_started'
})

// Submit documents for review
const submitDocuments = async () => {
  if (isSubmitting.value) return
  
  isSubmitting.value = true
  error.value = ''
  success.value = ''
  
  try {
    // Update provider status to pending review
    await safeUpdateProfile({ status: 'pending' })
    
    success.value = 'ส่งเอกสารเรียบร้อยแล้ว รอการตรวจสอบจากทีมงาน 1-2 วันทำการ'
    
    // Reload documents to reflect changes
    await fetchProfile()
    loadDocuments()
  } catch (e: any) {
    let errorMsg = e.message || 'เกิดข้อผิดพลาด'
    if (errorMsg.includes('is not a function')) {
      errorMsg = 'ระบบมีปัญหา กรุณารีเฟรชหน้าและลองใหม่อีกครั้ง'
    }
    error.value = errorMsg
  } finally {
    isSubmitting.value = false
  }
}

// Confirm OCR data and upload
const confirmOCRAndUpload = async () => {
  if (!pendingUpload.value || !ocrResult.value || isUploading.value) return
  
  const { file, docType } = pendingUpload.value
  const { data } = ocrResult.value
  
  isUploading.value = true
  error.value = ''
  
  try {
    // Update profile with OCR data
    const updates: Record<string, any> = {}
    
    if (docType === 'id_card' && data.idNumber) {
      // Could update user's ID number if needed
    }
    
    if (docType === 'license') {
      if (data.licenseNumber) updates.license_number = data.licenseNumber
      if (data.expiryDate) updates.license_expiry = data.expiryDate
    }
    
    if (Object.keys(updates).length > 0) {
      await safeUpdateProfile(updates)
    }
    
    // Upload the document
    await uploadDocumentInternal(file, docType)
    
    // Close modal only after success
    showOCRModal.value = false
    pendingUpload.value = null
    ocrResult.value = null
    
  } catch (e: any) {
    // แปลง error เป็นภาษาไทย
    let errorMsg = e.message || 'เกิดข้อผิดพลาด'
    if (errorMsg.includes('is not a function')) {
      errorMsg = 'ระบบมีปัญหา กรุณารีเฟรชหน้าและลองใหม่อีกครั้ง'
    }
    error.value = errorMsg
  } finally {
    isUploading.value = false
  }
}

// Skip OCR and just upload
const skipOCRAndUpload = async () => {
  if (!pendingUpload.value || isUploading.value) return
  
  const { file, docType } = pendingUpload.value
  
  isUploading.value = true
  error.value = ''
  
  try {
    await uploadDocumentInternal(file, docType)
    
    // Close modal only after success
    showOCRModal.value = false
    pendingUpload.value = null
    ocrResult.value = null
  } catch (e: any) {
    // แปลง error เป็นภาษาไทย
    let errorMsg = e.message || 'เกิดข้อผิดพลาด'
    if (errorMsg.includes('is not a function')) {
      errorMsg = 'ระบบมีปัญหา กรุณารีเฟรชหน้าและลองใหม่อีกครั้ง'
    }
    error.value = errorMsg
  } finally {
    isUploading.value = false
  }
}

// Cancel OCR modal
const cancelOCR = () => {
  showOCRModal.value = false
  pendingUpload.value = null
  ocrResult.value = null
}

const triggerFileInput = (docType: string) => {
  const input = document.getElementById(`file-${docType}`) as HTMLInputElement
  input?.click()
}

// Image preview modal
const showPreviewModal = ref(false)
const previewImage = ref({ src: '', title: '' })

const openPreview = (url: string, title: string) => {
  if (!url || url === 'verified' || url === 'pending') return
  previewImage.value = { src: url, title }
  showPreviewModal.value = true
}

// Refresh data function
const refreshData = async () => {
  isRefreshing.value = true
  error.value = ''
  success.value = ''
  try {
    await fetchProfile()
    loadDocuments()
    success.value = 'โหลดข้อมูลใหม่สำเร็จ'
    setTimeout(() => { success.value = '' }, 2000)
  } catch (e: any) {
    error.value = 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่'
  } finally {
    isRefreshing.value = false
  }
}

// Check session and redirect if not logged in
const checkSession = async () => {
  const isDemoMode = localStorage.getItem('demo_mode') === 'true'
  
  if (isDemoMode) {
    const demoUser = localStorage.getItem('demo_user')
    if (!demoUser) {
      router.push('/login')
      return false
    }
    return true
  }
  
  // Check Supabase session
  const { data: { session } } = await supabase.auth.getSession()
  if (!session && !authStore.user) {
    router.push('/login')
    return false
  }
  return true
}

onMounted(async () => {
  // Check session first
  const hasSession = await checkSession()
  if (!hasSession) return
  
  await fetchProfile()
  
  // If no profile found, redirect to register
  if (!profile.value?.id) {
    error.value = 'ไม่พบข้อมูลผู้ให้บริการ กรุณาลงทะเบียนก่อน'
    setTimeout(() => {
      router.push('/provider/register')
    }, 2000)
    isLoading.value = false
    return
  }
  
  loadDocuments()
  isLoading.value = false
  
  // Subscribe to realtime updates for document status changes
  if (profile.value?.id) {
    subscribeToDocumentUpdates(profile.value.id)
  }
})

// Realtime subscription
let documentSubscription: any = null

const subscribeToDocumentUpdates = (providerId: string) => {
  // Unsubscribe if already subscribed
  if (documentSubscription) {
    documentSubscription.unsubscribe()
  }
  
  documentSubscription = supabase
    .channel(`provider_docs_${providerId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_providers',
        filter: `id=eq.${providerId}`
      },
      async (payload) => {
        // Update profile with new data
        const newData = payload.new as any
        if (newData) {
          // Reload profile to get latest data
          await fetchProfile()
          loadDocuments()
          
          // Show notification based on changes
          const oldDocs = payload.old?.documents || {}
          const newDocs = newData.documents || {}
          
          // Check for newly verified documents
          for (const docType of ['id_card', 'license', 'vehicle']) {
            if (oldDocs[docType] !== 'verified' && newDocs[docType] === 'verified') {
              success.value = `เอกสาร${docType === 'id_card' ? 'บัตรประชาชน' : docType === 'license' ? 'ใบขับขี่' : 'รูปยานพาหนะ'}ได้รับการอนุมัติแล้ว`
              setTimeout(() => { success.value = '' }, 5000)
            }
            if (oldDocs[docType] !== 'rejected' && newDocs[docType] === 'rejected') {
              error.value = `เอกสาร${docType === 'id_card' ? 'บัตรประชาชน' : docType === 'license' ? 'ใบขับขี่' : 'รูปยานพาหนะ'}ไม่ผ่านการตรวจสอบ กรุณาอัพโหลดใหม่`
              setTimeout(() => { error.value = '' }, 5000)
            }
          }
        }
      }
    )
    .subscribe()
}

onUnmounted(() => {
  // Cleanup subscription
  if (documentSubscription) {
    documentSubscription.unsubscribe()
    documentSubscription = null
  }
})
</script>

<template>
  <ProviderLayout>
    <div class="documents-page">
      <div class="page-content">
        <!-- Header -->
        <div class="page-header">
          <button @click="router.push('/provider/profile')" class="back-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>เอกสาร</h1>
          <button @click="refreshData" :disabled="isRefreshing" class="refresh-btn">
            <svg :class="{ 'spin': isRefreshing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>

        <!-- Messages -->
        <div v-if="error" class="message error">{{ error }}</div>
        <div v-if="success" class="message success">{{ success }}</div>

        <!-- Progress Indicator -->
        <div v-if="!isLoading" class="progress-card">
          <div class="progress-header">
            <span class="progress-title">ความคืบหน้า</span>
            <span class="progress-count">{{ uploadedCount }}/{{ totalDocuments }} เอกสาร</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
        </div>

        <!-- Verification Timeline -->
        <div v-if="!isLoading && hasUploadedDocuments" class="timeline-card">
          <h3>สถานะการตรวจสอบ</h3>
          <div class="timeline">
            <!-- Step 1: Uploaded -->
            <div class="timeline-step" :class="{ 'active': timelineStatus !== 'not_started', 'completed': timelineStatus !== 'not_started' }">
              <div class="timeline-dot">
                <svg v-if="timelineStatus !== 'not_started'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div class="timeline-content">
                <span class="timeline-label">อัพโหลดแล้ว</span>
                <span class="timeline-desc">ส่งเอกสารเรียบร้อย</span>
              </div>
            </div>
            
            <!-- Step 2: Reviewing -->
            <div class="timeline-step" :class="{ 'active': timelineStatus === 'reviewing' || timelineStatus === 'verified', 'completed': timelineStatus === 'verified' }">
              <div class="timeline-dot">
                <svg v-if="timelineStatus === 'verified'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <div v-else-if="timelineStatus === 'reviewing'" class="dot-spinner"></div>
              </div>
              <div class="timeline-content">
                <span class="timeline-label">กำลังตรวจสอบ</span>
                <span class="timeline-desc">ทีมงานกำลังตรวจสอบเอกสาร</span>
              </div>
            </div>
            
            <!-- Step 3: Result -->
            <div class="timeline-step" :class="{ 
              'active': timelineStatus === 'verified' || timelineStatus === 'rejected',
              'completed': timelineStatus === 'verified',
              'rejected': timelineStatus === 'rejected'
            }">
              <div class="timeline-dot">
                <svg v-if="timelineStatus === 'verified'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <svg v-else-if="timelineStatus === 'rejected'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </div>
              <div class="timeline-content">
                <span class="timeline-label">{{ timelineStatus === 'rejected' ? 'ไม่ผ่านการตรวจสอบ' : 'อนุมัติแล้ว' }}</span>
                <span class="timeline-desc">{{ timelineStatus === 'rejected' ? 'กรุณาอัพโหลดเอกสารใหม่' : 'พร้อมให้บริการ' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Card -->
        <div v-if="!hasUploadedDocuments" class="info-card">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>อัพโหลดเอกสารเพื่อยืนยันตัวตน เอกสารจะถูกตรวจสอบภายใน 1-2 วันทำการ</p>
        </div>

        <!-- OCR Progress -->
        <div v-if="processingOCR" class="ocr-progress-card">
          <div class="ocr-progress-header">
            <div class="ocr-spinner"></div>
            <span>{{ ocrStatus }}</span>
          </div>
          <div class="ocr-progress-bar">
            <div class="ocr-progress-fill" :style="{ width: `${ocrProgress}%` }"></div>
          </div>
          <span class="ocr-progress-text">{{ ocrProgress }}%</span>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <!-- Documents List -->
        <div v-else class="documents-list">
          <div v-for="doc in documents" :key="doc.type" class="document-card">
            <!-- Hidden file input -->
            <input
              :id="`file-${doc.type}`"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden-input"
              @change="handleFileSelect(doc.type, $event)"
            />

            <!-- Document thumbnail or icon -->
            <div 
              class="doc-icon" 
              :class="{ 'has-preview': doc.url && doc.url !== 'verified' && doc.url !== 'pending' }"
              @click="doc.url ? openPreview(doc.url, doc.label) : null"
            >
              <!-- Show thumbnail if uploaded -->
              <img 
                v-if="doc.url && doc.url !== 'verified' && doc.url !== 'pending'" 
                :src="doc.url" 
                :alt="doc.label"
                class="doc-thumbnail"
              />
              <!-- Show icon if no upload -->
              <template v-else>
                <svg v-if="doc.type === 'id_card'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                </svg>
                <svg v-else-if="doc.type === 'license'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17h.01M16 17h.01M9 11h6M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11M5 11v6a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-6M5 11h14"/>
                </svg>
              </template>
              <!-- Zoom icon overlay -->
              <div v-if="doc.url && doc.url !== 'verified' && doc.url !== 'pending'" class="zoom-overlay">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                </svg>
              </div>
            </div>

            <div class="doc-info">
              <span class="doc-label">{{ doc.label }}</span>
              <span v-if="doc.expiry" class="doc-expiry">หมดอายุ: {{ doc.expiry }}</span>
              <!-- Show updated date if available -->
              <span v-if="doc.updatedAt && doc.status !== 'missing'" class="doc-updated">
                {{ doc.status === 'verified' ? 'อนุมัติเมื่อ' : doc.status === 'rejected' ? 'ปฏิเสธเมื่อ' : 'อัพโหลดเมื่อ' }}: {{ formatDate(doc.updatedAt) }}
              </span>
              <!-- Show rejection reason if rejected -->
              <span v-if="doc.status === 'rejected' && doc.rejectionReason" class="doc-rejection-reason">
                เหตุผล: {{ doc.rejectionReason }}
              </span>
            </div>

            <div class="doc-actions">
              <div :class="['doc-status', getStatusClass(doc.status)]">
                <svg v-if="doc.status === 'verified'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <svg v-else-if="doc.status === 'pending'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <svg v-else-if="doc.status === 'rejected'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>{{ getStatusLabel(doc.status) }}</span>
              </div>

              <!-- Upload Button -->
              <button
                v-if="doc.status !== 'verified'"
                @click="triggerFileInput(doc.type)"
                :disabled="uploadingDoc === doc.type"
                class="upload-btn"
              >
                <template v-if="uploadingDoc === doc.type">
                  <div class="btn-spinner"></div>
                </template>
                <template v-else>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                  {{ doc.status === 'missing' ? 'อัพโหลด' : 'อัพโหลดใหม่' }}
                </template>
              </button>
            </div>
          </div>
        </div>

        <!-- Submit Documents Button -->
        <div v-if="hasUploadedDocuments && !allDocumentsVerified" class="submit-section">
          <button 
            @click="submitDocuments" 
            :disabled="isSubmitting || !hasUploadedDocuments"
            class="submit-btn"
          >
            <template v-if="isSubmitting">
              <div class="btn-spinner"></div>
              กำลังส่ง...
            </template>
            <template v-else>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              ส่งเอกสารเพื่อตรวจสอบ
            </template>
          </button>
          <p class="submit-hint">กดปุ่มนี้เพื่อส่งเอกสารให้ทีมงานตรวจสอบ</p>
        </div>

        <!-- All Verified Message -->
        <div v-if="allDocumentsVerified" class="all-verified-card">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>เอกสารทั้งหมดได้รับการยืนยันแล้ว</p>
        </div>

        <!-- File Requirements -->
        <div class="requirements-card">
          <h3>ข้อกำหนดไฟล์</h3>
          <ul>
            <li>รองรับไฟล์ JPG, PNG, WEBP</li>
            <li>ขนาดไฟล์ไม่เกิน 5MB</li>
            <li>รูปต้องชัดเจน อ่านข้อความได้</li>
            <li>ไม่มีการตัดต่อหรือแก้ไข</li>
          </ul>
        </div>

        <!-- Contact Support -->
        <button class="support-btn" @click="router.push('/provider/help')">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>มีปัญหา? ติดต่อฝ่ายสนับสนุน</span>
          <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>

        <!-- Image Preview Modal -->
        <div v-if="showPreviewModal" class="preview-modal-overlay" @click="showPreviewModal = false">
          <div class="preview-modal-content" @click.stop>
            <div class="preview-modal-header">
              <h3>{{ previewImage.title }}</h3>
              <button @click="showPreviewModal = false" class="close-btn">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="preview-modal-body">
              <img :src="previewImage.src" :alt="previewImage.title" />
            </div>
          </div>
        </div>

        <!-- OCR Results Modal -->
        <div v-if="showOCRModal && ocrResult" class="modal-overlay" @click.self="cancelOCR">
          <div class="modal-content">
            <div class="modal-header">
              <h2>ข้อมูลที่อ่านได้จากเอกสาร</h2>
              <button @click="cancelOCR" class="close-btn">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div class="modal-body">
              <p class="ocr-info">ระบบอ่านข้อมูลจากเอกสารได้ดังนี้ กรุณาตรวจสอบความถูกต้อง</p>
              
              <div class="ocr-data">
                <div v-if="ocrResult.data.idNumber" class="ocr-item">
                  <span class="ocr-label">เลขบัตรประชาชน</span>
                  <span class="ocr-value">{{ ocrResult.data.idNumber }}</span>
                </div>
                <div v-if="ocrResult.data.name" class="ocr-item">
                  <span class="ocr-label">ชื่อ-นามสกุล</span>
                  <span class="ocr-value">{{ ocrResult.data.name }}</span>
                </div>
                <div v-if="ocrResult.data.birthDate" class="ocr-item">
                  <span class="ocr-label">วันเกิด</span>
                  <span class="ocr-value">{{ ocrResult.data.birthDate }}</span>
                </div>
                <div v-if="ocrResult.data.licenseNumber" class="ocr-item">
                  <span class="ocr-label">เลขใบขับขี่</span>
                  <span class="ocr-value">{{ ocrResult.data.licenseNumber }}</span>
                </div>
                <div v-if="ocrResult.data.licenseType" class="ocr-item">
                  <span class="ocr-label">ประเภทใบขับขี่</span>
                  <span class="ocr-value">{{ ocrResult.data.licenseType }}</span>
                </div>
                <div v-if="ocrResult.data.expiryDate" class="ocr-item">
                  <span class="ocr-label">วันหมดอายุ</span>
                  <span class="ocr-value">{{ ocrResult.data.expiryDate }}</span>
                </div>
                <div v-if="ocrResult.data.address" class="ocr-item full">
                  <span class="ocr-label">ที่อยู่</span>
                  <span class="ocr-value">{{ ocrResult.data.address }}</span>
                </div>
              </div>

              <p v-if="Object.keys(ocrResult.data).length === 0" class="ocr-empty">
                ไม่สามารถอ่านข้อมูลได้ กรุณาตรวจสอบว่ารูปชัดเจน
              </p>
            </div>
            
            <div class="modal-footer">
              <button @click="skipOCRAndUpload" :disabled="isUploading" class="btn-secondary">
                <template v-if="isUploading">
                  <div class="btn-spinner-dark"></div>
                  กำลังอัพโหลด...
                </template>
                <template v-else>ข้ามและอัพโหลด</template>
              </button>
              <button @click="confirmOCRAndUpload" :disabled="isUploading" class="btn-primary">
                <template v-if="isUploading">
                  <div class="btn-spinner"></div>
                  กำลังอัพโหลด...
                </template>
                <template v-else>ยืนยันและอัพโหลด</template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ProviderLayout>
</template>

<style scoped>
.documents-page { min-height: 100vh; }
.page-content { max-width: 480px; margin: 0 auto; padding: 16px; }

.page-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
}
.page-header h1 { flex: 1; font-size: 20px; font-weight: 600; }
.back-btn, .refresh-btn {
  width: 40px; height: 40px;
  background: none; border: none;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.back-btn svg, .refresh-btn svg { width: 24px; height: 24px; }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-btn svg.spin { animation: spin 1s linear infinite; }

.message {
  padding: 12px 16px; border-radius: 8px;
  font-size: 14px; margin-bottom: 16px;
}
.message.error { background: #FEE2E2; color: #E11900; }
.message.success { background: #E8F5E9; color: #05944F; }

.info-card {
  display: flex; gap: 12px; padding: 16px;
  background: #F6F6F6; border-radius: 12px; margin-bottom: 20px;
}
.info-card svg { width: 20px; height: 20px; flex-shrink: 0; color: #6B6B6B; }
.info-card p { font-size: 13px; color: #6B6B6B; line-height: 1.5; }

.loading-state { display: flex; justify-content: center; padding: 60px 0; }
.spinner {
  width: 32px; height: 32px;
  border: 3px solid #E5E5E5; border-top-color: #000;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.hidden-input { display: none; }

.documents-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }

.document-card {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 20px; background: #FFFFFF; border-radius: 12px;
  flex-wrap: wrap;
}
.doc-icon {
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: #F6F6F6; border-radius: 12px;
}
.doc-icon svg { width: 24px; height: 24px; }
.doc-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 100px; }
.doc-label { font-size: 15px; font-weight: 500; }
.doc-expiry { font-size: 12px; color: #6B6B6B; }
.doc-rejection-reason { font-size: 12px; color: #E11900; margin-top: 4px; }
.doc-updated { font-size: 11px; color: #9B9B9B; }

.doc-actions {
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
}

.doc-status {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
}
.doc-status svg { width: 14px; height: 14px; }
.status-verified { background: #E8F5E9; color: #05944F; }
.status-pending { background: #FFF3E0; color: #E65100; }
.status-rejected { background: #FEE2E2; color: #E11900; }
.status-missing { background: #F6F6F6; color: #6B6B6B; }

.upload-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; background: #000; color: #FFF;
  border: none; border-radius: 8px;
  font-size: 13px; font-weight: 500; cursor: pointer;
  min-width: 100px; justify-content: center;
}
.upload-btn:disabled { background: #CCC; cursor: not-allowed; }
.upload-btn svg { width: 16px; height: 16px; }

.btn-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #FFF;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}

.requirements-card {
  background: #FFFFFF; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px;
}
.requirements-card h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.requirements-card ul { margin: 0; padding-left: 20px; }
.requirements-card li { font-size: 13px; color: #6B6B6B; margin-bottom: 6px; }

.support-btn {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 16px 20px;
  background: #FFFFFF; border: none; border-radius: 12px;
  font-size: 14px; cursor: pointer; text-align: left;
}
.support-btn svg { width: 20px; height: 20px; color: #6B6B6B; }
.support-btn span { flex: 1; }
.support-btn .chevron { width: 18px; height: 18px; }

/* OCR Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 16px;
}
.modal-content {
  background: #FFF; border-radius: 16px;
  width: 100%; max-width: 400px; max-height: 90vh; overflow-y: auto;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px; border-bottom: 1px solid #E5E5E5;
}
.modal-header h2 { font-size: 18px; font-weight: 600; }
.close-btn {
  width: 32px; height: 32px; background: none; border: none;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.close-btn svg { width: 20px; height: 20px; }
.modal-body { padding: 20px; }
.modal-footer {
  display: flex; gap: 12px; padding: 20px; border-top: 1px solid #E5E5E5;
}

.ocr-info { font-size: 13px; color: #6B6B6B; margin-bottom: 16px; }
.ocr-data { display: grid; gap: 12px; }
.ocr-item {
  display: flex; flex-direction: column; gap: 4px;
  padding: 12px; background: #F6F6F6; border-radius: 8px;
}
.ocr-item.full { grid-column: 1 / -1; }
.ocr-label { font-size: 12px; color: #6B6B6B; }
.ocr-value { font-size: 15px; font-weight: 500; }
.ocr-empty { font-size: 14px; color: #E65100; text-align: center; padding: 20px; }

.btn-secondary, .btn-primary {
  flex: 1; padding: 14px 20px; border: none; border-radius: 8px;
  font-size: 15px; font-weight: 500; cursor: pointer;
}
.btn-secondary { background: #F6F6F6; color: #000; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: #000; color: #FFF; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-spinner-dark {
  width: 16px; height: 16px;
  border: 2px solid rgba(0,0,0,0.2); border-top-color: #000;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}

/* OCR Progress */
.ocr-progress-card {
  padding: 16px; background: #F6F6F6;
  border-radius: 12px; margin-bottom: 20px;
}
.ocr-progress-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
}
.ocr-spinner {
  width: 20px; height: 20px;
  border: 2px solid #E5E5E5; border-top-color: #000;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
.ocr-progress-header span { font-size: 14px; font-weight: 500; }
.ocr-progress-bar {
  height: 6px; background: #E5E5E5;
  border-radius: 3px; overflow: hidden; margin-bottom: 8px;
}
.ocr-progress-fill {
  height: 100%; background: #000;
  border-radius: 3px; transition: width 0.3s ease;
}
.ocr-progress-text { font-size: 12px; color: #6B6B6B; }

/* Document Thumbnail */
.doc-icon.has-preview { cursor: pointer; position: relative; overflow: hidden; }
.doc-icon.has-preview:hover .zoom-overlay { opacity: 1; }
.doc-thumbnail {
  width: 100%; height: 100%; object-fit: cover; border-radius: 12px;
}
.zoom-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s;
  border-radius: 12px;
}
.zoom-overlay svg { width: 20px; height: 20px; color: #FFF; }

/* Preview Modal */
.preview-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.9);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000; padding: 16px;
}
.preview-modal-content {
  background: #FFF; border-radius: 16px;
  width: 100%; max-width: 500px; max-height: 90vh;
  display: flex; flex-direction: column;
}
.preview-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid #E5E5E5;
}
.preview-modal-header h3 { font-size: 16px; font-weight: 600; }
.preview-modal-body {
  flex: 1; overflow: auto; padding: 16px;
  display: flex; align-items: center; justify-content: center;
  background: #F6F6F6;
}
.preview-modal-body img {
  max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 8px;
}

/* Submit Section */
.submit-section {
  margin-bottom: 20px; text-align: center;
}
.submit-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 16px 24px;
  background: #000; color: #FFF;
  border: none; border-radius: 12px;
  font-size: 16px; font-weight: 600; cursor: pointer;
}
.submit-btn:disabled { background: #CCC; cursor: not-allowed; }
.submit-btn svg { width: 20px; height: 20px; }
.submit-hint {
  font-size: 12px; color: #6B6B6B; margin-top: 8px;
}

/* All Verified Card */
.all-verified-card {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px; background: #E8F5E9;
  border-radius: 12px; margin-bottom: 20px;
}
.all-verified-card svg { width: 24px; height: 24px; color: #05944F; flex-shrink: 0; }
.all-verified-card p { font-size: 14px; color: #05944F; font-weight: 500; }

/* Progress Card */
.progress-card {
  background: #FFFFFF; border-radius: 12px;
  padding: 16px 20px; margin-bottom: 16px;
}
.progress-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.progress-title { font-size: 14px; font-weight: 600; }
.progress-count { font-size: 14px; color: #6B6B6B; }
.progress-bar-container {
  height: 8px; background: #E5E5E5;
  border-radius: 4px; overflow: hidden;
}
.progress-bar-fill {
  height: 100%; background: #000;
  border-radius: 4px; transition: width 0.3s ease;
}

/* Timeline Card */
.timeline-card {
  background: #FFFFFF; border-radius: 12px;
  padding: 20px; margin-bottom: 16px;
}
.timeline-card h3 {
  font-size: 14px; font-weight: 600; margin-bottom: 16px;
}
.timeline {
  display: flex; flex-direction: column; gap: 0;
}
.timeline-step {
  display: flex; align-items: flex-start; gap: 12px;
  position: relative; padding-bottom: 24px;
}
.timeline-step:last-child { padding-bottom: 0; }
.timeline-step::before {
  content: '';
  position: absolute;
  left: 11px; top: 24px;
  width: 2px; height: calc(100% - 24px);
  background: #E5E5E5;
}
.timeline-step:last-child::before { display: none; }
.timeline-step.active::before { background: #000; }
.timeline-step.completed::before { background: #05944F; }

.timeline-dot {
  width: 24px; height: 24px;
  border-radius: 50%;
  background: #E5E5E5;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; z-index: 1;
}
.timeline-step.active .timeline-dot { background: #000; }
.timeline-step.completed .timeline-dot { background: #05944F; }
.timeline-step.rejected .timeline-dot { background: #E11900; }
.timeline-dot svg { width: 14px; height: 14px; color: #FFF; }

.dot-spinner {
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #FFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.timeline-content {
  display: flex; flex-direction: column; gap: 2px;
  padding-top: 2px;
}
.timeline-label {
  font-size: 14px; font-weight: 500; color: #6B6B6B;
}
.timeline-step.active .timeline-label,
.timeline-step.completed .timeline-label { color: #000; }
.timeline-step.rejected .timeline-label { color: #E11900; }

.timeline-desc {
  font-size: 12px; color: #9B9B9B;
}
.timeline-step.active .timeline-desc,
.timeline-step.completed .timeline-desc { color: #6B6B6B; }
</style>
