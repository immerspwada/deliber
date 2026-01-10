<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Props {
  dailyEarnings: number[]
  labels: string[]
  currentEarnings: number
}

const props = withDefaults(defineProps<Props>(), {
  dailyEarnings: () => [],
  labels: () => [],
  currentEarnings: 0
})

const chartContainer = ref<HTMLElement>()
const maxEarnings = computed(() => Math.max(...props.dailyEarnings, 1))
const avgEarnings = computed(() => {
  const sum = props.dailyEarnings.reduce((a, b) => a + b, 0)
  return sum / props.dailyEarnings.length || 0
})

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount)
}

const getBarHeight = (earnings: number): string => {
  if (maxEarnings === 0) return '0%'
  return `${(earnings / maxEarnings) * 100}%`
}

const getBarColor = (earnings: number, index: number): string => {
  const isToday = index === props.dailyEarnings.length - 1
  if (isToday) return 'bg-gradient-to-t from-blue-600 to-blue-400'
  if (earnings > avgEarnings.value) return 'bg-gradient-to-t from-green-600 to-green-400'
  if (earnings === 0) return 'bg-gray-200'
  return 'bg-gradient-to-t from-gray-400 to-gray-300'
}

onMounted(() => {
  // Add animation delay for each bar
  if (chartContainer.value) {
    const bars = chartContainer.value.querySelectorAll('.chart-bar')
    bars.forEach((bar, index) => {
      setTimeout(() => {
        bar.classList.add('animate-grow')
      }, index * 100)
    })
  }
})
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-gray-900 flex items-center">
        <div class="w-2 h-5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full mr-3"></div>
        รายได้ 7 วันที่ผ่านมา
      </h3>
      <div class="text-right">
        <p class="text-xs text-gray-500">เฉลี่ย/วัน</p>
        <p class="text-sm font-semibold text-gray-900">{{ formatCurrency(avgEarnings) }}</p>
      </div>
    </div>

    <!-- Chart -->
    <div ref="chartContainer" class="relative h-32 mb-4">
      <div class="flex items-end justify-between h-full space-x-1">
        <div
          v-for="(earnings, index) in dailyEarnings"
          :key="index"
          class="flex-1 flex flex-col items-center"
        >
          <!-- Bar -->
          <div class="w-full relative mb-2">
            <div
              class="chart-bar w-full rounded-t-lg transition-all duration-500 ease-out transform scale-y-0 origin-bottom"
              :class="getBarColor(earnings, index)"
              :style="{ height: getBarHeight(earnings) }"
            >
              <!-- Earnings tooltip on hover -->
              <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {{ formatCurrency(earnings) }}
              </div>
            </div>
          </div>
          
          <!-- Label -->
          <p class="text-xs text-gray-500 text-center">{{ labels[index] }}</p>
        </div>
      </div>
      
      <!-- Y-axis labels -->
      <div class="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 -ml-12">
        <span>{{ formatCurrency(maxEarnings) }}</span>
        <span>{{ formatCurrency(maxEarnings / 2) }}</span>
        <span>0</span>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center justify-center space-x-4 text-xs">
      <div class="flex items-center">
        <div class="w-3 h-3 bg-gradient-to-t from-blue-600 to-blue-400 rounded mr-2"></div>
        <span class="text-gray-600">วันนี้</span>
      </div>
      <div class="flex items-center">
        <div class="w-3 h-3 bg-gradient-to-t from-green-600 to-green-400 rounded mr-2"></div>
        <span class="text-gray-600">สูงกว่าเฉลี่ย</span>
      </div>
      <div class="flex items-center">
        <div class="w-3 h-3 bg-gradient-to-t from-gray-400 to-gray-300 rounded mr-2"></div>
        <span class="text-gray-600">ต่ำกว่าเฉลี่ย</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-bar:hover {
  transform: scaleY(1.05);
}

.animate-grow {
  transform: scaleY(1) !important;
}

.group:hover .chart-bar {
  opacity: 0.8;
}

.group:hover .chart-bar:hover {
  opacity: 1;
}
</style>