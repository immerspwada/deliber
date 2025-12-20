<script setup lang="ts">
/**
 * ProviderJobsView - หน้าแสดงงานที่รับได้ตาม provider_type
 * MUNEEF Style: สีเขียว #00A86B
 * แสดงเฉพาะงานที่ตรงกับ provider_type (rider, driver, etc.)
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { supabase } from '../../lib/supabase'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const providerInfo = ref<any>(null)
const availableJobs = ref<any[]>([])
const activeJob = ref<any>(null)

// Realtime subscription
let jobsSubscription: any = null

// Provider type labels
const providerTypeLabels: Record<string, string> = {
  rider: 'ไรเดอร์ส่งของ',
  driver: 'คนขับรถ',
  shopper: 'ช้อปเปอร์',
  mover: 'ขนย้าย',
  laundry: 'ซักผ้า',
  queue: 'บริการคิว'
}

// Job type mapping
const jobTypeMapping: Record<string, { table: string; label: string; icon: string }> = {
  rider: { table: 'delivery_requests', label: 'งานส่งของ', icon: '📦' },
  driver: { table: 'ride_requests', label: 'งานรับส่ง', icon: '🚗' },
  shopper: { table: 'shopping_requests', label: 'งานช้อปปิ้ง', icon: '🛒' },
  mover: { table: 'moving_requests', label: 'งานขนย้าย', icon: '📦' },
  laundry: { table: 'laundry_requests', label: 'งานซักผ้า', icon: '👕' },
  queue: { table: 'queue_bookings', label: 'งานคิว', icon: '🎫' }
}

const providerTypeLabel = computed(() => {
  if (!providerInfo.value?.provider_type) return ''
  return providerTypeLabels[providerInfo.value.provider_type] || providerInfo.value.provider_type
})

const jobConfig = computed(() => {
  if (!providerInfo.value?.provider_type) return null
  return jobTypeMapping[providerInfo.value.provider_type]
})

// Fetch provider info
const fetchProviderInfo = async () => {
  if (!authStore.user?.id) return
  
  const { data, error } = await supabase
    .from('service_providers')
    .select('*')
    .eq('user_id', authStore.user.id)
    .eq('status', 'approved')
    .single()
  
  if (error) {
    console.error('Error fetching provider:', error)
    return
  }
  
  providerInfo.value = data
}

// Fetch available jobs based on provider type
const fetchAvailableJobs = async () => {
  if (!providerInfo.value || !jobConfig.value) return
  
  loading.value = true
  
  try {
    const { data, error } = await supabase
      .from(jobConfig.value.table)
      .select('*, users!inner(name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) throw error
    
    availableJobs.value = data || []
  } catch (err) {
    console.error('Error fetching jobs:', err)
  } finally {
    loading.value = false
  }
}

// Fetch active job
const fetchActiveJob = async () => {
  if (!providerInfo.value || !jobConfig.value) return
  
  const { data } = await supabase
    .from(jobConfig.value.table)
    .select('*, users!inner(name, phone)')
    .eq('provider_id', providerInfo.value.id)
    .in('status', ['matched', 'in_progress', 'picked_up'])
    .single()
  
  if (data) {
    activeJob.value = data
  }
}

// Accept job
const acceptJob = async (job: any) => {
  if (!providerInfo.value || !jobConfig.value) return
  
  const confirmed = confirm(`ยืนยันรับงาน?`)
  if (!confirmed) return
  
  loading.value = true
  
  try {
    const { error } = await supabase
      .from(jobConfig.value.table)
      .update({
        provider_id: providerInfo.value.id,
        status: 'matched',
        matched_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .eq('status', 'pending') // Ensure still pending
    
    if (error) throw error
    
    // Refresh
    await fetchAvailableJobs()
    await fetchActiveJob()
  } catch (err: any) {
    alert('ไม่สามารถรับงานได้: ' + err.message)
  } finally {
    loading.value = false
  }
}

// View job detail
const viewJobDetail = (job: any) => {
  // Navigate to appropriate tracking view based on job type
  const routes: Record<string, string> = {
    rider: '/delivery/tracking',
    driver: '/ride/tracking',
    shopper: '/shopping/tracking',
    mover: '/moving/tracking',
    laundry: '/laundry/tracking',
    queue: '/queue/tracking'
  }
  
  const route = routes[providerInfo.value?.provider_type]
  if (route) {
    router.push(`${route}/${job.id}`)
  }
}

// Setup realtime subscription
const setupRealtimeSubscription = () => {
  if (!jobConfig.value) return
  
  jobsSubscription = supabase
    .channel(`${jobConfig.value.table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: jobConfig.value.table,
        filter: `status=eq.pending`
      },
      () => {
        fetchAvailableJobs()
      }
    )
    .subscribe()
}

onMounted(async () => {
  await fetchProviderInfo()
  if (providerInfo.value) {
    await Promise.all([
      fetchAvailableJobs(),
      fetchActiveJob()
    ])
    setupRealtimeSubscription()
  }
})

onUnmounted(() => {
  if (jobsSubscription) {
    supabase.removeChannel(jobsSubscription)
  }
})
</script>

<template>
  <div class="jobs-page">
    <!-- Header -->
    <div class="page-header">
      <button @click="router.back()" class="back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="header-title">
        <h1>{{ jobConfig?.label || 'งานของฉัน' }}</h1>
        <span class="provider-type">{{ providerTypeLabel }}</span>
      </div>
      <div class="header-spacer"></div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !providerInfo" class="loading-state">
      <div class="loading-spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- No provider info -->
    <div v-else-if="!providerInfo" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
      <h3>ไม่พบข้อมูลผู้ให้บริการ</h3>
      <p>กรุณาสมัครเป็นผู้ให้บริการก่อน</p>
      <button @click="router.push('/provider/onboarding')" class="btn-primary">
        สมัครเลย
      </button>
    </div>

    <!-- Content -->
    <div v-else class="jobs-content">
      <!-- Active Job -->
      <div v-if="activeJob" class="active-job-section">
        <h2 class="section-title">งานที่กำลังทำ</h2>
        <div class="job-card active" @click="viewJobDetail(activeJob)">
          <div class="job-header">
            <span class="job-icon">{{ jobConfig?.icon }}</span>
            <div class="job-info">
              <h3>{{ activeJob.users?.name || 'ลูกค้า' }}</h3>
              <span class="job-status">{{ activeJob.status }}</span>
            </div>
            <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Available Jobs -->
      <div class="available-jobs-section">
        <div class="section-header">
          <h2 class="section-title">งานที่รับได้</h2>
          <span class="job-count">{{ availableJobs.length }} งาน</span>
        </div>

        <!-- Empty state -->
        <div v-if="availableJobs.length === 0" class="empty-jobs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 9h6M9 15h6"/>
          </svg>
          <p>ยังไม่มีงานใหม่</p>
        </div>

        <!-- Jobs list -->
        <div v-else class="jobs-list">
          <div 
            v-for="job in availableJobs" 
            :key="job.id"
            class="job-card"
          >
            <div class="job-header">
              <span class="job-icon">{{ jobConfig?.icon }}</span>
              <div class="job-info">
                <h3>{{ job.users?.name || 'ลูกค้า' }}</h3>
                <span class="job-time">{{ new Date(job.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }}</span>
              </div>
            </div>
            
            <div class="job-details">
              <div v-if="job.pickup_address" class="detail-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>{{ job.pickup_address }}</span>
              </div>
              <div v-if="job.delivery_address" class="detail-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{{ job.delivery_address }}</span>
              </div>
            </div>

            <button @click="acceptJob(job)" class="btn-accept">
              รับงาน
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jobs-page {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 80px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 12px;
  cursor: pointer;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  color: #1A1A1A;
}

.header-title {
  flex: 1;
  text-align: center;
}

.header-title h1 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.provider-type {
  font-size: 13px;
  color: #00A86B;
  font-weight: 600;
}

.header-spacer {
  width: 40px;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 24px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state svg {
  width: 64px;
  height: 64px;
  color: #999999;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  color: #666666;
  margin-bottom: 24px;
}

.jobs-content {
  padding: 20px;
}

.active-job-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.job-count {
  font-size: 14px;
  color: #666666;
  font-weight: 600;
}

.job-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.job-card.active {
  border: 2px solid #00A86B;
  cursor: pointer;
}

.job-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.job-icon {
  font-size: 32px;
}

.job-info {
  flex: 1;
}

.job-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.job-status {
  font-size: 13px;
  color: #00A86B;
  font-weight: 600;
}

.job-time {
  font-size: 13px;
  color: #999999;
}

.chevron {
  width: 20px;
  height: 20px;
  color: #999999;
}

.job-details {
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666666;
}

.detail-row svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.btn-accept {
  width: 100%;
  padding: 12px;
  background: #00A86B;
  color: #FFFFFF;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-accept:hover {
  background: #008F5B;
}

.btn-accept:active {
  transform: scale(0.98);
}

.empty-jobs {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-jobs svg {
  width: 48px;
  height: 48px;
  color: #999999;
  margin-bottom: 12px;
}

.empty-jobs p {
  font-size: 14px;
  color: #666666;
}

.btn-primary {
  padding: 14px 32px;
  background: #00A86B;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 14px;
  cursor: pointer;
}
</style>
