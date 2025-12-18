<script setup lang="ts">
/**
 * Admin System Health View (F251)
 * ตรวจสอบสุขภาพระบบสำหรับ Admin
 */
import { ref, onMounted, onUnmounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { fetchSystemHealthStatus, fetchSystemHealthLogs, recordSystemHealthCheck } from '../composables/useAdmin'

interface HealthStatus {
  component: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  response_time: number
  error_message?: string
  checked_at: string
}

const loading = ref(false)
const healthStatus = ref<HealthStatus[]>([])
const healthLogs = ref<any[]>([])
const autoRefresh = ref(true)
let refreshInterval: ReturnType<typeof setInterval> | null = null

const statusColors: Record<string, string> = {
  healthy: '#00A86B',
  degraded: '#F59E0B',
  unhealthy: '#DC2626'
}

const statusLabels: Record<string, string> = {
  healthy: 'ปกติ',
  degraded: 'ช้า',
  unhealthy: 'มีปัญหา'
}

const componentLabels: Record<string, string> = {
  database: 'ฐานข้อมูล',
  api: 'API Server',
  storage: 'Storage',
  auth: 'Authentication',
  realtime: 'Realtime'
}

const loadHealthStatus = async () => {
  loading.value = true
  try {
    const [status, logs] = await Promise.all([
      fetchSystemHealthStatus(),
      fetchSystemHealthLogs(1, 20)
    ])
    healthStatus.value = status
    healthLogs.value = logs.data
  } finally {
    loading.value = false
  }
}

const runHealthCheck = async () => {
  loading.value = true
  try {
    // Simulate health checks for each component
    const components = ['database', 'api', 'storage', 'auth', 'realtime']
    for (const component of components) {
      const startTime = Date.now()
      // Simulate check
      await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50))
      const responseTime = Date.now() - startTime
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      if (responseTime > 300) status = 'degraded'
      if (responseTime > 500) status = 'unhealthy'
      
      await recordSystemHealthCheck({
        component,
        status,
        responseTime,
        errorMessage: status === 'unhealthy' ? 'High latency detected' : undefined
      })
    }
    await loadHealthStatus()
  } finally {
    loading.value = false
  }
}

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const startAutoRefresh = () => {
  if (refreshInterval) clearInterval(refreshInterval)
  refreshInterval = setInterval(loadHealthStatus, 30000) // Every 30 seconds
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

const overallStatus = () => {
  if (healthStatus.value.some(s => s.status === 'unhealthy')) return 'unhealthy'
  if (healthStatus.value.some(s => s.status === 'degraded')) return 'degraded'
  return 'healthy'
}

const formatTime = (date: string) => {
  return new Date(date).toLocaleString('th-TH', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

onMounted(() => {
  loadHealthStatus()
  if (autoRefresh.value) startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">สุขภาพระบบ</h1>
          <p class="page-subtitle">ตรวจสอบสถานะของระบบทั้งหมด</p>
        </div>
        <div class="header-actions">
          <button class="btn-toggle" :class="{ active: autoRefresh }" @click="toggleAutoRefresh">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {{ autoRefresh ? 'Auto Refresh: ON' : 'Auto Refresh: OFF' }}
          </button>
          <button class="btn-primary" @click="runHealthCheck" :disabled="loading">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            {{ loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบตอนนี้' }}
          </button>
        </div>
      </div>

      <!-- Overall Status -->
      <div class="overall-status" :class="overallStatus()">
        <div class="status-icon">
          <svg v-if="overallStatus() === 'healthy'" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <svg v-else-if="overallStatus() === 'degraded'" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <svg v-else width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="status-text">
          <div class="status-title">
            {{ overallStatus() === 'healthy' ? 'ระบบทำงานปกติ' : overallStatus() === 'degraded' ? 'ระบบทำงานช้า' : 'ระบบมีปัญหา' }}
          </div>
          <div class="status-subtitle">อัพเดทล่าสุด: {{ new Date().toLocaleString('th-TH') }}</div>
        </div>
      </div>

      <!-- Components Grid -->
      <div class="components-grid">
        <div v-for="status in healthStatus" :key="status.component" class="component-card" :class="status.status">
          <div class="component-header">
            <div class="component-name">{{ componentLabels[status.component] || status.component }}</div>
            <span class="status-badge" :style="{ background: statusColors[status.status] }">
              {{ statusLabels[status.status] }}
            </span>
          </div>
          <div class="component-metrics">
            <div class="metric">
              <span class="metric-label">Response Time</span>
              <span class="metric-value">{{ status.response_time }}ms</span>
            </div>
            <div class="metric">
              <span class="metric-label">ตรวจสอบล่าสุด</span>
              <span class="metric-value">{{ formatTime(status.checked_at) }}</span>
            </div>
          </div>
          <div v-if="status.error_message" class="error-message">
            {{ status.error_message }}
          </div>
        </div>
      </div>

      <!-- Recent Logs -->
      <div class="section">
        <h2 class="section-title">ประวัติการตรวจสอบ</h2>
        <div class="logs-table">
          <table>
            <thead>
              <tr>
                <th>เวลา</th>
                <th>Component</th>
                <th>สถานะ</th>
                <th>Response Time</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in healthLogs" :key="log.id">
                <td>{{ formatTime(log.checked_at) }}</td>
                <td>{{ componentLabels[log.component] || log.component }}</td>
                <td>
                  <span class="status-dot" :style="{ background: statusColors[log.status] }"></span>
                  {{ statusLabels[log.status] }}
                </td>
                <td>{{ log.response_time }}ms</td>
                <td>{{ log.error_message || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.page-title { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0; }
.page-subtitle { font-size: 14px; color: #666; margin: 4px 0 0; }
.header-actions { display: flex; gap: 12px; }

.btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #00A86B; color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: #008F5B; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }

.btn-toggle { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #f5f5f5; color: #666; border: none; border-radius: 12px; font-weight: 500; cursor: pointer; }
.btn-toggle.active { background: #E8F5EF; color: #00A86B; }

.overall-status { display: flex; align-items: center; gap: 20px; padding: 24px; border-radius: 20px; margin-bottom: 24px; }
.overall-status.healthy { background: linear-gradient(135deg, #E8F5EF 0%, #D1EBE1 100%); color: #00A86B; }
.overall-status.degraded { background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); color: #D97706; }
.overall-status.unhealthy { background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); color: #DC2626; }
.status-icon { flex-shrink: 0; }
.status-title { font-size: 20px; font-weight: 700; }
.status-subtitle { font-size: 14px; opacity: 0.8; margin-top: 4px; }

.components-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px; }
.component-card { background: white; padding: 20px; border-radius: 16px; border: 2px solid #f0f0f0; transition: border-color 0.2s; }
.component-card.healthy { border-color: #00A86B; }
.component-card.degraded { border-color: #F59E0B; }
.component-card.unhealthy { border-color: #DC2626; }
.component-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.component-name { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.status-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; color: white; }
.component-metrics { display: flex; flex-direction: column; gap: 8px; }
.metric { display: flex; justify-content: space-between; }
.metric-label { font-size: 13px; color: #666; }
.metric-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }
.error-message { margin-top: 12px; padding: 10px; background: #FEE2E2; border-radius: 8px; font-size: 13px; color: #DC2626; }

.section { margin-bottom: 32px; }
.section-title { font-size: 18px; font-weight: 600; margin: 0 0 16px; color: #1a1a1a; }

.logs-table { background: white; border-radius: 16px; overflow: hidden; border: 1px solid #f0f0f0; }
.logs-table table { width: 100%; border-collapse: collapse; }
.logs-table th, .logs-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; }
.logs-table th { font-size: 13px; font-weight: 600; color: #666; background: #f9f9f9; }
.logs-table td { font-size: 14px; color: #1a1a1a; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }

@media (max-width: 768px) {
  .page-header { flex-direction: column; }
  .header-actions { width: 100%; flex-direction: column; }
  .components-grid { grid-template-columns: 1fr; }
  .logs-table { overflow-x: auto; }
}
</style>
