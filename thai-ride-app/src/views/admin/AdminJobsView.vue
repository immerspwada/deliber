<template>
  <div class="admin-jobs">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Job Management</h1>
      <p class="text-gray-600">จัดการงานในระบบ</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-2xl font-bold text-gray-900">{{ stats.total }}</div>
        <div class="text-sm text-gray-600">Total Jobs</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-2xl font-bold text-blue-600">{{ stats.pending }}</div>
        <div class="text-sm text-gray-600">Pending</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-2xl font-bold text-yellow-600">{{ stats.inProgress }}</div>
        <div class="text-sm text-gray-600">In Progress</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-2xl font-bold text-green-600">{{ stats.completed }}</div>
        <div class="text-sm text-gray-600">Completed</div>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div class="text-2xl font-bold text-red-600">{{ stats.cancelled }}</div>
        <div class="text-sm text-gray-600">Cancelled</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="ค้นหา Job ID, ที่อยู่"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <input
            v-model="filters.dateFrom"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="loadJobs"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>
    </div>

    <!-- Jobs Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Jobs ({{ filteredJobs.length }})</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Provider
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Earnings
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Evidence
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="job in filteredJobs" :key="job.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ job.job_uid || job.id.slice(0, 8) }}</div>
                <div class="text-sm text-gray-500">{{ formatDistance(job.distance_km) }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getServiceBadgeClass(job.service_type)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ job.service_type }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ job.customer_id?.slice(0, 8) || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ job.provider_id?.slice(0, 8) || 'Unassigned' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusBadgeClass(job.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ job.status }}
                </span>
                <div v-if="job.arrived_at" class="text-xs text-green-600 mt-1">
                  ✓ ถึงจุดรับ {{ formatTime(job.arrived_at) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>Est: ฿{{ job.estimated_earnings?.toLocaleString() || 0 }}</div>
                <div v-if="job.final_earnings">Final: ฿{{ job.final_earnings.toLocaleString() }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex gap-2">
                  <a v-if="job.pickup_photo" :href="job.pickup_photo" target="_blank" class="evidence-badge pickup" title="รูปจุดรับ">
                    📍 รับ
                  </a>
                  <a v-if="job.dropoff_photo" :href="job.dropoff_photo" target="_blank" class="evidence-badge dropoff" title="รูปจุดส่ง">
                    🏁 ส่ง
                  </a>
                  <span v-if="!job.pickup_photo && !job.dropoff_photo" class="text-gray-400 text-xs">-</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(job.created_at) }}
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

// Service type for badge styling
type ServiceType = 'ride' | 'delivery' | 'shopping' | 'moving' | 'laundry'

// Local type for jobs (table may not exist in generated types)
interface JobV2 {
  id: string
  job_uid: string | null
  service_type: string
  status: string
  customer_id: string
  provider_id: string | null
  pickup_address: string
  dropoff_address: string | null
  distance_km: number | null
  estimated_earnings: number | null
  final_earnings: number | null
  created_at: string | null
  arrived_at: string | null
  pickup_photo: string | null
  dropoff_photo: string | null
}

const jobs = ref<JobV2[]>([])
const loading = ref(false)

const stats = ref({
  total: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  cancelled: 0
})

const filters = ref({
  search: '',
  serviceType: '',
  status: '',
  dateFrom: ''
})

const filteredJobs = computed(() => {
  let filtered = jobs.value

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    filtered = filtered.filter(job => 
      job.job_uid?.toLowerCase().includes(search) ||
      job.id.toLowerCase().includes(search) ||
      job.pickup_address.toLowerCase().includes(search) ||
      job.dropoff_address?.toLowerCase().includes(search)
    )
  }

  if (filters.value.serviceType) {
    filtered = filtered.filter(job => job.service_type === filters.value.serviceType)
  }

  if (filters.value.status) {
    filtered = filtered.filter(job => job.status === filters.value.status)
  }

  if (filters.value.dateFrom) {
    filtered = filtered.filter(job => 
      job.created_at && job.created_at >= filters.value.dateFrom
    )
  }

  return filtered
})

const loadJobs = async () => {
  loading.value = true
  try {
    // Try jobs_v2 first, fallback to ride_requests
    let data: any[] = []
    let error: any = null
    
    try {
      const result = await (supabase as any)
        .from('jobs_v2')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)
      
      data = result.data || []
      error = result.error
    } catch {
      // Fallback to ride_requests if jobs_v2 doesn't exist
      const result = await supabase
        .from('ride_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)
      
      data = (result.data || []).map((r: any) => ({
        id: r.id,
        job_uid: r.tracking_id,
        service_type: 'ride',
        status: r.status,
        customer_id: r.user_id,
        provider_id: r.provider_id,
        pickup_address: r.pickup_address,
        dropoff_address: r.destination_address,
        distance_km: r.distance_km,
        estimated_earnings: r.estimated_fare,
        final_earnings: r.final_fare,
        created_at: r.created_at,
        arrived_at: r.arrived_at,
        pickup_photo: r.pickup_photo,
        dropoff_photo: r.dropoff_photo
      }))
      error = result.error
    }

    if (error) throw error
    jobs.value = data || []

    // Calculate stats
    stats.value = {
      total: jobs.value.length,
      pending: jobs.value.filter(j => j.status === 'pending').length,
      inProgress: jobs.value.filter(j => ['accepted', 'in_progress', 'started'].includes(j.status)).length,
      completed: jobs.value.filter(j => j.status === 'completed').length,
      cancelled: jobs.value.filter(j => j.status === 'cancelled').length
    }
  } catch (error) {
    console.error('Error loading jobs:', error)
  } finally {
    loading.value = false
  }
}

const getServiceBadgeClass = (serviceType: string) => {
  switch (serviceType as ServiceType) {
    case 'ride': return 'bg-blue-100 text-blue-800'
    case 'delivery': return 'bg-green-100 text-green-800'
    case 'shopping': return 'bg-yellow-100 text-yellow-800'
    case 'moving': return 'bg-purple-100 text-purple-800'
    case 'laundry': return 'bg-cyan-100 text-cyan-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'accepted': return 'bg-blue-100 text-blue-800'
    case 'in_progress': return 'bg-purple-100 text-purple-800'
    case 'completed': return 'bg-green-100 text-green-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('th-TH')
}

const formatTime = (dateString: string | null) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

const formatDistance = (distance: number | null) => {
  if (!distance) return 'N/A'
  return `${distance.toFixed(1)} km`
}

onMounted(() => {
  loadJobs()
})
</script>

<style scoped>
.evidence-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.evidence-badge.pickup {
  background: #FEF3C7;
  color: #92400E;
}

.evidence-badge.pickup:hover {
  background: #FDE68A;
}

.evidence-badge.dropoff {
  background: #D1FAE5;
  color: #065F46;
}

.evidence-badge.dropoff:hover {
  background: #A7F3D0;
}
</style>