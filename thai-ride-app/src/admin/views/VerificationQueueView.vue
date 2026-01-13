<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../../lib/supabase'
import type { ProviderV2 } from '../../types/database'

interface Provider {
  id: string
  user_id: string
  provider_uid: string | null
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  service_types: string[]
  status: string
  created_at: string
  documents: Record<string, unknown>
  vehicle_type: string | null
  vehicle_plate: string | null
  national_id: string | null
}

const providers = ref<Provider[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const actionLoading = ref<string | null>(null)
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

// Selection for bulk actions
const selectedIds = ref<Set<string>>(new Set())

// Modal state
const showDetailModal = ref(false)
const selectedProvider = ref<Provider | null>(null)
const rejectionReason = ref('')
const showRejectModal = ref(false)
const rejectingProviderId = ref<string | null>(null)

// Filters
const selectedServiceType = ref<string>('all')
const sortBy = ref<'oldest' | 'newest'>('oldest')
const searchQuery = ref('')

const serviceTypes = [
  { value: 'all', label: 'ทุกประเภท' },
  { value: 'ride', label: 'รถรับส่ง' },
  { value: 'delivery', label: 'จัดส่งสินค้า' },
  { value: 'shopping', label: 'ช้อปปิ้ง' },
  { value: 'moving', label: 'ขนย้าย' },
  { value: 'laundry', label: 'ซักรีด' },
]

const filteredProviders = computed(() => {
  let result = [...providers.value]

  if (selectedServiceType.value !== 'all') {
    result = result.filter((p) =>
      p.service_types.includes(selectedServiceType.value)
    )
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

const pendingCount = computed(() => providers.value.length)
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
  loading.value = true
  error.value = null

  try {
    const { data: providersData, error: providersError } = await supabase
      .from('providers_v2')
      .select('*')
      .in('status', ['pending', 'pending_verification'])
      .order('created_at', { ascending: true })

    if (providersError) throw providersError

    providers.value = (providersData || []).map((provider: ProviderV2) => ({
      id: provider.id,
      user_id: provider.user_id,
      provider_uid: provider.provider_uid,
      first_name: provider.first_name || 'ไม่ระบุ',
      last_name: provider.last_name || '',
      email: provider.email || 'ไม่ระบุ',
      phone_number: provider.phone_number,
      service_types: provider.service_types || [],
      status: provider.status,
      created_at: provider.created_at || new Date().toISOString(),
      documents: (provider.documents as Record<string, unknown>) || {},
      vehicle_type: provider.vehicle_type,
      vehicle_plate: provider.vehicle_plate,
      national_id: provider.national_id,
    }))
  } catch (err: unknown) {
    console.error('Error loading providers:', err)
    error.value = (err as Error).message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
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

async function approveProvider(providerId: string): Promise<void> {
  actionLoading.value = providerId
  try {
    const { error: updateError } = await supabase
      .from('providers_v2')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', providerId)

    if (updateError) throw updateError
    
    const provider = providers.value.find(p => p.id === providerId)
    if (provider?.user_id) {
      await supabase
        .from('users')
        .update({ role: 'provider', is_also_provider: true })
        .eq('id', provider.user_id)
    }

    await loadProviders()
    showDetailModal.value = false
  } catch (err: unknown) {
    console.error('Error approving provider:', err)
    alert('เกิดข้อผิดพลาด: ' + (err as Error).message)
  } finally {
    actionLoading.value = null
  }
}

function openRejectModal(providerId: string): void {
  rejectingProviderId.value = providerId
  rejectionReason.value = ''
  showRejectModal.value = true
}

async function confirmReject(): Promise<void> {
  if (!rejectingProviderId.value) return
  
  actionLoading.value = rejectingProviderId.value
  try {
    const { error: updateError } = await supabase
      .from('providers_v2')
      .update({ status: 'rejected', suspension_reason: rejectionReason.value || 'ไม่ผ่านการตรวจสอบ' })
      .eq('id', rejectingProviderId.value)

    if (updateError) throw updateError

    await loadProviders()
    showRejectModal.value = false
    showDetailModal.value = false
  } catch (err: unknown) {
    console.error('Error rejecting provider:', err)
    alert('เกิดข้อผิดพลาด: ' + (err as Error).message)
  } finally {
    actionLoading.value = null
    rejectingProviderId.value = null
  }
}

async function bulkApprove(): Promise<void> {
  if (selectedIds.value.size === 0) return
  if (!confirm(`ยืนยันอนุมัติ ${selectedIds.value.size} รายการ?`)) return

  actionLoading.value = 'bulk'
  try {
    const ids = Array.from(selectedIds.value)
    const { error: updateError } = await supabase
      .from('providers_v2')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .in('id', ids)

    if (updateError) throw updateError

    const providerUserIds = providers.value.filter(p => ids.includes(p.id)).map(p => p.user_id).filter(Boolean)
    if (providerUserIds.length > 0) {
      await supabase.from('users').update({ role: 'provider', is_also_provider: true }).in('id', providerUserIds)
    }

    selectedIds.value.clear()
    await loadProviders()
  } catch (err: unknown) {
    console.error('Error bulk approving:', err)
    alert('เกิดข้อผิดพลาด: ' + (err as Error).message)
  } finally {
    actionLoading.value = null
  }
}

async function bulkReject(): Promise<void> {
  if (selectedIds.value.size === 0) return
  const reason = prompt('ระบุเหตุผลในการปฏิเสธ:')
  if (reason === null) return

  actionLoading.value = 'bulk'
  try {
    const ids = Array.from(selectedIds.value)
    const { error: updateError } = await supabase
      .from('providers_v2')
      .update({ status: 'rejected', suspension_reason: reason || 'ไม่ผ่านการตรวจสอบ' })
      .in('id', ids)

    if (updateError) throw updateError

    selectedIds.value.clear()
    await loadProviders()
  } catch (err: unknown) {
    console.error('Error bulk rejecting:', err)
    alert('เกิดข้อผิดพลาด: ' + (err as Error).message)
  } finally {
    actionLoading.value = null
  }
}

function viewProviderDetails(provider: Provider): void {
  selectedProvider.value = provider
  showDetailModal.value = true
}

function getServiceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ride: 'รถรับส่ง', delivery: 'จัดส่งสินค้า', shopping: 'ช้อปปิ้ง',
    moving: 'ขนย้าย', laundry: 'ซักรีด',
  }
  return labels[type] || type
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

function getDocumentCount(docs: Record<string, unknown>): number {
  return Object.keys(docs || {}).length
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

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
      <p class="text-red-600">{{ error }}</p>
      <button type="button" @click="loadProviders" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">ลองใหม่</button>
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
              <p v-if="provider.vehicle_type"><span class="font-medium">ประเภทรถ:</span> {{ provider.vehicle_type }}</p>
              <p v-if="provider.vehicle_plate"><span class="font-medium">ทะเบียน:</span> {{ provider.vehicle_plate }}</p>
            </div>
            <div class="flex flex-wrap gap-2 mb-3">
              <span v-for="type in provider.service_types" :key="type" class="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">{{ getServiceTypeLabel(type) }}</span>
              <span v-if="provider.service_types.length === 0" class="text-sm text-gray-400">ยังไม่ได้เลือกบริการ</span>
            </div>
            <div class="flex items-center text-sm text-gray-600 mb-4">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>เอกสาร: {{ getDocumentCount(provider.documents) }} รายการ</span>
            </div>
            <div class="flex gap-3">
              <button type="button" @click="viewProviderDetails(provider)" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">ดูรายละเอียด</button>
              <button type="button" @click="approveProvider(provider.id)" :disabled="actionLoading === provider.id" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">{{ actionLoading === provider.id ? 'กำลังดำเนินการ...' : 'อนุมัติ' }}</button>
              <button type="button" @click="openRejectModal(provider.id)" :disabled="actionLoading === provider.id" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">ปฏิเสธ</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="showDetailModal && selectedProvider" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gray-900">รายละเอียดผู้ให้บริการ</h2>
            <button type="button" @click="showDetailModal = false" class="p-2 hover:bg-gray-100 rounded-lg" aria-label="ปิด">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="p-6 space-y-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">ข้อมูลส่วนตัว</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div><span class="text-gray-500">ชื่อ:</span> {{ selectedProvider.first_name }} {{ selectedProvider.last_name }}</div>
              <div><span class="text-gray-500">อีเมล:</span> {{ selectedProvider.email }}</div>
              <div><span class="text-gray-500">เบอร์โทร:</span> {{ selectedProvider.phone_number || 'ไม่ระบุ' }}</div>
              <div><span class="text-gray-500">บัตรประชาชน:</span> {{ selectedProvider.national_id || 'ไม่ระบุ' }}</div>
            </div>
          </div>
          <div v-if="selectedProvider.vehicle_type || selectedProvider.vehicle_plate">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">ข้อมูลยานพาหนะ</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div><span class="text-gray-500">ประเภท:</span> {{ selectedProvider.vehicle_type || 'ไม่ระบุ' }}</div>
              <div><span class="text-gray-500">ทะเบียน:</span> {{ selectedProvider.vehicle_plate || 'ไม่ระบุ' }}</div>
            </div>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">บริการที่ลงทะเบียน</h3>
            <div class="flex flex-wrap gap-2">
              <span v-for="type in selectedProvider.service_types" :key="type" class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">{{ getServiceTypeLabel(type) }}</span>
              <span v-if="selectedProvider.service_types.length === 0" class="text-gray-400">ยังไม่ได้เลือกบริการ</span>
            </div>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3">เอกสาร</h3>
            <div v-if="getDocumentCount(selectedProvider.documents) > 0" class="grid grid-cols-2 gap-4">
              <div v-for="(url, docType) in selectedProvider.documents" :key="String(docType)" class="border border-gray-200 rounded-lg p-3">
                <p class="text-sm font-medium text-gray-700 mb-2">{{ docType }}</p>
                <a :href="String(url)" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline text-sm">ดูเอกสาร</a>
              </div>
            </div>
            <p v-else class="text-gray-400">ไม่มีเอกสาร</p>
          </div>
        </div>
        <div class="p-6 border-t border-gray-200 flex gap-3">
          <button type="button" @click="approveProvider(selectedProvider.id)" :disabled="actionLoading === selectedProvider.id" class="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">{{ actionLoading === selectedProvider.id ? 'กำลังดำเนินการ...' : 'อนุมัติ' }}</button>
          <button type="button" @click="openRejectModal(selectedProvider.id)" :disabled="actionLoading === selectedProvider.id" class="flex-1 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">ปฏิเสธ</button>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">ปฏิเสธผู้ให้บริการ</h2>
          <label for="rejection-reason" class="sr-only">เหตุผลในการปฏิเสธ</label>
          <textarea id="rejection-reason" v-model="rejectionReason" placeholder="ระบุเหตุผลในการปฏิเสธ..." rows="4" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"></textarea>
        </div>
        <div class="p-6 border-t border-gray-200 flex gap-3">
          <button type="button" @click="showRejectModal = false" class="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200">ยกเลิก</button>
          <button type="button" @click="confirmReject" :disabled="actionLoading === rejectingProviderId" class="flex-1 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">{{ actionLoading === rejectingProviderId ? 'กำลังดำเนินการ...' : 'ยืนยันปฏิเสธ' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
