<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAdminProviders, type AdminProvider } from '../../admin/composables/useAdminProviders'

// Use the admin providers composable
const {
  loading,
  providers,
  pendingProviders,
  fetchProviders,
  approveProvider: approveProviderComposable,
  rejectProvider: rejectProviderComposable,
  getFullName,
  formatDate: formatDateComposable,
  getProviderTypeLabel
} = useAdminProviders()

// Local state
const actionLoading = ref<string | null>(null)
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

// Selection for bulk actions
const selectedIds = ref<Set<string>>(new Set())

// Modal state
const showDetailModal = ref(false)
const selectedProvider = ref<AdminProvider | null>(null)
const approvalNotes = ref('')
const rejectionReason = ref('')
const showRejectModal = ref(false)
const showApproveModal = ref(false)
const actionProviderId = ref<string | null>(null)

// Filters
const selectedServiceType = ref<string>('all')
const sortBy = ref<'oldest' | 'newest'>('oldest')
const searchQuery = ref('')

const serviceTypes = [
  { value: 'all', label: 'ทุกประเภท' },
  { value: 'ride', label: 'รถรับส่ง' },
  { value: 'delivery', label: 'จัดส่งสินค้า' },
  { value: 'shopping', label: 'ช้อปปิ้ง' },
  { value: 'all', label: 'ทั้งหมด' },
]

const filteredProviders = computed(() => {
  let result = [...pendingProviders.value]

  if (selectedServiceType.value !== 'all') {
    result = result.filter((p) => p.provider_type === selectedServiceType.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (p) =>
        (p.first_name?.toLowerCase() || '').includes(query) ||
        (p.last_name?.toLowerCase() || '').includes(query) ||
        (p.email?.toLowerCase() || '').includes(query) ||
        (p.phone_number || '').includes(query)
    )
  }

  result.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortBy.value === 'oldest' ? dateA - dateB : dateB - dateA
  })

  return result
})

const pendingCount = computed(() => pendingProviders.value.length)
const selectedCount = computed(() => selectedIds.value.size)
const allSelected = computed(() => 
  filteredProviders.value.length > 0 && 
  filteredProviders.value.every(p => selectedIds.value.has(p.id))
)

onMounted(async () => {
  await loadProviders()
  setupRealtimeSubscription()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})

async function loadProviders(): Promise<void> {
  await fetchProviders({ status: 'pending', limit: 100 })
}

function setupRealtimeSubscription(): void {
  realtimeChannel = supabase
    .channel('verification-queue')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'providers_v2' }, () => {
      loadProviders()
    })
    .subscribe()
}

function toggleSelect(id: string): void {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

function toggleSelectAll(): void {
  if (allSelected.value) {
    selectedIds.value.clear()
  } else {
    filteredProviders.value.forEach(p => selectedIds.value.add(p.id))
  }
  selectedIds.value = new Set(selectedIds.value)
}

function openApproveModal(providerId: string): void {
  actionProviderId.value = providerId
  approvalNotes.value = ''
  showApproveModal.value = true
}

async function confirmApprove(): Promise<void> {
  if (!actionProviderId.value) return
  
  actionLoading.value = actionProviderId.value
  try {
    const result = await approveProviderComposable(actionProviderId.value, approvalNotes.value)
    
    if (result.success) {
      await loadProviders()
      showApproveModal.value = false
      showDetailModal.value = false
      selectedIds.value.delete(actionProviderId.value)
    }
  } catch (err: unknown) {
    console.error('Error approving provider:', err)
  } finally {
    actionLoading.value = null
    actionProviderId.value = null
  }
}

function openRejectModal(providerId: string): void {
  actionProviderId.value = providerId
  rejectionReason.value = ''
  showRejectModal.value = true
}

async function confirmReject(): Promise<void> {
  if (!actionProviderId.value || !rejectionReason.value.trim()) return
  
  actionLoading.value = actionProviderId.value
  try {
    const result = await rejectProviderComposable(actionProviderId.value, rejectionReason.value)
    
    if (result.success) {
      await loadProviders()
      showRejectModal.value = false
      showDetailModal.value = false
      selectedIds.value.delete(actionProviderId.value)
    }
  } catch (err: unknown) {
    console.error('Error rejecting provider:', err)
  } finally {
    actionLoading.value = null
    actionProviderId.value = null
  }
}

async function bulkApprove(): Promise<void> {
  if (selectedIds.value.size === 0) return
  if (!confirm(`ยืนยันอนุมัติ ${selectedIds.value.size} รายการ?`)) return

  actionLoading.value = 'bulk'
  try {
    const ids = Array.from(selectedIds.value)
    
    for (const id of ids) {
      await approveProviderComposable(id, 'อนุมัติแบบกลุ่ม')
    }

    selectedIds.value.clear()
    await loadProviders()
  } catch (err: unknown) {
    console.error('Error bulk approving:', err)
  } finally {
    actionLoading.value = null
  }
}

async function bulkReject(): Promise<void> {
  if (selectedIds.value.size === 0) return
  const reason = prompt('ระบุเหตุผลในการปฏิเสธ:')
  if (reason === null || !reason.trim()) return

  actionLoading.value = 'bulk'
  try {
    const ids = Array.from(selectedIds.value)
    
    for (const id of ids) {
      await rejectProviderComposable(id, reason)
    }

    selectedIds.value.clear()
    await loadProviders()
  } catch (err: unknown) {
    console.error('Error bulk rejecting:', err)
  } finally {
    actionLoading.value = null
  }
}

function viewProviderDetails(provider: AdminProvider): void {
  selectedProvider.value = provider
  showDetailModal.value = true
}

function getServiceTypeLabel(type: string): string {
  return getProviderTypeLabel(type)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'วันนี้'
  if (diffDays === 1) return 'เมื่อวาน'
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">คิวตรวจสอบผู้ให้บริการ</h1>
      <p class="mt-2 text-gray-600">ตรวจสอบและอนุมัติผู้ให้บริการที่รอการยืนยัน</p>
    </div>

    <!-- Stats Card -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-blue-900">ผู้ให้บริการรอตรวจสอบ</p>
            <p class="text-3xl font-bold text-blue-600">{{ pendingCount }}</p>
          </div>
        </div>
        <div v-if="selectedCount > 0" class="flex items-center gap-3">
          <span class="text-sm text-gray-600">เลือก {{ selectedCount }} รายการ</span>
          <button type="button" @click="bulkApprove" :disabled="actionLoading === 'bulk'" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">อนุมัติทั้งหมด</button>
          <button type="button" @click="bulkReject" :disabled="actionLoading === 'bulk'" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">ปฏิเสธทั้งหมด</button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="flex items-center">
          <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" class="w-5 h-5 text-blue-600 rounded border-gray-300" />
          <label class="ml-2 text-sm text-gray-700">เลือกทั้งหมด</label>
        </div>
        <div>
          <input v-model="searchQuery" type="text" placeholder="ค้นหา ชื่อ, อีเมล, เบอร์โทร..." class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <select v-model="selectedServiceType" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option v-for="type in serviceTypes" :key="type.value" :value="type.value">{{ type.label }}</option>
          </select>
        </div>
        <div>
          <select v-model="sortBy" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="oldest">เก่าสุดก่อน</option>
            <option value="newest">ใหม่สุดก่อน</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredProviders.length === 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900">ไม่มีผู้ให้บริการรอตรวจสอบ</h3>
      <p class="mt-2 text-gray-600">ยังไม่มีผู้ให้บริการที่รอการยืนยันในขณะนี้</p>
    </div>

    <!-- Providers List -->
    <div v-else class="space-y-4">
      <div v-for="provider in filteredProviders" :key="provider.id" class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div class="flex items-start gap-4">
          <input type="checkbox" :checked="selectedIds.has(provider.id)" @change="toggleSelect(provider.id)" class="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300" />
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <h3 class="text-lg font-semibold text-gray-900">{{ provider.first_name }} {{ provider.last_name }}</h3>
                <span class="ml-3 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">รอตรวจสอบ</span>
              </div>
              <p class="text-sm text-gray-500">{{ formatDate(provider.created_at) }}</p>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-3 text-sm text-gray-600">
              <p><span class="font-medium">อีเมล:</span> {{ provider.email }}</p>
              <p><span class="font-medium">เบอร์โทร:</span> {{ provider.phone_number || 'ไม่ระบุ' }}</p>
              <p><span class="font-medium">ประเภทบริการ:</span> {{ getServiceTypeLabel(provider.provider_type) }}</p>
              <p><span class="font-medium">คะแนน:</span> {{ provider.rating.toFixed(1) }} ⭐</p>
            </div>
            <div class="flex items-center text-sm text-gray-600 mb-4">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>เอกสาร: {{ provider.documents_verified ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ' }}</span>
            </div>
            <div class="flex gap-3">
              <button type="button" @click="viewProviderDetails(provider)" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">ดูรายละเอียด</button>
              <button type="button" @click="openApproveModal(provider.id)" :disabled="actionLoading === provider.id" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">{{ actionLoading === provider.id ? 'กำลังดำเนินการ...' : 'อนุมัติ' }}</button>
              <button type="button" @click="openRejectModal(provider.id)" :disabled="actionLoading === provider.id" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">ปฏิเสธ</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedProvider" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900">รายละเอียดผู้ให้บริการ</h2>
            <button type="button" @click="showDetailModal = false" class="p-2 hover:bg-gray-100 rounded-lg" aria-label="ปิด">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="p-6 space-y-6">
          <!-- Personal Information -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">ข้อมูลส่วนตัว</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="bg-gray-50 p-3 rounded-lg">
                <span class="text-gray-500 block mb-1">ชื่อ-นามสกุล</span>
                <span class="font-medium">{{ getFullName(selectedProvider) }}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg">
                <span class="text-gray-500 block mb-1">อีเมล</span>
                <span class="font-medium">{{ selectedProvider.email }}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg">
                <span class="text-gray-500 block mb-1">เบอร์โทร</span>
                <span class="font-medium">{{ selectedProvider.phone_number || 'ไม่ระบุ' }}</span>
              </div>
              <div class="bg-gray-50 p-3 rounded-lg">
                <span class="text-gray-500 block mb-1">ประเภทบริการ</span>
                <span class="font-medium">{{ getServiceTypeLabel(selectedProvider.provider_type) }}</span>
              </div>
            </div>
          </div>

          <!-- Statistics -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">สถิติ</h3>
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-blue-50 p-4 rounded-lg text-center">
                <p class="text-2xl font-bold text-blue-600">{{ selectedProvider.total_trips }}</p>
                <p class="text-sm text-gray-600 mt-1">งานทั้งหมด</p>
              </div>
              <div class="bg-green-50 p-4 rounded-lg text-center">
                <p class="text-2xl font-bold text-green-600">{{ selectedProvider.rating.toFixed(1) }}</p>
                <p class="text-sm text-gray-600 mt-1">คะแนนเฉลี่ย</p>
              </div>
              <div class="bg-purple-50 p-4 rounded-lg text-center">
                <p class="text-2xl font-bold text-purple-600">฿{{ selectedProvider.total_earnings.toLocaleString() }}</p>
                <p class="text-sm text-gray-600 mt-1">รายได้รวม</p>
              </div>
            </div>
          </div>

          <!-- Document Verification Status -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">สถานะเอกสาร</h3>
            <div class="flex items-center gap-3 p-4 rounded-lg" :class="selectedProvider.documents_verified ? 'bg-green-50' : 'bg-yellow-50'">
              <svg v-if="selectedProvider.documents_verified" class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <svg v-else class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <p class="font-medium" :class="selectedProvider.documents_verified ? 'text-green-900' : 'text-yellow-900'">
                  {{ selectedProvider.documents_verified ? 'เอกสารตรวจสอบแล้ว' : 'รอตรวจสอบเอกสาร' }}
                </p>
                <p class="text-sm" :class="selectedProvider.documents_verified ? 'text-green-700' : 'text-yellow-700'">
                  {{ selectedProvider.documents_verified ? 'เอกสารครบถ้วนและถูกต้อง' : 'กรุณาตรวจสอบเอกสารก่อนอนุมัติ' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Verification Notes -->
          <div v-if="selectedProvider.verification_notes">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">หมายเหตุการตรวจสอบ</h3>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-700">{{ selectedProvider.verification_notes }}</p>
            </div>
          </div>

          <!-- Registration Date -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">ข้อมูลการลงทะเบียน</h3>
            <div class="bg-gray-50 p-3 rounded-lg text-sm">
              <span class="text-gray-500">วันที่สมัคร: </span>
              <span class="font-medium">{{ formatDateComposable(selectedProvider.created_at) }}</span>
            </div>
          </div>
        </div>
        <div class="p-6 border-t border-gray-200 flex gap-3">
          <button type="button" @click="openApproveModal(selectedProvider.id)" :disabled="actionLoading === selectedProvider.id" class="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
            {{ actionLoading === selectedProvider.id ? 'กำลังดำเนินการ...' : 'อนุมัติ' }}
          </button>
          <button type="button" @click="openRejectModal(selectedProvider.id)" :disabled="actionLoading === selectedProvider.id" class="flex-1 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
            ปฏิเสธ
          </button>
        </div>
      </div>
    </div>

    <!-- Approve Modal with Notes -->
    <div v-if="showApproveModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">อนุมัติผู้ให้บริการ</h2>
          <p class="text-gray-600 mb-4">คุณสามารถเพิ่มหมายเหตุเกี่ยวกับการอนุมัติ (ไม่บังคับ)</p>
          <label for="approval-notes" class="sr-only">หมายเหตุการอนุมัติ</label>
          <textarea 
            id="approval-notes" 
            v-model="approvalNotes" 
            placeholder="เช่น: เอกสารครบถ้วน ตรวจสอบแล้วถูกต้อง..." 
            rows="4" 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          ></textarea>
        </div>
        <div class="p-6 border-t border-gray-200 flex gap-3">
          <button type="button" @click="showApproveModal = false" class="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200">
            ยกเลิก
          </button>
          <button type="button" @click="confirmApprove" :disabled="actionLoading === actionProviderId" class="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
            {{ actionLoading === actionProviderId ? 'กำลังดำเนินการ...' : 'ยืนยันอนุมัติ' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">ปฏิเสธผู้ให้บริการ</h2>
          <p class="text-gray-600 mb-4">กรุณาระบุเหตุผลในการปฏิเสธ (บังคับ)</p>
          <label for="rejection-reason" class="sr-only">เหตุผลในการปฏิเสธ</label>
          <textarea 
            id="rejection-reason" 
            v-model="rejectionReason" 
            placeholder="เช่น: เอกสารไม่ครบถ้วน, ข้อมูลไม่ถูกต้อง..." 
            rows="4" 
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            required
          ></textarea>
          <p v-if="rejectionReason.trim().length > 0 && rejectionReason.trim().length < 10" class="text-sm text-red-600 mt-2">
            กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร
          </p>
        </div>
        <div class="p-6 border-t border-gray-200 flex gap-3">
          <button type="button" @click="showRejectModal = false" class="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200">
            ยกเลิก
          </button>
          <button 
            type="button" 
            @click="confirmReject" 
            :disabled="actionLoading === actionProviderId || rejectionReason.trim().length < 10" 
            class="flex-1 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {{ actionLoading === actionProviderId ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
