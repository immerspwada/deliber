<!--
  Feature: F60 - Admin Tips View
  
  หน้าจัดการทิปสำหรับ Admin
  - ดูรายการทิปทั้งหมด
  - สถิติทิป
  - ทิปรายคนขับ
-->
<template>
  <AdminLayout>
    <div class="tips-view">
      <!-- Header -->
      <div class="page-header">
        <h1>ทิป</h1>
        <div class="header-actions">
          <select v-model="dateRange" class="date-select">
            <option value="today">วันนี้</option>
            <option value="week">7 วันที่ผ่านมา</option>
            <option value="month">30 วันที่ผ่านมา</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">฿{{ stats.totalTips.toLocaleString() }}</div>
            <div class="stat-label">ทิปรวมทั้งหมด</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon count">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.tipCount }}</div>
            <div class="stat-label">จำนวนครั้ง</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon avg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="20" x2="12" y2="10"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">฿{{ stats.averageTip }}</div>
            <div class="stat-label">ทิปเฉลี่ย</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon rate">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.tipRate }}%</div>
            <div class="stat-label">อัตราการให้ทิป</div>
          </div>
        </div>
      </div>

      <!-- Top Tipped Providers -->
      <div class="section">
        <h2>คนขับที่ได้รับทิปมากที่สุด</h2>
        <div class="top-providers">
          <div 
            v-for="(provider, index) in topProviders" 
            :key="provider.id"
            class="provider-row"
          >
            <div class="rank">{{ index + 1 }}</div>
            <div class="provider-avatar">
              {{ provider.name.charAt(0) }}
            </div>
            <div class="provider-info">
              <div class="provider-name">{{ provider.name }}</div>
              <div class="provider-stats">{{ provider.tipCount }} ครั้ง</div>
            </div>
            <div class="provider-total">฿{{ provider.totalTips.toLocaleString() }}</div>
          </div>
        </div>
      </div>

      <!-- Recent Tips -->
      <div class="section">
        <h2>ทิปล่าสุด</h2>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ลูกค้า</th>
                <th>คนขับ</th>
                <th>ค่าโดยสาร</th>
                <th>ทิป</th>
                <th>%</th>
                <th>วันที่</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tip in recentTips" :key="tip.id">
                <td class="id-cell">{{ tip.trackingId }}</td>
                <td>{{ tip.customerName }}</td>
                <td>{{ tip.providerName }}</td>
                <td>฿{{ tip.fare }}</td>
                <td class="tip-amount">฿{{ tip.amount }}</td>
                <td>{{ tip.percentage }}%</td>
                <td>{{ formatDate(tip.date) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tip Distribution Chart -->
      <div class="section">
        <h2>การกระจายทิป</h2>
        <div class="distribution-chart">
          <div 
            v-for="range in tipDistribution" 
            :key="range.label"
            class="distribution-bar"
          >
            <div class="bar-label">{{ range.label }}</div>
            <div class="bar-track">
              <div 
                class="bar-fill" 
                :style="{ width: `${range.percentage}%` }"
              ></div>
            </div>
            <div class="bar-value">{{ range.count }} ({{ range.percentage }}%)</div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
/**
 * Admin Tips View - F60
 * จัดการทิปสำหรับ Admin
 * 
 * Memory Optimization: Task 17
 * - Cleans up tips data on unmount
 * - Resets stats and filters
 */
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdminCleanup } from '../composables/useAdminCleanup'

// Initialize cleanup utility
const { addCleanup } = useAdminCleanup()

const dateRange = ref('week')

const stats = ref({
  totalTips: 0,
  tipCount: 0,
  averageTip: 0,
  tipRate: 0
})

const topProviders = ref<any[]>([])
const recentTips = ref<any[]>([])
const tipDistribution = ref<any[]>([])

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Register cleanup - Task 17
addCleanup(() => {
  stats.value = { totalTips: 0, tipCount: 0, averageTip: 0, tipRate: 0 }
  topProviders.value = []
  recentTips.value = []
  tipDistribution.value = []
  dateRange.value = 'week'
  console.log('[AdminTipsView] Cleanup complete')
})

onMounted(() => {
  // Demo data
  stats.value = {
    totalTips: 45680,
    tipCount: 1523,
    averageTip: 30,
    tipRate: 42
  }

  topProviders.value = [
    { id: '1', name: 'สมชาย ใจดี', tipCount: 156, totalTips: 4680 },
    { id: '2', name: 'สมศักดิ์ รถดี', tipCount: 142, totalTips: 4260 },
    { id: '3', name: 'สมหญิง ขับเก่ง', tipCount: 128, totalTips: 3840 },
    { id: '4', name: 'สมปอง ส่งไว', tipCount: 115, totalTips: 3450 },
    { id: '5', name: 'สมใจ บริการดี', tipCount: 98, totalTips: 2940 }
  ]

  recentTips.value = [
    { id: '1', trackingId: 'RID-001', customerName: 'ลูกค้า A', providerName: 'สมชาย ใจดี', fare: 150, amount: 20, percentage: 13, date: new Date() },
    { id: '2', trackingId: 'RID-002', customerName: 'ลูกค้า B', providerName: 'สมศักดิ์ รถดี', fare: 280, amount: 50, percentage: 18, date: new Date(Date.now() - 3600000) },
    { id: '3', trackingId: 'RID-003', customerName: 'ลูกค้า C', providerName: 'สมหญิง ขับเก่ง', fare: 95, amount: 10, percentage: 11, date: new Date(Date.now() - 7200000) },
    { id: '4', trackingId: 'DEL-001', customerName: 'ลูกค้า D', providerName: 'สมปอง ส่งไว', fare: 60, amount: 20, percentage: 33, date: new Date(Date.now() - 10800000) },
    { id: '5', trackingId: 'RID-004', customerName: 'ลูกค้า E', providerName: 'สมใจ บริการดี', fare: 420, amount: 100, percentage: 24, date: new Date(Date.now() - 14400000) }
  ]

  tipDistribution.value = [
    { label: '฿10', count: 456, percentage: 30 },
    { label: '฿20', count: 532, percentage: 35 },
    { label: '฿50', count: 304, percentage: 20 },
    { label: '฿100+', count: 231, percentage: 15 }
  ]
})
</script>

<style scoped>
.tips-view {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #000000;
}

.date-select {
  padding: 10px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fee2e2;
  border-radius: 12px;
  color: #e11900;
}

.stat-icon.count {
  background: #dbeafe;
  color: #276ef1;
}

.stat-icon.avg {
  background: #dcfce7;
  color: #22c55e;
}

.stat-icon.rate {
  background: #fef3c7;
  color: #f59e0b;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
}

.stat-label {
  font-size: 13px;
  color: #6b6b6b;
}

/* Sections */
.section {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.section h2 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
}

/* Top Providers */
.top-providers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.provider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f6f6f6;
  border-radius: 8px;
}

.rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
  color: #ffffff;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
}

.provider-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e5e5;
  border-radius: 50%;
  font-size: 16px;
  font-weight: 600;
  color: #000000;
}

.provider-info {
  flex: 1;
}

.provider-name {
  font-size: 14px;
  font-weight: 500;
  color: #000000;
}

.provider-stats {
  font-size: 12px;
  color: #6b6b6b;
}

.provider-total {
  font-size: 16px;
  font-weight: 600;
  color: #22c55e;
}

/* Table */
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
  font-size: 13px;
  font-weight: 600;
  color: #6b6b6b;
  background: #f6f6f6;
}

.data-table td {
  font-size: 14px;
  color: #000000;
}

.id-cell {
  font-family: monospace;
  font-size: 12px;
}

.tip-amount {
  color: #22c55e;
  font-weight: 600;
}

/* Distribution Chart */
.distribution-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.distribution-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  width: 60px;
  font-size: 14px;
  font-weight: 500;
  color: #000000;
}

.bar-track {
  flex: 1;
  height: 24px;
  background: #f6f6f6;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #000000;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.bar-value {
  width: 100px;
  font-size: 13px;
  color: #6b6b6b;
  text-align: right;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
