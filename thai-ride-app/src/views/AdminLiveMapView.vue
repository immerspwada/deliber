<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useProviderHeatmap } from '../composables/useProviderHeatmap'

const { 
  loading, 
  providers, 
  fetchProviders, 
  subscribeToUpdates, 
  getStats 
} = useProviderHeatmap()

// Filters
const filterType = ref<'all' | 'driver' | 'rider'>('all')
const showAvailableOnly = ref(false)
const viewMode = ref<'markers' | 'heatmap'>('markers')

// Stats
const stats = computed(() => getStats())

// Filtered providers
const filteredProviders = computed(() => {
  let result = providers.value
  
  if (filterType.value !== 'all') {
    result = result.filter(p => p.provider_type === filterType.value)
  }
  
  if (showAvailableOnly.value) {
    result = result.filter(p => p.is_available)
  }
  
  return result
})

// Cleanup function
let unsubscribe: (() => void) | null = null

onMounted(async () => {
  await fetchProviders()
  unsubscribe = subscribeToUpdates()
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

// Refresh data
const refreshData = async () => {
  const filter = filterType.value === 'all' ? undefined : { type: filterType.value as 'driver' | 'rider' }
  await fetchProviders(filter)
}

// Format time ago
const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`
  
  const hours = Math.floor(minutes / 60)
  return `${hours} ชม.ที่แล้ว`
}
</script>

<template>
  <AdminLayout>
    <div class="live-map-view">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Live Map</h1>
          <p class="subtitle">ดูตำแหน่ง providers แบบ realtime</p>
        </div>
        <button class="refresh-btn" @click="refreshData" :disabled="loading">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" :class="{ spinning: loading }">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          รีเฟรช
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">ทั้งหมด</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon available">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.available }}</span>
            <span class="stat-label">ว่าง</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon busy">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.busy }}</span>
            <span class="stat-label">กำลังให้บริการ</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon rate">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ stats.availabilityRate }}%</span>
            <span class="stat-label">อัตราว่าง</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-group">
          <button 
            class="filter-btn" 
            :class="{ active: filterType === 'all' }"
            @click="filterType = 'all'"
          >
            ทั้งหมด
          </button>
          <button 
            class="filter-btn" 
            :class="{ active: filterType === 'driver' }"
            @click="filterType = 'driver'"
          >
            คนขับ ({{ stats.drivers }})
          </button>
          <button 
            class="filter-btn" 
            :class="{ active: filterType === 'rider' }"
            @click="filterType = 'rider'"
          >
            ไรเดอร์ ({{ stats.riders }})
          </button>
        </div>

        <div class="filter-group">
          <label class="checkbox-filter">
            <input type="checkbox" v-model="showAvailableOnly" />
            <span>แสดงเฉพาะที่ว่าง</span>
          </label>
        </div>

        <div class="view-toggle">
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'markers' }"
            @click="viewMode = 'markers'"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </button>
          <button 
            class="toggle-btn" 
            :class="{ active: viewMode === 'heatmap' }"
            @click="viewMode = 'heatmap'"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Map -->
      <div class="map-container">
        <div class="map-placeholder">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="64" height="64">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <h3>Live Provider Map</h3>
          <p>แสดงตำแหน่ง {{ filteredProviders.length }} providers</p>
          <span class="map-mode">โหมด: {{ viewMode === 'markers' ? 'Markers' : 'Heatmap' }}</span>
        </div>

        <!-- Provider markers simulation -->
        <div class="provider-dots">
          <div 
            v-for="provider in filteredProviders.slice(0, 30)" 
            :key="provider.id"
            class="provider-dot"
            :class="{ 
              available: provider.is_available,
              driver: provider.provider_type === 'driver',
              rider: provider.provider_type === 'rider'
            }"
            :style="{
              left: `${((provider.lng - 100.3) / 0.5) * 100}%`,
              top: `${((13.95 - provider.lat) / 0.5) * 100}%`
            }"
          >
            <div class="dot-tooltip">
              {{ provider.provider_type === 'driver' ? 'คนขับ' : 'ไรเดอร์' }}
              <br>
              {{ provider.is_available ? 'ว่าง' : 'ไม่ว่าง' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Provider List -->
      <div class="provider-list">
        <h3>รายชื่อ Providers ({{ filteredProviders.length }})</h3>
        <div class="list-container">
          <div 
            v-for="provider in filteredProviders.slice(0, 20)" 
            :key="provider.id"
            class="provider-item"
          >
            <div class="provider-avatar" :class="provider.provider_type">
              <svg v-if="provider.provider_type === 'driver'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h8m-8 5h8m-4-9a9 9 0 110 18 9 9 0 010-18z"/>
              </svg>
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </div>
            <div class="provider-info">
              <span class="provider-id">{{ provider.id.slice(0, 8) }}...</span>
              <span class="provider-type">{{ provider.provider_type === 'driver' ? 'คนขับ' : 'ไรเดอร์' }}</span>
            </div>
            <div class="provider-status">
              <span class="status-badge" :class="{ available: provider.is_available }">
                {{ provider.is_available ? 'ว่าง' : 'ไม่ว่าง' }}
              </span>
              <span class="last-update">{{ formatTimeAgo(provider.last_update) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.live-map-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #000;
  margin: 0 0 4px 0;
}

.subtitle {
  color: #6B6B6B;
  margin: 0;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #F6F6F6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.5;
}

.refresh-btn svg.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #E5E5E5;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-icon.total { background: #F6F6F6; color: #000; }
.stat-icon.available { background: #dcfce7; color: #166534; }
.stat-icon.busy { background: #fef3c7; color: #92400e; }
.stat-icon.rate { background: #dbeafe; color: #1e40af; }

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #000;
}

.stat-label {
  font-size: 13px;
  color: #6B6B6B;
}

/* Filters */
.filters-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 8px 16px;
  border: 1px solid #E5E5E5;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn.active {
  background: #000;
  color: #fff;
  border-color: #000;
}

.checkbox-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}

.checkbox-filter input {
  width: 16px;
  height: 16px;
}

.view-toggle {
  display: flex;
  gap: 4px;
  margin-left: auto;
  background: #F6F6F6;
  padding: 4px;
  border-radius: 8px;
}

.toggle-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: #6B6B6B;
}

.toggle-btn.active {
  background: #fff;
  color: #000;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* Map */
.map-container {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E5E5E5;
  height: 400px;
  position: relative;
  overflow: hidden;
  margin-bottom: 24px;
}

.map-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  color: #6B6B6B;
}

.map-placeholder svg {
  opacity: 0.3;
  margin-bottom: 16px;
}

.map-placeholder h3 {
  margin: 0 0 8px 0;
  color: #000;
}

.map-placeholder p {
  margin: 0;
}

.map-mode {
  margin-top: 8px;
  font-size: 12px;
  padding: 4px 12px;
  background: rgba(0,0,0,0.1);
  border-radius: 12px;
}

/* Provider dots */
.provider-dots {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.provider-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
}

.provider-dot.available {
  background: #22c55e;
}

.provider-dot.driver {
  border-color: #3b82f6;
}

.provider-dot.rider {
  border-color: #f59e0b;
}

.dot-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #000;
  color: #fff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  margin-bottom: 8px;
}

.provider-dot:hover .dot-tooltip {
  opacity: 1;
}

/* Provider List */
.provider-list {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E5E5E5;
  padding: 20px;
}

.provider-list h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.list-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.provider-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F6F6F6;
  border-radius: 8px;
}

.provider-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.provider-avatar svg {
  width: 20px;
  height: 20px;
}

.provider-avatar.driver { color: #3b82f6; }
.provider-avatar.rider { color: #f59e0b; }

.provider-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.provider-id {
  font-size: 13px;
  font-weight: 500;
  color: #000;
}

.provider-type {
  font-size: 11px;
  color: #6B6B6B;
}

.provider-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.available {
  background: #dcfce7;
  color: #166534;
}

.last-update {
  font-size: 10px;
  color: #6B6B6B;
}

@media (max-width: 768px) {
  .live-map-view {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .filters-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .view-toggle {
    margin-left: 0;
  }

  .list-container {
    grid-template-columns: 1fr;
  }
}
</style>
