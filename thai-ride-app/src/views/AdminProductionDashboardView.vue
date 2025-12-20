<template>
  <AdminLayout>
    <div class="admin-production-dashboard">
      <!-- Header -->
      <div class="header-section">
        <div class="header-content">
          <h1 class="page-title">Production Dashboard</h1>
          <p class="page-subtitle">ภาพรวมธุรกิจและ KPIs</p>
        </div>
        <div class="header-actions">
          <select v-model="selectedPeriod" @change="refreshData" class="period-select">
            <option value="7">7 วัน</option>
            <option value="14">14 วัน</option>
            <option value="30">30 วัน</option>
            <option value="90">90 วัน</option>
          </select>
          <button @click="refreshData" :disabled="loading" class="btn-refresh">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid" v-if="kpis">
        <div class="kpi-card">
          <div class="kpi-icon rides">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ formatNumber(kpis.total_rides) }}</span>
            <span class="kpi-label">Total Rides</span>
            <span class="kpi-change" :class="{ positive: kpis.rides_growth > 0, negative: kpis.rides_growth < 0 }">
              {{ kpis.rides_growth > 0 ? '+' : '' }}{{ kpis.rides_growth }}%
            </span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon revenue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">฿{{ formatNumber(kpis.total_revenue) }}</span>
            <span class="kpi-label">Total Revenue</span>
            <span class="kpi-change" :class="{ positive: kpis.revenue_growth > 0, negative: kpis.revenue_growth < 0 }">
              {{ kpis.revenue_growth > 0 ? '+' : '' }}{{ kpis.revenue_growth }}%
            </span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon rating">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ kpis.avg_rating?.toFixed(2) || 'N/A' }}</span>
            <span class="kpi-label">Avg Rating</span>
            <span class="kpi-sub">{{ kpis.completion_rate }}% completion</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon users">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="kpi-content">
            <span class="kpi-value">{{ formatNumber(kpis.new_users) }}</span>
            <span class="kpi-label">New Users</span>
            <span class="kpi-sub">{{ kpis.active_providers }} active providers</span>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="chart-card">
          <h3>Revenue Breakdown</h3>
          <div class="revenue-breakdown">
            <div v-for="item in revenueBreakdown" :key="item.service_type" class="revenue-item">
              <div class="revenue-header">
                <span class="revenue-type">{{ serviceLabels[item.service_type] || item.service_type }}</span>
                <span class="revenue-percentage">{{ item.percentage }}%</span>
              </div>
              <div class="revenue-bar">
                <div class="revenue-fill" :style="{ width: `${item.percentage}%` }"></div>
              </div>
              <div class="revenue-details">
                <span>฿{{ formatNumber(item.total_revenue) }}</span>
                <span>{{ item.transaction_count }} transactions</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <h3>Hourly Activity</h3>
          <div class="hourly-chart">
            <div v-for="hour in hourlyActivity" :key="hour.hour" class="hour-bar">
              <div class="bar" :style="{ height: `${getBarHeight(hour.ride_count)}%` }"></div>
              <span class="hour-label">{{ hour.hour }}:00</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Providers -->
      <div class="providers-section">
        <h3>Top Providers</h3>
        <div class="providers-table">
          <div class="table-header">
            <span>Provider</span>
            <span>Rides</span>
            <span>Earnings</span>
            <span>Rating</span>
            <span>Completion</span>
          </div>
          <div v-for="provider in topProviders" :key="provider.provider_id" class="table-row">
            <span class="provider-name">{{ provider.provider_name }}</span>
            <span>{{ provider.total_rides }}</span>
            <span>฿{{ formatNumber(provider.total_earnings) }}</span>
            <span class="rating">
              <svg viewBox="0 0 24 24" fill="currentColor" class="star-icon">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
              {{ provider.avg_rating?.toFixed(1) || 'N/A' }}
            </span>
            <span>{{ provider.completion_rate }}%</span>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useProductionAnalytics } from '../composables/useProductionAnalytics'

const {
  kpis, revenueBreakdown, hourlyActivity, topProviders, loading,
  fetchKPIs, fetchRevenueBreakdown, fetchHourlyActivity, fetchTopProviders
} = useProductionAnalytics()

const selectedPeriod = ref(7)

const serviceLabels: Record<string, string> = {
  rides: 'Rides',
  deliveries: 'Deliveries',
  shopping: 'Shopping'
}

const refreshData = async () => {
  await Promise.all([
    fetchKPIs(selectedPeriod.value),
    fetchRevenueBreakdown(),
    fetchHourlyActivity(),
    fetchTopProviders()
  ])
}

const formatNumber = (num: number) => {
  if (!num) return '0'
  return num.toLocaleString('th-TH')
}

const getBarHeight = (count: number) => {
  const max = Math.max(...hourlyActivity.value.map(h => h.ride_count), 1)
  return (count / max) * 100
}

onMounted(refreshData)
</script>

<style scoped>
.admin-production-dashboard { padding: 24px; max-width: 1400px; margin: 0 auto; }
.header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.page-title { font-size: 28px; font-weight: 700; color: #1A1A1A; margin: 0 0 8px 0; }
.page-subtitle { color: #666666; margin: 0; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.period-select { padding: 10px 16px; border: 1px solid #E8E8E8; border-radius: 8px; font-size: 14px; }
.btn-refresh { padding: 10px; background: #F5F5F5; border: none; border-radius: 8px; cursor: pointer; }
.icon { width: 20px; height: 20px; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px; }
.kpi-card { display: flex; align-items: center; gap: 16px; padding: 24px; background: white; border-radius: 16px; border: 1px solid #F0F0F0; }
.kpi-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
.kpi-icon svg { width: 28px; height: 28px; }
.kpi-icon.rides { background: #E8F5EF; color: #00A86B; }
.kpi-icon.revenue { background: #E3F2FD; color: #1976D2; }
.kpi-icon.rating { background: #FFF3E0; color: #F5A623; }
.kpi-icon.users { background: #F3E5F5; color: #9C27B0; }
.kpi-value { font-size: 28px; font-weight: 700; color: #1A1A1A; display: block; }
.kpi-label { font-size: 14px; color: #666666; display: block; margin-top: 4px; }
.kpi-change { font-size: 14px; font-weight: 600; display: block; margin-top: 4px; }
.kpi-change.positive { color: #00A86B; }
.kpi-change.negative { color: #E53935; }
.kpi-sub { font-size: 12px; color: #999999; display: block; margin-top: 4px; }

.charts-section { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; margin-bottom: 32px; }
.chart-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #F0F0F0; }
.chart-card h3 { margin: 0 0 20px 0; font-size: 18px; color: #1A1A1A; }

.revenue-breakdown { display: flex; flex-direction: column; gap: 16px; }
.revenue-item { }
.revenue-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.revenue-type { font-weight: 600; color: #1A1A1A; }
.revenue-percentage { font-weight: 600; color: #00A86B; }
.revenue-bar { height: 8px; background: #F0F0F0; border-radius: 4px; overflow: hidden; }
.revenue-fill { height: 100%; background: #00A86B; border-radius: 4px; }
.revenue-details { display: flex; justify-content: space-between; margin-top: 8px; font-size: 14px; color: #666666; }

.hourly-chart { display: flex; align-items: flex-end; gap: 4px; height: 150px; padding-top: 20px; }
.hour-bar { flex: 1; display: flex; flex-direction: column; align-items: center; }
.bar { width: 100%; background: #00A86B; border-radius: 4px 4px 0 0; min-height: 4px; }
.hour-label { font-size: 10px; color: #999999; margin-top: 4px; }

.providers-section { background: white; border-radius: 16px; padding: 24px; border: 1px solid #F0F0F0; }
.providers-section h3 { margin: 0 0 20px 0; font-size: 18px; color: #1A1A1A; }
.providers-table { }
.table-header, .table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 16px; padding: 12px 0; }
.table-header { font-weight: 600; color: #666666; font-size: 14px; border-bottom: 1px solid #F0F0F0; }
.table-row { border-bottom: 1px solid #F0F0F0; font-size: 14px; color: #1A1A1A; }
.table-row:last-child { border-bottom: none; }
.provider-name { font-weight: 600; }
.rating { display: flex; align-items: center; gap: 4px; }
.star-icon { width: 14px; height: 14px; color: #F5A623; }
</style>
