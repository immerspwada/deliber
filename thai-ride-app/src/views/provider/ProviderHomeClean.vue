<script setup lang="ts">
/**
 * ProviderHomeClean - หน้าหลัก Provider แบบสะอาด เรียบง่าย
 * 
 * Features:
 * - ปุ่มเปิด/ปิดงานขนาดใหญ่ชัดเจน
 * - รายการงานแบบ Feed ไล่ลำดับ
 * - ไม่มีส่วนอื่นที่ซับซ้อน
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useOrderNumber } from '../../composables/useOrderNumber'

const router = useRouter()
const { formatOrderNumber } = useOrderNumber()

// Realtime subscription
let realtimeChannel: RealtimeChannel | null = null

// Types
interface RideRequestRow {
  id: string
  tracking_id: string
  status: string
  pickup_address: string
  destination_address: string
  estimated_fare: number
  estimated_distance: number | null
  created_at: string
  user_id: string
  pickup_lat: number
  pickup_lng: number
  destination_lat: number
  destination_lng: number
}

interface ProfileRow {
  name: string | null
}

// State
const loading = ref(true)
const isOnline = ref(false)
const isToggling = ref(false)
const providerId = ref<string | null>(null)
const providerName = ref('พาร์ทเนอร์')

// Available jobs list
const availableJobs = ref<Array<{
  id: string
  tracking_id: string
  pickup_address: string
  destination_address: string
  estimated_fare: number
  distance: number
  customer_name: string
  created_at: string
  time_ago: string
}>>([])

// Active job (งานที่กำลังทำอยู่)
const activeJob = ref<{
  id: string
  tracking_id: string
  status: string
  pickup_address: string
  destination_address: string
  estimated_fare: number
  customer_name: string
} | null>(null)

// Computed
const jobsCount = computed(() => availableJobs.value.length)
const hasActiveJob = computed(() => activeJob.value !== null)

// Methods
async function loadProviderData() {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Get provider info
    const { data: provider } = await supabase
      .from('providers_v2')
      .select('id, first_name, is_online, is_available')
      .eq('user_id', user.id)
      .maybeSingle()

    if (provider) {
      providerId.value = provider.id
      providerName.value = provider.first_name || 'พาร์ทเนอร์'
      isOnline.value = provider.is_online && provider.is_available

      // Load active job first
      await loadActiveJob()

      // Load available jobs if online
      if (isOnline.value) {
        await loadAvailableJobs()
      }
    }
  } catch (err) {
    console.error('[ProviderHomeClean] Error:', err)
  } finally {
    loading.value = false
  }
}

async function loadActiveJob() {
  if (!providerId.value) return

  try {
    // Find job that provider is currently working on
    const { data } = await supabase
      .from('ride_requests')
      .select('id, tracking_id, status, pickup_address, destination_address, estimated_fare, user_id')
      .eq('provider_id', providerId.value)
      .in('status', ['matched', 'pickup', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      // Get customer name
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', data.user_id)
        .maybeSingle()

      activeJob.value = {
        id: data.id,
        tracking_id: data.tracking_id,
        status: data.status,
        pickup_address: data.pickup_address,
        destination_address: data.destination_address,
        estimated_fare: data.estimated_fare,
        customer_name: profile?.name || 'ลูกค้า'
      }
    } else {
      activeJob.value = null
    }
  } catch (err) {
    console.error('[ProviderHomeClean] Load active job error:', err)
  }
}

async function loadAvailableJobs() {
  try {
    const { data } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('status', 'pending')
      .is('provider_id', null)
      .order('created_at', { ascending: false })
      .limit(20) as { data: RideRequestRow[] | null }

    if (data) {
      // Get customer names
      const userIds = [...new Set(data.map(j => j.user_id))]
      const { data: profiles } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds) as { data: Array<{ id: string; name: string | null }> | null }

      const profileMap = new Map(profiles?.map(p => [p.id, p.name || 'ลูกค้า']) || [])

      availableJobs.value = data.map(job => ({
        id: job.id,
        tracking_id: job.tracking_id,
        pickup_address: job.pickup_address,
        destination_address: job.destination_address,
        estimated_fare: job.estimated_fare,
        distance: job.estimated_distance || calculateDistance(
          job.pickup_lat,
          job.pickup_lng,
          job.destination_lat,
          job.destination_lng
        ),
        customer_name: profileMap.get(job.user_id) || 'ลูกค้า',
        created_at: job.created_at,
        time_ago: getTimeAgo(job.created_at)
      }))
    }
  } catch (err) {
    console.error('[ProviderHomeClean] Load jobs error:', err)
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function getTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'เมื่อสักครู่'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} นาทีที่แล้ว`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ชั่วโมงที่แล้ว`
  return `${Math.floor(seconds / 86400)} วันที่แล้ว`
}

function getStatusText(status: string): string {
  switch (status) {
    case 'matched': return 'กำลังไปรับ'
    case 'pickup': return 'ถึงจุดรับแล้ว'
    case 'in_progress': return 'กำลังเดินทาง'
    default: return status
  }
}

function goToActiveJob() {
  if (activeJob.value) {
    router.push(`/provider/job/${activeJob.value.id}`)
  }
}

async function toggleOnline() {
  if (isToggling.value) return
  isToggling.value = true

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newStatus = !isOnline.value

    await supabase
      .from('providers_v2')
      .update({
        is_online: newStatus,
        is_available: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    isOnline.value = newStatus

    if (newStatus) {
      await loadAvailableJobs()
    } else {
      availableJobs.value = []
    }
  } catch (err) {
    console.error('[ProviderHomeClean] Toggle error:', err)
  } finally {
    isToggling.value = false
  }
}

async function acceptJob(jobId: string) {
  try {
    if (!providerId.value) {
      console.error('[ProviderHomeClean] No provider ID')
      return
    }

    // Accept the job
    const { error } = await supabase
      .from('ride_requests')
      .update({
        provider_id: providerId.value,
        status: 'matched',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .eq('status', 'pending')
      .is('provider_id', null)

    if (error) {
      console.error('[ProviderHomeClean] Accept job error:', error)
      alert('ไม่สามารถรับงานได้ อาจมีคนรับไปแล้ว')
      await loadAvailableJobs() // Refresh list
      return
    }

    // Navigate to job detail
    router.push(`/provider/job/${jobId}`)
  } catch (err) {
    console.error('[ProviderHomeClean] Accept job error:', err)
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
  }
}

// Lifecycle
onMounted(() => {
  loadProviderData()
  setupRealtimeSubscription()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
})

// Realtime subscription for new jobs
function setupRealtimeSubscription() {
  realtimeChannel = supabase
    .channel('provider-jobs-feed')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_requests',
        filter: 'status=eq.pending'
      },
      () => {
        if (isOnline.value) {
          loadAvailableJobs()
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ride_requests'
      },
      () => {
        if (isOnline.value) {
          loadAvailableJobs()
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'ride_requests'
      },
      () => {
        if (isOnline.value) {
          loadAvailableJobs()
        }
      }
    )
    .subscribe()
}
</script>

<template>
  <div class="provider-home-clean">
    <!-- Main Content -->
    <main class="content">
      <!-- Compact Header with Toggle -->
      <div class="header-section">
        <div class="greeting">
          <h1 class="title">สวัสดี {{ providerName }}</h1>
        </div>
        
        <!-- Online/Offline Toggle -->
        <button
          class="toggle-button"
          :class="{ active: isOnline, loading: isToggling }"
          :disabled="isToggling"
          @click="toggleOnline"
        >
          <div class="toggle-icon">
            <svg v-if="isOnline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M4.93 4.93l14.14 14.14" />
            </svg>
          </div>
          <div class="toggle-text">
            <span class="toggle-status">{{ isOnline ? 'เปิดรับงาน' : 'ปิดรับงาน' }}</span>
            <span class="toggle-desc">{{ isOnline ? 'คุณพร้อมรับงานอยู่' : 'แตะเพื่อเปิดรับงาน' }}</span>
          </div>
          <div class="toggle-indicator">
            <span class="indicator-dot" :class="{ active: isOnline }"></span>
          </div>
        </button>
      </div>

      <!-- Jobs Count Badge -->
      <div v-if="isOnline" class="jobs-count-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span>{{ jobsCount }} งานพร้อมรับ</span>
      </div>

      <!-- Active Job Card (งานที่กำลังทำอยู่) -->
      <div v-if="hasActiveJob && activeJob" class="active-job-section">
        <div class="section-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>งานที่กำลังทำอยู่</span>
        </div>

        <div class="active-job-card" @click="goToActiveJob">
          <!-- Status Badge -->
          <div class="active-job-status">
            <span class="status-dot"></span>
            <span class="status-text">{{ getStatusText(activeJob.status) }}</span>
          </div>

          <!-- Job Info -->
          <div class="active-job-info">
            <div class="active-job-number">{{ formatOrderNumber(activeJob.tracking_id) }}</div>
            <div class="active-job-customer">{{ activeJob.customer_name }}</div>
          </div>

          <!-- Route -->
          <div class="active-job-route">
            <div class="route-item">
              <svg class="route-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="10" r="3" />
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 7 8 11.7z" />
              </svg>
              <span class="route-address">{{ activeJob.pickup_address }}</span>
            </div>
            <div class="route-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div class="route-item">
              <svg class="route-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3h18v18H3zM21 9H3M21 15H3M12 3v18" />
              </svg>
              <span class="route-address">{{ activeJob.destination_address }}</span>
            </div>
          </div>

          <!-- Fare & Action -->
          <div class="active-job-footer">
            <div class="active-job-fare">฿{{ activeJob.estimated_fare.toFixed(0) }}</div>
            <div class="active-job-action">
              <span>ดูรายละเอียด</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- Offline State -->
      <div v-else-if="!isOnline" class="offline-state">
        <div class="offline-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h3>คุณปิดรับงานอยู่</h3>
        <p>เปิดรับงานเพื่อดูรายการงานที่พร้อมรับ</p>
      </div>

      <!-- No Jobs State -->
      <div v-else-if="availableJobs.length === 0" class="no-jobs-state">
        <div class="no-jobs-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h3>ยังไม่มีงานใหม่</h3>
        <p>ระบบจะแจ้งเตือนเมื่อมีงานเข้ามา</p>
      </div>

      <!-- Jobs Feed -->
      <div v-else class="jobs-feed">
        <div
          v-for="job in availableJobs"
          :key="job.id"
          class="job-card"
        >
          <!-- Job Header -->
          <div class="job-header">
            <span class="job-number">{{ formatOrderNumber(job.tracking_id) }}</span>
            <span class="job-time">{{ job.time_ago }}</span>
          </div>

          <!-- Job Route -->
          <div class="job-route">
            <div class="route-point">
              <div class="point-dot pickup"></div>
              <div class="point-text">
                <span class="point-label">รับ</span>
                <span class="point-address">{{ job.pickup_address }}</span>
              </div>
            </div>

            <div class="route-line"></div>

            <div class="route-point">
              <div class="point-dot dropoff"></div>
              <div class="point-text">
                <span class="point-label">ส่ง</span>
                <span class="point-address">{{ job.destination_address }}</span>
              </div>
            </div>
          </div>

          <!-- Job Footer -->
          <div class="job-footer">
            <div class="job-info">
              <span class="job-customer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {{ job.customer_name }}
              </span>
              <span class="job-distance">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {{ job.distance.toFixed(1) }} กม.
              </span>
            </div>
            <div class="job-fare">
              <span class="fare-amount">฿{{ job.estimated_fare.toFixed(0) }}</span>
            </div>
          </div>

          <!-- Accept Button -->
          <button 
            class="accept-button"
            @click.stop="acceptJob(job.id)"
            aria-label="รับงาน"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <path d="M22 4L12 14.01l-3-3" />
            </svg>
            <span>รับงาน</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.provider-home-clean {
  min-height: 100vh;
  background: #FFFFFF;
  padding-bottom: 80px;
}

/* Content */
.content {
  padding: 16px 20px 20px;
  background: #FFFFFF;
}

/* Header Section - Compact */
.header-section {
  margin-bottom: 20px;
  padding: 20px;
  background: #FFFFFF;
  margin: -16px -20px 20px -20px;
  border-bottom: 1px solid #E5E5E5;
}

.greeting {
  margin-bottom: 0;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  margin: 0;
}

/* Toggle Section */
.toggle-section {
  margin-bottom: 16px;
}

.toggle-button {
  width: 100%;
  background: #FFFFFF;
  border: 2px solid #000000;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.toggle-button:active {
  transform: scale(0.98);
}

.toggle-button.active {
  background: #000000;
  border-color: #000000;
  color: #FFFFFF;
}

.toggle-button.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

.toggle-icon {
  width: 44px;
  height: 44px;
  background: #F5F5F5;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toggle-button.active .toggle-icon {
  background: #333333;
}

.toggle-icon svg {
  width: 26px;
  height: 26px;
  color: #000000;
}

.toggle-button.active .toggle-icon svg {
  color: #FFFFFF;
}

.toggle-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.toggle-status {
  font-size: 17px;
  font-weight: 600;
  color: #1A1A1A;
}

.toggle-button.active .toggle-status {
  color: #FFFFFF;
}

.toggle-desc {
  font-size: 13px;
  color: #666666;
}

.toggle-button.active .toggle-desc {
  color: rgba(255, 255, 255, 0.9);
}

.toggle-indicator {
  flex-shrink: 0;
}

.indicator-dot {
  width: 14px;
  height: 14px;
  background: #CCCCCC;
  border-radius: 50%;
  display: block;
  transition: all 0.3s;
}

.indicator-dot.active {
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

/* Jobs Count Badge */
.jobs-count-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #000000;
  border-radius: 8px;
  margin-bottom: 16px;
  color: #FFFFFF;
  font-weight: 600;
  font-size: 14px;
}

.jobs-count-badge svg {
  width: 18px;
  height: 18px;
}

/* Active Job Section */
.active-job-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #000000;
}

.section-header svg {
  width: 18px;
  height: 18px;
}

.active-job-card {
  background: #000000;
  border: 2px solid #000000;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.active-job-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.active-job-card:active {
  transform: translateY(0);
}

.active-job-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  width: fit-content;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #00FF00;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 13px;
  font-weight: 600;
  color: #FFFFFF;
}

.active-job-info {
  margin-bottom: 16px;
}

.active-job-number {
  font-size: 16px;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 4px;
}

.active-job-customer {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.active-job-route {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.route-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.route-icon {
  width: 16px;
  height: 16px;
  color: #FFFFFF;
  flex-shrink: 0;
  margin-top: 2px;
}

.route-address {
  font-size: 13px;
  color: #FFFFFF;
  line-height: 1.4;
}

.route-arrow {
  display: flex;
  justify-content: center;
  padding: 4px 0;
}

.route-arrow svg {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.6);
}

.active-job-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.active-job-fare {
  font-size: 24px;
  font-weight: 700;
  color: #FFFFFF;
}

.active-job-action {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
}

.active-job-action svg {
  width: 16px;
  height: 16px;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #E5E5E5;
  border-top-color: #000000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: #666666;
  margin: 0;
}

/* Offline State */
.offline-state {
  text-align: center;
  padding: 60px 20px;
}

.offline-icon {
  width: 80px;
  height: 80px;
  background: #F5F5F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.offline-icon svg {
  width: 40px;
  height: 40px;
  color: #999999;
}

.offline-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.offline-state p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

/* No Jobs State */
.no-jobs-state {
  text-align: center;
  padding: 60px 20px;
}

.no-jobs-icon {
  width: 80px;
  height: 80px;
  background: #F5F5F5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.no-jobs-icon svg {
  width: 40px;
  height: 40px;
  color: #666666;
}

.no-jobs-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.no-jobs-state p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

/* Jobs Feed */
.jobs-feed {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.job-card {
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
  position: relative;
}

.job-card:hover {
  border-color: #000000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Job Header */
.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.job-number {
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
  background: #000000;
  padding: 4px 12px;
  border-radius: 6px;
}

.job-time {
  font-size: 12px;
  color: #999999;
}

/* Job Route */
.job-route {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.route-point {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.point-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.point-dot.pickup {
  background: #000000;
  border: 2px solid #000000;
}

.point-dot.dropoff {
  background: #666666;
  border: 2px solid #666666;
}

.route-line {
  width: 2px;
  height: 16px;
  background: #CCCCCC;
  margin-left: 5px;
}

.point-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.point-label {
  font-size: 11px;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
}

.point-address {
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.4;
}

/* Job Footer */
.job-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #F0F0F0;
}

.job-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.job-customer,
.job-distance {
  font-size: 13px;
  color: #666666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.job-customer svg,
.job-distance svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.job-fare {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fare-amount {
  font-size: 20px;
  font-weight: 700;
  color: #000000;
}

/* Accept Button */
.accept-button {
  width: 100%;
  margin-top: 12px;
  padding: 14px 20px;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 48px;
}

.accept-button:hover {
  background: #1A1A1A;
}

.accept-button:active {
  background: #000000;
  transform: scale(0.98);
}

.accept-button svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
</style>
