<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProvider } from '../../composables/useProvider'
import ProviderLayout from '../../components/ProviderLayout.vue'

const {
  earnings,
  weeklyEarnings,
  maxWeeklyEarning,
  fetchEarnings
} = useProvider()

const isLoading = ref(true)
const selectedPeriod = ref<'today' | 'week' | 'month'>('week')

// Initialize
onMounted(async () => {
  await fetchEarnings()
  isLoading.value = false
})

// Get period data
const periodData = computed(() => {
  switch (selectedPeriod.value) {
    case 'today':
      return { amount: earnings.value.today, trips: earnings.value.todayTrips, label: 'วันนี้' }
    case 'week':
      return { amount: earnings.value.thisWeek, trips: earnings.value.weekTrips, label: 'สัปดาห์นี้' }
    case 'month':
      return { amount: earnings.value.thisMonth, trips: earnings.value.monthTrips, label: 'เดือนนี้' }
  }
})
</script>

<template>
  <ProviderLayout>
    <div class="earnings-page">
      <div class="page-content">
        <!-- Header -->
        <div class="page-header">
          <h1>รายได้</h1>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
        </div>

        <template v-else>
          <!-- Period Selector -->
          <div class="period-tabs">
            <button 
              @click="selectedPeriod = 'today'"
              :class="['period-tab', { active: selectedPeriod === 'today' }]"
            >
              วันนี้
            </button>
            <button 
              @click="selectedPeriod = 'week'"
              :class="['period-tab', { active: selectedPeriod === 'week' }]"
            >
              สัปดาห์นี้
            </button>
            <button 
              @click="selectedPeriod = 'month'"
              :class="['period-tab', { active: selectedPeriod === 'month' }]"
            >
              เดือนนี้
            </button>
          </div>

          <!-- Main Earnings Card -->
          <div class="earnings-card">
            <span class="earnings-label">{{ periodData.label }}</span>
            <div class="earnings-amount">฿{{ periodData.amount.toLocaleString() }}</div>
            <div class="earnings-trips">{{ periodData.trips }} เที่ยว</div>
          </div>

          <!-- Weekly Chart -->
          <div class="chart-card">
            <h3 class="chart-title">รายได้รายวัน</h3>
            <div class="chart-container">
              <div 
                v-for="stat in weeklyEarnings" 
                :key="stat.date"
                class="chart-bar-wrapper"
              >
                <div class="chart-bar-bg">
                  <div 
                    class="chart-bar"
                    :style="{ height: `${(stat.earnings / maxWeeklyEarning) * 100}%` }"
                  ></div>
                </div>
                <span class="chart-label">{{ stat.day }}</span>
              </div>
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <div class="summary-content">
                <span class="summary-value">{{ earnings.monthTrips }}</span>
                <span class="summary-label">เที่ยวเดือนนี้</span>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <div class="summary-content">
                <span class="summary-value">฿{{ Math.round(earnings.thisMonth / Math.max(earnings.monthTrips, 1)).toLocaleString() }}</span>
                <span class="summary-label">เฉลี่ย/เที่ยว</span>
              </div>
            </div>
          </div>

          <!-- Earnings Breakdown -->
          <div class="breakdown-card">
            <h3 class="breakdown-title">สรุปรายได้</h3>
            <div class="breakdown-list">
              <div class="breakdown-item">
                <span class="breakdown-label">วันนี้</span>
                <div class="breakdown-right">
                  <span class="breakdown-trips">{{ earnings.todayTrips }} เที่ยว</span>
                  <span class="breakdown-amount">฿{{ earnings.today.toLocaleString() }}</span>
                </div>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-label">สัปดาห์นี้</span>
                <div class="breakdown-right">
                  <span class="breakdown-trips">{{ earnings.weekTrips }} เที่ยว</span>
                  <span class="breakdown-amount">฿{{ earnings.thisWeek.toLocaleString() }}</span>
                </div>
              </div>
              <div class="breakdown-item">
                <span class="breakdown-label">เดือนนี้</span>
                <div class="breakdown-right">
                  <span class="breakdown-trips">{{ earnings.monthTrips }} เที่ยว</span>
                  <span class="breakdown-amount">฿{{ earnings.thisMonth.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </ProviderLayout>
</template>

<style scoped>
.earnings-page {
  min-height: 100vh;
}

.page-content {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #000000;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Period Tabs */
.period-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.period-tab {
  flex: 1;
  padding: 12px;
  background-color: #FFFFFF;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.period-tab.active {
  border-color: #000000;
  background-color: #000000;
  color: #FFFFFF;
}

/* Earnings Card */
.earnings-card {
  background-color: #000000;
  color: #FFFFFF;
  padding: 32px 24px;
  border-radius: 20px;
  text-align: center;
  margin-bottom: 20px;
}

.earnings-label {
  font-size: 14px;
  opacity: 0.7;
}

.earnings-amount {
  font-size: 48px;
  font-weight: 700;
  margin: 8px 0;
  letter-spacing: -1px;
}

.earnings-trips {
  font-size: 16px;
  opacity: 0.8;
}

/* Chart Card */
.chart-card {
  background-color: #FFFFFF;
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 20px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.chart-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 120px;
  gap: 8px;
}

.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.chart-bar-bg {
  width: 100%;
  height: 100px;
  background-color: #F6F6F6;
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.chart-bar {
  width: 100%;
  background-color: #000000;
  border-radius: 6px;
  min-height: 4px;
  transition: height 0.3s ease;
}

.chart-label {
  font-size: 12px;
  color: #6B6B6B;
  font-weight: 500;
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #FFFFFF;
  border-radius: 12px;
}

.summary-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F6F6F6;
  border-radius: 10px;
}

.summary-icon svg {
  width: 22px;
  height: 22px;
}

.summary-content {
  display: flex;
  flex-direction: column;
}

.summary-value {
  font-size: 18px;
  font-weight: 700;
}

.summary-label {
  font-size: 12px;
  color: #6B6B6B;
}

/* Breakdown Card */
.breakdown-card {
  background-color: #FFFFFF;
  padding: 20px;
  border-radius: 16px;
}

.breakdown-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #F0F0F0;
}

.breakdown-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.breakdown-label {
  font-size: 14px;
  color: #6B6B6B;
}

.breakdown-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.breakdown-trips {
  font-size: 13px;
  color: #6B6B6B;
}

.breakdown-amount {
  font-size: 16px;
  font-weight: 600;
}
</style>
