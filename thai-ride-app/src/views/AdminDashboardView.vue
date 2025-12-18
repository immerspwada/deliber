<script setup lang="ts">
import { onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdmin } from '../composables/useAdmin'

const { stats, loading, fetchDashboardStats, fetchRecentOrders, recentOrders } = useAdmin()

onMounted(async () => {
  await fetchDashboardStats()
  await fetchRecentOrders(5)
})

const formatNumber = (n: number) => n.toLocaleString('th-TH')
const formatCurrency = (n: number) => `฿${n.toLocaleString('th-TH')}`
const formatDate = (d: string) => new Date(d).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#ffc043', matched: '#276ef1', pickup: '#276ef1', in_progress: '#276ef1',
    in_transit: '#276ef1', shopping: '#276ef1', delivering: '#276ef1',
    completed: '#05944f', delivered: '#05944f', cancelled: '#e11900', failed: '#e11900'
  }
  return colors[status] || '#6b6b6b'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: 'รอดำเนินการ', matched: 'จับคู่แล้ว', pickup: 'กำลังรับ', in_progress: 'กำลังเดินทาง',
    in_transit: 'กำลังส่ง', shopping: 'กำลังซื้อ', delivering: 'กำลังจัดส่ง',
    completed: 'สำเร็จ', delivered: 'ส่งแล้ว', cancelled: 'ยกเลิก', failed: 'ล้มเหลว'
  }
  return texts[status] || status
}


</script>

<template>
  <AdminLayout>
    <div class="dashboard">
      <div class="page-header">
        <h1>แดชบอร์ด</h1>
        <p class="subtitle">ภาพรวมระบบ GOBEAR</p>
      </div>

      <!-- Stats Grid -->
      <div v-if="loading" class="stats-grid">
        <div v-for="i in 8" :key="i" class="stat-card skeleton-card">
          <div class="skeleton" style="width: 40px; height: 40px; border-radius: 10px;"></div>
          <div class="skeleton" style="width: 60%; height: 14px; margin-top: 12px;"></div>
          <div class="skeleton" style="width: 40%; height: 24px; margin-top: 8px;"></div>
        </div>
      </div>

      <div v-else class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon users">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <span class="stat-label">ผู้ใช้ทั้งหมด</span>
          <span class="stat-value">{{ formatNumber(stats.totalUsers) }}</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon providers">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
            </svg>
          </div>
          <span class="stat-label">ผู้ให้บริการ</span>
          <span class="stat-value">{{ formatNumber(stats.totalProviders) }}</span>
          <span class="stat-sub">{{ stats.onlineProviders }} ออนไลน์</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon rides">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <span class="stat-label">เรียกรถ</span>
          <span class="stat-value">{{ formatNumber(stats.totalRides) }}</span>
          <span class="stat-sub active">{{ stats.activeRides }} กำลังดำเนินการ</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon delivery">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            </svg>
          </div>
          <span class="stat-label">ส่งของ</span>
          <span class="stat-value">{{ formatNumber(stats.totalDeliveries) }}</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon shopping">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
          </div>
          <span class="stat-label">ซื้อของ</span>
          <span class="stat-value">{{ formatNumber(stats.totalShopping) }}</span>
        </div>

        <div class="stat-card highlight">
          <div class="stat-icon revenue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
          </div>
          <span class="stat-label">รายได้รวม</span>
          <span class="stat-value">{{ formatCurrency(stats.totalRevenue) }}</span>
        </div>

        <div class="stat-card warning">
          <div class="stat-icon pending">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
          </div>
          <span class="stat-label">รอยืนยันตัวตน</span>
          <span class="stat-value">{{ formatNumber(stats.pendingVerifications) }}</span>
        </div>

        <div class="stat-card" :class="{ alert: stats.openTickets > 0 }">
          <div class="stat-icon tickets">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <span class="stat-label">Ticket เปิดอยู่</span>
          <span class="stat-value">{{ formatNumber(stats.openTickets) }}</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon subscription">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
            </svg>
          </div>
          <span class="stat-label">สมาชิกแพ็กเกจ</span>
          <span class="stat-value">{{ formatNumber(stats.activeSubscriptions) }}</span>
        </div>

        <div class="stat-card" :class="{ warning: stats.pendingInsuranceClaims > 0 }">
          <div class="stat-icon insurance">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <span class="stat-label">เคลมประกันรอดำเนินการ</span>
          <span class="stat-value">{{ formatNumber(stats.pendingInsuranceClaims) }}</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon scheduled">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <span class="stat-label">การจองล่วงหน้า</span>
          <span class="stat-value">{{ formatNumber(stats.scheduledRides) }}</span>
        </div>

        <div class="stat-card">
          <div class="stat-icon corporate">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <span class="stat-label">บริษัทที่ใช้งาน</span>
          <span class="stat-value">{{ formatNumber(stats.activeCompanies) }}</span>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="section">
        <div class="section-header">
          <h2>ออเดอร์ล่าสุด</h2>
          <router-link to="/admin/orders" class="view-all">ดูทั้งหมด</router-link>
        </div>

        <div class="orders-list">
          <div v-for="order in recentOrders" :key="order.id" class="order-item">
            <div class="order-icon" :class="order.type">
              <svg v-if="order.type === 'ride'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
              </svg>
              <svg v-else-if="order.type === 'delivery'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
            </div>
            <div class="order-info">
              <span class="order-id">{{ order.tracking_id }}</span>
              <span class="order-user">{{ order.users?.name || 'ไม่ระบุ' }}</span>
            </div>
            <div class="order-meta">
              <span class="order-status" :style="{ color: getStatusColor(order.status) }">{{ getStatusText(order.status) }}</span>
              <span class="order-time">{{ formatDate(order.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.subtitle {
  color: #6b6b6b;
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.stat-card.highlight {
  background: linear-gradient(135deg, #000 0%, #333 100%);
  color: #fff;
}

.stat-card.highlight .stat-label { color: rgba(255,255,255,0.7); }
.stat-card.highlight .stat-icon { background: rgba(255,255,255,0.15); color: #fff; }

.stat-card.warning { border-left: 3px solid #ffc043; }
.stat-card.alert { border-left: 3px solid #e11900; }

.skeleton-card {
  min-height: 120px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.stat-icon.users { background: #e8f4fd; color: #276ef1; }
.stat-icon.providers { background: #f0f0f0; color: #000; }
.stat-icon.rides { background: #e6f7ed; color: #05944f; }
.stat-icon.delivery { background: #fff3e0; color: #f57c00; }
.stat-icon.shopping { background: #fce4ec; color: #e91e63; }
.stat-icon.revenue { background: rgba(255,255,255,0.2); color: #fff; }
.stat-icon.pending { background: #fff8e1; color: #ffc043; }
.stat-icon.tickets { background: #ffebee; color: #e11900; }
.stat-icon.subscription { background: #ede7f6; color: #673ab7; }
.stat-icon.insurance { background: #e3f2fd; color: #1976d2; }
.stat-icon.scheduled { background: #e8f5e9; color: #388e3c; }
.stat-icon.corporate { background: #fce4ec; color: #c2185b; }

.stat-label {
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
}

.stat-sub {
  font-size: 11px;
  color: #6b6b6b;
  margin-top: 4px;
}

.stat-sub.active {
  color: #276ef1;
}

.section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.view-all {
  font-size: 14px;
  color: #276ef1;
  text-decoration: none;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 10px;
  transition: background 0.2s;
}

.order-item:hover {
  background: #f0f0f0;
}

.order-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.order-icon.ride { background: #e6f7ed; color: #05944f; }
.order-icon.delivery { background: #fff3e0; color: #f57c00; }
.order-icon.shopping { background: #fce4ec; color: #e91e63; }

.order-info {
  flex: 1;
  min-width: 0;
}

.order-id {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-user {
  display: block;
  font-size: 12px;
  color: #6b6b6b;
}

.order-meta {
  text-align: right;
  flex-shrink: 0;
}

.order-status {
  display: block;
  font-size: 12px;
  font-weight: 500;
}

.order-time {
  display: block;
  font-size: 11px;
  color: #999;
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1024px) {
  .dashboard {
    padding: 32px;
  }

  .page-header h1 {
    font-size: 28px;
  }
}
</style>
