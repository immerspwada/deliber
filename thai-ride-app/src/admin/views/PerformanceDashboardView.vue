<script setup lang="ts">
/**
 * Performance Dashboard View
 * ==========================
 * Production KPIs และ Performance Metrics
 */
import { ref, computed, onMounted } from 'vue'
import { useAdminAPI } from '../composables/useAdminAPI'
import { useAdminUIStore } from '../stores/adminUI.store'

const api = useAdminAPI()
const uiStore = useAdminUIStore()

interface PerformanceMetric {
  name: string
  value: number
  target: number
  unit: string
  status: 'good' | 'warning' | 'critical'
}

interface SystemHealth {
  service: string
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  uptime: number
}

const metrics = ref<PerformanceMetric[]>([
  { name: 'API Response Time', value: 245, target: 500, unit: 'ms', status: 'good' },
  { name: 'Database Query Time', value: 85, target: 100, unit: 'ms', status: 'good' },
  { name: 'Error Rate', value: 0.12, target: 1, unit: '%', status: 'good' },
  { name: 'Active Users', value: 1250, target: 1000, unit: '', status: 'good' },
  { name: 'Orders/Hour', value: 156, target: 100, unit: '', status: 'good' },
  { name: 'Cache Hit Rate', value: 94.5, target: 90, unit: '%', status: 'good' }
])

const systemHealth = ref<SystemHealth[]>([
  { service: 'API Server', status: 'healthy', latency: 45, uptime: 99.99 },
  { service: 'Database', status: 'healthy', latency: 12, uptime: 99.95 },
  { service: 'Redis Cache', status: 'healthy', latency: 2, uptime: 99.99 },
  { service: 'Storage', status: 'healthy', latency: 85, uptime: 99.90 },
  { service: 'Realtime', status: 'healthy', latency: 25, uptime: 99.85 }
])

const lastUpdated = ref<Date>(new Date())

const overallHealth = computed(() => {
  const healthyCount = systemHealth.value.filter(s => s.status === 'healthy').length
  const total = systemHealth.value.length
  return Math.round((healthyCount / total) * 100)
})

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    good: '#10B981',
    healthy: '#10B981',
    warning: '#F59E0B',
    degraded: '#F59E0B',
    critical: '#EF4444',
    down: '#EF4444'
  }
  return colors[status] || '#6B7280'
}

function getStatusBg(status: string): string {
  const colors: Record<string, string> = {
    good: '#D1FAE5',
    healthy: '#D1FAE5',
    warning: '#FEF3C7',
    degraded: '#FEF3C7',
    critical: '#FEE2E2',
    down: '#FEE2E2'
  }
  return colors[status] || '#F3F4F6'
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function refreshData() {
  lastUpdated.value = new Date()
  uiStore.showInfo('รีเฟรชข้อมูลแล้ว')
}

onMounted(() => {
  uiStore.setBreadcrumbs([
    { label: 'Settings' },
    { label: 'Production KPIs' }
  ])
})
</script>

<template>
  <div class="performance-dashboard">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Production KPIs</h1>
        <span class="health-badge" :style="{ background: overallHealth >= 90 ? '#D1FAE5' : '#FEF3C7', color: overallHealth >= 90 ? '#065F46' : '#92400E' }">
          {{ overallHealth }}% Healthy
        </span>
      </div>
      <div class="header-right">
        <span class="last-update">อัพเดทล่าสุด: {{ formatTime(lastUpdated) }}</span>
        <button class="refresh-btn" @click="refreshData">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Performance Metrics -->
    <section class="section">
      <h2 class="section-title">Performance Metrics</h2>
      <div class="metrics-grid">
        <div v-for="metric in metrics" :key="metric.name" class="metric-card">
          <div class="metric-header">
            <span class="metric-name">{{ metric.name }}</span>
            <span class="metric-status" :style="{ background: getStatusBg(metric.status), color: getStatusColor(metric.status) }">
              {{ metric.status === 'good' ? '✓' : metric.status === 'warning' ? '!' : '✗' }}
            </span>
          </div>
          <div class="metric-value">
            {{ metric.value.toLocaleString() }}<span class="metric-unit">{{ metric.unit }}</span>
          </div>
          <div class="metric-target">
            Target: {{ metric.target.toLocaleString() }}{{ metric.unit }}
          </div>
          <div class="metric-bar">
            <div 
              class="metric-progress" 
              :style="{ 
                width: Math.min((metric.value / metric.target) * 100, 100) + '%',
                background: getStatusColor(metric.status)
              }"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- System Health -->
    <section class="section">
      <h2 class="section-title">System Health</h2>
      <div class="health-grid">
        <div v-for="service in systemHealth" :key="service.service" class="health-card">
          <div class="health-header">
            <span class="health-dot" :style="{ background: getStatusColor(service.status) }"></span>
            <span class="health-name">{{ service.service }}</span>
          </div>
          <div class="health-stats">
            <div class="health-stat">
              <span class="stat-label">Latency</span>
              <span class="stat-value">{{ service.latency }}ms</span>
            </div>
            <div class="health-stat">
              <span class="stat-label">Uptime</span>
              <span class="stat-value">{{ service.uptime }}%</span>
            </div>
          </div>
          <div class="health-status" :style="{ background: getStatusBg(service.status), color: getStatusColor(service.status) }">
            {{ service.status }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.performance-dashboard { max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-right { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.health-badge { padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
.last-update { font-size: 13px; color: #6B7280; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; transition: all 0.2s; }
.refresh-btn:hover { background: #F9FAFB; border-color: #00A86B; color: #00A86B; }

.section { margin-bottom: 32px; }
.section-title { font-size: 18px; font-weight: 600; color: #1F2937; margin: 0 0 16px 0; }

.metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.metric-card { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #E5E7EB; }
.metric-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.metric-name { font-size: 14px; color: #6B7280; }
.metric-status { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.metric-value { font-size: 32px; font-weight: 700; color: #1F2937; }
.metric-unit { font-size: 16px; font-weight: 400; color: #6B7280; margin-left: 4px; }
.metric-target { font-size: 12px; color: #9CA3AF; margin: 8px 0; }
.metric-bar { height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden; }
.metric-progress { height: 100%; border-radius: 3px; transition: width 0.3s ease; }

.health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.health-card { background: #fff; border-radius: 12px; padding: 16px; border: 1px solid #E5E7EB; }
.health-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.health-dot { width: 10px; height: 10px; border-radius: 50%; }
.health-name { font-size: 15px; font-weight: 600; color: #1F2937; }
.health-stats { display: flex; gap: 16px; margin-bottom: 12px; }
.health-stat { display: flex; flex-direction: column; }
.stat-label { font-size: 11px; color: #9CA3AF; text-transform: uppercase; }
.stat-value { font-size: 14px; font-weight: 600; color: #1F2937; }
.health-status { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize; text-align: center; }
</style>
