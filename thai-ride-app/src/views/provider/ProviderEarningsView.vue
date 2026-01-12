<script setup lang="ts">
/**
 * Provider Earnings View - หน้ารายได้
 * Clean, Minimal Design
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import EarningsChart from '../../components/provider/EarningsChart.vue'
import EarningsGoalCard from '../../components/provider/EarningsGoalCard.vue'

// State
const loading = ref(true)
const provider = ref<Record<string, unknown> | null>(null)
const selectedPeriod = ref<'today' | 'week' | 'month'>('week')

// Computed
const stats = computed(() => ({
  balance: (provider.value?.total_earnings as number) || 0,
  trips: (provider.value?.total_trips as number) || 0,
  rating: (provider.value?.rating as number) || 5.0
}))

const periodData = computed(() => {
  // Mock data - TODO: fetch from DB
  const data = {
    today: { earnings: 0, trips: 0, hours: 0 },
    week: { earnings: 0, trips: 0, hours: 0 },
    month: { earnings: stats.value.balance, trips: stats.value.trips, hours: 0 }
  }
  return data[selectedPeriod.value]
})

// Methods
async function loadData() {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('providers_v2')
      .select('total_earnings, total_trips, rating, completion_rate, acceptance_rate')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) provider.value = data
  } catch (err) {
    console.error('Load error:', err)
  } finally {
    loading.value = false
  }
}

function formatMoney(amount: number): string {
  return amount.toLocaleString('th-TH')
}

onMounted(loadData)
</script>

<template>
  <div class="earnings-page">
    <!-- Loading -->
    <div v-if="loading" class="center-state">
      <div class="loader"></div>
    </div>

    <template v-else>
      <!-- Earnings Goal -->
      <div class="goal-section">
        <EarningsGoalCard :current-earnings="periodData.earnings" />
      </div>

      <!-- Balance Card -->
      <div class="balance-card">
        <div class="balance-label">ยอดเงินคงเหลือ</div>
        <div class="balance-amount">
          <span class="currency">฿</span>
          <span class="amount">{{ formatMoney(stats.balance) }}</span>
        </div>
        <button class="withdraw-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          ถอนเงิน
        </button>
      </div>

      <!-- Period Tabs -->
      <div class="period-tabs">
        <button 
          v-for="p in ['today', 'week', 'month'] as const" 
          :key="p"
          class="period-tab"
          :class="{ active: selectedPeriod === p }"
          @click="selectedPeriod = p"
        >
          {{ p === 'today' ? 'วันนี้' : p === 'week' ? 'สัปดาห์' : 'เดือน' }}
        </button>
      </div>

      <!-- Period Stats -->
      <div class="stats-card">
        <div class="stat-row">
          <div class="stat-item">
            <span class="stat-value">฿{{ formatMoney(periodData.earnings) }}</span>
            <span class="stat-label">รายได้</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ periodData.trips }}</span>
            <span class="stat-label">เที่ยว</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ periodData.hours }}h</span>
            <span class="stat-label">ชั่วโมง</span>
          </div>
        </div>
      </div>

      <!-- Earnings Chart -->
      <div class="chart-section">
        <EarningsChart :period="selectedPeriod === 'month' ? 'month' : 'week'" />
      </div>

      <!-- Performance -->
      <div class="section">
        <h3 class="section-title">ผลงาน</h3>
        
        <div class="perf-card">
          <div class="perf-item">
            <div class="perf-info">
              <span class="perf-label">คะแนนเฉลี่ย</span>
              <span class="perf-value">{{ stats.rating.toFixed(1) }} ★</span>
            </div>
            <div class="perf-bar">
              <div class="perf-fill" :style="{ width: `${stats.rating / 5 * 100}%` }"></div>
            </div>
          </div>

          <div class="perf-item">
            <div class="perf-info">
              <span class="perf-label">อัตราการรับงาน</span>
              <span class="perf-value">{{ (provider?.acceptance_rate as number) || 100 }}%</span>
            </div>
            <div class="perf-bar">
              <div class="perf-fill" :style="{ width: `${(provider?.acceptance_rate as number) || 100}%` }"></div>
            </div>
          </div>

          <div class="perf-item">
            <div class="perf-info">
              <span class="perf-label">อัตราสำเร็จ</span>
              <span class="perf-value">{{ (provider?.completion_rate as number) || 100 }}%</span>
            </div>
            <div class="perf-bar">
              <div class="perf-fill" :style="{ width: `${(provider?.completion_rate as number) || 100}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="quick-stats">
        <div class="quick-item">
          <span class="quick-icon">📦</span>
          <span class="quick-value">{{ stats.trips }}</span>
          <span class="quick-label">งานทั้งหมด</span>
        </div>
        <div class="quick-item">
          <span class="quick-icon">⭐</span>
          <span class="quick-value">{{ stats.rating.toFixed(1) }}</span>
          <span class="quick-label">คะแนน</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.earnings-page {
  padding: 20px 16px;
  min-height: calc(100vh - 130px);
}

.goal-section {
  margin-bottom: 20px;
}

.center-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.loader {
  width: 28px;
  height: 28px;
  border: 2px solid #f3f4f6;
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Balance Card */
.balance-card {
  background: #000;
  border-radius: 20px;
  padding: 28px 24px;
  color: #fff;
  margin-bottom: 20px;
}

.balance-label {
  font-size: 14px;
  color: rgba(255,255,255,0.7);
  margin-bottom: 8px;
}

.balance-amount {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 24px;
}

.currency {
  font-size: 24px;
  font-weight: 500;
}

.amount {
  font-size: 42px;
  font-weight: 700;
  letter-spacing: -1px;
}

.withdraw-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #fff;
  border: none;
  border-radius: 12px;
  color: #000;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.withdraw-btn:active {
  transform: scale(0.98);
  background: #f3f4f6;
}

.withdraw-btn svg {
  width: 18px;
  height: 18px;
}

/* Period Tabs */
.period-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.period-tab {
  flex: 1;
  padding: 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.period-tab.active {
  background: #000;
  border-color: #000;
  color: #fff;
}

/* Chart Section */
.chart-section {
  margin-bottom: 24px;
}

/* Stats Card */
.stats-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #f0f0f0;
  margin-bottom: 24px;
}

.stat-row {
  display: flex;
  align-items: center;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #111;
}

.stat-label {
  font-size: 12px;
  color: #9ca3af;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: #f0f0f0;
}

/* Section */
.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0 0 12px 0;
}

/* Performance Card */
.perf-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #f0f0f0;
}

.perf-item {
  margin-bottom: 16px;
}

.perf-item:last-child {
  margin-bottom: 0;
}

.perf-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.perf-label {
  font-size: 14px;
  color: #6b7280;
}

.perf-value {
  font-size: 14px;
  font-weight: 600;
  color: #111;
}

.perf-bar {
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
}

.perf-fill {
  height: 100%;
  background: #000;
  border-radius: 3px;
  transition: width 0.3s;
}

/* Quick Stats */
.quick-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
}

.quick-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.quick-value {
  font-size: 24px;
  font-weight: 700;
  color: #111;
}

.quick-label {
  font-size: 12px;
  color: #9ca3af;
}
</style>
