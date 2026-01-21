<script setup lang="ts">
/**
 * Earnings Chart Component
 * Simple bar chart for daily earnings
 */
import { computed } from 'vue'

interface DayData {
  day: string
  earnings: number
  trips: number
}

const props = withDefaults(defineProps<{
  data?: DayData[]
  period?: 'week' | 'month'
}>(), {
  data: () => [],
  period: 'week'
})

// Generate mock data if none provided
const chartData = computed(() => {
  if (props.data.length > 0) return props.data

  const days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
  return days.map((day, i) => ({
    day,
    earnings: Math.floor(Math.random() * 1500) + 200,
    trips: Math.floor(Math.random() * 8) + 1
  }))
})

const maxEarnings = computed(() => {
  const max = Math.max(...chartData.value.map(d => d.earnings))
  return Math.ceil(max / 500) * 500 || 1000
})

const totalEarnings = computed(() => 
  chartData.value.reduce((sum, d) => sum + d.earnings, 0)
)

const totalTrips = computed(() => 
  chartData.value.reduce((sum, d) => sum + d.trips, 0)
)

function getBarHeight(earnings: number): string {
  const percentage = (earnings / maxEarnings.value) * 100
  return `${Math.max(percentage, 5)}%`
}

function formatMoney(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`
  }
  return amount.toString()
}
</script>

<template>
  <div class="earnings-chart">
    <!-- Header -->
    <div class="chart-header">
      <div class="chart-title">
        <h3>รายได้รายวัน</h3>
        <span class="chart-period">{{ period === 'week' ? '7 วันล่าสุด' : '30 วันล่าสุด' }}</span>
      </div>
      <div class="chart-summary">
        <div class="summary-item">
          <span class="summary-value">฿{{ totalEarnings.toLocaleString() }}</span>
          <span class="summary-label">รวม</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item">
          <span class="summary-value">{{ totalTrips }}</span>
          <span class="summary-label">เที่ยว</span>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="chart-container">
      <!-- Y-axis labels -->
      <div class="y-axis">
        <span>฿{{ formatMoney(maxEarnings) }}</span>
        <span>฿{{ formatMoney(maxEarnings / 2) }}</span>
        <span>฿0</span>
      </div>

      <!-- Bars -->
      <div class="bars-container">
        <div 
          v-for="(item, index) in chartData" 
          :key="index"
          class="bar-wrapper"
        >
          <div class="bar-tooltip">
            <span class="tooltip-amount">฿{{ item.earnings.toLocaleString() }}</span>
            <span class="tooltip-trips">{{ item.trips }} เที่ยว</span>
          </div>
          <div 
            class="bar" 
            :style="{ height: getBarHeight(item.earnings) }"
            :class="{ highlight: index === chartData.length - 1 }"
          ></div>
          <span class="bar-label">{{ item.day }}</span>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="chart-legend">
      <div class="legend-item">
        <span class="legend-dot"></span>
        <span>รายได้</span>
      </div>
      <div class="legend-item highlight">
        <span class="legend-dot"></span>
        <span>วันนี้</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.earnings-chart {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #f0f0f0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.chart-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111;
  margin: 0 0 4px 0;
}

.chart-period {
  font-size: 12px;
  color: #9ca3af;
}

.chart-summary {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-item {
  text-align: right;
}

.summary-value {
  display: block;
  font-size: 16px;
  font-weight: 700;
  color: #111;
}

.summary-label {
  font-size: 11px;
  color: #9ca3af;
}

.summary-divider {
  width: 1px;
  height: 28px;
  background: #f0f0f0;
}

.chart-container {
  display: flex;
  gap: 12px;
  height: 160px;
  margin-bottom: 16px;
}

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: #9ca3af;
  padding: 4px 0 20px 0;
  min-width: 36px;
}

.bars-container {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: relative;
}

.bar {
  width: 100%;
  max-width: 32px;
  background: #e5e7eb;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s ease;
  position: absolute;
  bottom: 0;
}

.bar.highlight {
  background: #000;
}

.bar-wrapper:hover .bar {
  background: #6b7280;
}

.bar-wrapper:hover .bar.highlight {
  background: #374151;
}

.bar-label {
  position: absolute;
  bottom: -20px;
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.bar-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  background: #111;
  color: #fff;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.bar-wrapper:hover .bar-tooltip {
  opacity: 1;
  visibility: visible;
}

.tooltip-amount {
  font-weight: 600;
}

.tooltip-trips {
  font-size: 10px;
  color: #9ca3af;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.legend-dot {
  width: 10px;
  height: 10px;
  background: #e5e7eb;
  border-radius: 2px;
}

.legend-item.highlight .legend-dot {
  background: #000;
}
</style>
