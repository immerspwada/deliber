<script setup lang="ts">
/**
 * ProviderDocumentsView - หน้าจัดการเอกสารสำหรับ Provider
 * Feature: F14 - Provider Documents Re-upload
 * ให้ provider ที่ถูกปฏิเสธเอกสารสามารถอัพโหลดใหม่ได้
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useHapticFeedback } from '../../composables/useHapticFeedback'
import { supabase } from '../../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()
const { vibrate } = useHapticFeedback()

// State
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const provider = ref<any>(null)

// Document previews
const idCardPreview = ref('')
const licensePreview = ref('')
const vehiclePreview = ref('')

// New files to upload
const newIdCard = ref<File | null>(null)
const newLicense = ref<File | null>(null)
const newVehicle = ref<File | null>(null)

// Document status helpers
const getDocStatus = (docType: string) => {
  const docs = provider.value?.documents || {}
  return docs[docType] || 'pending'
}

const getDocStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: 'รอตรวจสอบ',
    verified: 'ผ่านแล้ว',
    rejected: 'ไม่ผ่าน'
  }
  return texts[status] || status
}

const getDocStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#F5A623',
    verified: '#00A86B',
    rejected: '#E53935'
  }
  return colors[status] || '#666666'
}

// Check if document needs upload (not verified yet)
const needsUpload = (docType: string) => {
  const docs = provider.value?.documents || {}
  const status = docs[docType]
  return !status || status === 'pending' || status === 'rejected'
}

const getRejectionReason = (docType: string) => {
  const reasons = provider.value?.rejection_reasons || {}
  return reasons[docType] || ''
}

// Check if any document needs upload (pending or rejected)
const hasDocumentsToUpload = computed(() => {
  const docs = provider.value?.documents || {}
  return ['id_card', 'license', 'vehicle'].some(key => 
    !docs[key] || docs[key] === 'pending' || docs[key] === 'rejected'
  )
})

const canSubmit = computed(() => {
  const docs = provider.value?.documents || {}
  // Can submit if there's at least one new file for a pending or rejected document
  const idCardNeedsUpload = !docs.id_card || docs.id_card === 'pending' || docs.id_card === 'rejected'
  const licenseNeedsUpload = !docs.license || docs.license === 'pending' || docs.license === 'rejected'
  const vehicleNeedsUpload = !docs.vehicle || docs.vehicle === 'pending' || docs.vehicle === 'rejected'
  
  return (idCardNeedsUpload && newIdCard.value) ||
         (licenseNeedsUpload && newLicense.value) ||
         (vehicleNeedsUpload && newVehicle.value)
})

// Load provider data
const loadProvider = async () => {
  if (!authStore.user) return
  loading.value = true
  
  try {
    const { data, error: fetchError } = await supabase
      .from('service_providers')
      .select('*')
      .eq('user_id', authStore.user.id)
      .single()
    
    if (fetchError) throw fetchError
    provider.value = data
    
    // Set previews from existing documents
    if (data?.documents) {
      if (data.documents.id_card && data.documents.id_card !== 'pending' && data.documents.id_card !== 'rejected' && data.documents.id_card !== 'verified') {
        idCardPreview.value = data.documents.id_card
      }
      if (data.documents.license && data.documents.license !== 'pending' && data.documents.license !== 'rejected' && data.documents.license !== 'verified') {
        licensePreview.value = data.documents.license
      }
      if (data.documents.vehicle && data.documents.vehicle !== 'pending' && data.documents.vehicle !== 'rejected' && data.documents.vehicle !== 'verified') {
        vehiclePreview.value = data.documents.vehicle
      }
    }
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Compress image
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

// Handle file selection
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
  vibrate('light')
  
  try {
    const compressed = await compressImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (type === 'idCard') { newIdCard.value = compressed; idCardPreview.value = result }
      else if (type === 'license') { newLicense.value = compressed; licensePreview.value = result }
      else { newVehicle.value = compressed; vehiclePreview.value = result }
    }
    reader.readAsDataURL(compressed)
  } catch {
    error.value = 'ไม่สามารถประมวลผลรูปภาพได้'
  }
}

// Upload to storage
const uploadToStorage = async (file: File, path: string): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${path}_${Date.now()}.${fileExt}`
  const filePath = `provider-documents/${fileName}`
  
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, { cacheControl: '3600', upsert: true })
  
  if (uploadError) throw uploadError
  
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
  return urlData.publicUrl
}

// Submit documents (first upload or re-upload)
const submitDocuments = async () => {
  if (!provider.value || !canSubmit.value) return
  
  saving.value = true
  error.value = ''
  success.value = ''
  vibrate('medium')
  
  try {
    const userId = authStore.user?.id
    const currentDocs = provider.value.documents || {}
    const updatedDocs = { ...currentDocs }
    
    // Upload new files for pending or rejected documents
    if (newIdCard.value && needsUpload('id_card')) {
      updatedDocs.id_card = await uploadToStorage(newIdCard.value, `${userId}/id_card`)
    }
    if (newLicense.value && needsUpload('license')) {
      updatedDocs.license = await uploadToStorage(newLicense.value, `${userId}/license`)
    }
    if (newVehicle.value && needsUpload('vehicle')) {
      updatedDocs.vehicle = await uploadToStorage(newVehicle.value, `${userId}/vehicle`)
    }
    
    // Update provider record - keep status as pending for review
    const { error: updateError } = await supabase
      .from('service_providers')
      .update({
        documents: updatedDocs,
        status: 'pending',
        rejection_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.value.id)
    
    if (updateError) throw updateError
    
    // Clear new files
    newIdCard.value = null
    newLicense.value = null
    newVehicle.value = null
    
    success.value = 'อัพโหลดเอกสารสำเร็จ! รอการตรวจสอบจากทีมงาน'
    vibrate('heavy')
    
    // Reload data
    await loadProvider()
  } catch (err: any) {
    error.value = err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
    vibrate('medium')
  } finally {
    saving.value = false
  }
}

const goBack = () => router.push('/provider/dashboard')

onMounted(() => {
  if (!authStore.user) router.push('/login')
  else loadProvider()
})
</script>

<template>
  <div class="documents-page">
    <!-- Header -->
    <div class="page-header">
      <button @click="goBack" class="back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1>จัดการเอกสาร</h1>
      <div class="spacer"></div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Content -->
    <div v-else-if="provider" class="content">
      <!-- Status Banner -->
      <div v-if="provider.status === 'rejected'" class="status-banner rejected">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        <div>
          <strong>ใบสมัครไม่ผ่านการอนุมัติ</strong>
          <p v-if="provider.rejection_reason">{{ provider.rejection_reason }}</p>
          <p v-else>กรุณาอัพโหลดเอกสารที่ไม่ผ่านใหม่</p>
        </div>
      </div>

      <div v-else-if="provider.status === 'pending'" class="status-banner pending">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        <div>
          <strong>รอการตรวจสอบ</strong>
          <p v-if="hasDocumentsToUpload">กรุณาอัพโหลดเอกสารให้ครบเพื่อรอการอนุมัติ</p>
          <p v-else>ทีมงานกำลังตรวจสอบเอกสารของคุณ</p>
        </div>
      </div>

      <div v-else-if="provider.status === 'approved'" class="status-banner approved">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
        </svg>
        <div>
          <strong>ผ่านการอนุมัติแล้ว</strong>
          <p>คุณสามารถเริ่มรับงานได้</p>
        </div>
      </div>

      <!-- Error/Success Messages -->
      <div v-if="error" class="message error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
        {{ error }}
      </div>

      <div v-if="success" class="message success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
        </svg>
        {{ success }}
      </div>

      <!-- Documents List -->
      <div class="documents-list">
        <!-- ID Card -->
        <div :class="['doc-card', getDocStatus('id_card')]">
          <div class="doc-header">
            <div class="doc-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="doc-info">
              <h3>บัตรประชาชน</h3>
              <span class="doc-status" :style="{ color: getDocStatusColor(getDocStatus('id_card')) }">
                {{ getDocStatusText(getDocStatus('id_card')) }}
              </span>
            </div>
          </div>
          
          <p v-if="getRejectionReason('id_card')" class="rejection-reason">
            เหตุผล: {{ getRejectionReason('id_card') }}
          </p>
          
          <div v-if="idCardPreview" class="doc-preview">
            <img :src="idCardPreview" alt="ID Card" />
          </div>
          
          <div v-if="needsUpload('id_card')" class="upload-area">
            <input type="file" accept="image/*" @change="handleFileSelect('idCard', $event)" :id="'idCard'" hidden />
            <label :for="'idCard'" class="upload-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {{ newIdCard ? 'เปลี่ยนรูป' : (getDocStatus('id_card') === 'rejected' ? 'อัพโหลดใหม่' : 'อัพโหลด') }}
            </label>
          </div>
        </div>

        <!-- License -->
        <div :class="['doc-card', getDocStatus('license')]">
          <div class="doc-header">
            <div class="doc-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/>
                <path d="M7 15h2M14 15h4"/>
              </svg>
            </div>
            <div class="doc-info">
              <h3>ใบขับขี่</h3>
              <span class="doc-status" :style="{ color: getDocStatusColor(getDocStatus('license')) }">
                {{ getDocStatusText(getDocStatus('license')) }}
              </span>
            </div>
          </div>
          
          <p v-if="getRejectionReason('license')" class="rejection-reason">
            เหตุผล: {{ getRejectionReason('license') }}
          </p>
          
          <div v-if="licensePreview" class="doc-preview">
            <img :src="licensePreview" alt="License" />
          </div>
          
          <div v-if="needsUpload('license')" class="upload-area">
            <input type="file" accept="image/*" @change="handleFileSelect('license', $event)" :id="'license'" hidden />
            <label :for="'license'" class="upload-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {{ newLicense ? 'เปลี่ยนรูป' : (getDocStatus('license') === 'rejected' ? 'อัพโหลดใหม่' : 'อัพโหลด') }}
            </label>
          </div>
        </div>

        <!-- Vehicle -->
        <div :class="['doc-card', getDocStatus('vehicle')]">
          <div class="doc-header">
            <div class="doc-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div class="doc-info">
              <h3>รูปยานพาหนะ</h3>
              <span class="doc-status" :style="{ color: getDocStatusColor(getDocStatus('vehicle')) }">
                {{ getDocStatusText(getDocStatus('vehicle')) }}
              </span>
            </div>
          </div>
          
          <p v-if="getRejectionReason('vehicle')" class="rejection-reason">
            เหตุผล: {{ getRejectionReason('vehicle') }}
          </p>
          
          <div v-if="vehiclePreview" class="doc-preview">
            <img :src="vehiclePreview" alt="Vehicle" />
          </div>
          
          <div v-if="needsUpload('vehicle')" class="upload-area">
            <input type="file" accept="image/*" @change="handleFileSelect('vehicle', $event)" :id="'vehicle'" hidden />
            <label :for="'vehicle'" class="upload-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {{ newVehicle ? 'เปลี่ยนรูป' : (getDocStatus('vehicle') === 'rejected' ? 'อัพโหลดใหม่' : 'อัพโหลด') }}
            </label>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <button v-if="hasDocumentsToUpload" @click="submitDocuments" :disabled="!canSubmit || saving" class="submit-btn">
        <span v-if="saving" class="loading">
          <span class="spinner-small"></span> กำลังอัพโหลด...
        </span>
        <span v-else>ส่งเอกสาร</span>
      </button>
    </div>

    <!-- No Provider -->
    <div v-else class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
      </svg>
      <p>ไม่พบข้อมูลผู้ให้บริการ</p>
      <button @click="router.push('/provider/onboarding')" class="btn-primary">สมัครเป็นผู้ให้บริการ</button>
    </div>
  </div>
</template>


<style scoped>
.documents-page {
  min-height: 100vh;
  background: #F5F5F5;
}

.page-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #F5F5F5;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn svg {
  width: 20px;
  height: 20px;
  color: #1A1A1A;
}

.page-header h1 {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.spacer {
  width: 40px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content {
  padding: 16px;
}

.status-banner {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.status-banner svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.status-banner strong {
  display: block;
  font-size: 15px;
  margin-bottom: 4px;
}

.status-banner p {
  font-size: 13px;
  margin: 0;
  opacity: 0.8;
}

.status-banner.rejected {
  background: #FFEBEE;
  color: #C62828;
}

.status-banner.pending {
  background: #FFF8E1;
  color: #F57C00;
}

.status-banner.approved {
  background: #E8F5EF;
  color: #00A86B;
}

.message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 16px;
}

.message svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.message.error {
  background: #FFEBEE;
  color: #C62828;
}

.message.success {
  background: #E8F5EF;
  color: #00A86B;
}

.documents-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.doc-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  border: 2px solid #E8E8E8;
}

.doc-card.verified {
  border-color: #00A86B;
}

.doc-card.rejected {
  border-color: #E53935;
}

.doc-card.pending {
  border-color: #F5A623;
}

.doc-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.doc-icon {
  width: 44px;
  height: 44px;
  background: #F5F5F5;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doc-icon svg {
  width: 22px;
  height: 22px;
  color: #666666;
}

.doc-info h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 4px;
}

.doc-status {
  font-size: 13px;
  font-weight: 500;
}

.rejection-reason {
  font-size: 13px;
  color: #E53935;
  background: #FFEBEE;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.doc-preview {
  margin-bottom: 12px;
  border-radius: 10px;
  overflow: hidden;
}

.doc-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.upload-area {
  margin-top: 8px;
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #E8F5EF;
  color: #00A86B;
  border: 2px dashed #00A86B;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:hover {
  background: #D0EBE1;
}

.upload-btn svg {
  width: 18px;
  height: 18px;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 24px;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

.submit-btn:disabled {
  background: #CCCCCC;
  box-shadow: none;
  cursor: not-allowed;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state svg {
  width: 60px;
  height: 60px;
  color: #CCCCCC;
  margin-bottom: 16px;
}

.empty-state p {
  color: #666666;
  margin-bottom: 20px;
}

.btn-primary {
  padding: 14px 28px;
  background: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
</style>
