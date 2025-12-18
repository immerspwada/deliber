<template>
  <AdminLayout>
    <div class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-900">Revenue Dashboard</h1>
        <select v-model="dateRange" @change="fetchData" class="px-3 py-2 border rounded-xl text-sm">
          <option value="7">7 วัน</option>
          <option value="30">30 วัน</option>
          <option value="90">90 วัน</option>
        </select>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
          <p class="text-3xl font-bold">฿{{ formatNumber(totalRevenue) }}</p>
          <p class="text-sm opacity-80">รายได้รวม</p>
        </div>
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
          <p class="text-3xl font-bold">{{ totalOrders }}</p>
          <p class="text-sm opacity-80">ออเดอร์ทั้งหมด</p>
        </div>
      </div>

      <!-- Service Breakdown -->
      <div class="bg-white rounded-2xl p-4">
        <h2 class="font-semibold text-gray-900 mb-3">รายได้ตามบริการ</h2>
        <div class="space-y-3">
          <div v-for="service in revenueByService" :key="service.type" class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div :class="getServiceColor(service.type)" class="w-10 h-10 rounded-xl flex items-center justify-center">
                <span class="text-white text-lg">{{ getServiceIcon(service.type) }}</span>
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ formatServiceName(service.type) }}</p>
                <p class="text-xs text-gray-500">{{ service.completed_orders }} ออเดอร์</p>
              </div>
            </div>
            <p class="font-bold text-gray-900">฿{{ formatNumber(service.total_revenue) }}</p>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>


<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { supabase } from '../lib/supabase'

const dateRange = ref(30)
const revenueByService = ref<any[]>([])
const loading = ref(false)

const totalRevenue = computed(() => revenueByService.value.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0))
const totalOrders = computed(() => revenueByService.value.reduce((sum, s) => sum + Number(s.completed_orders || 0), 0))

const fetchData = async () => {
  loading.value = true
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - dateRange.value)
    
    const { data, error } = await (supabase.rpc as any)('get_revenue_summary', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0]
    })
    
    if (!error && data) revenueByService.value = data
  } catch (err) {
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

const formatNumber = (num: number) => num?.toLocaleString('th-TH', { minimumFractionDigits: 0 }) || '0'
const formatServiceName = (type: string) => ({ ride: 'เรียกรถ', delivery: 'ส่งของ', shopping: 'ซื้อของ' }[type] || type)
const getServiceColor = (type: string) => ({ ride: 'bg-blue-500', delivery: 'bg-orange-500', shopping: 'bg-purple-500' }[type] || 'bg-gray-500')
const getServiceIcon = (type: string) => ({ ride: '🚗', delivery: '📦', shopping: '🛒' }[type] || '📋')

onMounted(fetchData)
</script>
