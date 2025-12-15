<script setup lang="ts">
import { ref, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'

const activeTab = ref<'claims' | 'plans' | 'users'>('claims')

// Mock data
const claims = ref([
  { id: '1', tracking_id: 'SUP-20241215-000001', user_name: 'สมชาย ใจดี', claim_type: 'accident', claimed_amount: 15000, status: 'submitted', created_at: '2024-12-14' },
  { id: '2', tracking_id: 'SUP-20241215-000002', user_name: 'สมหญิง รักดี', claim_type: 'medical', claimed_amount: 5000, status: 'reviewing', created_at: '2024-12-13' },
  { id: '3', tracking_id: 'SUP-20241214-000003', user_name: 'วิชัย มั่งมี', claim_type: 'property_damage', claimed_amount: 8000, status: 'approved', approved_amount: 7500, created_at: '2024-12-10' },
])

const plans = ref([
  { id: '1', name: 'Basic Protection', name_th: 'คุ้มครองพื้นฐาน', price: 5, max_coverage: 50000, subscribers: 320, is_active: true },
  { id: '2', name: 'Standard Protection', name_th: 'คุ้มครองมาตรฐาน', price: 15, max_coverage: 200000, subscribers: 180, is_active: true },
  { id: '3', name: 'Premium Protection', name_th: 'คุ้มครองพรีเมียม', price: 29, max_coverage: 500000, subscribers: 75, is_active: true },
  { id: '4', name: 'Comprehensive', name_th: 'คุ้มครองสูงสุด', price: 49, max_coverage: 1000000, subscribers: 25, is_active: true },
])

const statusFilter = ref('all')
const selectedClaim = ref<any>(null)
const showClaimModal = ref(false)

const filteredClaims = computed(() => {
  if (statusFilter.value === 'all') return claims.value
  return claims.value.filter(c => c.status === statusFilter.value)
})

const totalClaims = computed(() => claims.value.length)
const pendingClaims = computed(() => claims.value.filter(c => c.status === 'submitted' || c.status === 'reviewing').length)
const totalClaimAmount = computed(() => claims.value.reduce((sum, c) => sum + c.claimed_amount, 0))

const getStatusClass = (status: string) => ({
  'submitted': 'status-pending',
  'reviewing': 'status-reviewing',
  'approved': 'status-approved',
  'rejected': 'status-rejected',
  'paid': 'status-paid'
}[status] || '')

const getStatusText = (status: string) => ({
  'submitted': 'รอตรวจสอบ',
  'reviewing': 'กำลังตรวจสอบ',
  'approved': 'อนุมัติ',
  'rejected': 'ปฏิเสธ',
  'paid': 'จ่ายแล้ว'
}[status] || status)

const getClaimTypeText = (type: string) => ({
  'accident': 'อุบัติเหตุ',
  'medical': 'ค่ารักษา',
  'property_damage': 'ทรัพย์สินเสียหาย',
  'theft': 'ของหาย',
  'injury': 'บาดเจ็บ',
  'other': 'อื่นๆ'
}[type] || type)

const viewClaim = (claim: any) => {
  selectedClaim.value = claim
  showClaimModal.value = true
}

const approveClaim = (claimId: string) => {
  const claim = claims.value.find(c => c.id === claimId)
  if (claim) {
    claim.status = 'approved'
    claim.approved_amount = claim.claimed_amount
  }
  showClaimModal.value = false
}

const rejectClaim = (claimId: string) => {
  const claim = claims.value.find(c => c.id === claimId)
  if (claim) claim.status = 'rejected'
  showClaimModal.value = false
}
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการประกันภัย</h1>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalClaims }}</span>
            <span class="stat-label">เคลมทั้งหมด</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon pending">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ pendingClaims }}</span>
            <span class="stat-label">รอดำเนินการ</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amount">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">฿{{ totalClaimAmount.toLocaleString() }}</span>
            <span class="stat-label">ยอดเคลมรวม</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button :class="['tab', { active: activeTab === 'claims' }]" @click="activeTab = 'claims'">
          เคลมประกัน
        </button>
        <button :class="['tab', { active: activeTab === 'plans' }]" @click="activeTab = 'plans'">
          แผนประกัน
        </button>
      </div>

      <!-- Claims Tab -->
      <div v-if="activeTab === 'claims'" class="tab-content">
        <div class="filters">
          <select v-model="statusFilter" class="filter-select">
            <option value="all">ทุกสถานะ</option>
            <option value="submitted">รอตรวจสอบ</option>
            <option value="reviewing">กำลังตรวจสอบ</option>
            <option value="approved">อนุมัติ</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tracking ID</th>
                <th>ผู้เคลม</th>
                <th>ประเภท</th>
                <th>จำนวนเงิน</th>
                <th>สถานะ</th>
                <th>วันที่</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="claim in filteredClaims" :key="claim.id">
                <td class="tracking-id">{{ claim.tracking_id }}</td>
                <td>{{ claim.user_name }}</td>
                <td>{{ getClaimTypeText(claim.claim_type) }}</td>
                <td>฿{{ claim.claimed_amount.toLocaleString() }}</td>
                <td><span :class="['status-badge', getStatusClass(claim.status)]">{{ getStatusText(claim.status) }}</span></td>
                <td>{{ new Date(claim.created_at).toLocaleDateString('th-TH') }}</td>
                <td>
                  <button @click="viewClaim(claim)" class="action-btn">ดู</button>
                </td>
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
              <span :class="['plan-status', { active: plan.is_active }]">
                {{ plan.is_active ? 'เปิดใช้งาน' : 'ปิด' }}
              </span>
            </div>
            <div class="plan-details">
              <div class="detail-row">
                <span>ราคา</span>
                <span>฿{{ plan.price }}/เที่ยว</span>
              </div>
              <div class="detail-row">
                <span>คุ้มครองสูงสุด</span>
                <span>฿{{ plan.max_coverage.toLocaleString() }}</span>
              </div>
              <div class="detail-row">
                <span>ผู้ใช้งาน</span>
                <span>{{ plan.subscribers }} คน</span>
              </div>
            </div>
            <button class="edit-btn">แก้ไข</button>
          </div>
        </div>
      </div>

      <!-- Claim Detail Modal -->
      <div v-if="showClaimModal && selectedClaim" class="modal-overlay" @click="showClaimModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>รายละเอียดเคลม</h3>
            <button @click="showClaimModal = false" class="close-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="claim-info">
              <div class="info-row">
                <span class="label">Tracking ID</span>
                <span class="value">{{ selectedClaim.tracking_id }}</span>
              </div>
              <div class="info-row">
                <span class="label">ผู้เคลม</span>
                <span class="value">{{ selectedClaim.user_name }}</span>
              </div>
              <div class="info-row">
                <span class="label">ประเภท</span>
                <span class="value">{{ getClaimTypeText(selectedClaim.claim_type) }}</span>
              </div>
              <div class="info-row">
                <span class="label">จำนวนเงินที่เคลม</span>
                <span class="value">฿{{ selectedClaim.claimed_amount.toLocaleString() }}</span>
              </div>
              <div class="info-row">
                <span class="label">สถานะ</span>
                <span :class="['status-badge', getStatusClass(selectedClaim.status)]">{{ getStatusText(selectedClaim.status) }}</span>
              </div>
            </div>
          </div>
          <div v-if="selectedClaim.status === 'submitted' || selectedClaim.status === 'reviewing'" class="modal-footer">
            <button @click="rejectClaim(selectedClaim.id)" class="btn-danger">ปฏิเสธ</button>
            <button @click="approveClaim(selectedClaim.id)" class="btn-primary">อนุมัติ</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.admin-page { padding: 24px; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 600; }

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

.stat-icon svg { width: 24px; height: 24px; }
.stat-icon.pending { background: #fef3c7; color: #92400e; }
.stat-icon.amount { background: #dbeafe; color: #1e40af; }

.stat-value { display: block; font-size: 24px; font-weight: 700; }
.stat-label { font-size: 14px; color: #6b6b6b; }

.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tab {
  padding: 12px 24px;
  border: none;
  background: #f0f0f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.tab.active { background: #000; color: #fff; }

.tab-content { background: #fff; border-radius: 12px; padding: 20px; }

.filters { margin-bottom: 16px; }
.filter-select {
  padding: 10px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td {
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

.tracking-id { font-family: monospace; font-size: 12px; }

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.status-pending { background: #fef3c7; color: #92400e; }
.status-reviewing { background: #dbeafe; color: #1e40af; }
.status-approved { background: #dcfce7; color: #166534; }
.status-rejected { background: #fee2e2; color: #991b1b; }
.status-paid { background: #d1fae5; color: #065f46; }

.action-btn {
  padding: 6px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
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
.plan-header h3 { font-size: 16px; font-weight: 600; }
.plan-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #f0f0f0;
}
.plan-status.active { background: #dcfce7; color: #166534; }

.plan-details { margin-bottom: 16px; }
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}
.detail-row:last-child { border-bottom: none; }

.edit-btn {
  width: 100%;
  padding: 10px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e5e5;
}
.modal-header h3 { font-size: 18px; font-weight: 600; }
.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}
.close-btn svg { width: 20px; height: 20px; }

.modal-body { padding: 20px; }
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}
.info-row .label { color: #6b6b6b; }
.info-row .value { font-weight: 500; }

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e5e5e5;
}

.btn-primary {
  flex: 1;
  padding: 12px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-danger {
  flex: 1;
  padding: 12px;
  background: #fee2e2;
  color: #991b1b;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
</style>
