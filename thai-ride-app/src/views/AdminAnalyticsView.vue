<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAnalytics } from '../composables/useAnalytics'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { addCleanup } = useAdminCleanup()

const { 
  loading, dailyStats, hourlyDemand, topProviders, revenueBreakdown,
  fetchDailyStats, fetchHourlyDemand, fetchRevenueBreakdown, fetchTopProviders, getSummary
} = useAnalytics()

const selectedPeriod = ref<7 | 14 | 30>(7)
const activeTab = ref<'overview' | 'revenue' | 'demand' | 'providers'>('overview')

onMounted(async () => {
  await Promise.all([
    fetchDailyStats(30),
    fetchHourlyDemand(),
    fetchRevenueBreakdown(30),
    fetchTopProviders(10)
  ])
})

// Cleanup on unmount
addCleanup(() => {
  selectedPeriod.value = 7
  activeTab.value = 'overview'
  console.log('[AdminAnalyticsView] Cleanup complete')
})

const summary = computed(() => getSummary())

const filteredStats = computed(() => {
  return dailyStats.value.slice(-selectedPeriod.value)
})

const maxRevenue = computed(() => {
  return Math.max(...filteredStats.value.map(d => d.revenue), 1)
})

const maxOrders = computed(() => {
  return Math.max(...filteredStats.value.map(d => d.rides + d.deliveries + d.shopping), 1)
})

const maxHourlyDemand = computed(() => {
  return Math.max(...hourlyDemand.value.map(h => h.total), 1)
})

const formatCurrency = (n: number) => `฿${n.toLocaleString('th-TH')}`
const formatNumber = (n: number) => n.toLocaleString('th-TH')
const formatDate = (d: string) => {
  const date = new Date(d)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}
const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`

const getGrowthClass = (growth: number) => growth >= 0 ? 'positive' : 'negative'
const getGrowthIcon = (growth: number) => growth >= 0 ? '↑' : '↓'

const changePeriod = async (period: 7 | 14 | 30) => {
  selectedPeriod.value = period
}
</script>

<template>
  <AdminLayout>
    <div class="analytics-page">
      <div class="page-header">
        <div>
          <h1>Analytics</h1>
          <p class="subtitle">วิเคราะห์ข้อมูลและแนวโน้ม</p>
        </div>
        <div class="period-selector">
          <button 
            v-for="p in [7, 14, 30]" 
            :key="p"
            :class="{ active: selectedPeriod === p }"
            @click="changePeriod(p as 7 | 14 | 30)"
          >
            {{ p }} วัน
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          v-for="tab in ['overview', 'revenue', 'demand', 'providers']"
          :key="tab"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab as any"
        >
          {{ tab === 'overview' ? 'ภาพรวม' : tab === 'revenue' ? 'รายได้' : tab === 'demand' ? 'ความต้องการ' : 'ผู้ให้บริการ' }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>กำลังโหลดข้อมูล...</span>
      </div>

      <!-- Overview Tab -->
      <div v-else-if="activeTab === 'overview'" class="tab-content">
        <!-- Summary Cards -->
        <div v-if="summary" class="summary-grid">
          <div class="summary-card">
            <span class="summary-label">ออเดอร์วันนี้</span>
            <span class="summary-value">{{ formatNumber(summary.todayOrders) }}</span>
            <span :class="['summary-growth', getGrowthClass(summary.ordersGrowth)]">
              {{ getGrowthIcon(summary.ordersGrowth) }} {{ Math.abs(summary.ordersGrowth) }}%
            </span>
          </div>
          <div class="summary-card">
            <span class="summary-label">รายได้วันนี้</span>
            <span class="summary-value">{{ formatCurrency(summary.todayRevenue) }}</span>
            <span :class="['summary-growth', getGrowthClass(summary.revenueGrowth)]">
              {{ getGrowthIcon(summary.revenueGrowth) }} {{ Math.abs(summary.revenueGrowth) }}%
            </span>
          </div>
          <div class="summary-card">
            <span class="summary-label">ออเดอร์ 7 วัน</span>
            <span class="summary-value">{{ formatNumber(summary.weeklyOrders) }}</span>
            <span :class="['summary-growth', getGrowthClass(summary.weeklyOrdersGrowth)]">
              {{ getGrowthIcon(summary.weeklyOrdersGrowth) }} {{ Math.abs(summary.weeklyOrdersGrowth) }}%
            </span>
          </div>
          <div class="summary-card highlight">
            <span class="summary-label">รายได้ 7 วัน</span>
            <span class="summary-value">{{ formatCurrency(summary.weeklyRevenue) }}</span>
            <span :class="['summary-growth', getGrowthClass(summary.weeklyRevenueGrowth)]">
              {{ getGrowthIcon(summary.weeklyRevenueGrowth) }} {{ Math.abs(summary.weeklyRevenueGrowth) }}%
            </span>
          </div>
        </div>

        <!-- Orders Chart -->
        <div class="chart-card">
          <h3>จำนวนออเดอร์</h3>
          <div class="chart-container">
            <div class="bar-chart">
              <div 
                v-for="stat in filteredStats" 
                :key="stat.date" 
                class="bar-group"
              >
                <div class="bars">
                  <div 
                    class="bar rides" 
                    :style="{ height: `${(stat.rides / maxOrders) * 100}%` }"
                    :title="`เรียกรถ: ${stat.rides}`"
                  ></div>
                  <div 
                    class="bar deliveries" 
                    :style="{ height: `${(stat.deliveries / maxOrders) * 100}%` }"
                    :title="`ส่งของ: ${stat.deliveries}`"
                  ></div>
                  <div 
                    class="bar shopping" 
                    :style="{ height: `${(stat.shopping / maxOrders) * 100}%` }"
                    :title="`ซื้อของ: ${stat.shopping}`"
                  ></div>
                </div>
                <span class="bar-label">{{ formatDate(stat.date) }}</span>
              </div>
            </div>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><span class="dot rides"></span> เรียกรถ</span>
            <span class="legend-item"><span class="dot deliveries"></span> ส่งของ</span>
            <span class="legend-item"><span class="dot shopping"></span> ซื้อของ</span>
          </div>
        </div>

        <!-- Revenue Chart -->
        <div class="chart-card">
          <h3>รายได้</h3>
          <div class="chart-container">
            <div class="line-chart">
              <svg viewBox="0 0 100 50" preserveAspectRatio="none">
                <polyline
                  :points="filteredStats.map((s, i) => 
                    `${(i / (filteredStats.length - 1)) * 100},${50 - (s.revenue / maxRevenue) * 45}`
                  ).join(' ')"
                  fill="none"
                  stroke="#000"
                  stroke-width="0.5"
                />
                <circle
                  v-for="(stat, i) in filteredStats"
                  :key="stat.date"
                  :cx="(i / (filteredStats.length - 1)) * 100"
                  :cy="50 - (stat.revenue / maxRevenue) * 45"
                  r="1"
                  fill="#000"
                />
              </svg>
            </div>
            <div class="chart-labels">
              <span v-for="(stat, i) in filteredStats" :key="stat.date" v-show="i % Math.ceil(filteredStats.length / 7) === 0">
                {{ formatDate(stat.date) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Revenue Tab -->
      <div v-else-if="activeTab === 'revenue'" class="tab-content">
        <div class="revenue-breakdown">
          <h3>สัดส่วนรายได้</h3>
          <div class="breakdown-chart">
            <div class="donut-chart">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e5e5" stroke-width="12"/>
                <circle 
                  cx="50" cy="50" r="40" fill="none" 
                  stroke="#000" stroke-width="12"
                  :stroke-dasharray="`${(revenueBreakdown.rides / revenueBreakdown.total) * 251.2} 251.2`"
                  stroke-dashoffset="0"
                  transform="rotate(-90 50 50)"
                />
                <circle 
                  cx="50" cy="50" r="40" fill="none" 
                  stroke="#f57c00" stroke-width="12"
                  :stroke-dasharray="`${(revenueBreakdown.deliveries / revenueBreakdown.total) * 251.2} 251.2`"
                  :stroke-dashoffset="`${-(revenueBreakdown.rides / revenueBreakdown.total) * 251.2}`"
                  transform="rotate(-90 50 50)"
                />
                <circle 
                  cx="50" cy="50" r="40" fill="none" 
                  stroke="#e91e63" stroke-width="12"
                  :stroke-dasharray="`${(revenueBreakdown.shopping / revenueBreakdown.total) * 251.2} 251.2`"
                  :stroke-dashoffset="`${-((revenueBreakdown.rides + revenueBreakdown.deliveries) / revenueBreakdown.total) * 251.2}`"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div class="donut-center">
                <span class="total-label">รวม</span>
                <span class="total-value">{{ formatCurrency(revenueBreakdown.total) }}</span>
              </div>
            </div>
          </div>
          <div class="breakdown-list">
            <div class="breakdown-item">
              <span class="dot rides"></span>
              <span class="item-label">เรียกรถ</span>
              <span class="item-value">{{ formatCurrency(revenueBreakdown.rides) }}</span>
              <span class="item-percent">{{ Math.round((revenueBreakdown.rides / revenueBreakdown.total) * 100) }}%</span>
            </div>
            <div class="breakdown-item">
              <span class="dot deliveries"></span>
              <span class="item-label">ส่งของ</span>
              <span class="item-value">{{ formatCurrency(revenueBreakdown.deliveries) }}</span>
              <span class="item-percent">{{ Math.round((revenueBreakdown.deliveries / revenueBreakdown.total) * 100) }}%</span>
            </div>
            <div class="breakdown-item">
              <span class="dot shopping"></span>
              <span class="item-label">ซื้อของ</span>
              <span class="item-value">{{ formatCurrency(revenueBreakdown.shopping) }}</span>
              <span class="item-percent">{{ Math.round((revenueBreakdown.shopping / revenueBreakdown.total) * 100) }}%</span>
            </div>
            <div class="breakdown-item">
              <span class="dot subscriptions"></span>
              <span class="item-label">สมาชิก</span>
              <span class="item-value">{{ formatCurrency(revenueBreakdown.subscriptions) }}</span>
              <span class="item-percent">{{ Math.round((revenueBreakdown.subscriptions / revenueBreakdown.total) * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Demand Tab -->
      <div v-else-if="activeTab === 'demand'" class="tab-content">
        <div class="chart-card">
          <h3>ความต้องการตามช่วงเวลา</h3>
          <p class="chart-desc">ข้อมูลเฉลี่ย 7 วันที่ผ่านมา</p>
          <div class="hourly-chart">
            <div 
              v-for="hour in hourlyDemand" 
              :key="hour.hour" 
              class="hour-bar"
              :class="{ peak: hour.total === maxHourlyDemand }"
            >
              <div 
                class="hour-fill" 
                :style="{ height: `${(hour.total / maxHourlyDemand) * 100}%` }"
              >
                <span class="hour-value">{{ hour.total }}</span>
              </div>
              <span class="hour-label">{{ formatHour(hour.hour) }}</span>
            </div>
          </div>
          <div class="peak-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span>ช่วงเวลาที่มีความต้องการสูงสุด: <strong>{{ formatHour(summary?.peakHour || 18) }}</strong></span>
          </div>
        </div>
      </div>

      <!-- Providers Tab -->
      <div v-else-if="activeTab === 'providers'" class="tab-content">
        <div class="providers-card">
          <h3>ผู้ให้บริการยอดเยี่ยม</h3>
          <div class="providers-list">
            <div 
              v-for="(provider, index) in topProviders" 
              :key="provider.id" 
              class="provider-item"
            >
              <span class="provider-rank">{{ index + 1 }}</span>
              <div class="provider-info">
                <span class="provider-name">{{ provider.name }}</span>
                <div class="provider-stats">
                  <span>{{ provider.totalTrips }} งาน</span>
                  <span class="divider">•</span>
                  <span>{{ provider.rating.toFixed(1) }} ดาว</span>
                </div>
              </div>
              <div class="provider-metrics">
                <div class="metric">
                  <span class="metric-value">{{ provider.completionRate.toFixed(0) }}%</span>
                  <span class="metric-label">สำเร็จ</span>
                </div>
                <div class="metric">
                  <span class="metric-value">{{ formatCurrency(provider.earnings) }}</span>
                  <span class="metric-label">รายได้</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>


<style scoped>
.analytics-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.subtitle {
  color: #6b6b6b;
  font-size: 14px;
}

.period-selector {
  display: flex;
  gap: 8px;
}

.period-selector button {
  padding: 8px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.period-selector button.active {
  background: #000;
  color: #fff;
  border-color: #000;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: #f6f6f6;
  padding: 4px;
  border-radius: 10px;
  overflow-x: auto;
}

.tabs button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tabs button.active {
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: #6b6b6b;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e5e5;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.summary-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.summary-card.highlight {
  background: #000;
  color: #fff;
}

.summary-card.highlight .summary-label {
  color: rgba(255,255,255,0.7);
}

.summary-card.highlight .summary-growth.positive {
  color: #4ade80;
}

.summary-label {
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.summary-growth {
  font-size: 12px;
  font-weight: 500;
}

.summary-growth.positive {
  color: #05944f;
}

.summary-growth.negative {
  color: #e11900;
}

/* Chart Card */
.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.chart-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.chart-desc {
  font-size: 13px;
  color: #6b6b6b;
  margin-top: -12px;
  margin-bottom: 16px;
}

.chart-container {
  height: 200px;
  position: relative;
}

/* Bar Chart */
.bar-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 100%;
  gap: 4px;
  padding-bottom: 24px;
}

.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bars {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  height: calc(100% - 20px);
  width: 100%;
}

.bar {
  flex: 1;
  min-height: 4px;
  border-radius: 2px 2px 0 0;
  transition: height 0.3s ease;
}

.bar.rides { background: #000; }
.bar.deliveries { background: #f57c00; }
.bar.shopping { background: #e91e63; }

.bar-label {
  font-size: 10px;
  color: #6b6b6b;
  margin-top: 4px;
  white-space: nowrap;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b6b6b;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.rides { background: #000; }
.dot.deliveries { background: #f57c00; }
.dot.shopping { background: #e91e63; }
.dot.subscriptions { background: #673ab7; }

/* Line Chart */
.line-chart {
  height: 160px;
}

.line-chart svg {
  width: 100%;
  height: 100%;
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.chart-labels span {
  font-size: 10px;
  color: #6b6b6b;
}

/* Revenue Breakdown */
.revenue-breakdown {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.revenue-breakdown h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.breakdown-chart {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.donut-chart {
  position: relative;
  width: 180px;
  height: 180px;
}

.donut-chart svg {
  width: 100%;
  height: 100%;
}

.donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.total-label {
  display: block;
  font-size: 12px;
  color: #6b6b6b;
}

.total-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.breakdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.item-label {
  flex: 1;
  font-size: 14px;
}

.item-value {
  font-size: 14px;
  font-weight: 600;
}

.item-percent {
  font-size: 12px;
  color: #6b6b6b;
  min-width: 40px;
  text-align: right;
}

/* Hourly Chart */
.hourly-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 200px;
  padding-bottom: 24px;
  overflow-x: auto;
}

.hour-bar {
  flex: 1;
  min-width: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.hour-fill {
  width: 100%;
  background: #e5e5e5;
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: all 0.3s ease;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.hour-bar.peak .hour-fill {
  background: #000;
}

.hour-value {
  font-size: 9px;
  color: #fff;
  padding-top: 4px;
  opacity: 0;
}

.hour-bar.peak .hour-value {
  opacity: 1;
}

.hour-label {
  font-size: 9px;
  color: #6b6b6b;
  margin-top: 4px;
  transform: rotate(-45deg);
  white-space: nowrap;
}

.peak-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
  font-size: 13px;
  color: #6b6b6b;
}

.peak-info strong {
  color: #000;
}

/* Providers */
.providers-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.providers-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.providers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 10px;
}

.provider-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #000;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.provider-item:nth-child(1) .provider-rank { background: #ffc043; color: #000; }
.provider-item:nth-child(2) .provider-rank { background: #c0c0c0; color: #000; }
.provider-item:nth-child(3) .provider-rank { background: #cd7f32; color: #fff; }

.provider-info {
  flex: 1;
  min-width: 0;
}

.provider-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-stats {
  font-size: 12px;
  color: #6b6b6b;
}

.provider-stats .divider {
  margin: 0 4px;
}

.provider-metrics {
  display: flex;
  gap: 16px;
}

.metric {
  text-align: right;
}

.metric-value {
  display: block;
  font-size: 13px;
  font-weight: 600;
}

.metric-label {
  display: block;
  font-size: 10px;
  color: #6b6b6b;
}

@media (min-width: 640px) {
  .summary-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .hour-label {
    transform: none;
  }
}

@media (min-width: 1024px) {
  .analytics-page {
    padding: 32px;
  }
  
  .page-header h1 {
    font-size: 28px;
  }
}
</style>
