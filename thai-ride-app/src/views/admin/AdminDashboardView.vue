<template>
  <div class="admin-dashboard">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p class="text-gray-600">ภาพรวมระบบและการจัดการ</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-blue-100 rounded-lg">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Users</p>
            <p class="text-2xl font-semibold text-gray-900">{{ stats.totalUsers }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-green-100 rounded-lg">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Active Providers</p>
            <p class="text-2xl font-semibold text-gray-900">{{ stats.activeProviders }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-yellow-100 rounded-lg">
            <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Jobs</p>
            <p class="text-2xl font-semibold text-gray-900">{{ stats.totalJobs }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-2 bg-purple-100 rounded-lg">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Revenue</p>
            <p class="text-2xl font-semibold text-gray-900">฿{{ stats.totalRevenue?.toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div class="space-y-3">
          <router-link
            to="/admin/providers"
            class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span class="text-gray-900">Manage Providers</span>
          </router-link>

          <router-link
            to="/admin/users"
            class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <span class="text-gray-900">Manage Users</span>
          </router-link>

          <router-link
            to="/admin/jobs"
            class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span class="text-gray-900">View Jobs</span>
          </router-link>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div class="space-y-3">
          <div v-for="activity in recentActivity" :key="activity.id" class="flex items-start">
            <div class="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
            <div class="ml-3">
              <p class="text-sm text-gray-900">{{ activity.message }}</p>
              <p class="text-xs text-gray-500">{{ formatTime(activity.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'

interface Stats {
  totalUsers: number
  activeProviders: number
  totalJobs: number
  totalRevenue: number
}

interface Activity {
  id: string
  message: string
  created_at: string
}

const stats = ref<Stats>({
  totalUsers: 0,
  activeProviders: 0,
  totalJobs: 0,
  totalRevenue: 0
})

const recentActivity = ref<Activity[]>([])

const loadStats = async () => {
  try {
    // Load user count
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Load active provider count
    const { count: providerCount } = await supabase
      .from('providers_v2')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'active'])

    // Load job count - try jobs_v2 first, fallback to ride_requests
    let jobCount = 0
    try {
      const result = await (supabase as any)
        .from('jobs_v2')
        .select('*', { count: 'exact', head: true })
      jobCount = result.count || 0
    } catch {
      const result = await supabase
        .from('ride_requests')
        .select('*', { count: 'exact', head: true })
      jobCount = result.count || 0
    }

    stats.value = {
      totalUsers: userCount || 0,
      activeProviders: providerCount || 0,
      totalJobs: jobCount,
      totalRevenue: 0 // Calculate from earnings if needed
    }
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('th-TH')
}

onMounted(() => {
  loadStats()
})
</script>