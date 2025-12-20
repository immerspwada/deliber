<template>
  <AdminLayout>
    <div class="cross-role-monitor">
      <!-- Header -->
      <div class="header-section">
        <div class="header-content">
          <h1 class="page-title">Cross-Role Monitor</h1>
          <p class="page-subtitle">ตรวจสอบการทำงานร่วมกันทุก Role แบบ Real-time</p>
        </div>
        <div class="header-actions">
          <div class="connection-status" :class="{ connected: isConnected }">
            <span class="status-dot"></span>
            {{ isConnected ? 'Connected' : 'Disconnected' }}
          </div>
          <button @click="refreshAll" :disabled="loading" class="btn-refresh">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            รีเฟรช
          </button>
        </div>
      </div>

      <!-- Role Status Cards -->
      <div class="role-status-grid">
        <!-- Customer Card -->
        <div class="role-card customer">
          <div class="role-header">
            <div class="role-icon customer-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div class="role-info">
              <h3>Customers</h3>
              <span class="role-count">{{ stats.activeCustomers }} active</span>
            </div>
          </div>
          <div class="role-metrics">
            <div class="metric-item">
              <span class="metric-label">Pending</span>
              <span class="metric-value pending">{{ stats.pendingRequests }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">In Progress</span>
              <span class="metric-value progress">{{ stats.inProgressRequests }}</span>
            </div>
          </div>
        </div>

        <!-- Provider Card -->
        <div class="role-card provider">
          <div class="role-header">
            <div class="role-icon provider-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div class="role-info">
              <h3>Providers</h3>
              <span class="role-count">{{ stats.onlineProviders }} online</span>
            </div>
          </div>
          <div class="role-metrics">
            <div class="metric-item">
              <span class="metric-label">Available</span>
              <span class="metric-value available">{{ stats.availableProviders }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Busy</span>
              <span class="metric-value busy">{{ stats.busyProviders }}</span>
            </div>
          </div>
        </div>

        <!-- System Card -->
        <div class="role-card system">
          <div class="role-header">
            <div class="role-icon system-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <div class="role-info">
              <h3>System</h3>
              <span class="role-count">{{ syncStats.eventsReceived }} events</span>
            </div>
          </div>
          <div class="role-metrics">
            <div class="metric-item">
              <span class="metric-label">Latency</span>
              <span class="metric-value">{{ syncStats.latency }}ms</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Last Event</span>
              <span class="metric-value small">{{ formatTime(syncStats.lastEventTime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Event Stream -->
      <div class="events-section">
        <div class="section-header">
          <h2>Live Event Stream</h2>
          <div class="event-filters">
            <button 
              v-for="filter in eventFilters" 
              :key="filter.value"
              :class="['filter-btn', { active: activeFilter === filter.value }]"
              @click="activeFilter = filter.value"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>
        <div class="events-list">
          <div 
            v-for="event in filteredEvents" 
            :key="event.metadata.correlationId"
            :class="['event-item', getEventClass(event.type)]"
          >
            <div class="event-icon">
              <component :is="getEventIcon(event.type)" />
            </div>
            <div class="event-content">
              <div class="event-title">{{ getEventTitle(event) }}</div>
              <div class="event-meta">
                <span class="event-role">{{ event.source.role }}</span>
                <span class="event-time">{{ formatTime(event.metadata.timestamp) }}</span>
                <span v-if="event.metadata.serviceType" class="event-service">
                  {{ event.metadata.serviceType }}
                </span>
              </div>
            </div>
            <div class="event-action" v-if="event.metadata.requestId">
              <button @click="viewRequest(event)" class="btn-view">ดู</button>
            </div>
          </div>
          <div v-if="filteredEvents.length === 0" class="empty-events">
            <p>ยังไม่มี events</p>
          </div>
        </div>
      </div>

      <!-- Service Status Grid -->
      <div class="service-section">
        <h2>Service Status by Type</h2>
        <div class="service-grid">
          <div 
            v-for="service in serviceStats" 
            :key="service.type"
            class="service-card"
            :style="{ borderLeftColor: service.color }"
          >
            <div class="service-header">
              <span class="service-name">{{ service.displayNameTh }}</span>
              <span class="service-total">{{ service.total }}</span>
            </div>
            <div class="service-breakdown">
              <div class="breakdown-item">
                <span class="dot pending"></span>
                <span>Pending: {{ service.pending }}</span>
              </div>
              <div class="breakdown-item">
                <span class="dot matched"></span>
                <span>Matched: {{ service.matched }}</span>
              </div>
              <div class="breakdown-item">
                <span class="dot progress"></span>
                <span>In Progress: {{ service.inProgress }}</span>
              </div>
              <div class="breakdown-item">
                <span class="dot completed"></span>
                <span>Completed: {{ service.completed }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useCrossRoleSync } from '@/composables/useCrossRoleSync'
import { useCrossRoleEvents, type CrossRoleEvent } from '@/lib/crossRoleEventBus'
import { useAdminServiceManagement } from '@/composables/useAdminServiceManagement'
import { SERVICE_REGISTRY, type ServiceType } from '@/lib/serviceRegistry'
import { supabase } from '@/lib/supabase'

const { history, subscribe } = useCrossRoleEvents()
const { isConnected, syncStats } = useCrossRoleSync({ role: 'admin', enableNotifications: true })
const { fetchAllRequests, getAnalytics } = useAdminServiceManagement()

const loading = ref(false)
const activeFilter = ref('all')
const events = ref<CrossRoleEvent[]>([])

const stats = ref({
  activeCustomers: 0,
  pendingRequests: 0,
  inProgressRequests: 0,
  onlineProviders: 0,
  availableProviders: 0,
  busyProviders: 0
})

const serviceStats = ref<Array<{
  type: ServiceType
  displayNameTh: string
  color: string
  total: number
  pending: number
  matched: number
  inProgress: number
  completed: number
}>>([])

const eventFilters = [
  { label: 'ทั้งหมด', value: 'all' },
  { label: 'Requests', value: 'request' },
  { label: 'Providers', value: 'provider' },
  { label: 'System', value: 'system' }
]

const filteredEvents = computed(() => {
  if (activeFilter.value === 'all') return events.value.slice(0, 50)
  return events.value
    .filter(e => e.type.startsWith(activeFilter.value))
    .slice(0, 50)
})

async function loadStats() {
  loading.value = true
  try {
    // Load provider stats
    const { data: providers } = await supabase
      .from('service_providers')
      .select('id, is_available, status')
      .eq('status', 'approved')

    if (providers) {
      stats.value.onlineProviders = providers.filter(p => p.is_available).length
      stats.value.availableProviders = providers.filter(p => p.is_available && p.status === 'approved').length
      stats.value.busyProviders = providers.filter(p => !p.is_available).length
    }

    // Load service stats
    const analytics = await getAnalytics()
    stats.value.pendingRequests = analytics.pendingRequests
    stats.value.inProgressRequests = analytics.totalRequests - analytics.pendingRequests - analytics.completedRequests - analytics.cancelledRequests

    // Load per-service stats
    const serviceStatsData = []
    for (const [type, def] of Object.entries(SERVICE_REGISTRY)) {
      const { data } = await supabase
        .from(def.tableName)
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      if (data) {
        serviceStatsData.push({
          type: type as ServiceType,
          displayNameTh: def.displayNameTh,
          color: def.color,
          total: data.length,
          pending: data.filter(r => r.status === 'pending').length,
          matched: data.filter(r => r.status === 'matched').length,
          inProgress: data.filter(r => ['in_progress', 'arriving', 'picked_up'].includes(r.status)).length,
          completed: data.filter(r => r.status === 'completed').length
        })
      }
    }
    serviceStats.value = serviceStatsData
  } finally {
    loading.value = false
  }
}

function refreshAll() {
  loadStats()
}

function getEventClass(type: string): string {
  if (type.includes('created')) return 'created'
  if (type.includes('matched')) return 'matched'
  if (type.includes('completed')) return 'completed'
  if (type.includes('cancelled')) return 'cancelled'
  if (type.includes('error')) return 'error'
  return 'info'
}

function getEventIcon(type: string) {
  return 'span' // Simplified - would use actual icon components
}

function getEventTitle(event: CrossRoleEvent): string {
  const titles: Record<string, string> = {
    'request:created': 'คำขอใหม่',
    'request:matched': 'จับคู่สำเร็จ',
    'request:completed': 'เสร็จสิ้น',
    'request:cancelled': 'ยกเลิก',
    'provider:online': 'Provider ออนไลน์',
    'provider:offline': 'Provider ออฟไลน์',
    'system:error': 'System Error'
  }
  return titles[event.type] || event.type
}

function formatTime(timestamp: string | null): string {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleTimeString('th-TH')
}

function viewRequest(event: CrossRoleEvent) {
  if (event.metadata.requestId) {
    // Navigate to request detail
    console.log('View request:', event.metadata.requestId)
  }
}

// Subscribe to events
let unsubscribe: (() => void) | null = null

onMounted(() => {
  loadStats()
  
  unsubscribe = subscribe('*', (event) => {
    events.value.unshift(event)
    if (events.value.length > 100) {
      events.value = events.value.slice(0, 100)
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})
</script>

<style scoped>
.cross-role-monitor { padding: 24px; max-width: 1400px; margin: 0 auto; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #F0F0F0; }
.page-title { font-size: 24px; font-weight: 700; color: #1A1A1A; margin: 0 0 4px 0; }
.page-subtitle { color: #666; font-size: 14px; margin: 0; }
.header-actions { display: flex; align-items: center; gap: 16px; }
.connection-status { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; background: #FFEBEE; color: #E53935; }
.connection-status.connected { background: #E8F5EF; color: #00A86B; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.btn-refresh { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; background: #F5F5F5; border: none; font-weight: 600; cursor: pointer; }
.btn-refresh:hover { background: #E8E8E8; }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
.icon { width: 18px; height: 18px; }

.role-status-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
.role-card { background: white; border-radius: 16px; padding: 20px; border: 1px solid #F0F0F0; }
.role-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.role-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.role-icon svg { width: 24px; height: 24px; }
.customer-icon { background: #E3F2FD; color: #1976D2; }
.provider-icon { background: #E8F5EF; color: #00A86B; }
.system-icon { background: #FFF3E0; color: #F57C00; }
.role-info h3 { font-size: 16px; font-weight: 600; margin: 0 0 4px 0; color: #1A1A1A; }
.role-count { font-size: 13px; color: #666; }
.role-metrics { display: flex; gap: 24px; }
.metric-item { display: flex; flex-direction: column; gap: 4px; }
.metric-label { font-size: 12px; color: #999; }
.metric-value { font-size: 20px; font-weight: 700; color: #1A1A1A; }
.metric-value.pending { color: #F5A623; }
.metric-value.progress { color: #1976D2; }
.metric-value.available { color: #00A86B; }
.metric-value.busy { color: #E53935; }
.metric-value.small { font-size: 14px; }

.events-section { background: white; border-radius: 16px; padding: 20px; border: 1px solid #F0F0F0; margin-bottom: 32px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.event-filters { display: flex; gap: 8px; }
.filter-btn { padding: 6px 12px; border-radius: 16px; border: 1px solid #E8E8E8; background: white; font-size: 13px; cursor: pointer; }
.filter-btn.active { background: #00A86B; color: white; border-color: #00A86B; }
.events-list { max-height: 400px; overflow-y: auto; }
.event-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; margin-bottom: 8px; background: #F9F9F9; }
.event-item.created { border-left: 3px solid #1976D2; }
.event-item.matched { border-left: 3px solid #00A86B; }
.event-item.completed { border-left: 3px solid #00A86B; }
.event-item.cancelled { border-left: 3px solid #E53935; }
.event-item.error { border-left: 3px solid #E53935; background: #FFEBEE; }
.event-icon { width: 32px; height: 32px; border-radius: 8px; background: #E8E8E8; }
.event-content { flex: 1; }
.event-title { font-weight: 600; font-size: 14px; color: #1A1A1A; }
.event-meta { display: flex; gap: 12px; font-size: 12px; color: #666; margin-top: 4px; }
.event-role { text-transform: capitalize; }
.event-service { background: #E8E8E8; padding: 2px 6px; border-radius: 4px; }
.btn-view { padding: 6px 12px; border-radius: 6px; background: #00A86B; color: white; border: none; font-size: 12px; cursor: pointer; }
.empty-events { text-align: center; padding: 40px; color: #999; }

.service-section { margin-bottom: 32px; }
.service-section h2 { font-size: 18px; font-weight: 600; margin: 0 0 16px 0; }
.service-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.service-card { background: white; border-radius: 12px; padding: 16px; border: 1px solid #F0F0F0; border-left: 4px solid; }
.service-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.service-name { font-weight: 600; color: #1A1A1A; }
.service-total { font-size: 20px; font-weight: 700; color: #1A1A1A; }
.service-breakdown { display: flex; flex-direction: column; gap: 6px; }
.breakdown-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #666; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.pending { background: #F5A623; }
.dot.matched { background: #1976D2; }
.dot.progress { background: #9B59B6; }
.dot.completed { background: #00A86B; }

@media (max-width: 768px) {
  .role-status-grid { grid-template-columns: 1fr; }
  .header-section { flex-direction: column; gap: 16px; align-items: flex-start; }
}
</style>
