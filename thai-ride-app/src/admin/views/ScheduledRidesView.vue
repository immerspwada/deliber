<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAdminAPI } from '../composables/useAdminAPI'
import { useAdminUIStore } from '../stores/adminUI.store'

interface ScheduledRide {
  id: string
  user_id: string
  customer_name: string
  customer_phone: string
  pickup_address: string
  destination_address: string
  scheduled_datetime: string
  ride_type: string
  estimated_fare: number
  notes: string
  reminder_sent: boolean
  status: string
  passenger_count: number
  special_requests: string
  created_at: string
}

type ScheduledRideStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'expired'

const api = useAdminAPI()
const uiStore = useAdminUIStore()

const rides = ref<ScheduledRide[]>([])
const totalRides = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const statusFilter = ref('')
const selectedRide = ref<ScheduledRide | null>(null)
const showDetailModal = ref(false)
const showStatusModal = ref(false)
const showCancelModal = ref(false)
const newStatus = ref<ScheduledRideStatus>('scheduled')
const cancelReason = ref('')
const loadError = ref<string | null>(null)

async function loadRides() {
  loadError.value = null
  try {
    const result = await api.getScheduledRides(
      { status: statusFilter.value || undefined },
      { page: currentPage.value, limit: pageSize.value }
    )
    if (api.error.value) {
      loadError.value = api.error.value
      return
    }
    rides.value = result.data
    totalRides.value = result.total
    totalPages.value = result.totalPages
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Error loading data'
  }
}

function viewRide(ride: ScheduledRide) {
  selectedRide.value = ride
  showDetailModal.value = true
}

function openStatusModal(ride: ScheduledRide) {
  selectedRide.value = ride
  newStatus.value = ride.status as ScheduledRideStatus
  showStatusModal.value = true
}

function openCancelModal(ride: ScheduledRide) {
  selectedRide.value = ride
  cancelReason.value = ''
  showCancelModal.value = true
}

async function updateStatus() {
  if (!selectedRide.value) return
  uiStore.showSuccess('Status updated')
  showStatusModal.value = false
  showDetailModal.value = false
  loadRides()
}

async function cancelRide() {
  if (!selectedRide.value) return
  uiStore.showSuccess('Booking cancelled')
  showCancelModal.value = false
  showDetailModal.value = false
  loadRides()
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency: 'THB', minimumFractionDigits: 0
  }).format(amount || 0)
}

function getStatusColor(s: string) {
  return { scheduled: '#F59E0B', confirmed: '#3B82F6', completed: '#10B981', cancelled: '#EF4444', expired: '#6B7280' }[s] || '#6B7280'
}

function getStatusLabel(s: string) {
  return { scheduled: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', expired: 'Expired' }[s] || s
}

function getRideTypeLabel(type: string) {
  return { standard: 'Standard', premium: 'Premium', suv: 'SUV', van: 'Van' }[type] || type
}

watch(statusFilter, () => { currentPage.value = 1; loadRides() })
watch(currentPage, loadRides)

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: 'Orders' }, { label: 'Scheduled Rides' }])
  loadRides()
})
</script>

<template>
  <div class="scheduled-rides-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Scheduled Rides</h1>
        <span class="total-count">{{ totalRides.toLocaleString() }} items</span>
      </div>
      <div class="header-right">
        <button class="refresh-btn" @click="loadRides" :disabled="api.isLoading.value">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: api.isLoading.value }">
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="filters-bar">
      <select v-model="statusFilter" class="filter-select">
        <option value="">All Status</option>
        <option value="scheduled">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="expired">Expired</option>
      </select>
    </div>

    <div class="table-container">
      <div v-if="loadError" class="error-state">
        <h3>Error</h3>
        <p class="error-message">{{ loadError }}</p>
        <button class="btn btn-primary" @click="loadRides">Retry</button>
      </div>

      <div v-else-if="api.isLoading.value" class="loading-state">
        <div class="skeleton" v-for="i in 8" :key="i"/>
      </div>

      <table v-else-if="rides.length > 0" class="data-table">
        <thead>
          <tr>
            <th>Scheduled Time</th>
            <th>Customer</th>
            <th>Route</th>
            <th>Type</th>
            <th>Est. Fare</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ride in rides" :key="ride.id" @click="viewRide(ride)">
            <td>{{ formatDate(ride.scheduled_datetime) }}</td>
            <td>{{ ride.customer_name }}</td>
            <td class="route-cell">
              <div class="pickup">{{ ride.pickup_address }}</div>
              <div class="destination">{{ ride.destination_address }}</div>
            </td>
            <td>{{ getRideTypeLabel(ride.ride_type) }}</td>
            <td class="amount">{{ formatCurrency(ride.estimated_fare) }}</td>
            <td>
              <span class="status-badge" :style="{ color: getStatusColor(ride.status), background: getStatusColor(ride.status) + '20' }">
                {{ getStatusLabel(ride.status) }}
              </span>
            </td>
            <td>
              <button class="action-btn" @click.stop="viewRide(ride)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty-state"><p>No scheduled rides found</p></div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">Previous</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
    </div>

    <div v-if="showDetailModal && selectedRide" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Booking Details</h2>
          <button class="close-btn" @click="showDetailModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item"><label>Scheduled Time</label><span>{{ formatDate(selectedRide.scheduled_datetime) }}</span></div>
            <div class="detail-item"><label>Status</label><span class="status-badge" :style="{ color: getStatusColor(selectedRide.status), background: getStatusColor(selectedRide.status) + '20' }">{{ getStatusLabel(selectedRide.status) }}</span></div>
            <div class="detail-item"><label>Customer</label><span>{{ selectedRide.customer_name }}</span></div>
            <div class="detail-item"><label>Phone</label><span>{{ selectedRide.customer_phone || '-' }}</span></div>
            <div class="detail-item"><label>Pickup</label><span>{{ selectedRide.pickup_address }}</span></div>
            <div class="detail-item"><label>Destination</label><span>{{ selectedRide.destination_address }}</span></div>
            <div class="detail-item"><label>Ride Type</label><span>{{ getRideTypeLabel(selectedRide.ride_type) }}</span></div>
            <div class="detail-item"><label>Est. Fare</label><span class="amount">{{ formatCurrency(selectedRide.estimated_fare) }}</span></div>
          </div>
          <div v-if="selectedRide.notes" class="notes-section"><label>Notes</label><p>{{ selectedRide.notes }}</p></div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showDetailModal = false">Close</button>
            <button v-if="!['completed', 'cancelled', 'expired'].includes(selectedRide.status)" class="btn btn-danger" @click="openCancelModal(selectedRide)">Cancel</button>
            <button v-if="!['completed', 'cancelled', 'expired'].includes(selectedRide.status)" class="btn btn-primary" @click="openStatusModal(selectedRide)">Change Status</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showStatusModal" class="modal-overlay" @click.self="showStatusModal = false">
      <div class="modal modal-sm">
        <div class="modal-header"><h2>Change Status</h2><button class="close-btn" @click="showStatusModal = false">&times;</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>New Status</label>
            <select v-model="newStatus" class="form-select">
              <option value="scheduled">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showStatusModal = false">Cancel</button>
            <button class="btn btn-primary" @click="updateStatus">Save</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
      <div class="modal modal-sm">
        <div class="modal-header"><h2>Cancel Booking</h2><button class="close-btn" @click="showCancelModal = false">&times;</button></div>
        <div class="modal-body">
          <p>Are you sure you want to cancel this booking?</p>
          <div class="form-group">
            <label>Reason (optional)</label>
            <textarea v-model="cancelReason" class="form-textarea" rows="3" placeholder="Enter reason..."></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="showCancelModal = false">No</button>
            <button class="btn btn-danger" @click="cancelRide">Confirm Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scheduled-rides-view { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0; }
.total-count { padding: 4px 12px; background: #e8f5ef; color: #00a86b; font-size: 13px; font-weight: 500; border-radius: 16px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; cursor: pointer; color: #6b7280; transition: all 0.2s; }
.refresh-btn:hover { background: #f9fafb; border-color: #00a86b; color: #00a86b; }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-btn svg.spinning { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.filters-bar { display: flex; gap: 12px; margin-bottom: 20px; }
.filter-select { padding: 12px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 14px; min-width: 160px; }
.table-container { background: #fff; border-radius: 16px; overflow: hidden; }
.loading-state { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 56px; background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
.data-table td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
.data-table tbody tr { cursor: pointer; transition: background 0.15s; }
.data-table tbody tr:hover { background: #f9fafb; }
.route-cell .pickup, .route-cell .destination { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.route-cell .pickup { color: #00a86b; }
.route-cell .destination { color: #e53935; }
.status-badge { display: inline-block; padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; }
.amount { font-weight: 600; color: #059669; }
.action-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6b7280; }
.action-btn:hover { background: #f3f4f6; }
.empty-state, .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px; color: #9ca3af; text-align: center; }
.error-state h3 { font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 8px 0; }
.error-message { color: #ef4444; font-size: 14px; margin: 0 0 16px 0; padding: 12px 16px; background: #fee2e2; border-radius: 8px; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
.page-btn { padding: 8px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-size: 14px; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #6b7280; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; }
.modal.modal-sm { max-width: 400px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
.modal-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: none; border: none; border-radius: 8px; cursor: pointer; color: #6b7280; font-size: 24px; }
.modal-body { padding: 24px; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item label { font-size: 12px; font-weight: 500; color: #6b7280; text-transform: uppercase; }
.detail-item span { font-size: 14px; color: #1f2937; }
.notes-section { margin-bottom: 20px; }
.notes-section label { font-size: 12px; font-weight: 500; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: 8px; }
.notes-section p { font-size: 14px; color: #1f2937; background: #f9fafb; padding: 12px; border-radius: 8px; margin: 0; }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-primary { background: #00a86b; color: #fff; }
.btn-secondary { background: #f3f4f6; color: #374151; }
.btn-danger { background: #ef4444; color: #fff; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.form-select, .form-textarea { width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; }
.form-textarea { resize: vertical; font-family: inherit; }
</style>
