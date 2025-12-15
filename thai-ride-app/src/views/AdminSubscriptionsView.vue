<script setup lang="ts">
import { ref, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'

// Mock data
const subscriptions = ref([
  { id: '1', user_name: 'สมชาย ใจดี', plan: 'Premium', status: 'active', started_at: '2024-12-01', expires_at: '2025-01-01', amount: 599 },
  { id: '2', user_name: 'สมหญิง รักดี', plan: 'Plus', status: 'active', started_at: '2024-11-15', expires_at: '2024-12-15', amount: 299 },
  { id: '3', user_name: 'วิชัย มั่งมี', plan: 'Basic', status: 'cancelled', started_at: '2024-10-01', expires_at: '2024-11-01', amount: 99 },
])

const plans = ref([
  { id: '1', name: 'Basic', name_th: 'เบสิค', price: 99, subscribers: 150, revenue: 14850 },
  { id: '2', name: 'Plus', name_th: 'พลัส', price: 299, subscribers: 89, revenue: 26611 },
  { id: '3', name: 'Premium', name_th: 'พรีเมียม', price: 599, subscribers: 45, revenue: 26955 },
  { id: '4', name: 'Unlimited', name_th: 'ไม่จำกัด', price: 1299, subscribers: 12, revenue: 15588 },
])

const activeTab = ref<'subscriptions' | 'plans'>('subscriptions')
const searchQuery = ref('')
const statusFilter = ref('all')

const filteredSubscriptions = computed(() => {
  return subscriptions.value.filter(s => {
    const matchSearch = s.user_name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchStatus = statusFilter.value === 'all' || s.status === statusFilter.value
    return matchSearch && matchStatus
  })
})

const totalRevenue = computed(() => plans.value.reduce((sum, p) => sum + p.revenue, 0))
const totalSubscribers = computed(() => plans.value.reduce((sum, p) => sum + p.subscribers, 0))

const getStatusClass = (status: string) => {
  return {
    'active': 'status-active',
    'cancelled': 'status-cancelled',
    'expired': 'status-expired'
  }[status] || ''
}

const getStatusText = (status: string) => {
  return {
    'active': 'ใช้งาน',
    'cancelled': 'ยกเลิก',
    'expired': 'หมดอายุ'
  }[status] || status
}
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการแพ็คเกจสมาชิก</h1>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalSubscribers }}</span>
            <span class="stat-label">สมาชิกทั้งหมด</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon revenue">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">฿{{ totalRevenue.toLocaleString() }}</span>
            <span class="stat-label">รายได้รายเดือน</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button :class="['tab', { active: activeTab === 'subscriptions' }]" @click="activeTab = 'subscriptions'">
          รายการสมาชิก
        </button>
        <button :class="['tab', { active: activeTab === 'plans' }]" @click="activeTab = 'plans'">
          แพ็คเกจ
        </button>
      </div>

      <!-- Subscriptions Tab -->
      <div v-if="activeTab === 'subscriptions'" class="tab-content">
        <div class="filters">
          <input v-model="searchQuery" type="text" placeholder="ค้นหาชื่อ..." class="search-input" />
          <select v-model="statusFilter" class="filter-select">
            <option value="all">ทุกสถานะ</option>
            <option value="active">ใช้งาน</option>
            <option value="cancelled">ยกเลิก</option>
            <option value="expired">หมดอายุ</option>
          </select>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ผู้ใช้</th>
                <th>แพ็คเกจ</th>
                <th>สถานะ</th>
                <th>เริ่มต้น</th>
                <th>หมดอายุ</th>
                <th>ราคา</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in filteredSubscriptions" :key="sub.id">
                <td>{{ sub.user_name }}</td>
                <td>{{ sub.plan }}</td>
                <td><span :class="['status-badge', getStatusClass(sub.status)]">{{ getStatusText(sub.status) }}</span></td>
                <td>{{ new Date(sub.started_at).toLocaleDateString('th-TH') }}</td>
                <td>{{ new Date(sub.expires_at).toLocaleDateString('th-TH') }}</td>
                <td>฿{{ sub.amount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Plans Tab -->
      <div v-if="activeTab === 'plans'" class="tab-content">
        <div class="plans-grid">
          <div v-for="plan in plans" :key="plan.id" class="plan-card">
            <div class="plan-header">
              <h3>{{ plan.name_th }}</h3>
              <span class="plan-price">฿{{ plan.price }}/เดือน</span>
            </div>
            <div class="plan-stats">
              <div class="plan-stat">
                <span class="stat-value">{{ plan.subscribers }}</span>
                <span class="stat-label">สมาชิก</span>
              </div>
              <div class="plan-stat">
                <span class="stat-value">฿{{ plan.revenue.toLocaleString() }}</span>
                <span class="stat-label">รายได้</span>
              </div>
            </div>
            <button class="edit-btn">แก้ไข</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: #f0f0f0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-icon.revenue {
  background: #dcfce7;
  color: #166534;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 14px;
  color: #6b6b6b;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  padding: 12px 24px;
  border: none;
  background: #f0f0f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.tab.active {
  background: #000;
  color: #fff;
}

.tab-content {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e5e5;
}

.data-table th {
  font-size: 12px;
  font-weight: 600;
  color: #6b6b6b;
  text-transform: uppercase;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background: #dcfce7;
  color: #166534;
}

.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.status-expired {
  background: #f0f0f0;
  color: #6b6b6b;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.plan-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 20px;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.plan-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.plan-price {
  font-size: 14px;
  color: #6b6b6b;
}

.plan-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.plan-stat {
  display: flex;
  flex-direction: column;
}

.plan-stat .stat-value {
  font-size: 20px;
}

.plan-stat .stat-label {
  font-size: 12px;
}

.edit-btn {
  width: 100%;
  padding: 10px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
}

.edit-btn:hover {
  background: #f6f6f6;
}
</style>
