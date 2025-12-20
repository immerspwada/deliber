<script setup lang="ts">
/**
 * Admin Alerting View
 * Manage alerts, rules, and notifications
 */
import { ref, onMounted, onUnmounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAlerting, type Alert, type AlertRule } from '../composables/useAlerting'

const {
  rules,
  activeAlerts,
  alertHistory,
  loading,
  criticalAlertCount,
  warningAlertCount,
  fetchRules,
  fetchActiveAlerts,
  fetchAlertHistory,
  acknowledgeAlert,
  resolveAlert,
  toggleRule
} = useAlerting()

const activeTab = ref<'active' | 'history' | 'rules'>('active')
const adminId = localStorage.getItem('admin_token') || 'admin'
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await Promise.all([
    fetchActiveAlerts(),
    fetchRules(),
    fetchAlertHistory()
  ])
  
  // Auto-refresh active alerts every 30 seconds
  refreshInterval = setInterval(() => {
    fetchActiveAlerts()
  }, 30000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})

const handleAcknowledge = async (alertId: string) => {
  await acknowledgeAlert(alertId, adminId)
}

const handleResolve = async (alertId: string) => {
  await resolveAlert(alertId)
}

const handleToggleRule = async (ruleId: string, enabled: boolean) => {
  await toggleRule(ruleId, enabled)
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#E53935'
    case 'warning': return '#F5A623'
    default: return '#00A86B'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'triggered': return '#E53935'
    case 'acknowledged': return '#F5A623'
    case 'resolved': return '#00A86B'
    default: return '#666'
  }
}

const formatTime = (date: string) => {
  return new Date(date).toLocaleString('th-TH')
}
</script>

<template>
  <AdminLayout>
    <div class="alerting-view">
      <header class="page-header">
        <div class="header-content">
          <h1>ระบบแจ้งเตือน</h1>
          <p>Alert Management & Monitoring</p>
        </div>
        <div class="alert-summary">
          <div class="summary-item critical" v-if="criticalAlertCount > 0">
            <span class="count">{{ criticalAlertCount }}</span>
            <span class="label">Critical</span>
          </div>
          <div class="summary-item warning" v-if="warningAlertCount > 0">
            <span class="count">{{ warningAlertCount }}</span>
            <span class="label">Warning</span>
          </div>
          <div class="summary-item ok" v-if="criticalAlertCount === 0 && warningAlertCount === 0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span class="label">All Clear</span>
          </div>
        </div>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          :class="['tab', { active: activeTab === 'active' }]"
          @click="activeTab = 'active'"
        >
          Active Alerts
          <span v-if="activeAlerts.length > 0" class="badge">{{ activeAlerts.length }}</span>
        </button>
        <button 
          :class="['tab', { active: activeTab === 'history' }]"
          @click="activeTab = 'history'"
        >
          History
        </button>
        <button 
          :class="['tab', { active: activeTab === 'rules' }]"
          @click="activeTab = 'rules'"
        >
          Rules
        </button>
      </div>

      <!-- Active Alerts -->
      <div v-if="activeTab === 'active'" class="tab-content">
        <div v-if="activeAlerts.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00A86B" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <p>ไม่มี Alert ที่ต้องดำเนินการ</p>
        </div>
        
        <div v-else class="alert-list">
          <div 
            v-for="alert in activeAlerts" 
            :key="alert.id"
            class="alert-card"
            :class="alert.severity"
          >
            <div class="alert-header">
              <span 
                class="severity-badge"
                :style="{ background: getSeverityColor(alert.severity) }"
              >
                {{ alert.severity.toUpperCase() }}
              </span>
              <span class="alert-time">{{ formatTime(alert.created_at) }}</span>
            </div>
            <h3 class="alert-title">{{ alert.rule_name }}</h3>
            <p class="alert-message">{{ alert.message }}</p>
            <div class="alert-metrics">
              <span>Value: {{ alert.metric_value }}</span>
              <span>Threshold: {{ alert.threshold_value }}</span>
            </div>
            <div class="alert-actions">
              <button 
                v-if="alert.status === 'triggered'"
                class="btn-acknowledge"
                @click="handleAcknowledge(alert.id)"
              >
                Acknowledge
              </button>
              <button 
                class="btn-resolve"
                @click="handleResolve(alert.id)"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- History -->
      <div v-if="activeTab === 'history'" class="tab-content">
        <table class="data-table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>Rule</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="alert in alertHistory" :key="alert.id">
              <td>{{ formatTime(alert.created_at) }}</td>
              <td>{{ alert.rule_name }}</td>
              <td>
                <span 
                  class="severity-badge small"
                  :style="{ background: getSeverityColor(alert.severity) }"
                >
                  {{ alert.severity }}
                </span>
              </td>
              <td>
                <span 
                  class="status-badge"
                  :style="{ background: getStatusColor(alert.status) }"
                >
                  {{ alert.status }}
                </span>
              </td>
              <td class="message-cell">{{ alert.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Rules -->
      <div v-if="activeTab === 'rules'" class="tab-content">
        <div class="rules-list">
          <div v-for="rule in rules" :key="rule.id" class="rule-card">
            <div class="rule-header">
              <h3>{{ rule.name }}</h3>
              <label class="toggle">
                <input 
                  type="checkbox" 
                  :checked="rule.is_enabled"
                  @change="handleToggleRule(rule.id, !rule.is_enabled)"
                />
                <span class="slider"></span>
              </label>
            </div>
            <p class="rule-description">{{ rule.description }}</p>
            <div class="rule-details">
              <span class="detail">
                <strong>Metric:</strong> {{ rule.metric_type }}
              </span>
              <span class="detail">
                <strong>Condition:</strong> {{ rule.condition }} {{ rule.threshold }}
              </span>
              <span class="detail">
                <strong>Severity:</strong> 
                <span 
                  class="severity-badge small"
                  :style="{ background: getSeverityColor(rule.severity) }"
                >
                  {{ rule.severity }}
                </span>
              </span>
              <span class="detail">
                <strong>Cooldown:</strong> {{ rule.cooldown_minutes }} min
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.alerting-view {
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

.alert-summary {
  display: flex;
  gap: 12px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 12px;
  font-weight: 600;
}

.summary-item.critical {
  background: #FFEBEE;
  color: #E53935;
}

.summary-item.warning {
  background: #FFF8E1;
  color: #F5A623;
}

.summary-item.ok {
  background: #E8F5EF;
  color: #00A86B;
}

.summary-item .count {
  font-size: 20px;
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

.empty-state svg {
  margin-bottom: 16px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.alert-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  border-left: 4px solid;
}

.alert-card.critical {
  border-left-color: #E53935;
}

.alert-card.warning {
  border-left-color: #F5A623;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.severity-badge {
  padding: 4px 12px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 600;
}

.severity-badge.small {
  padding: 2px 8px;
  font-size: 11px;
}

.alert-time {
  color: #666;
  font-size: 13px;
}

.alert-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
}

.alert-message {
  color: #666;
  margin: 0 0 12px;
}

.alert-metrics {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #666;
  margin-bottom: 16px;
}

.alert-actions {
  display: flex;
  gap: 12px;
}

.btn-acknowledge {
  padding: 8px 16px;
  background: #F5A623;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.btn-resolve {
  padding: 8px 16px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
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

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
}

.message-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.rule-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.rule-description {
  color: #666;
  margin: 0 0 16px;
  font-size: 14px;
}

.rule-details {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.detail {
  font-size: 13px;
  color: #666;
}

.detail strong {
  color: #1a1a1a;
}

/* Toggle Switch */
.toggle {
  position: relative;
  display: inline-block;
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #00A86B;
}

input:checked + .slider:before {
  transform: translateX(22px);
}
</style>
