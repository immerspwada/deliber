<template>
  <AdminLayout>
    <div class="admin-error-recovery-view">
      <!-- Header -->
      <div class="header-section">
        <div class="header-content">
          <h1 class="page-title">Error Recovery Management</h1>
          <p class="page-subtitle">จัดการและตรวจสอบระบบการกู้คืนข้อผิดพลาดอัตโนมัติ</p>
        </div>
        <div class="header-actions">
          <button 
            @click="refreshData" 
            :disabled="loading"
            class="btn-refresh"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            รีเฟรช
          </button>
          <button 
            @click="showSettings = true" 
            class="btn-settings"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            ตั้งค่า
          </button>
        </div>
      </div>

      <!-- Recovery Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <h3>Total Errors</h3>
            <div class="stat-icon total">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ recoveryStats.totalErrors }}</div>
          <div class="stat-change negative">+8% จากเมื่อวาน</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <h3>Recovered Errors</h3>
            <div class="stat-icon recovered">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ recoveryStats.recoveredErrors }}</div>
          <div class="stat-change positive">+12% จากเมื่อวาน</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <h3>Critical Errors</h3>
            <div class="stat-icon critical">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ recoveryStats.criticalErrors }}</div>
          <div class="stat-change negative">-2 จากเมื่อวาน</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <h3>Recovery Rate</h3>
            <div class="stat-icon rate">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ recoveryStats.recoveryRate }}%</div>
          <div class="stat-change positive">+3.2% จากเมื่อวาน</div>
        </div>
      </div>

      <!-- Error Types Chart -->
      <div class="chart-section">
        <h2 class="section-title">Error Types Distribution</h2>
        <div class="error-types-chart">
          <div class="chart-container">
            <div class="error-type-item" v-for="errorType in errorTypes" :key="errorType.type">
              <div class="error-type-info">
                <div class="error-type-label">{{ errorType.label }}</div>
                <div class="error-type-count">{{ errorType.count }} errors</div>
              </div>
              <div class="error-type-bar">
                <div 
                  class="error-type-fill" 
                  :style="{ width: `${errorType.percentage}%` }"
                  :class="errorType.type.toLowerCase()"
                ></div>
              </div>
              <div class="error-type-percentage">{{ errorType.percentage }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recovery Strategies -->
      <div class="strategies-section">
        <h2 class="section-title">Recovery Strategies Performance</h2>
        <div class="strategies-grid">
          <div class="strategy-card" v-for="strategy in recoveryStrategies" :key="strategy.name">
            <div class="strategy-header">
              <h3>{{ strategy.label }}</h3>
              <div class="strategy-success-rate" :class="getSuccessRateClass(strategy.successRate)">
                {{ strategy.successRate }}%
              </div>
            </div>
            <div class="strategy-stats">
              <div class="strategy-stat">
                <span class="stat-label">Total Attempts</span>
                <span class="stat-value">{{ strategy.totalAttempts }}</span>
              </div>
              <div class="strategy-stat">
                <span class="stat-label">Successful</span>
                <span class="stat-value">{{ strategy.successful }}</span>
              </div>
              <div class="strategy-stat">
                <span class="stat-label">Avg Duration</span>
                <span class="stat-value">{{ strategy.avgDuration }}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Error Logs -->
      <div class="logs-section">
        <div class="logs-header">
          <h2 class="section-title">Recent Error Recovery Logs</h2>
          <div class="logs-filters">
            <select v-model="selectedErrorType" @change="loadErrorLogs">
              <option value="">All Error Types</option>
              <option value="NETWORK">Network</option>
              <option value="VALIDATION">Validation</option>
              <option value="SERVER">Server</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
            <select v-model="selectedRecoveryStatus" @change="loadErrorLogs">
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
        
        <div class="logs-table">
          <div class="table-header">
            <div class="header-cell">Time</div>
            <div class="header-cell">Error Type</div>
            <div class="header-cell">Message</div>
            <div class="header-cell">Strategy</div>
            <div class="header-cell">Attempts</div>
            <div class="header-cell">Status</div>
          </div>
          <div class="table-body">
            <div 
              v-for="log in errorLogs" 
              :key="log.id"
              class="table-row"
            >
              <div class="cell time-cell">
                {{ formatTime(log.created_at) }}
              </div>
              <div class="cell">
                <div class="error-type-badge" :class="log.error_type.toLowerCase()">
                  {{ log.error_type }}
                </div>
              </div>
              <div class="cell message-cell">
                <div class="error-message">{{ log.error_message }}</div>
              </div>
              <div class="cell">
                <div class="strategy-badge">{{ log.recovery_strategy }}</div>
              </div>
              <div class="cell">
                <div class="attempts-badge">{{ log.attempts }}</div>
              </div>
              <div class="cell">
                <div class="status-badge" :class="log.recovery_status">
                  {{ getStatusLabel(log.recovery_status) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div v-if="showSettings" class="modal-overlay" @click="showSettings = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Error Recovery Settings</h3>
            <button @click="showSettings = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="setting-group">
              <label>Max Retry Attempts</label>
              <input 
                v-model.number="settings.maxRetryAttempts" 
                type="number" 
                min="1" 
                max="10"
                class="setting-input"
              >
            </div>
            <div class="setting-group">
              <label>Retry Delay (ms)</label>
              <input 
                v-model.number="settings.retryDelay" 
                type="number" 
                min="100" 
                max="10000"
                class="setting-input"
              >
            </div>
            <div class="setting-group">
              <label>Circuit Breaker Threshold</label>
              <input 
                v-model.number="settings.circuitBreakerThreshold" 
                type="number" 
                min="1" 
                max="20"
                class="setting-input"
              >
            </div>
            <div class="setting-group">
              <label>Enable Auto Recovery</label>
              <div class="toggle-switch">
                <input 
                  v-model="settings.enableAutoRecovery" 
                  type="checkbox" 
                  id="autoRecovery"
                >
                <label for="autoRecovery" class="toggle-label"></label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showSettings = false" class="btn-cancel">ยกเลิก</button>
            <button @click="saveSettings" class="btn-save">บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
/**
 * Admin Error Recovery View (F236)
 * จัดการและตรวจสอบระบบการกู้คืนข้อผิดพลาดอัตโนมัติ
 */
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { 
  fetchErrorRecoveryStats, 
  fetchErrorRecoveryLogs, 
  updateErrorRecoverySettings
} from '../composables/useAdmin'

const loading = ref(false)
const showSettings = ref(false)
const selectedErrorType = ref('')
const selectedRecoveryStatus = ref('')

const recoveryStats = ref({
  totalErrors: 156,
  recoveredErrors: 142,
  criticalErrors: 8,
  recoveryRate: 91.0
})

const errorTypes = ref([
  { type: 'NETWORK', label: 'Network Errors', count: 45, percentage: 65 },
  { type: 'VALIDATION', label: 'Validation Errors', count: 23, percentage: 35 },
  { type: 'SERVER', label: 'Server Errors', count: 18, percentage: 28 },
  { type: 'AUTHENTICATION', label: 'Auth Errors', count: 12, percentage: 18 }
])

const recoveryStrategies = ref([
  {
    name: 'retry',
    label: 'Retry Strategy',
    successRate: 85,
    totalAttempts: 120,
    successful: 102,
    avgDuration: 1250
  },
  {
    name: 'fallback',
    label: 'Fallback Strategy',
    successRate: 95,
    totalAttempts: 45,
    successful: 43,
    avgDuration: 350
  },
  {
    name: 'redirect',
    label: 'Redirect Strategy',
    successRate: 100,
    totalAttempts: 15,
    successful: 15,
    avgDuration: 150
  },
  {
    name: 'ignore',
    label: 'Ignore Strategy',
    successRate: 100,
    totalAttempts: 8,
    successful: 8,
    avgDuration: 50
  }
])

const errorLogs = ref<any[]>([])

const settings = ref({
  maxRetryAttempts: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  enableAutoRecovery: true
})

const refreshData = async () => {
  loading.value = true
  try {
    const [stats, logs] = await Promise.all([
      fetchErrorRecoveryStats(),
      fetchErrorRecoveryLogs(1, 50, {
        errorType: selectedErrorType.value || undefined,
        recoveryStatus: selectedRecoveryStatus.value || undefined
      })
    ])
    
    recoveryStats.value = stats
    errorLogs.value = logs.data
  } finally {
    loading.value = false
  }
}

const loadErrorLogs = async () => {
  const logs = await fetchErrorRecoveryLogs(1, 50, {
    errorType: selectedErrorType.value || undefined,
    recoveryStatus: selectedRecoveryStatus.value || undefined
  })
  errorLogs.value = logs.data
}

const saveSettings = async () => {
  const result = await updateErrorRecoverySettings(settings.value)
  if (result.success) {
    showSettings.value = false
    // Show success message
  }
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getSuccessRateClass = (rate: number) => {
  if (rate >= 95) return 'excellent'
  if (rate >= 85) return 'good'
  if (rate >= 70) return 'fair'
  return 'poor'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    success: 'สำเร็จ',
    failed: 'ล้มเหลว',
    pending: 'รอดำเนินการ'
  }
  return labels[status] || status
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.admin-error-recovery-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #F0F0F0;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.page-subtitle {
  color: #666666;
  font-size: 16px;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-refresh, .btn-settings {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-refresh {
  background-color: #F5F5F5;
  color: #1A1A1A;
}

.btn-refresh:hover {
  background-color: #E8E8E8;
}

.btn-settings {
  background-color: #00A86B;
  color: white;
}

.btn-settings:hover {
  background-color: #008F5B;
}

.icon {
  width: 18px;
  height: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #F0F0F0;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stat-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin: 0;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 20px;
  height: 20px;
}

.stat-icon.total { background-color: #FFEBEE; color: #E53935; }
.stat-icon.recovered { background-color: #E8F5EF; color: #00A86B; }
.stat-icon.critical { background-color: #FFF3E0; color: #F57C00; }
.stat-icon.rate { background-color: #E3F2FD; color: #1976D2; }

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.stat-change {
  font-size: 14px;
  font-weight: 600;
}

.stat-change.positive { color: #00A86B; }
.stat-change.negative { color: #E53935; }

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 20px 0;
}

.chart-section {
  margin-bottom: 32px;
}

.error-types-chart {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #F0F0F0;
}

.error-type-item {
  display: grid;
  grid-template-columns: 2fr 3fr 1fr;
  gap: 16px;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #F0F0F0;
}

.error-type-item:last-child {
  border-bottom: none;
}

.error-type-label {
  font-weight: 600;
  color: #1A1A1A;
}

.error-type-count {
  font-size: 14px;
  color: #666666;
}

.error-type-bar {
  height: 8px;
  background-color: #F0F0F0;
  border-radius: 4px;
  overflow: hidden;
}

.error-type-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.error-type-fill.network { background-color: #E53935; }
.error-type-fill.validation { background-color: #F57C00; }
.error-type-fill.server { background-color: #1976D2; }
.error-type-fill.authentication { background-color: #7B1FA2; }

.error-type-percentage {
  font-weight: 600;
  color: #1A1A1A;
  text-align: right;
}

.strategies-section {
  margin-bottom: 32px;
}

.strategies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.strategy-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #F0F0F0;
}

.strategy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.strategy-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.strategy-success-rate {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 14px;
}

.strategy-success-rate.excellent { background-color: #E8F5EF; color: #00A86B; }
.strategy-success-rate.good { background-color: #E3F2FD; color: #1976D2; }
.strategy-success-rate.fair { background-color: #FFF3E0; color: #F57C00; }
.strategy-success-rate.poor { background-color: #FFEBEE; color: #E53935; }

.strategy-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strategy-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #666666;
}

.stat-value {
  font-weight: 600;
  color: #1A1A1A;
}

.logs-section {
  margin-bottom: 32px;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.logs-filters {
  display: flex;
  gap: 12px;
}

.logs-filters select {
  padding: 8px 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  background: white;
  color: #1A1A1A;
}

.logs-table {
  background: white;
  border-radius: 16px;
  border: 1px solid #F0F0F0;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px 24px;
  background-color: #F5F5F5;
  border-bottom: 1px solid #F0F0F0;
}

.header-cell {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
}

.table-body {
  max-height: 400px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #F0F0F0;
  align-items: center;
}

.table-row:hover {
  background-color: #F9F9F9;
}

.time-cell {
  font-size: 14px;
  color: #666666;
}

.error-type-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.error-type-badge.network { background-color: #FFEBEE; color: #E53935; }
.error-type-badge.validation { background-color: #FFF3E0; color: #F57C00; }
.error-type-badge.server { background-color: #E3F2FD; color: #1976D2; }
.error-type-badge.authentication { background-color: #F3E5F5; color: #7B1FA2; }

.message-cell {
  max-width: 300px;
}

.error-message {
  font-size: 14px;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strategy-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background-color: #F0F0F0;
  color: #666666;
}

.attempts-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background-color: #E3F2FD;
  color: #1976D2;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.success { background-color: #E8F5EF; color: #00A86B; }
.status-badge.failed { background-color: #FFEBEE; color: #E53935; }
.status-badge.pending { background-color: #FFF3E0; color: #F57C00; }

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
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
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #F0F0F0;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background-color: #F0F0F0;
}

.close-btn svg {
  width: 16px;
  height: 16px;
}

.modal-body {
  padding: 24px;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group label {
  display: block;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.setting-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
}

.setting-input:focus {
  outline: none;
  border-color: #00A86B;
}

.toggle-switch {
  position: relative;
}

.toggle-switch input[type="checkbox"] {
  display: none;
}

.toggle-label {
  display: block;
  width: 48px;
  height: 24px;
  background-color: #E8E8E8;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s ease;
}

.toggle-label::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-label {
  background-color: #00A86B;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-label::after {
  transform: translateX(24px);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #F0F0F0;
}

.btn-cancel, .btn-save {
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.btn-cancel {
  background-color: #F5F5F5;
  color: #1A1A1A;
}

.btn-save {
  background-color: #00A86B;
  color: white;
}

.btn-cancel:hover {
  background-color: #E8E8E8;
}

.btn-save:hover {
  background-color: #008F5B;
}
</style>