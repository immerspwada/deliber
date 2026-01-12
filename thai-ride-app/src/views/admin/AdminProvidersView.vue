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
        <h2 class="text-lg font-semibold text-gray-900">Providers ({{ filteredProviders.length }})</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Services
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
                  </div>
                </div>
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
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusBadgeClass(provider.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ getStatusDisplayName(provider.status) }}
                </span>
                <div v-if="provider.is_online" class="flex items-center mt-1">
                  <div class="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                  <span class="text-xs text-gray-500">Online</span>
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
import { supabase } from '../../lib/supabase'
import { PROVIDER_STATUS_CONFIGS } from '../../types/role'
import type { ProviderV2, ProviderStatus } from '../../types/database'

const providers = ref<ProviderV2[]>([])
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
  const allProviders = providers.value
  let result = allProviders

  if (filters.value.search) {
    const searchTerm = filters.value.search.toLowerCase()
    result = result.filter((provider: any) => {
      return (provider.first_name?.toLowerCase() || '').includes(searchTerm) ||
             (provider.last_name?.toLowerCase() || '').includes(searchTerm) ||
             provider.email.toLowerCase().includes(searchTerm) ||
             (provider.phone_number || '').includes(searchTerm)
    })
  }

  if (filters.value.status) {
    result = result.filter((provider: any) => provider.status === filters.value.status)
  }

  if (filters.value.serviceType) {
    result = result.filter((provider: any) => 
      provider.service_types?.includes(filters.value.serviceType)
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

    if (error) throw error
    providers.value = data || []

    // Calculate stats
    stats.value = {
      total: providers.value.length,
      approved: providers.value.filter(p => p.status === 'approved').length,
      pending: providers.value.filter(p => p.status === 'pending').length,
      active: providers.value.filter(p => p.status === 'active').length
    }
  } catch (error) {
    console.error('Error loading providers:', error)
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

const approveProvider = async (provider: ProviderV2) => {
  try {
    const { error } = await supabase
      .from('providers_v2')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', provider.id)

    if (error) throw error
    await loadProviders()
  } catch (error) {
    console.error('Error approving provider:', error)
  }
}

const rejectProvider = async (provider: ProviderV2) => {
  try {
    const { error } = await supabase
      .from('providers_v2')
      .update({ status: 'rejected' })
      .eq('id', provider.id)

    if (error) throw error
    await loadProviders()
  } catch (error) {
    console.error('Error rejecting provider:', error)
  }
}

const suspendProvider = async (provider: ProviderV2) => {
  try {
    const { error } = await supabase
      .from('providers_v2')
      .update({ 
        status: 'suspended',
        suspended_at: new Date().toISOString()
      })
      .eq('id', provider.id)

    if (error) throw error
    await loadProviders()
  } catch (error) {
    console.error('Error suspending provider:', error)
  }
}

const viewProvider = (provider: ProviderV2) => {
  // TODO: Implement provider detail view
  console.log('View provider:', provider)
}

onMounted(() => {
  loadProviders()
})
</script>