<script setup lang="ts">
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

interface Props {
  providerId: string
  documentType: DocumentType
  label: string
  description?: string
  requiresExpiry?: boolean
  acceptedFormats?: string[]
  maxSizeMB?: number
}

type DocumentType =
  | 'national_id'
  | 'driver_license'
  | 'vehicle_registration'
  | 'vehicle_insurance'
  | 'bank_account'
  | 'criminal_record'
  | 'health_certificate'

interface DocumentUploadResult {
  document_id: string
  storage_path: string
  status: 'pending'
}

const props = withDefaults(defineProps<Props>(), {
  acceptedFormats: () => ['image/jpeg', 'image/png', 'application/pdf'],
  maxSizeMB: 5,
})

const emit = defineEmits<{
  uploaded: [result: DocumentUploadResult]
  error: [error: string]
}>()

const file = ref<File | null>(null)
const expiryDate = ref('')
const previewUrl = ref<string | null>(null)
const isUploading = ref(false)
const uploadProgress = ref(0)
const error = ref<string | null>(null)
const isDragging = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

const acceptedFormatsString = computed(() => props.acceptedFormats.join(','))

const maxSizeBytes = computed(() => props.maxSizeMB * 1024 * 1024)

const isImage = computed(() => {
  return file.value?.type.startsWith('image/')
})

const isPDF = computed(() => {
  return file.value?.type === 'application/pdf'
})

const canUpload = computed(() => {
  if (!file.value) return false
  if (props.requiresExpiry && !expiryDate.value) return false
  return true
})

function handleFileSelect(event: Event): void {
  const target = event.target as HTMLInputElement
  const selectedFile = target.files?.[0]
  if (selectedFile) {
    processFile(selectedFile)
  }
}

function handleDrop(event: DragEvent): void {
  isDragging.value = false
  const droppedFile = event.dataTransfer?.files[0]
  if (droppedFile) {
    processFile(droppedFile)
  }
}

function handleDragOver(event: DragEvent): void {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave(): void {
  isDragging.value = false
}

function processFile(selectedFile: File): void {
  error.value = null

  // Validate file type
  if (!props.acceptedFormats.includes(selectedFile.type)) {
    error.value = `ไฟล์ต้องเป็นประเภท ${props.acceptedFormats.join(', ')}`
    return
  }

  // Validate file size
  if (selectedFile.size > maxSizeBytes.value) {
    error.value = `ไฟล์ต้องมีขนาดไม่เกิน ${props.maxSizeMB} MB`
    return
  }

  file.value = selectedFile

  // Generate preview for images
  if (selectedFile.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      previewUrl.value = e.target?.result as string
    }
    reader.readAsDataURL(selectedFile)
  } else {
    previewUrl.value = null
  }
}

function removeFile(): void {
  file.value = null
  previewUrl.value = null
  expiryDate.value = ''
  error.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function openFilePicker(): void {
  fileInputRef.value?.click()
}

async function uploadDocument(): Promise<void> {
  if (!canUpload.value || !file.value) return

  isUploading.value = true
  error.value = null
  uploadProgress.value = 0

  try {
    // Generate unique file path
    const fileExt = file.value.name.split('.').pop()
    const fileName = `${props.providerId}/${props.documentType}_${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('provider-documents')
      .upload(fileName, file.value, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    uploadProgress.value = 50

    // Create document record in database
    const { data: documentData, error: dbError } = await supabase
      .from('provider_documents')
      .insert({
        provider_id: props.providerId,
        document_type: props.documentType,
        storage_path: uploadData.path,
        status: 'pending',
        expiry_date: props.requiresExpiry ? expiryDate.value : null,
      })
      .select()
      .single()

    if (dbError) throw dbError

    uploadProgress.value = 100

    // Emit success event
    emit('uploaded', {
      document_id: documentData.id,
      storage_path: documentData.storage_path,
      status: 'pending',
    })

    // Reset form
    removeFile()
  } catch (err: any) {
    console.error('Document upload error:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร'
    emit('error', error.value)
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}
</script>

<template>
  <div class="border border-gray-200 rounded-lg p-6 bg-white">
    <!-- Header -->
    <div class="mb-4">
      <h3 class="text-lg font-semibold text-gray-900">{{ label }}</h3>
      <p v-if="description" class="text-sm text-gray-600 mt-1">{{ description }}</p>
    </div>

    <!-- File Upload Area -->
    <div
      v-if="!file"
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
      :class="{
        'border-blue-400 bg-blue-50': isDragging,
        'border-gray-300 hover:border-gray-400': !isDragging,
      }"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        stroke="currentColor"
        fill="none"
        viewBox="0 0 48 48"
      >
        <path
          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <div class="mt-4">
        <button
          type="button"
          @click="openFilePicker"
          class="text-blue-600 hover:text-blue-700 font-medium"
        >
          เลือกไฟล์
        </button>
        <span class="text-gray-600"> หรือลากไฟล์มาวางที่นี่</span>
      </div>
      <p class="text-xs text-gray-500 mt-2">
        รองรับไฟล์ JPG, PNG, PDF (ขนาดไม่เกิน {{ maxSizeMB }} MB)
      </p>
      <input
        ref="fileInputRef"
        type="file"
        :accept="acceptedFormatsString"
        @change="handleFileSelect"
        class="hidden"
      />
    </div>

    <!-- File Preview -->
    <div v-else class="space-y-4">
      <!-- Image Preview -->
      <div v-if="isImage && previewUrl" class="relative">
        <img :src="previewUrl" alt="Preview" class="w-full h-48 object-contain rounded-lg bg-gray-50" />
        <button
          type="button"
          @click="removeFile"
          class="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- PDF Preview -->
      <div v-else-if="isPDF" class="flex items-center p-4 bg-gray-50 rounded-lg">
        <svg class="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="ml-4 flex-1">
          <p class="text-sm font-medium text-gray-900">{{ file.name }}</p>
          <p class="text-xs text-gray-500">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
        </div>
        <button
          type="button"
          @click="removeFile"
          class="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Expiry Date Input -->
      <div v-if="requiresExpiry">
        <label for="expiry-date" class="block text-sm font-medium text-gray-700 mb-2">
          วันหมดอายุ <span class="text-red-500">*</span>
        </label>
        <input
          id="expiry-date"
          v-model="expiryDate"
          type="date"
          :min="new Date().toISOString().split('T')[0]"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :disabled="isUploading"
        />
      </div>

      <!-- Upload Progress -->
      <div v-if="isUploading" class="space-y-2">
        <div class="flex justify-between text-sm text-gray-600">
          <span>กำลังอัปโหลด...</span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${uploadProgress}%` }"
          />
        </div>
      </div>

      <!-- Upload Button -->
      <button
        type="button"
        @click="uploadDocument"
        :disabled="!canUpload || isUploading"
        class="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="isUploading">กำลังอัปโหลด...</span>
        <span v-else>อัปโหลดเอกสาร</span>
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-sm text-red-600">{{ error }}</p>
    </div>
  </div>
</template>
