<script setup lang="ts">
import { ref, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const { addCleanup } = useAdminCleanup()

// Mock data
const companies = ref([
  { id: '1', name: 'บริษัท ABC จำกัด', status: 'active', employees: 45, credit_limit: 100000, current_balance: 25000 },
  { id: '2', name: 'บริษัท XYZ จำกัด', status: 'active', employees: 120, credit_limit: 500000, current_balance: 180000 },
  { id: '3', name: 'บริษัท DEF จำกัด', status: 'pending', employees: 0, credit_limit: 50000, current_balance: 0 },
])

const statusFilter = ref('all')
const searchQuery = ref('')

const filteredCompanies = computed(() => {
  return companies.value.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchStatus = statusFilter.value === 'all' || c.status === statusFilter.value
    return matchSearch && matchStatus
  })
})

const totalCompanies = computed(() => companies.value.length)
const activeCompanies = computed(() => companies.value.filter(c => c.status === 'active').length)
const totalEmployees = computed(() => companies.value.reduce((sum, c) => sum + c.employees, 0))

const getStatusClass = (status: string) => ({
  'active': 'status-active',
  'pending': 'status-pending',
  'suspended': 'status-suspended'
}[status] || '')

const getStatusText = (status: string) => ({
  'active': 'ใช้งาน',
  'pending': 'รออนุมัติ',
  'suspended': 'ระงับ'
}[status] || status)

// Cleanup on unmount
addCleanup(() => {
  statusFilter.value = 'all'
  searchQuery.value = ''
  console.log('[AdminCorporateView] Cleanup complete')
})
</script>

<template>
  <AdminLayout>
    <div class="admin-page">
      <div class="page-header">
        <h1>จัดการบัญชีองค์กร</h1>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalCompanies }}</span>
            <span class="stat-label">บริษัททั้งหมด</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon active">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ activeCompanies }}</span>
            <span class="stat-label">ใช้งานอยู่</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon users">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ totalEmployees }}</span>
            <span class="stat-label">พนักงานทั้งหมด</span>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="content-card">
        <div class="filters">
          <input v-model="searchQuery" type="text" placeholder="ค้นหาบริษัท..." class="search-input" />
          <select v-model="statusFilter" class="filter-select">
            <option value="all">ทุกสถานะ</option>
            <option value="active">ใช้งาน</option>
            <option value="pending">รออนุมัติ</option>
            <option value="suspended">ระงับ</option>
          </select>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>บริษัท</th>
                <th>สถานะ</th>
                <th>พนักงาน</th>
                <th>วงเงิน</th>
                <th>ยอดใช้</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="company in filteredCompanies" :key="company.id">
                <td class="company-name">{{ company.name }}</td>
                <td><span :class="['status-badge', getStatusClass(company.status)]">{{ getStatusText(company.status) }}</span></td>
                <td>{{ company.employees }}</td>
                <td>฿{{ company.credit_limit.toLocaleString() }}</td>
                <td>฿{{ company.current_balance.toLocaleString() }}</td>
                <td>
                  <button class="action-btn">จัดการ</button>
                </td>
              </tr>
            </tbody>
          </table>
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
.stat-icon.active { background: #dcfce7; color: #166534; }
.stat-icon.users { background: #dbeafe; color: #1e40af; }

.stat-value { display: block; font-size: 24px; font-weight: 700; }
.stat-label { font-size: 14px; color: #6b6b6b; }

.content-card { background: #fff; border-radius: 12px; padding: 20px; }

.filters { display: flex; gap: 12px; margin-bottom: 16px; }
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

.company-name { font-weight: 500; }

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.status-active { background: #dcfce7; color: #166534; }
.status-pending { background: #fef3c7; color: #92400e; }
.status-suspended { background: #fee2e2; color: #991b1b; }

.action-btn {
  padding: 6px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
}
</style>
