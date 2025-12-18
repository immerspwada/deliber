<!--
  Admin Service Management Dashboard - MUNEEF Style
  
  Comprehensive service management with enhanced architecture
  - Service registry management
  - Configuration management
  - Performance monitoring
  - Health checks
  - Hot reloading
-->

<template>
  <div class="admin-service-management">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="title">Service Management</h1>
          <p class="subtitle">Enhanced service architecture with modern patterns and monitoring</p>
        </div>
        
        <div class="header-actions">
          <button 
            @click="reloadAllServices" 
            :disabled="isReloading"
            class="btn btn-outline"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            {{ isReloading ? 'Reloading...' : 'Reload All' }}
          </button>
          
          <button 
            @click="showCreateServiceModal = true" 
            class="btn btn-primary"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Create Service
          </button>
        </div>
      </div>
    </div>

    <!-- Service Architecture Overview -->
    <div class="architecture-section">
      <div class="section-header">
        <h2>Service Architecture</h2>
        <div class="architecture-stats">
          <div class="stat">
            <span class="stat-value">{{ serviceConfigs.length }}</span>
            <span class="stat-label">Services</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ healthyServices }}</span>
            <span class="stat-label">Healthy</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ enhancedServices }}</span>
            <span class="stat-label">Enhanced</span>
          </div>
        </div>
      </div>

      <div class="architecture-diagram">
        <div class="layer">
          <h3>Presentation Layer</h3>
          <div class="components">
            <div class="component">Vue Components</div>
            <div class="component">Admin Dashboard</div>
            <div class="component">Provider App</div>
          </div>
        </div>
        
        <div class="layer">
          <h3>Service Layer (Enhanced)</h3>
          <div class="components">
            <div class="component enhanced">EnhancedRideService</div>
            <div class="component">PaymentService</div>
            <div class="component">DeliveryService</div>
            <div class="component">AdminService</div>
          </div>
        </div>
        
        <div class="layer">
          <h3>Core Infrastructure</h3>
          <div class="components">
            <div class="component">ServiceRegistry</div>
            <div class="component">Middleware Pipeline</div>
            <div class="component">Performance Monitor</div>
            <div class="component">Error Recovery</div>
          </div>
        </div>
        
        <div class="layer">
          <h3>Data Layer</h3>
          <div class="components">
            <div class="component">Repositories</div>
            <div class="component">Supabase</div>
            <div class="component">Cache Layer</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Service Registry -->
    <div class="registry-section">
      <div class="section-header">
        <h2>Service Registry</h2>
        <div class="registry-controls">
          <select v-model="registryFilter" class="filter-select">
            <option value="">All Services</option>
            <option value="enhanced">Enhanced Services</option>
            <option value="legacy">Legacy Services</option>
            <option value="singleton">Singletons</option>
          </select>
        </div>
      </div>

      <div class="services-grid">
        <div 
          v-for="service in filteredServices" 
          :key="service.name"
          class="service-card"
          :class="{ 
            'enhanced': service.isEnhanced,
            'unhealthy': !service.isHealthy 
          }"
        >
          <div class="service-header">
            <div class="service-info">
              <h3 class="service-name">{{ service.name }}</h3>
              <div class="service-badges">
                <span v-if="service.isEnhanced" class="badge enhanced">Enhanced</span>
                <span v-if="service.singleton" class="badge">Singleton</span>
                <span v-if="service.lazy" class="badge">Lazy</span>
              </div>
            </div>
            
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

          <div class="service-description">
            {{ service.description || 'No description available' }}
          </div>

          <div class="service-metrics">
            <div class="metric">
              <div class="metric-label">Instances</div>
              <div class="metric-value">{{ service.instanceCount || 0 }}</div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Calls</div>
              <div class="metric-value">{{ service.totalCalls || 0 }}</div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Avg Response</div>
              <div class="metric-value">{{ service.averageResponseTime || 0 }}ms</div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Error Rate</div>
              <div class="metric-value">{{ ((service.errorRate || 0) * 100).toFixed(1) }}%</div>
            </div>
          </div>

          <div v-if="service.dependencies?.length" class="service-dependencies">
            <div class="dependencies-label">Dependencies:</div>
            <div class="dependencies-list">
              <span 
                v-for="dep in service.dependencies" 
                :key="dep"
                class="dependency-tag"
              >
                {{ dep }}
              </span>
            </div>
          </div>

          <div class="service-actions">
            <button 
              @click="configureService(service)"
              class="btn btn-sm btn-outline"
            >
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
              Configure
            </button>
            
            <button 
              @click="reloadService(service.name)"
              :disabled="service.isReloading"
              class="btn btn-sm btn-outline"
            >
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              {{ service.isReloading ? 'Reloading...' : 'Reload' }}
            </button>
            
            <button 
              @click="toggleService(service.name, !service.enabled)"
              :class="['btn', 'btn-sm', service.enabled ? 'btn-error' : 'btn-primary']"
            >
              {{ service.enabled ? 'Disable' : 'Enable' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Patterns -->
    <div class="patterns-section">
      <div class="section-header">
        <h2>Performance Patterns</h2>
      </div>

      <div class="patterns-grid">
        <div class="pattern-card">
          <div class="pattern-header">
            <h3>Caching</h3>
            <div class="pattern-status active">Active</div>
          </div>
          <div class="pattern-stats">
            <div class="stat">
              <span class="stat-value">87.5%</span>
              <span class="stat-label">Hit Rate</span>
            </div>
            <div class="stat">
              <span class="stat-value">1,247</span>
              <span class="stat-label">Cached Items</span>
            </div>
          </div>
          <div class="pattern-description">
            LRU cache with TTL for frequently accessed data
          </div>
        </div>

        <div class="pattern-card">
          <div class="pattern-header">
            <h3>Circuit Breaker</h3>
            <div class="pattern-status active">Active</div>
          </div>
          <div class="pattern-stats">
            <div class="stat">
              <span class="stat-value">3</span>
              <span class="stat-label">Open Circuits</span>
            </div>
            <div class="stat">
              <span class="stat-value">99.2%</span>
              <span class="stat-label">Success Rate</span>
            </div>
          </div>
          <div class="pattern-description">
            Prevents cascade failures with automatic recovery
          </div>
        </div>

        <div class="pattern-card">
          <div class="pattern-header">
            <h3>Rate Limiting</h3>
            <div class="pattern-status active">Active</div>
          </div>
          <div class="pattern-stats">
            <div class="stat">
              <span class="stat-value">1,000</span>
              <span class="stat-label">Req/Min Limit</span>
            </div>
            <div class="stat">
              <span class="stat-value">234</span>
              <span class="stat-label">Current Rate</span>
            </div>
          </div>
          <div class="pattern-description">
            Protects services from overload with smart throttling
          </div>
        </div>

        <div class="pattern-card">
          <div class="pattern-header">
            <h3>Retry with Backoff</h3>
            <div class="pattern-status active">Active</div>
          </div>
          <div class="pattern-stats">
            <div class="stat">
              <span class="stat-value">3</span>
              <span class="stat-label">Max Attempts</span>
            </div>
            <div class="stat">
              <span class="stat-value">89.3%</span>
              <span class="stat-label">Recovery Rate</span>
            </div>
          </div>
          <div class="pattern-description">
            Exponential backoff for transient failure recovery
          </div>
        </div>
      </div>
    </div>

    <!-- Service Configuration Modal -->
    <div v-if="showConfigModal" class="modal-overlay" @click="closeConfigModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Configure {{ selectedService?.name }}</h3>
          <button @click="closeConfigModal" class="close-btn">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="modal-content">
          <div class="config-section">
            <h4>Basic Configuration</h4>
            <div class="config-grid">
              <div class="config-item">
                <label>Singleton</label>
                <input 
                  type="checkbox" 
                  v-model="serviceConfig.singleton"
                  class="checkbox"
                >
              </div>
              
              <div class="config-item">
                <label>Lazy Loading</label>
                <input 
                  type="checkbox" 
                  v-model="serviceConfig.lazy"
                  class="checkbox"
                >
              </div>
              
              <div class="config-item">
                <label>Enabled</label>
                <input 
                  type="checkbox" 
                  v-model="serviceConfig.enabled"
                  class="checkbox"
                >
              </div>
            </div>
          </div>

          <div class="config-section">
            <h4>Performance Settings</h4>
            <div class="config-grid">
              <div class="config-item">
                <label>Cache Enabled</label>
                <input 
                  type="checkbox" 
                  v-model="serviceConfig.cacheEnabled"
                  class="checkbox"
                >
              </div>
              
              <div class="config-item">
                <label>Cache TTL (ms)</label>
                <input 
                  type="number" 
                  v-model="serviceConfig.cacheTTL"
                  class="input"
                  :disabled="!serviceConfig.cacheEnabled"
                >
              </div>
              
              <div class="config-item">
                <label>Rate Limit (req/min)</label>
                <input 
                  type="number" 
                  v-model="serviceConfig.maxRequestsPerMinute"
                  class="input"
                >
              </div>
            </div>
          </div>

          <div class="config-section">
            <h4>Monitoring</h4>
            <div class="config-grid">
              <div class="config-item">
                <label>Performance Monitoring</label>
                <input 
                  type="checkbox" 
                  v-model="serviceConfig.performanceMonitoring"
                  class="checkbox"
                >
              </div>
              
              <div class="config-item">
                <label>Circuit Breaker</label>
                <input 
                  type="checkbox" 
                  v-model="serviceConfig.circuitBreakerEnabled"
                  class="checkbox"
                >
              </div>
              
              <div class="config-item">
                <label>Error Logging</label>
                <input 
                  type="checkbox" 
                  v-model="serviceConfig.errorLogging"
                  class="checkbox"
                >
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeConfigModal" class="btn btn-outline">
            Cancel
          </button>
          <button @click="saveServiceConfig" class="btn btn-primary">
            Save Configuration
          </button>
        </div>
      </div>
    </div>

    <!-- Create Service Modal -->
    <div v-if="showCreateServiceModal" class="modal-overlay" @click="closeCreateServiceModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Create New Service</h3>
          <button @click="closeCreateServiceModal" class="close-btn">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="modal-content">
          <div class="form-group">
            <label>Service Name</label>
            <input 
              type="text" 
              v-model="newService.name"
              class="input"
              placeholder="e.g., NotificationService"
            >
          </div>
          
          <div class="form-group">
            <label>Implementation</label>
            <input 
              type="text" 
              v-model="newService.implementation"
              class="input"
              placeholder="e.g., NotificationService"
            >
          </div>
          
          <div class="form-group">
            <label>Description</label>
            <textarea 
              v-model="newService.description"
              class="textarea"
              placeholder="Service description..."
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>Dependencies</label>
            <input 
              type="text" 
              v-model="newService.dependenciesText"
              class="input"
              placeholder="UserRepository, PaymentRepository (comma separated)"
            >
          </div>
          
          <div class="form-group">
            <label>Service Type</label>
            <select v-model="newService.type" class="select">
              <option value="enhanced">Enhanced Service</option>
              <option value="legacy">Legacy Service</option>
            </select>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeCreateServiceModal" class="btn btn-outline">
            Cancel
          </button>
          <button @click="createService" class="btn btn-primary">
            Create Service
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useServiceManagement } from '../composables/useServiceManagement'

// Composables
const { 
  getServiceConfiguration,
  updateServiceConfiguration,
  restartService: adminRestartService,
  toggleService: adminToggleService 
} = useServiceManagement()

// Reactive state
const serviceConfigs = ref<any[]>([])
const isReloading = ref(false)
const registryFilter = ref('')
const showConfigModal = ref(false)
const showCreateServiceModal = ref(false)
const selectedService = ref<any>(null)

// Service configuration
const serviceConfig = ref({
  singleton: true,
  lazy: true,
  enabled: true,
  cacheEnabled: true,
  cacheTTL: 300000,
  maxRequestsPerMinute: 1000,
  performanceMonitoring: true,
  circuitBreakerEnabled: true,
  errorLogging: true
})

// New service form
const newService = ref({
  name: '',
  implementation: '',
  description: '',
  dependenciesText: '',
  type: 'enhanced'
})

// Computed properties
const healthyServices = computed(() => 
  serviceConfigs.value.filter(s => s.isHealthy).length
)

const enhancedServices = computed(() => 
  serviceConfigs.value.filter(s => s.isEnhanced).length
)

const filteredServices = computed(() => {
  if (!registryFilter.value) return serviceConfigs.value
  
  return serviceConfigs.value.filter(service => {
    switch (registryFilter.value) {
      case 'enhanced':
        return service.isEnhanced
      case 'legacy':
        return !service.isEnhanced
      case 'singleton':
        return service.singleton
      default:
        return true
    }
  })
})

// Methods
const loadServiceConfigurations = async () => {
  try {
    const configs = await getServiceConfiguration()
    
    // Mock enhanced service data
    serviceConfigs.value = [
      {
        name: 'EnhancedRideService',
        implementation: 'EnhancedRideService',
        description: 'Next-generation ride service with advanced patterns and ML optimization',
        dependencies: ['UserRepository', 'ProviderRepository', 'RideRepository'],
        singleton: true,
        lazy: true,
        enabled: true,
        isEnhanced: true,
        isHealthy: true,
        instanceCount: 1,
        totalCalls: 15420,
        averageResponseTime: 145,
        errorRate: 0.008,
        isReloading: false
      },
      {
        name: 'PaymentService',
        implementation: 'PaymentService',
        description: 'Secure payment processing with multiple providers',
        dependencies: ['PaymentRepository', 'UserRepository'],
        singleton: true,
        lazy: true,
        enabled: true,
        isEnhanced: false,
        isHealthy: true,
        instanceCount: 1,
        totalCalls: 8934,
        averageResponseTime: 89,
        errorRate: 0.002,
        isReloading: false
      },
      {
        name: 'DeliveryService',
        implementation: 'DeliveryService',
        description: 'Delivery management and tracking service',
        dependencies: ['DeliveryRepository', 'ProviderRepository'],
        singleton: true,
        lazy: true,
        enabled: true,
        isEnhanced: false,
        isHealthy: false,
        instanceCount: 1,
        totalCalls: 3456,
        averageResponseTime: 2340,
        errorRate: 0.127,
        isReloading: false
      },
      {
        name: 'AdminService',
        implementation: 'AdminService',
        description: 'Administrative functions and dashboard management',
        dependencies: ['UserRepository', 'RideRepository'],
        singleton: true,
        lazy: true,
        enabled: true,
        isEnhanced: false,
        isHealthy: true,
        instanceCount: 1,
        totalCalls: 1234,
        averageResponseTime: 67,
        errorRate: 0.001,
        isReloading: false
      }
    ]
  } catch (error) {
    console.error('Failed to load service configurations:', error)
  }
}

const reloadAllServices = async () => {
  isReloading.value = true
  try {
    // Simulate reload delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    await loadServiceConfigurations()
  } finally {
    isReloading.value = false
  }
}

const reloadService = async (serviceName: string) => {
  const service = serviceConfigs.value.find(s => s.name === serviceName)
  if (!service) return
  
  service.isReloading = true
  
  try {
    await adminRestartService(serviceName)
    
    // Simulate reload delay
    setTimeout(() => {
      service.isReloading = false
      service.isHealthy = true
    }, 3000)
  } catch (error) {
    console.error(`Failed to reload service ${serviceName}:`, error)
    service.isReloading = false
  }
}

const toggleService = async (serviceName: string, enabled: boolean) => {
  try {
    await adminToggleService(serviceName, enabled)
    
    const service = serviceConfigs.value.find(s => s.name === serviceName)
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

const configureService = (service: any) => {
  selectedService.value = service
  
  // Load current configuration
  serviceConfig.value = {
    singleton: service.singleton,
    lazy: service.lazy,
    enabled: service.enabled,
    cacheEnabled: service.config?.cacheEnabled ?? true,
    cacheTTL: service.config?.cacheTTL ?? 300000,
    maxRequestsPerMinute: service.config?.maxRequestsPerMinute ?? 1000,
    performanceMonitoring: service.config?.performanceMonitoring ?? true,
    circuitBreakerEnabled: service.config?.circuitBreakerEnabled ?? true,
    errorLogging: service.config?.errorLogging ?? true
  }
  
  showConfigModal.value = true
}

const closeConfigModal = () => {
  showConfigModal.value = false
  selectedService.value = null
}

const saveServiceConfig = async () => {
  if (!selectedService.value) return
  
  try {
    await updateServiceConfiguration(selectedService.value.name, serviceConfig.value)
    
    // Update local state
    Object.assign(selectedService.value, serviceConfig.value)
    
    closeConfigModal()
  } catch (error) {
    console.error('Failed to save service configuration:', error)
  }
}

const closeCreateServiceModal = () => {
  showCreateServiceModal.value = false
  newService.value = {
    name: '',
    implementation: '',
    description: '',
    dependenciesText: '',
    type: 'enhanced'
  }
}

const createService = async () => {
  try {
    const dependencies = newService.value.dependenciesText
      .split(',')
      .map(dep => dep.trim())
      .filter(dep => dep.length > 0)
    
    const serviceData = {
      name: newService.value.name,
      implementation: newService.value.implementation,
      description: newService.value.description,
      dependencies,
      singleton: true,
      lazy: true,
      enabled: true,
      isEnhanced: newService.value.type === 'enhanced',
      isHealthy: true,
      instanceCount: 0,
      totalCalls: 0,
      averageResponseTime: 0,
      errorRate: 0,
      isReloading: false
    }
    
    serviceConfigs.value.push(serviceData)
    closeCreateServiceModal()
  } catch (error) {
    console.error('Failed to create service:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadServiceConfigurations()
})
</script>

<style scoped>
.admin-service-management {
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

/* Architecture Section */
.architecture-section {
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

.architecture-stats {
  display: flex;
  gap: 24px;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #00A86B;
}

.stat-label {
  font-size: 12px;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.architecture-diagram {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  padding: 24px;
}

.layer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.layer h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.components {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.component {
  padding: 8px 16px;
  background: #F5F5F5;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
}

.component.enhanced {
  background: #E8F5EF;
  color: #00A86B;
}

/* Registry Section */
.registry-section {
  margin-bottom: 40px;
}

.registry-controls {
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

.service-card.enhanced {
  border-color: #00A86B;
  background: linear-gradient(135deg, #FFFFFF 0%, #F8FFF9 100%);
}

.service-card.unhealthy {
  border-color: #E53935;
  background: #FFF5F5;
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
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

.service-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  background: #F5F5F5;
  color: #666666;
}

.badge.enhanced {
  background: #E8F5EF;
  color: #00A86B;
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

.service-description {
  font-size: 14px;
  color: #666666;
  margin-bottom: 16px;
  line-height: 1.5;
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
  background: #F5F5F5;
  color: #666666;
}

.service-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Patterns Section */
.patterns-section {
  margin-bottom: 40px;
}

.patterns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.pattern-card {
  background: #FFFFFF;
  border: 1px solid #F0F0F0;
  border-radius: 16px;
  padding: 24px;
}

.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.pattern-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.pattern-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.pattern-status.active {
  background: #E8F5EF;
  color: #00A86B;
}

.pattern-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.pattern-description {
  font-size: 14px;
  color: #666666;
  line-height: 1.5;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #FFFFFF;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #F0F0F0;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #F5F5F5;
}

.modal-content {
  padding: 24px;
}

.config-section {
  margin-bottom: 24px;
}

.config-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 16px 0;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.input, .select, .textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 14px;
  background: #FFFFFF;
  color: #1A1A1A;
}

.input:focus, .select:focus, .textarea:focus {
  outline: none;
  border-color: #00A86B;
}

.textarea {
  min-height: 80px;
  resize: vertical;
}

.checkbox {
  width: 20px;
  height: 20px;
  accent-color: #00A86B;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #F0F0F0;
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
  .admin-service-management {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .architecture-stats {
    justify-content: space-around;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
  
  .patterns-grid {
    grid-template-columns: 1fr;
  }
  
  .service-actions {
    flex-direction: column;
  }
  
  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>