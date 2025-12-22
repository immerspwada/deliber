<script setup lang="ts">
/**
 * Admin Revenue View
 * ==================
 * Finance dashboard with revenue stats
 */
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'
import { useAdminUIStore } from '../stores/adminUI.store'

const uiStore = useAdminUIStore()

const isLoading = ref(true)
const dateRange = ref<'today' | 'week' | 'month' | 'year'>('month')

const stats = ref({
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  pendingPayments: 0,
  totalTips: 0,
  totalPromoDiscount: 0
})

const revenueByService = ref<{ service: string; revenue: number; count: number }[]>([])
const revenueByDay = ref<{ date: string; revenue: number }[]>([])
const topProviders = ref<{ name: string; earnings: number; trips: number }[]>([])

const dateRangeStart = computed(() => {
  const now = new Date()
  switch (dateRange.value) {
    case 'today': return new Date(now.setHours(0, 0, 0, 0)).toISOString()
    case 'week': return new Date(now.setDate(now.getDate() - 7)).toISOString()
    case 'month': return new Date(now.setMonth(now.getMonth() - 1)).toISOString()
    case 'year': return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString()
    default: return new Date(now.setMonth(now.getMonth() - 1)).toISOString()
  }
})

async function loadStats() {
  isLoading.value = true
  try {
    const startDate = dateRangeStart.value

    // Get ride stats
    const { data: rides } = await supabase
      .from('ride_requests')
      .select('id, status, total_fare, tip_amount, promo_discount, payment_status, created_at')
      .gte('created_at', startDate)

    const completedRides = rides?.filter(r => r.status === 'completed') || []
    const cancelledRides = rides?.filter(r => r.status === 'cancelled') || []
    const pendingPayment = rides?.filter(r => r.payment_status === 'pending') || []

    const totalRevenue = completedRides.reduce((sum, r) => sum + (r.total_fare || 0), 0)
    const totalTips = completedRides.reduce((sum, r) => sum + (r.tip_amount || 0), 0)
    const totalPromoDiscount = completedRides.reduce((sum, r) => sum + (r.promo_discount || 0), 0)

    stats.value = {
      totalRevenue,
      totalOrders: rides?.length || 0,
      avgOrderValue: completedRides.length > 0 ? totalRevenue / completedRides.length : 0,
      completedOrders: completedRides.length,
      cancelledOrders: cancelledRides.length,
      pendingPayments: pendingPayment.reduce((sum, r) => sum + (r.total_fare || 0), 0),
      totalTips,
      totalPromoDiscount
    }

    // Revenue by service type
    revenueByService.value = [
      { service: 'Ride', revenue: totalRevenue, count: completedRides.length }
    ]

    // Get delivery stats
    const { data: deliveries } = await supabase
      .from('delivery_requests')
      .select('id, status, total_price')
      .gte('created_at', startDate)
      .eq('status', 'completed')

    if (deliveries?.length) {
      const deliveryRevenue = deliveries.reduce((sum, d) => sum + (d.total_price || 0), 0)
      revenueByService.value.push({ service: 'Delivery', revenue: deliveryRevenue, count: deliveries.length })
      stats.value.totalRevenue += deliveryRevenue
      stats.value.completedOrders += deliveries.length
    }

    // Get shopping stats
    const { data: shopping } = await supabase
      .from('shopping_requests')
      .select('id, status, total_price')
      .gte('created_at', startDate)
      .eq('status', 'completed')

    if (shopping?.length) {
      const shoppingRevenue = shopping.reduce((sum, s) => sum + (s.total_price || 0), 0)
      revenueByService.value.push({ service: 'Shopping', revenue: shoppingRevenue, count: shopping.length })
      stats.value.totalRevenue += shoppingRevenue
      stats.value.completedOrders += shopping.length
    }

    // Revenue by day (last 7 days)
    const last7Days: { date: string; revenue: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayRevenue = completedRides
        .filter(r => r.created_at?.startsWith(dateStr))
        .reduce((sum, r) => sum + (r.total_fare || 0), 0)
      last7Days.push({ date: dateStr, revenue: dayRevenue })
    }
    revenueByDay.value = last7Days

    // Top providers
    const { data: providers } = await supabase
      .from('service_providers')
      .select('id, total_earnings, total_trips, users(first_name, last_name)')
      .order('total_earnings', { ascending: false })
      .limit(5)

    topProviders.value = (providers || []).map((p: any) => ({
      name: `${p.users?.first_name || ''} ${p.users?.last_name || ''}`.trim() || 'Unknown',
      earnings: p.total_earnings || 0,
      trips: p.total_trips || 0
    }))

  } catch (e) {
    console.error('Failed to load revenue stats:', e)
  } finally {
    isLoading.value = false
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

function getMaxRevenue() {
  return Math.max(...revenueByDay.value.map(d => d.revenue), 1)
}

onMounted(() => {
  uiStore.setBreadcrumbs([{ label: 'Finance', path: '/admin/revenue' }, { label: 'รายได้' }])
  loadStats()
})
</script>

<template>
  <div class="revenue-view">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">รายได้</h1>
      </div>
      <div class="header-right">
        <select v-model="dateRange" class="date-select" @change="loadStats">
          <option value="today">วันนี้</option>
          <option value="week">7 วันที่ผ่านมา</option>
          <option value="month">30 วันที่ผ่านมา</option>
          <option value="year">ปีนี้</option>
        </select>
        <button class="refresh-btn" @click="loadStats" :disabled="isLoading">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-grid">
      <div class="skeleton-card" v-for="i in 4" :key="i" />
    </div>

    <template v-else>
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">รายได้รวม</span>
            <span class="stat-value">{{ formatCurrency(stats.totalRevenue) }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">ออเดอร์สำเร็จ</span>
            <span class="stat-value">{{ stats.completedOrders.toLocaleString() }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">ค่าเฉลี่ยต่อออเดอร์</span>
            <span class="stat-value">{{ formatCurrency(stats.avgOrderValue) }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">ทิปรวม</span>
            <span class="stat-value">{{ formatCurrency(stats.totalTips) }}</span>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-row">
        <!-- Revenue Chart -->
        <div class="chart-card">
          <h3 class="card-title">รายได้ 7 วันล่าสุด</h3>
          <div class="bar-chart">
            <div 
              v-for="day in revenueByDay" 
              :key="day.date" 
              class="bar-item"
            >
              <div class="bar-wrapper">
                <div 
                  class="bar" 
                  :style="{ height: `${(day.revenue / getMaxRevenue()) * 100}%` }"
                />
              </div>
              <span class="bar-label">{{ formatDate(day.date) }}</span>
              <span class="bar-value">{{ formatCurrency(day.revenue) }}</span>
            </div>
          </div>
        </div>

        <!-- Revenue by Service -->
        <div class="chart-card">
          <h3 class="card-title">รายได้ตามบริการ</h3>
          <div class="service-list">
            <div 
              v-for="service in revenueByService" 
              :key="service.service" 
              class="service-item"
            >
              <div class="service-info">
                <span class="service-name">{{ service.service }}</span>
                <span class="service-count">{{ service.count }} ออเดอร์</span>
              </div>
              <span class="service-revenue">{{ formatCurrency(service.revenue) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Stats -->
      <div class="additional-stats">
        <div class="mini-stat">
          <span class="mini-label">ยกเลิก</span>
          <span class="mini-value red">{{ stats.cancelledOrders }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">รอชำระ</span>
          <span class="mini-value orange">{{ formatCurrency(stats.pendingPayments) }}</span>
        </div>
        <div class="mini-stat">
          <span class="mini-label">ส่วนลดโปรโม</span>
          <span class="mini-value">{{ formatCurrency(stats.totalPromoDiscount) }}</span>
        </div>
      </div>

      <!-- Top Providers -->
      <div class="top-providers-card">
        <h3 class="card-title">Top Providers</h3>
        <div class="providers-list">
          <div 
            v-for="(provider, index) in topProviders" 
            :key="index" 
            class="provider-item"
          >
            <div class="rank">{{ index + 1 }}</div>
            <div class="provider-info">
              <span class="provider-name">{{ provider.name }}</span>
              <span class="provider-trips">{{ provider.trips }} trips</span>
            </div>
            <span class="provider-earnings">{{ formatCurrency(provider.earnings) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.revenue-view { max-width: 1400px; margin: 0 auto; }

.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 700; color: #1F2937; margin: 0; }
.header-right { display: flex; gap: 12px; }
.date-select { padding: 10px 16px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 14px; }
.refresh-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; cursor: pointer; color: #6B7280; }

.loading-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.skeleton-card { height: 120px; background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 16px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
@media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }

.stat-card { background: #fff; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; }
.stat-card.primary { background: linear-gradient(135deg, #00A86B 0%, #008F5B 100%); }
.stat-card.primary .stat-icon { background: rgba(255,255,255,0.2); color: #fff; }
.stat-card.primary .stat-label { color: rgba(255,255,255,0.8); }
.stat-card.primary .stat-value { color: #fff; }

.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #E8F5EF; color: #00A86B; }
.stat-icon.blue { background: #EFF6FF; color: #3B82F6; }
.stat-icon.orange { background: #FFF7ED; color: #F97316; }
.stat-icon.purple { background: #F5F3FF; color: #8B5CF6; }

.stat-content { display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 13px; color: #6B7280; }
.stat-value { font-size: 22px; font-weight: 700; color: #1F2937; }

.charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }
@media (max-width: 1024px) { .charts-row { grid-template-columns: 1fr; } }

.chart-card { background: #fff; border-radius: 16px; padding: 24px; }
.card-title { font-size: 16px; font-weight: 600; color: #1F2937; margin: 0 0 20px 0; }

.bar-chart { display: flex; gap: 12px; height: 200px; align-items: flex-end; }
.bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.bar-wrapper { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.bar { width: 100%; background: linear-gradient(180deg, #00A86B 0%, #00C77B 100%); border-radius: 6px 6px 0 0; min-height: 4px; transition: height 0.3s; }
.bar-label { font-size: 11px; color: #6B7280; }
.bar-value { font-size: 10px; color: #9CA3AF; white-space: nowrap; }

.service-list { display: flex; flex-direction: column; gap: 12px; }
.service-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #F9FAFB; border-radius: 10px; }
.service-info { display: flex; flex-direction: column; gap: 2px; }
.service-name { font-size: 14px; font-weight: 500; color: #1F2937; }
.service-count { font-size: 12px; color: #6B7280; }
.service-revenue { font-size: 16px; font-weight: 600; color: #00A86B; }

.additional-stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.mini-stat { background: #fff; border-radius: 12px; padding: 16px 24px; display: flex; flex-direction: column; gap: 4px; }
.mini-label { font-size: 12px; color: #6B7280; }
.mini-value { font-size: 18px; font-weight: 600; color: #1F2937; }
.mini-value.red { color: #EF4444; }
.mini-value.orange { color: #F97316; }

.top-providers-card { background: #fff; border-radius: 16px; padding: 24px; }
.providers-list { display: flex; flex-direction: column; gap: 12px; }
.provider-item { display: flex; align-items: center; gap: 16px; padding: 12px 16px; background: #F9FAFB; border-radius: 10px; }
.rank { width: 28px; height: 28px; background: #00A86B; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; }
.provider-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.provider-name { font-size: 14px; font-weight: 500; color: #1F2937; }
.provider-trips { font-size: 12px; color: #6B7280; }
.provider-earnings { font-size: 16px; font-weight: 600; color: #00A86B; }
</style>
