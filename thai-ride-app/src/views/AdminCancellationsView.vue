<script setup lang="ts">
/**
 * AdminCancellationsView - Cancellation Analytics Dashboard
 * 
 * Feature: F53 - Admin Cancellation Management
 * 
 * Shows cancellation statistics, trends, and detailed records
 */
import { ref, onMounted, computed } from 'vue'
import { useCancellationAnalytics, type CancellationRecord } from '../composables/useCancellationAnalytics'
import { AdminCard, AdminTable, AdminStatCard, AdminStatusBadge, AdminButton, AdminModal } from '../components/admin'

const {
  loading,
  cancellations,
  stats,
  reasonBreakdown,
  hourlyTrend,
  dailyTrend,
  fetchCancellations,
  fetchStats,
  fetchReasonBreakdown,
  fetchHourlyTrend,
  fetchDailyTrend
} = useCancellationAnalytics()

// Filters
const selectedService = ref('all')
const selectedPeriod = ref('30')
const selectedCancelledBy = ref('all')
const searchQuery = ref('')

// Detail modal
const showDetail = ref(false)
const selectedRecord = ref<CancellationRecord | null>(null)

// Date range
const dateRange = computed(() => {
  const days = parseInt(selectedPeriod.value)
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  }
})
</script>

// Filtered cancellations
const filteredCancellations = computed(() => {
  let result = cancellations.value
  
  if (selectedService.value !== 'all') {
    result = result.filter(c => c.serviceType === selectedService.value)
  }
  
  if (selectedCancelledBy.value !== 'all') {
    result = result.filter(c => c.cancelledBy === selectedCancelledBy.value)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(c => 
      c.trackingId?.toLowerCase().includes(q) ||
      c.customerName?.toLowerCase().includes(q) ||
      c.cancelReason?.toLowerCase().includes(q)
    )
  }
  
  return result
})

// Load data
const loadData = async () => {
  await Promise.all([
    fetchCancellations({
      serviceType: selectedService.value === 'all' ? undefined : selectedService.value,
      startDate: dateRange.value.startDate,
      endDate: dateRange.value.endDate,
      cancelledBy: selectedCancelledBy.value === 'all' ? undefined : selectedCancelledBy.value
    }),
    fetchStats(dateRange.value),
    fetchReasonBreakdown(),
    fetchHourlyTrend(),
    fetchDailyTrend(parseInt(selectedPeriod.value))
  ])
}

// View detail
const viewDetail = (record: CancellationRecord) => {
  selectedRecord.value = record
  showDetail.value = true
}

// Format helpers
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatPrice = (price: number) => `฿${price.toLocaleString()}`

const getCancelledByLabel = (by: string) => {
  const labels: Record<string, string> = {
    customer: 'ลูกค้า',
    provider: 'คนขับ',
    admin: 'แอดมิน',
    system: 'ระบบ'
  }
  return labels[by] || by
}

const getCancelledByVariant = (by: string) => {
  const variants: Record<string, string> = {
    customer: 'warning',
    provider: 'danger',
    admin: 'info',
    system: 'secondary'
  }
  return variants[by] || 'secondary'
}

const getServiceLabel = (type: string) => {
  const labels: Record<string, string> = {
    ride: 'เรียกรถ',
    delivery: 'ส่งของ',
    shopping: 'ซื้อของ',
    queue: 'จองคิว',
    moving: 'ขนย้าย',
    laundry: 'ซักผ้า'
  }
  return labels[type] || type
}

// Peak hour
const peakHour = computed(() => {
  if (!hourlyTrend.value.length) return null
  return hourlyTrend.value.reduce((max, h) => h.count > max.count ? h : max, hourlyTrend.value[0])
})

onMounted(loadData)
</script>

<template>
  <div class="cancellations-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>การยกเลิก</h1>
        <p>วิเคราะห์และจัดการการยกเลิกบริการ</p>
      </div>
      <AdminButton @click="loadData" :loading="loading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
        </svg>
        รีเฟรช
      </AdminButton>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid" v-if="stats">
      <AdminStatCard
        title="ยกเลิกทั้งหมด"
        :value="stats.totalCancellations"
        icon="x-circle"
        variant="danger"
      />
      <AdminStatCard
        title="โดยลูกค้า"
        :value="stats.byCustomer"
        :subtitle="`${stats.totalCancellations ? ((stats.byCustomer / stats.totalCancellations) * 100).toFixed(1) : 0}%`"
        icon="user"
        variant="warning"
      />
      <AdminStatCard
        title="โดยคนขับ"
        :value="stats.byProvider"
        :subtitle="`${stats.totalCancellations ? ((stats.byProvider / stats.totalCancellations) * 100).toFixed(1) : 0}%`"
        icon="truck"
        variant="info"
      />
      <AdminStatCard
        title="อัตราการยกเลิก"
        :value="`${stats.cancellationRate.toFixed(1)}%`"
        icon="percent"
        variant="secondary"
      />
    </div>

    <!-- Filters -->
    <AdminCard title="ตัวกรอง" class="filters-card">
      <div class="filters-row">
        <div class="filter-group">
          <label>ประเภทบริการ</label>
          <select v-model="selectedService" @change="loadData">
            <option value="all">ทั้งหมด</option>
            <option value="ride">เรียกรถ</option>
            <option value="delivery">ส่งของ</option>
            <option value="shopping">ซื้อของ</option>
          </select>
        </div>
        <div class="filter-group">
          <label>ช่วงเวลา</label>
          <select v-model="selectedPeriod" @change="loadData">
            <option value="7">7 วัน</option>
            <option value="30">30 วัน</option>
            <option value="90">90 วัน</option>
          </select>
        </div>
        <div class="filter-group">
          <label>ยกเลิกโดย</label>
          <select v-model="selectedCancelledBy" @change="loadData">
            <option value="all">ทั้งหมด</option>
            <option value="customer">ลูกค้า</option>
            <option value="provider">คนขับ</option>
            <option value="admin">แอดมิน</option>
          </select>
        </div>
        <div class="filter-group search">
          <label>ค้นหา</label>
          <input type="text" v-model="searchQuery" placeholder="Tracking ID, ชื่อลูกค้า...">
        </div>
      </div>
    </AdminCard>

    <!-- Analytics Row -->
    <div class="analytics-row">
      <!-- Reason Breakdown -->
      <AdminCard title="เหตุผลการยกเลิก" class="reason-card">
        <div v-if="reasonBreakdown.length" class="reason-list">
          <div v-for="item in reasonBreakdown.slice(0, 6)" :key="item.reason" class="reason-item">
            <div class="reason-info">
              <span class="reason-name">{{ item.reason }}</span>
              <span class="reason-count">{{ item.count }} ครั้ง</span>
            </div>
            <div class="reason-bar">
              <div class="reason-fill" :style="{ width: `${item.percentage}%` }"></div>
            </div>
            <span class="reason-percent">{{ item.percentage.toFixed(1) }}%</span>
          </div>
        </div>
        <div v-else class="empty-state">ไม่มีข้อมูล</div>
      </AdminCard>

      <!-- Hourly Trend -->
      <AdminCard title="ช่วงเวลาที่ยกเลิกบ่อย" class="hourly-card">
        <div v-if="hourlyTrend.length" class="hourly-chart">
          <div v-for="item in hourlyTrend" :key="item.hour" class="hour-bar-wrapper">
            <div 
              class="hour-bar" 
              :class="{ peak: peakHour && item.hour === peakHour.hour }"
              :style="{ height: `${Math.max(4, (item.count / (peakHour?.count || 1)) * 100)}%` }"
            >
              <span class="hour-count" v-if="item.count > 0">{{ item.count }}</span>
            </div>
            <span class="hour-label">{{ item.hour.toString().padStart(2, '0') }}</span>
          </div>
        </div>
        <div v-if="peakHour" class="peak-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          ช่วงเวลาที่ยกเลิกมากที่สุด: {{ peakHour.hour.toString().padStart(2, '0') }}:00 น. ({{ peakHour.count }} ครั้ง)
        </div>
      </AdminCard>
    </div>

    <!-- Cancellations Table -->
    <AdminCard title="รายการยกเลิก" :subtitle="`${filteredCancellations.length} รายการ`">
      <AdminTable
        :columns="[
          { key: 'trackingId', label: 'Tracking ID', width: '140px' },
          { key: 'serviceType', label: 'บริการ', width: '100px' },
          { key: 'customerName', label: 'ลูกค้า' },
          { key: 'cancelReason', label: 'เหตุผล' },
          { key: 'cancelledBy', label: 'ยกเลิกโดย', width: '100px' },
          { key: 'cancellationFee', label: 'ค่าธรรมเนียม', width: '120px' },
          { key: 'cancelledAt', label: 'เวลา', width: '160px' },
          { key: 'actions', label: '', width: '80px' }
        ]"
        :data="filteredCancellations"
        :loading="loading"
        empty-text="ไม่พบรายการยกเลิก"
      >
        <template #trackingId="{ row }">
          <span class="tracking-id">{{ row.trackingId || '-' }}</span>
        </template>
        <template #serviceType="{ row }">
          <span class="service-badge" :class="row.serviceType">
            {{ getServiceLabel(row.serviceType) }}
          </span>
        </template>
        <template #customerName="{ row }">
          <div class="customer-cell">
            <span class="name">{{ row.customerName }}</span>
            <span class="phone">{{ row.customerPhone }}</span>
          </div>
        </template>
        <template #cancelReason="{ row }">
          <span class="reason-text">{{ row.cancelReason }}</span>
        </template>
        <template #cancelledBy="{ row }">
          <AdminStatusBadge :variant="getCancelledByVariant(row.cancelledBy)">
            {{ getCancelledByLabel(row.cancelledBy) }}
          </AdminStatusBadge>
        </template>
        <template #cancellationFee="{ row }">
          <span :class="['fee', { 'has-fee': row.cancellationFee > 0 }]">
            {{ row.cancellationFee > 0 ? formatPrice(row.cancellationFee) : 'ฟรี' }}
          </span>
        </template>
        <template #cancelledAt="{ row }">
          <span class="date-text">{{ formatDate(row.cancelledAt) }}</span>
        </template>
        <template #actions="{ row }">
          <button class="action-btn" @click="viewDetail(row)" title="ดูรายละเอียด">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </template>
      </AdminTable>
    </AdminCard>

    <!-- Detail Modal -->
    <AdminModal v-model="showDetail" title="รายละเอียดการยกเลิก" size="md">
      <div v-if="selectedRecord" class="detail-content">
        <div class="detail-header">
          <span class="tracking">{{ selectedRecord.trackingId }}</span>
          <AdminStatusBadge :variant="getCancelledByVariant(selectedRecord.cancelledBy)">
            ยกเลิกโดย{{ getCancelledByLabel(selectedRecord.cancelledBy) }}
          </AdminStatusBadge>
        </div>
        
        <div class="detail-section">
          <h4>ข้อมูลลูกค้า</h4>
          <div class="info-row">
            <span class="label">ชื่อ</span>
            <span class="value">{{ selectedRecord.customerName }}</span>
          </div>
          <div class="info-row">
            <span class="label">เบอร์โทร</span>
            <span class="value">{{ selectedRecord.customerPhone || '-' }}</span>
          </div>
        </div>
        
        <div class="detail-section" v-if="selectedRecord.providerName">
          <h4>ข้อมูลคนขับ</h4>
          <div class="info-row">
            <span class="label">ชื่อ</span>
            <span class="value">{{ selectedRecord.providerName }}</span>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>รายละเอียดการยกเลิก</h4>
          <div class="info-row">
            <span class="label">เหตุผล</span>
            <span class="value highlight">{{ selectedRecord.cancelReason }}</span>
          </div>
          <div class="info-row">
            <span class="label">เวลายกเลิก</span>
            <span class="value">{{ formatDate(selectedRecord.cancelledAt) }}</span>
          </div>
          <div class="info-row">
            <span class="label">ค่าธรรมเนียม</span>
            <span class="value" :class="{ 'text-danger': selectedRecord.cancellationFee > 0 }">
              {{ selectedRecord.cancellationFee > 0 ? formatPrice(selectedRecord.cancellationFee) : 'ไม่มี' }}
            </span>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>ข้อมูลการเดินทาง</h4>
          <div class="info-row">
            <span class="label">จุดรับ</span>
            <span class="value">{{ selectedRecord.pickup || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">จุดหมาย</span>
            <span class="value">{{ selectedRecord.destination || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">ค่าโดยสารประมาณ</span>
            <span class="value">{{ formatPrice(selectedRecord.estimatedFare) }}</span>
          </div>
        </div>
      </div>
    </AdminModal>
  </div>
</template>

<style scoped>
.cancellations-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 4px;
}

.header-content p {
  font-size: 14px;
  color: #666666;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.filters-card {
  margin-bottom: 24px;
}

.filters-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
}

.filter-group.search {
  flex: 1;
  min-width: 200px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 500;
  color: #666666;
}

.filter-group select,
.filter-group input {
  padding: 10px 12px;
  border: 1.5px solid #E8E8E8;
  border-radius: 10px;
  font-size: 14px;
  background: #FFFFFF;
  transition: border-color 0.2s;
}

.filter-group select:focus,
.filter-group input:focus {
  outline: none;
  border-color: #00A86B;
}

.analytics-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 900px) {
  .analytics-row {
    grid-template-columns: 1fr;
  }
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reason-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reason-info {
  width: 140px;
  flex-shrink: 0;
}

.reason-name {
  display: block;
  font-size: 13px;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reason-count {
  font-size: 11px;
  color: #999999;
}

.reason-bar {
  flex: 1;
  height: 8px;
  background: #F0F0F0;
  border-radius: 4px;
  overflow: hidden;
}

.reason-fill {
  height: 100%;
  background: linear-gradient(90deg, #E53935, #FF7043);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.reason-percent {
  width: 50px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: #E53935;
}

.hourly-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
  padding-bottom: 24px;
}

.hour-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.hour-bar {
  width: 100%;
  max-width: 20px;
  background: #E8E8E8;
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: all 0.3s ease;
  margin-top: auto;
}

.hour-bar.peak {
  background: #E53935;
}

.hour-count {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 600;
  color: #666666;
}

.hour-label {
  font-size: 9px;
  color: #999999;
  margin-top: 4px;
}

.peak-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #FFF3E0;
  border-radius: 8px;
  font-size: 13px;
  color: #E65100;
  margin-top: 12px;
}

.tracking-id {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: #00A86B;
  font-weight: 500;
}

.service-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.service-badge.ride { background: #E3F2FD; color: #1565C0; }
.service-badge.delivery { background: #FFF3E0; color: #E65100; }
.service-badge.shopping { background: #F3E5F5; color: #7B1FA2; }

.customer-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.customer-cell .name {
  font-size: 13px;
  color: #1A1A1A;
}

.customer-cell .phone {
  font-size: 11px;
  color: #999999;
}

.reason-text {
  font-size: 13px;
  color: #666666;
}

.fee {
  font-size: 13px;
  color: #999999;
}

.fee.has-fee {
  color: #E53935;
  font-weight: 600;
}

.date-text {
  font-size: 12px;
  color: #666666;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #F5F5F5;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #E8E8E8;
}

.action-btn svg {
  width: 16px;
  height: 16px;
  color: #666666;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999999;
}

/* Detail Modal */
.detail-content {
  padding: 8px 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #F0F0F0;
  margin-bottom: 16px;
}

.detail-header .tracking {
  font-family: 'SF Mono', monospace;
  font-size: 16px;
  font-weight: 600;
  color: #00A86B;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: #999999;
  text-transform: uppercase;
  margin: 0 0 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #F5F5F5;
}

.info-row .label {
  font-size: 13px;
  color: #666666;
}

.info-row .value {
  font-size: 13px;
  color: #1A1A1A;
  font-weight: 500;
  text-align: right;
  max-width: 60%;
}

.info-row .value.highlight {
  color: #E53935;
}

.text-danger {
  color: #E53935 !important;
}
</style>
