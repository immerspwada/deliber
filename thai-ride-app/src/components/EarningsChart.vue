<script setup lang="ts">
/**
 * Feature: F183 - Earnings Chart
 * Display earnings bar chart
 */

interface DayData {
  day: string
  amount: number
}

interface Props {
  data: DayData[]
  total: number
  period?: string
}

withDefaults(defineProps<Props>(), {
  period: 'สัปดาห์นี้'
})

const getBarHeight = (amount: number, data: DayData[]) => {
  const max = Math.max(...data.map(d => d.amount))
  if (max === 0) return 0
  return (amount / max) * 100
}
</script>

<template>
  <div class="earnings-chart">
    <div class="chart-header">
      <div class="header-info">
        <span class="period-label">{{ period }}</span>
        <span class="total-amount">฿{{ total.toLocaleString() }}</span>
      </div>
    </div>
    
    <div class="chart-container">
      <div class="chart-bars">
        <div v-for="item in data" :key="item.day" class="bar-wrapper">
          <div class="bar-container">
            <div 
              class="bar" 
              :style="{ height: `${getBarHeight(item.amount, data)}%` }"
              :class="{ empty: item.amount === 0 }"
            >
              <span v-if="item.amount > 0" class="bar-value">฿{{ item.amount }}</span>
            </div>
          </div>
          <span class="bar-label">{{ item.day }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.earnings-chart {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  padding: 16px;
}

.chart-header {
  margin-bottom: 20px;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.period-label {
  font-size: 13px;
  color: #6b6b6b;
}

.total-amount {
  font-size: 28px;
  font-weight: 700;
  color: #000;
}

.chart-container {
  padding-top: 20px;
}

.chart-bars {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 140px;
}

.bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.bar-container {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 70%;
  max-width: 32px;
  background: #000;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  position: relative;
  transition: height 0.3s ease;
}

.bar.empty {
  background: #e5e5e5;
}

.bar-value {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  color: #000;
  white-space: nowrap;
  margin-bottom: 4px;
}

.bar-label {
  font-size: 11px;
  color: #6b6b6b;
}
</style>