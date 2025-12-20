<script setup lang="ts">
/**
 * Admin Deployment View
 * Deployment management, rollback, maintenance mode
 */
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useDeployment, type Deployment, type MaintenanceWindow } from '../composables/useDeployment'
import { runHealthChecks, type SystemHealth } from '../lib/healthCheck'

const {
  deployments,
  currentDeployment,
  maintenanceWindows,
  isMaintenanceMode,
  loading,
  hasActiveDeployment,
  fetchDeployments,
  fetchCurrentDeployment,
  fetchMaintenanceWindows,
  checkMaintenanceMode,
  toggleMaintenanceWindow,
  rollbackDeployment
} = useDeployment()

const activeTab = ref<'deployments' | 'maintenance' | 'health'>('deployments')
const systemHealth = ref<SystemHealth | null>(null)
const healthLoading = ref(false)
const adminId = localStorage.getItem('admin_token') || 'admin'

onMounted(async () => {
  await Promise.all([
    fetchDeployments(),
    fetchCurrentDeployment(),
    fetchMaintenanceWindows(),
    checkMaintenanceMode(),
    refreshHealth()
  ])
})

const refreshHealth = async () => {
  healthLoading.value = true
  try {
    systemHealth.value = await runHealthChecks()
  } finally {
    healthLoading.value = false
  }
}

const handleRollback = async (deployment: Deployment) => {
  if (!currentDeployment.value) return
  if (!confirm(`ยืนยันการ Rollback ไปยัง version ${deployment.version}?`)) return
  
  await rollbackDeployment(currentDeployment.value.id, deployment.id, adminId)
}

const handleToggleMaintenance = async (window: MaintenanceWindow) => {
  await toggleMaintenanceWindow(window.id, !window.is_active)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': return '#00A86B'
    case 'deploying': return '#F5A623'
    case 'failed': case 'rolled_back': return '#E53935'
    default: return '#666'
  }
}

const getHealthColor = (status: string) => {
  switch (status) {
    case 'healthy': return '#00A86B'
    case 'degraded': return '#F5A623'
    case 'down': return '#E53935'
    default: return '#666'
  }
}

const formatTime = (date: string) => new Date(date).toLocaleString('th-TH')
</script>

<template>
  <AdminLayout>
    <div class="deployment-view">
      <header class="page-header">
        <div class="header-content">
          <h1>Deployment Management</h1>
          <p>จัดการ Deployment, Rollback, Maintenance Mode</p>
        </div>
        <div class="header-status">
          <div v-if="isMaintenanceMode" class="maintenance-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            Maintenance Mode
          </div>
          <div v-if="currentDeployment" class="current-version">
            v{{ currentDeployment.version }}
          </div>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          v-for="tab in ['deployments', 'maintenance', 'health']"
          :key="tab"
          :class="['tab', { active: activeTab === tab }]"
          @click="activeTab = tab as any"
        >
          {{ tab === 'deployments' ? 'Deployments' : 
             tab === 'maintenance' ? 'Maintenance' : 'Health Check' }}
        </button>
      </div>

      <!-- Deployments Tab -->
      <div v-if="activeTab === 'deployments'" class="tab-content">
        <div class="card">
          <h3>Current Deployment</h3>
          <div v-if="currentDeployment" class="current-deployment">
            <div class="deploy-info">
              <span class="version">v{{ currentDeployment.version }}</span>
              <span 
                class="status-badge"
                :style="{ background: getStatusColor(currentDeployment.status) }"
              >
                {{ currentDeployment.status }}
              </span>
            </div>
            <div class="deploy-meta">
              <span v-if="currentDeployment.commit_hash">
                Commit: {{ currentDeployment.commit_hash?.slice(0, 7) }}
              </span>
              <span>Deployed: {{ formatTime(currentDeployment.completed_at || currentDeployment.started_at) }}</span>
            </div>
          </div>
          <div v-else class="empty">ไม่มีข้อมูล Deployment</div>
        </div>

        <div class="card">
          <h3>Deployment History</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Status</th>
                <th>Commit</th>
                <th>เวลา</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="deploy in deployments" :key="deploy.id">
                <td class="version-cell">v{{ deploy.version }}</td>
                <td>
                  <span 
                    class="status-badge small"
                    :style="{ background: getStatusColor(deploy.status) }"
                  >
                    {{ deploy.status }}
                  </span>
                </td>
                <td class="commit-cell">{{ deploy.commit_hash?.slice(0, 7) || '-' }}</td>
                <td>{{ formatTime(deploy.started_at) }}</td>
                <td>
                  <button 
                    v-if="deploy.status === 'success' && deploy.id !== currentDeployment?.id"
                    class="btn-rollback"
                    @click="handleRollback(deploy)"
                    :disabled="hasActiveDeployment"
                  >
                    Rollback
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Maintenance Tab -->
      <div v-if="activeTab === 'maintenance'" class="tab-content">
        <div class="card">
          <h3>Maintenance Windows</h3>
          <div class="maintenance-list">
            <div 
              v-for="window in maintenanceWindows" 
              :key="window.id"
              class="maintenance-card"
              :class="{ active: window.is_active }"
            >
              <div class="maintenance-header">
                <h4>{{ window.title }}</h4>
                <label class="toggle">
                  <input 
                    type="checkbox" 
                    :checked="window.is_active"
                    @change="handleToggleMaintenance(window)"
                  />
                  <span class="slider"></span>
                </label>
              </div>
              <p v-if="window.description">{{ window.description }}</p>
              <div class="maintenance-time">
                <span>Start: {{ formatTime(window.start_time) }}</span>
                <span>End: {{ formatTime(window.end_time) }}</span>
              </div>
              <div v-if="window.affected_services?.length" class="affected-services">
                <span v-for="service in window.affected_services" :key="service" class="service-tag">
                  {{ service }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Health Tab -->
      <div v-if="activeTab === 'health'" class="tab-content">
        <div class="card">
          <div class="health-header">
            <h3>System Health</h3>
            <button class="btn-refresh" @click="refreshHealth" :disabled="healthLoading">
              {{ healthLoading ? 'Checking...' : 'Refresh' }}
            </button>
          </div>
          
          <div v-if="systemHealth" class="health-status">
            <div 
              class="overall-status"
              :style="{ background: getHealthColor(systemHealth.overall) }"
            >
              {{ systemHealth.overall.toUpperCase() }}
            </div>
            
            <div class="services-grid">
              <div 
                v-for="service in systemHealth.services" 
                :key="service.service"
                class="service-card"
              >
                <div class="service-header">
                  <span class="service-name">{{ service.service }}</span>
                  <span 
                    class="service-status"
                    :style="{ color: getHealthColor(service.status) }"
                  >
                    {{ service.status }}
                  </span>
                </div>
                <div class="service-meta">
                  <span>{{ service.responseTime }}ms</span>
                </div>
                <div v-if="service.message" class="service-error">
                  {{ service.message }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.deployment-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px;
}

.header-content p {
  color: #666;
  margin: 0;
}

.header-status {
  display: flex;
  gap: 12px;
  align-items: center;
}

.maintenance-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #FFF8E1;
  color: #F5A623;
  border-radius: 12px;
  font-weight: 600;
  font-size: 13px;
}

.current-version {
  padding: 8px 16px;
  background: #E8F5EF;
  color: #00A86B;
  border-radius: 12px;
  font-weight: 600;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 12px;
}

.tab {
  padding: 10px 20px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
}

.tab.active {
  background: #00A86B;
  color: white;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
}

.current-deployment {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 12px;
}

.deploy-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.version {
  font-size: 20px;
  font-weight: 700;
}

.deploy-meta {
  display: flex;
  gap: 16px;
  color: #666;
  font-size: 13px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.small {
  padding: 2px 8px;
  font-size: 11px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.data-table th {
  font-weight: 600;
  color: #666;
  font-size: 13px;
}

.version-cell {
  font-weight: 600;
}

.commit-cell {
  font-family: monospace;
  font-size: 13px;
}

.btn-rollback {
  padding: 6px 12px;
  background: #F5A623;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.btn-rollback:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.maintenance-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.maintenance-card {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 12px;
  border-left: 4px solid #e8e8e8;
}

.maintenance-card.active {
  border-left-color: #F5A623;
  background: #FFF8E1;
}

.maintenance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.maintenance-header h4 {
  margin: 0;
  font-size: 15px;
}

.maintenance-time {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
  margin-top: 8px;
}

.affected-services {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.service-tag {
  padding: 4px 10px;
  background: white;
  border-radius: 12px;
  font-size: 12px;
}

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.health-header h3 {
  margin: 0;
}

.btn-refresh {
  padding: 8px 16px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.overall-status {
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  color: white;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.service-card {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 12px;
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.service-name {
  font-weight: 600;
  text-transform: capitalize;
}

.service-status {
  font-weight: 600;
  font-size: 13px;
}

.service-meta {
  font-size: 13px;
  color: #666;
}

.service-error {
  margin-top: 8px;
  padding: 8px;
  background: #FFEBEE;
  color: #E53935;
  border-radius: 6px;
  font-size: 12px;
}

/* Toggle */
.toggle {
  position: relative;
  width: 48px;
  height: 26px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #ccc;
  border-radius: 26px;
  transition: 0.3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

input:checked + .slider {
  background: #00A86B;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.empty {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>
