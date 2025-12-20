<script setup lang="ts">
/**
 * Admin Data Management View
 * GDPR compliance, data export, archiving, soft delete
 */
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useDataManagement, type DataStatistics, type ExportRequest } from '../composables/useDataManagement'

const {
  statistics,
  exportRequests,
  loading,
  fetchStatistics,
  archiveOldRides,
  softDeleteUser,
  restoreUser,
  exportUserData,
  requestExport,
  fetchExportRequests,
  downloadAsJson,
  formatBytes
} = useDataManagement()

const activeTab = ref<'statistics' | 'exports' | 'archive' | 'gdpr'>('statistics')
const archiveDays = ref(365)
const archiveLoading = ref(false)
const archiveResult = ref<number | null>(null)

// GDPR
const gdprUserId = ref('')
const gdprLoading = ref(false)
const gdprData = ref<any>(null)

// Soft Delete
const deleteUserId = ref('')
const deleteLoading = ref(false)
const deleteResult = ref<string | null>(null)

// Export
const exportType = ref('rides')
const exportLoading = ref(false)

const adminId = localStorage.getItem('admin_token') || 'admin'

onMounted(async () => {
  await Promise.all([
    fetchStatistics(),
    fetchExportRequests()
  ])
})

const handleArchive = async () => {
  archiveLoading.value = true
  archiveResult.value = null
  try {
    const count = await archiveOldRides(archiveDays.value, adminId)
    archiveResult.value = count
  } finally {
    archiveLoading.value = false
  }
}

const handleGdprExport = async () => {
  if (!gdprUserId.value) return
  gdprLoading.value = true
  gdprData.value = null
  try {
    const data = await exportUserData(gdprUserId.value)
    gdprData.value = data
  } finally {
    gdprLoading.value = false
  }
}

const handleSoftDelete = async () => {
  if (!deleteUserId.value) return
  deleteLoading.value = true
  deleteResult.value = null
  try {
    const success = await softDeleteUser(deleteUserId.value, adminId)
    deleteResult.value = success ? 'ลบข้อมูลสำเร็จ' : 'ไม่สามารถลบได้'
  } finally {
    deleteLoading.value = false
  }
}

const handleRestore = async () => {
  if (!deleteUserId.value) return
  deleteLoading.value = true
  deleteResult.value = null
  try {
    const success = await restoreUser(deleteUserId.value, adminId)
    deleteResult.value = success ? 'กู้คืนสำเร็จ' : 'ไม่สามารถกู้คืนได้'
  } finally {
    deleteLoading.value = false
  }
}

const handleRequestExport = async () => {
  exportLoading.value = true
  try {
    await requestExport(exportType.value, adminId)
    await fetchExportRequests()
  } finally {
    exportLoading.value = false
  }
}

const downloadGdprData = () => {
  if (gdprData.value) {
    downloadAsJson(gdprData.value, `gdpr-export-${gdprUserId.value}`)
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#00A86B'
    case 'processing': return '#F5A623'
    case 'failed': return '#E53935'
    default: return '#666'
  }
}
</script>

<template>
  <AdminLayout>
    <div class="data-management">
      <header class="page-header">
        <h1>จัดการข้อมูล</h1>
        <p>Data Management, GDPR Compliance, Archiving</p>
      </header>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          v-for="tab in ['statistics', 'exports', 'archive', 'gdpr']" 
          :key="tab"
          :class="['tab', { active: activeTab === tab }]"
          @click="activeTab = tab as any"
        >
          {{ tab === 'statistics' ? 'สถิติข้อมูล' : 
             tab === 'exports' ? 'Export' : 
             tab === 'archive' ? 'Archive' : 'GDPR' }}
        </button>
      </div>

      <!-- Statistics Tab -->
      <div v-if="activeTab === 'statistics'" class="tab-content">
        <div class="card">
          <h3>สถิติตารางข้อมูล</h3>
          <div v-if="loading" class="loading">กำลังโหลด...</div>
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>ตาราง</th>
                <th>จำนวนแถว</th>
                <th>ขนาด</th>
                <th>ข้อมูลเก่าสุด</th>
                <th>ข้อมูลใหม่สุด</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in statistics" :key="stat.table_name">
                <td class="table-name">{{ stat.table_name }}</td>
                <td>{{ stat.row_count.toLocaleString() }}</td>
                <td>{{ formatBytes(stat.size_bytes) }}</td>
                <td>{{ stat.oldest_record || '-' }}</td>
                <td>{{ stat.newest_record || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Exports Tab -->
      <div v-if="activeTab === 'exports'" class="tab-content">
        <div class="card">
          <h3>ขอ Export ข้อมูล</h3>
          <div class="form-row">
            <select v-model="exportType" class="select">
              <option value="rides">Ride Requests</option>
              <option value="users">Users</option>
              <option value="providers">Providers</option>
              <option value="transactions">Transactions</option>
            </select>
            <button 
              class="btn-primary" 
              @click="handleRequestExport"
              :disabled="exportLoading"
            >
              {{ exportLoading ? 'กำลังสร้าง...' : 'สร้าง Export' }}
            </button>
          </div>
        </div>

        <div class="card">
          <h3>ประวัติ Export</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>ประเภท</th>
                <th>สถานะ</th>
                <th>จำนวน Records</th>
                <th>ขนาด</th>
                <th>สร้างเมื่อ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="req in exportRequests" :key="req.id">
                <td>{{ req.export_type }}</td>
                <td>
                  <span 
                    class="status-badge"
                    :style="{ background: getStatusColor(req.status) }"
                  >
                    {{ req.status }}
                  </span>
                </td>
                <td>{{ req.record_count?.toLocaleString() || '-' }}</td>
                <td>{{ req.file_size_bytes ? formatBytes(req.file_size_bytes) : '-' }}</td>
                <td>{{ new Date(req.created_at).toLocaleString('th-TH') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Archive Tab -->
      <div v-if="activeTab === 'archive'" class="tab-content">
        <div class="card">
          <h3>Archive ข้อมูลเก่า</h3>
          <p class="description">
            ย้ายข้อมูล ride requests ที่เก่ากว่าจำนวนวันที่กำหนดไปยังตาราง archive
          </p>
          <div class="form-row">
            <label>
              ข้อมูลเก่ากว่า (วัน):
              <input 
                type="number" 
                v-model="archiveDays" 
                min="30" 
                max="730"
                class="input"
              />
            </label>
            <button 
              class="btn-warning" 
              @click="handleArchive"
              :disabled="archiveLoading"
            >
              {{ archiveLoading ? 'กำลัง Archive...' : 'Archive ข้อมูล' }}
            </button>
          </div>
          <div v-if="archiveResult !== null" class="result-box success">
            Archive สำเร็จ: {{ archiveResult }} records
          </div>
        </div>
      </div>

      <!-- GDPR Tab -->
      <div v-if="activeTab === 'gdpr'" class="tab-content">
        <div class="card">
          <h3>GDPR Data Export</h3>
          <p class="description">
            Export ข้อมูลทั้งหมดของผู้ใช้ตาม GDPR Right to Data Portability
          </p>
          <div class="form-row">
            <input 
              type="text" 
              v-model="gdprUserId" 
              placeholder="User ID"
              class="input"
            />
            <button 
              class="btn-primary" 
              @click="handleGdprExport"
              :disabled="gdprLoading || !gdprUserId"
            >
              {{ gdprLoading ? 'กำลังโหลด...' : 'Export ข้อมูล' }}
            </button>
          </div>
          <div v-if="gdprData" class="result-box">
            <div class="result-header">
              <span>ข้อมูลพร้อม Export</span>
              <button class="btn-small" @click="downloadGdprData">
                ดาวน์โหลด JSON
              </button>
            </div>
            <pre class="json-preview">{{ JSON.stringify(gdprData, null, 2).slice(0, 500) }}...</pre>
          </div>
        </div>

        <div class="card">
          <h3>Soft Delete / Restore User</h3>
          <p class="description">
            ลบข้อมูลผู้ใช้แบบ Soft Delete (สามารถกู้คืนได้) ตาม GDPR Right to Erasure
          </p>
          <div class="form-row">
            <input 
              type="text" 
              v-model="deleteUserId" 
              placeholder="User ID"
              class="input"
            />
            <button 
              class="btn-danger" 
              @click="handleSoftDelete"
              :disabled="deleteLoading || !deleteUserId"
            >
              Soft Delete
            </button>
            <button 
              class="btn-secondary" 
              @click="handleRestore"
              :disabled="deleteLoading || !deleteUserId"
            >
              Restore
            </button>
          </div>
          <div v-if="deleteResult" class="result-box" :class="{ success: deleteResult.includes('สำเร็จ') }">
            {{ deleteResult }}
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.data-management {
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
  color: #1a1a1a;
  margin: 0 0 4px;
}

.page-header p {
  color: #666;
  margin: 0;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 12px;
}

.tab {
  padding: 10px 20px;
  border: none;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  background: #e8e8e8;
}

.tab.active {
  background: #00A86B;
  color: white;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
}

.description {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.input, .select {
  padding: 12px 16px;
  border: 2px solid #e8e8e8;
  border-radius: 12px;
  font-size: 14px;
  min-width: 200px;
}

.input:focus, .select:focus {
  outline: none;
  border-color: #00A86B;
}

.btn-primary {
  padding: 12px 24px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #008F5B;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 12px 24px;
  background: #f5f5f5;
  color: #1a1a1a;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-warning {
  padding: 12px 24px;
  background: #F5A623;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-danger {
  padding: 12px 24px;
  background: #E53935;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-small {
  padding: 8px 16px;
  background: #00A86B;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.data-table th {
  font-weight: 600;
  color: #666;
  font-size: 13px;
}

.table-name {
  font-family: monospace;
  font-size: 13px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.result-box {
  margin-top: 16px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 12px;
}

.result-box.success {
  background: #E8F5EF;
  color: #00A86B;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.json-preview {
  background: #1a1a1a;
  color: #00A86B;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  overflow-x: auto;
  max-height: 200px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>
