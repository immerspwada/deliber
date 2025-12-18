<script setup lang="ts">
/**
 * Feature: F37 - Provider Performance Dashboard
 * Real-time metrics display for providers
 * MUNEEF Style UI - Clean and Modern with Green Accent
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProvider } from '../../composables/useProvider'
import { useProviderPerformance } from '../../composables/useProviderPerformance'

const router = useRouter()
const { profile, fetchProfile } = useProvider()
const { loading, metrics, score, fetchPerformance, getLevelColor, getScoreColor, AVAILABLE_BADGES } = useProviderPerformance()

const activeTab = ref<'overview' | 'metrics' | 'badges'>('overview')
const refreshInterval = ref<number | null>(null)
const lastUpdated = ref<Date>(new Date())

// Computed
const levelProgress = computed(() => score.value?.nextLevelProgress || 0)
const levelColor = computed(() => score.value ? getLevelColor(score.value.level) : '#cd7f32')
const scoreColor = computed(() => score.value ? getScoreColor(score.value.overall) : '#666')

const metricsDisplay = computed(() => {
  if (!metrics.value) return []
  return [
    { key: 'acceptanceRate', label: 'อัตราการรับงาน', value: metrics.value.acceptanceRate, unit: '%', icon: 'check', color: getMetricColor(metrics.value.acceptanceRate) },
    { key: 'completionRate', label: 'อัตราสำเร็จ', value: metrics.value.completionRate, unit: '%', icon: 'flag', color: getMetricColor(metrics.value.completionRate) },
    { key: 'onTimeRate', label: 'ตรงเวลา', value: metrics.value.onTimeRate, unit: '%', icon: 'clock', color: getMetricColor(metrics.value.onTimeRate) },
    { key: 'rating', label: 'คะแนนเฉลี่ย', value: metrics.value.rating.toFixed(1), unit: '/5', icon: 'star', color: getRatingColor(metrics.value.rating) },
    { key: 'responseTime', label: 'เวลาตอบรับ', value: metrics.value.responseTime, unit: 'วินาที', icon: 'bolt', color: getResponseColor(metrics.value.responseTime) },
    { key: 'cancellationRate', label: 'อัตรายกเลิก', value: metrics.value.cancellationRate, unit: '%', icon: 'x', color: getCancelColor(metrics.value.cancellationRate) }
  ]
})

const unearnedBadges = computed(() => {
  const earnedIds = score.value?.badges.map(b => b.id) || []
  return AVAILABLE_BADGES.filter(b => !earnedIds.includes(b.id))
})

// Helper functions
function getMetricColor(value: number): string {
  if (value >= 90) return '#00A86B'
  if (value >= 70) return '#F5A623'
  return '#E53935'
}

function getRatingColor(value: number): string {
  if (value >= 4.5) return '#00A86B'
  if (value >= 4.0) return '#F5A623'
  return '#E53935'
}

function getResponseColor(seconds: number): string {
  if (seconds <= 15) return '#00A86B'
  if (seconds <= 30) return '#F5A623'
  return '#E53935'
}

function getCancelColor(value: number): string {
  if (value <= 5) return '#00A86B'
  if (value <= 10) return '#F5A623'
  return '#E53935'
}

function formatLastUpdated(): string {
  return lastUpdated.value.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

async function refreshData() {
  if (profile.value?.id) {
    await fetchPerformance(profile.value.id)
    lastUpdated.value = new Date()
  }
}

function goBack() {
  router.back()
}

onMounted(async () => {
  await fetchProfile()
  if (profile.value?.id) {
    await fetchPerformance(profile.value.id)
  }
  // Auto-refresh every 30 seconds
  refreshInterval.value = window.setInterval(refreshData, 30000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<template>
  <div class="performance-view">
    <!-- Header -->
    <header class="header">
      <button class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1>ประสิทธิภาพของฉัน</h1>
      <button class="refresh-btn" @click="refreshData" :disabled="loading">
        <svg :class="{ spinning: loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
      </button>
    </header>

    <!-- Score Card -->
    <div class="score-card" v-if="score">
      <div class="score-circle" :style="{ '--score-color': scoreColor }">
        <svg viewBox="0 0 100 100">
          <circle class="bg" cx="50" cy="50" r="45"/>
          <circle class="progress" cx="50" cy="50" r="45" :style="{ strokeDashoffset: 283 - (283 * score.overall / 100) }"/>
        </svg>
        <div class="score-value">
          <span class="number">{{ score.overall }}</span>
          <span class="label">คะแนน</span>
        </div>
      </div>
      
      <div class="level-info">
        <div class="level-badge" :style="{ backgroundColor: levelColor }">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>{{ score.levelName }}</span>
        </div>
        <div class="next-level">
          <div class="progress-bar">
            <div class="fill" :style="{ width: levelProgress + '%' }"></div>
          </div>
          <span class="progress-text">{{ Math.round(levelProgress) }}% ไปถึง Level ถัดไป</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">ภาพรวม</button>
      <button :class="{ active: activeTab === 'metrics' }" @click="activeTab = 'metrics'">ตัวชี้วัด</button>
      <button :class="{ active: activeTab === 'badges' }" @click="activeTab = 'badges'">เหรียญรางวัล</button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="overview-tab">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <path d="M22 4L12 14.01l-3-3"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ metrics?.totalTrips || 0 }}</span>
              <span class="stat-label">งานทั้งหมด</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon yellow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ metrics?.onlineHours || 0 }}ชม.</span>
              <span class="stat-label">ออนไลน์สัปดาห์นี้</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ metrics?.rating?.toFixed(1) || '5.0' }}</span>
              <span class="stat-label">คะแนนเฉลี่ย</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20V10M18 20V4M6 20v-4"/>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ score?.badges.length || 0 }}</span>
              <span class="stat-label">เหรียญที่ได้</span>
            </div>
          </div>
        </div>

        <!-- Quick Tips -->
        <div class="tips-section">
          <h3>เคล็ดลับเพิ่มคะแนน</h3>
          <div class="tips-list">
            <div class="tip-item" v-if="metrics && metrics.acceptanceRate < 90">
              <div class="tip-icon warning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p>รับงานให้มากขึ้น - อัตราการรับงานของคุณอยู่ที่ {{ metrics.acceptanceRate }}%</p>
            </div>
            <div class="tip-item" v-if="metrics && metrics.responseTime > 20">
              <div class="tip-icon info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                </svg>
              </div>
              <p>ตอบรับงานเร็วขึ้น - เวลาตอบรับเฉลี่ยของคุณคือ {{ metrics.responseTime }} วินาที</p>
            </div>
            <div class="tip-item success" v-if="metrics && metrics.completionRate >= 95">
              <div class="tip-icon success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </div>
              <p>ยอดเยี่ยม! อัตราสำเร็จของคุณสูงมาก ({{ metrics.completionRate }}%)</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Metrics Tab -->
      <div v-if="activeTab === 'metrics'" class="metrics-tab">
        <div class="metrics-list">
          <div v-for="metric in metricsDisplay" :key="metric.key" class="metric-item">
            <div class="metric-header">
              <span class="metric-label">{{ metric.label }}</span>
              <span class="metric-value" :style="{ color: metric.color }">
                {{ metric.value }}{{ metric.unit }}
              </span>
            </div>
            <div class="metric-bar">
              <div class="metric-fill" :style="{ width: getBarWidth(metric), backgroundColor: metric.color }"></div>
            </div>
          </div>
        </div>
        
        <div class="last-updated">
          อัพเดทล่าสุด: {{ formatLastUpdated() }}
        </div>
      </div>

      <!-- Badges Tab -->
      <div v-if="activeTab === 'badges'" class="badges-tab">
        <div class="badges-section" v-if="score?.badges.length">
          <h3>เหรียญที่ได้รับ</h3>
          <div class="badges-grid">
            <div v-for="badge in score.badges" :key="badge.id" class="badge-card earned">
              <div class="badge-icon">
                <svg v-if="badge.icon === 'star'" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
                <svg v-else-if="badge.icon === 'medal'" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                </svg>
                <svg v-else-if="badge.icon === 'trophy'" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 1012 0V2z"/>
                </svg>
                <svg v-else-if="badge.icon === 'crown'" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z"/>
                </svg>
                <svg v-else-if="badge.icon === 'heart'" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
                </svg>
              </div>
              <span class="badge-name">{{ badge.name }}</span>
              <span class="badge-desc">{{ badge.description }}</span>
            </div>
          </div>
        </div>

        <div class="badges-section" v-if="unearnedBadges.length">
          <h3>เหรียญที่ยังไม่ได้</h3>
          <div class="badges-grid">
            <div v-for="badge in unearnedBadges" :key="badge.id" class="badge-card locked">
              <div class="badge-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <span class="badge-name">{{ badge.name }}</span>
              <span class="badge-desc">{{ badge.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>
  </div>
</template>

<script lang="ts">
// Helper for metric bar width
function getBarWidth(metric: { key: string; value: number | string; unit: string }): string {
  const val = typeof metric.value === 'string' ? parseFloat(metric.value) : metric.value
  if (metric.key === 'rating') return `${(val / 5) * 100}%`
  if (metric.key === 'responseTime') return `${Math.max(0, 100 - (val / 60) * 100)}%`
  if (metric.key === 'cancellationRate') return `${100 - val}%`
  return `${val}%`
}
</script>

<style scoped>
.performance-view {
  min-height: 100vh;
  background: #F5F5F5;
  padding-bottom: 100px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E8E8E8;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0;
}

.back-btn, .refresh-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: #F5F5F5;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.back-btn svg, .refresh-btn svg {
  width: 20px;
  height: 20px;
  color: #1A1A1A;
}

.refresh-btn:disabled {
  opacity: 0.5;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Score Card */
.score-card {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  margin: 16px;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 24px;
  color: #FFFFFF;
}

.score-circle {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.score-circle svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-circle .bg {
  fill: none;
  stroke: rgba(255,255,255,0.2);
  stroke-width: 8;
}

.score-circle .progress {
  fill: none;
  stroke: #FFFFFF;
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 283;
  transition: stroke-dashoffset 0.5s ease;
}

.score-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.score-value .number {
  font-size: 28px;
  font-weight: 700;
  display: block;
}

.score-value .label {
  font-size: 12px;
  opacity: 0.8;
}

.level-info {
  flex: 1;
}

.level-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.level-badge svg {
  width: 16px;
  height: 16px;
}

.next-level {
  margin-top: 8px;
}

.progress-bar {
  height: 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar .fill {
  height: 100%;
  background: #FFFFFF;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
  display: block;
}

/* Tabs */
.tabs {
  display: flex;
  background: #FFFFFF;
  margin: 0 16px;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.tabs button {
  flex: 1;
  padding: 12px;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s;
}

.tabs button.active {
  background: #00A86B;
  color: #FFFFFF;
}

/* Tab Content */
.tab-content {
  padding: 16px;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 22px;
  height: 22px;
  color: #FFFFFF;
}

.stat-icon.green { background: #00A86B; }
.stat-icon.yellow { background: #F5A623; }
.stat-icon.blue { background: #276EF1; }
.stat-icon.purple { background: #7356BF; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
}

.stat-label {
  font-size: 12px;
  color: #666666;
}

/* Tips Section */
.tips-section {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
}

.tips-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 12px 0;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #F5F5F5;
  border-radius: 12px;
}

.tip-item.success {
  background: #E8F5EF;
}

.tip-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tip-icon svg {
  width: 18px;
  height: 18px;
}

.tip-icon.warning {
  background: #FFF3E0;
  color: #F5A623;
}

.tip-icon.info {
  background: #E3F2FD;
  color: #276EF1;
}

.tip-icon.success {
  background: #E8F5EF;
  color: #00A86B;
}

.tip-item p {
  margin: 0;
  font-size: 14px;
  color: #1A1A1A;
  line-height: 1.4;
}

/* Metrics Tab */
.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-item {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 14px;
  color: #666666;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
}

.metric-bar {
  height: 8px;
  background: #E8E8E8;
  border-radius: 4px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.last-updated {
  text-align: center;
  font-size: 12px;
  color: #999999;
  margin-top: 16px;
}

/* Badges Tab */
.badges-section {
  margin-bottom: 24px;
}

.badges-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 12px 0;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.badge-card {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.badge-card.earned {
  border: 2px solid #00A86B;
}

.badge-card.locked {
  opacity: 0.5;
}

.badge-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-card.earned .badge-icon {
  background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%);
  color: #FFFFFF;
}

.badge-card.locked .badge-icon {
  background: #E8E8E8;
  color: #999999;
}

.badge-icon svg {
  width: 24px;
  height: 24px;
}

.badge-name {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
}

.badge-desc {
  font-size: 10px;
  color: #666666;
  line-height: 1.3;
}

/* Loading */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
</style>
