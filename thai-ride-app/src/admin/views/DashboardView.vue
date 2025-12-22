<!--
  Admin V2 Dashboard View
  ======================
  Main dashboard with overview stats
-->

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../../lib/supabase'

// Stats
const stats = ref({
  totalOrders: 0,
  totalRevenue: 0,
  totalUsers: 0,
  totalProviders: 0
})

const recentOrders = ref<any[]>([])
const pendingProviders = ref<any[]>([])
const isLoading = ref(true)

onMounted(async () => {
  await loadDashboardData()
})

const loadDashboardData = async () => {
  isLoading.value = true
  
  try {
    // Load stats
    const [ordersResult, usersResult, providersResult] = await Promise.all([
      supabase.from('ride_requests').select('id, total_price', { count: 'exact' }),
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('service_providers').select('id', { count: 'exact' })
    ])

    stats.value = {
      totalOrders: ordersResult.count || 0,
      totalRevenue: ordersResult.data?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0,
      totalUsers: usersResult.count || 0,
      totalProviders: providersResult.count || 0
    }

    // Load recent orders
    const { data: orders } = await supabase
      .from('ride_requests')
      .select('id, tracking_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    recentOrders.value = orders || []

    // Load pending providers
    const { data: providers } = await supabase
      .from('service_providers')
      .select('id, provider_uid, provider_type, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)
    
    pendingProviders.value = providers || []

  } catch (error) {
    console.error('Error loading dashboard:', error)
  } finally {
    isLoading.value = false
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="dashboard">
    <h1 class="page-title">Dashboard</h1>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      <div class="spinner" />
      <span>กำลังโหลดข้อมูล...</span>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon orders">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">ออเดอร์ทั้งหมด</div>
            <div class="stat-value">{{ stats.totalOrders.toLocaleString() }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon revenue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">รายได้ทั้งหมด</div>
            <div class="stat-value">{{ formatCurrency(stats.totalRevenue) }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon users">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">ผู้ใช้ทั้งหมด</div>
            <div class="stat-value">{{ stats.totalUsers.toLocaleString() }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon providers">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">ผู้ให้บริการ</div>
            <div class="stat-value">{{ stats.totalProviders.toLocaleString() }}</div>
          </div>
        </div>
      </div>

      <!-- Recent Orders & Pending Providers -->
      <div class="content-grid">
        <!-- Recent Orders -->
        <div class="card">
          <h2 class="card-title">ออเดอร์ล่าสุด</h2>
          <div v-if="recentOrders.length === 0" class="empty-state">
            ไม่มีออเดอร์
          </div>
          <div v-else class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>สถานะ</th>
                  <th>วันที่</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in recentOrders" :key="order.id">
                  <td>{{ order.tracking_id }}</td>
                  <td>
                    <span class="status-badge" :class="order.status">
                      {{ order.status }}
                    </span>
                  </td>
                  <td>{{ formatDate(order.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pending Providers -->
        <div class="card">
          <h2 class="card-title">ผู้ให้บริการรอตรวจสอบ</h2>
          <div v-if="pendingProviders.length === 0" class="empty-state">
            ไม่มีรายการรอตรวจสอบ
          </div>
          <div v-else class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Provider UID</th>
                  <th>ประเภท</th>
                  <th>วันที่สมัคร</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="provider in pendingProviders" :key="provider.id">
                  <td>{{ provider.provider_uid }}</td>
                  <td>{{ provider.provider_type }}</td>
                  <td>{{ formatDate(provider.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 0;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 24px 0;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: #6B7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #E5E7EB;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #E5E7EB;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.orders {
  background: #DBEAFE;
  color: #1E40AF;
}

.stat-icon.revenue {
  background: #D1FAE5;
  color: #065F46;
}

.stat-icon.users {
  background: #FEF3C7;
  color: #92400E;
}

.stat-icon.providers {
  background: #E0E7FF;
  color: #3730A3;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #E5E7EB;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 16px 0;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #9CA3AF;
  font-size: 14px;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
  border-bottom: 1px solid #E5E7EB;
}

.data-table td {
  padding: 12px;
  font-size: 14px;
  color: #1F2937;
  border-bottom: 1px solid #F3F4F6;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending {
  background: #FEF3C7;
  color: #92400E;
}

.status-badge.matched {
  background: #DBEAFE;
  color: #1E40AF;
}

.status-badge.in_progress {
  background: #E0E7FF;
  color: #3730A3;
}

.status-badge.completed {
  background: #D1FAE5;
  color: #065F46;
}

.status-badge.cancelled {
  background: #FEE2E2;
  color: #991B1B;
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
