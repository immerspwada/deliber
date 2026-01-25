<template>
  <div class="enhanced-provider-dashboard">
    <!-- Header with Connection Status -->
    <div class="dashboard-header">
      <div class="header-left">
        <h1 class="dashboard-title">🚗 Provider Dashboard</h1>
        <p class="dashboard-subtitle">จัดการงานและติดตามรายได้</p>
      </div>
      
      <div class="header-right">
        <ConnectionHealthStatus
          :connection-info="connectionInfo"
          :last-check="lastCheck"
          :on-reconnect="forceReconnect"
          :on-toggle-fallback="toggleFallbackMode"
          :on-get-diagnostics="getDiagnostics"
        />
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-content">
          <div class="stat-value">{{ jobCount }}</div>
          <div class="stat-label">งานที่พร้อม</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">฿{{ todayEarnings.toLocaleString() }}</div>
          <div class="stat-label">รายได้วันนี้</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <div class="stat-value">{{ rating.toFixed(1) }}</div>
          <div class="stat-label">คะแนนเฉลี่ย</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🎯</div>
        <div class="stat-content">
          <div class="stat-value">{{ completedJobs }}</div>
          <div class="stat-label">งานเสร็จวันนี้</div>
        </div>
      </div>
    </div>

    <!-- Debug Panel (Development Only) -->
    <div v-if="showDebugPanel" class="debug-panel">
      <div class="debug-header">
        <h3>🔧 Debug Panel</h3>
        <button class="close-debug" @click="showDebugPanel = false">×</button>
      </div>
      
      <div class="debug-content">
        <div class="debug-section">
          <h4>Connection Status</h4>
          <div class="debug-info">
            <div>Status: <span :style="{ color: connectionInfo.statusColor }">{{ connectionInfo.status }}</span></div>
            <div>Healthy: {{ isHealthy ? '✅' : '❌' }}</div>
            <div>Fallback Mode: {{ isInFallbackMode ? '🎭' : '🗄️' }}</div>
            <div>Last Check: {{ lastCheck ? formatTime(lastCheck.timestamp) : 'Never' }}</div>
          </div>
        </div>
        
        <div class="debug-section">
          <h4>Job Pool Status</h4>
          <div class="debug-info">
            <div>Available Jobs: {{ jobCount }}</div>
            <div>Current Job: {{ hasCurrentJob ? '✅' : '❌' }}</div>
            <div>Loading: {{ isLoading ? '⏳' : '✅' }}</div>
            <div>Error: {{ error || 'None' }}</div>
          </div>
        </div>
        
        <div class="debug-actions">
          <button class="debug-btn" @click="runRLSTests">🧪 Run RLS Tests</button>
          <button class="debug-btn" @click="loadJobs">🔄 Reload Jobs</button>
          <button class="debug-btn" @click="clearError">🗑️ Clear Error</button>
        </div>
      </div>
    </div>

    <!-- Available Jobs -->
    <div class="jobs-section">
      <div class="section-header">
        <h2 class="section-title">งานที่พร้อมรับ</h2>
        <div class="section-actions">
          <button 
            class="refresh-btn"
            :disabled="isLoading"
            @click="refreshJobs"
          >
            <svg class="refresh-icon" :class="{ spinning: isLoading }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23,4 23,10 17,10"></polyline>
              <polyline points="1,20 1,14 7,14"></polyline>
              <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"></path>
            </svg>
            {{ isLoading ? 'กำลังโหลด...' : 'รีเฟรช' }}
          </button>
          
          <button 
            v-if="isDevelopment"
            class="debug-toggle-btn"
            @click="showDebugPanel = !showDebugPanel"
          >
            🔧 Debug
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <div class="error-title">เกิดข้อผิดพลาด</div>
          <div class="error-description">{{ error }}</div>
        </div>
        <button class="error-dismiss" @click="clearError">×</button>
      </div>

      <!-- Fallback Mode Notice -->
      <div v-if="isInFallbackMode" class="fallback-notice">
        <div class="notice-icon">🎭</div>
        <div class="notice-content">
          <div class="notice-title">โหมดสำรอง</div>
          <div class="notice-description">
            ไม่สามารถเชื่อมต่อฐานข้อมูลได้ ระบบจะแสดงงานจำลองชั่วคราว
          </div>
        </div>
      </div>

      <!-- Jobs List -->
      <div v-if="sortedJobs.length > 0" class="jobs-list">
        <div 
          v-for="job in sortedJobs" 
          :key="job.id"
          class="job-card"
          :class="{ 'mock-job': job.isMock }"
        >
          <div class="job-header">
            <div class="job-id">
              {{ job.tracking_id }}
              <span v-if="job.isMock" class="mock-badge">MOCK</span>
            </div>
            <div class="job-fare">฿{{ job.estimated_fare.toLocaleString() }}</div>
          </div>
          
          <div class="job-route">
            <div class="route-point pickup">
              <div class="route-icon">📍</div>
              <div class="route-address">{{ job.pickup_address }}</div>
            </div>
            <div class="route-arrow">→</div>
            <div class="route-point dropoff">
              <div class="route-icon">🎯</div>
              <div class="route-address">{{ job.destination_address }}</div>
            </div>
          </div>
          
          <div class="job-meta">
            <div v-if="job.distance" class="job-distance">
              📏 {{ job.distance.toFixed(1) }} km
            </div>
            <div class="job-time">
              ⏰ {{ formatRelativeTime(job.created_at) }}
            </div>
          </div>
          
          <div class="job-actions">
            <button 
              class="accept-btn"
              :disabled="isLoading"
              @click="acceptJob(job.id, job.type)"
            >
              {{ isLoading ? 'กำลังรับงาน...' : 'รับงาน' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading" class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">ไม่มีงานในขณะนี้</div>
        <div class="empty-description">
          {{ isInFallbackMode 
            ? 'ระบบจะสร้างงานจำลองใหม่ในอีกสักครู่' 
            : 'งานใหม่จะปรากฏที่นี่เมื่อมีลูกค้าสั่ง' 
          }}
        </div>
      </div>

      <!-- Loading State -->
      <div v-else class="loading-state">
        <div class="loading-spinner"></div>
        <div class="loading-text">กำลังโหลดงาน...</div>
      </div>
    </div>

    <!-- RLS Test Results Modal -->
    <Teleport to="body">
      <div v-if="showRLSResults" class="modal-overlay" @click="closeRLSResults">
        <div class="modal-content rls-modal" @click.stop>
          <div class="modal-header">
            <h3>🧪 RLS Policy Test Results</h3>
            <button class="close-btn" @click="closeRLSResults">×</button>
          </div>
          
          <div class="modal-body">
            <div v-if="rlsTestSuite" class="rls-results">
              <div class="rls-summary" :class="{ success: rlsTestSuite.overallSuccess, failed: !rlsTestSuite.overallSuccess }">
                <div class="summary-icon">
                  {{ rlsTestSuite.overallSuccess ? '✅' : '❌' }}
                </div>
                <div class="summary-content">
                  <div class="summary-title">
                    {{ rlsTestSuite.overallSuccess ? 'All Tests Passed' : 'Some Tests Failed' }}
                  </div>
                  <div class="summary-stats">
                    {{ rlsTestSuite.results.filter(r => r.success).length }}/{{ rlsTestSuite.results.length }} tests passed
                    ({{ rlsTestSuite.totalDuration }}ms)
                  </div>
                </div>
              </div>
              
              <div class="rls-test-list">
                <div 
                  v-for="(result, index) in rlsTestSuite.results" 
                  :key="index"
                  class="rls-test-item"
                  :class="{ success: result.success, failed: !result.success }"
                >
                  <div class="test-header">
                    <div class="test-icon">{{ result.success ? '✅' : '❌' }}</div>
                    <div class="test-name">{{ result.testName }}</div>
                    <div class="test-duration">{{ result.duration }}ms</div>
                  </div>
                  <div class="test-message">{{ result.message }}</div>
                  <div v-if="result.error" class="test-error">{{ result.error }}</div>
                </div>
              </div>
            </div>
            
            <div v-else class="rls-loading">
              <div class="loading-spinner"></div>
              <div>Running RLS tests...</div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="copyRLSReport">
              📋 Copy Report
            </button>
            <button class="btn btn-primary" @click="closeRLSResults">
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProviderJobPoolEnhanced } from '../../composables/useProviderJobPoolEnhanced'
import { rlsPolicyTester, type RLSTestSuite } from '../../utils/rlsPolicyTester'
import ConnectionHealthStatus from '../ConnectionHealthStatus.vue'

// Enhanced job pool with fallback
const {
  availableJobs,
  currentJob,
  isLoading,
  error,
  hasCurrentJob,
  jobCount,
  sortedJobs,
  isInFallbackMode,
  connectionInfo,
  acceptJob: acceptJobFromPool,
  loadAvailableJobs,
  forceReconnect
} = useProviderJobPoolEnhanced()

// Local state
const showDebugPanel = ref(false)
const showRLSResults = ref(false)
const rlsTestSuite = ref<RLSTestSuite | null>(null)

// Mock stats (replace with real data)
const todayEarnings = ref(1250)
const rating = ref(4.8)
const completedJobs = ref(12)

// Computed
const isDevelopment = computed(() => import.meta.env.DEV)
const isHealthy = computed(() => connectionInfo.value.isHealthy)
const lastCheck = computed(() => connectionInfo.value.lastCheck)

// Methods
async function refreshJobs(): Promise<void> {
  await loadAvailableJobs()
}

async function acceptJob(jobId: string, jobType: string): Promise<void> {
  const result = await acceptJobFromPool(jobId, jobType as any)
  
  if (result.success) {
    console.log('✅ Job accepted:', result.requestId)
    // Show success notification
    showNotification(`✅ รับงาน ${result.requestId} สำเร็จ!`, 'success')
  } else {
    console.error('❌ Job acceptance failed:', result.error)
    // Show error notification
    showNotification(`❌ ไม่สามารถรับงานได้: ${result.error}`, 'error')
  }
}

function clearError(): void {
  error.value = null
}

function toggleFallbackMode(): void {
  // This would be implemented in the enhanced composable
  console.log('Toggle fallback mode')
}

function getDiagnostics(): any {
  return {
    connectionInfo: connectionInfo.value,
    jobCount: jobCount.value,
    hasCurrentJob: hasCurrentJob.value,
    isLoading: isLoading.value,
    error: error.value,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  }
}

async function runRLSTests(): Promise<void> {
  showRLSResults.value = true
  rlsTestSuite.value = null
  
  try {
    const suite = await rlsPolicyTester.runAllTests()
    rlsTestSuite.value = suite
  } catch (error) {
    console.error('RLS test suite failed:', error)
  }
}

function closeRLSResults(): void {
  showRLSResults.value = false
  rlsTestSuite.value = null
}

async function copyRLSReport(): Promise<void> {
  if (!rlsTestSuite.value) return
  
  try {
    const report = rlsPolicyTester.generateReport(rlsTestSuite.value)
    await navigator.clipboard.writeText(report)
    showNotification('📋 Report copied to clipboard!', 'success')
  } catch (error) {
    console.error('Failed to copy report:', error)
  }
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
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `
  
  document.body.appendChild(notification)
  setTimeout(() => notification.remove(), 3000)
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('th-TH')
}

function formatRelativeTime(dateString: string): string {
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

// Initialize
onMounted(() => {
  loadAvailableJobs()
})
</script>

<style scoped>
.enhanced-provider-dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 20px;
}

.header-left {
  flex: 1;
}

.dashboard-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px 0;
}

.dashboard-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.header-right {
  flex-shrink: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 12px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.debug-panel {
  background: #1e293b;
  color: white;
  border-radius: 12px;
  margin-bottom: 24px;
  overflow: hidden;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
}

.debug-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-debug {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.debug-content {
  padding: 20px;
}

.debug-section {
  margin-bottom: 20px;
}

.debug-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.debug-info {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-family: monospace;
}

.debug-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.debug-btn {
  padding: 8px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.debug-btn:hover {
  background: #2563eb;
}

.jobs-section {
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #f1f5f9;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.section-actions {
  display: flex;
  gap: 12px;
}

.refresh-btn, .debug-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover, .debug-toggle-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon {
  transition: transform 0.5s ease;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message, .fallback-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  margin: 0;
  border-bottom: 1px solid #f1f5f9;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
}

.fallback-notice {
  background: #f3f4f6;
  color: #7c3aed;
}

.error-icon, .notice-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.error-content, .notice-content {
  flex: 1;
}

.error-title, .notice-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.error-description, .notice-description {
  font-size: 14px;
  opacity: 0.8;
}

.error-dismiss {
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
}

.jobs-list {
  padding: 24px;
  display: grid;
  gap: 16px;
}

.job-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
  background: white;
}

.job-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.job-card.mock-job {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.job-id {
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mock-badge {
  background: #8b5cf6;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.job-fare {
  font-size: 18px;
  font-weight: 700;
  color: #059669;
}

.job-route {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.route-point {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.route-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.route-address {
  font-size: 14px;
  color: #475569;
  line-height: 1.4;
}

.route-arrow {
  color: #94a3b8;
  font-weight: bold;
  flex-shrink: 0;
}

.job-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #64748b;
}

.job-actions {
  display: flex;
  justify-content: flex-end;
}

.accept-btn {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
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

.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #64748b;
  max-width: 400px;
  line-height: 1.5;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  font-size: 14px;
  color: #64748b;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.rls-modal {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* RLS Test Results */
.rls-results {
  display: grid;
  gap: 16px;
}

.rls-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  border: 2px solid;
}

.rls-summary.success {
  background: #f0fdf4;
  border-color: #22c55e;
  color: #15803d;
}

.rls-summary.failed {
  background: #fef2f2;
  border-color: #ef4444;
  color: #dc2626;
}

.summary-icon {
  font-size: 24px;
}

.summary-title {
  font-weight: 600;
  font-size: 16px;
}

.summary-stats {
  font-size: 14px;
  opacity: 0.8;
}

.rls-test-list {
  display: grid;
  gap: 12px;
}

.rls-test-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.rls-test-item.success {
  border-color: #22c55e;
  background: #f0fdf4;
}

.rls-test-item.failed {
  border-color: #ef4444;
  background: #fef2f2;
}

.test-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.test-icon {
  font-size: 16px;
}

.test-name {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
}

.test-duration {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.test-message {
  font-size: 14px;
  margin-bottom: 4px;
}

.test-error {
  font-size: 12px;
  font-family: monospace;
  color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
  padding: 8px;
  border-radius: 4px;
}

.rls-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
}

/* Responsive */
@media (max-width: 768px) {
  .enhanced-provider-dashboard {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .job-route {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .route-arrow {
    align-self: center;
    transform: rotate(90deg);
  }
}
</style>