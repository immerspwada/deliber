<template>
  <div class="admin-providers">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Provider Management</h1>
      <p class="text-gray-600">จัดการผู้ให้บริการในระบบ</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-2xl font-bold text-gray-900">{{ stats.total }}</div>
        <div class="text-sm text-gray-600">Total Providers</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-2xl font-bold text-green-600">{{ stats.approved }}</div>
        <div class="text-sm text-gray-600">Approved</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-2xl font-bold text-yellow-600">{{ stats.pending }}</div>
        <div class="text-sm text-gray-600">Pending</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-2xl font-bold text-blue-600">{{ stats.active }}</div>
        <div class="text-sm text-gray-600">Active</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
          <select
            v-model="filters.serviceType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Services</option>
            <option value="ride">Ride</option>
            <option value="delivery">Delivery</option>
            <option value="shopping">Shopping</option>
            <option value="moving">Moving</option>
            <option value="laundry">Laundry</option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            @click="loadProviders"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </div>

    <!-- Providers Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">
          Providers 
          <span v-if="!loading">({{ filteredProviders.length }})</span>
          <span v-if="loading" class="text-sm text-gray-500">กำลังโหลด...</span>
        </h2>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">กำลังโหลดข้อมูลผู้ให้บริการ...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!filteredProviders.length" class="p-8 text-center">
        <p class="text-gray-600">ไม่พบข้อมูลผู้ให้บริการ</p>
      </div>
      
      <!-- Data Table -->
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Services
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documents
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stats
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="provider in filteredProviders" :key="provider.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span class="text-sm font-medium text-gray-700">
                        {{ provider.first_name?.charAt(0) }}{{ provider.last_name?.charAt(0) }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ provider.first_name }} {{ provider.last_name }}
                    </div>
                    <div class="text-sm text-gray-500">{{ provider.email }}</div>
                    <div class="text-sm text-gray-500">{{ provider.phone_number }}</div>
                    <div v-if="provider.national_id" class="text-xs text-gray-400">
                      ID: {{ maskNationalId(provider.national_id) }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="provider.vehicle_type" class="text-sm">
                  <div class="font-medium text-gray-900">{{ getVehicleTypeName(provider.vehicle_type) }}</div>
                  <div class="text-gray-500">{{ provider.vehicle_plate }}</div>
                  <div v-if="provider.vehicle_color" class="text-xs text-gray-400">
                    สี: {{ getColorName(provider.vehicle_color) }}
                  </div>
                  <div v-if="provider.vehicle_info?.brand" class="text-xs text-gray-400">
                    {{ provider.vehicle_info.brand }} {{ provider.vehicle_info.model }}
                  </div>
                </div>
                <span v-else class="text-gray-400 text-sm">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="service in provider.service_types"
                    :key="service"
                    class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {{ service }}
                  </span>
                  <span v-if="!provider.service_types?.length" class="text-gray-400 text-xs">
                    รอกำหนด
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="provider.documents" class="flex flex-col gap-1">
                  <a 
                    v-if="provider.documents.id_card && provider.documents.id_card !== 'pending'" 
                    :href="provider.documents.id_card" 
                    target="_blank"
                    class="text-xs text-blue-600 hover:underline"
                  >
                    📄 บัตรประชาชน
                  </a>
                  <span v-else-if="provider.documents.id_card === 'pending'" class="text-xs text-yellow-600">
                    ⏳ รอบัตรประชาชน
                  </span>
                  <a 
                    v-if="provider.documents.license && provider.documents.license !== 'pending'" 
                    :href="provider.documents.license" 
                    target="_blank"
                    class="text-xs text-blue-600 hover:underline"
                  >
                    📄 ใบขับขี่
                  </a>
                  <span v-else-if="provider.documents.license === 'pending'" class="text-xs text-yellow-600">
                    ⏳ รอใบขับขี่
                  </span>
                  <a 
                    v-if="provider.documents.vehicle && provider.documents.vehicle !== 'pending'" 
                    :href="provider.documents.vehicle" 
                    target="_blank"
                    class="text-xs text-blue-600 hover:underline"
                  >
                    📄 รูปรถ
                  </a>
                  <span v-else-if="provider.documents.vehicle === 'pending'" class="text-xs text-yellow-600">
                    ⏳ รอรูปรถ
                  </span>
                </div>
                <span v-else class="text-gray-400 text-sm">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusBadgeClass(provider.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ getStatusDisplayName(provider.status) }}
                </span>
                <div v-if="provider.is_online" class="flex items-center mt-1">
                  <div class="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                  <span class="text-xs text-gray-500">Online</span>
                </div>
                <div v-if="provider.is_available" class="flex items-center mt-1">
                  <div class="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                  <span class="text-xs text-gray-500">Available</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>Rating: {{ provider.rating?.toFixed(1) || 'N/A' }}</div>
                <div>Trips: {{ provider.total_trips || 0 }}</div>
                <div>Earnings: ฿{{ provider.total_earnings?.toLocaleString() || 0 }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    v-if="provider.status === 'pending'"
                    @click="approveProvider(provider)"
                    class="text-green-600 hover:text-green-900"
                  >
                    Approve
                  </button>
                  <button
                    v-if="provider.status === 'pending'"
                    @click="rejectProvider(provider)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Reject
                  </button>
                  <button
                    v-if="provider.status === 'active'"
                    @click="suspendProvider(provider)"
                    class="text-yellow-600 hover:text-yellow-900"
                  >
                    Suspend
                  </button>
                  <button
                    @click="viewProvider(provider)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    View
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminAPI } from '../../admin/composables/useAdminAPI'
import { useAuthStore } from '../../stores/auth'
import { PROVIDER_STATUS_CONFIGS } from '../../types/role'
import type { ProviderV2, ProviderStatus } from '../../types/database'

const { 
  getProvidersV2Enhanced, 
  getProvidersV2Analytics,
  approveProviderV2Enhanced,
  rejectProviderV2Enhanced,
  suspendProviderV2Enhanced,
  isLoading 
} = useAdminAPI()

const authStore = useAuthStore()

const providers = ref<any[]>([])
const loading = ref(false)

const stats = ref({
  total: 0,
  approved: 0,
  pending: 0,
  active: 0
})

const filters = ref({
  search: '',
  status: '',
  serviceType: ''
})

const filteredProviders = computed(() => {
  // Since we're using RPC with server-side filtering, return all providers
  // The filtering is already done on the server side
  return providers.value
})

const loadProviders = async () => {
  loading.value = true
  try {
    console.log('[AdminProvidersView] Loading providers with filters:', filters.value)

    // Use enhanced RPC function for better performance and features
    const result = await getProvidersV2Enhanced(
      {
        status: filters.value.status || undefined,
        serviceType: filters.value.serviceType || undefined,
        search: filters.value.search || undefined
      },
      { page: 1, limit: 100 }, // Load more for better UX
      { sortBy: 'created_at', sortOrder: 'desc' }
    )

    providers.value = result.data || []
    console.log('[AdminProvidersView] Loaded providers:', providers.value.length)

    // Load analytics for stats
    try {
      const analyticsData = await getProvidersV2Analytics()
      
      if (analyticsData?.overview) {
        const overview = analyticsData.overview
        stats.value = {
          total: overview.total_providers || 0,
          approved: overview.approved_providers || 0,
          pending: overview.pending_providers || 0,
          active: overview.active_providers || 0
        }
        console.log('[AdminProvidersView] Loaded stats:', stats.value)
      } else {
        // Fallback to calculated stats
        stats.value = {
          total: providers.value.length,
          approved: providers.value.filter(p => p.status === 'approved').length,
          pending: providers.value.filter(p => p.status === 'pending').length,
          active: providers.value.filter(p => p.status === 'active').length
        }
      }
    } catch (analyticsError) {
      console.warn('[AdminProvidersView] Failed to load analytics, using fallback:', analyticsError)
      // Fallback to calculated stats
      stats.value = {
        total: providers.value.length,
        approved: providers.value.filter(p => p.status === 'approved').length,
        pending: providers.value.filter(p => p.status === 'pending').length,
        active: providers.value.filter(p => p.status === 'active').length
      }
    }
  } catch (error) {
    console.error('[AdminProvidersView] Error loading providers:', error)
    // Show user-friendly error message in Thai
    alert('ไม่สามารถโหลดข้อมูลผู้ให้บริการได้ กรุณาลองใหม่อีกครั้ง')
    
    // Reset to empty state
    providers.value = []
    stats.value = {
      total: 0,
      approved: 0,
      pending: 0,
      active: 0
    }
  } finally {
    loading.value = false
  }
}

const getStatusDisplayName = (status: string) => {
  return PROVIDER_STATUS_CONFIGS[status as ProviderStatus]?.displayNameTh || status
}

const getStatusBadgeClass = (status: string) => {
  switch (status as ProviderStatus) {
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'approved': return 'bg-green-100 text-green-800'
    case 'active': return 'bg-blue-100 text-blue-800'
    case 'suspended': return 'bg-red-100 text-red-800'
    case 'rejected': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const approveProvider = async (provider: any) => {
  try {
    console.log('[AdminProvidersView] Approving provider:', provider.id)
    
    const result = await approveProviderV2Enhanced(
      provider.id,
      authStore.user?.id, // Use current admin user ID
      provider.service_types?.length ? provider.service_types : ['ride'],
      'Approved via admin panel'
    )

    if (result.success) {
      console.log('[AdminProvidersView] Provider approved successfully')
      // Show success message in Thai
      alert('อนุมัติผู้ให้บริการเรียบร้อยแล้ว')
      await loadProviders()
    } else {
      console.error('[AdminProvidersView] Approval failed:', result.error)
      alert('ไม่สามารถอนุมัติผู้ให้บริการได้: ' + (result.error || 'เกิดข้อผิดพลาด'))
    }
  } catch (error) {
    console.error('[AdminProvidersView] Error approving provider:', error)
    alert('เกิดข้อผิดพลาดในการอนุมัติผู้ให้บริการ')
  }
}

const rejectProvider = async (provider: any) => {
  const reason = prompt('กรุณาระบุเหตุผลในการปฏิเสธ:')
  if (!reason) return

  try {
    console.log('[AdminProvidersView] Rejecting provider:', provider.id, 'reason:', reason)
    
    const result = await rejectProviderV2Enhanced(
      provider.id,
      authStore.user?.id, // Use current admin user ID
      reason
    )

    if (result.success) {
      console.log('[AdminProvidersView] Provider rejected successfully')
      alert('ปฏิเสธผู้ให้บริการเรียบร้อยแล้ว')
      await loadProviders()
    } else {
      console.error('[AdminProvidersView] Rejection failed:', result.error)
      alert('ไม่สามารถปฏิเสธผู้ให้บริการได้: ' + (result.error || 'เกิดข้อผิดพลาด'))
    }
  } catch (error) {
    console.error('[AdminProvidersView] Error rejecting provider:', error)
    alert('เกิดข้อผิดพลาดในการปฏิเสธผู้ให้บริการ')
  }
}

const suspendProvider = async (provider: any) => {
  const reason = prompt('กรุณาระบุเหตุผลในการระงับ:')
  if (!reason) return

  try {
    console.log('[AdminProvidersView] Suspending provider:', provider.id, 'reason:', reason)
    
    const result = await suspendProviderV2Enhanced(
      provider.id,
      authStore.user?.id, // Use current admin user ID
      reason
    )

    if (result.success) {
      console.log('[AdminProvidersView] Provider suspended successfully')
      alert('ระงับผู้ให้บริการเรียบร้อยแล้ว')
      await loadProviders()
    } else {
      console.error('[AdminProvidersView] Suspension failed:', result.error)
      alert('ไม่สามารถระงับผู้ให้บริการได้: ' + (result.error || 'เกิดข้อผิดพลาด'))
    }
  } catch (error) {
    console.error('[AdminProvidersView] Error suspending provider:', error)
    alert('เกิดข้อผิดพลาดในการระงับผู้ให้บริการ')
  }
}

const viewProvider = (provider: any) => {
  // TODO: Implement provider detail view
  console.log('[AdminProvidersView] View provider:', provider)
}

// Helper functions for display
const maskNationalId = (id: string) => {
  if (!id || id.length < 4) return id
  return id.slice(0, 2) + '***' + id.slice(-2)
}

const getVehicleTypeName = (type: string) => {
  const types: Record<string, string> = {
    motorcycle: 'มอเตอร์ไซค์',
    car: 'รถยนต์',
    suv: 'รถ SUV',
    van: 'รถตู้',
    pickup: 'รถกระบะ',
    bicycle: 'จักรยาน'
  }
  return types[type] || type
}

const getColorName = (color: string) => {
  const colors: Record<string, string> = {
    black: 'ดำ',
    white: 'ขาว',
    silver: 'เงิน',
    red: 'แดง',
    blue: 'น้ำเงิน',
    green: 'เขียว',
    other: 'อื่นๆ'
  }
  return colors[color] || color
}

onMounted(() => {
  console.log('[AdminProvidersView] Component mounted, current user:', authStore.user?.id)
  console.log('[AdminProvidersView] Auth store state:', { 
    isAuthenticated: !!authStore.user, 
    role: authStore.user?.role 
  })
  loadProviders()
})
</script>