<template>
  <AdminLayout>
    <div class="admin-system-health">
      <!-- Header -->
      <div class="header-section">
        <div class="header-content">
          <h1 class="page-title">System Health</h1>
          <p class="page-subtitle">ตรวจสอบสถานะระบบและประสิทธิภาพ</p>
        </div>
        <div class="header-actions">
          <button @click="refreshHealth" :disabled="loading" class="btn-refresh">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            รีเฟรช
          </button>
          <button @click="runCleanup" :disabled="cleanupLoading" class="btn-cleanup">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Cleanup
          </button>
        </div>
      </div>

      <!-- Overall Status -->
      <div class="status-banner" :class="overallStatus">
        <div class="status-icon">
          <svg v-if="overallStatus === 'healthy'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22,4 12,14.01 9,11.01"/>
          </svg>
          <svg v-else-if="overallStatus === 'degraded'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="status-text">
          <h2>{{ statusLabels[overallStatus] }}</h2>
          <p v-if="lastCheckTime">อัพเดทล่าสุด: {{ formatTime(lastCheckTime) }}</p>
        </div>
      </div>

      <!-- Health Checks Grid -->
      <div class="health-grid">
        <div 
          v-for="check in healthChecks" 
          :key="check.component"
          class="health-card"
          :class="check.status"
        >
          <div class="health-header">
            <span class="health-name">{{ componentLabels[check.component] || check.component }}</span>
            <span class="health-badge" :class="check.status">{{ check.status }}</span>
          </div>
          <div class="health-details">
            <div v-if="check.response_time_ms" class="health-metric">
              <span class="metric-label">Response Time</span>
              <span class="metric-value">{{ check.response_time_ms }}ms</span>
            </div>
            <div v-for="(value, key) in check.details" :key="key" class="health-metric">
              <span class="metric-label">{{ formatDetailKey(key) }}</span>
              <span class="metric-value">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            @click="activeTab = tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
          >
            {{ tab.label }}
            <span v-if="tab.id === 'errors' && unresolvedErrorCount > 0" class="tab-badge">
              {{ unresolvedErrorCount }}
            </span>
          </button>
        </div>

        <!-- Error Logs Tab -->
        <div v-if="activeTab === 'errors'" class="tab-content">
          <div class="tab-header">
            <h3>Error Logs</h3>
            <div class="filter-group">
              <select v-model="errorFilter" class="filter-select">
                <option value="all">ทั้งหมด</option>
                <option value="unresolved">ยังไม่แก้ไข</option>
                <option value="resolved">แก้ไขแล้ว</option>
              </select>
            </div>
          </div>
          
          <div v-if="filteredErrors.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
            <p>ไม่มี Error Logs</p>
          </div>
          
          <div v-else class="error-list">
            <div 
              v-for="err in filteredErrors" 
              :key="err.id"
              class="error-item"
              :class="{ resolved: err.resolved }"
            >
              <div class="error-header">
                <span class="error-type">{{ err.error_type }}</span>
                <span class="error-time">{{ formatDateTime(err.created_at) }}</span>
              </div>
              <p class="error-message">{{ err.error_message }}</p>
              <div v-if="err.request_path" class="error-path">
                Path: {{ err.request_path }}
              </div>
              <div class="error-actions">
                <button 
                  v-if="!err.resolved"
                  @click="handleResolveError(err.id)"
                  class="btn-resolve"
                >
                  Mark Resolved
                </button>
                <span v-else class="resolved-badge">Resolved</span>
              </div>
            </div>
          </div>
        </div>

        <!-- System Config Tab -->
        <div v-if="activeTab === 'config'" class="tab-content">
          <div class="tab-header">
            <h3>System Configuration</h3>
          </div>
          
          <div class="config-list">
            <div v-for="config in systemConfigs" :key="config.key" class="config-item">
              <div class="config-header">
                <span class="config-key">{{ config.key }}</span>
                <button @click="editConfig(config)" class="btn-edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
              <p class="config-description">{{ config.description }}</p>
              <div class="config-value">
                <code>{{ JSON.stringify(config.value) }}</code>
              </div>
              <div class="config-meta">
                อัพเดทล่าสุด: {{ formatDateTime(config.updated_at) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Cleanup Results Tab -->
        <div v-if="activeTab === 'cleanup'" class="tab-content">
          <div class="tab-header">
            <h3>Cleanup Results</h3>
          </div>
          
          <div v-if="cleanupResults.length === 0" class="empty-state">
            <p>ยังไม่มีการ Cleanup</p>
            <button @click="runCleanup" class="btn-primary">Run Cleanup Now</button>
          </div>
          
          <div v-else class="cleanup-results">
            <div v-for="result in cleanupResults" :key="result.table_name" class="cleanup-item">
              <span class="cleanup-table">{{ result.table_name }}</span>
              <span class="cleanup-count">{{ result.rows_deleted }} rows deleted</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit Config Modal -->
      <div v-if="editingConfig" class="modal-overlay" @click.self="editingConfig = null">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Edit Configuration</h3>
            <button @click="editingConfig = null" class="btn-close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Key</label>
              <input type="text" :value="editingConfig.key" disabled class="input-disabled" />
            </div>
            <div class="form-group">
              <label>Value (JSON)</label>
              <textarea v-model="editConfigValue" rows="4" class="input-textarea"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="editingConfig = null" class="btn-secondary">ยกเลิก</button>
            <button @click="saveConfig" class="btn-primary">บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
/**
 * Admin System Health View (F251)
 * Dashboard สำหรับตรวจสอบสุขภาพระบบ
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useSystemHealth, type SystemConfig } from '../composables/useSystemHealth'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const {
  healthChecks,
  errorLogs,
  systemConfigs,
  loading,
  lastCheckTime,
  overallStatus,
  unresolvedErrorCount,
  checkHealth,
  fetchErrorLogs,
  resolveError,
  fetchConfigs,
  updateConfig,
  runCleanup: executeCleanup,
  startPeriodicChecks,
  stopPeriodicChecks
} = useSystemHealth()

const activeTab = ref('errors')
const errorFilter = ref('all')
const cleanupLoading = ref(false)
const cleanupResults = ref<{ table_name: string; rows_deleted: number }[]>([])
const editingConfig = ref<SystemConfig | null>(null)
const editConfigValue = ref('')

const tabs = [
  { id: 'errors', label: 'Error Logs' },
  { id: 'config', label: 'System Config' },
  { id: 'cleanup', label: 'Cleanup' }
]

const statusLabels: Record<string, string> = {
  healthy: 'ระบบทำงานปกติ',
  degraded: 'ระบบทำงานช้า',
  unhealthy: 'ระบบมีปัญหา',
  unknown: 'กำลังตรวจสอบ...'
}

const componentLabels: Record<string, string> = {
  database: 'Database',
  connections: 'Connections',
  pending_rides: 'Pending Rides',
  online_providers: 'Online Providers'
}

const filteredErrors = computed(() => {
  if (errorFilter.value === 'all') return errorLogs.value
  if (errorFilter.value === 'resolved') return errorLogs.value.filter(e => e.resolved)
  return errorLogs.value.filter(e => !e.resolved)
})

const refreshHealth = async () => {
  await checkHealth()
  await fetchErrorLogs()
}

const runCleanup = async () => {
  cleanupLoading.value = true
  try {
    cleanupResults.value = await executeCleanup()
    activeTab.value = 'cleanup'
  } finally {
    cleanupLoading.value = false
  }
}

const handleResolveError = async (errorId: string) => {
  await resolveError(errorId)
}

const editConfig = (config: SystemConfig) => {
  editingConfig.value = config
  editConfigValue.value = JSON.stringify(config.value, null, 2)
}

const saveConfig = async () => {
  if (!editingConfig.value || !authStore.user?.id) return
  
  try {
    const value = JSON.parse(editConfigValue.value)
    await updateConfig(editingConfig.value.key, value, authStore.user.id)
    await fetchConfigs()
    editingConfig.value = null
  } catch (err) {
    alert('Invalid JSON format')
  }
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('th-TH')
}

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('th-TH')
}

const formatDetailKey = (key: string) => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

onMounted(async () => {
  await checkHealth()
  await fetchErrorLogs()
  await fetchConfigs()
  startPeriodicChecks(60000) // Check every minute
})

onUnmounted(() => {
  stopPeriodicChecks()
})
</script>

<style scoped>
.admin-system-health {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.page-subtitle {
  color: #666666;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-refresh, .btn-cleanup {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh {
  background: #F5F5F5;
  color: #1A1A1A;
}

.btn-cleanup {
  background: #00A86B;
  color: white;
}

.btn-refresh:hover { background: #E8E8E8; }
.btn-cleanup:hover { background: #008F5B; }
.btn-refresh:disabled, .btn-cleanup:disabled { opacity: 0.6; cursor: not-allowed; }

.icon {
  width: 18px;
  height: 18px;
}

/* Status Banner */
.status-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  margin-bottom: 24px;
}

.status-banner.healthy {
  background: linear-gradient(135deg, #E8F5EF 0%, #D4EDDA 100%);
}

.status-banner.degraded {
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
}

.status-banner.unhealthy {
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
}

.status-banner.unknown {
  background: linear-gradient(135deg, #F5F5F5 0%, #E0E0E0 100%);
}

.status-icon {
  width: 48px;
  height: 48px;
}

.status-icon svg {
  width: 100%;
  height: 100%;
}

.status-banner.healthy .status-icon { color: #00A86B; }
.status-banner.degraded .status-icon { color: #F5A623; }
.status-banner.unhealthy .status-icon { color: #E53935; }

.status-text h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #1A1A1A;
}

.status-text p {
  margin: 0;
  color: #666666;
  font-size: 14px;
}

/* Health Grid */
.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.health-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #F0F0F0;
  border-left: 4px solid;
}

.health-card.healthy { border-left-color: #00A86B; }
.health-card.degraded { border-left-color: #F5A623; }
.health-card.unhealthy { border-left-color: #E53935; }

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.health-name {
  font-weight: 600;
  color: #1A1A1A;
}

.health-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.health-badge.healthy { background: #E8F5EF; color: #00A86B; }
.health-badge.degraded { background: #FFF3E0; color: #F5A623; }
.health-badge.unhealthy { background: #FFEBEE; color: #E53935; }

.health-metric {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #F0F0F0;
}

.health-metric:last-child {
  border-bottom: none;
}

.metric-label {
  color: #666666;
  font-size: 14px;
}

.metric-value {
  font-weight: 600;
  color: #1A1A1A;
}

/* Tabs */
.tabs-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #F0F0F0;
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #F0F0F0;
}

.tab-btn {
  flex: 1;
  padding: 16px;
  background: none;
  border: none;
  font-weight: 600;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.tab-btn.active {
  color: #00A86B;
  border-bottom: 2px solid #00A86B;
}

.tab-badge {
  background: #E53935;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.tab-content {
  padding: 24px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tab-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1A1A1A;
}

.filter-select {
  padding: 8px 16px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
}

/* Error List */
.error-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-item {
  padding: 16px;
  background: #FAFAFA;
  border-radius: 12px;
  border-left: 4px solid #E53935;
}

.error-item.resolved {
  border-left-color: #00A86B;
  opacity: 0.7;
}

.error-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.error-type {
  font-weight: 600;
  color: #E53935;
}

.error-time {
  font-size: 12px;
  color: #999999;
}

.error-message {
  margin: 0 0 8px 0;
  color: #1A1A1A;
}

.error-path {
  font-size: 12px;
  color: #666666;
  font-family: monospace;
  margin-bottom: 12px;
}

.error-actions {
  display: flex;
  gap: 8px;
}

.btn-resolve {
  padding: 6px 12px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.resolved-badge {
  padding: 6px 12px;
  background: #E8F5EF;
  color: #00A86B;
  border-radius: 6px;
  font-size: 12px;
}

/* Config List */
.config-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-item {
  padding: 16px;
  background: #FAFAFA;
  border-radius: 12px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.config-key {
  font-weight: 600;
  color: #1A1A1A;
  font-family: monospace;
}

.btn-edit {
  padding: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666666;
}

.btn-edit:hover {
  color: #00A86B;
}

.btn-edit svg {
  width: 16px;
  height: 16px;
}

.config-description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666666;
}

.config-value {
  background: white;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.config-value code {
  font-size: 13px;
  color: #1A1A1A;
}

.config-meta {
  font-size: 12px;
  color: #999999;
}

/* Cleanup Results */
.cleanup-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cleanup-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: #E8F5EF;
  border-radius: 8px;
}

.cleanup-table {
  font-weight: 600;
  color: #1A1A1A;
}

.cleanup-count {
  color: #00A86B;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px;
  color: #666666;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  color: #00A86B;
}

/* Modal */
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
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #F0F0F0;
}

.modal-header h3 {
  margin: 0;
}

.btn-close {
  padding: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666666;
}

.btn-close svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #1A1A1A;
}

.input-disabled {
  width: 100%;
  padding: 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  background: #F5F5F5;
  color: #666666;
}

.input-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-family: monospace;
  resize: vertical;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #F0F0F0;
}

.btn-primary {
  padding: 12px 24px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  padding: 12px 24px;
  background: #F5F5F5;
  color: #1A1A1A;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
</style>
