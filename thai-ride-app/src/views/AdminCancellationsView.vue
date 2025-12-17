<!--
  Feature: F55 - Admin Cancellations View
  
  หน้าจัดการการยกเลิกสำหรับ Admin
  - ดูรายการยกเลิกทั้งหมด
  - ดูเหตุผลการยกเลิก
  - จัดการ refund
  - ดูสถิติการยกเลิก
-->
<template>
  <AdminLayout>
    <div class="cancellations-view">
      <!-- Header -->
      <div class="page-header">
        <h1>การยกเลิก</h1>
        <div class="header-actions">
          <button class="btn-secondary" @click="exportData">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalCancellations }}</div>
            <div class="stat-label">ยกเลิกทั้งหมด</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon customer">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.byCustomer }}</div>
            <div class="stat-label">โดยลูกค้า</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon provider">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 17h14v-5l-2-4H7l-2 4v5z"/>
              <circle cx="7.5" cy="17" r="1.5"/>
              <circle cx="16.5" cy="17" r="1.5"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.byProvider }}</div>
            <div class="stat-label">โดยคนขับ</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon fee">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">฿{{ stats.totalFees.toLocaleString() }}</div>
            <div class="stat-label">ค่าธรรมเนียมรวม</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="filter-group">
          <select v-model="filters.serviceType">
            <option value="">ทุกบริการ</option>
            <option value="ride">เรียกรถ</option>
            <option value="delivery">ส่งของ</option>
            <option value="shopping">ซื้อของ</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filters.cancelledBy">
            <option value="">ยกเลิกโดย</option>
            <option value="customer">ลูกค้า</option>
            <option value="provider">คนขับ</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filters.dateRange">
            <option value="today">วันนี้</option>
            <option value="week">7 วันที่ผ่านมา</option>
            <option value="month">30 วันที่ผ่านมา</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>
        <div class="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="ค้นหา..."
          />
        </div>
      </div>

      <!-- Cancellations Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>รหัส</th>
              <th>บริการ</th>
              <th>ลูกค้า</th>
              <th>คนขับ</th>
              <th>เหตุผล</th>
              <th>ยกเลิกโดย</th>
              <th>ค่าธรรมเนียม</th>
              <th>วันที่</th>
              <th>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredCancellations" :key="item.id">
              <td class="id-cell">{{ item.trackingId }}</td>
              <td>
                <span class="service-badge" :class="item.serviceType">
                  {{ getServiceLabel(item.serviceType) }}
                </span>
              </td>
              <td>{{ item.customerName }}</td>
              <td>{{ item.providerName || '-' }}</td>
              <td>
                <span class="reason-text">{{ item.reasonLabel }}</span>
                <span v-if="item.note" class="reason-note">{{ item.note }}</span>
              </td>
              <td>
                <span class="cancelled-by" :class="item.cancelledBy">
                  {{ item.cancelledBy === 'customer' ? 'ลูกค้า' : 'คนขับ' }}
                </span>
              </td>
              <td>
                <span v-if="item.fee > 0" class="fee-amount">฿{{ item.fee }}</span>
                <span v-else class="no-fee">ฟรี</span>
              </td>
              <td>{{ formatDate(item.cancelledAt) }}</td>
              <td>
                <div class="action-buttons">
                  <button class="action-btn" @click="viewDetails(item)" title="ดูรายละเอียด">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <button 
                    v-if="item.fee > 0 && !item.refunded" 
                    class="action-btn refund" 
                    @click="processRefund(item)"
                    title="คืนเงิน"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23,4 23,10 17,10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="filteredCancellations.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <p>ไม่พบรายการยกเลิก</p>
        </div>
      </div>

      <!-- Detail Modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="selectedItem" class="modal-overlay" @click.self="selectedItem = null">
            <div class="modal-content">
              <div class="modal-header">
                <h3>รายละเอียดการยกเลิก</h3>
                <button class="close-btn" @click="selectedItem = null">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div class="modal-body">
                <div class="detail-row">
                  <span class="label">รหัส:</span>
                  <span class="value">{{ selectedItem.trackingId }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">บริการ:</span>
                  <span class="value">{{ getServiceLabel(selectedItem.serviceType) }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">ลูกค้า:</span>
                  <span class="value">{{ selectedItem.customerName }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">คนขับ:</span>
                  <span class="value">{{ selectedItem.providerName || '-' }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">เหตุผล:</span>
                  <span class="value">{{ selectedItem.reasonLabel }}</span>
                </div>
                <div v-if="selectedItem.note" class="detail-row">
                  <span class="label">หมายเหตุ:</span>
                  <span class="value">{{ selectedItem.note }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">ยกเลิกโดย:</span>
                  <span class="value">{{ selectedItem.cancelledBy === 'customer' ? 'ลูกค้า' : 'คนขับ' }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">ค่าธรรมเนียม:</span>
                  <span class="value">฿{{ selectedItem.fee }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">วันที่ยกเลิก:</span>
                  <span class="value">{{ formatDateTime(selectedItem.cancelledAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'

interface CancellationItem {
  id: string
  trackingId: string
  serviceType: 'ride' | 'delivery' | 'shopping'
  customerName: string
  providerName?: string
  reason: string
  reasonLabel: string
  note?: string
  cancelledBy: 'customer' | 'provider'
  fee: number
  refunded: boolean
  cancelledAt: Date
}

const cancellations = ref<CancellationItem[]>([])
const selectedItem = ref<CancellationItem | null>(null)
const searchQuery = ref('')
const filters = ref({
  serviceType: '',
  cancelledBy: '',
  dateRange: 'week'
})

const stats = computed(() => {
  return {
    totalCancellations: cancellations.value.length,
    byCustomer: cancellations.value.filter(c => c.cancelledBy === 'customer').length,
    byProvider: cancellations.value.filter(c => c.cancelledBy === 'provider').length,
    totalFees: cancellations.value.reduce((sum, c) => sum + c.fee, 0)
  }
})

const filteredCancellations = computed(() => {
  return cancellations.value.filter(item => {
    if (filters.value.serviceType && item.serviceType !== filters.value.serviceType) return false
    if (filters.value.cancelledBy && item.cancelledBy !== filters.value.cancelledBy) return false
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      return item.trackingId.toLowerCase().includes(query) ||
             item.customerName.toLowerCase().includes(query) ||
             (item.providerName?.toLowerCase().includes(query) || false)
    }
    return true
  })
})

const getServiceLabel = (type: string): string => {
  switch (type) {
    case 'ride': return 'เรียกรถ'
    case 'delivery': return 'ส่งของ'
    case 'shopping': return 'ซื้อของ'
    default: return type
  }
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
}

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('th-TH')
}

const viewDetails = (item: CancellationItem) => {
  selectedItem.value = item
}

const processRefund = (item: CancellationItem) => {
  if (confirm(`ยืนยันคืนเงิน ฿${item.fee} ให้ลูกค้า?`)) {
    item.refunded = true
    alert('คืนเงินเรียบร้อยแล้ว')
  }
}

const exportData = () => {
  alert('Export ข้อมูลเรียบร้อย')
}

onMounted(() => {
  // Demo data
  cancellations.value = [
    {
      id: '1',
      trackingId: 'RID-20251217-001',
      serviceType: 'ride',
      customerName: 'สมชาย ใจดี',
      providerName: 'สมศักดิ์ รถดี',
      reason: 'driver_too_far',
      reasonLabel: 'คนขับอยู่ไกลเกินไป',
      cancelledBy: 'customer',
      fee: 0,
      refunded: false,
      cancelledAt: new Date()
    },
    {
      id: '2',
      trackingId: 'RID-20251217-002',
      serviceType: 'ride',
      customerName: 'สมหญิง รักสวย',
      providerName: 'สมศักดิ์ รถดี',
      reason: 'customer_not_found',
      reasonLabel: 'หาลูกค้าไม่เจอ',
      cancelledBy: 'provider',
      fee: 20,
      refunded: false,
      cancelledAt: new Date(Date.now() - 3600000)
    },
    {
      id: '3',
      trackingId: 'DEL-20251217-001',
      serviceType: 'delivery',
      customerName: 'สมปอง ส่งไว',
      reason: 'changed_mind',
      reasonLabel: 'เปลี่ยนใจ',
      cancelledBy: 'customer',
      fee: 0,
      refunded: false,
      cancelledAt: new Date(Date.now() - 7200000)
    }
  ]
})
</script>

<style scoped>
.cancellations-view {
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

.btn-secondary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #000000;
  cursor: pointer;
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

.stat-icon.customer {
  background: #dbeafe;
  color: #276ef1;
}

.stat-icon.provider {
  background: #fef3c7;
  color: #f59e0b;
}

.stat-icon.fee {
  background: #dcfce7;
  color: #22c55e;
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

/* Filters */
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-group select {
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  flex: 1;
  max-width: 300px;
}

.search-box input {
  flex: 1;
  padding: 10px 0;
  border: none;
  font-size: 14px;
}

.search-box input:focus {
  outline: none;
}

/* Table */
.table-container {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e5e5;
}

.data-table th {
  background: #f6f6f6;
  font-size: 13px;
  font-weight: 600;
  color: #6b6b6b;
}

.data-table td {
  font-size: 14px;
  color: #000000;
}

.id-cell {
  font-family: monospace;
  font-size: 12px;
}

.service-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.service-badge.ride {
  background: #dbeafe;
  color: #276ef1;
}

.service-badge.delivery {
  background: #fef3c7;
  color: #f59e0b;
}

.service-badge.shopping {
  background: #dcfce7;
  color: #22c55e;
}

.reason-text {
  display: block;
}

.reason-note {
  display: block;
  font-size: 12px;
  color: #6b6b6b;
  margin-top: 2px;
}

.cancelled-by {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.cancelled-by.customer {
  background: #dbeafe;
  color: #276ef1;
}

.cancelled-by.provider {
  background: #fef3c7;
  color: #f59e0b;
}

.fee-amount {
  color: #e11900;
  font-weight: 500;
}

.no-fee {
  color: #22c55e;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px;
  background: #f6f6f6;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #6b6b6b;
}

.action-btn:hover {
  background: #e5e5e5;
  color: #000000;
}

.action-btn.refund {
  color: #22c55e;
}

.empty-state {
  padding: 48px;
  text-align: center;
  color: #6b6b6b;
}

.empty-state svg {
  opacity: 0.5;
  margin-bottom: 16px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b6b6b;
}

.modal-body {
  padding: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row .label {
  color: #6b6b6b;
}

.detail-row .value {
  font-weight: 500;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
