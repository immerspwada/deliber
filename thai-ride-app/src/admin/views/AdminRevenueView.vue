<script setup lang="ts">
/**
 * AdminRevenueView - Admin Panel for Revenue Analytics
 * 
 * Role: Admin only
 * Features: Revenue statistics, charts, breakdown by service type
 * 
 * Uses useAdminRevenue composable with get_admin_revenue_stats RPC
 * Requirements: 10.1, 10.2
 */
import { ref, computed, onMounted } from 'vue'
import { useAdminRevenue } from '../composables/useAdminRevenue'

const revenue = useAdminRevenue()

// State
const dateFrom = ref<string>('')
const dateTo = ref<string>('')
const serviceTypeFilter = ref<'ride' | 'delivery' | 'shopping' | null>(null)

// Initialize date range to last 30 days
function initializeDateRange() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  dateTo.value = today.toISOString().split('T')[0]
  dateFrom.value = thirtyDaysAgo.toISOString().split('T')[0]
}

// Computed
const stats = computed(() => {
  if (!revenue.revenueStats.value) return null
  
  return {
    total: revenue.totalRevenue.value,
    ride: revenue.revenueByService.value.ride,
    delivery: revenue.revenueByService.value.delivery,
    shopping: revenue.revenueByService.value.shopping,
    platformFee: revenue.platformFee.value,
    providerEarnings: revenue.providerEarnings.value,
    avgDaily: revenue.getAverageDailyRevenue(),
    highestDay: revenue.getHighestRevenueDay(),
    lowestDay: revenue.getLowestRevenueDay()
  }
})

// Chart data for service revenue pie chart
const serviceChartData = computed(() => revenue.getServiceRevenueChartData())

// Chart data for payment method breakdown
const paymentChartData = computed(() => revenue.getPaymentMethodChartData())

// Chart data for daily revenue trend
const dailyChartData = computed(() => revenue.getDailyRevenueChartData())

// Load data
async function loadData() {
  if (!dateFrom.value || !dateTo.value) return
  
  await revenue.fetchRevenueStats({
    dateFrom: new Date(dateFrom.value),
    dateTo: new Date(dateTo.value),
    serviceType: serviceTypeFilter.value
  })
}

// Handle filter change
function onFilterChange() {
  loadData()
}

// Calculate pie chart segments
function calculatePieSegments(data: Array<{ name: string; value: number; color: string }>) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return []
  
  let currentAngle = 0
  return data.map(item => {
    const percentage = (item.value / total) * 100
    const angle = (item.value / total) * 360
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
      path
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
        <h1 class="text-2xl font-bold text-gray-900">รายงานรายได้</h1>
        <p class="text-sm text-gray-600 mt-1">วิเคราะห์รายได้และสถิติทางการเงิน</p>
      </div>
      <button 
        :disabled="revenue.loading.value" 
        type="button"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        aria-label="รีเฟรชข้อมูล"
        @click="loadData"
      >
        {{ revenue.loading.value ? 'กำลังโหลด...' : 'รีเฟรช' }}
      </button>
    </div>

    <!-- Filters -->
    <div class="mb-6 bg-white p-4 rounded-xl shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <div>
          <label for="service-type" class="block text-sm font-medium text-gray-700 mb-1">
            ประเภทบริการ
          </label>
          <select 
            id="service-type"
            v-model="serviceTypeFilter" 
            class="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @change="onFilterChange"
          >
            <option :value="null">ทุกประเภท</option>
            <option value="ride">รถรับส่ง</option>
            <option value="delivery">ส่งของ</option>
            <option value="shopping">ช้อปปิ้ง</option>
          </select>
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
    <div v-if="revenue.loading.value && !stats" class="flex items-center justify-center py-12">
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
          <div class="text-sm text-gray-500 mb-1">รายได้รวม</div>
          <div class="text-3xl font-bold text-blue-600">{{ revenue.formatCurrency(stats.total) }}</div>
          <div class="text-xs text-gray-400 mt-2">
            เฉลี่ย {{ revenue.formatCurrency(stats.avgDaily) }}/วัน
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
          <div class="text-sm text-gray-500 mb-1">รายได้ผู้ให้บริการ</div>
          <div class="text-3xl font-bold text-green-600">{{ revenue.formatCurrency(stats.providerEarnings) }}</div>
          <div class="text-xs text-gray-400 mt-2">
            {{ revenue.formatPercentage(stats.providerEarnings, stats.total) }} ของรายได้รวม
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
          <div class="text-sm text-gray-500 mb-1">ค่าธรรมเนียมแพลตฟอร์ม</div>
          <div class="text-3xl font-bold text-purple-600">{{ revenue.formatCurrency(stats.platformFee) }}</div>
          <div class="text-xs text-gray-400 mt-2">
            {{ revenue.formatPercentage(stats.platformFee, stats.total) }} ของรายได้รวม
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
          <div class="text-sm text-gray-500 mb-1">วันที่รายได้สูงสุด</div>
          <div class="text-2xl font-bold text-orange-600">
            {{ stats.highestDay ? revenue.formatCurrency(stats.highestDay.revenue) : '-' }}
          </div>
          <div class="text-xs text-gray-400 mt-2">
            {{ stats.highestDay ? revenue.formatDate(stats.highestDay.date) : '-' }}
          </div>
        </div>
      </div>

      <!-- Service Type Breakdown -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-gray-900">รถรับส่ง</h3>
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
          <div class="text-3xl font-bold text-gray-900 mb-2">{{ revenue.formatCurrency(stats.ride) }}</div>
          <div class="text-sm text-gray-500">
            {{ revenue.formatPercentage(stats.ride, stats.total) }} ของรายได้รวม
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-gray-900">ส่งของ</h3>
            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <div class="text-3xl font-bold text-gray-900 mb-2">{{ revenue.formatCurrency(stats.delivery) }}</div>
          <div class="text-sm text-gray-500">
            {{ revenue.formatPercentage(stats.delivery, stats.total) }} ของรายได้รวม
          </div>
        </div>
        
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-gray-900">ช้อปปิ้ง</h3>
            <div class="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <div class="text-3xl font-bold text-gray-900 mb-2">{{ revenue.formatCurrency(stats.shopping) }}</div>
          <div class="text-sm text-gray-500">
            {{ revenue.formatPercentage(stats.shopping, stats.total) }} ของรายได้รวม
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Service Revenue Pie Chart -->
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <h3 class="text-lg font-bold text-gray-900 mb-4">สัดส่วนรายได้ตามประเภทบริการ</h3>
          <div v-if="serviceChartData.length > 0" class="flex flex-col items-center">
            <svg viewBox="0 0 100 100" class="w-64 h-64">
              <g v-for="(segment, index) in calculatePieSegments(serviceChartData)" :key="index">
                <path
                  :d="segment.path"
                  :fill="segment.color"
                  class="transition-opacity hover:opacity-80 cursor-pointer"
                  :aria-label="`${segment.name}: ${revenue.formatCurrency(segment.value)}`"
                />
              </g>
            </svg>
            <div class="mt-4 space-y-2 w-full">
              <div v-for="item in serviceChartData" :key="item.name" class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-4 h-4 rounded" :style="{ backgroundColor: item.color }"></div>
                  <span class="text-sm text-gray-700">{{ item.name }}</span>
                </div>
                <span class="text-sm font-medium text-gray-900">{{ revenue.formatCurrency(item.value) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12 text-gray-500">
            ไม่มีข้อมูล
          </div>
        </div>

        <!-- Payment Method Breakdown -->
        <div class="bg-white p-6 rounded-xl shadow-sm">
          <h3 class="text-lg font-bold text-gray-900 mb-4">รายได้ตามช่องทางชำระเงิน</h3>
          <div v-if="paymentChartData.length > 0" class="space-y-3">
            <div v-for="item in paymentChartData" :key="item.name" class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-700">{{ item.name }}</span>
                <span class="font-medium text-gray-900">{{ revenue.formatCurrency(item.value) }}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all"
                  :style="{ 
                    width: revenue.formatPercentage(item.value, stats.total),
                    backgroundColor: item.color 
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

      <!-- Daily Revenue Chart -->
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <h3 class="text-lg font-bold text-gray-900 mb-4">กราฟรายได้รายวัน</h3>
        <div v-if="dailyChartData.length > 0" class="space-y-4">
          <!-- Line Chart -->
          <div class="relative h-64">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="w-full h-full">
              <!-- Grid lines -->
              <line
                v-for="i in 5" :key="`grid-${i}`" 
                x1="0" :y1="i * 20" x2="100" :y2="i * 20" 
                stroke="#e5e7eb" stroke-width="0.2"
              />
              
              <!-- Revenue line -->
              <polyline
                :points="dailyChartData.map((d, i) => {
                  const x = (i / (dailyChartData.length - 1)) * 100
                  const maxRevenue = Math.max(...dailyChartData.map(d => d.revenue))
                  const y = 100 - (d.revenue / maxRevenue) * 80
                  return `${x},${y}`
                }).join(' ')"
                fill="none"
                stroke="#3b82f6"
                stroke-width="2"
                class="transition-all"
              />
              
              <!-- Data points -->
              <circle
                v-for="(d, i) in dailyChartData"
                :key="`point-${i}`"
                :cx="(i / (dailyChartData.length - 1)) * 100"
                :cy="100 - (d.revenue / Math.max(...dailyChartData.map(d => d.revenue))) * 80"
                r="2"
                fill="#3b82f6"
                class="cursor-pointer hover:r-3 transition-all"
              >
                <title>{{ d.date }}: {{ revenue.formatCurrency(d.revenue) }}</title>
              </circle>
            </svg>
          </div>
          
          <!-- Date labels -->
          <div class="flex justify-between text-xs text-gray-500">
            <span>{{ dailyChartData[0]?.date }}</span>
            <span v-if="dailyChartData.length > 1">
              {{ dailyChartData[Math.floor(dailyChartData.length / 2)]?.date }}
            </span>
            <span>{{ dailyChartData[dailyChartData.length - 1]?.date }}</span>
          </div>
        </div>
        <div v-else class="text-center py-12 text-gray-500">
          ไม่มีข้อมูล
        </div>
      </div>

      <!-- Daily Breakdown Table -->
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="p-6 border-b">
          <h3 class="text-lg font-bold text-gray-900">รายละเอียดรายได้รายวัน</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">รายได้รวม</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">จำนวนออเดอร์</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">รถรับส่ง</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ส่งของ</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ช้อปปิ้ง</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-if="dailyChartData.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">ไม่มีข้อมูล</td>
              </tr>
              <tr 
                v-for="day in dailyChartData"
                v-else 
                :key="day.date"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-6 py-4 text-sm text-gray-900">{{ day.date }}</td>
                <td class="px-6 py-4 text-sm font-bold text-right text-gray-900">
                  {{ revenue.formatCurrency(day.revenue) }}
                </td>
                <td class="px-6 py-4 text-sm text-right text-gray-600">{{ day.orders }}</td>
                <td class="px-6 py-4 text-sm text-right text-blue-600">
                  {{ revenue.formatCurrency(day.ride) }}
                </td>
                <td class="px-6 py-4 text-sm text-right text-green-600">
                  {{ revenue.formatCurrency(day.delivery) }}
                </td>
                <td class="px-6 py-4 text-sm text-right text-orange-600">
                  {{ revenue.formatCurrency(day.shopping) }}
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
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">ไม่มีข้อมูลรายได้</h3>
      <p class="text-gray-500">เลือกช่วงวันที่และกดรีเฟรชเพื่อดูข้อมูล</p>
    </div>
  </div>
</template>
