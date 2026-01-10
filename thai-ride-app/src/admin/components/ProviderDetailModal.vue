<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import DocumentReviewModal from './DocumentReviewModal.vue'

interface Props {
  providerId: string
}

interface Provider {
  id: string
  provider_uid: string | null
  first_name: string
  last_name: string
  email: string
  phone_number: string
  service_types: string[]
  status: string
  created_at: string
  approved_at: string | null
  suspended_at: string | null
  suspension_reason: string | null
}

interface Document {
  id: string
  document_type: string
  status: string
  expiry_date: string | null
  uploaded_at: string
  verified_at: string | null
  rejection_reason: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  updated: []
}>()

const provider = ref<Provider | null>(null)
const documents = ref<Document[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const showDocumentReview = ref(false)
const selectedDocumentId = ref<string | null>(null)

const isProcessing = ref(false)
const actionType = ref<'approve' | 'reject' | 'suspend' | null>(null)
const actionReason = ref('')

const documentTypeNames: Record<string, string> = {
  national_id: 'บัตรประชาชน',
  driver_license: 'ใบขับขี่',
  vehicle_registration: 'ทะเบียนรถ',
  vehicle_insurance: 'ประกันรถ',
  bank_account: 'บัญชีธนาคาร',
  criminal_record: 'ประวัติอาชญากรรม',
  health_certificate: 'ใบรับรองสุขภาพ',
}

const serviceTypeLabels: Record<string, string> = {
  ride: 'รถรับส่ง',
  delivery: 'จัดส่งสินค้า',
  shopping: 'ช้อปปิ้ง',
  moving: 'ขนย้าย',
  laundry: 'ซักรีด',
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'รอดำเนินการ', color: 'gray' },
  pending_verification: { label: 'รอตรวจสอบ', color: 'yellow' },
  approved: { label: 'อนุมัติแล้ว', color: 'green' },
  active: { label: 'ใช้งานอยู่', color: 'blue' },
  suspended: { label: 'ระงับการใช้งาน', color: 'red' },
  rejected: { label: 'ปฏิเสธ', color: 'red' },
}

const allDocumentsApproved = computed(() => {
  return documents.value.length > 0 && documents.value.every((d) => d.status === 'approved')
})

const hasRejectedDocuments = computed(() => {
  return documents.value.some((d) => d.status === 'rejected')
})

const canApproveProvider = computed(() => {
  return (
    provider.value?.status === 'pending_verification' &&
    allDocumentsApproved.value &&
    !hasRejectedDocuments.value
  )
})

const canRejectProvider = computed(() => {
  return provider.value?.status === 'pending_verification'
})

const canSuspendProvider = computed(() => {
  return provider.value?.status === 'approved' || provider.value?.status === 'active'
})

onMounted(async () => {
  await loadProviderData()
})

async function loadProviderData(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    // Load provider
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', props.providerId)
      .single()

    if (providerError) throw providerError
    provider.value = providerData

    // Load documents
    const { data: documentsData, error: documentsError } = await supabase
      .from('provider_documents')
      .select('*')
      .eq('provider_id', props.providerId)
      .order('uploaded_at', { ascending: false })

    if (documentsError) throw documentsError
    documents.value = documentsData || []
  } catch (err: any) {
    console.error('Error loading provider data:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
}

function openDocumentReview(documentId: string): void {
  selectedDocumentId.value = documentId
  showDocumentReview.value = true
}

function closeDocumentReview(): void {
  showDocumentReview.value = false
  selectedDocumentId.value = null
  loadProviderData()
}

function setAction(type: 'approve' | 'reject' | 'suspend'): void {
  actionType.value = type
  actionReason.value = ''
}

async function executeAction(): Promise<void> {
  if (!actionType.value || !provider.value) return

  if ((actionType.value === 'reject' || actionType.value === 'suspend') && actionReason.value.length < 10) {
    error.value = 'กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร'
    return
  }

  isProcessing.value = true
  error.value = null

  try {
    const { data, error: actionError } = await supabase.functions.invoke(
      'admin-provider-management',
      {
        body: {
          provider_id: props.providerId,
          action: actionType.value,
          reason: actionReason.value || undefined,
        },
      }
    )

    if (actionError) throw actionError

    if (data.success) {
      emit('updated')
      emit('close')
    } else {
      error.value = data.message || 'เกิดข้อผิดพลาด'
    }
  } catch (err: any) {
    console.error('Error executing action:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการดำเนินการ'
  } finally {
    isProcessing.value = false
  }
}

function getDocumentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'yellow',
    approved: 'green',
    rejected: 'red',
    expired: 'gray',
  }
  return colors[status] || 'gray'
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
      <!-- Backdrop -->
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="emit('close')" />

      <!-- Modal -->
      <div
        class="relative inline-block w-full max-w-4xl overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl"
      >
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-semibold text-gray-900">รายละเอียดผู้ให้บริการ</h3>
              <p v-if="provider" class="mt-1 text-sm text-gray-600">
                {{ provider.first_name }} {{ provider.last_name }}
              </p>
            </div>
            <button
              @click="emit('close')"
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="px-6 py-4 max-h-[600px] overflow-y-auto">
          <!-- Loading State -->
          <div v-if="loading" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p class="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error && !provider" class="text-center py-12">
            <p class="text-red-600">{{ error }}</p>
          </div>

          <!-- Provider Details -->
          <div v-else-if="provider" class="space-y-6">
            <!-- Status Badge -->
            <div class="flex items-center space-x-3">
              <span
                class="px-4 py-2 rounded-full text-sm font-medium"
                :class="{
                  'bg-gray-100 text-gray-800': statusLabels[provider.status]?.color === 'gray',
                  'bg-yellow-100 text-yellow-800': statusLabels[provider.status]?.color === 'yellow',
                  'bg-green-100 text-green-800': statusLabels[provider.status]?.color === 'green',
                  'bg-blue-100 text-blue-800': statusLabels[provider.status]?.color === 'blue',
                  'bg-red-100 text-red-800': statusLabels[provider.status]?.color === 'red',
                }"
              >
                {{ statusLabels[provider.status]?.label || provider.status }}
              </span>
              <span v-if="provider.provider_uid" class="text-sm text-gray-600">
                รหัส: {{ provider.provider_uid }}
              </span>
            </div>

            <!-- Provider Information -->
            <div class="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p class="text-sm font-medium text-gray-700">ชื่อ-นามสกุล</p>
                <p class="text-sm text-gray-900">{{ provider.first_name }} {{ provider.last_name }}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-700">อีเมล</p>
                <p class="text-sm text-gray-900">{{ provider.email }}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-700">เบอร์โทร</p>
                <p class="text-sm text-gray-900">{{ provider.phone_number }}</p>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-700">วันที่สมัคร</p>
                <p class="text-sm text-gray-900">{{ formatDate(provider.created_at) }}</p>
              </div>
            </div>

            <!-- Service Types -->
            <div>
              <p class="text-sm font-medium text-gray-700 mb-2">ประเภทบริการ</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="type in provider.service_types"
                  :key="type"
                  class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                >
                  {{ serviceTypeLabels[type] || type }}
                </span>
              </div>
            </div>

            <!-- Documents -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <p class="text-sm font-medium text-gray-700">เอกสาร ({{ documents.length }})</p>
                <div v-if="allDocumentsApproved" class="flex items-center text-green-600 text-sm">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  เอกสารครบและอนุมัติแล้ว
                </div>
              </div>

              <div class="space-y-2">
                <div
                  v-for="doc in documents"
                  :key="doc.id"
                  class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  @click="openDocumentReview(doc.id)"
                >
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">
                      {{ documentTypeNames[doc.document_type] || doc.document_type }}
                    </p>
                    <p class="text-xs text-gray-600">อัปโหลดเมื่อ {{ formatDate(doc.uploaded_at) }}</p>
                    <p v-if="doc.rejection_reason" class="text-xs text-red-600 mt-1">
                      เหตุผล: {{ doc.rejection_reason }}
                    </p>
                  </div>
                  <span
                    class="px-3 py-1 text-xs font-medium rounded-full"
                    :class="{
                      'bg-yellow-100 text-yellow-800': getDocumentStatusColor(doc.status) === 'yellow',
                      'bg-green-100 text-green-800': getDocumentStatusColor(doc.status) === 'green',
                      'bg-red-100 text-red-800': getDocumentStatusColor(doc.status) === 'red',
                      'bg-gray-100 text-gray-800': getDocumentStatusColor(doc.status) === 'gray',
                    }"
                  >
                    {{ doc.status === 'pending' ? 'รอตรวจสอบ' : doc.status === 'approved' ? 'อนุมัติ' : doc.status === 'rejected' ? 'ปฏิเสธ' : doc.status }}
                  </span>
                </div>

                <div v-if="documents.length === 0" class="text-center py-8 text-gray-500">
                  ยังไม่มีเอกสาร
                </div>
              </div>
            </div>

            <!-- Suspension Info -->
            <div v-if="provider.suspended_at" class="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm font-medium text-red-900">ระงับการใช้งานเมื่อ {{ formatDate(provider.suspended_at) }}</p>
              <p v-if="provider.suspension_reason" class="text-sm text-red-700 mt-1">
                เหตุผล: {{ provider.suspension_reason }}
              </p>
            </div>

            <!-- Actions -->
            <div v-if="!actionType" class="space-y-3">
              <p class="text-sm font-medium text-gray-700">การดำเนินการ</p>
              <div class="grid grid-cols-3 gap-3">
                <button
                  v-if="canApproveProvider"
                  @click="setAction('approve')"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  อนุมัติ
                </button>
                <button
                  v-if="canRejectProvider"
                  @click="setAction('reject')"
                  class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  ปฏิเสธ
                </button>
                <button
                  v-if="canSuspendProvider"
                  @click="setAction('suspend')"
                  class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  ระงับการใช้งาน
                </button>
              </div>
            </div>

            <!-- Action Form -->
            <div v-else class="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-900">
                  {{ actionType === 'approve' ? 'อนุมัติผู้ให้บริการ' : actionType === 'reject' ? 'ปฏิเสธผู้ให้บริการ' : 'ระงับการใช้งาน' }}
                </p>
                <button
                  @click="actionType = null"
                  class="text-sm text-gray-600 hover:text-gray-900"
                >
                  ยกเลิก
                </button>
              </div>

              <div v-if="actionType === 'reject' || actionType === 'suspend'">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  เหตุผล <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="actionReason"
                  rows="3"
                  placeholder="กรุณาระบุเหตุผล (อย่างน้อย 10 ตัวอักษร)"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p class="text-xs text-gray-500 mt-1">{{ actionReason.length }} / 10 ตัวอักษร</p>
              </div>

              <button
                @click="executeAction"
                :disabled="isProcessing || ((actionType === 'reject' || actionType === 'suspend') && actionReason.length < 10)"
                class="w-full px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                :class="{
                  'bg-green-600 hover:bg-green-700': actionType === 'approve',
                  'bg-red-600 hover:bg-red-700': actionType === 'reject',
                  'bg-orange-600 hover:bg-orange-700': actionType === 'suspend',
                }"
              >
                <span v-if="isProcessing">กำลังดำเนินการ...</span>
                <span v-else>ยืนยัน</span>
              </button>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p class="text-sm text-red-600">{{ error }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Document Review Modal -->
    <DocumentReviewModal
      v-if="showDocumentReview && selectedDocumentId"
      :document-id="selectedDocumentId"
      :provider-id="providerId"
      @close="closeDocumentReview"
      @approved="closeDocumentReview"
      @rejected="closeDocumentReview"
    />
  </div>
</template>
