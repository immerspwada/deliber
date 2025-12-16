<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAuditLog } from '../composables/useAuditLog'

const {
  loading,
  auditLogs,
  stats,
  fetchRecentLogs,
  fetchStats,
  getStatusLabel,
  getRoleLabel
} = useAuditLog()

const selectedEntityType = ref<string>('')
const selectedTimeRange = ref('7d')

const entityTypes = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'ride', label: 'เรียกรถ' },
  { value: 'delivery', label: 'ส่งของ' },
  { value: 'shopping', label: 'ซื้อของ' },
  { value: 'withdrawal', label: 'ถอนเงิน' }
]

const timeRanges = [
  { value: '1d', label: '24 ชั่วโมง' },
  { value: '7d', label: '7 วัน' },
  { value: '30d', label: '30 วัน' }
]

// Filter logs
const handleFilter = async () => {
  await fetchRecentLogs(100, selectedEntityType.value || undefined)
}

// Get entity type icon
const getEntityIcon = (type: string) => {
  switch (type) {
    case 'ride':
      return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>`
    case 'delivery':
      return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>`
    case 'shopping':
      return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>`
    case 'withdrawal':
      return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>`
    default:
      return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>`
  }
}

// Get role color
const getRoleColor = (role: string) => {
  switch (role) {
    case 'customer': return '#276EF1'
    case 'provider': return '#22C55E'
    case 'admin': return '#E11900'
    case 'system': return '#6B6B6B'
    default: return '#000'
  }
}

// Format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Stats summary
const statsSummary = computed(() => {
  const summary = {
    total: 0,
    byCustomer: 0,
    byProvider: 0,
    byAdmin: 0,
    bySystem: 0
  }
  
  stats.value.forEach(s => {
    summary.total += s.change_count
    summary.byCustomer += s.by_customer
    summary.byProvider += s.by_provider
    summary.byAdmin += s.by_admin
    summary.bySystem += s.by_system
  })
  
  return summary
})

onMounted(async () => {
  await Promise.all([
    fetchRecentLogs(100),
    fetchStats()
  ])
})
</script>

<template>
  <AdminLayout>
    <div class="audit-page">
      <div class="page-header">
        <h1>Audit Log</h1>
        <p>ประวัติการเปลี่ยนสถานะทั้งหมดในระบบ</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ statsSummary.total.toLocaleString() }}</div>
          <div class="stat-label">การเปลี่ยนสถานะทั้งหมด</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #276EF1">{{ statsSummary.byCustomer.toLocaleString() }}</div>
          <div class="stat-label">โดยลูกค้า</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #22C55E">{{ statsSummary.byProvider.toLocaleString() }}</div>
          <div class="stat-label">โดยผู้ให้บริการ</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: #E11900">{{ statsSummary.byAdmin.toLocaleString() }}</div>
          <div class="stat-label">โดยแอดมิน</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-row">
        <select v-model="selectedEntityType" @change="handleFilter" class="filter-select">
          <option v-for="type in entityTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
        <select v-model="selectedTimeRange" class="filter-select">
          <option v-for="range in timeRanges" :key="range.value" :value="range.value">
            {{ range.label }}
          </option>
        </select>
      </div>

      <!-- Audit Log List -->
      <div class="audit-list">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>กำลังโหลด...</span>
        </div>

        <div v-else-if="auditLogs.length === 0" class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p>ไม่มีประวัติการเปลี่ยนสถานะ</p>
        </div>

        <div v-else class="log-items">
          <div v-for="log in auditLogs" :key="log.id" class="log-item">
            <div class="log-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="getEntityIcon(log.entity_type)"></svg>
            </div>
            
            <div class="log-content">
              <div class="log-header">
                <span class="entity-type">{{ log.entity_type.toUpperCase() }}</span>
                <span v-if="log.tracking_id" class="tracking-id">{{ log.tracking_id }}</span>
              </div>
              
              <div class="status-change">
                <span v-if="log.old_status" class="old-status">{{ getStatusLabel(log.old_status) }}</span>
                <svg v-if="log.old_status" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
                <span class="new-status">{{ getStatusLabel(log.new_status) }}</span>
              </div>
              
              <div class="log-meta">
                <span 
                  class="changed-by"
                  :style="{ color: getRoleColor(log.changed_by_role) }"
                >
                  {{ log.changed_by_name || getRoleLabel(log.changed_by_role) }}
                </span>
                <span class="log-time">{{ formatDate(log.created_at) }}</span>
              </div>
              
              <div v-if="log.reason" class="log-reason">
                เหตุผล: {{ log.reason }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.audit-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.page-header p {
  color: #6B6B6B;
  font-size: 14px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #6B6B6B;
}

/* Filters */
.filters-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: #000;
}

/* Audit List */
.audit-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6B6B6B;
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.log-items {
  max-height: 600px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #F6F6F6;
  transition: background 0.2s;
}

.log-item:hover {
  background: #FAFAFA;
}

.log-item:last-child {
  border-bottom: none;
}

.log-icon {
  width: 40px;
  height: 40px;
  background: #F6F6F6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.log-icon svg {
  width: 20px;
  height: 20px;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.entity-type {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: #F6F6F6;
  border-radius: 4px;
}

.tracking-id {
  font-size: 12px;
  color: #6B6B6B;
  font-family: monospace;
}

.status-change {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.old-status {
  color: #6B6B6B;
  font-size: 14px;
}

.new-status {
  font-weight: 600;
  font-size: 14px;
}

.log-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.changed-by {
  font-weight: 500;
}

.log-time {
  color: #6B6B6B;
}

.log-reason {
  margin-top: 8px;
  padding: 8px 12px;
  background: #FFF3CD;
  border-radius: 6px;
  font-size: 13px;
  color: #856404;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-row {
    flex-direction: column;
  }
  
  .filter-select {
    width: 100%;
  }
}
</style>
