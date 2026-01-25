<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

interface Props {
  documentId: string
  providerId: string
}

interface Document {
  id: string
  provider_id: string
  document_type: string
  storage_path: string
  status: string
  expiry_date: string | null
  uploaded_at: string
  verified_at: string | null
  verified_by: string | null
  rejection_reason: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  approved: [documentId: string]
  rejected: [documentId: string, reason: string]
}>()

const document = ref<Document | null>(null)
const documentUrl = ref<string | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const isProcessing = ref(false)
const action = ref<'approve' | 'reject' | null>(null)
const rejectionReason = ref('')

const zoomLevel = ref(100)

const documentTypeNames: Record<string, string> = {
  national_id: 'บัตรประชาชน',
  driver_license: 'ใบขับขี่',
  vehicle_registration: 'ทะเบียนรถ',
  vehicle_insurance: 'ประกันรถ',
  bank_account: 'บัญชีธนาคาร',
  criminal_record: 'ประวัติอาชญากรรม',
  health_certificate: 'ใบรับรองสุขภาพ',
}

const isImage = computed(() => {
  return document.value?.storage_path.match(/\.(jpg|jpeg|png)$/i)
})

const isPDF = computed(() => {
  return document.value?.storage_path.match(/\.pdf$/i)
})

const canSubmit = computed(() => {
  if (action.value === 'reject') {
    return rejectionReason.value.trim().length >= 10
  }
  return action.value === 'approve'
})

onMounted(async () => {
  await loadDocument()
})

async function loadDocument(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    // Get document details
    const { data: docData, error: docError } = await supabase
      .from('provider_documents')
      .select('*')
      .eq('id', props.documentId)
      .single()

    if (docError) throw docError

    document.value = docData

    // Get signed URL for document
    const { data: urlData, error: urlError } = await supabase.storage
      .from('provider-documents')
      .createSignedUrl(docData.storage_path, 3600) // 1 hour expiry

    if (urlError) throw urlError

    documentUrl.value = urlData.signedUrl
  } catch (err: any) {
    console.error('Error loading document:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดเอกสาร'
  } finally {
    loading.value = false
  }
}

function setAction(newAction: 'approve' | 'reject'): void {
  action.value = newAction
  if (newAction === 'approve') {
    rejectionReason.value = ''
  }
}

function zoomIn(): void {
  if (zoomLevel.value < 200) {
    zoomLevel.value += 25
  }
}

function zoomOut(): void {
  if (zoomLevel.value > 50) {
    zoomLevel.value -= 25
  }
}

function resetZoom(): void {
  zoomLevel.value = 100
}

async function submitDecision(): Promise<void> {
  if (!canSubmit.value || !action.value) return

  isProcessing.value = true
  error.value = null

  try {
    // Call Edge Function for document verification
    const { data, error: verifyError } = await supabase.functions.invoke(
      'document-verification',
      {
        body: {
          document_id: props.documentId,
          action: action.value,
          reason: action.value === 'reject' ? rejectionReason.value : undefined,
        },
      }
    )

    if (verifyError) throw verifyError

    if (data.success) {
      if (action.value === 'approve') {
        emit('approved', props.documentId)
      } else {
        emit('rejected', props.documentId, rejectionReason.value)
      }
      emit('close')
    } else {
      error.value = data.message || 'เกิดข้อผิดพลาด'
    }
  } catch (err: any) {
    console.error('Error submitting decision:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการบันทึกผลการตรวจสอบ'
  } finally {
    isProcessing.value = false
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function checkExpiryWarning(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const now = new Date()
  const daysUntilExpiry = Math.floor(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  return daysUntilExpiry < 30
}
</script>

<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
      <!-- Backdrop -->
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="emit('close')" />

      <!-- Modal -->
      <div
        class="relative inline-block w-full max-w-6xl overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl"
      >
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-semibold text-gray-900">ตรวจสอบเอกสาร</h3>
              <p v-if="document" class="mt-1 text-sm text-gray-600">
                {{ documentTypeNames[document.document_type] || document.document_type }}
              </p>
            </div>
            <button
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              @click="emit('close')"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="px-6 py-4">
          <!-- Loading State -->
          <div v-if="loading" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p class="mt-4 text-gray-600">กำลังโหลดเอกสาร...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error && !document" class="text-center py-12">
            <p class="text-red-600">{{ error }}</p>
            <button
              class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              @click="loadDocument"
            >
              ลองใหม่
            </button>
          </div>

          <!-- Document View -->
          <div v-else-if="document" class="space-y-6">
            <!-- Document Metadata -->
            <div class="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p class="text-sm font-medium text-gray-700">วันที่อัปโหลด</p>
                <p class="text-sm text-gray-900">{{ formatDate(document.uploaded_at) }}</p>
              </div>
              <div v-if="document.expiry_date">
                <p class="text-sm font-medium text-gray-700">วันหมดอายุ</p>
                <p
                  class="text-sm"
                  :class="{
                    'text-red-600 font-semibold': checkExpiryWarning(document.expiry_date),
                    'text-gray-900': !checkExpiryWarning(document.expiry_date),
                  }"
                >
                  {{ formatDate(document.expiry_date) }}
                  <span v-if="checkExpiryWarning(document.expiry_date)" class="ml-2">⚠️ ใกล้หมดอายุ</span>
                </p>
              </div>
            </div>

            <!-- Document Preview -->
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <!-- Zoom Controls (for images) -->
              <div v-if="isImage" class="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                <div class="flex items-center space-x-2">
                  <button
                    :disabled="zoomLevel <= 50"
                    class="p-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="zoomOut"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                  </button>
                  <span class="text-sm font-medium text-gray-700">{{ zoomLevel }}%</span>
                  <button
                    :disabled="zoomLevel >= 200"
                    class="p-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    @click="zoomIn"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>
                  <button
                    class="ml-2 px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded"
                    @click="resetZoom"
                  >
                    รีเซ็ต
                  </button>
                </div>
              </div>

              <!-- Image Preview -->
              <div v-if="isImage && documentUrl" class="p-4 bg-gray-100 overflow-auto max-h-[500px]">
                <img
                  :src="documentUrl"
                  alt="Document preview"
                  class="mx-auto"
                  :style="{ width: `${zoomLevel}%` }"
                />
              </div>

              <!-- PDF Preview -->
              <div v-else-if="isPDF && documentUrl" class="h-[500px]">
                <iframe :src="documentUrl" class="w-full h-full" />
              </div>
            </div>

            <!-- Action Selection -->
            <div class="space-y-4">
              <p class="text-sm font-medium text-gray-700">การตัดสินใจ</p>
              <div class="grid grid-cols-2 gap-4">
                <button
                  :class="{
                    'ring-2 ring-green-500 bg-green-50': action === 'approve',
                    'border-2 border-gray-300': action !== 'approve',
                  }"
                  class="p-4 rounded-lg hover:bg-green-50 transition-colors"
                  @click="setAction('approve')"
                >
                  <div class="flex items-center justify-center">
                    <svg class="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span class="font-medium text-green-700">อนุมัติ</span>
                  </div>
                </button>

                <button
                  :class="{
                    'ring-2 ring-red-500 bg-red-50': action === 'reject',
                    'border-2 border-gray-300': action !== 'reject',
                  }"
                  class="p-4 rounded-lg hover:bg-red-50 transition-colors"
                  @click="setAction('reject')"
                >
                  <div class="flex items-center justify-center">
                    <svg class="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span class="font-medium text-red-700">ปฏิเสธ</span>
                  </div>
                </button>
              </div>

              <!-- Rejection Reason -->
              <div v-if="action === 'reject'" class="space-y-2">
                <label for="rejection-reason" class="block text-sm font-medium text-gray-700">
                  เหตุผลในการปฏิเสธ <span class="text-red-500">*</span>
                </label>
                <textarea
                  id="rejection-reason"
                  v-model="rejectionReason"
                  rows="4"
                  placeholder="กรุณาระบุเหตุผลในการปฏิเสธเอกสาร (อย่างน้อย 10 ตัวอักษร)"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  :class="{ 'border-red-500': action === 'reject' && rejectionReason.length < 10 }"
                />
                <p class="text-xs text-gray-500">
                  {{ rejectionReason.length }} / 10 ตัวอักษรขั้นต่ำ
                </p>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div class="flex justify-end space-x-3">
            <button
              :disabled="isProcessing"
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="emit('close')"
            >
              ยกเลิก
            </button>
            <button
              :disabled="!canSubmit || isProcessing"
              class="px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              :class="{
                'bg-green-600 hover:bg-green-700': action === 'approve',
                'bg-red-600 hover:bg-red-700': action === 'reject',
                'bg-gray-400': !action,
              }"
              @click="submitDecision"
            >
              <span v-if="isProcessing">กำลังบันทึก...</span>
              <span v-else-if="action === 'approve'">อนุมัติเอกสาร</span>
              <span v-else-if="action === 'reject'">ปฏิเสธเอกสาร</span>
              <span v-else>เลือกการตัดสินใจ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
