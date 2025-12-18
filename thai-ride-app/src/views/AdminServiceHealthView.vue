<!--
  Admin Service Health View - MUNEEF Style
  
  Comprehensive service health monitoring dashboard
  - Real-time service status
  - Performance metrics
  - Service management controls
  - Health history and trends
-->

<template>
  <div class="admin-service-health">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="title">Service Health Monitor</h1>
          <p class="subtitle">Real-time monitoring and management of all system services</p>
        </div>
        
        <div class="header-actions">
          <button 
            @click="refreshAll" 
            :disabled="isRefreshing"
            class="btn btn-outline"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            {{ isRefreshing ? 'Refreshing...' : 'Refresh All' }}
          </button>
          
          <button 
            @click="toggleAutoRefresh" 
            :class="['btn', autoRefresh ? 'btn-primary' : 'btn-outline']"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
            </svg>
            Auto Refresh {{ autoRefresh ? 'ON' : 'OFF' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Service Overview Cards -->
    <div class="overview-grid">
      <div class="overview-card">
        <div class="card-header">
          <h3>Total Services</h3>
          <div class="status-indicator healthy">
            <span class="dot"></span>
            {{ totalServices }}
          </div>
        </div>
        <div class="card-content">
          <div class="metric-large">{{ totalServices }}</div>
          <div class="metric-label">Registered Services</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-header">
          <h3>Healthy Services</h3>
          <div class="status-indicator healthy">
            <span class="dot"></span>
            {{ healthyServices }}
          </div>
        </div>
        <div class="card-content">
          <div class="metric-large">{{ healthyServices }}</div>
          <div class="metric-label">Running Normally</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-header">
          <h3>Unhealthy Services</h3>
          <div class="status-indicator" :class="unhealthyServices > 0 ? 'error' : 'healthy'">
            <span class="dot"></span>
            {{ unhealthyServices }}
          </div>
        </div>
        <div class="card-content">
          <div class="metric-large">{{ unhealthyServices }}</div>
          <div class="metric-label">Need Attention</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="card-header">
          <h3>System Uptime</h3>
          <div class="status-indicator healthy">
            <span class="dot"></span>
            {{ systemUptime }}
          </div>
        </div>
        <div class="card-content">
          <div class="metric-large">{{ systemUptime }}</div>
          <div class="metric-label">Hours</div>
        </div>
      </div>
    </div>

    <!-- Service List -->
    <div class="services-section">
      <div class="section-header">
        <h2>Service Status</h2>
        <div class="filters">
          <select v-model="statusFilter" class="filter-select">
            <option value="">All Services</option>
            <option value="healthy">Healthy Only</option>
            <option value="unhealthy">Unhealthy Only</option>
          </select>
        </div>
      </div>

      <div class="services-grid">
        <div 
          v-for="service in filteredServices" 
          :key="service.name"
          class="service-card"
          :class="{ 'unhealthy': !service.isHealthy }"
        >
          <div class="service-header">
            <div class="service-info">
              <h3 class="service-name">{{ service.name }}</h3>
              <div class="service-status">
                <div 
                  class="status-dot" 
                  :class="service.isHealthy ? 'healthy' : 'error'"
                ></div>
                <span class="status-text">
                  {{ service.isHealthy ? 'Healthy' : 'Unhealthy' }}
                </span>
              </div>
            </div>
            
            <div class="service-actions">
              <button 
                @click="restartService(service.name)"
                :disabled="service.isRestarting"
                class="btn btn-sm btn-outline"
              >
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                {{ service.isRestarting ? 'Restarting...' : 'Restart' }}
              </button>
              
              <button 
                @click="toggleService(service.name, !service.enabled)"
                :class="['btn', 'btn-sm', service.enabled ? 'btn-error' : 'btn-primary']"
              >
                {{ service.enabled ? 'Disable' : 'Enable' }}
              </button>
            </div>
          </div>

          <div class="service-metrics">
            <div class="metric">
              <div class="metric-label">Response Time</div>
              <div class="metric-value">{{ service.responseTime }}ms</div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Success Rate</div>
              <div class="metric-value">{{ service.successRate }}%</div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Requests/min</div>
              <div class="metric-value">{{ service.requestsPerMinute }}</div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Last Check</div>
              <div class="metric-value">{{ formatTime(service.lastHealthCheck) }}</div>
            </div>
          </div>

          <div v-if="service.dependencies?.length" class="service-dependencies">
            <div class="dependencies-label">Dependencies:</div>
            <div class="dependencies-list">
              <span 
                v-for="dep in service.dependencies" 
                :key="dep"
                class="dependency-tag"
                :class="getDependencyStatus(dep)"
              >
                {{ dep }}
              </span>
            </div>
          </div>

          <div v-if="!service.isHealthy && service.error" class="service-error">
            <div class="error-label">Error Details:</div>
            <div class="error-message">{{ service.error }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Charts -->
    <div class="charts-section">
      <div class="section-header">
        <h2>Performance Trends</h2>
        <div class="chart-controls">
          <select v-model="chartTimeframe" class="filter-select">
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <h3>Response Time Trends</h3>
          <div class="chart-placeholder">
            <div class="chart-info">Response time chart would be rendered here</div>
          </div>
        </div>

        <div class="chart-card">
          <h3>Success Rate Trends</h3>
          <div class="chart-placeholder">
            <div class="chart-info">Success rate chart would be rendered here</div>
          </div>
        </div>

        <div class="chart-card">
          <h3>Request Volume</h3>
          <div class="chart-placeholder">
            <div class="chart-info">Request volume chart would be rendered here</div>
          </div>
        </div>

        <div class="chart-card">
          <h3>Error Rate</h3>
          <div class="chart-placeholder">
            <div class="chart-info">Error rate chart would be rendered here</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Logs -->
    <div class="logs-section">
      <div class="section-header">
        <h2>Recent Service Logs</h2>
        <div class="log-controls">
          <select v-model="logLevel" class="filter-select">
            <option value="">All Levels</option>
            <option value="error">Errors Only</option>
            <option value="warn">Warnings & Errors</option>
            <option value="info">Info & Above</option>
          </select>
          
          <button @click="clearLogs" class="btn btn-outline btn-sm">
            Clear Logs
          </button>
        </div>
      </div>

      <div class="logs-container">
        <div 
          v-for="log in filteredLogs" 
          :key="log.id"
          class="log-entry"
          :class="log.level"
        >
          <div class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</div>
          <div class="log-service">{{ log.service }}</div>
          <div class="log-level">{{ log.level.toUpperCase() }}</div>
          <div class="log-message">{{ log.message }}</div>
        </div>
        
        <div v-if="!filteredLogs.length" class="no-logs">
          No logs available
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useServiceManagement } from '../composables/useServiceManagement'

// Composables
const { 
  getServiceHealth, 
  getServiceMetrics, 
  restartService: adminRestartService,
  toggleService: adminToggleService 
} = useServiceManagement()

// Reactive state
const services = ref<any[]>([])
const logs = ref<any[]>([])
const isRefreshing = ref(false)
const autoRefresh = ref(true)
const statusFilter = ref('')
const logLevel = ref('')
const chartTimeframe = ref('24h')

let refreshInterval: any = null

// Computed properties
const totalServices = computed(() => services.value.length)
const healthyServices = computed(() => services.value.filter(s => s.isHealthy).length)
const unhealthyServices = computed(() => services.value.filter(s => !s.isHealthy).length)
const systemUptime = computed(() => {
  // Mock uptime calculation
  return Math.floor(performance.now() / 1000 / 60 / 60)
})

const filteredServices = computed(() => {
  if (!statusFilter.value) return services.value
  
  return services.value.filter(service => {
    if (statusFilter.value === 'healthy') return service.isHealthy
    if (statusFilter.value === 'unhealthy') return !service.isHealthy
    return true
  })
})

const filteredLogs = computed(() => {
  if (!logLevel.value) return logs.value
  
  const levels = ['debug', 'info', 'warn', 'error']
  const minLevel = levels.indexOf(logLevel.value)
  
  return logs.value.filter(log => {
    const logLevelIndex = levels.indexOf(log.level)
    return logLevelIndex >= minLevel
  })
})

// Methods
const loadServiceHealth = async () => {
  try {
    const healthData = await getServiceHealth()
    const metricsData = await getServiceMetrics()
    
    // Mock service data - in real implementation, this would come from the API
    services.value = [
      {
        name: 'RideService',
        isHealthy: true,
        enabled: true,
        responseTime: 145,
        successRate: 99.2,
        requestsPerMinute: 234,
        lastHealthCheck: new Date(),
        dependencies: ['UserRepository', 'ProviderRepository'],
        isRestarting: false
      },
      {
        name: 'PaymentService',
        isHealthy: true,
        enabled: true,
        responseTime: 89,
        successRate: 98.7,
        requestsPerMinute: 156,
        lastHealthCheck: new Date(),
        dependencies: ['PaymentRepository'],
        isRestarting: false
      },
      {
        name: 'DeliveryService',
        isHealthy: false,
        enabled: true,
        responseTime: 2340,
        successRate: 87.3,
        requestsPerMinute: 45,
        lastHealthCheck: new Date(),
        dependencies: ['DeliveryRepository', 'ProviderRepository'],
        error: 'Database connection timeout',
        isRestarting: false
      },
      {
        name: 'AdminService',
        isHealthy: true,
        enabled: true,
        responseTime: 67,
        successRate: 99.8,
        requestsPerMinute: 23,
        lastHealthCheck: new Date(),
        dependencies: ['UserRepository', 'RideRepository'],
        isRestarting: false
      }
    ]
  } catch (error) {
    console.error('Failed to load service health:', error)
  }
}

const loadServiceLogs = async () => {
  // Mock logs - in real implementation, this would come from the API
  logs.value = [
    {
      id: 1,
      timestamp: new Date(),
      service: 'DeliveryService',
      level: 'error',
      message: 'Database connection timeout after 30 seconds'
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 60000),
      service: 'RideService',
      level: 'info',
      message: 'Successfully processed ride request #12345'
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 120000),
      service: 'PaymentService',
      level: 'warn',
      message: 'Payment gateway response time exceeded threshold (5s)'
    }
  ]
}

const refreshAll = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([
      loadServiceHealth(),
      loadServiceLogs()
    ])
  } finally {
    isRefreshing.value = false
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
  
  refreshInterval = setInterval(() => {
    refreshAll()
  }, 30000) // Refresh every 30 seconds
}

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

const restartService = async (serviceName: string) => {
  const service = services.value.find(s => s.name === serviceName)
  if (!service) return
  
  service.isRestarting = true
  
  try {
    await adminRestartService(serviceName)
    
    // Simulate restart delay
    setTimeout(() => {
      service.isRestarting = false
      service.isHealthy = true
      service.error = null
    }, 3000)
  } catch (error) {
    console.error(`Failed to restart service ${serviceName}:`, error)
    service.isRestarting = false
  }
}

const toggleService = async (serviceName: string, enabled: boolean) => {
  try {
    await adminToggleService(serviceName, enabled)
    
    const service = services.value.find(s => s.name === serviceName)
    if (service) {
      service.enabled = enabled
      if (!enabled) {
        service.isHealthy = false
      }
    }
  } catch (error) {
    console.error(`Failed to toggle service ${serviceName}:`, error)
  }
}

const getDependencyStatus = (dependencyName: string): string => {
  const dependency = services.value.find(s => s.name === dependencyName)
  if (!dependency) return 'unknown'
  return dependency.isHealthy ? 'healthy' : 'error'
}

const clearLogs = () => {
  logs.value = []
}

const formatTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString()
}

// Lifecycle
onMounted(() => {
  refreshAll()
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.admin-service-health {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.title-section {
  flex: 1;
}

.title {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 16px;
  color: #666666;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Overview Grid */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.overview-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  padding: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.status-indicator.healthy {
  color: #00A86B;
}

.status-indicator.error {
  color: #E53935;
}

.status-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.card-content {
  text-align: center;
}

.metric-large {
  font-size: 36px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #666666;
}

/* Services Section */
.services-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0;
}

.filters {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 8px 12px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  background: #FFFFFF;
  color: #1A1A1A;
}

.filter-select:focus {
  outline: none;
  border-color: #00A86B;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.service-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  padding: 24px;
  transition: all 0.2s ease;
}

.service-card.unhealthy {
  border-color: #E53935;
  background: #FFF5F5;
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.service-info {
  flex: 1;
}

.service-name {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.service-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.healthy {
  background: #00A86B;
}

.status-dot.error {
  background: #E53935;
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  color: #666666;
}

.service-actions {
  display: flex;
  gap: 8px;
}

.service-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.metric {
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #999999;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.service-dependencies {
  margin-bottom: 16px;
}

.dependencies-label {
  font-size: 12px;
  color: #999999;
  margin-bottom: 8px;
}

.dependencies-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dependency-tag {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.dependency-tag.healthy {
  background: #E8F5EF;
  color: #00A86B;
}

.dependency-tag.error {
  background: #FFEBEE;
  color: #E53935;
}

.dependency-tag.unknown {
  background: #F5F5F5;
  color: #666666;
}

.service-error {
  padding: 12px;
  background: #FFEBEE;
  border-radius: 8px;
  border-left: 4px solid #E53935;
}

.error-label {
  font-size: 12px;
  font-weight: 600;
  color: #E53935;
  margin-bottom: 4px;
}

.error-message {
  font-size: 14px;
  color: #1A1A1A;
}

/* Charts Section */
.charts-section {
  margin-bottom: 40px;
}

.chart-controls {
  display: flex;
  gap: 12px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.chart-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  padding: 24px;
}

.chart-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 16px 0;
}

.chart-placeholder {
  height: 200px;
  background: #F5F5F5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-info {
  color: #666666;
  font-size: 14px;
}

/* Logs Section */
.logs-section {
  margin-bottom: 40px;
}

.log-controls {
  display: flex;
  gap: 12px;
}

.logs-container {
  background: #1A1A1A;
  border-radius: 12px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.log-entry {
  display: grid;
  grid-template-columns: 100px 120px 60px 1fr;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #333333;
  font-size: 12px;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-timestamp {
  color: #999999;
}

.log-service {
  color: #00A86B;
  font-weight: 500;
}

.log-level {
  font-weight: 600;
}

.log-entry.error .log-level {
  color: #E53935;
}

.log-entry.warn .log-level {
  color: #F5A623;
}

.log-entry.info .log-level {
  color: #2196F3;
}

.log-entry.debug .log-level {
  color: #999999;
}

.log-message {
  color: #FFFFFF;
}

.no-logs {
  text-align: center;
  color: #666666;
  padding: 40px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #00A86B;
  color: #FFFFFF;
}

.btn-primary:hover:not(:disabled) {
  background: #008F5B;
}

.btn-outline {
  background: transparent;
  color: #00A86B;
  border: 2px solid #00A86B;
}

.btn-outline:hover:not(:disabled) {
  background: #00A86B;
  color: #FFFFFF;
}

.btn-error {
  background: #E53935;
  color: #FFFFFF;
}

.btn-error:hover:not(:disabled) {
  background: #C62828;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 12px;
}

.icon {
  width: 16px;
  height: 16px;
  stroke-width: 2;
}

/* Responsive */
@media (max-width: 768px) {
  .admin-service-health {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .overview-grid {
    grid-template-columns: 1fr;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .service-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .service-actions {
    align-self: stretch;
  }
  
  .log-entry {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>