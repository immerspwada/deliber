<!--
  Enhanced Admin Performance Dashboard - MUNEEF Style
  
  Advanced performance monitoring with real-time metrics and interactive charts
  Features: system health, API performance, database metrics, user analytics
-->

<template>
  <EnhancedAdminLayout>
    <div class="enhanced-performance-dashboard">
      <!-- Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <h1 class="dashboard-title">Performance Dashboard</h1>
          <p class="dashboard-subtitle">ตรวจสอบประสิทธิภาพระบบและการทำงานแบบ Real-time</p>
        </div>
        
        <div class="header-actions">
          <AdminButton
            variant="outline"
            size="sm"
            :icon="RefreshIcon"
            @click="refreshMetrics"
            :loading="isRefreshing"
          >
            รีเฟรช
          </AdminButton>
          
          <AdminButton
            variant="ghost"
            size="sm"
            :icon="SettingsIcon"
            @click="showSettings = true"
          >
            ตั้งค่า
          </AdminButton>
        </div>
      </div>

      <!-- System Health Overview -->
      <div class="health-overview">
        <AdminCard
          title="System Health Overview"
          subtitle="สถานะรวมของระบบทั้งหมด"
          :icon="HealthIcon"
          icon-color="success"
          elevated
        >
          <div class="health-grid">
            <div class="health-item">
              <div class="health-indicator">
                <div class="indicator-dot healthy"></div>
                <span class="indicator-label">API Services</span>
              </div>
              <AdminStatusBadge
                status="success"
                text="Healthy"
                variant="soft"
                size="sm"
              />
            </div>

            <div class="health-item">
              <div class="health-indicator">
                <div class="indicator-dot healthy"></div>
                <span class="indicator-label">Database</span>
              </div>
              <AdminStatusBadge
                status="success"
                text="Connected"
                variant="soft"
                size="sm"
              />
            </div>

            <div class="health-item">
              <div class="health-indicator">
                <div class="indicator-dot warning"></div>
                <span class="indicator-label">Cache Layer</span>
              </div>
              <AdminStatusBadge
                status="warning"
                text="High Load"
                variant="soft"
                size="sm"
              />
            </div>

            <div class="health-item">
              <div class="health-indicator">
                <div class="indicator-dot healthy"></div>
                <span class="indicator-label">External APIs</span>
              </div>
              <AdminStatusBadge
                status="success"
                text="Operational"
                variant="soft"
                size="sm"
              />
            </div>
          </div>
        </AdminCard>
      </div>

      <!-- Performance Metrics Grid -->
      <div class="metrics-grid">
        <AdminStatCard
          label="API Response Time"
          :value="performanceMetrics.apiResponseTime"
          unit="ms"
          :trend="performanceMetrics.apiTrend"
          trend-unit="%"
          :icon="SpeedIcon"
          icon-color="info"
          variant="info"
          :chart-data="performanceMetrics.apiChartData"
          chart-color="#1976D2"
          :comparison="{ label: 'Target', value: 200, unit: 'ms' }"
        />

        <AdminStatCard
          label="Database Query Time"
          :value="performanceMetrics.dbQueryTime"
          unit="ms"
          :trend="performanceMetrics.dbTrend"
          trend-unit="%"
          :icon="DatabaseIcon"
          icon-color="success"
          variant="success"
          :progress="performanceMetrics.dbPerformance"
          progress-target="Optimal"
        />

        <AdminStatCard
          label="Memory Usage"
          :value="performanceMetrics.memoryUsage"
          unit="%"
          :trend="performanceMetrics.memoryTrend"
          trend-unit="%"
          :icon="MemoryIcon"
          icon-color="warning"
          variant="warning"
          :progress="performanceMetrics.memoryUsage"
          progress-target="100%"
        />

        <AdminStatCard
          label="Active Connections"
          :value="performanceMetrics.activeConnections"
          :trend="performanceMetrics.connectionsTrend"
          trend-unit="%"
          :icon="NetworkIcon"
          icon-color="primary"
          variant="default"
          :chart-data="performanceMetrics.connectionsChartData"
        />
      </div>

      <!-- Detailed Performance Charts -->
      <div class="charts-section">
        <div class="charts-grid">
          <!-- Response Time Chart -->
          <AdminCard
            title="API Response Time Trends"
            subtitle="ช่วง 24 ชั่วโมงล่าสุด"
            :icon="ChartIcon"
            icon-color="info"
            elevated
            class="chart-card"
          >
            <template #actions>
              <select v-model="responseTimeRange" class="time-range-select">
                <option value="1h">1 ชั่วโมง</option>
                <option value="6h">6 ชั่วโมง</option>
                <option value="24h">24 ชั่วโมง</option>
                <option value="7d">7 วัน</option>
              </select>
            </template>

            <div class="chart-container">
              <div class="chart-metrics">
                <div class="metric-item">
                  <span class="metric-label">Average</span>
                  <span class="metric-value">{{ performanceMetrics.apiResponseTime }}ms</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">P95</span>
                  <span class="metric-value">{{ performanceMetrics.apiP95 }}ms</span>
                </div>
                <div class="metric-item">
                  <span class="metric-label">P99</span>
                  <span class="metric-value">{{ performanceMetrics.apiP99 }}ms</span>
                </div>
              </div>
              
              <div class="chart-placeholder">
                <svg class="chart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M3 3v18h18M7 12l4-4 4 4 4-4"/>
                </svg>
                <p>Response Time Chart จะแสดงที่นี่</p>
              </div>
            </div>
          </AdminCard>

          <!-- Error Rate Chart -->
          <AdminCard
            title="Error Rate Analysis"
            subtitle="อัตราข้อผิดพลาดตามเวลา"
            :icon="AlertIcon"
            icon-color="error"
            elevated
            class="chart-card"
          >
            <div class="error-metrics">
              <div class="error-item">
                <div class="error-info">
                  <span class="error-code">4xx Errors</span>
                  <AdminStatusBadge
                    status="warning"
                    :text="`${performanceMetrics.error4xx}%`"
                    variant="soft"
                    size="sm"
                  />
                </div>
                <div class="error-bar">
                  <div 
                    class="error-fill warning" 
                    :style="{ width: `${performanceMetrics.error4xx}%` }"
                  ></div>
                </div>
              </div>

              <div class="error-item">
                <div class="error-info">
                  <span class="error-code">5xx Errors</span>
                  <AdminStatusBadge
                    status="error"
                    :text="`${performanceMetrics.error5xx}%`"
                    variant="soft"
                    size="sm"
                  />
                </div>
                <div class="error-bar">
                  <div 
                    class="error-fill error" 
                    :style="{ width: `${performanceMetrics.error5xx}%` }"
                  ></div>
                </div>
              </div>

              <div class="error-item">
                <div class="error-info">
                  <span class="error-code">Timeouts</span>
                  <AdminStatusBadge
                    status="info"
                    :text="`${performanceMetrics.timeouts}%`"
                    variant="soft"
                    size="sm"
                  />
                </div>
                <div class="error-bar">
                  <div 
                    class="error-fill info" 
                    :style="{ width: `${performanceMetrics.timeouts}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      <!-- Service Performance Table -->
      <div class="services-section">
        <AdminCard
          title="Service Performance Breakdown"
          subtitle="ประสิทธิภาพของแต่ละบริการ"
          :icon="ServiceIcon"
          icon-color="primary"
          elevated
        >
          <AdminTable
            :columns="serviceColumns"
            :data="servicePerformanceData"
            searchable
            search-placeholder="ค้นหาบริการ..."
            paginated
            :page-size="10"
          >
            <template #cell-status="{ value }">
              <AdminStatusBadge
                :status="getServiceStatus(value)"
                :text="getServiceStatusText(value)"
                variant="soft"
                size="sm"
              />
            </template>

            <template #cell-response_time="{ value }">
              <span :class="getResponseTimeClass(value)">{{ value }}ms</span>
            </template>

            <template #cell-error_rate="{ value }">
              <span :class="getErrorRateClass(value)">{{ value }}%</span>
            </template>

            <template #row-actions="{ row }">
              <AdminButton
                variant="ghost"
                size="xs"
                :icon="ViewIcon"
                @click="viewServiceDetails(row)"
              >
                ดูรายละเอียด
              </AdminButton>
            </template>
          </AdminTable>
        </AdminCard>
      </div>

      <!-- Performance Alerts -->
      <div class="alerts-section">
        <AdminCard
          title="Performance Alerts"
          subtitle="การแจ้งเตือนเกี่ยวกับประสิทธิภาพ"
          :icon="AlertIcon"
          icon-color="warning"
          elevated
        >
          <div class="alerts-list">
            <div
              v-for="alert in performanceAlerts"
              :key="alert.id"
              class="alert-item"
              :class="alert.severity"
            >
              <div class="alert-icon">
                <component :is="getAlertIcon(alert.severity)" />
              </div>
              <div class="alert-content">
                <div class="alert-title">{{ alert.title }}</div>
                <div class="alert-message">{{ alert.message }}</div>
                <div class="alert-time">{{ formatTime(alert.created_at) }}</div>
              </div>
              <div class="alert-actions">
                <AdminButton
                  variant="ghost"
                  size="xs"
                  @click="acknowledgeAlert(alert.id)"
                >
                  รับทราบ
                </AdminButton>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      <!-- Settings Modal -->
      <AdminModal
        v-model="showSettings"
        title="Performance Dashboard Settings"
        size="md"
      >
        <div class="settings-content">
          <div class="setting-group">
            <label class="setting-label">Auto Refresh Interval</label>
            <select v-model="refreshInterval" class="setting-select">
              <option value="5">5 วินาที</option>
              <option value="10">10 วินาที</option>
              <option value="30">30 วินาที</option>
              <option value="60">1 นาที</option>
            </select>
          </div>

          <div class="setting-group">
            <label class="setting-label">Alert Thresholds</label>
            <div class="threshold-inputs">
              <div class="threshold-item">
                <label>Response Time (ms)</label>
                <input v-model.number="thresholds.responseTime" type="number" class="threshold-input">
              </div>
              <div class="threshold-item">
                <label>Error Rate (%)</label>
                <input v-model.number="thresholds.errorRate" type="number" class="threshold-input">
              </div>
              <div class="threshold-item">
                <label>Memory Usage (%)</label>
                <input v-model.number="thresholds.memoryUsage" type="number" class="threshold-input">
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <AdminButton variant="outline" @click="showSettings = false">
            ยกเลิก
          </AdminButton>
          <AdminButton variant="primary" @click="saveSettings">
            บันทึก
          </AdminButton>
        </template>
      </AdminModal>
    </div>
  </EnhancedAdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  EnhancedAdminLayout,
  AdminCard,
  AdminStatCard,
  AdminButton,
  AdminStatusBadge,
  AdminTable,
  AdminModal,
  type AdminTableColumn
} from '../components/admin'

// Icons
const RefreshIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>' }
const SettingsIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/></svg>' }
const HealthIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' }
const SpeedIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 12l4 4 4-4M12 2v10"/></svg>' }
const DatabaseIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/></svg>' }
const MemoryIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg>' }
const NetworkIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M4 4l5 5"/></svg>' }
const ChartIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>' }
const AlertIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>' }
const ServiceIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/></svg>' }
const ViewIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' }

// State
const isRefreshing = ref(false)
const showSettings = ref(false)
const responseTimeRange = ref('24h')
const refreshInterval = ref(30)
const autoRefreshTimer = ref<NodeJS.Timeout>()

// Performance metrics
const performanceMetrics = ref({
  apiResponseTime: 145,
  apiTrend: -5.2,
  apiP95: 280,
  apiP99: 450,
  apiChartData: [120, 135, 145, 160, 155, 140, 145],
  
  dbQueryTime: 45,
  dbTrend: -2.1,
  dbPerformance: 85,
  
  memoryUsage: 68,
  memoryTrend: 3.4,
  
  activeConnections: 1247,
  connectionsTrend: 8.7,
  connectionsChartData: [1100, 1150, 1200, 1247, 1230, 1245, 1247],
  
  error4xx: 2.3,
  error5xx: 0.8,
  timeouts: 1.2
})

// Alert thresholds
const thresholds = ref({
  responseTime: 200,
  errorRate: 5,
  memoryUsage: 80
})

// Service performance data
const serviceColumns: AdminTableColumn[] = [
  { key: 'name', label: 'Service Name', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'response_time', label: 'Response Time', sortable: true },
  { key: 'error_rate', label: 'Error Rate', sortable: true },
  { key: 'requests_per_min', label: 'Req/Min', sortable: true, format: 'number' },
  { key: 'last_updated', label: 'Last Updated', sortable: true, format: 'date' }
]

const servicePerformanceData = ref([
  {
    id: 1,
    name: 'RideService',
    status: 'healthy',
    response_time: 145,
    error_rate: 0.8,
    requests_per_min: 234,
    last_updated: new Date()
  },
  {
    id: 2,
    name: 'PaymentService',
    status: 'healthy',
    response_time: 89,
    error_rate: 0.2,
    requests_per_min: 156,
    last_updated: new Date()
  },
  {
    id: 3,
    name: 'DeliveryService',
    status: 'warning',
    response_time: 340,
    error_rate: 3.2,
    requests_per_min: 78,
    last_updated: new Date()
  }
])

// Performance alerts
const performanceAlerts = ref([
  {
    id: 1,
    title: 'High Response Time',
    message: 'DeliveryService response time exceeded 300ms threshold',
    severity: 'warning',
    created_at: new Date()
  },
  {
    id: 2,
    title: 'Memory Usage Alert',
    message: 'Server memory usage is approaching 80% threshold',
    severity: 'info',
    created_at: new Date(Date.now() - 300000)
  }
])

// Methods
const refreshMetrics = async () => {
  isRefreshing.value = true
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // Update metrics with new data
  performanceMetrics.value.apiResponseTime = Math.floor(Math.random() * 50) + 120
  performanceMetrics.value.memoryUsage = Math.floor(Math.random() * 20) + 60
  performanceMetrics.value.activeConnections = Math.floor(Math.random() * 200) + 1200
  
  isRefreshing.value = false
}

const getServiceStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    healthy: 'success',
    warning: 'warning',
    error: 'error',
    maintenance: 'info'
  }
  return statusMap[status] || 'neutral'
}

const getServiceStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    healthy: 'Healthy',
    warning: 'Warning',
    error: 'Error',
    maintenance: 'Maintenance'
  }
  return textMap[status] || status
}

const getResponseTimeClass = (time: number) => {
  if (time > 300) return 'text-error'
  if (time > 200) return 'text-warning'
  return 'text-success'
}

const getErrorRateClass = (rate: number) => {
  if (rate > 5) return 'text-error'
  if (rate > 2) return 'text-warning'
  return 'text-success'
}

const getAlertIcon = (severity: string) => {
  const iconMap: Record<string, any> = {
    error: AlertIcon,
    warning: AlertIcon,
    info: { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' }
  }
  return iconMap[severity] || AlertIcon
}

const viewServiceDetails = (service: any) => {
  console.log('Viewing service details:', service)
}

const acknowledgeAlert = (alertId: number) => {
  const index = performanceAlerts.value.findIndex(alert => alert.id === alertId)
  if (index > -1) {
    performanceAlerts.value.splice(index, 1)
  }
}

const saveSettings = () => {
  // Save settings to localStorage or API
  localStorage.setItem('performance_settings', JSON.stringify({
    refreshInterval: refreshInterval.value,
    thresholds: thresholds.value
  }))
  
  // Restart auto-refresh with new interval
  startAutoRefresh()
  showSettings.value = false
}

const formatTime = (date: Date) => {
  return new Intl.RelativeTimeFormat('th').format(
    Math.floor((date.getTime() - Date.now()) / (1000 * 60)),
    'minute'
  )
}

const startAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
  }
  
  autoRefreshTimer.value = setInterval(() => {
    if (!isRefreshing.value) {
      refreshMetrics()
    }
  }, refreshInterval.value * 1000)
}

// Lifecycle
onMounted(() => {
  // Load saved settings
  const savedSettings = localStorage.getItem('performance_settings')
  if (savedSettings) {
    const settings = JSON.parse(savedSettings)
    refreshInterval.value = settings.refreshInterval || 30
    thresholds.value = { ...thresholds.value, ...settings.thresholds }
  }
  
  // Start auto-refresh
  startAutoRefresh()
  
  // Initial data load
  refreshMetrics()
})

onUnmounted(() => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
  }
})
</script>

<style scoped>
.enhanced-performance-dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

/* Dashboard Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #F0F0F0;
}

.header-content h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.dashboard-subtitle {
  font-size: 16px;
  color: #666666;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Health Overview */
.health-overview {
  margin-bottom: 32px;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.health-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.health-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.indicator-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.indicator-dot.healthy {
  background: #00A86B;
}

.indicator-dot.warning {
  background: #F5A623;
}

.indicator-dot.error {
  background: #E53935;
}

.indicator-label {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

/* Charts Section */
.charts-section {
  margin-bottom: 40px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.chart-card {
  min-height: 400px;
}

.time-range-select {
  padding: 6px 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
  background: #FFFFFF;
}

.chart-container {
  height: 320px;
}

.chart-metrics {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px;
  background: #F5F5F5;
  border-radius: 12px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  color: #666666;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
}

.chart-placeholder {
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666666;
}

.chart-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  color: #00A86B;
}

/* Error Metrics */
.error-metrics {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.error-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-code {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.error-bar {
  height: 8px;
  background: #F0F0F0;
  border-radius: 4px;
  overflow: hidden;
}

.error-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.8s ease;
}

.error-fill.warning {
  background: #F5A623;
}

.error-fill.error {
  background: #E53935;
}

.error-fill.info {
  background: #1976D2;
}

/* Services Section */
.services-section {
  margin-bottom: 40px;
}

.text-success {
  color: #00A86B;
  font-weight: 600;
}

.text-warning {
  color: #F5A623;
  font-weight: 600;
}

.text-error {
  color: #E53935;
  font-weight: 600;
}

/* Alerts Section */
.alerts-section {
  margin-bottom: 40px;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  border-left: 4px solid transparent;
}

.alert-item.warning {
  background: #FFF3E0;
  border-left-color: #F5A623;
}

.alert-item.error {
  background: #FFEBEE;
  border-left-color: #E53935;
}

.alert-item.info {
  background: #E3F2FD;
  border-left-color: #1976D2;
}

.alert-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: currentColor;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.alert-message {
  font-size: 13px;
  color: #666666;
  margin-bottom: 8px;
}

.alert-time {
  font-size: 12px;
  color: #999999;
}

.alert-actions {
  flex-shrink: 0;
}

/* Settings Modal */
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.setting-select {
  padding: 12px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  background: #FFFFFF;
}

.threshold-inputs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.threshold-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.threshold-item label {
  font-size: 12px;
  color: #666666;
}

.threshold-input {
  padding: 8px 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 1200px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-end;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .health-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-metrics {
    flex-direction: column;
    gap: 12px;
  }
  
  .threshold-inputs {
    grid-template-columns: 1fr;
  }
}
</style>