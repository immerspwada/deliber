<!--
  Admin Stat Card Component - MUNEEF Style
  
  Specialized card for displaying statistics and metrics
  Features: trend indicators, animated counters, comparison data
-->

<template>
  <AdminCard 
    :class="['admin-stat-card', `variant-${variant}`]"
    :elevated="elevated"
    :loading="loading"
    :clickable="clickable"
    @click="$emit('click')"
  >
    <div class="stat-content">
      <!-- Icon -->
      <div v-if="icon" class="stat-icon" :class="iconColor">
        <component :is="icon" class="icon" />
      </div>

      <!-- Main Stats -->
      <div class="stat-main">
        <div class="stat-value">
          <AnimatedCounter 
            :value="value" 
            :format="format"
            :duration="animationDuration"
          />
          <span v-if="unit" class="stat-unit">{{ unit }}</span>
        </div>
        <div class="stat-label">{{ label }}</div>
      </div>

      <!-- Trend Indicator -->
      <div v-if="trend !== undefined" class="stat-trend" :class="trendClass">
        <svg class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path v-if="trend > 0" d="M7 14l5-5 5 5"/>
          <path v-else-if="trend < 0" d="M17 10l-5 5-5-5"/>
          <circle v-else cx="12" cy="12" r="1"/>
        </svg>
        <span class="trend-value">
          {{ Math.abs(trend) }}{{ trendUnit }}
        </span>
      </div>
    </div>

    <!-- Comparison Data -->
    <div v-if="comparison" class="stat-comparison">
      <div class="comparison-item">
        <span class="comparison-label">{{ comparison.label }}</span>
        <span class="comparison-value">{{ formatValue(comparison.value, comparison.format) }}</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div v-if="progress !== undefined" class="stat-progress">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${Math.min(progress, 100)}%` }"
        ></div>
      </div>
      <div class="progress-label">
        {{ progress }}% of {{ progressTarget }}
      </div>
    </div>

    <!-- Mini Chart -->
    <div v-if="chartData?.length" class="stat-chart">
      <svg class="mini-chart" viewBox="0 0 100 30">
        <polyline
          :points="chartPoints"
          fill="none"
          :stroke="chartColor"
          stroke-width="2"
        />
      </svg>
    </div>
  </AdminCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdminCard from './AdminCard.vue'
import AnimatedCounter from '../AnimatedCounter.vue'

interface Comparison {
  label: string
  value: number
  format?: string
}

interface Props {
  label: string
  value: number
  unit?: string
  format?: string
  icon?: any
  iconColor?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  trend?: number
  trendUnit?: string
  comparison?: Comparison
  progress?: number
  progressTarget?: string
  chartData?: number[]
  chartColor?: string
  loading?: boolean
  clickable?: boolean
  elevated?: boolean
  animationDuration?: number
}

const props = withDefaults(defineProps<Props>(), {
  format: 'number',
  iconColor: 'primary',
  variant: 'default',
  trendUnit: '%',
  chartColor: '#00A86B',
  elevated: true,
  animationDuration: 1000
})

const emit = defineEmits<{
  click: []
}>()

const trendClass = computed(() => {
  if (props.trend === undefined) return ''
  if (props.trend > 0) return 'positive'
  if (props.trend < 0) return 'negative'
  return 'neutral'
})

const chartPoints = computed(() => {
  if (!props.chartData?.length) return ''
  
  const data = props.chartData
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  return data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 30 - ((value - min) / range) * 30
      return `${x},${y}`
    })
    .join(' ')
})

const formatValue = (value: number, format?: string) => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
      }).format(value)
    case 'percent':
      return `${value}%`
    case 'decimal':
      return value.toFixed(2)
    default:
      return new Intl.NumberFormat('th-TH').format(value)
  }
}
</script>

<style scoped>
.admin-stat-card {
  position: relative;
}

.variant-success {
  border-left: 4px solid #00A86B;
}

.variant-warning {
  border-left: 4px solid #F57C00;
}

.variant-error {
  border-left: 4px solid #E53935;
}

.variant-info {
  border-left: 4px solid #1976D2;
}

.stat-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.primary {
  background: #E8F5EF;
  color: #00A86B;
}

.stat-icon.success {
  background: #E8F5EF;
  color: #00A86B;
}

.stat-icon.warning {
  background: #FFF3E0;
  color: #F57C00;
}

.stat-icon.error {
  background: #FFEBEE;
  color: #E53935;
}

.stat-icon.info {
  background: #E3F2FD;
  color: #1976D2;
}

.icon {
  width: 24px;
  height: 24px;
}

.stat-main {
  flex: 1;
  min-width: 0;
}

.stat-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-unit {
  font-size: 16px;
  font-weight: 500;
  color: #666666;
}

.stat-label {
  font-size: 14px;
  font-weight: 500;
  color: #666666;
  line-height: 1.3;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.stat-trend.positive {
  background: #E8F5EF;
  color: #00A86B;
}

.stat-trend.negative {
  background: #FFEBEE;
  color: #E53935;
}

.stat-trend.neutral {
  background: #F5F5F5;
  color: #666666;
}

.trend-icon {
  width: 12px;
  height: 12px;
}

.stat-comparison {
  padding: 12px 0;
  border-top: 1px solid #F0F0F0;
  margin-bottom: 16px;
}

.comparison-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comparison-label {
  font-size: 12px;
  color: #999999;
}

.comparison-value {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.stat-progress {
  margin-bottom: 16px;
}

.progress-bar {
  height: 6px;
  background: #F0F0F0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #00A86B;
  border-radius: 3px;
  transition: width 0.8s ease;
}

.progress-label {
  font-size: 12px;
  color: #666666;
  text-align: center;
}

.stat-chart {
  height: 40px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #F0F0F0;
}

.mini-chart {
  width: 100%;
  height: 30px;
}

/* Responsive */
@media (max-width: 768px) {
  .stat-content {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .stat-icon {
    align-self: center;
  }
  
  .stat-trend {
    align-self: center;
  }
}
</style>