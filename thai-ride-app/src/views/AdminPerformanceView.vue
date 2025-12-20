<template>
  <AdminLayout>
    <div class="admin-performance-view">
      <!-- Header -->
      <div class="header-section">
        <div class="header-content">
          <h1 class="page-title">Performance Monitoring</h1>
          <p class="page-subtitle">ตรวจสอบประสิทธิภาพแอปพลิเคชันแบบ Real-time</p>
        </div>
        <div class="header-actions">
          <button 
            @click="refreshMetrics" 
            :disabled="loading"
            class="btn-refresh"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            รีเฟรช
          </button>
          <button 
            @click="exportReport" 
            class="btn-export"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Report
          </button>
        </div>
      </div>

      <!-- Performance Overview Cards -->
      <div class="metrics-grid">
        <div class="metric-card score-card">
          <div class="metric-header">
            <h3>Performance Score</h3>
            <div class="score-badge" :class="getScoreClass(performanceScore)">
              {{ performanceGrade }}
            </div>
          </div>
          <div class="metric-value">
            <span class="score">{{ performanceScore }}</span>
            <span class="score-max">/100</span>
          </div>
          <div class="metric-trend" :class="{ positive: scoreTrend > 0, negative: scoreTrend < 0 }">
            <svg class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline :points="scoreTrend > 0 ? '22,12 18,12 15,21 9,3 5,12 2,12' : '22,12 18,12 15,3 9,21 5,12 2,12'"/>
            </svg>
            {{ Math.abs(scoreTrend) }}% จากเมื่อวาน
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <h3>Core Web Vitals</h3>
            <div class="status-indicator" :class="getVitalsStatus()"></div>
          </div>
          <div class="vitals-list">
            <div class="vital-item">
              <span class="vital-label">LCP</span>
              <span class="vital-value" :class="getLCPClass()">
                {{ metrics.lcp ? `${(metrics.lcp / 1000).toFixed(1)}s` : 'N/A' }}
              </span>
            </div>
            <div class="vital-item">
              <span class="vital-label">FID</span>
              <span class="vital-value" :class="getFIDClass()">
                {{ metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'N/A' }}
              </span>
            </div>
            <div class="vital-item">
              <span class="vital-label">CLS</span>
              <span class="vital-value" :class="getCLSClass()">
                {{ metrics.cls ? metrics.cls.toFixed(3) : 'N/A' }}
              </span>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <h3>Memory Usage</h3>
            <div class="memory-percentage">
              {{ metrics.memoryUsagePercent ? `${metrics.memoryUsagePercent.toFixed(1)}%` : 'N/A' }}
            </div>
          </div>
          <div class="memory-bar">
            <div 
              class="memory-fill" 
              :style="{ width: `${metrics.memoryUsagePercent || 0}%` }"
              :class="getMemoryClass()"
            ></div>
          </div>
          <div class="memory-details">
            <span>{{ formatBytes(metrics.usedJSHeapSize) }} / {{ formatBytes(metrics.jsHeapSizeLimit) }}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <h3>Critical Issues</h3>
            <div class="issue-count" :class="{ warning: criticalIssuesCount > 0 }">
              {{ criticalIssuesCount }}
            </div>
          </div>
          <div class="issue-summary">
            <div class="issue-type">
              <span class="issue-label">Critical</span>
              <span class="issue-number">{{ getCriticalIssues().length }}</span>
            </div>
            <div class="issue-type">
              <span class="issue-label">Warning</span>
              <span class="issue-number">{{ getWarningIssues().length }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Issues -->
      <div class="issues-section" v-if="performanceIssues.length > 0">
        <h2 class="section-title">Performance Issues</h2>
        <div class="issues-list">
          <div 
            v-for="issue in performanceIssues" 
            :key="`${issue.metric}-${issue.timestamp}`"
            class="issue-item"
            :class="issue.type"
          >
            <div class="issue-icon">
              <svg v-if="issue.type === 'critical'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <svg v-else-if="issue.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div class="issue-content">
              <div class="issue-message">{{ issue.message }}</div>
              <div class="issue-meta">
                <span class="issue-time">{{ formatTime(issue.timestamp) }}</span>
                <span class="issue-metric">{{ issue.metric.toUpperCase() }}</span>
              </div>
              <div class="issue-recommendations" v-if="issue.recommendations.length > 0">
                <h4>แนะนำการแก้ไข:</h4>
                <ul>
                  <li v-for="rec in issue.recommendations" :key="rec">{{ rec }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Charts -->
      <div class="charts-section">
        <h2 class="section-title">Performance Trends</h2>
        <div class="charts-grid">
          <div class="chart-card">
            <h3>Core Web Vitals Trend</h3>
            <div class="chart-placeholder">
              <p>Chart visualization would go here</p>
              <p class="chart-note">LCP: {{ metrics.lcp ? `${(metrics.lcp / 1000).toFixed(1)}s` : 'N/A' }}</p>
              <p class="chart-note">FID: {{ metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'N/A' }}</p>
              <p class="chart-note">CLS: {{ metrics.cls ? metrics.cls.toFixed(3) : 'N/A' }}</p>
            </div>
          </div>
          
          <div class="chart-card">
            <h3>Memory Usage Over Time</h3>
            <div class="chart-placeholder">
              <p>Memory usage chart would go here</p>
              <p class="chart-note">Current: {{ metrics.memoryUsagePercent ? `${metrics.memoryUsagePercent.toFixed(1)}%` : 'N/A' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Network Information -->
      <div class="network-section">
        <h2 class="section-title">Network Information</h2>
        <div class="network-grid">
          <div class="network-item">
            <span class="network-label">Connection Type</span>
            <span class="network-value">{{ metrics.connectionType || 'Unknown' }}</span>
          </div>
          <div class="network-item">
            <span class="network-label">Effective Type</span>
            <span class="network-value">{{ metrics.effectiveType || 'Unknown' }}</span>
          </div>
          <div class="network-item">
            <span class="network-label">Downlink</span>
            <span class="network-value">{{ metrics.downlink ? `${metrics.downlink} Mbps` : 'Unknown' }}</span>
          </div>
          <div class="network-item">
            <span class="network-label">RTT</span>
            <span class="network-value">{{ metrics.rtt ? `${metrics.rtt}ms` : 'Unknown' }}</span>
          </div>
        </div>
      </div>

      <!-- Web Vitals Summary (from usePerformanceMetrics) -->
      <div class="web-vitals-section">
        <div class="section-header-row">
          <h2 class="section-title">Web Vitals Summary (User Data)</h2>
          <div class="time-range-selector">
            <button 
              v-for="hours in [1, 6, 24, 168]" 
              :key="hours"
              @click="changeTimeRange(hours)"
              :class="{ active: selectedTimeRange === hours }"
              class="time-btn"
            >
              {{ hours === 1 ? '1 ชม.' : hours === 6 ? '6 ชม.' : hours === 24 ? '24 ชม.' : '7 วัน' }}
            </button>
          </div>
        </div>

        <div v-if="loadingWebVitals" class="loading-state">
          <div class="spinner"></div>
          <span>กำลังโหลดข้อมูล...</span>
        </div>

        <div v-else-if="webVitalsSummary" class="web-vitals-content">
          <!-- Summary Stats -->
          <div class="vitals-summary-grid">
            <div class="vitals-stat-card">
              <div class="stat-label">Total Page Loads</div>
              <div class="stat-value">{{ webVitalsSummary.totalPageLoads.toLocaleString() }}</div>
            </div>
            <div class="vitals-stat-card good">
              <div class="stat-label">Good</div>
              <div class="stat-value">{{ webVitalsSummary.goodPercentage }}%</div>
            </div>
            <div class="vitals-stat-card warning">
              <div class="stat-label">Needs Improvement</div>
              <div class="stat-value">{{ webVitalsSummary.needsImprovementPercentage }}%</div>
            </div>
            <div class="vitals-stat-card poor">
              <div class="stat-label">Poor</div>
              <div class="stat-value">{{ webVitalsSummary.poorPercentage }}%</div>
            </div>
          </div>

          <!-- Detailed Metrics -->
          <div class="vitals-metrics-grid">
            <div class="vitals-metric-card">
              <div class="metric-name">FCP</div>
              <div class="metric-desc">{{ getMetricLabelThai('fcp') }}</div>
              <div class="metric-value-large" :style="{ color: getRatingColor(getRating('fcp', webVitalsSummary.avgFcp)) }">
                {{ webVitalsSummary.avgFcp }} ms
              </div>
              <div class="metric-rating" :style="{ backgroundColor: getRatingColor(getRating('fcp', webVitalsSummary.avgFcp)) + '20', color: getRatingColor(getRating('fcp', webVitalsSummary.avgFcp)) }">
                {{ getRatingText(getRating('fcp', webVitalsSummary.avgFcp)) }}
              </div>
              <div class="metric-threshold">เป้าหมาย: &lt; {{ THRESHOLDS.fcp.good }} ms</div>
            </div>

            <div class="vitals-metric-card">
              <div class="metric-name">LCP</div>
              <div class="metric-desc">{{ getMetricLabelThai('lcp') }}</div>
              <div class="metric-value-large" :style="{ color: getRatingColor(getRating('lcp', webVitalsSummary.avgLcp)) }">
                {{ webVitalsSummary.avgLcp }} ms
              </div>
              <div class="metric-rating" :style="{ backgroundColor: getRatingColor(getRating('lcp', webVitalsSummary.avgLcp)) + '20', color: getRatingColor(getRating('lcp', webVitalsSummary.avgLcp)) }">
                {{ getRatingText(getRating('lcp', webVitalsSummary.avgLcp)) }}
              </div>
              <div class="metric-threshold">เป้าหมาย: &lt; {{ THRESHOLDS.lcp.good }} ms</div>
            </div>

            <div class="vitals-metric-card">
              <div class="metric-name">TTI</div>
              <div class="metric-desc">{{ getMetricLabelThai('tti') }}</div>
              <div class="metric-value-large" :style="{ color: getRatingColor(getRating('tti', webVitalsSummary.avgTti)) }">
                {{ webVitalsSummary.avgTti }} ms
              </div>
              <div class="metric-rating" :style="{ backgroundColor: getRatingColor(getRating('tti', webVitalsSummary.avgTti)) + '20', color: getRatingColor(getRating('tti', webVitalsSummary.avgTti)) }">
                {{ getRatingText(getRating('tti', webVitalsSummary.avgTti)) }}
              </div>
              <div class="metric-threshold">เป้าหมาย: &lt; {{ THRESHOLDS.tti.good }} ms</div>
            </div>

            <div class="vitals-metric-card">
              <div class="metric-name">FID</div>
              <div class="metric-desc">{{ getMetricLabelThai('fid') }}</div>
              <div class="metric-value-large" :style="{ color: getRatingColor(getRating('fid', webVitalsSummary.avgFid)) }">
                {{ webVitalsSummary.avgFid }} ms
              </div>
              <div class="metric-rating" :style="{ backgroundColor: getRatingColor(getRating('fid', webVitalsSummary.avgFid)) + '20', color: getRatingColor(getRating('fid', webVitalsSummary.avgFid)) }">
                {{ getRatingText(getRating('fid', webVitalsSummary.avgFid)) }}
              </div>
              <div class="metric-threshold">เป้าหมาย: &lt; {{ THRESHOLDS.fid.good }} ms</div>
            </div>

            <div class="vitals-metric-card">
              <div class="metric-name">CLS</div>
              <div class="metric-desc">{{ getMetricLabelThai('cls') }}</div>
              <div class="metric-value-large" :style="{ color: getRatingColor(getRating('cls', webVitalsSummary.avgCls)) }">
                {{ webVitalsSummary.avgCls }}
              </div>
              <div class="metric-rating" :style="{ backgroundColor: getRatingColor(getRating('cls', webVitalsSummary.avgCls)) + '20', color: getRatingColor(getRating('cls', webVitalsSummary.avgCls)) }">
                {{ getRatingText(getRating('cls', webVitalsSummary.avgCls)) }}
              </div>
              <div class="metric-threshold">เป้าหมาย: &lt; {{ THRESHOLDS.cls.good }}</div>
            </div>

            <div class="vitals-metric-card">
              <div class="metric-name">TTFB</div>
              <div class="metric-desc">{{ getMetricLabelThai('ttfb') }}</div>
              <div class="metric-value-large" :style="{ color: getRatingColor(getRating('ttfb', webVitalsSummary.avgTtfb)) }">
                {{ webVitalsSummary.avgTtfb }} ms
              </div>
              <div class="metric-rating" :style="{ backgroundColor: getRatingColor(getRating('ttfb', webVitalsSummary.avgTtfb)) + '20', color: getRatingColor(getRating('ttfb', webVitalsSummary.avgTtfb)) }">
                {{ getRatingText(getRating('ttfb', webVitalsSummary.avgTtfb)) }}
              </div>
              <div class="metric-threshold">เป้าหมาย: &lt; {{ THRESHOLDS.ttfb.good }} ms</div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>ยังไม่มีข้อมูล Web Vitals</p>
          <p class="empty-hint">ข้อมูลจะถูกเก็บเมื่อผู้ใช้เข้าใช้งานแอป</p>
        </div>
      </div>

      <!-- Page Performance Breakdown -->
      <div class="page-performance-section" v-if="pageMetrics.length > 0">
        <h2 class="section-title">Performance by Page</h2>
        <div class="page-table">
          <div class="page-table-header">
            <span class="col-page">หน้า</span>
            <span class="col-count">จำนวนครั้ง</span>
            <span class="col-lcp">Avg LCP</span>
            <span class="col-rating">สถานะ</span>
          </div>
          <div 
            v-for="page in pageMetrics" 
            :key="page.page" 
            class="page-table-row"
          >
            <span class="col-page">{{ page.page }}</span>
            <span class="col-count">{{ page.count.toLocaleString() }}</span>
            <span class="col-lcp">{{ page.avgLcp }} ms</span>
            <span 
              class="col-rating rating-badge"
              :style="{ backgroundColor: getRatingColor(page.rating) + '20', color: getRatingColor(page.rating) }"
            >
              {{ getRatingText(page.rating) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
/**
 * Admin Performance View (F194)
 * จัดการและตรวจสอบประสิทธิภาพแอปพลิเคชัน
 * 
 * Memory Optimization: Task 35
 * - Cleans up performance metrics on unmount
 * - Stops monitoring interval
 * 
 * Enhanced with usePerformanceMetrics for Web Vitals tracking
 */
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { usePerformanceMonitoring } from '../composables/usePerformanceMonitoring'
import { usePerformanceMetrics, type PerformanceSummary } from '../composables/usePerformanceMetrics'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { addCleanup } = useAdminCleanup()

const {
  metrics,
  performanceIssues,
  getPerformanceScore,
  getPerformanceGrade,
  criticalIssuesCount,
  startMonitoring,
  generateReport
} = usePerformanceMonitoring()

// Web Vitals from usePerformanceMetrics
const {
  getPerformanceSummary,
  getMetricsByPage,
  getRating,
  formatMetricValue,
  getMetricLabelThai,
  getRatingColor,
  getRatingText,
  THRESHOLDS
} = usePerformanceMetrics()

// Web Vitals State
const webVitalsSummary = ref<PerformanceSummary | null>(null)
const pageMetrics = ref<Array<{ page: string; count: number; avgLcp: number; rating: string }>>([])
const selectedTimeRange = ref(24) // hours
const loadingWebVitals = ref(false)

const loading = ref(false)
const scoreTrend = ref(2.5) // Mock trend data

const performanceScore = computed(() => getPerformanceScore.value)
const performanceGrade = computed(() => getPerformanceGrade.value)

// Fetch Web Vitals data
const fetchWebVitals = async () => {
  loadingWebVitals.value = true
  try {
    const [summary, pages] = await Promise.all([
      getPerformanceSummary(selectedTimeRange.value),
      getMetricsByPage(selectedTimeRange.value)
    ])
    webVitalsSummary.value = summary
    pageMetrics.value = pages
  } catch (e) {
    console.error('Error fetching web vitals:', e)
  } finally {
    loadingWebVitals.value = false
  }
}

const refreshMetrics = async () => {
  loading.value = true
  try {
    // Restart monitoring to get fresh metrics
    startMonitoring()
    await fetchWebVitals()
    await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for metrics to update
  } finally {
    loading.value = false
  }
}

const changeTimeRange = async (hours: number) => {
  selectedTimeRange.value = hours
  await fetchWebVitals()
}

const exportReport = () => {
  const report = generateReport()
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 70) return 'fair'
  if (score >= 60) return 'poor'
  return 'critical'
}

const getVitalsStatus = () => {
  const lcp = metrics.value.lcp || 0
  const fid = metrics.value.fid || 0
  const cls = metrics.value.cls || 0
  
  if (lcp > 4000 || fid > 300 || cls > 0.25) return 'critical'
  if (lcp > 2500 || fid > 100 || cls > 0.1) return 'warning'
  return 'good'
}

const getLCPClass = () => {
  const lcp = metrics.value.lcp || 0
  if (lcp > 4000) return 'critical'
  if (lcp > 2500) return 'warning'
  return 'good'
}

const getFIDClass = () => {
  const fid = metrics.value.fid || 0
  if (fid > 300) return 'critical'
  if (fid > 100) return 'warning'
  return 'good'
}

const getCLSClass = () => {
  const cls = metrics.value.cls || 0
  if (cls > 0.25) return 'critical'
  if (cls > 0.1) return 'warning'
  return 'good'
}

const getMemoryClass = () => {
  const usage = metrics.value.memoryUsagePercent || 0
  if (usage > 90) return 'critical'
  if (usage > 70) return 'warning'
  return 'good'
}

const getCriticalIssues = () => performanceIssues.value.filter(issue => issue.type === 'critical')
const getWarningIssues = () => performanceIssues.value.filter(issue => issue.type === 'warning')

const formatBytes = (bytes?: number) => {
  if (!bytes) return 'N/A'
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('th-TH')
}

// Register cleanup - Task 35
addCleanup(() => {
  loading.value = false
  scoreTrend.value = 0
  webVitalsSummary.value = null
  pageMetrics.value = []
  console.log('[AdminPerformanceView] Cleanup complete')
})

onMounted(() => {
  startMonitoring()
  fetchWebVitals()
})
</script>

<style scoped>
.admin-performance-view {
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

.btn-refresh, .btn-export {
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

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-export {
  background-color: #00A86B;
  color: white;
}

.btn-export:hover {
  background-color: #008F5B;
}

.icon {
  width: 18px;
  height: 18px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.metric-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #F0F0F0;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.metric-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.score-card .metric-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.score {
  font-size: 48px;
  font-weight: 700;
  color: #1A1A1A;
}

.score-max {
  font-size: 24px;
  color: #666666;
}

.score-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 14px;
}

.score-badge.excellent { background-color: #E8F5EF; color: #00A86B; }
.score-badge.good { background-color: #E3F2FD; color: #1976D2; }
.score-badge.fair { background-color: #FFF3E0; color: #F57C00; }
.score-badge.poor { background-color: #FFEBEE; color: #D32F2F; }
.score-badge.critical { background-color: #FFEBEE; color: #D32F2F; }

.metric-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  margin-top: 8px;
}

.metric-trend.positive { color: #00A86B; }
.metric-trend.negative { color: #E53935; }

.trend-icon {
  width: 16px;
  height: 16px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.good { background-color: #00A86B; }
.status-indicator.warning { background-color: #F5A623; }
.status-indicator.critical { background-color: #E53935; }

.vitals-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vital-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vital-label {
  font-weight: 600;
  color: #666666;
}

.vital-value {
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 14px;
}

.vital-value.good { background-color: #E8F5EF; color: #00A86B; }
.vital-value.warning { background-color: #FFF3E0; color: #F57C00; }
.vital-value.critical { background-color: #FFEBEE; color: #D32F2F; }

.memory-percentage {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
}

.memory-bar {
  width: 100%;
  height: 8px;
  background-color: #F0F0F0;
  border-radius: 4px;
  overflow: hidden;
  margin: 16px 0;
}

.memory-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.memory-fill.good { background-color: #00A86B; }
.memory-fill.warning { background-color: #F5A623; }
.memory-fill.critical { background-color: #E53935; }

.memory-details {
  font-size: 14px;
  color: #666666;
}

.issue-count {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
}

.issue-count.warning {
  color: #E53935;
}

.issue-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.issue-type {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.issue-label {
  font-size: 14px;
  color: #666666;
}

.issue-number {
  font-weight: 600;
  color: #1A1A1A;
}

.issues-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 20px 0;
}

.issues-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.issue-item {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #F0F0F0;
  border-left: 4px solid;
}

.issue-item.critical { border-left-color: #E53935; }
.issue-item.warning { border-left-color: #F5A623; }
.issue-item.error { border-left-color: #FF5722; }

.issue-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.issue-icon svg {
  width: 100%;
  height: 100%;
}

.issue-item.critical .issue-icon { color: #E53935; }
.issue-item.warning .issue-icon { color: #F5A623; }
.issue-item.error .issue-icon { color: #FF5722; }

.issue-content {
  flex: 1;
}

.issue-message {
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.issue-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666666;
  margin-bottom: 12px;
}

.issue-recommendations h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.issue-recommendations ul {
  margin: 0;
  padding-left: 20px;
}

.issue-recommendations li {
  font-size: 14px;
  color: #666666;
  margin-bottom: 4px;
}

.charts-section {
  margin-bottom: 32px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.chart-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #F0F0F0;
}

.chart-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 16px 0;
}

.chart-placeholder {
  height: 200px;
  background-color: #F5F5F5;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666666;
}

.chart-note {
  font-size: 14px;
  margin: 4px 0;
}

.network-section {
  margin-bottom: 32px;
}

.network-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  background: white;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #F0F0F0;
}

.network-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.network-label {
  font-size: 14px;
  color: #666666;
}

.network-value {
  font-weight: 600;
  color: #1A1A1A;
}

/* Web Vitals Section */
.web-vitals-section {
  margin-bottom: 32px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.time-range-selector {
  display: flex;
  gap: 8px;
}

.time-btn {
  padding: 8px 16px;
  border: 1px solid #E8E8E8;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.time-btn:hover {
  border-color: #00A86B;
}

.time-btn.active {
  background: #00A86B;
  color: white;
  border-color: #00A86B;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  background: white;
  border-radius: 16px;
  border: 1px solid #F0F0F0;
  color: #666666;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #F0F0F0;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.vitals-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.vitals-stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #F0F0F0;
  text-align: center;
}

.vitals-stat-card.good { border-left: 4px solid #00A86B; }
.vitals-stat-card.warning { border-left: 4px solid #F5A623; }
.vitals-stat-card.poor { border-left: 4px solid #E53935; }

.stat-label {
  font-size: 14px;
  color: #666666;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
}

.vitals-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.vitals-metric-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #F0F0F0;
  text-align: center;
}

.metric-name {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.metric-desc {
  font-size: 12px;
  color: #999999;
  margin-bottom: 12px;
}

.metric-value-large {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
}

.metric-rating {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.metric-threshold {
  font-size: 11px;
  color: #999999;
}

.empty-state {
  text-align: center;
  padding: 48px;
  background: white;
  border-radius: 16px;
  border: 1px solid #F0F0F0;
  color: #666666;
}

.empty-hint {
  font-size: 14px;
  color: #999999;
  margin-top: 8px;
}

/* Page Performance Section */
.page-performance-section {
  margin-bottom: 32px;
}

.page-table {
  background: white;
  border-radius: 16px;
  border: 1px solid #F0F0F0;
  overflow: hidden;
}

.page-table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  padding: 16px 20px;
  background: #F5F5F5;
  font-weight: 600;
  font-size: 14px;
  color: #666666;
}

.page-table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  padding: 16px 20px;
  border-top: 1px solid #F0F0F0;
  align-items: center;
}

.page-table-row:hover {
  background: #FAFAFA;
}

.col-page {
  font-weight: 500;
  color: #1A1A1A;
}

.col-count, .col-lcp {
  color: #666666;
}

.rating-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

@media (max-width: 768px) {
  .vitals-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .section-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .page-table-header,
  .page-table-row {
    grid-template-columns: 1fr 1fr;
  }
  
  .col-lcp, .col-rating {
    display: none;
  }
}
</style>