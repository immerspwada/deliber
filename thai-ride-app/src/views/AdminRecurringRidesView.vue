<!--
  AdminRecurringRidesView - จัดการการจองประจำ
  
  Feature: F15 - Recurring Scheduled Rides (Admin)
  Tables: recurring_ride_templates, scheduled_ride_reminders
  Migration: 050_recurring_rides_and_notifications.sql
-->

<script setup lang="ts">
/**
 * AdminRecurringRidesView - จัดการการจองประจำ
 * 
 * Feature: F15 - Recurring Scheduled Rides (Admin)
 * Tables: recurring_ride_templates, scheduled_ride_reminders
 * Migration: 050_recurring_rides_and_notifications.sql
 * 
 * Memory Optimization: Task 22
 * - Cleans up templates and reminders arrays on unmount
 * - Resets filters and modal state
 */
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '../components/AdminLayout.vue'
import { AdminModal, AdminButton, AdminStatusBadge } from '../components/admin'
import { supabase } from '../lib/supabase'
import { useAdminCleanup } from '../composables/useAdminCleanup'

const db = supabase as any

// Initialize cleanup utility
const { addCleanup } = useAdminCleanup()

interface RecurringTemplate {
  id: string
  user_id: string
  pickup_address: string
  destination_address: string
  ride_type: string
  schedule_type: string
  schedule_time: string
  schedule_days: number[] | null
  is_active: boolean
  next_scheduled_at: string | null
  created_at: string
  user?: { name: string; email: string; phone_number: string; member_uid: string }
}

interface RideReminder {
  id: string
  ride_id: string
  user_id: string
  reminder_type: string
  scheduled_for: string
  status: string
  sent_at: string | null
}

// State
const loading = ref(true)
const templates = ref<RecurringTemplate[]>([])
const reminders = ref<RideReminder[]>([])
const searchQuery = ref('')
const statusFilter = ref('')
const selectedTemplate = ref<RecurringTemplate | null>(null)
const showDetailModal = ref(false)
const actionLoading = ref(false)

// Stats
const stats = computed(() => ({
  total: templates.value.length,
  active: templates.value.filter(t => t.is_active).length,
  inactive: templates.value.filter(t => !t.is_active).length,
  pendingReminders: reminders.value.filter(r => r.status === 'pending').length
}))

// Schedule type labels
const scheduleTypeLabels: Record<string, string> = {
  daily: 'ทุกวัน',
  weekdays: 'จันทร์-ศุกร์',
  weekends: 'เสาร์-อาทิตย์',
  weekly: 'รายสัปดาห์',
  custom: 'กำหนดเอง'
}

const dayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

// Filtered templates
const filteredTemplates = computed(() => {
  let result = [...templates.value]
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t => 
      t.pickup_address?.toLowerCase().includes(query) ||
      t.destination_address?.toLowerCase().includes(query) ||
      t.user?.name?.toLowerCase().includes(query) ||
      t.user?.member_uid?.toLowerCase().includes(query)
    )
  }
  
  if (statusFilter.value === 'active') {
    result = result.filter(t => t.is_active)
  } else if (statusFilter.value === 'inactive') {
    result = result.filter(t => !t.is_active)
  }
  
  return result
})

// Fetch data
const fetchData = async () => {
  loading.value = true
  try {
    const [templatesRes, remindersRes] = await Promise.all([
      db.from('recurring_ride_templates')
        .select('*, user:user_id(name, email, phone_number, member_uid)')
        .order('created_at', { ascending: false }),
      db.from('scheduled_ride_reminders')
        .select('*')
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true })
        .limit(100)
    ])
    
    templates.value = templatesRes.data || []
    reminders.value = remindersRes.data || []
  } catch (err) {
    console.error('Error fetching data:', err)
  } finally {
    loading.value = false
  }
}

// Toggle template status
const toggleTemplateStatus = async (template: RecurringTemplate) => {
  actionLoading.value = true
  try {
    const { error } = await db
      .from('recurring_ride_templates')
      .update({ 
        is_active: !template.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', template.id)
    
    if (error) throw error
    
    template.is_active = !template.is_active
  } catch (err) {
    console.error('Error toggling template:', err)
    alert('เกิดข้อผิดพลาด')
  } finally {
    actionLoading.value = false
  }
}

// Delete template
const deleteTemplate = async (template: RecurringTemplate) => {
  if (!confirm('ต้องการลบการจองประจำนี้หรือไม่?')) return
  
  actionLoading.value = true
  try {
    const { error } = await db
      .from('recurring_ride_templates')
      .delete()
      .eq('id', template.id)
    
    if (error) throw error
    
    templates.value = templates.value.filter(t => t.id !== template.id)
    showDetailModal.value = false
  } catch (err) {
    console.error('Error deleting template:', err)
    alert('เกิดข้อผิดพลาด')
  } finally {
    actionLoading.value = false
  }
}

// Format schedule
const formatSchedule = (template: RecurringTemplate): string => {
  const timeStr = template.schedule_time?.slice(0, 5) || ''
  const typeLabel = scheduleTypeLabels[template.schedule_type] || template.schedule_type
  
  if ((template.schedule_type === 'weekly' || template.schedule_type === 'custom') && template.schedule_days) {
    const days = template.schedule_days.map(d => dayLabels[d]).join(', ')
    return `${days} เวลา ${timeStr}`
  }
  
  return `${typeLabel} เวลา ${timeStr}`
}

// Format date
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Open detail modal
const openDetail = (template: RecurringTemplate) => {
  selectedTemplate.value = template
  showDetailModal.value = true
}

// Register cleanup - Task 22
addCleanup(() => {
  templates.value = []
  reminders.value = []
  searchQuery.value = ''
  statusFilter.value = ''
  selectedTemplate.value = null
  showDetailModal.value = false
  actionLoading.value = false
  loading.value = false
  console.log('[AdminRecurringRidesView] Cleanup complete')
})

onMounted(fetchData)
</script>

<template>
  <AdminLayout>
    <div class="recurring-admin">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <h1>การจองประจำ</h1>
          <p>จัดการ recurring ride templates และ reminders</p>
        </div>
        <div class="header-actions">
          <AdminButton variant="outline" @click="fetchData" :loading="loading">
            รีเฟรช
          </AdminButton>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">ทั้งหมด</span>
        </div>
        <div class="stat-card active">
          <span class="stat-value">{{ stats.active }}</span>
          <span class="stat-label">เปิดใช้งาน</span>
        </div>
        <div class="stat-card inactive">
          <span class="stat-value">{{ stats.inactive }}</span>
          <span class="stat-label">ปิดใช้งาน</span>
        </div>
        <div class="stat-card pending">
          <span class="stat-value">{{ stats.pendingReminders }}</span>
          <span class="stat-label">รอแจ้งเตือน</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาตามที่อยู่, ชื่อผู้ใช้, Member UID..."
          class="search-input"
        />
        <select v-model="statusFilter" class="filter-select">
          <option value="">ทุกสถานะ</option>
          <option value="active">เปิดใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
      </div>

      <!-- Templates List -->
      <div class="templates-list">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <span>กำลังโหลด...</span>
        </div>
        
        <div v-else-if="filteredTemplates.length === 0" class="empty-state">
          <span>ไม่พบข้อมูล</span>
        </div>
        
        <div v-else class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ผู้ใช้</th>
                <th>เส้นทาง</th>
                <th>รูปแบบ</th>
                <th>ครั้งถัดไป</th>
                <th>สถานะ</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="template in filteredTemplates" :key="template.id">
                <td>
                  <div class="user-info">
                    <span class="user-name">{{ template.user?.name || 'ไม่ระบุ' }}</span>
                    <span class="user-uid">{{ template.user?.member_uid || '-' }}</span>
                  </div>
                </td>
                <td>
                  <div class="route-info">
                    <span class="route-from">{{ template.pickup_address }}</span>
                    <span class="route-arrow">→</span>
                    <span class="route-to">{{ template.destination_address }}</span>
                  </div>
                </td>
                <td>
                  <span class="schedule-text">{{ formatSchedule(template) }}</span>
                </td>
                <td>
                  <span class="next-time">{{ formatDate(template.next_scheduled_at) }}</span>
                </td>
                <td>
                  <AdminStatusBadge 
                    :status="template.is_active ? 'success' : 'neutral'"
                    :text="template.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'"
                    size="sm"
                  />
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-action view" @click="openDetail(template)" title="ดูรายละเอียด">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button 
                      class="btn-action toggle" 
                      :class="{ active: template.is_active }"
                      @click="toggleTemplateStatus(template)"
                      :title="template.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'"
                    >
                      <svg v-if="template.is_active" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18.36 6.64a9 9 0 11-12.73 0"/>
                        <line x1="12" y1="2" x2="12" y2="12"/>
                      </svg>
                      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polygon points="10,8 16,12 10,16"/>
                      </svg>
                    </button>
                    <button class="btn-action delete" @click="deleteTemplate(template)" title="ลบ">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                        <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Modal -->
      <AdminModal v-model="showDetailModal" title="รายละเอียดการจองประจำ" size="md">
        <div v-if="selectedTemplate" class="detail-content">
          <div class="detail-section">
            <h4>ข้อมูลผู้ใช้</h4>
            <div class="detail-row">
              <span class="label">ชื่อ</span>
              <span class="value">{{ selectedTemplate.user?.name || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Member UID</span>
              <span class="value uid">{{ selectedTemplate.user?.member_uid || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">เบอร์โทร</span>
              <span class="value">{{ selectedTemplate.user?.phone_number || '-' }}</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>เส้นทาง</h4>
            <div class="route-display">
              <div class="route-point">
                <span class="dot pickup"></span>
                <span>{{ selectedTemplate.pickup_address }}</span>
              </div>
              <div class="route-line"></div>
              <div class="route-point">
                <span class="dot destination"></span>
                <span>{{ selectedTemplate.destination_address }}</span>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>ตารางเวลา</h4>
            <div class="detail-row">
              <span class="label">รูปแบบ</span>
              <span class="value">{{ scheduleTypeLabels[selectedTemplate.schedule_type] }}</span>
            </div>
            <div class="detail-row">
              <span class="label">เวลา</span>
              <span class="value">{{ selectedTemplate.schedule_time?.slice(0, 5) }}</span>
            </div>
            <div v-if="selectedTemplate.schedule_days" class="detail-row">
              <span class="label">วัน</span>
              <span class="value">{{ selectedTemplate.schedule_days.map(d => dayLabels[d]).join(', ') }}</span>
            </div>
            <div class="detail-row">
              <span class="label">ครั้งถัดไป</span>
              <span class="value">{{ formatDate(selectedTemplate.next_scheduled_at) }}</span>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>ข้อมูลเพิ่มเติม</h4>
            <div class="detail-row">
              <span class="label">ประเภทรถ</span>
              <span class="value">{{ selectedTemplate.ride_type }}</span>
            </div>
            <div class="detail-row">
              <span class="label">สร้างเมื่อ</span>
              <span class="value">{{ formatDate(selectedTemplate.created_at) }}</span>
            </div>
          </div>
        </div>
        
        <template #footer>
          <AdminButton variant="outline" @click="showDetailModal = false">ปิด</AdminButton>
          <AdminButton 
            :variant="selectedTemplate?.is_active ? 'warning' : 'primary'"
            @click="selectedTemplate && toggleTemplateStatus(selectedTemplate)"
            :loading="actionLoading"
          >
            {{ selectedTemplate?.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน' }}
          </AdminButton>
          <AdminButton variant="danger" @click="selectedTemplate && deleteTemplate(selectedTemplate)" :loading="actionLoading">
            ลบ
          </AdminButton>
        </template>
      </AdminModal>
    </div>
  </AdminLayout>
</template>

<style scoped>
.recurring-admin {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 4px 0;
}

.header-left p {
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

.stat-card {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stat-card.active { border-left: 4px solid #00A86B; }
.stat-card.inactive { border-left: 4px solid #999999; }
.stat-card.pending { border-left: 4px solid #F5A623; }

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #1A1A1A;
}

.stat-label {
  font-size: 13px;
  color: #666666;
}

.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
}

.filter-select {
  padding: 12px 16px;
  border: 1px solid #E8E8E8;
  border-radius: 8px;
  font-size: 14px;
  min-width: 150px;
}

.templates-list {
  background: #FFFFFF;
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  overflow: hidden;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #999999;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E8E8E8;
  border-top-color: #00A86B;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #F0F0F0;
}

.data-table th {
  background: #F8F8F8;
  font-size: 12px;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 500;
  color: #1A1A1A;
}

.user-uid {
  font-size: 11px;
  color: #999999;
  font-family: monospace;
}

.route-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.route-from,
.route-to {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-arrow {
  color: #00A86B;
  font-weight: 600;
}

.schedule-text {
  font-size: 13px;
  color: #00A86B;
}

.next-time {
  font-size: 13px;
  color: #666666;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-action {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-action.view { background: #E3F2FD; color: #1976D2; }
.btn-action.toggle { background: #F0F0F0; color: #666666; }
.btn-action.toggle.active { background: #E8F5EF; color: #00A86B; }
.btn-action.delete { background: #FFEBEE; color: #E53935; }

.btn-action:hover { transform: scale(1.05); }

/* Detail Modal */
.detail-content {
  padding: 8px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #F0F0F0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.detail-row .label {
  color: #666666;
  font-size: 14px;
}

.detail-row .value {
  font-weight: 500;
  color: #1A1A1A;
}

.detail-row .value.uid {
  font-family: monospace;
  background: #F5F5F5;
  padding: 2px 8px;
  border-radius: 4px;
}

.route-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #F8F8F8;
  border-radius: 8px;
}

.route-point {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.route-point .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.route-point .dot.pickup { background: #00A86B; }
.route-point .dot.destination { background: #E53935; }

.route-line {
  width: 2px;
  height: 16px;
  background: #E8E8E8;
  margin-left: 4px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-bar {
    flex-direction: column;
  }
}
</style>
