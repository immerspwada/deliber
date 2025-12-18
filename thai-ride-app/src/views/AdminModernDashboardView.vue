<!--
  Modern Admin Dashboard - MUNEEF Style
  
  Enhanced dashboard with real-time metrics, interactive charts, and modern UI
  Features: responsive grid, live updates, drill-down capabilities
-->

<template>
  <EnhancedAdminLayout>
    <div class="modern-admin-dashboard">
      <!-- Dashboard Header -->
      <div class="dashboard-header">
        <div class="header-content">
          <h1 class="dashboard-title">Dashboard Overview</h1>
          <p class="dashboard-subtitle">ภาพรวมระบบและข้อมูลสำคัญแบบ Real-time</p>
        </div>
        
        <div class="header-actions">
          <AdminButton
            variant="outline"
            size="sm"
            :icon="RefreshIcon"
            @click="refreshData"
            :loading="isRefreshing"
          >
            รีเฟรช
          </AdminButton>
          
          <AdminButton
            variant="primary"
            size="sm"
            :icon="DownloadIcon"
            @click="exportReport"
          >
            ส่งออกรายงาน
          </AdminButton>
        </div>
      </div>

      <!-- Key Metrics Grid -->
      <div class="metrics-grid">
        <AdminStatCard
          label="ผู้ใช้งานทั้งหมด"
          :value="metrics.totalUsers"
          unit="คน"
          :trend="metrics.userGrowth"
          trend-unit="%"
          :icon="UsersIcon"
          icon-color="primary"
          variant="default"
          :chart-data="metrics.userChartData"
          :comparison="{ label: 'เมื่อเดือนที่แล้ว', value: metrics.lastMonthUsers }"
          clickable
          @click="navigateTo('/admin/users')"
        />

        <AdminStatCard
          label="ผู้ให้บริการออนไลน์"
          :value="metrics.activeProviders"
          unit="คน"
          :trend="metrics.providerGrowth"
          trend-unit="%"
          :icon="CarIcon"
          icon-color="success"
          variant="success"
          :progress="metrics.providerUtilization"
          progress-target="เป้าหมาย"
          clickable
          @click="navigateTo('/admin/providers')"
        />

        <AdminStatCard
          label="ออเดอร์วันนี้"
          :value="metrics.todayOrders"
          unit="รายการ"
          :trend="metrics.orderGrowth"
          trend-unit="%"
          :icon="OrderIcon"
          icon-color="warning"
          variant="warning"
          :chart-data="metrics.orderChartData"
          chart-color="#F5A623"
          clickable
          @click="navigateTo('/admin/orders')"
        />

        <AdminStatCard
          label="รายได้วันนี้"
          :value="metrics.todayRevenue"
          format="currency"
          :trend="metrics.revenueGrowth"
          trend-unit="%"
          :icon="RevenueIcon"
          icon-color="info"
          variant="info"
          :comparison="{ label: 'เป้าหมายรายวัน', value: metrics.dailyTarget, format: 'currency' }"
          clickable
          @click="navigateTo('/admin/revenue')"
        />
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="charts-grid">
          <!-- Revenue Chart -->
          <AdminCard
            title="รายได้รายวัน (7 วันล่าสุด)"
            subtitle="เปรียบเทียบกับสัปดาห์ที่แล้ว"
            :icon="ChartIcon"
            icon-color="primary"
            elevated
            class="chart-card"
          >
            <template #actions>
              <AdminButton variant="ghost" size="xs" :icon="MoreIcon" />
            </template>
            
            <div class="chart-container">
              <div class="chart-placeholder">
                <svg class="chart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M18 20V10M12 20V4M6 20v-6"/>
                </svg>
                <h3>Revenue Chart</h3>
                <p>กราฟรายได้รายวันจะแสดงที่นี่</p>
              </div>
            </div>
          </AdminCard>

          <!-- Service Distribution -->
          <AdminCard
            title="การกระจายบริการ"
            subtitle="สัดส่วนการใช้บริการแต่ละประเภท"
            :icon="PieChartIcon"
            icon-color="success"
            elevated
            class="chart-card"
          >
            <div class="service-distribution">
              <div class="distribution-item">
                <div class="item-info">
                  <div class="item-color ride"></div>
                  <span class="item-label">เรียกรถ</span>
                </div>
                <div class="item-stats">
                  <span class="item-percentage">45%</span>
                  <span class="item-count">1,234 รายการ</span>
                </div>
              </div>
              
              <div class="distribution-item">
                <div class="item-info">
                  <div class="item-color delivery"></div>
                  <span class="item-label">ส่งของ</span>
                </div>
                <div class="item-stats">
                  <span class="item-percentage">35%</span>
                  <span class="item-count">956 รายการ</span>
                </div>
              </div>
              
              <div class="distribution-item">
                <div class="item-info">
                  <div class="item-color shopping"></div>
                  <span class="item-label">ซื้อของ</span>
                </div>
                <div class="item-stats">
                  <span class="item-percentage">20%</span>
                  <span class="item-count">547 รายการ</span>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      <!-- Recent Activities & Live Updates -->
      <div class="activities-section">
        <div class="activities-grid">
          <!-- Recent Orders -->
          <AdminCard
            title="ออเดอร์ล่าสุด"
            subtitle="รายการออเดอร์ที่เข้ามาใหม่"
            :icon="OrderIcon"
            icon-color="warning"
            elevated
          >
            <template #actions>
              <AdminButton
                variant="ghost"
                size="xs"
                @click="navigateTo('/admin/orders')"
              >
                ดูทั้งหมด
              </AdminButton>
            </template>

            <div class="recent-orders">
              <div
                v-for="order in recentOrders"
                :key="order.id"
                class="order-item"
              >
                <div class="order-info">
                  <div class="order-id">#{{ order.tracking_id }}</div>
                  <div class="order-service">{{ order.service_type }}</div>
                  <div class="order-time">{{ formatTime(order.created_at) }}</div>
                </div>
                <div class="order-status">
                  <AdminStatusBadge
                    :status="getOrderStatus(order.status)"
                    :text="getOrderStatusText(order.status)"
                    variant="soft"
                    size="sm"
                  />
                </div>
                <div class="order-amount">
                  {{ formatCurrency(order.total_amount) }}
                </div>
              </div>
            </div>
          </AdminCard>

          <!-- System Health -->
          <AdminCard
            title="สุขภาพระบบ"
            subtitle="สถานะการทำงานของระบบ"
            :icon="HealthIcon"
            icon-color="success"
            elevated
          >
            <template #actions>
              <AdminButton
                variant="ghost"
                size="xs"
                @click="navigateTo('/admin/system-health')"
              >
                รายละเอียด
              </AdminButton>
            </template>

            <div class="system-health">
              <div class="health-item">
                <div class="health-info">
                  <span class="health-label">API Response Time</span>
                  <AdminStatusBadge
                    status="success"
                    text="145ms"
                    variant="soft"
                    size="sm"
                  />
                </div>
                <div class="health-bar">
                  <div class="health-progress" style="width: 85%"></div>
                </div>
              </div>

              <div class="health-item">
                <div class="health-info">
                  <span class="health-label">Database Connection</span>
                  <AdminStatusBadge
                    status="success"
                    text="Healthy"
                    variant="soft"
                    size="sm"
                  />
                </div>
                <div class="health-bar">
                  <div class="health-progress" style="width: 95%"></div>
                </div>
              </div>

              <div class="health-item">
                <div class="health-info">
                  <span class="health-label">Server Load</span>
                  <AdminStatusBadge
                    status="warning"
                    text="78%"
                    variant="soft"
                    size="sm"
                  />
                </div>
                <div class="health-bar">
                  <div class="health-progress warning" style="width: 78%"></div>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions-section">
        <AdminCard
          title="การดำเนินการด่วน"
          subtitle="ฟังก์ชันที่ใช้บ่อยสำหรับการจัดการ"
          :icon="LightningIcon"
          icon-color="primary"
          elevated
        >
          <div class="quick-actions-grid">
            <AdminButton
              variant="outline"
              size="lg"
              :icon="UsersIcon"
              @click="navigateTo('/admin/users')"
              class="quick-action-btn"
            >
              จัดการผู้ใช้
            </AdminButton>

            <AdminButton
              variant="outline"
              size="lg"
              :icon="CarIcon"
              @click="navigateTo('/admin/providers')"
              class="quick-action-btn"
            >
              อนุมัติผู้ให้บริการ
            </AdminButton>

            <AdminButton
              variant="outline"
              size="lg"
              :icon="SupportIcon"
              @click="navigateTo('/admin/support')"
              class="quick-action-btn"
            >
              ตอบกลับ Support
            </AdminButton>

            <AdminButton
              variant="outline"
              size="lg"
              :icon="PromoIcon"
              @click="navigateTo('/admin/promos')"
              class="quick-action-btn"
            >
              สร้างโปรโมชั่น
            </AdminButton>

            <AdminButton
              variant="outline"
              size="lg"
              :icon="ReportIcon"
              @click="navigateTo('/admin/reports')"
              class="quick-action-btn"
            >
              ดูรายงาน
            </AdminButton>

            <AdminButton
              variant="outline"
              size="lg"
              :icon="SettingsIcon"
              @click="navigateTo('/admin/settings')"
              class="quick-action-btn"
            >
              ตั้งค่าระบบ
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    </div>
  </EnhancedAdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EnhancedAdminLayout from '../components/admin/EnhancedAdminLayout.vue'
import AdminCard from '../components/admin/AdminCard.vue'
import AdminStatCard from '../components/admin/AdminStatCard.vue'
import AdminButton from '../components/admin/AdminButton.vue'
import AdminStatusBadge from '../components/admin/AdminStatusBadge.vue'

// Icons
const RefreshIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>' }
const DownloadIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>' }
const UsersIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>' }
const CarIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>' }
const OrderIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>' }
const RevenueIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' }
const ChartIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>' }
const PieChartIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z"/></svg>' }
const HealthIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' }
const LightningIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>' }
const SupportIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' }
const PromoIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1"/></svg>' }
const ReportIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' }
const SettingsIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' }
const MoreIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>' }

const router = useRouter()

// State
const isRefreshing = ref(false)

// Mock data
const metrics = ref({
  totalUsers: 15420,
  userGrowth: 12.5,
  lastMonthUsers: 13750,
  userChartData: [100, 120, 115, 134, 145, 160, 155],
  
  activeProviders: 1234,
  providerGrowth: 8.3,
  providerUtilization: 78,
  
  todayOrders: 2847,
  orderGrowth: 15.2,
  orderChartData: [200, 250, 220, 280, 300, 285, 320],
  
  todayRevenue: 1250000,
  revenueGrowth: 22.1,
  dailyTarget: 1500000
})

const recentOrders = ref([
  {
    id: 1,
    tracking_id: 'RID-20241218-001',
    service_type: 'เรียกรถ',
    status: 'pending',
    total_amount: 150,
    created_at: new Date()
  },
  {
    id: 2,
    tracking_id: 'DEL-20241218-002',
    service_type: 'ส่งของ',
    status: 'matched',
    total_amount: 85,
    created_at: new Date(Date.now() - 300000)
  },
  {
    id: 3,
    tracking_id: 'SHP-20241218-003',
    service_type: 'ซื้อของ',
    status: 'completed',
    total_amount: 320,
    created_at: new Date(Date.now() - 600000)
  }
])

// Methods
const navigateTo = (path: string) => {
  router.push(path)
}

const refreshData = async () => {
  isRefreshing.value = true
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Update metrics with new data
  metrics.value.totalUsers += Math.floor(Math.random() * 10)
  metrics.value.activeProviders += Math.floor(Math.random() * 5)
  metrics.value.todayOrders += Math.floor(Math.random() * 20)
  
  isRefreshing.value = false
}

const exportReport = () => {
  // Simulate report export
  console.log('Exporting dashboard report...')
}

const getOrderStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'warning',
    matched: 'info',
    in_progress: 'active',
    completed: 'success',
    cancelled: 'error'
  }
  return statusMap[status] || 'neutral'
}

const getOrderStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: 'รอรับงาน',
    matched: 'จับคู่แล้ว',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก'
  }
  return textMap[status] || status
}

const formatTime = (date: Date) => {
  return new Intl.RelativeTimeFormat('th').format(
    Math.floor((date.getTime() - Date.now()) / (1000 * 60)),
    'minute'
  )
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount)
}

// Lifecycle
onMounted(() => {
  // Auto-refresh every 30 seconds
  setInterval(() => {
    if (!isRefreshing.value) {
      refreshData()
    }
  }, 30000)
})
</script>

<style scoped>
.modern-admin-dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

/* Dashboard Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #F0F0F0;
}

.header-content h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

.dashboard-subtitle {
  font-size: 16px;
  color: #666666;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

/* Charts Section */
.charts-section {
  margin-bottom: 40px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.chart-card {
  min-height: 400px;
}

.chart-container {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  text-align: center;
  color: #666666;
}

.chart-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  color: #00A86B;
}

.chart-placeholder h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 8px 0;
}

/* Service Distribution */
.service-distribution {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.distribution-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #F0F0F0;
}

.distribution-item:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.item-color.ride {
  background: #00A86B;
}

.item-color.delivery {
  background: #F5A623;
}

.item-color.shopping {
  background: #1976D2;
}

.item-label {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.item-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.item-percentage {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
}

.item-count {
  font-size: 12px;
  color: #666666;
}

/* Activities Section */
.activities-section {
  margin-bottom: 40px;
}

.activities-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* Recent Orders */
.recent-orders {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #F0F0F0;
}

.order-item:last-child {
  border-bottom: none;
}

.order-info {
  flex: 1;
}

.order-id {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.order-service {
  font-size: 13px;
  color: #666666;
  margin-bottom: 2px;
}

.order-time {
  font-size: 12px;
  color: #999999;
}

.order-amount {
  font-size: 16px;
  font-weight: 600;
  color: #00A86B;
}

/* System Health */
.system-health {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.health-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.health-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.health-label {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.health-bar {
  height: 6px;
  background: #F0F0F0;
  border-radius: 3px;
  overflow: hidden;
}

.health-progress {
  height: 100%;
  background: #00A86B;
  border-radius: 3px;
  transition: width 0.8s ease;
}

.health-progress.warning {
  background: #F5A623;
}

/* Quick Actions */
.quick-actions-section {
  margin-bottom: 40px;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.quick-action-btn {
  height: 80px;
  flex-direction: column;
  gap: 8px;
}

/* Responsive */
@media (max-width: 1200px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .activities-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-end;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quick-action-btn {
    height: 60px;
    font-size: 13px;
  }
}
</style>