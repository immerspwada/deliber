<script setup lang="ts">
/**
 * Feature: F204 - Report Chart
 * Admin chart component for displaying report data
 */
import { computed } from 'vue'

interface DataPoint {
  label: string
  value: number
  color?: string
}

const props = withDefaults(defineProps<{
  title: string
  data: DataPoint[]
  type?: 'bar' | 'line' | 'pie'
  height?: number
  showLegend?: boolean
}>(), {
  type: 'bar',
  height: 200,
  showLegend: true
})

const maxValue = computed(() => Math.max(...props.data.map(d => d.value), 1))
const total = computed(() => props.data.reduce((sum, d) => sum + d.value, 0))

const getBarHeight = (value: number) => `${(value / maxValue.value) * 100}%`
const getPieAngle = (value: number, index: number) => {
  const prevSum = props.data.slice(0, index).reduce((sum, d) => sum + d.value, 0)
  const startAngle = (prevSum / total.value) * 360
  const angle = (value / total.value) * 360
  return { start: startAngle, angle }
}

const defaultColors = ['#000', '#333', '#666', '#999', '#ccc', '#e5e5e5']
const getColor = (index: number, color?: string) => color || defaultColors[index % defaultColors.length]
</script>

<template>
  <div class="report-chart">
    <h3 class="chart-title">{{ title }}</h3>
    
    <!-- Bar Chart -->
    <div v-if="type === 'bar'" class="bar-chart" :style="{ height: `${height}px` }">
      <div class="bar-container">
        <div v-for="(item, i) in data" :key="i" class="bar-item">
          <div class="bar-wrapper">
            <div class="bar" :style="{ height: getBarHeight(item.value), background: getColor(i, item.color) }">
              <span class="bar-value">{{ item.value.toLocaleString() }}</span>
            </div>
          </div>
          <span class="bar-label">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- Pie Chart -->
    <div v-else-if="type === 'pie'" class="pie-chart">
      <div class="pie-visual">
        <svg viewBox="0 0 100 100" :style="{ width: `${height}px`, height: `${height}px` }">
          <circle
            v-for="(item, i) in data" :key="i" cx="50" cy="50" r="40" fill="transparent"
            :stroke="getColor(i, item.color)" stroke-width="20"
            :stroke-dasharray="`${(item.value / total) * 251.2} 251.2`"
            :stroke-dashoffset="`${-getPieAngle(item.value, i).start / 360 * 251.2}`"
          />
        </svg>
        <div class="pie-center">
          <span class="pie-total">{{ total.toLocaleString() }}</span>
          <span class="pie-label">รวม</span>
        </div>
      </div>
    </div>

    <!-- Line Chart (simplified) -->
    <div v-else-if="type === 'line'" class="line-chart" :style="{ height: `${height}px` }">
      <svg class="line-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none" stroke="#000" stroke-width="2"
          :points="data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.value / maxValue) * 80}`).join(' ')"
        />
        <circle
          v-for="(item, i) in data" :key="i" :cx="(i / (data.length - 1)) * 100"
          :cy="100 - (item.value / maxValue) * 80" r="3" fill="#000"
        />
      </svg>
      <div class="line-labels">
        <span v-for="(item, i) in data" :key="i" class="line-label">{{ item.label }}</span>
      </div>
    </div>

    <!-- Legend -->
    <div v-if="showLegend && type !== 'line'" class="chart-legend">
      <div v-for="(item, i) in data" :key="i" class="legend-item">
        <span class="legend-dot" :style="{ background: getColor(i, item.color) }" />
        <span class="legend-label">{{ item.label }}</span>
        <span class="legend-value">{{ item.value.toLocaleString() }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-chart { background: #fff; border-radius: 16px; padding: 20px; }
.chart-title { font-size: 16px; font-weight: 700; color: #000; margin: 0 0 20px; }
.bar-chart { display: flex; align-items: flex-end; }
.bar-container { display: flex; align-items: flex-end; gap: 12px; width: 100%; height: 100%; padding-bottom: 24px; }
.bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.bar-wrapper { flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
.bar { width: 100%; max-width: 48px; border-radius: 6px 6px 0 0; position: relative; min-height: 4px; transition: height 0.3s; }
.bar-value { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 11px; font-weight: 600; color: #000; white-space: nowrap; }
.bar-label { font-size: 11px; color: #6b6b6b; margin-top: 8px; text-align: center; }
.pie-chart { display: flex; justify-content: center; }
.pie-visual { position: relative; }
.pie-visual svg { transform: rotate(-90deg); }
.pie-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
.pie-total { display: block; font-size: 20px; font-weight: 700; color: #000; }
.pie-label { font-size: 12px; color: #6b6b6b; }
.line-chart { position: relative; }
.line-svg { width: 100%; height: calc(100% - 24px); }
.line-labels { display: flex; justify-content: space-between; padding-top: 8px; }
.line-label { font-size: 11px; color: #6b6b6b; }
.chart-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e5e5; }
.legend-item { display: flex; align-items: center; gap: 8px; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
.legend-label { font-size: 12px; color: #6b6b6b; }
.legend-value { font-size: 12px; font-weight: 600; color: #000; }
</style>
