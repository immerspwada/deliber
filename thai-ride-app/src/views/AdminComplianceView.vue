<script setup lang="ts">
/**
 * Admin Compliance View
 * Audit logs, compliance tracking, data retention
 */
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAuditCompliance, type ComplianceRequirement, type RetentionPolicy } from '../composables/useAuditCompliance'

const {
  highRiskEvents,
  complianceRequirements,
  retentionPolicies,
  loading,
  complianceScore,
  nonCompliantCount,
  criticalEventCount,
  fetchHighRiskEvents,
  fetchComplianceRequirements,
  updateComplianceStatus,
  fetchRetentionPolicies,
  runRetentionCleanup
} = useAuditCompliance()

const activeTab = ref<'compliance' | 'audit' | 'retention'>('compliance')
const cleanupLoading = ref(false)
const cleanupResults = ref<{ table_name: string; records_deleted: number }[]>([])

onMounted(async () => {
  await Promise.all([
    fetchComplianceRequirements(),
    fetchHighRiskEvents(),
    fetchRetentionPolicies()
  ])
})

const handleStatusUpdate = async (req: ComplianceRequirement, status: ComplianceRequirement['status']) => {
  await updateComplianceStatus(req.id, status)
}

const handleRunCleanup = async () => {
  cleanupLoading.value = true
  try {
    cleanupResults.value = await runRetentionCleanup()
  } finally {
    cleanupLoading.value = false
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'compliant': return '#00A86B'
    case 'in_progress': return '#F5A623'
    case 'non_compliant': return '#E53935'
    default: return '#666'
  }
}

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'critical': return '#E53935'
    case 'high': return '#F5A623'
    case 'medium': return '#2196F3'
    default: return '#666'
  }
}

const formatTime = (date: string) => new Date(date).toLocaleString('th-TH')
</script>

<template>
  <AdminLayout>
    <div class="compliance-view">
      <header class="page-header">
        <div class="header-content">
          <h1>Compliance & Audit</h1>
          <p>การปฏิบัติตามกฎหมาย, Audit Logs, Data Retention</p>
        </div>
        <div class="header-stats">
          <div class="stat-item" :class="{ good: complianceScore >= 80 }">
            <span class="stat-value">{{ complianceScore }}%</span>
            <span class="stat-label">Compliance</span>
          </div>
          <div class="stat-item" :class="{ warning: nonCompliantCount > 0 }">
            <span class="stat-value">{{ nonCompliantCount }}</span>
            <span class="stat-label">Non-Compliant</span>
          </div>
          <div class="stat-item" :class="{ danger: criticalEventCount > 0 }">
            <span class="stat-value">{{ criticalEventCount }}</span>
            <span class="stat-label">Critical Events</span>
          </div>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          v-for="tab in ['compliance', 'audit', 'retention']"
          :key="tab"
          :class="['tab', { active: activeTab === tab }]"
          @click="activeTab = tab as any"
        >
          {{ tab === 'compliance' ? 'Compliance' : 
             tab === 'audit' ? 'Audit Log' : 'Data Retention' }}
        </button>
      </div>

      <!-- Compliance Tab -->
      <div v-if="activeTab === 'compliance'" class="tab-content">
        <div class="compliance-grid">
          <div 
            v-for="req in complianceRequirements" 
            :key="req.id"
            class="compliance-card"
          >
            <div class="compliance-header">
              <span class="regulation-badge">{{ req.regulation }}</span>
              <span 
                class="status-badge"
                :style="{ background: getStatusColor(req.status) }"
              >
                {{ req.status }}
              </span>
            </div>
            <h3>{{ req.name }}</h3>
            <p v-if="req.description">{{ req.description }}</p>
            <div class="compliance-meta">
              <span>Category: {{ req.category }}</span>
              <span v-if="req.last_audit_date">Last Audit: {{ req.last_audit_date }}</span>
            </div>
            <div class="compliance-actions">
              <button 
                v-if="req.status !== 'compliant'"
                class="btn-small success"
                @click="handleStatusUpdate(req, 'compliant')"
              >
                Mark Compliant
              </button>
              <button 
                v-if="req.status !== 'in_progress'"
                class="btn-small warning"
                @click="handleStatusUpdate(req, 'in_progress')"
              >
                In Progress
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Audit Tab -->
      <div v-if="activeTab === 'audit'" class="tab-content">
        <div class="card">
          <h3>High Risk Events (24h)</h3>
          <div v-if="highRiskEvents.length === 0" class="empty">
            ไม่มี High Risk Events
          </div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>เวลา</th>
                <th>Event</th>
                <th>Entity</th>
                <th>Risk</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="event in highRiskEvents" :key="event.id">
                <td>{{ formatTime(event.created_at) }}</td>
                <td>{{ event.event_type }}</td>
                <td>{{ event.entity_type }}</td>
                <td>
                  <span 
                    class="risk-badge"
                    :style="{ background: getRiskColor(event.risk_level) }"
                  >
                    {{ event.risk_level }}
                  </span>
                </td>
                <td>{{ event.actor_type }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Retention Tab -->
      <div v-if="activeTab === 'retention'" class="tab-content">
        <div class="card">
          <div class="retention-header">
            <h3>Data Retention Policies</h3>
            <button 
              class="btn-primary"
              @click="handleRunCleanup"
              :disabled="cleanupLoading"
            >
              {{ cleanupLoading ? 'Running...' : 'Run Cleanup' }}
            </button>
          </div>

          <div v-if="cleanupResults.length > 0" class="cleanup-results">
            <h4>Cleanup Results:</h4>
            <div v-for="result in cleanupResults" :key="result.table_name" class="result-item">
              {{ result.table_name }}: {{ result.records_deleted }} records deleted
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Table</th>
                <th>Retention (Days)</th>
                <th>Archive</th>
                <th>Status</th>
                <th>Last Cleanup</th>
                <th>Total Deleted</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="policy in retentionPolicies" :key="policy.id">
                <td class="table-name">{{ policy.table_name }}</td>
                <td>{{ policy.retention_days }}</td>
                <td>{{ policy.archive_before_delete ? 'Yes' : 'No' }}</td>
                <td>
                  <span :class="['status-dot', { active: policy.is_active }]"></span>
                  {{ policy.is_active ? 'Active' : 'Inactive' }}
                </td>
                <td>{{ policy.last_cleanup_at ? formatTime(policy.last_cleanup_at) : '-' }}</td>
                <td>{{ policy.records_deleted.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.compliance-view {
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

.header-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 12px 20px;
  background: #f5f5f5;
  border-radius: 12px;
}

.stat-item.good {
  background: #E8F5EF;
}

.stat-item.warning {
  background: #FFF8E1;
}

.stat-item.danger {
  background: #FFEBEE;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 12px;
  color: #666;
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

.compliance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.compliance-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
}

.compliance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.regulation-badge {
  padding: 4px 10px;
  background: #E3F2FD;
  color: #1976D2;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.compliance-card h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 8px;
}

.compliance-card p {
  color: #666;
  font-size: 13px;
  margin: 0 0 12px;
}

.compliance-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
}

.compliance-actions {
  display: flex;
  gap: 8px;
}

.btn-small {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.btn-small.success {
  background: #00A86B;
  color: white;
}

.btn-small.warning {
  background: #F5A623;
  color: white;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 20px;
}

.card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
}

.retention-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.retention-header h3 {
  margin: 0;
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

.cleanup-results {
  padding: 16px;
  background: #E8F5EF;
  border-radius: 12px;
  margin-bottom: 16px;
}

.cleanup-results h4 {
  margin: 0 0 8px;
  font-size: 14px;
}

.result-item {
  font-size: 13px;
  color: #00A86B;
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

.table-name {
  font-family: monospace;
  font-size: 13px;
}

.risk-badge {
  padding: 4px 10px;
  border-radius: 12px;
  color: white;
  font-size: 11px;
  font-weight: 500;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ccc;
  margin-right: 6px;
}

.status-dot.active {
  background: #00A86B;
}

.empty {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>
