<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'

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
  documents_count: number
  pending_documents_count: number
}

const providers = ref<Provider[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

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

  // Filter by service type
  if (selectedServiceType.value !== 'all') {
    result = result.filter((p) =>
      p.service_types.includes(selectedServiceType.value)
    )
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (p) =>
        p.first_name.toLowerCase().includes(query) ||
        p.last_name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.phone_number.includes(query)
    )
  }

  // Sort
  result.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortBy.value === 'oldest' ? dateA - dateB : dateB - dateA
  })

  return result
})

const pendingCount = computed(() => providers.value.length)

onMounted(async () => {
  await loadProviders()
  setupRealtimeSubscription()
})

async function loadProviders(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    // Get providers with pending_verification status
    const { data: providersData, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .eq('status', 'pending_verification')
      .order('created_at', { ascending: true })

    if (providersError) throw providersError

    // Get document counts for each provider
    const providersWithCounts = await Promise.all(
      (providersData || []).map(async (provider) => {
        const { data: documents } = await supabase
          .from('provider_documents')
          .select('id, status')
          .eq('provider_id', provider.id)

        const documentsCount = documents?.length || 0
        const pendingDocumentsCount =
          documents?.filter((d) => d.status === 'pending').length || 0

        return {
          ...provider,
          documents_count: documentsCount,
          pending_documents_count: pendingDocumentsCount,
        }
      })
    )

    providers.value = providersWithCounts
  } catch (err: any) {
    console.error('Error loading providers:', err)
    error.value = err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
  } finally {
    loading.value = false
  }
}

function setupRealtimeSubscription(): void {
  // Subscribe to provider changes
  supabase
    .channel('verification-queue')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'providers',
        filter: 'status=eq.pending_verification',
      },
      () => {
        loadProviders()
      }
    )
    .subscribe()
}

function getServiceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ride: 'รถรับส่ง',
    delivery: 'จัดส่งสินค้า',
    shopping: 'ช้อปปิ้ง',
    moving: 'ขนย้าย',
    laundry: 'ซักรีด',
  }
  return labels[type] || type
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'วันนี้'
  } else if (diffDays === 1) {
    return 'เมื่อวาน'
  } else if (diffDays < 7) {
    return `${diffDays} วันที่แล้ว`
  } else {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
}

function viewProviderDetails(providerId: string): void {
  // Navigate to provider detail modal or page
  // This will be implemented in the next task
  console.log('View provider:', providerId)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">คิวตรวจสอบผู้ให้บริการ</h1>
      <p class="mt-2 text-gray-600">
        ตรวจสอบและอนุมัติผู้ให้บริการที่รอการยืนยัน
      </p>
    </div>

    <!-- Stats Card -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-blue-900">ผู้ให้บริการรอตรวจสอบ</p>
          <p class="text-3xl font-bold text-blue-600">{{ pendingCount }}</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Search -->
        <div>
          <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
            ค้นหา
          </label>
          <input
            id="search"
            v-model="searchQuery"
            type="text"
            placeholder="ชื่อ, อีเมล, เบอร์โทร..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <!-- Service Type Filter -->
        <div>
          <label for="service-type" class="block text-sm font-medium text-gray-700 mb-2">
            ประเภทบริการ
          </label>
          <select
            id="service-type"
            v-model="selectedServiceType"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option v-for="type in serviceTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>

        <!-- Sort -->
        <div>
          <label for="sort" class="block text-sm font-medium text-gray-700 mb-2">
            เรียงตาม
          </label>
          <select
            id="sort"
            v-model="sortBy"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="oldest">เก่าสุดก่อน</option>
            <option value="newest">ใหม่สุดก่อน</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p class="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
      <p class="text-red-600">{{ error }}</p>
      <button
        @click="loadProviders"
        class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        ลองใหม่
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredProviders.length === 0"
      class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center"
    >
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 class="mt-4 text-lg font-medium text-gray-900">ไม่มีผู้ให้บริการรอตรวจสอบ</h3>
      <p class="mt-2 text-gray-600">ยังไม่มีผู้ให้บริการที่รอการยืนยันในขณะนี้</p>
    </div>

    <!-- Providers List -->
    <div v-else class="space-y-4">
      <div
        v-for="provider in filteredProviders"
        :key="provider.id"
        class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        @click="viewProviderDetails(provider.id)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <!-- Provider Info -->
            <div class="flex items-center mb-2">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ provider.first_name }} {{ provider.last_name }}
              </h3>
              <span class="ml-3 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                รอตรวจสอบ
              </span>
            </div>

            <!-- Contact Info -->
            <div class="space-y-1 mb-3">
              <p class="text-sm text-gray-600">
                <span class="font-medium">อีเมล:</span> {{ provider.email }}
              </p>
              <p class="text-sm text-gray-600">
                <span class="font-medium">เบอร์โทร:</span> {{ provider.phone_number }}
              </p>
            </div>

            <!-- Service Types -->
            <div class="flex flex-wrap gap-2 mb-3">
              <span
                v-for="type in provider.service_types"
                :key="type"
                class="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
              >
                {{ getServiceTypeLabel(type) }}
              </span>
            </div>

            <!-- Documents Status -->
            <div class="flex items-center text-sm text-gray-600">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>
                เอกสาร: {{ provider.documents_count }} ฉบับ
                <span v-if="provider.pending_documents_count > 0" class="text-yellow-600 font-medium">
                  ({{ provider.pending_documents_count }} รอตรวจสอบ)
                </span>
              </span>
            </div>
          </div>

          <!-- Submission Date -->
          <div class="text-right ml-4">
            <p class="text-sm text-gray-500">ส่งเมื่อ</p>
            <p class="text-sm font-medium text-gray-900">{{ formatDate(provider.created_at) }}</p>
          </div>
        </div>

        <!-- Action Button -->
        <div class="mt-4 pt-4 border-t border-gray-200">
          <button
            @click.stop="viewProviderDetails(provider.id)"
            class="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            ตรวจสอบเอกสาร
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
