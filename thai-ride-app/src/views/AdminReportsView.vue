<script setup lang="ts">
/**
 * Feature: F75 - Admin Reports View
 * Export and generate reports
 * 
 * Memory Optimization: Task 32
 * - Cleans up reports array on unmount
 * - Resets form state and filters
 */
import { ref, computed } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { useAdminCleanup } from '../composables/useAdminCleanup'

// Initialize cleanup utility
const { addCleanup } = useAdminCleanup()

// Register cleanup for memory optimization
addCleanup(() => {
  generatedReports.value = []
  selectedReport.value = 'rides'
  dateRange.value = 'month'
  customStartDate.value = ''
  customEndDate.value = ''
  exportFormat.value = 'excel'
  isGenerating.value = false
  console.log('[AdminReportsView] Cleanup complete')
})

interface ReportType {
  id: string
  name: string
  description: string
  icon: string
}

const reportTypes: ReportType[] = [
  { id: 'rides', name: 'รายงานการเดินทาง', description: 'สรุปการเดินทางทั้งหมด', icon: 'car' },
  { id: 'delivery', name: 'รายงานการส่งของ', description: 'สรุปการส่งของทั้งหมด', icon: 'package' },
  { id: 'shopping', name: 'รายงานการช้อปปิ้ง', description: 'สรุปการช้อปปิ้งทั้งหมด', icon: 'shopping' },
  { id: 'revenue', name: 'รายงานรายได้', description: 'สรุปรายได้และค่าใช้จ่าย', icon: 'money' },
  { id: 'providers', name: 'รายงานผู้ให้บริการ', description: 'สรุปข้อมูลผู้ให้บริการ', icon: 'users' },
  { id: 'customers', name: 'รายงานลูกค้า', description: 'สรุปข้อมูลลูกค้า', icon: 'customer' }
]

const selectedReport = ref<string>('rides')
const dateRange = ref<'today' | 'week' | 'month' | 'custom'>('month')
const customStartDate = ref('')
const customEndDate = ref('')
const exportFormat = ref<'csv' | 'excel' | 'pdf'>('excel')
const isGenerating = ref(false)
const generatedReports = ref<Array<{
  id: string
  name: string
  date: string
  format: string
  size: string
}>>([
  { id: '1', name: 'รายงานการเดินทาง_ธ.ค.2025', date: '2025-12-17', format: 'Excel', size: '2.4 MB' },
  { id: '2', name: 'รายงานรายได้_พ.ย.2025', date: '2025-11-30', format: 'PDF', size: '1.8 MB' },
  { id: '3', name: 'รายงานผู้ให้บริการ_Q4', date: '2025-12-01', format: 'CSV', size: '856 KB' }
])

const selectedReportInfo = computed(() => {
  return reportTypes.find(r => r.id === selectedReport.value)
})

const generateReport = async () => {
  isGenerating.value = true
  
  // Simulate report generation
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  const newReport = {
    id: Date.now().toString(),
    name: `${selectedReportInfo.value?.name}_${new Date().toLocaleDateString('th-TH')}`,
    date: new Date().toISOString().split('T')[0] || '',
    format: exportFormat.value.toUpperCase(),
    size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`
  }
  
  generatedReports.value.unshift(newReport)
  isGenerating.value = false
}

const downloadReport = (report: typeof generatedReports.value[0]) => {
  // Simulate download
  console.log('Downloading:', report.name)
  alert(`กำลังดาวน์โหลด: ${report.name}`)
}

const deleteReport = (reportId: string) => {
  generatedReports.value = generatedReports.value.filter(r => r.id !== reportId)
}
</script>

<template>
  <AdminLayout>
    <div class="reports-view">
      <header class="page-header">
        <h1>รายงาน</h1>
        <p class="subtitle">สร้างและดาวน์โหลดรายงาน</p>
      </header>

      <div class="reports-grid">
        <!-- Report Generator -->
        <section class="report-generator">
          <h2>สร้างรายงานใหม่</h2>
          
          <div class="form-group">
            <label>ประเภทรายงาน</label>
            <div class="report-types">
              <button
                v-for="type in reportTypes"
                :key="type.id"
                class="report-type-btn"
                :class="{ active: selectedReport === type.id }"
                @click="selectedReport = type.id"
              >
                <!-- Car icon -->
                <svg v-if="type.icon === 'car'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 17h14v-5H5v5zM19 12l-2-6H7L5 12"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>
                </svg>
                <!-- Package icon -->
                <svg v-else-if="type.icon === 'package'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <!-- Shopping icon -->
                <svg v-else-if="type.icon === 'shopping'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                </svg>
                <!-- Money icon -->
                <svg v-else-if="type.icon === 'money'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                </svg>
                <!-- Users icon -->
                <svg v-else-if="type.icon === 'users'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
                <!-- Customer icon -->
                <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <span>{{ type.name }}</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>ช่วงเวลา</label>
            <div class="date-range-options">
              <button
                v-for="option in [
                  { value: 'today', label: 'วันนี้' },
                  { value: 'week', label: 'สัปดาห์นี้' },
                  { value: 'month', label: 'เดือนนี้' },
                  { value: 'custom', label: 'กำหนดเอง' }
                ]"
                :key="option.value"
                class="date-btn"
                :class="{ active: dateRange === option.value }"
                @click="dateRange = option.value as typeof dateRange"
              >
                {{ option.label }}
              </button>
            </div>
            
            <div v-if="dateRange === 'custom'" class="custom-dates">
              <input v-model="customStartDate" type="date" class="date-input" />
              <span>ถึง</span>
              <input v-model="customEndDate" type="date" class="date-input" />
            </div>
          </div>

          <div class="form-group">
            <label>รูปแบบไฟล์</label>
            <div class="format-options">
              <button
                v-for="format in [
                  { value: 'excel', label: 'Excel (.xlsx)' },
                  { value: 'csv', label: 'CSV' },
                  { value: 'pdf', label: 'PDF' }
                ]"
                :key="format.value"
                class="format-btn"
                :class="{ active: exportFormat === format.value }"
                @click="exportFormat = format.value as typeof exportFormat"
              >
                {{ format.label }}
              </button>
            </div>
          </div>

          <button class="generate-btn" :disabled="isGenerating" @click="generateReport">
            <svg v-if="!isGenerating" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            <span v-if="isGenerating" class="spinner" />
            {{ isGenerating ? 'กำลังสร้าง...' : 'สร้างรายงาน' }}
          </button>
        </section>

        <!-- Generated Reports -->
        <section class="generated-reports">
          <h2>รายงานที่สร้างแล้ว</h2>
          
          <div v-if="generatedReports.length === 0" class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p>ยังไม่มีรายงาน</p>
          </div>

          <div v-else class="reports-list">
            <div v-for="report in generatedReports" :key="report.id" class="report-item">
              <div class="report-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="report-info">
                <p class="report-name">{{ report.name }}</p>
                <p class="report-meta">{{ report.format }} • {{ report.size }} • {{ report.date }}</p>
              </div>
              <div class="report-actions">
                <button class="action-btn download" @click="downloadReport(report)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                </button>
                <button class="action-btn delete" @click="deleteReport(report.id)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.reports-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #000;
  margin: 0 0 8px;
}

.subtitle {
  color: #6b6b6b;
  margin: 0;
}

.reports-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 900px) {
  .reports-grid {
    grid-template-columns: 1fr;
  }
}

.report-generator,
.generated-reports {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
}

.report-generator h2,
.generated-reports h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 24px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #6b6b6b;
  margin-bottom: 12px;
}

.report-types {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.report-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #f6f6f6;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 13px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.report-type-btn:hover {
  background: #e5e5e5;
}

.report-type-btn.active {
  background: #fff;
  border-color: #000;
  color: #000;
}

.date-range-options,
.format-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.date-btn,
.format-btn {
  padding: 10px 16px;
  background: #f6f6f6;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.2s;
}

.date-btn:hover,
.format-btn:hover {
  background: #e5e5e5;
}

.date-btn.active,
.format-btn.active {
  background: #000;
  color: #fff;
}

.custom-dates {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.date-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  font-size: 14px;
}

.date-input:focus {
  outline: none;
  border-color: #000;
}

.generate-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.generate-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #6b6b6b;
}

.empty-state p {
  margin: 16px 0 0;
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f6f6f6;
  border-radius: 12px;
}

.report-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 10px;
  color: #6b6b6b;
}

.report-info {
  flex: 1;
  min-width: 0;
}

.report-name {
  font-weight: 500;
  color: #000;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-meta {
  font-size: 13px;
  color: #6b6b6b;
  margin: 0;
}

.report-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.download {
  color: #276ef1;
}

.action-btn.download:hover {
  background: rgba(39, 110, 241, 0.1);
}

.action-btn.delete {
  color: #e11900;
}

.action-btn.delete:hover {
  background: rgba(225, 25, 0, 0.1);
}
</style>
