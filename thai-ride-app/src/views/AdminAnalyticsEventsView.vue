<script setup lang="ts">
/**
 * Admin Analytics Events Dashboard (F237)
 * แสดง analytics events แบบ real-time พร้อม charts และ filters
 */
import { ref, onMounted, computed, onUnmounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { fetchAnalyticsEvents, fetchAnalyticsSummary } from '../composables/useAdmin'
import { supabase } from '../lib/supabase'

interface AnalyticsEvent {
  id: string
  event_name: string
  user_id: string | null
  session_id: string | null
  properties: Record<string, any>
  created_at: string
}

interface EventSummary {
  event_name: string
  event_count: number
  unique_users: number
}

const loading = ref(false)
const events = ref<AnalyticsEvent[]>([])
const summary = ref<EventSummary[]>([])
const total = ref(0)
const page = ref(1)
const autoRefresh = ref(true)
let refreshInterval: ReturnType<typeof setInterval> | null = null

// Filters
const filters = ref({
  eventName: '',
  dateRange: '7d',
  userId: ''
})

const dateRangeOptions = [
  { value: '1d', label: 'วันนี้' },
  { value: '7d', label: '7 วัน' },
  { value: '30d', label: '30 วัน' },
  { value: '90d', label: '90 วัน' }
]

const eventColors: Record<string, string> = {
  page_view: '#3B82F6',
  booking_started: '#F59E0B',
  booking_completed: '#00A86B',
  payment_success: '#10B981',
  payment_failed: '#EF4444',
  rating_submitted: '#8B5CF6',
  login: '#06B6D4',
  logout: '#6B7280',
  signup: '#EC4899',
  search: '#F97316'
}

const getEventColor = (eventName: string) => {
  return eventColors[eventName] || '#6B7280'
}

const totalEvents = computed(() => summary.value.reduce((sum, s) => sum + s.event_count, 0))
const totalUniqueUsers = computed(() => {
  const maxUnique = Math.max(...summary.value.map(s => s.unique_users), 0)
  return maxUnique
})

const topEvents = computed(() => {
  return [...summary.value].sort((a, b) => b.event_count - a.event_count).slice(0, 5)
})

const loadData = async () => {
  loading.value = true
  try {
    const days = parseInt(filters.value.dateRange.replace('d', ''))
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const [eventsResult, summaryResult] = await Promise.all([
      fetchAnalyticsEvents(page.value, 50, {
        eventName: filters.value.eventName || undefined,
        userId: filters.value.userId || undefined,
        startDate: startDate.toISOString()
      }),
      fetchAnalyticsSummary(days)
    ])
    
    events.value = eventsResult.data
    total.value = eventsResult.total
    summary.value = summaryResult
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
  refreshInterval = setInterval(loadData, 10000) // Every 10 seconds
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

const formatTime = (date: string) => {
  return new Date(date).toLocaleString('th-TH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatProperties = (props: Record<string, any>) => {
  if (!props || Object.keys(props).length === 0) return '-'
  return Object.entries(props).map(([k, v]) => `${k}: ${v}`).join(', ')
}

const applyFilter = () => {
  page.value = 1
  loadData()
}

const clearFilters = () => {
  filters.value = { eventName: '', dateRange: '7d', userId: '' }
  page.value = 1
  loadData()
}

// Subscribe to realtime events
let realtimeSubscription: any = null

const subscribeToRealtime = () => {
  realtimeSubscription = supabase
    .channel('analytics_events_changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'analytics_events' }, (payload) => {
      events.value.unshift(payload.new as AnalyticsEvent)
      if (events.value.length > 50) events.value.pop()
    })
    .subscribe()
}

onMounted(() => {
  loadData()
  if (autoRefresh.value) startAutoRefresh()
  subscribeToRealtime()
})

onUnmounted(() => {
  stopAutoRefresh()
  if (realtimeSubscription) {
    supabase.removeChannel(realtimeSubscription)
  }
})
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Analytics Events</h1>
          <p class="page-subtitle">ติดตามพฤติกรรมผู้ใช้แบบ Real-time</p>
        </div>
        <div class="header-actions">
          <button class="btn-toggle" :class="{ active: autoRefresh }" @click="toggleAutoRefresh">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
            {{ autoRefresh ? 'Live: ON' : 'Live: OFF' }}
          </button>
          <button class="btn-primary" @click="loadData" :disabled="loading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            รีเฟรช
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalEvents.toLocaleString() }}</div>
            <div class="stat-label">Total Events</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalUniqueUsers.toLocaleString() }}</div>
            <div class="stat-label">Unique Users</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ summary.length }}</div>
            <div class="stat-label">Event Types</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ filters.dateRange }}</div>
            <div class="stat-label">Date Range</div>
          </div>
        </div>
      </div>

      <!-- Top Events Chart -->
      <div class="chart-section">
        <h2 class="section-title">Top Events</h2>
        <div class="bar-chart">
          <div v-for="event in topEvents" :key="event.event_name" class="bar-item">
            <div class="bar-label">
              <span class="event-dot" :style="{ background: getEventColor(event.event_name) }"></span>
              {{ event.event_name }}
            </div>
            <div class="bar-container">
              <div class="bar-fill" :style="{ 
                width: `${(event.event_count / (topEvents[0]?.event_count || 1)) * 100}%`,
                background: getEventColor(event.event_name)
              }"></div>
            </div>
            <div class="bar-value">{{ event.event_count.toLocaleString() }}</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label>Event Name</label>
          <select v-model="filters.eventName" class="filter-select">
            <option value="">ทั้งหมด</option>
            <option v-for="s in summary" :key="s.event_name" :value="s.event_name">
              {{ s.event_name }} ({{ s.event_count }})
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>Date Range</label>
          <select v-model="filters.dateRange" class="filter-select">
            <option v-for="opt in dateRangeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>User ID</label>
          <input v-model="filters.userId" type="text" placeholder="กรอก User ID..." class="filter-input">
        </div>
        <div class="filter-actions">
          <button class="btn-filter" @click="applyFilter">ค้นหา</button>
          <button class="btn-clear" @click="clearFilters">ล้าง</button>
        </div>
      </div>

      <!-- Events Table -->
      <div class="events-section">
        <h2 class="section-title">Recent Events</h2>
        <div class="events-table">
          <table>
            <thead>
              <tr>
                <th>เวลา</th>
                <th>Event</th>
                <th>User ID</th>
                <th>Session</th>
                <th>Properties</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="5" class="loading-cell">กำลังโหลด...</td>
              </tr>
              <tr v-else-if="events.length === 0">
                <td colspan="5" class="empty-cell">ไม่พบข้อมูล</td>
              </tr>
              <tr v-else v-for="event in events" :key="event.id" class="event-row">
                <td class="time-cell">{{ formatTime(event.created_at) }}</td>
                <td>
                  <span class="event-badge" :style="{ background: getEventColor(event.event_name) + '20', color: getEventColor(event.event_name) }">
                    {{ event.event_name }}
                  </span>
                </td>
                <td class="user-cell">{{ event.user_id?.slice(0, 8) || '-' }}...</td>
                <td class="session-cell">{{ event.session_id?.slice(0, 8) || '-' }}...</td>
                <td class="props-cell">{{ formatProperties(event.properties) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="total > 50" class="pagination">
          <button class="btn-page" :disabled="page === 1" @click="page--; loadData()">ก่อนหน้า</button>
          <span class="page-info">หน้า {{ page }} / {{ Math.ceil(total / 50) }}</span>
          <button class="btn-page" :disabled="page * 50 >= total" @click="page++; loadData()">ถัดไป</button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 24px; max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.page-title { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0; }
.page-subtitle { font-size: 14px; color: #666; margin: 4px 0 0; }
.header-actions { display: flex; gap: 12px; }

.btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #00A86B; color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: #008F5B; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }

.btn-toggle { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: #f5f5f5; color: #666; border: none; border-radius: 12px; font-weight: 500; cursor: pointer; }
.btn-toggle.active { background: #E8F5EF; color: #00A86B; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: white; padding: 20px; border-radius: 16px; border: 1px solid #f0f0f0; display: flex; align-items: center; gap: 16px; }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.stat-icon.blue { background: #EFF6FF; color: #3B82F6; }
.stat-icon.green { background: #E8F5EF; color: #00A86B; }
.stat-icon.purple { background: #F3E8FF; color: #8B5CF6; }
.stat-icon.orange { background: #FFF7ED; color: #F97316; }
.stat-value { font-size: 24px; font-weight: 700; color: #1a1a1a; }
.stat-label { font-size: 13px; color: #666; }

.chart-section { background: white; padding: 24px; border-radius: 16px; border: 1px solid #f0f0f0; margin-bottom: 24px; }
.section-title { font-size: 16px; font-weight: 600; margin: 0 0 20px; color: #1a1a1a; }
.bar-chart { display: flex; flex-direction: column; gap: 12px; }
.bar-item { display: grid; grid-template-columns: 150px 1fr 80px; align-items: center; gap: 16px; }
.bar-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
.event-dot { width: 10px; height: 10px; border-radius: 50%; }
.bar-container { height: 24px; background: #f5f5f5; border-radius: 6px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 6px; transition: width 0.3s ease; }
.bar-value { font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right; }

.filters-section { background: white; padding: 20px; border-radius: 16px; border: 1px solid #f0f0f0; margin-bottom: 24px; display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-group label { font-size: 13px; font-weight: 500; color: #666; }
.filter-select, .filter-input { padding: 10px 14px; border: 2px solid #e8e8e8; border-radius: 10px; font-size: 14px; min-width: 160px; }
.filter-select:focus, .filter-input:focus { outline: none; border-color: #00A86B; }
.filter-actions { display: flex; gap: 8px; }
.btn-filter { padding: 10px 20px; background: #00A86B; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-filter:hover { background: #008F5B; }
.btn-clear { padding: 10px 20px; background: #f5f5f5; color: #666; border: none; border-radius: 10px; font-weight: 500; cursor: pointer; }
.btn-clear:hover { background: #e5e5e5; }

.events-section { background: white; border-radius: 16px; border: 1px solid #f0f0f0; overflow: hidden; }
.events-section .section-title { padding: 20px 24px 0; }
.events-table { overflow-x: auto; }
.events-table table { width: 100%; border-collapse: collapse; }
.events-table th, .events-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #f0f0f0; }
.events-table th { font-size: 13px; font-weight: 600; color: #666; background: #f9f9f9; }
.events-table td { font-size: 14px; color: #1a1a1a; }
.time-cell { font-family: monospace; font-size: 13px; color: #666; white-space: nowrap; }
.user-cell, .session-cell { font-family: monospace; font-size: 12px; color: #999; }
.props-cell { font-size: 12px; color: #666; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.event-row:hover { background: #f9f9f9; }
.loading-cell, .empty-cell { text-align: center; padding: 40px; color: #999; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 20px; }
.btn-page { padding: 8px 16px; background: #f5f5f5; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
.btn-page:hover:not(:disabled) { background: #e5e5e5; }
.btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 14px; color: #666; }

@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .bar-item { grid-template-columns: 120px 1fr 60px; }
}
@media (max-width: 768px) {
  .page-header { flex-direction: column; }
  .header-actions { width: 100%; }
  .stats-grid { grid-template-columns: 1fr; }
  .filters-section { flex-direction: column; }
  .filter-select, .filter-input { width: 100%; }
}
</style>
