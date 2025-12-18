<template>
  <AdminLayout>
    <div class="admin-driver-tracking-view">
      <!-- Header -->
      <div class="header-section">
        <div class="header-content">
          <h1 class="page-title">Driver Tracking Management</h1>
          <p class="page-subtitle">จัดการและตรวจสอบการติดตามตำแหน่งคนขับแบบ Real-time</p>
        </div>
        <div class="header-actions">
          <button 
            @click="refreshData" 
            :disabled="loading"
            class="btn-refresh"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            รีเฟรช
          </button>
          <button 
            @click="showSettings = true" 
            class="btn-settings"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            ตั้งค่า
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <h3>Active Drivers</h3>
            <div class="stat-icon active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/>
                <circle cx="7.5" cy="17.5" r="1.5"/>
                <circle cx="16.5" cy="17.5" r="1.5"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ trackingStats.activeDrivers }}</div>
          <div class="stat-change positive">+12% จากเมื่อวาน</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <h3>Tracking Accuracy</h3>
            <div class="stat-icon accuracy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <path d="M16 12l-4-4-4 4"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ trackingStats.trackingAccuracy }}%</div>
          <div class="stat-change positive">+2.1% จากเมื่อวาน</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <h3>Average ETA</h3>
            <div class="stat-icon eta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ trackingStats.averageETA }} นาที</div>
          <div class="stat-change negative">-0.5 นาที</div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <h3>Location Updates</h3>
            <div class="stat-icon updates">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </div>
          </div>
          <div class="stat-value">{{ formatNumber(trackingStats.locationUpdates) }}</div>
          <div class="stat-change positive">+15% จากเมื่อวาน</div>
        </div>
      </div>

      <!-- Live Drivers Map -->
      <div class="map-section">
        <h2 class="section-title">Live Driver Locations</h2>
        <div class="map-container">
          <div class="map-placeholder">
            <div class="map-content">
              <svg class="map-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <h3>Live Driver Map</h3>
              <p>แผนที่แสดงตำแหน่งคนขับแบบ Real-time</p>
              <div class="driver-markers">
                <div v-for="driver in liveDrivers.slice(0, 5)" :key="driver.id" class="driver-marker">
                  <div class="marker-dot"></div>
                  <span>{{ driver.vehicle_type }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tracking Accuracy Report -->
      <div class="accuracy-section">
        <h2 class="section-title">Tracking Accuracy Report</h2>
        <div class="accuracy-chart">
          <div class="chart-header">
            <h3>7-Day Accuracy Trend</h3>
            <div class="chart-filters">
              <select v-model="selectedTimeRange" @change="loadAccuracyReport">
                <option value="7d">7 วัน</option>
                <option value="30d">30 วัน</option>
                <option value="90d">90 วัน</option>
              </select>
            </div>
          </div>
          <div class="chart-content">
            <div class="accuracy-bars">
              <div 
                v-for="(report, index) in accuracyReports" 
                :key="index"
                class="accuracy-bar"
              >
                <div class="bar-container">
                  <div 
                    class="bar-fill" 
                    :style="{ height: `${report.accuracy_percentage}%` }"
                    :class="getAccuracyClass(report.accuracy_percentage)"
                  ></div>
                </div>
                <div class="bar-label">{{ formatDate(report.date) }}</div>
                <div class="bar-value">{{ report.accuracy_percentage }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Driver List -->
      <div class="drivers-section">
        <h2 class="section-title">Active Drivers</h2>
        <div class="drivers-table">
          <div class="table-header">
            <div class="header-cell">Driver</div>
            <div class="header-cell">Vehicle</div>
            <div class="header-cell">Location</div>
            <div class="header-cell">Last Update</div>
            <div class="header-cell">Accuracy</div>
            <div class="header-cell">Status</div>
          </div>
          <div class="table-body">
            <div 
              v-for="driver in liveDrivers" 
              :key="driver.id"
              class="table-row"
            >
              <div class="cell driver-cell">
                <div class="driver-info">
                  <div class="driver-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div class="driver-details">
                    <div class="driver-name">Driver #{{ driver.id.slice(-4) }}</div>
                    <div class="driver-id">ID: {{ driver.id }}</div>
                  </div>
                </div>
              </div>
              <div class="cell">
                <div class="vehicle-info">
                  <div class="vehicle-type">{{ driver.vehicle_type }}</div>
                </div>
              </div>
              <div class="cell">
                <div class="location-info">
                  <div class="coordinates">
                    {{ driver.current_lat?.toFixed(4) }}, {{ driver.current_lng?.toFixed(4) }}
                  </div>
                </div>
              </div>
              <div class="cell">
                <div class="update-time">
                  {{ formatTime(driver.last_location_update) }}
                </div>
              </div>
              <div class="cell">
                <div class="accuracy-badge" :class="getAccuracyClass(95)">
                  95%
                </div>
              </div>
              <div class="cell">
                <div class="status-badge" :class="driver.status">
                  {{ getStatusLabel(driver.status) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div v-if="showSettings" class="modal-overlay" @click="showSettings = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Driver Tracking Settings</h3>
            <button @click="showSettings = false" class="close-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="setting-group">
              <label>Update Interval (seconds)</label>
              <input 
                v-model.number="settings.updateInterval" 
                type="number" 
                min="1" 
                max="60"
                class="setting-input"
              >
            </div>
            <div class="setting-group">
              <label>High Accuracy Mode</label>
              <div class="toggle-switch">
                <input 
                  v-model="settings.highAccuracy" 
                  type="checkbox" 
                  id="highAccuracy"
                >
                <label for="highAccuracy" class="toggle-label"></label>
              </div>
            </div>
            <div class="setting-group">
              <label>Max Age (seconds)</label>
              <input 
                v-model.number="settings.maxAge" 
                type="number" 
                min="1" 
                max="300"
                class="setting-input"
              >
            </div>
            <div class="setting-group">
              <label>Battery Optimization</label>
              <div class="toggle-switch">
                <input 
                  v-model="settings.enableBatteryOptimization" 
                  type="checkbox" 
                  id="batteryOptimization"
                >
                <label for="batteryOptimization" class="toggle-label"></label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showSettings = false" class="btn-cancel">ยกเลิก</button>
            <button @click="saveSettings" class="btn-save">บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
/**
 * Admin Driver Tracking View (F33)
 * จัดการและตรวจสอบการติดตามตำแหน่งคนขับแบบ Real-time
 */
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { 
  fetchDriverTrackingStats, 
  fetchLiveDriverLocations, 
  updateDriverTrackingSettings,
  getDriverTrackingAccuracyReport
} from '../composables/useAdmin'

const loading = ref(false)
const showSettings = ref(false)
const selectedTimeRange = ref('7d')

const trackingStats = ref({
  activeDrivers: 45,
  trackingAccuracy: 95.2,
  averageETA: 8.5,
  locationUpdates: 1250
})

const liveDrivers = ref<any[]>([])
const accuracyReports = ref<any[]>([])

const settings = ref({
  updateInterval: 5,
  highAccuracy: true,
  maxAge: 10,
  enableBatteryOptimization: false
})

const refreshData = async () => {
  loading.value = true
  try {
    const [stats, drivers, accuracy] = await Promise.all([
      fetchDriverTrackingStats(),
      fetchLiveDriverLocations(),
      getDriverTrackingAccuracyReport(selectedTimeRange.value)
    ])
    
    trackingStats.value = stats
    liveDrivers.value = drivers
    accuracyReports.value = accuracy
  } finally {
    loading.value = false
  }
}

const loadAccuracyReport = async () => {
  const accuracy = await getDriverTrackingAccuracyReport(selectedTimeRange.value)
  accuracyReports.value = accuracy
}

const saveSettings = async () => {
  const result = await updateDriverTrackingSettings(settings.value)
  if (result.success) {
    showSettings.value = false
    // Show success message
  }
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('th-TH').format(num)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('th-TH', { 
    month: 'short', 
    day: 'numeric' 
  })
}

const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getAccuracyClass = (accuracy: number) => {
  if (accuracy >= 95) return 'excellent'
  if (accuracy >= 90) return 'good'
  if (accuracy >= 80) return 'fair'
  return 'poor'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    available: 'พร้อมรับงาน',
    busy: 'กำลังทำงาน',
    offline: 'ออฟไลน์'
  }
  return labels[status] || status
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.admin-driver-tracking-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #F0F0F0;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.page-subtitle {
  color: #666666;
  font-size: 16px;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-refresh, .btn-settings {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-refresh {
  background-color: #F5F5F5;
  color: #1A1A1A;
}

.btn-refresh:hover {
  background-color: #E8E8E8;
}

.btn-settings {
  background-color: #00A86B;
  color: white;
}

.btn-settings:hover {
  background-color: #008F5B;
}

.icon {
  width: 18px;
  height: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #F0F0F0;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stat-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  margin: 0;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 20px;
  height: 20px;
}

.stat-icon.active { background-color: #E8F5EF; color: #00A86B; }
.stat-icon.accuracy { background-color: #E3F2FD; color: #1976D2; }
.stat-icon.eta { background-color: #FFF3E0; color: #F57C00; }
.stat-icon.updates { background-color: #F3E5F5; color: #7B1FA2; }

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.stat-change {
  font-size: 14px;
  font-weight: 600;
}

.stat-change.positive { color: #00A86B; }
.stat-change.negative { color: #E53935; }

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 20px 0;
}

.map-section {
  margin-bottom: 32px;
}

.map-container {
  background: white;
  border-radius: 16px;
  border: 1px solid #F0F0F0;
  overflow: hidden;
}

.map-placeholder {
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%);
}

.map-content {
  text-align: center;
  color: #666666;
}

.map-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  color: #00A86B;
}

.map-content h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.driver-markers {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.driver-marker {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.marker-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #00A86B;
}

.accuracy-section {
  margin-bottom: 32px;
}

.accuracy-chart {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #F0F0F0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.chart-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.chart-filters select {
  padding: 8px 12px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  background: white;
  color: #1A1A1A;
}

.accuracy-bars {
  display: flex;
  gap: 16px;
  align-items: end;
  height: 200px;
}

.accuracy-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bar-container {
  height: 150px;
  width: 24px;
  background-color: #F0F0F0;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: end;
}

.bar-fill {
  width: 100%;
  border-radius: 12px;
  transition: height 0.3s ease;
}

.bar-fill.excellent { background-color: #00A86B; }
.bar-fill.good { background-color: #1976D2; }
.bar-fill.fair { background-color: #F57C00; }
.bar-fill.poor { background-color: #E53935; }

.bar-label {
  font-size: 12px;
  color: #666666;
}

.bar-value {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
}

.drivers-section {
  margin-bottom: 32px;
}

.drivers-table {
  background: white;
  border-radius: 16px;
  border: 1px solid #F0F0F0;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px 24px;
  background-color: #F5F5F5;
  border-bottom: 1px solid #F0F0F0;
}

.header-cell {
  font-size: 14px;
  font-weight: 600;
  color: #666666;
}

.table-body {
  max-height: 400px;
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid #F0F0F0;
  align-items: center;
}

.table-row:hover {
  background-color: #F9F9F9;
}

.driver-cell {
  display: flex;
  align-items: center;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.driver-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #F0F0F0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.driver-avatar svg {
  width: 20px;
  height: 20px;
  color: #666666;
}

.driver-name {
  font-weight: 600;
  color: #1A1A1A;
}

.driver-id {
  font-size: 12px;
  color: #666666;
}

.vehicle-type {
  font-weight: 500;
  color: #1A1A1A;
}

.coordinates {
  font-family: monospace;
  font-size: 12px;
  color: #666666;
}

.update-time {
  font-size: 14px;
  color: #666666;
}

.accuracy-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.accuracy-badge.excellent { background-color: #E8F5EF; color: #00A86B; }
.accuracy-badge.good { background-color: #E3F2FD; color: #1976D2; }
.accuracy-badge.fair { background-color: #FFF3E0; color: #F57C00; }
.accuracy-badge.poor { background-color: #FFEBEE; color: #E53935; }

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.available { background-color: #E8F5EF; color: #00A86B; }
.status-badge.busy { background-color: #FFF3E0; color: #F57C00; }
.status-badge.offline { background-color: #F0F0F0; color: #666666; }

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
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
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background-color: #F0F0F0;
}

.close-btn svg {
  width: 16px;
  height: 16px;
}

.modal-body {
  padding: 24px;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group label {
  display: block;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.setting-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #E8E8E8;
  border-radius: 12px;
  font-size: 16px;
}

.setting-input:focus {
  outline: none;
  border-color: #00A86B;
}

.toggle-switch {
  position: relative;
}

.toggle-switch input[type="checkbox"] {
  display: none;
}

.toggle-label {
  display: block;
  width: 48px;
  height: 24px;
  background-color: #E8E8E8;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s ease;
}

.toggle-label::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-label {
  background-color: #00A86B;
}

.toggle-switch input[type="checkbox"]:checked + .toggle-label::after {
  transform: translateX(24px);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #F0F0F0;
}

.btn-cancel, .btn-save {
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.btn-cancel {
  background-color: #F5F5F5;
  color: #1A1A1A;
}

.btn-save {
  background-color: #00A86B;
  color: white;
}

.btn-cancel:hover {
  background-color: #E8E8E8;
}

.btn-save:hover {
  background-color: #008F5B;
}
</style>