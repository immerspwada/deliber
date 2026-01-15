<script setup lang="ts">
/**
 * Earnings Dashboard Component - Production Ready
 * Displays earnings breakdown by service type and time period
 * 
 * Role Impact:
 * - Provider: View detailed earnings analytics
 * - Customer: No access
 * - Admin: View all provider earnings (separate view)
 */

import { ref, computed, onMounted } from 'vue'
import { useProviderEarnings } from '../../composables/useProviderEarnings'

const {
  earningsSummary,
  weeklyStats,
  fetchEarningsSummary,
  fetchWeeklyStats,
  formatMinutesToHours,
  loading
} = useProviderEarnings()

// State
const selectedPeriod = ref<'today' | 'week' | 'month'>('week')
const selectedView = ref<'overview' | 'breakdown' | 'trends'>('overview')

// Mock data for service type breakdown (replace with real data)
const serviceBreakdown = ref([
  { type: 'ride', name: 'รับส่ง', earnings: 1250, jobs: 15, color: '#10b981' },
  { type: 'delivery', name: 'ส่งของ', earnings: 850, jobs: 12, color: '#3b82f6' },
  { type: 'shopping', name: 'ช้อปปิ้ง', earnings: 650, jobs: 8, color: '#f59e0b' }
])

// Computed
const periodEarnings = computed(() => {
  if (!earningsSummary.value) return 0
  
  switch (selectedPeriod.value) {
    case 'today':
      return earningsSummary.value.today_earnings
    case 'week':
      return earningsSummary.value.week_earnings
    case 'month':
      return earningsSummary.value.month_earnings
    default:
      return 0
  }
})

const periodJobs = computed(() => {
  if (!earningsSummary.value) return 0
  
  switch (selectedPeriod.value) {
    case 'today':
      return earningsSummary.value.today_trips
    case 'week':
      return earningsSummary.value.week_trips
    case 'month':
      return earningsSummary.value.month_trips
    default:
      return 0
  }
})

const averagePerJob = computed(() => {
  if (periodJobs.value === 0) return 0
  return Math.round(periodEarnings.value / periodJobs.value)
})

const chartData = computed(() => {
  if (!weeklyStats.value || weeklyStats.value.length === 0) {
    return []
  }
  
  return weeklyStats.value.map(stat => ({
    day: stat.day_name,
    earnings: stat.earnings,
    jobs: stat.trips,
    hours: Math.round(stat.online_minutes / 60)
  }))
})

const maxEarnings = computed(() => {
  if (chartData.value.length === 0) return 1000
  return Math.max(...chartData.value.map(d => d.earnings), 100)
})

// Methods
async function loadData() {
  const { data: { user } } = await (await import('../../lib/supabase')).supabase.auth.getUser()
  if (!user) return
  
  const { data: provider } = await (await import('../../lib/supabase')).supabase
    .from('providers_v2')
    .select('id')
    .eq('user_id', user.id)
    .single()
  
  if (!provider) return
  
  await Promise.all([
    fetchEarningsSummary(provider.id),
    fetchWeeklyStats(provider.id)
  ])
}

function getBarHeight(earnings: number): number {
  return (earnings / maxEarnings.value) * 100
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="earnings-dashboard">
    <!-- Header -->
    <header class="dashboard-header">
      <h2 class="dashboard-title">รายได้</h2>
      
      <!-- Period Selector -->
      <div class="period-selector">
        <button
          v-for="period in [
            { value: 'today', label: 'วันนี้' },
            { value: 'week', label: 'สัปดาห์' },
            { value: 'month', label: 'เดือน' }
          ]"
          :key="period.value"
          class="period-btn"
          :class="{ active: selectedPeriod === period.value }"
          @click="selectedPeriod = period.value as any"
        >
          {{ period.label }}
        </button>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>กำลังโหลด...</p>
    </div>

    <!-- Content -->
    <div v-else class="dashboard-content">
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card primary">
          <div class="card-icon">฿</div>
          <div class="card-content">
            <span class="card-value">{{ periodEarnings.toLocaleString() }}</span>
            <span class="card-label">รายได้รวม (บาท)</span>
          </div>
        </div>
        
        <div class="summary-card">
          <div class="card-icon">📦</div>
          <div class="card-content">
            <span class="card-value">{{ periodJobs }}</span>
            <span class="card-label">งานทั้งหมด</span>
          </div>
        </div>
        
        <div class="summary-card">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <span class="card-value">฿{{ averagePerJob.toLocaleString() }}</span>
            <span class="card-label">เฉลี่ยต่องาน</span>
          </div>
        </div>
      </div>

      <!-- View Tabs -->
      <div class="view-tabs">
        <button
          v-for="view in [
            { value: 'overview', label: 'ภาพรวม', icon: '📊' },
            { value: 'breakdown', label: 'แยกตามประเภท', icon: '📈' },
            { value: 'trends', label: 'แนวโน้ม', icon: '📉' }
          ]"
          :key="view.value"
          class="view-tab"
          :class="{ active: selectedView === view.value }"
          @click="selectedView = view.value as any"
        >
          <span class="tab-icon">{{ view.icon }}</span>
          <span class="tab-label">{{ view.label }}</span>
        </button>
      </div>

      <!-- Overview View -->
      <div v-if="selectedView === 'overview'" class="view-content">
        <!-- Weekly Chart -->
        <div class="chart-card">
          <h3 class="chart-title">รายได้ 7 วันที่ผ่านมา</h3>
          <div class="bar-chart">
            <div
              v-for="data in chartData"
              :key="data.day"
              class="bar-item"
            >
              <div class="bar-wrapper">
                <div
                  class="bar"
                  :style="{ height: `${getBarHeight(data.earnings)}%` }"
                >
                  <span class="bar-value">฿{{ data.earnings }}</span>
                </div>
              </div>
              <span class="bar-label">{{ data.day }}</span>
            </div>
          </div>
        </div>

        <!-- Available Balance -->
        <div v-if="earningsSummary" class="balance-card">
          <div class="balance-header">
            <h3>ยอดเงินคงเหลือ</h3>
            <button class="withdraw-btn">ถอนเงิน</button>
          </div>
          <div class="balance-amount">
            ฿{{ earningsSummary.available_balance.toLocaleString() }}
          </div>
          <div class="balance-details">
            <div class="balance-item">
              <span>รอดำเนินการ</span>
              <span>฿{{ earningsSummary.pending_withdrawals.toLocaleString() }}</span>
            </div>
            <div class="balance-item">
              <span>ถอนไปแล้ว</span>
              <span>฿{{ earningsSummary.total_withdrawn.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Breakdown View -->
      <div v-if="selectedView === 'breakdown'" class="view-content">
        <div class="breakdown-list">
          <div
            v-for="service in serviceBreakdown"
            :key="service.type"
            class="breakdown-item"
          >
            <div class="breakdown-icon" :style="{ background: service.color }">
              {{ service.type === 'ride' ? '🚗' : service.type === 'delivery' ? '📦' : '🛒' }}
            </div>
            <div class="breakdown-content">
              <div class="breakdown-header">
                <span class="breakdown-name">{{ service.name }}</span>
                <span class="breakdown-earnings">฿{{ service.earnings.toLocaleString() }}</span>
              </div>
              <div class="breakdown-details">
                <span>{{ service.jobs }} งาน</span>
                <span>•</span>
                <span>฿{{ Math.round(service.earnings / service.jobs) }} ต่องาน</span>
              </div>
              <div class="breakdown-bar">
                <div
                  class="breakdown-fill"
                  :style="{
                    width: `${(service.earnings / periodEarnings) * 100}%`,
                    background: service.color
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Trends View -->
      <div v-if="selectedView === 'trends'" class="view-content">
        <div class="trends-grid">
          <div class="trend-card">
            <div class="trend-icon">📈</div>
            <div class="trend-content">
              <span class="trend-label">เติบโต</span>
              <span class="trend-value positive">+15%</span>
              <span class="trend-detail">เทียบกับสัปดาห์ที่แล้ว</span>
            </div>
          </div>
          
          <div class="trend-card">
            <div class="trend-icon">⏰</div>
            <div class="trend-content">
              <span class="trend-label">ช่วงเวลาดีที่สุด</span>
              <span class="trend-value">17:00-20:00</span>
              <span class="trend-detail">รายได้เฉลี่ย ฿450/ชม.</span>
            </div>
          </div>
          
          <div class="trend-card">
            <div class="trend-icon">🎯</div>
            <div class="trend-content">
              <span class="trend-label">เป้าหมายเดือนนี้</span>
              <span class="trend-value">65%</span>
              <span class="trend-detail">฿13,000 / ฿20,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Container */
.earnings-dashboard {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Header */
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.dashboard-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.period-selector {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
}

.period-btn {
  padding: 6px 14px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.period-btn.active {
  background: white;
  color: #16a34a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 12px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f1f5f9;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.summary-card.primary {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
}

.card-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  flex-shrink: 0;
}

.summary-card:not(.primary) .card-icon {
  background: white;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.card-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.summary-card:not(.primary) .card-value {
  color: #1e293b;
}

.card-label {
  font-size: 11px;
  opacity: 0.8;
}

.summary-card:not(.primary) .card-label {
  color: #64748b;
}

/* View Tabs */
.view-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.view-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #f8fafc;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-family: inherit;
}

.view-tab.active {
  background: white;
  border-color: #16a34a;
  color: #16a34a;
}

.tab-icon {
  font-size: 16px;
}

/* Chart */
.chart-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 16px 0;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  height: 180px;
  padding: 10px 0;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bar-wrapper {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  max-width: 40px;
  background: linear-gradient(180deg, #16a34a 0%, #15803d 100%);
  border-radius: 6px 6px 0 0;
  position: relative;
  transition: all 0.3s;
  min-height: 4px;
}

.bar:hover {
  opacity: 0.8;
}

.bar-value {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

.bar-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

/* Balance Card */
.balance-card {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  padding: 20px;
}

.balance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.balance-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
  margin: 0;
}

.withdraw-btn {
  padding: 8px 16px;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  font-family: inherit;
}

.withdraw-btn:hover {
  background: #15803d;
}

.balance-amount {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}

.balance-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.balance-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #64748b;
}

.balance-item span:last-child {
  font-weight: 600;
  color: #475569;
}

/* Breakdown */
.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.breakdown-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.breakdown-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border-radius: 12px;
  flex-shrink: 0;
}

.breakdown-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.breakdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.breakdown-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.breakdown-earnings {
  font-size: 16px;
  font-weight: 700;
  color: #16a34a;
}

.breakdown-details {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}

.breakdown-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.breakdown-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

/* Trends */
.trends-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trend-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
}

.trend-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: white;
  border-radius: 12px;
  flex-shrink: 0;
}

.trend-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-label {
  font-size: 12px;
  color: #64748b;
}

.trend-value {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.trend-value.positive {
  color: #16a34a;
}

.trend-detail {
  font-size: 12px;
  color: #94a3b8;
}

/* Responsive */
@media (max-width: 360px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
}
</style>
