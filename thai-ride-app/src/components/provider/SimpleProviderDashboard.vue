<template>
  <div class="provider-dashboard">
    <!-- Header -->
    <header class="header">
      <div class="header-top">
        <h1 class="title">งานที่พร้อมรับ</h1>
        <button 
          type="button"
          class="refresh-btn"
          @click="refreshJobs"
          :disabled="isLoading"
          aria-label="รีเฟรช"
        >
          <svg 
            class="refresh-icon" 
            :class="{ spinning: isLoading }" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2"
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
        </button>
      </div>
      
      <!-- Status Toggle -->
      <div class="status-toggle" :class="{ active: isOnline }">
        <div class="status-info">
          <div class="status-dot"></div>
          <div class="status-text-wrapper">
            <span class="status-text">{{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}</span>
            <span v-if="isOnline && idleMinutes > 0" class="idle-timer">
              ไม่มีกิจกรรม {{ idleMinutes }} นาที
            </span>
          </div>
        </div>
        <button 
          type="button"
          class="toggle-btn"
          @click="toggleOnline"
          :disabled="isLoading || isToggling"
          :aria-label="isOnline ? 'ปิดรับงาน' : 'เปิดรับงาน'"
        >
          <span v-if="isToggling" class="toggle-spinner"></span>
          <span v-else class="toggle-slider"></span>
        </button>
      </div>
      
      <!-- Location indicator -->
      <div v-if="isOnline && currentLocation" class="location-indicator">
        <svg class="location-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <span>GPS ทำงานอยู่</span>
      </div>
    </header>

    <!-- Earnings Summary Modal -->
    <div v-if="showEarningsSummary" class="earnings-overlay" @click="closeEarningsSummary">
      <div class="earnings-modal" @click.stop>
        <div class="earnings-header">
          <h2>สรุปรายได้วันนี้</h2>
          <button type="button" class="close-btn" @click="closeEarningsSummary" aria-label="ปิด">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="earnings-content">
          <div class="earnings-stat main">
            <span class="stat-label">รายได้รวม</span>
            <span class="stat-value">฿{{ todayEarnings.toLocaleString() }}</span>
          </div>
          <div class="earnings-stat">
            <span class="stat-label">จำนวนเที่ยว</span>
            <span class="stat-value">{{ todayTrips }} เที่ยว</span>
          </div>
        </div>
        <button type="button" class="earnings-close-btn" @click="closeEarningsSummary">
          ตกลง
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-banner">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ error }}</span>
      <button type="button" class="error-close" @click="clearError" aria-label="ปิด">×</button>
    </div>

    <!-- Content -->
    <main class="content">
      <!-- Loading -->
      <div v-if="isLoading && sortedJobs.length === 0" class="loading">
        <div class="spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- Jobs -->
      <div v-else-if="sortedJobs.length > 0" class="jobs">
        <div v-for="job in sortedJobs" :key="job.id" class="job">
          <!-- Header -->
          <div class="job-header">
            <div class="job-type">
              <svg class="type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-1.6-3.2c-.3-.6-.9-1-1.5-1H9.1c-.6 0-1.2.4-1.5 1L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
              <span>รับส่ง</span>
            </div>
            <div class="job-header-right">
              <!-- Customer Rating Badge -->
              <div v-if="getCustomerRating(job.user_id)" class="customer-rating">
                <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>{{ formatRating(getCustomerRating(job.user_id)!) }}</span>
              </div>
              <div class="job-time">
                <svg class="time-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{{ formatTime(job.created_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Route -->
          <div class="job-route">
            <div class="route-line">
              <div class="line-dot pickup"></div>
              <div class="line-track"></div>
              <div class="line-dot dropoff"></div>
            </div>
            <div class="route-points">
              <div class="route-point">
                <div class="point-label">จุดรับ</div>
                <div class="point-address">{{ job.pickup_address || 'ไม่ระบุตำแหน่ง' }}</div>
              </div>
              <div class="route-point">
                <div class="point-label">จุดส่ง</div>
                <div class="point-address">{{ job.destination_address || 'ไม่ระบุตำแหน่ง' }}</div>
              </div>
            </div>
          </div>

          <!-- Info Row -->
          <div class="job-info">
            <!-- Distance to Pickup (from current location) -->
            <div v-if="currentLocation" class="info-item pickup-distance">
              <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/>
              </svg>
              <span>{{ calculateDistanceToPickup(job) }}</span>
            </div>
            <div class="info-item">
              <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{{ calculateDistance(job) }} กม.</span>
            </div>
            <div class="info-item">
              <svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>~{{ estimateTime(job) }} นาที</span>
            </div>
            <!-- Map Preview Button -->
            <button 
              type="button"
              class="map-preview-btn"
              @click="toggleMapPreview(job.id)"
              aria-label="ดูแผนที่"
            >
              <svg class="map-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/>
                <line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
            </button>
          </div>

          <!-- Map Preview (Lazy loaded) -->
          <Suspense v-if="showMapPreview === job.id">
            <template #default>
              <JobPreviewMap
                :pickup-lat="job.pickup_lat"
                :pickup-lng="job.pickup_lng"
                :dropoff-lat="job.destination_lat"
                :dropoff-lng="job.destination_lng"
                :pickup-address="job.pickup_address"
                :dropoff-address="job.destination_address"
                :show="true"
                @close="closeMapPreview"
              />
            </template>
            <template #fallback>
              <div class="map-loading-placeholder">
                <div class="spinner"></div>
                <span>กำลังโหลดแผนที่...</span>
              </div>
            </template>
          </Suspense>

          <!-- Fare -->
          <div class="job-fare">
            <div class="fare-left">
              <span class="fare-label">ค่าโดยสาร</span>
              <span class="fare-note">รวมค่าบริการแล้ว</span>
            </div>
            <div class="fare-amount">฿{{ job.estimated_fare?.toLocaleString() || 0 }}</div>
          </div>
          
          <!-- Accept Button -->
          <button 
            type="button"
            class="accept-btn"
            @click="acceptJob(job.id)"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="btn-spinner"></span>
            <span v-else>รับงานนี้</span>
          </button>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="empty">
        <svg class="empty-icon" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="50" stroke="#e5e7eb" stroke-width="2" stroke-dasharray="4 4"/>
          <rect x="35" y="40" width="50" height="40" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2"/>
          <rect x="35" y="40" width="50" height="12" rx="4" fill="#cbd5e1"/>
          <line x1="45" y1="60" x2="75" y2="60" stroke="#94a3b8" stroke-width="2"/>
          <line x1="45" y1="68" x2="65" y2="68" stroke="#94a3b8" stroke-width="2"/>
        </svg>
        <h3>{{ isOnline ? 'ไม่มีงานในขณะนี้' : 'คุณออฟไลน์อยู่' }}</h3>
        <p>{{ isOnline ? 'งานใหม่จะปรากฏที่นี่' : 'เปิดสถานะเพื่อรับงาน' }}</p>
      </div>
    </main>

    <!-- Debug -->
    <details v-if="isDev" class="debug">
      <summary>Debug</summary>
      <pre>{{ debugInfo }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { supabase } from '../../lib/supabase'
import { useSimpleProviderJobPool } from '../../composables/useSimpleProviderJobPool'

// Lazy load JobPreviewMap for performance
const JobPreviewMap = defineAsyncComponent(() => 
  import('./JobPreviewMap.vue')
)

const {
  currentJob,
  isLoading,
  error,
  jobCount,
  sortedJobs,
  acceptJob: acceptJobFromPool,
  loadAvailableJobs,
  subscribeToNewJobs,
  cleanup: cleanupJobPool
} = useSimpleProviderJobPool()

// State
const isOnline = ref(false)
const isToggling = ref(false)
const providerId = ref<string | null>(null)
const acceptedJobs = ref(0)
const showEarningsSummary = ref(false)
const todayEarnings = ref(0)
const todayTrips = ref(0)

// Map preview state
const showMapPreview = ref<string | null>(null) // job id or null
const customerRatings = ref<Map<string, number>>(new Map())

// Sound alert
let jobAlertAudio: HTMLAudioElement | null = null

// Auto-offline timer (30 minutes = 1800000ms)
const AUTO_OFFLINE_TIMEOUT = 30 * 60 * 1000
let autoOfflineTimer: ReturnType<typeof setTimeout> | null = null
let lastActivityTime = Date.now()
const idleMinutes = ref(0)

// Location tracking
let locationWatchId: number | null = null
const currentLocation = ref<{ lat: number; lng: number } | null>(null)
const LOCATION_UPDATE_INTERVAL = 30000 // 30 seconds

const isDev = computed(() => import.meta.env.DEV)

const debugInfo = computed(() => ({
  isOnline: isOnline.value,
  providerId: providerId.value,
  jobCount: jobCount.value,
  hasCurrentJob: !!currentJob.value,
  isLoading: isLoading.value,
  error: error.value,
  idleMinutes: idleMinutes.value,
  location: currentLocation.value,
  timestamp: new Date().toISOString()
}))

// ==================== AUTO-OFFLINE TIMER ====================

function resetActivityTimer(): void {
  lastActivityTime = Date.now()
  idleMinutes.value = 0
  
  if (autoOfflineTimer) {
    clearTimeout(autoOfflineTimer)
  }
  
  if (isOnline.value) {
    autoOfflineTimer = setTimeout(async () => {
      console.log('[Provider] Auto-offline: 30 minutes idle')
      await goOffline(true)
    }, AUTO_OFFLINE_TIMEOUT)
  }
}

// Update idle time every minute
let idleInterval: ReturnType<typeof setInterval> | null = null

function startIdleTracking(): void {
  idleInterval = setInterval(() => {
    if (isOnline.value) {
      const elapsed = Date.now() - lastActivityTime
      idleMinutes.value = Math.floor(elapsed / 60000)
    }
  }, 60000)
}

function stopIdleTracking(): void {
  if (idleInterval) {
    clearInterval(idleInterval)
    idleInterval = null
  }
  if (autoOfflineTimer) {
    clearTimeout(autoOfflineTimer)
    autoOfflineTimer = null
  }
  idleMinutes.value = 0
}

// ==================== LOCATION TRACKING ====================

function startLocationTracking(): void {
  if (!navigator.geolocation) {
    console.warn('[Provider] Geolocation not supported')
    return
  }

  // Get initial position
  navigator.geolocation.getCurrentPosition(
    (position) => {
      updateLocation(position.coords.latitude, position.coords.longitude)
    },
    (err) => console.warn('[Provider] Location error:', err.message),
    { enableHighAccuracy: true, timeout: 10000 }
  )

  // Watch position changes
  locationWatchId = navigator.geolocation.watchPosition(
    (position) => {
      updateLocation(position.coords.latitude, position.coords.longitude)
    },
    (err) => console.warn('[Provider] Location watch error:', err.message),
    { enableHighAccuracy: true, maximumAge: LOCATION_UPDATE_INTERVAL }
  )
}

function stopLocationTracking(): void {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId)
    locationWatchId = null
  }
  currentLocation.value = null
}

async function updateLocation(lat: number, lng: number): Promise<void> {
  currentLocation.value = { lat, lng }
  
  if (!providerId.value || !isOnline.value) return

  try {
    await supabase
      .from('providers_v2')
      .update({
        current_lat: lat,
        current_lng: lng,
        location_updated_at: new Date().toISOString()
      })
      .eq('id', providerId.value)
    
    console.log('[Provider] Location updated:', lat.toFixed(4), lng.toFixed(4))
  } catch (err) {
    console.error('[Provider] Failed to update location:', err)
  }
}

// ==================== EARNINGS SUMMARY ====================

async function loadTodayEarnings(): Promise<void> {
  if (!providerId.value) return

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error: err } = await supabase
      .from('ride_requests')
      .select('estimated_fare')
      .eq('provider_id', providerId.value)
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString())

    if (err) {
      console.error('[Provider] Error loading earnings:', err)
      return
    }

    if (data) {
      todayTrips.value = data.length
      todayEarnings.value = data.reduce((sum, r) => sum + (r.estimated_fare || 0), 0)
      console.log('[Provider] Today earnings:', todayEarnings.value, 'from', todayTrips.value, 'trips')
    }
  } catch (err) {
    console.error('[Provider] Exception loading earnings:', err)
  }
}

// ==================== MAIN FUNCTIONS ====================

async function loadProviderStatus(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('[Provider] No user logged in')
      return
    }

    const { data: provider, error: err } = await supabase
      .from('providers_v2')
      .select('id, is_online, is_available')
      .eq('user_id', user.id)
      .maybeSingle()

    if (err) {
      console.error('[Provider] Error loading provider:', err)
      return
    }

    if (provider) {
      providerId.value = provider.id
      isOnline.value = provider.is_online && provider.is_available
      console.log('[Provider] Loaded status:', { id: provider.id, online: isOnline.value })
      
      if (isOnline.value) {
        await loadAvailableJobs()
        await subscribeToNewJobs()
        startLocationTracking()
        resetActivityTimer()
        startIdleTracking()
        await loadCustomerRatings()
      }
      
      await loadTodayEarnings()
    } else {
      console.log('[Provider] No provider profile found')
    }
  } catch (err) {
    console.error('[Provider] Exception loading status:', err)
  }
}

async function goOffline(isAutoOffline = false): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('providers_v2')
      .update({
        is_online: false,
        is_available: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    isOnline.value = false
    cleanupJobPool()
    stopLocationTracking()
    stopIdleTracking()
    
    // Load earnings and show summary
    await loadTodayEarnings()
    showEarningsSummary.value = true
    
    if (isAutoOffline) {
      showNotification('ปิดรับงานอัตโนมัติ (ไม่มีกิจกรรม 30 นาที)', 'info')
    } else {
      showNotification('ปิดรับงานแล้ว', 'success')
    }
  } catch (err) {
    console.error('[Provider] Error going offline:', err)
  }
}

async function toggleOnline(): Promise<void> {
  if (isToggling.value) return
  
  isToggling.value = true
  const newStatus = !isOnline.value
  
  // Reset activity on any toggle action
  resetActivityTimer()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showNotification('กรุณาเข้าสู่ระบบ', 'error')
      return
    }

    if (!newStatus) {
      // Going offline
      await goOffline()
    } else {
      // Going online
      const { error: updateError } = await supabase
        .from('providers_v2')
        .update({
          is_online: true,
          is_available: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('[Provider] Error updating status:', updateError)
        showNotification('ไม่สามารถเปลี่ยนสถานะได้', 'error')
        return
      }

      isOnline.value = true
      showEarningsSummary.value = false
      showNotification('เปิดรับงานแล้ว', 'success')
      
      await loadAvailableJobs()
      await subscribeToNewJobs()
      startLocationTracking()
      startIdleTracking()
      await loadCustomerRatings()
    }
  } catch (err) {
    console.error('[Provider] Exception toggling status:', err)
    showNotification('เกิดข้อผิดพลาด', 'error')
  } finally {
    isToggling.value = false
  }
}

async function refreshJobs(): Promise<void> {
  resetActivityTimer() // User activity
  
  if (!isOnline.value) {
    showNotification('กรุณาเปิดรับงานก่อน', 'error')
    return
  }
  console.log('[Provider] Refreshing jobs')
  await loadAvailableJobs()
}

async function acceptJob(jobId: string): Promise<void> {
  resetActivityTimer() // User activity
  
  console.log('[Provider] Accepting job:', jobId)
  
  const result = await acceptJobFromPool(jobId)
  
  if (result.success) {
    console.log('[Provider] Job accepted')
    acceptedJobs.value++
    showNotification('รับงานสำเร็จ', 'success')
  } else {
    console.error('[Provider] Failed:', result.error)
    showNotification('ไม่สามารถรับงานได้', 'error')
  }
}

function clearError(): void {
  error.value = null
}

function closeEarningsSummary(): void {
  showEarningsSummary.value = false
}

function showNotification(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6'
  }
  
  const notification = document.createElement('div')
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type]};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    font-size: 14px;
    font-weight: 500;
    animation: slideDown 0.3s ease-out;
  `
  
  const style = document.createElement('style')
  style.textContent = '@keyframes slideDown { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }'
  document.head.appendChild(style)
  
  document.body.appendChild(notification)
  setTimeout(() => {
    notification.remove()
    style.remove()
  }, 3000)
}

// ==================== HELPER FUNCTIONS ====================

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'เมื่อสักครู่'
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} ชม.ที่แล้ว`
  
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function calculateDistance(job: any): string {
  if (!job.pickup_lat || !job.pickup_lng || !job.destination_lat || !job.destination_lng) {
    return '-'
  }
  
  const R = 6371 // Earth's radius in km
  const dLat = (job.destination_lat - job.pickup_lat) * Math.PI / 180
  const dLng = (job.destination_lng - job.pickup_lng) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(job.pickup_lat * Math.PI / 180) * Math.cos(job.destination_lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance.toFixed(1)
}

function estimateTime(job: any): number {
  const distanceStr = calculateDistance(job)
  if (distanceStr === '-') return 15 // default
  
  const distance = parseFloat(distanceStr)
  // Assume average speed of 25 km/h in city traffic
  const timeInHours = distance / 25
  const timeInMinutes = Math.ceil(timeInHours * 60)
  
  return Math.max(5, timeInMinutes) // minimum 5 minutes
}

// ==================== DISTANCE TO PICKUP ====================

function calculateDistanceToPickup(job: any): string {
  if (!currentLocation.value || !job.pickup_lat || !job.pickup_lng) {
    return '-'
  }
  
  const R = 6371 // Earth's radius in km
  const dLat = (job.pickup_lat - currentLocation.value.lat) * Math.PI / 180
  const dLng = (job.pickup_lng - currentLocation.value.lng) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(currentLocation.value.lat * Math.PI / 180) * Math.cos(job.pickup_lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)} ม.`
  }
  return `${distance.toFixed(1)} กม.`
}

// ==================== SOUND ALERT ====================

function initJobAlertSound(): void {
  try {
    jobAlertAudio = new Audio('/sounds/new-job.mp3')
    jobAlertAudio.preload = 'auto'
    jobAlertAudio.volume = 0.7
  } catch (err) {
    console.warn('[Provider] Could not init job alert sound:', err)
  }
}

function playJobAlertSound(): void {
  if (!jobAlertAudio) {
    initJobAlertSound()
  }
  
  if (jobAlertAudio) {
    jobAlertAudio.currentTime = 0
    jobAlertAudio.play().catch(err => {
      console.warn('[Provider] Could not play job alert:', err)
    })
  }
  
  // Also trigger haptic
  triggerHapticFeedback('heavy')
}

// ==================== MAP PREVIEW ====================

function toggleMapPreview(jobId: string): void {
  resetActivityTimer()
  showMapPreview.value = showMapPreview.value === jobId ? null : jobId
}

function closeMapPreview(): void {
  showMapPreview.value = null
}

// ==================== CUSTOMER RATING ====================

async function loadCustomerRatings(): Promise<void> {
  // Skip loading ratings - the users table doesn't have a rating column
  // This feature requires a separate customer_ratings table or profiles table
  // For now, we'll just not show ratings
  return
}

function getCustomerRating(userId: string): number | null {
  return customerRatings.value.get(userId) || null
}

function formatRating(rating: number): string {
  return rating.toFixed(1)
}

// ==================== HAPTIC FEEDBACK ====================

function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium'): void {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [30],
      heavy: [50, 30, 50]
    }
    navigator.vibrate(patterns[type])
  }
}

// ==================== LIFECYCLE ====================

onMounted(() => {
  console.log('[Provider] Component mounted')
  loadProviderStatus()
  
  // Listen for user activity
  document.addEventListener('touchstart', resetActivityTimer, { passive: true })
  document.addEventListener('click', resetActivityTimer)
})

onUnmounted(() => {
  console.log('[Provider] Component unmounted')
  cleanupJobPool()
  stopLocationTracking()
  stopIdleTracking()
  
  document.removeEventListener('touchstart', resetActivityTimer)
  document.removeEventListener('click', resetActivityTimer)
})
</script>

<style scoped>
/* Reset & Base */
* {
  box-sizing: border-box;
}

.provider-dashboard {
  min-height: 100vh;
  background: #fafafa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Header */
.header {
  background: white;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.refresh-btn {
  width: 40px;
  height: 40px;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  width: 18px;
  height: 18px;
  color: #6b7280;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Status Toggle */
.status-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  transition: all 0.3s;
}

.status-toggle.active {
  background: #f0fdf4;
  border-color: #86efac;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dc2626;
  transition: background 0.3s;
}

.status-toggle.active .status-dot {
  background: #16a34a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.status-text-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.idle-timer {
  font-size: 11px;
  color: #f59e0b;
  font-weight: 500;
}

/* Location Indicator */
.location-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  background: #eff6ff;
  border-radius: 6px;
  font-size: 12px;
  color: #3b82f6;
}

.location-icon {
  width: 14px;
  height: 14px;
}

/* Earnings Modal */
.earnings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.earnings-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 320px;
  overflow: hidden;
  animation: modalIn 0.3s ease-out;
}

@keyframes modalIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.earnings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.earnings-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-btn svg {
  width: 16px;
  height: 16px;
  color: #6b7280;
}

.earnings-content {
  padding: 24px 20px;
}

.earnings-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.earnings-stat.main {
  padding: 16px;
  background: #f0fdf4;
  border-radius: 12px;
  margin-bottom: 12px;
}

.earnings-stat .stat-label {
  font-size: 14px;
  color: #6b7280;
}

.earnings-stat.main .stat-label {
  color: #166534;
}

.earnings-stat .stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.earnings-stat.main .stat-value {
  font-size: 28px;
  color: #16a34a;
}

.earnings-close-btn {
  width: calc(100% - 40px);
  margin: 0 20px 20px;
  padding: 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.earnings-close-btn:hover {
  background: #2563eb;
}

.toggle-btn {
  width: 44px;
  height: 24px;
  background: #cbd5e1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: background 0.3s;
}

.status-toggle.active .toggle-btn {
  background: #16a34a;
}

.toggle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.status-toggle.active .toggle-slider {
  transform: translateX(20px);
}

.toggle-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
}

.error-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.error-close {
  margin-left: auto;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  font-size: 20px;
  color: currentColor;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.error-close:hover {
  background: rgba(0,0,0,0.1);
}

/* Content */
.content {
  padding: 16px;
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

.loading p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Jobs */
.jobs {
  display: grid;
  gap: 12px;
}

.job {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  transition: box-shadow 0.2s;
}

.job:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

/* Job Header */
.job-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}

.job-type {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
}

.type-icon {
  width: 18px;
  height: 18px;
}

.job-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.job-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Customer Rating Badge */
.customer-rating {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  background: #fef3c7;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #d97706;
}

.star-icon {
  width: 12px;
  height: 12px;
  color: #f59e0b;
}

.time-icon {
  width: 14px;
  height: 14px;
}

/* Job Route */
.job-route {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.route-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0;
}

.line-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.line-dot.pickup {
  background: #3b82f6;
}

.line-dot.dropoff {
  background: #ef4444;
}

.line-track {
  width: 2px;
  flex: 1;
  min-height: 32px;
  background: linear-gradient(to bottom, #3b82f6, #ef4444);
  margin: 4px 0;
}

.route-points {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.route-point {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.point-label {
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.point-address {
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Job Info */
.job-info {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 8px;
  align-items: center;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
}

.info-item.pickup-distance {
  color: #059669;
  font-weight: 500;
}

.info-item.pickup-distance .info-icon {
  color: #10b981;
}

.info-icon {
  width: 16px;
  height: 16px;
  color: #94a3b8;
}

/* Map Preview Button */
.map-preview-btn {
  margin-left: auto;
  width: 36px;
  height: 36px;
  background: #eff6ff;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.map-preview-btn:hover {
  background: #dbeafe;
}

.map-preview-btn:active {
  transform: scale(0.95);
}

.map-icon {
  width: 18px;
  height: 18px;
  color: #3b82f6;
}

/* Map Loading Placeholder */
.map-loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  background: #f9fafb;
  border-radius: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #6b7280;
}

/* Job Fare */
.job-fare {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 8px;
  margin-bottom: 12px;
}

.fare-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fare-label {
  font-size: 12px;
  color: #166534;
  font-weight: 500;
}

.fare-note {
  font-size: 10px;
  color: #86efac;
}

.fare-amount {
  font-size: 24px;
  font-weight: 700;
  color: #16a34a;
}

/* Accept Button */
.accept-btn {
  width: 100%;
  height: 48px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.accept-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59,130,246,0.3);
}

.accept-btn:active:not(:disabled) {
  transform: translateY(0);
}

.accept-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Empty */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  width: 100px;
  height: 100px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 6px 0;
}

.empty p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  max-width: 280px;
  line-height: 1.5;
}

/* Debug */
.debug {
  margin: 16px;
  padding: 12px;
  background: #1f2937;
  color: white;
  border-radius: 8px;
  font-size: 11px;
  font-family: monospace;
}

.debug summary {
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 8px;
}

.debug pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
}

/* Responsive */
@media (max-width: 640px) {
  .job-info {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .info-item {
    flex: 1 1 40%;
  }
}

@media (min-width: 641px) {
  .provider-dashboard {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .jobs {
    grid-template-columns: 1fr;
  }
}
</style>
