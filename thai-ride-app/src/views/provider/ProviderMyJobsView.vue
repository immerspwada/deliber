<script setup lang="ts">
/**
 * Provider My Jobs View - งานของฉัน
 * แสดงงานที่ Provider รับแล้วและประวัติงาน
 */
import { ref, computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'

// Types
interface Job {
  id: string
  tracking_id?: string
  type: 'ride' | 'delivery' | 'shopping'
  service_type: string
  status: string
  pickup_address: string
  dropoff_address: string
  fare: number
  created_at: string
  customer_name?: string
  customer_phone?: string
}

// Router
const router = useRouter()

// State
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'active' | 'history'>('active')
const activeJobs = shallowRef<Job[]>([])
const historyJobs = shallowRef<Job[]>([])
const providerId = ref<string | null>(null)

// Realtime subscription
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

// Computed
const displayJobs = computed(() => 
  activeTab.value === 'active' ? activeJobs.value : historyJobs.value
)

// Active statuses (งานที่กำลังทำ)
const ACTIVE_STATUSES = ['matched', 'accepted', 'arriving', 'pickup', 'in_progress']
// History statuses (งานที่เสร็จแล้ว)
const HISTORY_STATUSES = ['completed', 'cancelled']

// Methods
async function loadData(): Promise<void> {
  loading.value = true
  error.value = null
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      error.value = 'กรุณาเข้าสู่ระบบ'
      return
    }

    // Get provider ID
    const { data: providerData, error: providerError } = await supabase
      .from('providers_v2')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle() as { data: { id: string } | null, error: Error | null }

    if (providerError) {
      console.error('[MyJobs] Provider error:', providerError)
      error.value = 'ไม่สามารถโหลดข้อมูลได้'
      return
    }

    if (!providerData?.id) {
      error.value = 'ไม่พบข้อมูลผู้ให้บริการ'
      return
    }

    const provId = providerData.id
    providerId.value = provId

    // Load jobs in parallel
    await Promise.all([
      loadActiveJobs(provId),
      loadHistoryJobs(provId)
    ])

    // Setup realtime subscription
    setupRealtimeSubscription(provId)

  } catch (err) {
    console.error('[MyJobs] Exception:', err)
    error.value = 'เกิดข้อผิดพลาด กรุณาลองใหม่'
  } finally {
    loading.value = false
  }
}

async function loadActiveJobs(provId: string): Promise<void> {
  const jobs: Job[] = []

  // Load active ride requests
  const { data: rides, error: ridesError } = await supabase
    .from('ride_requests')
    .select(`
      id, tracking_id, status, ride_type, pickup_address, destination_address,
      estimated_fare, final_fare, created_at,
      users:user_id(full_name, phone)
    `)
    .eq('provider_id', provId)
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })

  if (ridesError) {
    console.error('[MyJobs] Rides error:', ridesError)
  } else if (rides) {
    for (const ride of rides) {
      jobs.push(transformRideToJob(ride))
    }
  }

  // Load active delivery requests
  const { data: deliveries, error: deliveriesError } = await supabase
    .from('delivery_requests')
    .select(`
      id, status, package_type, sender_address, recipient_address,
      estimated_fee, final_fee, created_at,
      users:user_id(full_name, phone)
    `)
    .eq('provider_id', provId)
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })

  if (deliveriesError) {
    console.error('[MyJobs] Deliveries error:', deliveriesError)
  } else if (deliveries) {
    for (const delivery of deliveries) {
      jobs.push(transformDeliveryToJob(delivery))
    }
  }

  // Sort by created_at descending
  jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  activeJobs.value = jobs
}

async function loadHistoryJobs(provId: string): Promise<void> {
  const jobs: Job[] = []

  // Load completed/cancelled ride requests
  const { data: rides, error: ridesError } = await supabase
    .from('ride_requests')
    .select(`
      id, tracking_id, status, ride_type, pickup_address, destination_address,
      estimated_fare, final_fare, created_at
    `)
    .eq('provider_id', provId)
    .in('status', HISTORY_STATUSES)
    .order('created_at', { ascending: false })
    .limit(50)

  if (ridesError) {
    console.error('[MyJobs] History rides error:', ridesError)
  } else if (rides) {
    for (const ride of rides) {
      jobs.push(transformRideToJob(ride))
    }
  }

  // Load completed/cancelled delivery requests
  const { data: deliveries, error: deliveriesError } = await supabase
    .from('delivery_requests')
    .select(`
      id, status, package_type, sender_address, recipient_address,
      estimated_fee, final_fee, created_at
    `)
    .eq('provider_id', provId)
    .in('status', HISTORY_STATUSES)
    .order('created_at', { ascending: false })
    .limit(50)

  if (deliveriesError) {
    console.error('[MyJobs] History deliveries error:', deliveriesError)
  } else if (deliveries) {
    for (const delivery of deliveries) {
      jobs.push(transformDeliveryToJob(delivery))
    }
  }

  // Sort by created_at descending
  jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  historyJobs.value = jobs
}

function transformRideToJob(ride: Record<string, unknown>): Job {
  const user = ride.users as Record<string, unknown> | null
  return {
    id: ride.id as string,
    tracking_id: (ride.tracking_id as string) || (ride.id as string),
    type: 'ride',
    service_type: (ride.ride_type as string) || 'standard',
    status: ride.status as string,
    pickup_address: (ride.pickup_address as string) || '',
    dropoff_address: (ride.destination_address as string) || '',
    fare: Number(ride.final_fare || ride.estimated_fare) || 0,
    created_at: ride.created_at as string,
    customer_name: user?.full_name as string | undefined,
    customer_phone: user?.phone as string | undefined
  }
}

function transformDeliveryToJob(delivery: Record<string, unknown>): Job {
  const user = delivery.users as Record<string, unknown> | null
  return {
    id: delivery.id as string,
    type: 'delivery',
    service_type: (delivery.package_type as string) || 'small',
    status: delivery.status as string,
    pickup_address: (delivery.sender_address as string) || '',
    dropoff_address: (delivery.recipient_address as string) || '',
    fare: Number(delivery.final_fee || delivery.estimated_fee) || 0,
    created_at: delivery.created_at as string,
    customer_name: user?.full_name as string | undefined,
    customer_phone: user?.phone as string | undefined
  }
}

function setupRealtimeSubscription(provId: string): void {
  cleanupRealtimeSubscription()

  realtimeChannel = supabase
    .channel('provider-my-jobs')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ride_requests',
      filter: `provider_id=eq.${provId}`
    }, () => {
      // Reload when any change to provider's rides
      if (providerId.value) {
        loadActiveJobs(providerId.value)
        loadHistoryJobs(providerId.value)
      }
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'delivery_requests',
      filter: `provider_id=eq.${provId}`
    }, () => {
      if (providerId.value) {
        loadActiveJobs(providerId.value)
        loadHistoryJobs(providerId.value)
      }
    })
    .subscribe((status) => {
      console.log('[MyJobs] Realtime status:', status)
    })
}

function cleanupRealtimeSubscription(): void {
  if (realtimeChannel) {
    try {
      realtimeChannel.unsubscribe()
    } catch (err) {
      console.warn('[MyJobs] Cleanup error:', err)
    }
    realtimeChannel = null
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    matched: 'รับงานแล้ว',
    accepted: 'รับงานแล้ว',
    arriving: 'กำลังไปรับ',
    pickup: 'ถึงจุดรับแล้ว',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก'
  }
  return labels[status] || status
}

function getStatusClass(status: string): string {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'error'
  return 'active'
}

function getServiceTypeLabel(job: Job): string {
  if (job.type === 'ride') {
    const labels: Record<string, string> = { standard: 'เรียกรถ', premium: 'พรีเมียม', shared: 'แชร์รถ' }
    return labels[job.service_type] || 'เรียกรถ'
  }
  if (job.type === 'delivery') {
    const labels: Record<string, string> = { document: 'ส่งเอกสาร', small: 'ส่งพัสดุเล็ก', medium: 'ส่งพัสดุกลาง', large: 'ส่งพัสดุใหญ่' }
    return labels[job.service_type] || 'ส่งของ'
  }
  return 'ซื้อของ'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTrackingId(trackingId: string): string {
  if (!trackingId) return '-'
  // If it's RID-xxx format, show as-is
  if (trackingId.startsWith('RID-')) {
    return trackingId
  }
  // For UUID format, show shortened version
  return trackingId.slice(-8).toUpperCase()
}

function goToJobDetail(job: Job): void {
  // Navigate to job detail/tracking page
  if (ACTIVE_STATUSES.includes(job.status)) {
    router.push(`/provider/job/${job.id}`)
  }
}

function retryLoad(): void {
  error.value = null
  loadData()
}

// Lifecycle
onMounted(loadData)

onUnmounted(() => {
  cleanupRealtimeSubscription()
})
</script>

<template>
  <div class="my-jobs-page">
    <!-- Tabs -->
    <div class="tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'active' }"
        @click="activeTab = 'active'"
        type="button"
      >
        กำลังดำเนินการ
        <span v-if="activeJobs.length" class="tab-count">{{ activeJobs.length }}</span>
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'"
        type="button"
      >
        ประวัติ
      </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>เกิดข้อผิดพลาด</h3>
      <p>{{ error }}</p>
      <button class="retry-btn" @click="retryLoad" type="button">
        ลองใหม่
      </button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="center-state">
      <div class="loader"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="displayJobs.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg v-if="activeTab === 'active'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <h3>{{ activeTab === 'active' ? 'ไม่มีงานที่กำลังทำ' : 'ยังไม่มีประวัติงาน' }}</h3>
      <p>{{ activeTab === 'active' ? 'เปิดรับงานเพื่อเริ่มทำงาน' : 'ประวัติงานจะแสดงที่นี่' }}</p>
    </div>

    <!-- Jobs List -->
    <div v-else class="jobs-list" role="list">
      <article 
        v-for="job in displayJobs" 
        :key="job.id" 
        class="job-item"
        :class="{ clickable: activeTab === 'active' }"
        @click="goToJobDetail(job)"
        role="listitem"
      >
        <div class="job-top">
          <div class="job-info">
            <span class="job-type">
              <span v-if="job.type === 'ride'" aria-hidden="true">🚗</span>
              <span v-else-if="job.type === 'delivery'" aria-hidden="true">📦</span>
              <span v-else aria-hidden="true">🛒</span>
              {{ getServiceTypeLabel(job) }}
              <span v-if="job.tracking_id" class="tracking-badge" :title="job.tracking_id">
                #{{ formatTrackingId(job.tracking_id) }}
              </span>
            </span>
            <span class="job-date">{{ formatDate(job.created_at) }}</span>
          </div>
          <span class="job-status" :class="getStatusClass(job.status)">
            {{ getStatusLabel(job.status) }}
          </span>
        </div>

        <!-- Customer Info (for active jobs) -->
        <div v-if="activeTab === 'active' && job.customer_name" class="customer-info">
          <span class="customer-name">👤 {{ job.customer_name }}</span>
          <a 
            v-if="job.customer_phone" 
            :href="`tel:${job.customer_phone}`" 
            class="customer-phone"
            @click.stop
          >
            📞 โทร
          </a>
        </div>
        
        <div class="job-route">
          <div class="route-item">
            <span class="route-dot green" aria-hidden="true"></span>
            <span class="route-text">{{ job.pickup_address }}</span>
          </div>
          <div class="route-item">
            <span class="route-dot red" aria-hidden="true"></span>
            <span class="route-text">{{ job.dropoff_address }}</span>
          </div>
        </div>

        <div class="job-bottom">
          <span class="job-price">฿{{ job.fare.toLocaleString() }}</span>
          <svg v-if="activeTab === 'active'" class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.my-jobs-page {
  min-height: calc(100vh - 130px);
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
}

.tab.active {
  background: #f3f4f6;
  color: #111;
  font-weight: 600;
}

.tab-count {
  padding: 2px 8px;
  background: #10b981;
  color: #fff;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

/* States */
.center-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.loader {
  width: 28px;
  height: 28px;
  border: 2px solid #f3f4f6;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 20px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin: 0 0 8px 0;
}

.error-state p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px 0;
}

.retry-btn {
  padding: 12px 32px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
}

.retry-btn:active {
  background: #1f2937;
  transform: scale(0.98);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-state h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0 0 6px 0;
}

.empty-state p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Jobs List */
.jobs-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-item {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}

.job-item.clickable {
  cursor: pointer;
}

.job-item.clickable:active {
  transform: scale(0.99);
  background: #fafafa;
}

.job-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.job-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.job-type {
  font-size: 14px;
  font-weight: 600;
  color: #111;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.tracking-badge {
  padding: 2px 6px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  letter-spacing: 0.3px;
}

.job-date {
  font-size: 12px;
  color: #9ca3af;
}

.job-status {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.job-status.active {
  background: #dbeafe;
  color: #1d4ed8;
}

.job-status.success {
  background: #dcfce7;
  color: #15803d;
}

.job-status.error {
  background: #fee2e2;
  color: #b91c1c;
}

/* Customer Info */
.customer-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 12px;
}

.customer-name {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.customer-phone {
  font-size: 13px;
  color: #10b981;
  font-weight: 600;
  text-decoration: none;
  padding: 6px 12px;
  background: #ecfdf5;
  border-radius: 6px;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.customer-phone:active {
  background: #d1fae5;
}

.job-route {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid #f5f5f5;
  border-bottom: 1px solid #f5f5f5;
}

.route-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.route-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.route-dot.green { background: #10b981; }
.route-dot.red { background: #ef4444; }

.route-text {
  font-size: 13px;
  color: #4b5563;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.job-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.job-price {
  font-size: 18px;
  font-weight: 700;
  color: #10b981;
}

.arrow {
  width: 20px;
  height: 20px;
  color: #d1d5db;
}
</style>
