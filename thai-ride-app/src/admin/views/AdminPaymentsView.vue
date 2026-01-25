<script setup lang="ts">
/**
 * AdminPaymentsView - Admin Panel for Payment Analytics
 * 
 * Role: Admin only
 * Features: Payment statistics, charts, breakdown by payment method
 * 
 * Uses useAdminPayments composable with get_admin_payment_stats RPC
 * Requirements: 10.3
 */
import { ref, computed, onMounted } from 'vue'
import { useAdminPayments } from '../composables/useAdminPayments'

const payments = useAdminPayments()

// State
const dateFrom = ref<string>('')
const dateTo = ref<string>('')

// Initialize date range to last 30 days
function initializeDateRange() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  dateTo.value = today.toISOString().split('T')[0]
  dateFrom.value = thirtyDaysAgo.toISOString().split('T')[0]
}

// Computed
const stats = computed(() => {
  if (!payments.paymentStats.value) return null
  
  return {
    totalTransactions: payments.totalTransactions.value,
    totalAmount: payments.totalAmount.value,
    averageTransaction: payments.averageTransaction.value,
    mostUsedMethod: payments.mostUsedPaymentMethod.value,
    avgDailyTransactions: payments.getAverageDailyTransactions(),
    avgDailyAmount: payments.getAverageDailyAmount(),
    highestTransactionDay: payments.getHighestTransactionDay(),
    highestAmountDay: payments.getHighestAmountDay()
  }
})

// Chart data
const paymentMethodChartData = computed(() => payments.getPaymentMethodChartData())
const dailyTrendsChartData = computed(() => payments.getDailyTrendsChartData())
const serviceBreakdownChartData = computed(() => payments.getServiceBreakdownChartData())

// Load data
async function loadData() {
  if (!dateFrom.value || !dateTo.value) return
  
  await payments.fetchPaymentStats({
    dateFrom: new Date(dateFrom.value),
    dateTo: new Date(dateTo.value)
  })
}

// Handle filter change
function onFilterChange() {
  loadData()
}

// Calculate pie chart segments
function calculatePieSegments(data: Array<{ name: string; amount: number; color?: string }>) {
  const total = data.reduce((sum, item) => sum + item.amount, 0)
  if (total === 0) return []
  
  let currentAngle = 0
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#6b7280']
  
  return data.map((item, index) => {
    const percentage = (item.amount / total) * 100
    const angle = (item.amount / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    
    currentAngle = endAngle
    
    // Calculate SVG path for pie slice
    const startRad = (startAngle - 90) * Math.PI / 180
    const endRad = (endAngle - 90) * Math.PI / 180
    
    const x1 = 50 + 40 * Math.cos(startRad)
    const y1 = 50 + 40 * Math.sin(startRad)
    const x2 = 50 + 40 * Math.cos(endRad)
    const y2 = 50 + 40 * Math.sin(endRad)
    
    const largeArc = angle > 180 ? 1 : 0
    
    const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`
    
    return {
      ...item,
      percentage,
      path,
      color: item.color || colors[index % colors.length]
    }
  })
}

onMounted(() => {
  initializeDateRange()
  loadData()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">รายงานการชำระเงิน</h1>
        <p class="text-sm text-gray-600 mt-1">วิเคราะห์ธุรกรรมและช่องทางการชำระเงิน</p>
      </div>
      <button 
        :disabled="payments.loading.value" 
        type="button"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        aria-label="รีเฟรชข้อมูล"
        @click="loadData"
      >
        {{ payments.loading.value ? 'กำลังโหลด...' : 'รีเฟรช' }}
      </button>
    </div>

    <!-- Filters -->
    <div class="mb-6 bg-white p-4 rounded-xl shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label for="date-from" class="block text-sm font-medium text-gray-700 mb-1">
            วันที่เริ่มต้น
          </label>
          <input
            id="date-from"
            v-model="dateFrom"
            type="date"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @change="onFilterChange"
          />
        </div>
        <div>
          <label for="date-to" class="block text-sm font-medium text-gray-700 mb-1">
            วันที่สิ้นสุด
          </label>
          <input
            id="date-to"
            v-model="dateTo"
            type="date"
            class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @change="onFilterChange"
          />
        </div>
        <div class="flex items-end">
          <button
            type="button"
            class="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            @click="initializeDateRange(); loadData()"
          >
            30 วันล่าสุด
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="payments.loading.value && !stats" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">กำลังโหลดข้อมูล...</p>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="stats" class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <div class="text-sm text-gray-500 mb-1">ธุรกรรมทั้งหมด</div>
          <div class="text-3xl font-bold text-blue-600">{{ payments.formatNumber(stats.totalTransactions) }}</div>
          <div class="text-xs text-gray-400 mt-2">
            เฉลี่ย {{ payments.formatNumber(Math.round(stats.avgDailyTransactions)) }}/วัน
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <div class="text-sm text-gray-500 mb-1">ยอดรวมทั้งหมด</div>
          <div class="text-3xl font-bold text-green-600">{{ payments.formatCurrency(stats.totalAmount) }}</div>
          <div class="text-xs text-gray-400 mt-2">
            เฉลี่ย {{ payments.formatCurrency(stats.avgDailyAmount) }}/วัน
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
          <div class="text-sm text-gray-500 mb-1">ค่าเฉลี่ยต่อธุรกรรม</div>
          <div class="text-3xl font-bold text-purple-600">{{ payments.formatCurrency(stats.averageTransaction) }}</div>
          <div class="text-xs text-gray-400 mt-2">
            จากทุกช่องทางชำระเงิน
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
          <div class="text-sm text-gray-500 mb-1">ช่องทางยอดนิยม</div>
          <div class="text-2xl font-bold text-orange-600">
            {{ stats.mostUsedMethod ? payments.getPaymentMethodLabel(stats.mostUsedMethod.payment_method) : '-' }}
          </div>
          <div class="text-xs text-gray-400 mt-2">
            {{ stats.mostUsedMethod ? payments.formatPercentage(stats.mostUsedMethod.percentage) : '-' }}
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Payment Method Breakdown Pie Chart -->
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <h3 class="text-lg font-bold text-gray-900 mb-4">สัดส่วนตามช่องทางชำระเงิน</h3>
          <div v-if="paymentMethodChartData.length > 0" class="flex flex-col items-center">
            <svg viewBox="0 0 100 100" class="w-64 h-64">
              <g v-for="(segment, index) in calculatePieSegments(paymentMethodChartData)" :key="index">
                <path
                  :d="segment.path"
                  :fill="segment.color"
                  class="transition-opacity hover:opacity-80 cursor-pointer"
                  :aria-label="`${segment.name}: ${payments.formatCurrency(segment.amount)}`"
                />
              </g>
            </svg>
            <div class="mt-4 space-y-2 w-full">
              <div v-for="item in paymentMethodChartData" :key="item.name" class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded" :style="{ backgroundColor: calculatePieSegments(paymentMethodChartData).find(s => s.name === item.name)?.color }"></div>
                  <span class="text-sm text-gray-700">{{ item.name }}</span>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium text-gray-900">{{ payments.formatCurrency(item.amount) }}</div>
                  <div class="text-xs text-gray-500">{{ payments.formatNumber(item.count) }} รายการ</div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12 text-gray-500">
            ไม่มีข้อมูล
          </div>
        </div>

        <!-- Service Type Breakdown -->
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <h3 class="text-lg font-bold text-gray-900 mb-4">แยกตามประเภทบริการ</h3>
          <div v-if="serviceBreakdownChartData.length > 0" class="space-y-4">
            <div v-for="service in serviceBreakdownChartData" :key="service.name" class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded" :style="{ backgroundColor: service.color }"></div>
                  <span class="text-sm font-medium text-gray-700">{{ service.name }}</span>
                </div>
                <span class="text-sm font-bold text-gray-900">{{ payments.formatCurrency(service.amount) }}</span>
              </div>
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>{{ payments.formatNumber(service.count) }} รายการ</span>
                <span>เฉลี่ย {{ payments.formatCurrency(service.average) }}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all"
                  :style="{ 
                    width: `${(service.amount / stats.totalAmount) * 100}%`,
                    backgroundColor: service.color 
                  }"
                ></div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12 text-gray-500">
            ไม่มีข้อมูล
          </div>
        </div>
      </div>

      <!-- Daily Trends Chart -->
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <h3 class="text-lg font-bold text-gray-900 mb-4">แนวโน้มธุรกรรมรายวัน</h3>
        <div v-if="dailyTrendsChartData.length > 0" class="space-y-4">
          <!-- Dual-axis Chart -->
          <div class="relative h-64">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
              <!-- Grid lines -->
              <line
                v-for="i in 5" :key="`grid-${i}`" 
                x1="0" :y1="i * 20" x2="100" :y2="i * 20" 
                stroke="#e5e7eb" stroke-width="0.2"
              />
              
              <!-- Amount line (primary axis) -->
              <polyline
                :points="dailyTrendsChartData.map((d, i) => {
                  const x = (i / (dailyTrendsChartData.length - 1)) * 100
                  const maxAmount = Math.max(...dailyTrendsChartData.map(d => d.amount))
                  const y = 100 - (d.amount / maxAmount) * 80
                  return `${x},${y}`
                }).join(' ')"
                fill="none"
                stroke="#10b981"
                stroke-width="2"
                class="transition-all"
              />
              
              <!-- Transaction count line (secondary axis) -->
              <polyline
                :points="dailyTrendsChartData.map((d, i) => {
                  const x = (i / (dailyTrendsChartData.length - 1)) * 100
                  const maxTransactions = Math.max(...dailyTrendsChartData.map(d => d.transactions))
                  const y = 100 - (d.transactions / maxTransactions) * 80
                  return `${x},${y}`
                }).join(' ')"
                fill="none"
                stroke="#3b82f6"
                stroke-width="2"
                stroke-dasharray="4,4"
                class="transition-all"
              />
              
              <!-- Data points for amount -->
              <circle
                v-for="(d, i) in dailyTrendsChartData"
                :key="`amount-${i}`"
                :cx="(i / (dailyTrendsChartData.length - 1)) * 100"
                :cy="100 - (d.amount / Math.max(...dailyTrendsChartData.map(d => d.amount))) * 80"
                r="2"
                fill="#10b981"
                class="cursor-pointer hover:r-3 transition-all"
              >
                <title>{{ d.date }}: {{ payments.formatCurrency(d.amount) }}</title>
              </circle>
              
              <!-- Data points for transactions -->
              <circle
                v-for="(d, i) in dailyTrendsChartData"
                :key="`trans-${i}`"
                :cx="(i / (dailyTrendsChartData.length - 1)) * 100"
                :cy="100 - (d.transactions / Math.max(...dailyTrendsChartData.map(d => d.transactions))) * 80"
                r="2"
                fill="#3b82f6"
                class="cursor-pointer hover:r-3 transition-all"
              >
                <title>{{ d.date }}: {{ payments.formatNumber(d.transactions) }} รายการ</title>
              </circle>
            </svg>
          </div>
          
          <!-- Legend -->
          <div class="flex items-center justify-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-4 h-0.5 bg-green-500"></div>
              <span class="text-gray-600">ยอดเงิน</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-0.5 bg-blue-500 border-dashed border-t-2 border-blue-500"></div>
              <span class="text-gray-600">จำนวนธุรกรรม</span>
            </div>
          </div>
          
          <!-- Date labels -->
          <div class="flex justify-between text-xs text-gray-500">
            <span>{{ dailyTrendsChartData[0]?.date }}</span>
            <span v-if="dailyTrendsChartData.length > 1">
              {{ dailyTrendsChartData[Math.floor(dailyTrendsChartData.length / 2)]?.date }}
            </span>
            <span>{{ dailyTrendsChartData[dailyTrendsChartData.length - 1]?.date }}</span>
          </div>
        </div>
        <div v-else class="text-center py-12 text-gray-500">
          ไม่มีข้อมูล
        </div>
      </div>

      <!-- Daily Breakdown Table -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="p-6 border-b">
          <h3 class="text-lg font-bold text-gray-900">รายละเอียดธุรกรรมรายวัน</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">จำนวนธุรกรรม</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ยอดรวม</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ค่าเฉลี่ย</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-if="dailyTrendsChartData.length === 0">
                <td colspan="4" class="px-6 py-12 text-center text-gray-500">ไม่มีข้อมูล</td>
              </tr>
              <tr 
                v-for="day in dailyTrendsChartData"
                v-else 
                :key="day.date"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4 text-sm text-gray-900">{{ day.date }}</td>
                <td class="px-6 py-4 text-sm text-right text-blue-600 font-medium">
                  {{ payments.formatNumber(day.transactions) }}
                </td>
                <td class="px-6 py-4 text-sm font-bold text-right text-green-600">
                  {{ payments.formatCurrency(day.amount) }}
                </td>
                <td class="px-6 py-4 text-sm text-right text-gray-600">
                  {{ payments.formatCurrency(day.average) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Payment Method Details -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="p-6 border-b">
          <h3 class="text-lg font-bold text-gray-900">รายละเอียดช่องทางชำระเงิน</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ช่องทาง</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">จำนวนธุรกรรม</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ยอดรวม</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ค่าเฉลี่ย</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">สัดส่วน</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-if="paymentMethodChartData.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-gray-500">ไม่มีข้อมูล</td>
              </tr>
              <tr 
                v-for="method in paymentMethodChartData"
                v-else 
                :key="method.name"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ method.name }}</td>
                <td class="px-6 py-4 text-sm text-right text-gray-600">
                  {{ payments.formatNumber(method.count) }}
                </td>
                <td class="px-6 py-4 text-sm font-bold text-right text-gray-900">
                  {{ payments.formatCurrency(method.amount) }}
                </td>
                <td class="px-6 py-4 text-sm text-right text-gray-600">
                  {{ payments.formatCurrency(method.amount / method.count) }}
                </td>
                <td class="px-6 py-4 text-sm text-right text-blue-600 font-medium">
                  {{ payments.formatPercentage(method.percentage) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-xl shadow-sm p-12 text-center">
      <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">ไม่มีข้อมูลการชำระเงิน</h3>
      <p class="text-gray-500">เลือกช่วงวันที่และกดรีเฟรชเพื่อดูข้อมูล</p>
    </div>
  </div>
</template>
