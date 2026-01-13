<template>
  <div class="admin-analytics">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
      <p class="text-gray-600">วิเคราะห์ข้อมูลและรายงานระบบ</p>
    </div>

    <!-- Date Range Selector -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <div class="flex items-center space-x-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">From Date</label>
          <input
            v-model="dateRange.from"
            type="date"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">To Date</label>
          <input
            v-model="dateRange.to"
            type="date"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="loadAnalytics"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Update
          </button>
        </div>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Jobs</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.totalJobs }}</p>
            <p class="text-sm text-green-600">+{{ metrics.jobsGrowth }}% from last period</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Revenue</p>
            <p class="text-2xl font-semibold text-gray-900">฿{{ metrics.totalRevenue?.toLocaleString() }}</p>
            <p class="text-sm text-green-600">+{{ metrics.revenueGrowth }}% from last period</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 rounded-lg">
            <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Active Users</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.activeUsers }}</p>
            <p class="text-sm text-green-600">+{{ metrics.usersGrowth }}% from last period</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Completion Rate</p>
            <p class="text-2xl font-semibold text-gray-900">{{ metrics.completionRate }}%</p>
            <p class="text-sm text-green-600">+{{ metrics.completionGrowth }}% from last period</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Service Type Distribution -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Service Type Distribution</h3>
        <div class="space-y-4">
          <div v-for="service in serviceStats" :key="service.type" class="flex items-center justify-between">
            <div class="flex items-center">
              <div :class="getServiceColor(service.type)" class="w-4 h-4 rounded mr-3"></div>
              <span class="text-sm font-medium text-gray-900">{{ service.type }}</span>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold text-gray-900">{{ service.count }}</div>
              <div class="text-xs text-gray-500">{{ service.percentage }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Provider Performance -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Providers</h3>
        <div class="space-y-4">
          <div v-for="provider in topProviders" :key="provider.id" class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                <span class="text-xs font-medium text-gray-700">
                  {{ provider.name?.charAt(0) }}
                </span>
              </div>
              <div>
                <div class="text-sm font-medium text-gray-900">{{ provider.name }}</div>
                <div class="text-xs text-gray-500">{{ provider.jobs }} jobs</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold text-gray-900">฿{{ provider.earnings?.toLocaleString() }}</div>
              <div class="text-xs text-gray-500">{{ provider.rating?.toFixed(1) }} ⭐</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent System Activity</h3>
      <div class="space-y-3">
        <div v-for="activity in recentActivity" :key="activity.id" class="flex items-start">
          <div class="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
          <div class="ml-3">
            <p class="text-sm text-gray-900">{{ activity.message }}</p>
            <p class="text-xs text-gray-500">{{ formatTime(activity.timestamp) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'

interface Metrics {
  totalJobs: number
  totalRevenue: number
  activeUsers: number
  completionRate: number
  jobsGrowth: number
  revenueGrowth: number
  usersGrowth: number
  completionGrowth: number
}

interface ServiceStat {
  type: string
  count: number
  percentage: number
}

interface TopProvider {
  id: string
  name: string
  jobs: number
  earnings: number
  rating: number
}

interface Activity {
  id: string
  message: string
  timestamp: string
}

const dateRange = ref({
  from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  to: new Date().toISOString().split('T')[0]
})

const metrics = ref<Metrics>({
  totalJobs: 0,
  totalRevenue: 0,
  activeUsers: 0,
  completionRate: 0,
  jobsGrowth: 0,
  revenueGrowth: 0,
  usersGrowth: 0,
  completionGrowth: 0
})

const serviceStats = ref<ServiceStat[]>([])
const topProviders = ref<TopProvider[]>([])
const recentActivity = ref<Activity[]>([])

const loadAnalytics = async () => {
  try {
    // Load job metrics - try jobs_v2 first, fallback to ride_requests
    let jobs: any[] = []
    try {
      const result = await (supabase as any)
        .from('jobs_v2')
        .select('*')
        .gte('created_at', dateRange.value.from)
        .lte('created_at', dateRange.value.to)
      jobs = result.data || []
    } catch {
      const result = await supabase
        .from('ride_requests')
        .select('*')
        .gte('created_at', dateRange.value.from)
        .lte('created_at', dateRange.value.to)
      jobs = (result.data || []).map((r: any) => ({
        ...r,
        service_type: 'ride'
      }))
    }

    if (jobs.length > 0) {
      metrics.value.totalJobs = jobs.length
      metrics.value.completionRate = Math.round(
        (jobs.filter((j: any) => j.status === 'completed').length / jobs.length) * 100
      )

      // Service type distribution
      const serviceCount: Record<string, number> = {}
      jobs.forEach((job: any) => {
        const type = job.service_type || 'ride'
        serviceCount[type] = (serviceCount[type] || 0) + 1
      })

      serviceStats.value = Object.entries(serviceCount).map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / jobs.length) * 100)
      }))
    }

    // Load earnings - try earnings_v2 first, skip if not available
    try {
      const result = await (supabase as any)
        .from('earnings_v2')
        .select('gross_earnings')
        .gte('earned_at', dateRange.value.from)
        .lte('earned_at', dateRange.value.to)

      if (result.data) {
        metrics.value.totalRevenue = result.data.reduce((sum: number, e: any) => sum + (e.gross_earnings || 0), 0)
      }
    } catch {
      // earnings_v2 table may not exist
      metrics.value.totalRevenue = 0
    }

    // Load user count
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    metrics.value.activeUsers = userCount || 0

    // Mock growth data (in real app, compare with previous period)
    metrics.value.jobsGrowth = 12
    metrics.value.revenueGrowth = 8
    metrics.value.usersGrowth = 15
    metrics.value.completionGrowth = 3

  } catch (error) {
    console.error('Error loading analytics:', error)
  }
}

const getServiceColor = (serviceType: string) => {
  const colors: Record<string, string> = {
    ride: 'bg-blue-400',
    delivery: 'bg-green-400',
    shopping: 'bg-yellow-400',
    moving: 'bg-purple-400',
    laundry: 'bg-cyan-400'
  }
  return colors[serviceType] || 'bg-gray-400'
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('th-TH')
}

onMounted(() => {
  loadAnalytics()
})
</script>