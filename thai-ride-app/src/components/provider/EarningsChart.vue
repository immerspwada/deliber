<script setup lang="ts">
/**
 * EarningsChart - Provider Earnings Visualization
 * Feature: F27 - Provider Earnings Chart
 * MUNEEF Style: Clean chart with green accent
 */
import { ref, computed, onMounted, watch } from 'vue'

interface DailyEarning {
  date: string
  dayName: string
  earnings: number
  trips: number
}

const props = defineProps<{
  weeklyData?: DailyEarning[]
  todayEarnings?: number
  weekTotal?: number
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

// Generate demo data if not provided
const chartData = computed<DailyEarning[]>(() => {
  if (props.weeklyData?.length) return props.weeklyData
  
  const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  const today = new Date()
  const data: DailyEarning[] = []
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dayIndex = date.getDay()
    
    data.push({
      date: date.toISOString().split('T')[0]!,
      dayName: days[dayIndex]!,
      earnings: i === 0 ? (props.todayEarnings || 0) : Math.round(800 + Math.random() * 1500),
      trips: i === 0 ? Math.round((props.todayEarnings || 0) / 150) : Math.round(5 + Math.random() * 10)
    })
  }
  
  return data
})

const maxEarning = computed(() => {
  const max = Math.max(...chartData.value.map(d => d.earnings))
  return max > 0 ? max : 1000
})

const weekTotalComputed = computed(() => {
  if (props.weekTotal !== undefined) return props.weekTotal
  return chartData.value.reduce((sum, d) => sum + d.earnings, 0)
})

const avgDaily = computed(() => {
  const nonZeroDays = chartData.value.filter(d => d.earnings > 0).length
  return nonZeroDays > 0 ? Math.round(weekTotalComputed.value / nonZeroDays) : 0
})

const totalTrips = computed(() => {
  return chartData.value.reduce((sum, d) => sum + d.trips, 0)
})

// Animation
const animatedHeights = ref<number[]>([])
const isAnimating = ref(false)

const animateChart = () => {
  isAnimating.value = true
  animatedHeights.value = chartData.value.map(() => 0)
  
  setTimeout(() => {
    animatedHeights.value = chartData.value.map(d => 
      Math.max((d.earnings / maxEarning.value) * 100, 4)
    )
    setTimeout(() => {
      isAnimating.value = false
    }, 500)
  }, 100)
}

onMounted(() => {
  animateChart()
})

watch(() => props.weeklyData, () => {
  animateChart()
})

// Selected bar for tooltip
const selectedIndex = ref<number | null>(null)
const showTooltip = (index: number) => {
  selectedIndex.value = index
}
const hideTooltip = () => {
  selectedIndex.value = null
}
</script>

<template>
  <div class="earnings-chart-container">
    <!-- Header -->
    <div class="chart-header">
      <div class="header-left">
        <h3 class="chart-title">รายได้ 7 วัน</h3>
        <span class="week-total">฿{{ weekTotalComputed.toLocaleString() }}</span>
      </div>
      <button class="refresh-btn" @click="emit('refresh')" :disabled="isLoading">
        <svg :class="{ spinning: isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
      </button>
    </div>

    <!-- Stats Row -->
    <div class="stats-mini">
      <div class="stat-mini">
        <span class="stat-value-mini">฿{{ avgDaily.toLocaleString() }}</span>
        <span class="stat-label-mini">เฉลี่ย/วัน</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-mini">
        <span class="stat-value-mini">{{ totalTrips }}</span>
        <span class="stat-label-mini">เที่ยวทั้งหมด</span>
      </div>
    </div>

    <!-- Chart -->
    <div class="chart-wrapper">
      <!-- Y-axis labels -->
      <div class="y-axis">
        <span>฿{{ maxEarning.toLocaleString() }}</span>
        <span>฿{{ Math.round(maxEarning / 2).toLocaleString() }}</span>
        <span>฿0</span>
      </div>

      <!-- Bars -->
      <div class="bars-container">
        <div class="grid-lines">
          <div class="grid-line"></div>
          <div class="grid-line"></div>
          <div class="grid-line"></div>
        </div>
        
        <div 
          v-for="(day, index) in chartData" 
          :key="day.date"
          class="bar-wrapper"
          @mouseenter="showTooltip(index)"
          @mouseleave="hideTooltip"
          @touchstart="showTooltip(index)"
          @touchend="hideTooltip"
        >
          <!-- Tooltip -->
          <div v-if="selectedIndex === index" class="bar-tooltip">
            <span class="tooltip-amount">฿{{ day.earnings.toLocaleString() }}</span>
            <span class="tooltip-trips">{{ day.trips }} เที่ยว</span>
          </div>
          
          <!-- Bar -->
          <div 
            class="bar"
            :class="{ today: index === chartData.length - 1, selected: selectedIndex === index }"
            :style="{ height: `${animatedHeights[index] || 0}%` }"
          >
            <div class="bar-fill"></div>
          </div>
          
          <!-- Day label -->
          <span class="day-label" :class="{ today: index === chartData.length - 1 }">
            {{ day.dayName }}
          </span>
        </div>
      </div>
    </div>

    <!-- Today highlight -->
    <div class="today-highlight">
      <div class="today-dot"></div>
      <span>วันนี้</span>
    </div>
  </div>
</template>

<style scoped>
.earnings-chart-container {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chart-title {
  font-size: 14px;
  font-weight: 500;
  color: #6B6B6B;
  margin: 0;
}

.week-total {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
}

.refresh-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  color: #6B6B6B;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #E8E8E8;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-btn svg.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Stats Mini */
.stats-mini {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #F0F0F0;
  margin-bottom: 16px;
}

.stat-mini {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value-mini {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
}

.stat-label-mini {
  font-size: 12px;
  color: #999999;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: #E8E8E8;
}

/* Chart */
.chart-wrapper {
  display: flex;
  gap: 8px;
  height: 140px;
  margin-bottom: 8px;
}

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0 4px 20px 0;
  min-width: 50px;
}

.y-axis span {
  font-size: 10px;
  color: #999999;
  text-align: right;
}

.bars-container {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  position: relative;
  padding-bottom: 20px;
}

.grid-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}

.grid-line {
  height: 1px;
  background: #F0F0F0;
}

.bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: relative;
  cursor: pointer;
}

.bar {
  width: 100%;
  max-width: 32px;
  border-radius: 6px 6px 0 0;
  background: #E8F5EF;
  position: relative;
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: auto;
}

.bar.today {
  background: #00A86B;
}

.bar.selected {
  transform: scaleX(1.1);
}

.bar-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: linear-gradient(to top, rgba(0, 168, 107, 0.3), transparent);
  border-radius: 6px 6px 0 0;
}

.bar.today .bar-fill {
  background: linear-gradient(to top, rgba(255, 255, 255, 0.3), transparent);
}

.day-label {
  position: absolute;
  bottom: 0;
  font-size: 11px;
  color: #999999;
  font-weight: 500;
}

.day-label.today {
  color: #00A86B;
  font-weight: 600;
}

/* Tooltip */
.bar-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1A1A1A;
  color: white;
  padding: 6px 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
  z-index: 10;
  animation: fadeIn 0.2s ease;
}

.bar-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #1A1A1A;
}

.tooltip-amount {
  font-size: 14px;
  font-weight: 600;
}

.tooltip-trips {
  font-size: 11px;
  color: #AAAAAA;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(4px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* Today highlight */
.today-highlight {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.today-dot {
  width: 8px;
  height: 8px;
  background: #00A86B;
  border-radius: 50%;
}

.today-highlight span {
  font-size: 11px;
  color: #6B6B6B;
}
</style>
