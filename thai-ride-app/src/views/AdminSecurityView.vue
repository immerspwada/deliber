<template>
  <AdminLayout>
    <div class="admin-security">
      <!-- Header -->
      <div class="header-section">
        <div class="header-content">
          <h1 class="page-title">Security Dashboard</h1>
          <p class="page-subtitle">ตรวจสอบความปลอดภัยและ Audit Logs</p>
        </div>
        <button @click="refreshData" :disabled="loading" class="btn-refresh">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          รีเฟรช
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid" v-if="securitySummary">
        <div class="summary-card">
          <div class="summary-icon login"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10,17 15,12 10,7"/><line x1="15" y1="12" x2="3" y2="12"/></svg></div>
          <div class="summary-content">
            <span class="summary-value">{{ securitySummary.total_logins }}</span>
            <span class="summary-label">Logins (24h)</span>
          </div>
        </div>
        <div class="summary-card warning">
          <div class="summary-icon failed"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
          <div class="summary-content">
            <span class="summary-value">{{ securitySummary.failed_logins }}</span>
            <span class="summary-label">Failed Logins</span>
          </div>
        </div>
        <div class="summary-card danger">
          <div class="summary-icon risk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div class="summary-content">
            <span class="summary-value">{{ securitySummary.high_risk_events }}</span>
            <span class="summary-label">High Risk Events</span>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-icon sessions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div class="summary-content">
            <span class="summary-value">{{ securitySummary.active_sessions }}</span>
            <span class="summary-label">Active Sessions</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs">
          <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" class="tab-btn" :class="{ active: activeTab === tab.id }">
            {{ tab.label }}
          </button>
        </div>

        <!-- Security Events Tab -->
        <div v-if="activeTab === 'events'" class="tab-content">
          <div class="tab-header">
            <h3>Security Events</h3>
            <select v-model="eventFilter" class="filter-select">
              <option value="all">ทั้งหมด</option>
              <option value="high">High Risk</option>
              <option value="critical">Critical</option>
              <option value="failed_login">Failed Logins</option>
            </select>
          </div>
          <div class="events-list">
            <div v-for="event in filteredEvents" :key="event.id" class="event-item" :class="event.risk_level">
              <div class="event-header">
                <span class="event-type">{{ event.event_type }}</span>
                <span class="event-badge" :class="event.risk_level">{{ event.risk_level }}</span>
              </div>
              <div class="event-details">
                <span v-if="event.ip_address">IP: {{ event.ip_address }}</span>
                <span>{{ formatDateTime(event.created_at) }}</span>
              </div>
              <div v-if="Object.keys(event.details).length > 0" class="event-meta">
                <code>{{ JSON.stringify(event.details) }}</code>
              </div>
            </div>
          </div>
        </div>

        <!-- Active Sessions Tab -->
        <div v-if="activeTab === 'sessions'" class="tab-content">
          <div class="tab-header"><h3>Active Sessions</h3></div>
          <div class="sessions-list">
            <div v-for="session in userSessions" :key="session.id" class="session-item">
              <div class="session-info">
                <span class="session-user">User: {{ session.user_id.slice(0, 8) }}...</span>
                <span class="session-ip">{{ session.ip_address || 'Unknown IP' }}</span>
              </div>
              <div class="session-meta">
                <span>Last: {{ formatDateTime(session.last_activity) }}</span>
                <button @click="handleInvalidateSession(session.id)" class="btn-invalidate">Invalidate</button>
              </div>
            </div>
          </div>
        </div>

        <!-- IP Blacklist Tab -->
        <div v-if="activeTab === 'blacklist'" class="tab-content">
          <div class="tab-header">
            <h3>IP Blacklist</h3>
            <button @click="showAddBlacklist = true" class="btn-add">Add IP</button>
          </div>
          <div class="blacklist-list">
            <div v-for="ip in blacklistedIps" :key="ip.id" class="blacklist-item">
              <div class="blacklist-info">
                <span class="blacklist-ip">{{ ip.ip_address }}</span>
                <span class="blacklist-reason">{{ ip.reason }}</span>
              </div>
              <button @click="handleUnblacklist(ip.ip_address)" class="btn-remove">Remove</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useSecurityAudit } from '../composables/useSecurityAudit'
import { supabase } from '../lib/supabase'

const {
  securityEvents, securitySummary, userSessions, loading,
  fetchSecurityEvents, fetchSecuritySummary, fetchUserSessions,
  invalidateSession, unblacklistIp
} = useSecurityAudit()

const activeTab = ref('events')
const eventFilter = ref('all')
const showAddBlacklist = ref(false)
const blacklistedIps = ref<any[]>([])

const tabs = [
  { id: 'events', label: 'Security Events' },
  { id: 'sessions', label: 'Active Sessions' },
  { id: 'blacklist', label: 'IP Blacklist' }
]

const filteredEvents = computed(() => {
  if (eventFilter.value === 'all') return securityEvents.value
  if (eventFilter.value === 'failed_login') return securityEvents.value.filter(e => e.event_type === 'failed_login')
  return securityEvents.value.filter(e => e.risk_level === eventFilter.value)
})

const refreshData = async () => {
  await Promise.all([
    fetchSecurityEvents(),
    fetchSecuritySummary(),
    fetchUserSessions(),
    fetchBlacklist()
  ])
}

const fetchBlacklist = async () => {
  const { data } = await supabase.from('ip_blacklist').select('*').order('created_at', { ascending: false })
  blacklistedIps.value = data || []
}

const handleInvalidateSession = async (sessionId: string) => {
  if (confirm('ยืนยันการยกเลิก Session นี้?')) {
    await invalidateSession(sessionId)
    await fetchUserSessions()
  }
}

const handleUnblacklist = async (ip: string) => {
  if (confirm(`ยืนยันการปลดบล็อก IP: ${ip}?`)) {
    await unblacklistIp(ip)
    await fetchBlacklist()
  }
}

const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString('th-TH')

onMounted(refreshData)
</script>

<style scoped>
.admin-security { padding: 24px; max-width: 1400px; margin: 0 auto; }
.header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.page-title { font-size: 28px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px 0; }
.page-subtitle { color: #666666; margin: 0; }
.btn-refresh { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #F5F5F5; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
.btn-refresh:hover { background: #E8E8E8; }
.icon { width: 18px; height: 18px; }

.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.summary-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: white; border-radius: 16px; border: 1px solid #F0F0F0; }
.summary-card.warning { border-left: 4px solid #F5A623; }
.summary-card.danger { border-left: 4px solid #E53935; }
.summary-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.summary-icon svg { width: 24px; height: 24px; }
.summary-icon.login { background: #E8F5EF; color: #00A86B; }
.summary-icon.failed { background: #FFF3E0; color: #F5A623; }
.summary-icon.risk { background: #FFEBEE; color: #E53935; }
.summary-icon.sessions { background: #E3F2FD; color: #1976D2; }
.summary-value { font-size: 28px; font-weight: 700; color: #1A1A1A; display: block; }
.summary-label { font-size: 14px; color: #666666; }

.tabs-container { background: white; border-radius: 16px; border: 1px solid #F0F0F0; }
.tabs { display: flex; border-bottom: 1px solid #F0F0F0; }
.tab-btn { flex: 1; padding: 16px; background: none; border: none; font-weight: 600; color: #666666; cursor: pointer; }
.tab-btn.active { color: #00A86B; border-bottom: 2px solid #00A86B; }
.tab-content { padding: 24px; }
.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tab-header h3 { margin: 0; font-size: 18px; }
.filter-select { padding: 8px 16px; border: 1px solid #E8E8E8; border-radius: 8px; }

.events-list, .sessions-list, .blacklist-list { display: flex; flex-direction: column; gap: 12px; }
.event-item { padding: 16px; background: #FAFAFA; border-radius: 12px; border-left: 4px solid #E8E8E8; }
.event-item.high { border-left-color: #F5A623; }
.event-item.critical { border-left-color: #E53935; }
.event-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.event-type { font-weight: 600; color: #1A1A1A; }
.event-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.event-badge.low { background: #E8F5EF; color: #00A86B; }
.event-badge.medium { background: #E3F2FD; color: #1976D2; }
.event-badge.high { background: #FFF3E0; color: #F5A623; }
.event-badge.critical { background: #FFEBEE; color: #E53935; }
.event-details { display: flex; gap: 16px; font-size: 14px; color: #666666; }
.event-meta { margin-top: 8px; }
.event-meta code { font-size: 12px; background: #F0F0F0; padding: 4px 8px; border-radius: 4px; }

.session-item, .blacklist-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #FAFAFA; border-radius: 12px; }
.session-user, .blacklist-ip { font-weight: 600; color: #1A1A1A; }
.session-ip, .blacklist-reason { font-size: 14px; color: #666666; margin-left: 12px; }
.session-meta { display: flex; align-items: center; gap: 12px; font-size: 14px; color: #666666; }
.btn-invalidate, .btn-remove { padding: 6px 12px; background: #FFEBEE; color: #E53935; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-add { padding: 8px 16px; background: #00A86B; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
</style>
