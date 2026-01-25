<template>
  <div class="document-upload">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-900">อัพโหลดเอกสาร</h3>
        <div class="text-sm text-gray-500">
          {{ uploadedCount }}/{{ requiredDocuments.length }} เอกสาร
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-if="uploadedCount > 0" class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">ความคืบหน้า</span>
          <span class="text-sm text-gray-500">{{ Math.round((uploadedCount / requiredDocuments.length) * 100) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: (uploadedCount / requiredDocuments.length) * 100 + '%' }"
          ></div>
        </div>
      </div>

      <!-- Document List -->
      <div class="space-y-4">
        <div
          v-for="doc in requiredDocuments"
          :key="doc.type"
          class="border border-gray-200 rounded-lg p-4"
          :class="{
            'border-green-200 bg-green-50': isDocumentUploaded(doc.type),
            'border-red-200 bg-red-50': hasUploadError(doc.type)
          }"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center">
                <h4 class="font-medium text-gray-900">{{ doc.title }}</h4>
                <span v-if="doc.required" class="ml-2 text-xs text-red-600">*จำเป็น</span>
              </div>
              <p class="text-sm text-gray-600 mt-1">{{ doc.description }}</p>
              
              <!-- File Requirements -->
              <div class="mt-2 text-xs text-gray-500">
                <span>รองรับ: {{ doc.acceptedTypes.join(', ') }}</span>
                <span class="ml-4">ขนาดสูงสุด: {{ formatFileSize(doc.maxSize) }}</span>
              </div>
            </div>

            <!-- Upload Status -->
            <div class="ml-4 flex items-center">
              <div v-if="isDocumentUploaded(doc.type)" class="flex items-center text-green-600">
                <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span class="text-sm">อัพโหลดแล้ว</span>
              </div>
              
              <div v-else-if="isUploading(doc.type)" class="flex items-center text-blue-600">
                <svg class="animate-spin w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-sm">กำลังอัพโหลด...</span>
              </div>
              
              <div v-else-if="hasUploadError(doc.type)" class="flex items-center text-red-600">
                <svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <span class="text-sm">ผิดพลาด</span>
              </div>
            </div>
          </div>

          <!-- Upload Area -->
          <div v-if="!isDocumentUploaded(doc.type)" class="mt-4">
            <div
              class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
              :class="{
                'border-blue-400 bg-blue-50': isDragging === doc.type,
                'border-red-400 bg-red-50': hasUploadError(doc.type)
              }"
              @drop="handleDrop($event, doc.type)"
              @dragover.prevent
              @dragenter.prevent
              @click="triggerFileInput(doc.type)"
            >
              <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="text-sm text-gray-600">
                <span class="font-medium text-blue-600">คลิกเพื่อเลือกไฟล์</span>
                หรือลากไฟล์มาวางที่นี่
              </p>
            </div>

            <!-- Hidden File Input -->
            <input
              :ref="el => fileInputs[doc.type] = el"
              type="file"
              :accept="doc.acceptedTypes.join(',')"
              class="hidden"
              @change="handleFileSelect($event, doc.type)"
            />

            <!-- Error Message -->
            <div v-if="getUploadError(doc.type)" class="mt-2 text-sm text-red-600">
              {{ getUploadError(doc.type) }}
            </div>
          </div>

          <!-- Uploaded File Info -->
          <div v-else class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-green-900">{{ getUploadedFileName(doc.type) }}</p>
                  <p class="text-xs text-green-600">อัพโหลดเมื่อ: {{ getUploadedDate(doc.type) }}</p>
                </div>
              </div>
              <button
                class="text-red-600 hover:text-red-700 text-sm font-medium"
                @click="removeDocument(doc.type)"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="mt-6 flex justify-between">
        <button
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          @click="$emit('back')"
        >
          ย้อนกลับ
        </button>
        
        <button
          :disabled="!canSubmit || submitting"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="submitDocuments"
        >
          {{ submitting ? 'กำลังบันทึก...' : 'บันทึกเอกสาร' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

interface DocumentType {
  type: string
  title: string
  description: string
  required: boolean
  acceptedTypes: string[]
  maxSize: number // in bytes
}

interface UploadedDocument {
  type: string
  fileName: string
  fileUrl: string
  uploadedAt: string
  fileSize: number
}

interface Props {
  providerType?: 'driver' | 'delivery'
}

const props = withDefaults(defineProps<Props>(), {
  providerType: 'driver'
})

const emit = defineEmits<{
  back: []
  complete: [documents: UploadedDocument[]]
}>()

const authStore = useAuthStore()

// File inputs refs
const fileInputs = ref<Record<string, HTMLInputElement>>({})

// State
const isDragging = ref<string | null>(null)
const uploadingFiles = ref<Set<string>>(new Set())
const uploadErrors = ref<Record<string, string>>({})
const uploadedDocuments = ref<UploadedDocument[]>([])
const submitting = ref(false)

// Required documents based on provider type
const requiredDocuments = computed((): DocumentType[] => {
  const baseDocuments: DocumentType[] = [
    {
      type: 'id_card',
      title: 'บัตรประชาชน',
      description: 'สำเนาบัตรประชาชน (หน้า-หลัง)',
      required: true,
      acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
      maxSize: 5 * 1024 * 1024 // 5MB
    },
    {
      type: 'bank_account',
      title: 'หน้าสมุดบัญชีธนาคาร',
      description: 'สำเนาหน้าแรกของสมุดบัญชีธนาคาร',
      required: true,
      acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
      maxSize: 5 * 1024 * 1024
    }
  ]

  if (props.providerType === 'driver') {
    baseDocuments.push(
      {
        type: 'driving_license',
        title: 'ใบขับขี่',
        description: 'สำเนาใบขับขี่ (หน้า-หลัง)',
        required: true,
        acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
        maxSize: 5 * 1024 * 1024
      },
      {
        type: 'vehicle_registration',
        title: 'ทะเบียนรถ',
        description: 'สำเนาทะเบียนรถ',
        required: true,
        acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
        maxSize: 5 * 1024 * 1024
      },
      {
        type: 'vehicle_insurance',
        title: 'ประกันรถยนต์',
        description: 'สำเนาประกันรถยนต์ (พ.ร.บ. และประกันชั้น 1)',
        required: true,
        acceptedTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
        maxSize: 5 * 1024 * 1024
      }
    )
  }

  return baseDocuments
})

// Computed properties
const uploadedCount = computed(() => uploadedDocuments.value.length)

const canSubmit = computed(() => {
  const requiredDocs = requiredDocuments.value.filter(doc => doc.required)
  return requiredDocs.every(doc => isDocumentUploaded(doc.type)) && !submitting.value
})

// Helper functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const isDocumentUploaded = (type: string): boolean => {
  return uploadedDocuments.value.some(doc => doc.type === type)
}

const isUploading = (type: string): boolean => {
  return uploadingFiles.value.has(type)
}

const hasUploadError = (type: string): boolean => {
  return !!uploadErrors.value[type]
}

const getUploadError = (type: string): string | null => {
  return uploadErrors.value[type] || null
}

const getUploadedFileName = (type: string): string => {
  const doc = uploadedDocuments.value.find(d => d.type === type)
  return doc?.fileName || ''
}

const getUploadedDate = (type: string): string => {
  const doc = uploadedDocuments.value.find(d => d.type === type)
  if (!doc) return ''
  
  return new Date(doc.uploadedAt).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// File handling
const triggerFileInput = (type: string): void => {
  const input = fileInputs.value[type]
  if (input) {
    input.click()
  }
}

const handleFileSelect = (event: Event, type: string): void => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    uploadFile(file, type)
  }
}

const handleDrop = (event: DragEvent, type: string): void => {
  event.preventDefault()
  isDragging.value = null
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    uploadFile(files[0], type)
  }
}

const validateFile = (file: File, type: string): string | null => {
  const docType = requiredDocuments.value.find(doc => doc.type === type)
  if (!docType) return 'ประเภทเอกสารไม่ถูกต้อง'

  // Check file type
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!docType.acceptedTypes.includes(fileExtension)) {
    return `รองรับเฉพาะไฟล์ประเภท: ${docType.acceptedTypes.join(', ')}`
  }

  // Check file size
  if (file.size > docType.maxSize) {
    return `ขนาดไฟล์ใหญ่เกินไป (สูงสุด ${formatFileSize(docType.maxSize)})`
  }

  return null
}

const uploadFile = async (file: File, type: string): Promise<void> => {
  // Clear previous error
  delete uploadErrors.value[type]

  // Validate file
  const validationError = validateFile(file, type)
  if (validationError) {
    uploadErrors.value[type] = validationError
    return
  }

  uploadingFiles.value.add(type)

  try {
    // Generate unique file name
    const fileExtension = file.name.split('.').pop()
    const fileName = `${authStore.user?.id}/${type}_${Date.now()}.${fileExtension}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('provider-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(error.message)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('provider-documents')
      .getPublicUrl(fileName)

    // Add to uploaded documents
    const uploadedDoc: UploadedDocument = {
      type,
      fileName: file.name,
      fileUrl: urlData.publicUrl,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size
    }

    // Remove existing document of same type
    uploadedDocuments.value = uploadedDocuments.value.filter(doc => doc.type !== type)
    uploadedDocuments.value.push(uploadedDoc)

  } catch (error) {
    console.error('Upload error:', error)
    uploadErrors.value[type] = 'เกิดข้อผิดพลาดในการอัพโหลด กรุณาลองใหม่อีกครั้ง'
  } finally {
    uploadingFiles.value.delete(type)
  }
}

const removeDocument = async (type: string): Promise<void> => {
  const doc = uploadedDocuments.value.find(d => d.type === type)
  if (!doc) return

  try {
    // Extract file path from URL
    const url = new URL(doc.fileUrl)
    const filePath = url.pathname.split('/').slice(-2).join('/')

    // Delete from storage
    await supabase.storage
      .from('provider-documents')
      .remove([filePath])

    // Remove from local state
    uploadedDocuments.value = uploadedDocuments.value.filter(d => d.type !== type)

  } catch (error) {
    console.error('Error removing document:', error)
  }
}

const submitDocuments = async (): Promise<void> => {
  if (!canSubmit.value || !authStore.user?.id) return

  submitting.value = true
  try {
    // Prepare documents data
    const documentsData = uploadedDocuments.value.reduce((acc, doc) => {
      acc[doc.type] = {
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        uploadedAt: doc.uploadedAt,
        fileSize: doc.fileSize
      }
      return acc
    }, {} as Record<string, any>)

    // Update provider record with documents
    const { error } = await supabase
      .from('providers_v2')
      .update({
        documents: documentsData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', authStore.user.id)

    if (error) {
      throw new Error(error.message)
    }

    emit('complete', uploadedDocuments.value)

  } catch (error) {
    console.error('Error submitting documents:', error)
    alert('เกิดข้อผิดพลาดในการบันทึกเอกสาร กรุณาลองใหม่อีกครั้ง')
  } finally {
    submitting.value = false
  }
}
</script>