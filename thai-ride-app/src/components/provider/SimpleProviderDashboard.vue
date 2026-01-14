<template>
  <div class="simple-provider-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <h1 class="dashboard-title">🚗 Provider Dashboard</h1>
      <div class="status-indicator" :class="{ online: isOnline }">
        <div class="status-dot"></div>
        <span>{{ isOnline ? 'ออนไลน์' : 'ออฟไลน์' }}</span>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ jobCount }}</div>
        <div class="stat-label">งานที่พร้อม</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ acceptedJobs }}</div>
        <div class="stat-label">งานที่รับแล้ว</div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button 
        class="toggle-btn"
        :class="{ active: isOnline }"
        @click="toggleOnline"
      >
        {{ isOnline ? '🟢 ออนไลน์' : '🔴 ออฟไลน์' }}
      </button>
      
      <button 
        class="refresh-btn"
        @click="refreshJobs"
        :disabled="isLoading"
      >
        🔄 รีเฟรช
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <div class="error-icon">⚠️</div>
      <div class="error-text">{{ error }}</div>
      <button class="error-close" @click="clearError">×</button>
    </div>

    <!-- Jobs List -->
    <div class="jobs-section">
      <h2 class="section-title">งานที่พร้อมรับ</h2>
      
      <!-- Loading -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <div>กำลังโหลดงาน...</div>
      </div>

      <!-- Jobs -->
      <div v-else-if="sortedJobs.length > 0" class="jobs-list">
        <div 
          v-for="job in sortedJobs" 
          :key="job.id"
          class="job-card"
        >
          <div class="job-header">
            <div class="job-id">{{ job.tracking_id }}</div>
            <div class="job-fare">฿{{ job.estimated_fare }}</div>
          </div>
          
          <div class="job-route">
            <div class="route-from">
              📍 {{ job.pickup_address || 'ไม่ระบุ' }}
            </div>
            <div class="route-to">
              🎯 {{ job.destination_address || 'ไม่ระบุ' }}
            </div>
          </div>
          
          <div class="job-time">
            ⏰ {{ formatTime(job.created_at) }}
          </div>
          
          <button 
            class="accept-btn"
            @click="acceptJob(job.id)"
            :disabled="isLoading"
          >
            รับงาน
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">ไม่มีงานในขณะนี้</div>
        <div class="empty-subtext">งานใหม่จะปรากฏที่นี่เมื่อมีลูกค้าสั่ง</div>
      </div>
    </div>

    <!-- Current Job -->
    <div v-if="currentJob" class="current-job">
      <h2 class="section-title">งานปัจจุบัน</h2>
      <div class="job-card current">
        <div class="job-header">
          <div class="job-id">{{ currentJob.tracking_id }}</div>
          <div class="job-status">{{ currentJob.status }}</div>
        </div>
        <div class="job-route">
          <div class="route-from">📍 {{ currentJob.pickup_address }}</div>
          <div class="route-to">🎯 {{ currentJob.destination_address }}</div>
        </div>
      </div>
    </div>

    <!-- Debug Info (Development Only) -->
    <div v-if="isDev" class="debug-info">
      <details>
        <summary>🔧 Debug Info</summary>
        <pre>{{ debugInfo }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSimpleProviderJobPool } from '../../composables/useSimpleProviderJobPool'

// Use simple job pool
const {
  availableJobs,
  currentJob,
  isLoading,
  error,
  jobCount,
  sortedJobs,
  acceptJob: acceptJobFromPool,
  loadAvailableJobs,
  subscribeToNewJobs
} = useSimpleProviderJobPool()

// Local state
const isOnline = ref(false)
const acceptedJobs = ref(0)

// Computed
const isDev = computed(() => import.meta.env.DEV)

const debugInfo = computed(() => ({
  isOnline: isOnline.value,
  jobCount: jobCount.value,
  hasCurrentJob: !!currentJob.value,
  isLoading: isLoading.value,
  error: error.value,
  timestamp: new Date().toISOString()
}))

// Methods
function toggleOnline(): void {
  isOnline.value = !isOnline.value
  
  if (isOnline.value) {
    console.log('[SimpleProvider] Going online - loading jobs and subscribing')
    loadAvailableJobs()
    subscribeToNewJobs()
  } else {
    console.log('[SimpleProvider] Going offline')
  }
}

async function refreshJobs(): Promise<void> {
  if (!isOnline.value) {
    console.log('[SimpleProvider] Cannot refresh jobs while offline')
    return
  }
  
  console.log('[SimpleProvider] Refreshing jobs...')
  await loadAvailableJobs()
}

async function acceptJob(jobId: string): Promise<void> {
  console.log('[SimpleProvider] Accepting job:', jobId)
  
  const result = await acceptJobFromPool(jobId)
  
  if (result.success) {
    console.log('[SimpleProvider] ✅ Job accepted successfully')
    acceptedJobs.value++
    showNotification('✅ รับงานสำเร็จ!', 'success')
  } else {
    console.error('[SimpleProvider] ❌ Job acceptance failed:', result.error)
    showNotification(`❌ ไม่สามารถรับงานได้: ${result.error}`, 'error')
  }
}

function clearError(): void {
  error.value = null
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'เพิ่งเกิดขึ้น'
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
  
  return date.toLocaleDateString('th-TH')
}

function showNotification(message: string, type: 'success' | 'error' = 'success'): void {
  const notification = document.createElement('div')
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `
  
  document.body.appendChild(notification)
  setTimeout(() => notification.remove(), 3000)
}

// Initialize
onMounted(() => {
  console.log('[SimpleProvider] Component mounted')
  // Auto-start online and load jobs
  isOnline.value = true
  loadAvailableJobs()
  subscribeToNewJobs()
})
</script>

<style scoped>
.simple-provider-dashboard {
  min-height: 100vh;
  background: #f8fafc;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.status-indicator.online {
  background: #dcfce7;
  color: #16a34a;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.toggle-btn, .refresh-btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn {
  background: #ef4444;
  color: white;
}

.toggle-btn.active {
  background: #10b981;
}

.toggle-btn:hover {
  transform: translateY(-1px);
}

.refresh-btn {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.refresh-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  color: #dc2626;
}

.error-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  font-size: 14px;
}

.error-close {
  background: none;
  border: none;
  font-size: 18px;
  color: currentColor;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.error-close:hover {
  background: rgba(0, 0, 0, 0.1);
}

.jobs-section, .current-job {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  overflow: hidden;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  padding: 20px 20px 0 20px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
  color: #64748b;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.jobs-list {
  padding: 20px;
  display: grid;
  gap: 16px;
}

.job-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.job-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.job-card.current {
  border-color: #10b981;
  background: #f0fdf4;
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.job-id {
  font-weight: 600;
  color: #1e293b;
}

.job-fare {
  font-size: 18px;
  font-weight: 700;
  color: #059669;
}

.job-status {
  background: #10b981;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.job-route {
  margin-bottom: 12px;
}

.route-from, .route-to {
  font-size: 14px;
  color: #475569;
  margin-bottom: 4px;
  line-height: 1.4;
}

.job-time {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
}

.accept-btn {
  width: 100%;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.accept-btn:hover:not(:disabled) {
  background: #2563eb;
}

.accept-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.empty-subtext {
  font-size: 14px;
  color: #64748b;
  max-width: 300px;
  line-height: 1.5;
}

.debug-info {
  background: #1e293b;
  color: white;
  border-radius: 8px;
  padding: 16px;
  font-family: monospace;
  font-size: 12px;
}

.debug-info summary {
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 12px;
}

.debug-info pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Responsive */
@media (max-width: 768px) {
  .simple-provider-dashboard {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .stats-row {
    grid-template-columns: 1fr;
  }
  
  .controls {
    flex-direction: column;
  }
}

/* Animations */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>