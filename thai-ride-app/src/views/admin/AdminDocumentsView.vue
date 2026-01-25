<template>
  <div class="admin-documents">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">จัดการเอกสารผู้ให้บริการ</h1>
      <p class="text-gray-600">ตรวจสอบและอนุมัติเอกสารของผู้สมัครเป็นผู้ให้บริการ</p>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">สถานะเอกสาร</label>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ทั้งหมด</option>
            <option value="pending">รอตรวจสอบ</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ประเภทผู้ให้บริการ</label>
          <select
            v-model="filters.providerType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ทั้งหมด</option>
            <option value="driver">คนขับรถ</option>
            <option value="delivery">ผู้ส่งของ</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="ชื่อ, อีเมล, เบอร์โทร"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div class="flex items-end">
          <button
            :disabled="loading"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            @click="loadProviders"
          >
            {{ loading ? 'กำลังโหลด...' : 'ค้นหา' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Providers List -->
    <div v-else-if="filteredProviders.length > 0" class="space-y-6">
      <div
        v-for="provider in filteredProviders"
        :key="provider.id"
        class="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <!-- Provider Header -->
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">
              {{ provider.first_name }} {{ provider.last_name }}
            </h3>
            <p class="text-sm text-gray-600">{{ provider.email }} • {{ provider.phone_number }}</p>
            <div class="flex items-center mt-1">
              <span
                class="text-xs px-2 py-1 rounded-full"
                :class="getProviderStatusClass(provider.status)"
              >
                {{ getProviderStatusText(provider.status) }}
              </span>
              <span class="ml-2 text-xs text-gray-500">
                {{ getProviderTypeText(provider.provider_type) }}
              </span>
            </div>
          </div>
          
          <div class="text-right">
            <p class="text-sm text-gray-600">สมัครเมื่อ</p>
            <p class="text-sm font-medium">{{ formatDate(provider.created_at) }}</p>
          </div>
        </div>

        <!-- Documents -->
        <div v-if="provider.documents" class="space-y-3">
          <h4 class="font-medium text-gray-900">เอกสารที่อัพโหลด</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="(doc, docType) in provider.documents"
              :key="docType"
              class="border border-gray-200 rounded-lg p-4"
              :class="{
                'border-green-200 bg-green-50': doc.status === 'approved',
                'border-red-200 bg-red-50': doc.status === 'rejected',
                'border-yellow-200 bg-yellow-50': doc.status === 'pending'
              }"
            >
              <div class="flex items-start justify-between mb-2">
                <div>
                  <h5 class="font-medium text-gray-900">{{ getDocumentTitle(docType) }}</h5>
                  <p class="text-xs text-gray-600">{{ doc.fileName }}</p>
                </div>
                
                <div class="flex items-center">
                  <span
                    class="text-xs px-2 py-1 rounded-full"
                    :class="getDocumentStatusClass(doc.status)"
                  >
                    {{ getDocumentStatusText(doc.status) }}
                  </span>
                </div>
              </div>
              
              <!-- Document Actions -->
              <div class="flex space-x-2 mt-3">
                <button
                  class="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  @click="viewDocument(doc.fileUrl)"
                >
                  ดูเอกสาร
                </button>
                
                <button
                  v-if="doc.status === 'pending'"
                  :disabled="updatingDocument"
                  class="flex-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                  @click="approveDocument(provider.user_id, docType)"
                >
                  อนุมัติ
                </button>
                
                <button
                  v-if="doc.status === 'pending'"
                  :disabled="updatingDocument"
                  class="flex-1 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                  @click="openRejectModal(provider.user_id, docType)"
                >
                  ปฏิเสธ
                </button>
              </div>
              
              <!-- Rejection Reason -->
              <div v-if="doc.status === 'rejected' && doc.rejectionReason" class="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs">
                <strong>เหตุผลที่ปฏิเสธ:</strong> {{ doc.rejectionReason }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- No Documents -->
        <div v-else class="text-center py-4 text-gray-500">
          ยังไม่มีเอกสารที่อัพโหลด
        </div>
      </div>
    </div>

    <!-- No Results -->
    <div v-else class="text-center py-12">
      <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">ไม่พบข้อมูล</h3>
      <p class="text-gray-600">ไม่มีผู้ให้บริการที่ตรงกับเงื่อนไขการค้นหา</p>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">ปฏิเสธเอกสาร</h3>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">เหตุผลที่ปฏิเสธ</label>
          <textarea
            v-model="rejectionReason"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="กรุณาระบุเหตุผลที่ปฏิเสธเอกสารนี้..."
          ></textarea>
        </div>
        
        <div class="flex space-x-3">
          <button
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            @click="closeRejectModal"
          >
            ยกเลิก
          </button>
          <button
            :disabled="!rejectionReason.trim() || updatingDocument"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            @click="rejectDocument"
          >
            {{ updatingDocument ? 'กำลังบันทึก...' : 'ปฏิเสธ' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import type { ProviderStatus } from '../../types/role'

interface ProviderWithDocuments {
  id: string
  user_id: string
  provider_type: string
  status: ProviderStatus
  first_name: string | null
  last_name: string | null
  email: string
  phone_number: string | null
  created_at: string
  documents: Record<string, {
    fileName: string
    fileUrl: string
    uploadedAt: string
    fileSize: number
    status: 'pending' | 'approved' | 'rejected'
    rejectionReason?: string
  }> | null
}

const loading = ref(true)
const updatingDocument = ref(false)
const providers = ref<ProviderWithDocuments[]>([])
const showRejectModal = ref(false)
const rejectionReason = ref('')
const selectedProvider = ref<string | null>(null)
const selectedDocumentType = ref<string | null>(null)

const filters = ref({
  status: '',
  providerType: '',
  search: ''
})

// Document type mappings
const documentTitles: Record<string, string> = {
  id_card: 'บัตรประชาชน',
  bank_account: 'หน้าสมุดบัญชีธนาคาร',
  profile_photo: 'รูปถ่ายโปรไฟล์',
  driving_license: 'ใบขับขี่',
  vehicle_registration: 'ทะเบียนรถ',
  vehicle_insurance: 'ประกันรถยนต์',
  vehicle_photo: 'รูปถ่ายรถยนต์',
  motorcycle_license: 'ใบขับขี่มอเตอร์ไซค์',
  motorcycle_registration: 'ทะเบียนมอเตอร์ไซค์',
  motorcycle_photo: 'รูปถ่ายมอเตอร์ไซค์'
}

const filteredProviders = computed(() => {
  let result = providers.value

  if (filters.value.status) {
    result = result.filter(p => {
      if (!p.documents) return filters.value.status === 'pending'
      
      const hasStatus = Object.values(p.documents).some(doc => 
        doc.status === filters.value.status
      )
      return hasStatus
    })
  }

  if (filters.value.providerType) {
    result = result.filter(p => p.provider_type === filters.value.providerType)
  }

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(p => 
      p.first_name?.toLowerCase().includes(search) ||
      p.last_name?.toLowerCase().includes(search) ||
      p.email.toLowerCase().includes(search) ||
      p.phone_number?.includes(search)
    )
  }

  return result
})

const loadProviders = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('providers_v2')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading providers:', error)
      return
    }

    providers.value = (data || []).map(provider => ({
      id: provider.id,
      user_id: provider.user_id,
      provider_type: provider.provider_type,
      status: provider.status as ProviderStatus,
      first_name: provider.first_name,
      last_name: provider.last_name,
      email: provider.email,
      phone_number: provider.phone_number,
      created_at: provider.created_at,
      documents: provider.documents as Record<string, {
        fileName: string
        fileUrl: string
        uploadedAt: string
        fileSize: number
        status: 'pending' | 'approved' | 'rejected'
        rejectionReason?: string
      }> | null
    }))
  } catch (error) {
    console.error('Exception loading providers:', error)
  } finally {
    loading.value = false
  }
}

const getDocumentTitle = (docType: string): string => {
  return documentTitles[docType] || docType
}

const getProviderStatusClass = (status: ProviderStatus): string => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    active: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    suspended: 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getProviderStatusText = (status: ProviderStatus): string => {
  const texts = {
    pending: 'รอตรวจสอบ',
    approved: 'อนุมัติแล้ว',
    active: 'ใช้งานอยู่',
    rejected: 'ปฏิเสธ',
    suspended: 'ระงับ'
  }
  return texts[status] || status
}

const getProviderTypeText = (type: string): string => {
  const types = {
    driver: 'คนขับรถ',
    delivery: 'ผู้ส่งของ'
  }
  return types[type] || type
}

const getDocumentStatusClass = (status: string): string => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getDocumentStatusText = (status: string): string => {
  const texts = {
    pending: 'รอตรวจสอบ',
    approved: 'อนุมัติ',
    rejected: 'ปฏิเสธ'
  }
  return texts[status] || status
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const viewDocument = (fileUrl: string): void => {
  window.open(fileUrl, '_blank')
}

const approveDocument = async (userId: string, docType: string): Promise<void> => {
  updatingDocument.value = true
  try {
    const { error } = await supabase.rpc('update_document_status' as any, {
      provider_user_id: userId,
      document_type: docType,
      new_status: 'approved'
    })

    if (error) {
      console.error('Error approving document:', error)
      alert('เกิดข้อผิดพลาดในการอนุมัติเอกสาร')
      return
    }

    // Reload providers to get updated data
    await loadProviders()
    
  } catch (error) {
    console.error('Exception approving document:', error)
    alert('เกิดข้อผิดพลาดในการอนุมัติเอกสาร')
  } finally {
    updatingDocument.value = false
  }
}

const openRejectModal = (userId: string, docType: string): void => {
  selectedProvider.value = userId
  selectedDocumentType.value = docType
  rejectionReason.value = ''
  showRejectModal.value = true
}

const closeRejectModal = (): void => {
  showRejectModal.value = false
  selectedProvider.value = null
  selectedDocumentType.value = null
  rejectionReason.value = ''
}

const rejectDocument = async (): Promise<void> => {
  if (!selectedProvider.value || !selectedDocumentType.value || !rejectionReason.value.trim()) {
    return
  }

  updatingDocument.value = true
  try {
    const { error } = await supabase.rpc('update_document_status' as any, {
      provider_user_id: selectedProvider.value,
      document_type: selectedDocumentType.value,
      new_status: 'rejected',
      rejection_reason: rejectionReason.value.trim()
    })

    if (error) {
      console.error('Error rejecting document:', error)
      alert('เกิดข้อผิดพลาดในการปฏิเสธเอกสาร')
      return
    }

    // Reload providers to get updated data
    await loadProviders()
    closeRejectModal()
    
  } catch (error) {
    console.error('Exception rejecting document:', error)
    alert('เกิดข้อผิดพลาดในการปฏิเสธเอกสาร')
  } finally {
    updatingDocument.value = false
  }
}

onMounted(() => {
  loadProviders()
})
</script>