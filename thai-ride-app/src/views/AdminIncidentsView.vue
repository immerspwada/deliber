<script setup lang="ts">
/**
 * Admin Incidents View
 * Incident management and tracking
 */
import { ref, onMounted, onUnmounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useIncidentManagement, type Incident } from '../composables/useIncidentManagement'

const {
  incidents,
  onCallTeam,
  stats,
  loading,
  openIncidents,
  criticalIncidents,
  fetchIncidents,
  createIncident,
  updateStatus,
  fetchOnCall,
  fetchStats
} = useIncidentManagement()

const activeTab = ref<'active' | 'all' | 'stats'>('active')
const showCreateModal = ref(false)
const newIncident = ref({
  title: '',
  description: '',
  severity: 'medium' as Incident['severity'],
  affectedServices: [] as string[]
})

const adminId = localStorage.getItem('admin_token') || 'admin'
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await Promise.all([
    fetchIncidents(),
    fetchOnCall(),
    fetchStats()
  ])
  
  // Auto-refresh every 30 seconds
  refreshInterval = setInterval(() => {
    fetchIncidents()
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

const handleCreate = async () => {
  if (!newIncident.value.title) return
  
  await createIncident({
    title: newIncident.value.title,
    description: newIncident.value.description,
    severity: newIncident.value.severity,
    affectedServices: newIncident.value.affectedServices,
    createdBy: adminId
  })
  
  showCreateModal.value = false
  newIncident.value = { title: '', description: '', severity: 'medium', affectedServices: [] }
}

const handleStatusUpdate = async (incident: Incident, status: Incident['status']) => {
  await updateStatus(incident.id, status, `Status updated to ${status}`, adminId)
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#E53935'
    case 'high': return '#F5A623'
    case 'medium': return '#2196F3'
    default: return '#666'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'resolved': return '#00A86B'
    case 'monitoring': return '#2196F3'
    case 'identified': return '#F5A623'
    case 'investigating': return '#FF9800'
    default: return '#E53935'
  }
}

const formatDuration = (minutes?: number) => {
  if (!minutes) return '-'
  if (minutes < 60) return `${Math.round(minutes)}m`
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`
}

const formatTime = (date: string) => new Date(date).toLocaleString('th-TH')
</script>

<template>
  <AdminLayout>
    <div class="incidents-view">
      <header class="page-header">
        <div class="header-content">
          <h1>Incident Management</h1>
          <p>จัดการ Incidents และติดตามสถานะ</p>
        </div>
        <div class="header-actions">
          <div v-if="onCallTeam.length > 0" class="oncall-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72"/>
            </svg>
            On-Call: {{ onCallTeam[0]?.user_name }}
          </div>
          <button class="btn-primary" @click="showCreateModal = true">
            + New Incident
          </button>
        </div>
      </header>

      <!-- Stats Cards -->
      <div class="stats-row">
        <div class="stat-card" :class="{ danger: criticalIncidents.length > 0 }">
          <span class="stat-value">{{ openIncidents.length }}</span>
          <span class="stat-label">Open</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats?.resolved_incidents || 0 }}</span>
          <span class="stat-label">Resolved (30d)</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ formatDuration(stats?.mttr_minutes) }}</span>
          <span class="stat-label">MTTR</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          :class="['tab', { active: activeTab === 'active' }]"
          @click="activeTab = 'active'"
        >
          Active
          <span v-if="openIncidents.length > 0" class="badge">{{ openIncidents.length }}</span>
        </button>
        <button 
          :class="['tab', { active: activeTab === 'all' }]"
          @click="activeTab = 'all'"
        >
          All Incidents
        </button>
        <button 
          :class="['tab', { active: activeTab === 'stats' }]"
          @click="activeTab = 'stats'"
        >
          Statistics
        </button>
      </div>

      <!-- Active Incidents -->
      <div v-if="activeTab === 'active'" class="tab-content">
        <div v-if="openIncidents.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00A86B" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <p>ไม่มี Incident ที่ต้องดำเนินการ</p>
        </div>
        
        <div v-else class="incident-list">
          <div 
            v-for="incident in openIncidents" 
            :key="incident.id"
            class="incident-card"
            :class="incident.severity"
          >
            <div class="incident-header">
              <span 
                class="severity-badge"
                :style="{ background: getSeverityColor(incident.severity) }"
              >
                {{ incident.severity.toUpperCase() }}
              </span>
              <span 
                class="status-badge"
                :style="{ background: getStatusColor(incident.status) }"
              >
                {{ incident.status }}
              </span>
              <span class="incident-time">{{ formatTime(incident.started_at) }}</span>
            </div>
            <h3>#{{ incident.incident_number }} - {{ incident.title }}</h3>
            <p v-if="incident.description">{{ incident.description }}</p>
            <div v-if="incident.affected_services?.length" class="affected-services">
              <span v-for="service in incident.affected_services" :key="service" class="service-tag">
                {{ service }}
              </span>
            </div>
            <div class="incident-actions">
              <button 
                v-if="incident.status === 'open'"
                class="btn-small"
                @click="handleStatusUpdate(incident, 'investigating')"
              >
                Investigating
              </button>
              <button 
                v-if="incident.status === 'investigating'"
                class="btn-small"
                @click="handleStatusUpdate(incident, 'identified')"
              >
                Identified
              </button>
              <button 
                v-if="incident.status === 'identified'"
                class="btn-small"
                @click="handleStatusUpdate(incident, 'monitoring')"
              >
                Monitoring
              </button>
              <button 
                class="btn-small success"
                @click="handleStatusUpdate(incident, 'resolved')"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- All Incidents -->
      <div v-if="activeTab === 'all'" class="tab-content">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="incident in incidents" :key="incident.id">
              <td>{{ incident.incident_number }}</td>
              <td>{{ incident.title }}</td>
              <td>
                <span 
                  class="severity-badge small"
                  :style="{ background: getSeverityColor(incident.severity) }"
                >
                  {{ incident.severity }}
                </span>
              </td>
              <td>
                <span 
                  class="status-badge small"
                  :style="{ background: getStatusColor(incident.status) }"
                >
                  {{ incident.status }}
                </span>
              </td>
              <td>{{ formatDuration(incident.duration_minutes) }}</td>
              <td>{{ formatTime(incident.started_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Statistics -->
      <div v-if="activeTab === 'stats'" class="tab-content">
        <div class="stats-grid">
          <div class="stat-box">
            <h4>Total Incidents (30d)</h4>
            <span class="big-number">{{ stats?.total_incidents || 0 }}</span>
          </div>
          <div class="stat-box">
            <h4>Mean Time to Resolve</h4>
            <span class="big-number">{{ formatDuration(stats?.mttr_minutes) }}</span>
          </div>
          <div class="stat-box">
            <h4>By Severity</h4>
            <div v-if="stats?.by_severity" class="severity-breakdown">
              <div v-for="(count, sev) in stats.by_severity" :key="sev" class="severity-item">
                <span 
                  class="severity-dot"
                  :style="{ background: getSeverityColor(sev as string) }"
                ></span>
                {{ sev }}: {{ count }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Modal -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal">
          <h2>New Incident</h2>
          <div class="form-group">
            <label>Title</label>
            <input v-model="newIncident.title" type="text" placeholder="Incident title" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="newIncident.description" placeholder="Description"></textarea>
          </div>
          <div class="form-group">
            <label>Severity</label>
            <select v-model="newIncident.severity">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="showCreateModal = false">Cancel</button>
            <button class="btn-primary" @click="handleCreate">Create</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.incidents-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
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

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.oncall-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #E8F5EF;
  color: #00A86B;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.btn-primary {
  padding: 10px 20px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
}

.stat-card.danger {
  background: #FFEBEE;
}

.stat-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
}

.stat-label {
  color: #666;
  font-size: 13px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 12px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
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

.tab .badge {
  background: #E53935;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.incident-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.incident-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  border-left: 4px solid;
}

.incident-card.critical {
  border-left-color: #E53935;
}

.incident-card.high {
  border-left-color: #F5A623;
}

.incident-card.medium {
  border-left-color: #2196F3;
}

.incident-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.severity-badge, .status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  color: white;
  font-size: 11px;
  font-weight: 600;
}

.severity-badge.small, .status-badge.small {
  padding: 2px 8px;
  font-size: 10px;
}

.incident-time {
  color: #666;
  font-size: 13px;
  margin-left: auto;
}

.incident-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
}

.incident-card p {
  color: #666;
  margin: 0 0 12px;
  font-size: 14px;
}

.affected-services {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.service-tag {
  padding: 4px 10px;
  background: #f5f5f5;
  border-radius: 12px;
  font-size: 12px;
}

.incident-actions {
  display: flex;
  gap: 8px;
}

.btn-small {
  padding: 6px 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.btn-small.success {
  background: #00A86B;
  color: white;
}

.data-table {
  width: 100%;
  background: white;
  border-radius: 16px;
  overflow: hidden;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.data-table th {
  background: #f9f9f9;
  font-weight: 600;
  color: #666;
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.stat-box {
  background: white;
  border-radius: 16px;
  padding: 20px;
}

.stat-box h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #666;
}

.big-number {
  font-size: 36px;
  font-weight: 700;
}

.severity-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.severity-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.severity-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 20px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
}

.modal h2 {
  margin: 0 0 20px;
  font-size: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  font-size: 14px;
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-secondary {
  padding: 10px 20px;
  background: #f5f5f5;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}
</style>
